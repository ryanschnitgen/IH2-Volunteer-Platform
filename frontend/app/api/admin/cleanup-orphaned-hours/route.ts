import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@backend/lib/db/mongodb';
import HoursLog from '@backend/lib/models/HoursLog';
import Event from '@backend/lib/models/Event';
import { isAdmin } from '@backend/lib/admin';

export async function POST(request: NextRequest) {
  try {
    const { userEmail } = await request.json();

    if (!userEmail || !isAdmin(userEmail)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    await dbConnect();

    // Find all HoursLog entries with eventId
    const hoursLogsWithEvents = await HoursLog.find({
      eventId: { $exists: true, $ne: null }
    });

    const orphanedLogs = [];
    const validEventIds = new Set();

    // Check which events still exist
    for (const log of hoursLogsWithEvents) {
      if (!validEventIds.has(log.eventId)) {
        const event = await Event.findById(log.eventId);
        if (event) {
          validEventIds.add(log.eventId);
        } else {
          orphanedLogs.push(log);
        }
      } else {
        // Event already confirmed to exist, skip
      }
    }

    // Delete orphaned HoursLog entries
    const deletedIds = [];
    for (const log of orphanedLogs) {
      await HoursLog.findByIdAndDelete(log._id);
      deletedIds.push(log._id);
    }

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${orphanedLogs.length} orphaned hours log entries`,
      deletedCount: orphanedLogs.length,
      deletedLogs: orphanedLogs.map(log => ({
        _id: log._id,
        eventId: log.eventId,
        eventTitle: log.eventTitle,
        hours: log.hours,
        date: log.date,
        autoAssigned: log.autoAssigned,
        source: log.source,
      })),
    });
  } catch (error: any) {
    console.error('Cleanup error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to cleanup orphaned hours' },
      { status: 500 }
    );
  }
}

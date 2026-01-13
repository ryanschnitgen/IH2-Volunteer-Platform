import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@backend/lib/db/mongodb';
import EventRegistration from '@backend/lib/models/EventRegistration';
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

    // Find all EventRegistrations
    const allRegistrations = await EventRegistration.find({});

    const orphanedRegistrations = [];
    const validEventIds = new Set();

    // Check which events still exist
    for (const reg of allRegistrations) {
      if (!validEventIds.has(reg.eventId)) {
        const event = await Event.findById(reg.eventId);
        if (event) {
          validEventIds.add(reg.eventId);
        } else {
          orphanedRegistrations.push(reg);
        }
      } else {
        // Event already confirmed to exist, skip
      }
    }

    // Delete orphaned EventRegistration entries
    const deletedIds = [];
    for (const reg of orphanedRegistrations) {
      await EventRegistration.findByIdAndDelete(reg._id);
      deletedIds.push(reg._id);
    }

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${orphanedRegistrations.length} orphaned event registrations`,
      deletedCount: orphanedRegistrations.length,
      deletedRegistrations: orphanedRegistrations.map(reg => ({
        _id: reg._id,
        eventId: reg.eventId,
        eventTitle: reg.eventTitle,
        userName: reg.userName,
        userEmail: reg.userEmail,
        eventDate: reg.eventDate,
        hoursCompleted: reg.hoursCompleted,
        checkedIn: reg.checkedIn,
        attended: reg.attended,
      })),
    });
  } catch (error: any) {
    console.error('Cleanup error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to cleanup orphaned registrations' },
      { status: 500 }
    );
  }
}

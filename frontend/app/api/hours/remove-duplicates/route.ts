import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import HoursLog from '@/models/HoursLog';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Get all hours logs for this user
    const allLogs = await HoursLog.find({ userId }).sort({ createdAt: 1 }).lean();

    const duplicates: string[] = [];
    const seen = new Map<string, any>();

    for (const log of allLogs) {
      // Create a unique key based on:
      // - userId + eventId + date (for event hours)
      // - userId + date + hours + notes (for manual entries)
      const dateStr = new Date(log.date).toISOString().split('T')[0];

      let key: string;
      if (log.eventId) {
        // Event-based hours: match by user, event, and date
        key = `${log.userId}-${log.eventId}-${dateStr}`;
      } else {
        // Manual hours: match by user, date, hours, and first 50 chars of notes
        const notesKey = (log.notes || '').substring(0, 50);
        key = `${log.userId}-${dateStr}-${log.hours}-${notesKey}`;
      }

      if (seen.has(key)) {
        // This is a duplicate - mark for deletion
        duplicates.push(log._id.toString());
        console.log(`  → Found duplicate: ${log.eventTitle || log.notes || 'Manual entry'} on ${dateStr}`);
      } else {
        // First occurrence - keep it
        seen.set(key, log);
      }
    }

    // Delete duplicates
    if (duplicates.length > 0) {
      await HoursLog.deleteMany({ _id: { $in: duplicates } });
      console.log(`✓ Removed ${duplicates.length} duplicate hours entries for user ${userId}`);
    } else {
      console.log(`✓ No duplicates found for user ${userId}`);
    }

    return NextResponse.json({
      success: true,
      removed: duplicates.length,
      message: duplicates.length > 0
        ? `Removed ${duplicates.length} duplicate ${duplicates.length === 1 ? 'entry' : 'entries'}`
        : 'No duplicates found',
    });

  } catch (error: any) {
    console.error('Error removing duplicates:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove duplicates' },
      { status: 500 }
    );
  }
}

// GET - Preview duplicates without deleting
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    await connectDB();

    const allLogs = await HoursLog.find({ userId }).sort({ createdAt: 1 }).lean();

    const duplicates: any[] = [];
    const seen = new Map<string, any>();

    for (const log of allLogs) {
      const dateStr = new Date(log.date).toISOString().split('T')[0];

      let key: string;
      if (log.eventId) {
        key = `${log.userId}-${log.eventId}-${dateStr}`;
      } else {
        const notesKey = (log.notes || '').substring(0, 50);
        key = `${log.userId}-${dateStr}-${log.hours}-${notesKey}`;
      }

      if (seen.has(key)) {
        duplicates.push({
          _id: log._id,
          eventTitle: log.eventTitle,
          date: log.date,
          hours: log.hours,
          notes: log.notes,
        });
      } else {
        seen.set(key, log);
      }
    }

    return NextResponse.json({
      duplicates,
      count: duplicates.length,
    });

  } catch (error: any) {
    console.error('Error checking duplicates:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check duplicates' },
      { status: 500 }
    );
  }
}

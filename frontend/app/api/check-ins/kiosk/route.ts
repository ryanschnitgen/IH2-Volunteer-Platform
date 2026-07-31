import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@backend/lib/db/mongodb';
import Event from '@backend/lib/models/Event';
import EventRegistration from '@backend/lib/models/EventRegistration';

// Public endpoint for the check-in kiosk — no admin auth required
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');

    await dbConnect();

    if (eventId) {
      // Return non-cancelled registrations for a specific event, sorted by name
      const registrations = await EventRegistration.find({
        eventId,
        cancelled: { $ne: true },
      })
        .select('userName userEmail totalAttendees')
        .sort({ userName: 1 })
        .lean();

      return NextResponse.json({ registrations });
    }

    // Return today's events (all non-cancelled events on today's date)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const events = await Event.find({
      status: { $ne: 'cancelled' },
      date: { $gte: startOfDay, $lte: endOfDay },
    })
      .select('title date startTime endTime location')
      .sort({ startTime: 1 })
      .lean();

    return NextResponse.json({ events });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch kiosk data' },
      { status: 500 }
    );
  }
}

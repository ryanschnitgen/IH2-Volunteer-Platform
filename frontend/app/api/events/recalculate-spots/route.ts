import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@backend/lib/db/mongodb';
import Event from '@backend/lib/models/Event';
import EventRegistration from '@backend/lib/models/EventRegistration';
import { isAdmin } from '@backend/lib/admin';

// Recalculate spots remaining for all events
export async function POST(request: NextRequest) {
  try {
    const { adminEmail } = await request.json();

    if (!isAdmin(adminEmail)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await connectDB();

    const events = await Event.find({});
    let updated = 0;

    for (const event of events) {
      // Get all non-cancelled registrations for this event
      const registrations = await EventRegistration.find({
        eventId: event._id,
        cancelled: { $ne: true },
      });

      // Sum up totalAttendees from all registrations
      const spotsTaken = registrations.reduce((sum, reg) => {
        return sum + (reg.totalAttendees || 1);
      }, 0);

      const spotsRemaining = event.spotsAvailable - spotsTaken;

      // Update the event
      await Event.findByIdAndUpdate(event._id, {
        spotsRemaining: Math.max(0, spotsRemaining),
      });

      updated++;
    }

    return NextResponse.json({
      success: true,
      message: `Recalculated spots for ${updated} events`,
      eventsUpdated: updated,
    });
  } catch (error: any) {
    console.error('Error recalculating spots:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

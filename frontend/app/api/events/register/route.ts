import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Event from '@/models/Event';
import EventRegistration from '@/models/EventRegistration';

// Register for an event
export async function POST(request: NextRequest) {
  try {
    const { eventId, userId, userEmail, userName, additionalAttendees, attendeeNames, isGroupCheckIn } = await request.json();

    if (!eventId || !userId || !userEmail || !userName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    await connectDB();

    // Calculate total attendees (primary registrant + additional)
    const numAdditional = additionalAttendees || 0;
    const totalAttendees = 1 + numAdditional;
    const names = attendeeNames || [];
    const groupCheckIn = isGroupCheckIn || false;

    // Validate attendee names if additional attendees specified (but not if group check-in)
    if (numAdditional > 0 && !groupCheckIn && names.length !== numAdditional) {
      return NextResponse.json(
        { error: 'Please provide names for all additional attendees' },
        { status: 400 }
      );
    }

    // Check if event exists and has spots
    const event = await Event.findById(eventId);
    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Check if enough spots available for the entire group
    if (event.spotsRemaining < totalAttendees) {
      return NextResponse.json(
        { error: `Not enough spots available. Only ${event.spotsRemaining} spot(s) remaining, but you need ${totalAttendees}.` },
        { status: 400 }
      );
    }

    // Check if already registered
    const existing = await EventRegistration.findOne({ eventId, userId });
    if (existing) {
      return NextResponse.json(
        { error: 'Already registered for this event' },
        { status: 400 }
      );
    }

    // Create registration
    const registration = await EventRegistration.create({
      eventId,
      userId,
      userEmail,
      userName,
      eventTitle: event.title,
      eventDate: event.date,
      eventStartTime: event.startTime,
      eventEndTime: event.endTime,
      eventCategory: event.eventCategory,
      attended: false,
      hoursCompleted: 0,
      additionalAttendees: numAdditional,
      attendeeNames: names,
      totalAttendees: totalAttendees,
      isGroupCheckIn: groupCheckIn,
    });

    // Decrease spots remaining by total group size
    event.spotsRemaining -= totalAttendees;
    await event.save();

    return NextResponse.json({ registration, registered: true });
  } catch (error: any) {
    console.error('Error registering for event:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to register' },
      { status: 500 }
    );
  }
}

// Cancel registration
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');
    const userId = searchParams.get('userId');

    if (!eventId || !userId) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      );
    }

    await connectDB();

    const registration = await EventRegistration.findOneAndDelete({ eventId, userId });

    if (!registration) {
      return NextResponse.json(
        { error: 'Registration not found' },
        { status: 404 }
      );
    }

    // Increase spots remaining by the total group size
    const spotsToReturn = registration.totalAttendees || 1;
    await Event.findByIdAndUpdate(eventId, { $inc: { spotsRemaining: spotsToReturn } });

    return NextResponse.json({ cancelled: true, spotsReturned: spotsToReturn });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to cancel registration' },
      { status: 500 }
    );
  }
}

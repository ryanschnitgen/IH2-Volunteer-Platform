import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@backend/lib/db/mongodb';
import Event from '@backend/lib/models/Event';
import EventRegistration from '@backend/lib/models/EventRegistration';

// Update registration (edit group details)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { additionalAttendees, attendeeNames, isGroupCheckIn } = await request.json();
    const { id: registrationId } = await params;

    console.log('Updating registration:', registrationId);
    await connectDB();

    // Get the current registration
    const registration = await EventRegistration.findById(registrationId);
    if (!registration) {
      console.error('Registration not found:', registrationId);
      return NextResponse.json(
        { error: 'Registration not found' },
        { status: 404 }
      );
    }

    console.log('Found registration:', registration._id);

    // Calculate the difference in attendees
    const oldTotalAttendees = registration.totalAttendees || 1;
    const numAdditional = additionalAttendees || 0;
    const newTotalAttendees = 1 + numAdditional;
    const attendeeDifference = newTotalAttendees - oldTotalAttendees;

    // Inherit isGroupCheckIn from existing registration if not explicitly provided
    const groupCheckIn = isGroupCheckIn !== undefined ? isGroupCheckIn : (registration.isGroupCheckIn || false);

    // Validate attendee names — skip for group check-ins (guests without accounts)
    const names = attendeeNames || [];
    if (numAdditional > 0 && !groupCheckIn && names.length !== numAdditional) {
      return NextResponse.json(
        { error: 'Please provide names for all additional attendees' },
        { status: 400 }
      );
    }

    // Get the event to check spots
    const event = await Event.findById(registration.eventId);
    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Check if there are enough spots if increasing group size
    if (attendeeDifference > 0 && event.spotsRemaining < attendeeDifference) {
      return NextResponse.json(
        {
          error: `Not enough spots available. Only ${event.spotsRemaining} spot(s) remaining, but you need ${attendeeDifference} more.`
        },
        { status: 400 }
      );
    }

    // Update the registration
    registration.additionalAttendees = numAdditional;
    registration.attendeeNames = groupCheckIn ? [] : names;
    registration.totalAttendees = newTotalAttendees;
    registration.isGroupCheckIn = groupCheckIn;
    await registration.save();

    // Update event spots
    event.spotsRemaining -= attendeeDifference;
    await event.save();

    return NextResponse.json({
      registration,
      updated: true,
      message: attendeeDifference > 0
        ? `Registration updated. Added ${attendeeDifference} spot(s).`
        : attendeeDifference < 0
        ? `Registration updated. Freed ${Math.abs(attendeeDifference)} spot(s).`
        : 'Registration updated.'
    });
  } catch (error: any) {
    console.error('Error updating registration:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update registration' },
      { status: 500 }
    );
  }
}

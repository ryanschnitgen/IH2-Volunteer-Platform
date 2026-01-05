import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@backend/lib/db/mongodb';
import Event from '@backend/lib/models/Event';
import EventRegistration from '@backend/lib/models/EventRegistration';
import VolunteerProfile from '@backend/lib/models/VolunteerProfile';
import User from '@backend/lib/models/User';

// Register for an event
export async function POST(request: NextRequest) {
  try {
    const { eventId, userId, userEmail, userName, additionalAttendees, attendeeNames, isGroupCheckIn, retroactive } = await request.json();

    await connectDB();

    let finalUserId = userId;
    let finalUserEmail = userEmail;
    let finalUserName = userName;

    // If retroactive (admin adding user by email only), look up user info
    if (retroactive && userEmail && !userId) {
      // Try to find volunteer profile first
      const volunteerProfile = await VolunteerProfile.findOne({ email: userEmail });

      if (volunteerProfile) {
        finalUserId = volunteerProfile.linkedUserId || userEmail; // Use linkedUserId if available, fallback to email
        finalUserName = `${volunteerProfile.firstName} ${volunteerProfile.lastName}`;
        finalUserEmail = volunteerProfile.email;
      } else {
        // Try to find in User collection
        const user = await User.findOne({ email: userEmail });
        if (user) {
          finalUserId = user.firebaseUid || userEmail;
          finalUserName = user.displayName || user.email;
          finalUserEmail = user.email;
        } else {
          return NextResponse.json(
            { error: 'No volunteer found with this email address' },
            { status: 404 }
          );
        }
      }
    }

    if (!eventId || !finalUserId || !finalUserEmail || !finalUserName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if user has signed waiver (skip for retroactive admin registrations)
    if (!retroactive) {
      const volunteerProfile = await VolunteerProfile.findOne({ linkedUserId: finalUserId });
      if (!volunteerProfile || !volunteerProfile.waiverAccepted) {
        return NextResponse.json(
          { error: 'You must sign the volunteer waiver before registering for events' },
          { status: 403 }
        );
      }
    }

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
    const existing = await EventRegistration.findOne({ eventId, userId: finalUserId });
    if (existing) {
      return NextResponse.json(
        { error: 'Already registered for this event' },
        { status: 400 }
      );
    }

    // Create registration
    const registration = await EventRegistration.create({
      eventId,
      userId: finalUserId,
      userEmail: finalUserEmail,
      userName: finalUserName,
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

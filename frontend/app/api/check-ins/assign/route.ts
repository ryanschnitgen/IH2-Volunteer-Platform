import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@backend/lib/db/mongodb';
import CheckIn from '@backend/lib/models/CheckIn';
import Event from '@backend/lib/models/Event';
import EventRegistration from '@backend/lib/models/EventRegistration';
import VolunteerProfile from '@backend/lib/models/VolunteerProfile';
import { isAdmin } from '@backend/lib/admin';

// POST - Manually assign check-in to an event
export async function POST(request: NextRequest) {
  try {
    const { checkInId, eventId, adminEmail } = await request.json();

    if (!isAdmin(adminEmail)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (!checkInId || !eventId) {
      return NextResponse.json(
        { error: 'Check-in ID and Event ID required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Get check-in and event
    const checkIn = await CheckIn.findById(checkInId);
    if (!checkIn) {
      return NextResponse.json({ error: 'Check-in not found' }, { status: 404 });
    }

    const event = await Event.findById(eventId);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Check if user already has a registration for this event
    let registration = await EventRegistration.findOne({
      eventId,
      userEmail: checkIn.email.toLowerCase().trim(),
    });

    let userId = '';
    let userName = checkIn.name;

    // Try to find user profile
    const profile = await VolunteerProfile.findOne({
      email: checkIn.email.toLowerCase().trim(),
    });

    if (profile) {
      userId = profile.linkedUserId || '';
      userName = `${profile.firstName} ${profile.lastName}`;
    }

    if (registration) {
      // Update existing registration to mark as checked in
      registration.checkedIn = true;
      await registration.save();
    } else {
      // Create new registration
      registration = await EventRegistration.create({
        eventId,
        userId,
        userEmail: checkIn.email,
        userName,
        eventTitle: event.title,
        eventDate: event.date,
        eventStartTime: event.startTime,
        eventEndTime: event.endTime,
        eventCategory: event.eventCategory || 'General',
        checkedIn: true,
        attended: false,
      });
    }

    // Update check-in record
    checkIn.eventId = eventId;
    checkIn.matched = true;
    checkIn.matchedUserId = userId;
    checkIn.matchedRegistrationId = registration._id;
    checkIn.matchConfidence = 100;
    checkIn.notes = `Manually assigned to ${event.title} by admin`;
    await checkIn.save();

    return NextResponse.json({
      success: true,
      checkIn,
      registration,
      message: `Assigned to ${event.title}`,
    });

  } catch (error: any) {
    console.error('Error assigning check-in:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to assign check-in' },
      { status: 500 }
    );
  }
}

// GET - Get events within 24 hours of a check-in
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const checkInId = searchParams.get('checkInId');

    if (!checkInId) {
      return NextResponse.json(
        { error: 'Check-in ID required' },
        { status: 400 }
      );
    }

    await connectDB();

    const checkIn = await CheckIn.findById(checkInId);
    if (!checkIn) {
      return NextResponse.json({ error: 'Check-in not found' }, { status: 404 });
    }

    // Get events within 12 hours of check-in time
    const checkInTime = new Date(checkIn.checkedInAt);
    const windowStart = new Date(checkInTime);
    windowStart.setHours(windowStart.getHours() - 6); // 6 hours before
    const windowEnd = new Date(checkInTime);
    windowEnd.setHours(windowEnd.getHours() + 6); // 6 hours after

    const events = await Event.find({
      status: 'active',
      date: { $gte: windowStart, $lte: windowEnd },
    }).sort({ date: 1, startTime: 1 });

    return NextResponse.json({ events });

  } catch (error: any) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

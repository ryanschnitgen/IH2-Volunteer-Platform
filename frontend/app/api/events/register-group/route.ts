import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@backend/lib/db/mongodb';
import Event from '@backend/lib/models/Event';
import EventRegistration from '@backend/lib/models/EventRegistration';
import { isAdmin } from '@backend/lib/admin';

export async function POST(request: NextRequest) {
  try {
    const { eventId, groupName, groupSize, adminEmail } = await request.json();

    if (!isAdmin(adminEmail)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    if (!eventId || !groupName?.trim() || !groupSize || groupSize < 1) {
      return NextResponse.json({ error: 'eventId, groupName, and groupSize are required' }, { status: 400 });
    }

    await dbConnect();

    const event = await Event.findById(eventId);
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Generate a unique group userId so the compound index doesn't conflict
    const groupUserId = `group-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const groupEmail = `${groupUserId}@group.ih2.org`;

    const registration = await EventRegistration.create({
      eventId: event._id,
      userId: groupUserId,
      userEmail: groupEmail,
      userName: groupName.trim(),
      eventTitle: event.title,
      eventDate: event.date,
      eventStartTime: event.startTime,
      eventEndTime: event.endTime,
      eventCategory: event.eventCategory || 'General',
      totalAttendees: groupSize,
      additionalAttendees: groupSize - 1,
      isGroupCheckIn: true,
      attended: true,
      registeredAt: new Date(),
    });

    return NextResponse.json({ success: true, registration });
  } catch (error: any) {
    console.error('Register group error:', error);
    return NextResponse.json({ error: error.message || 'Failed to add group' }, { status: 500 });
  }
}

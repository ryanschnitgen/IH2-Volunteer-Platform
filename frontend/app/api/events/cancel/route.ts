import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Event from '@/models/Event';
import EventRegistration from '@/models/EventRegistration';

export async function POST(request: NextRequest) {
  try {
    const { eventId, reason, sendEmail } = await request.json();

    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Get event details
    const event = await Event.findById(eventId);
    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Update event status to cancelled
    event.status = 'cancelled';
    await event.save();

    // Get all registrations for this event
    const registrations = await EventRegistration.find({ eventId });

    // Mark all registrations as cancelled
    await EventRegistration.updateMany(
      { eventId },
      {
        cancelled: true,
        cancellationReason: reason || 'Event cancelled by organizer'
      }
    );

    // If sendEmail is true, return the list of recipients
    if (sendEmail && registrations.length > 0) {
      const recipients = registrations.map(reg => ({
        email: reg.userEmail,
        name: reg.userName,
      }));

      return NextResponse.json({
        success: true,
        event,
        registrationsCount: registrations.length,
        recipients,
      });
    }

    return NextResponse.json({
      success: true,
      event,
      registrationsCount: registrations.length,
    });
  } catch (error: any) {
    console.error('Error cancelling event:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to cancel event' },
      { status: 500 }
    );
  }
}

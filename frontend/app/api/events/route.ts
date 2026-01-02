import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Event from '@/models/Event';

// Get all events
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const filter: any = {};
    if (status) {
      filter.status = status;

      // If filtering for active events, only show events that haven't ended yet
      if (status === 'active') {
        // Get current date/time
        const now = new Date();
        const today = now.toISOString().split('T')[0]; // YYYY-MM-DD format

        // Show events that are today or in the future
        // Events from today will show even if they've started (until midnight)
        filter.date = { $gte: today };
      }
    }

    const events = await Event.find(filter).sort({ date: 1 });
    return NextResponse.json({ events });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

// Create new event
export async function POST(request: NextRequest) {
  try {
    console.log('=== EVENT CREATION STARTED ===');
    const eventData = await request.json();
    console.log('Received event data:', JSON.stringify(eventData, null, 2));

    const {
      title,
      description,
      eventType,
      eventCategory,
      location,
      date,
      startTime,
      endTime,
      spotsAvailable,
      createdBy,
      createdByName,
      organization = 'IH2',
    } = eventData;

    console.log('Extracted fields:', {
      title,
      description,
      eventType,
      eventCategory,
      location,
      date,
      startTime,
      endTime,
      spotsAvailable,
      createdBy,
      createdByName,
      organization
    });

    // Check each required field individually
    const missingFields = [];
    if (!title) missingFields.push('title');
    if (!description) missingFields.push('description');
    if (!eventType) missingFields.push('eventType');
    if (!eventCategory) missingFields.push('eventCategory');
    if (!location) missingFields.push('location');
    if (!date) missingFields.push('date');
    if (!startTime) missingFields.push('startTime');
    if (!endTime) missingFields.push('endTime');
    if (!spotsAvailable) missingFields.push('spotsAvailable');
    if (!createdBy) missingFields.push('createdBy');
    if (!createdByName) missingFields.push('createdByName');

    if (missingFields.length > 0) {
      console.error('Missing required fields:', missingFields);
      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    console.log('Connecting to database...');
    await connectDB();
    console.log('Database connected successfully');

    const eventToCreate = {
      title,
      description,
      eventType,
      eventCategory,
      location,
      date: new Date(date),
      startTime,
      endTime,
      spotsAvailable,
      spotsRemaining: spotsAvailable,
      createdBy,
      createdByName,
      organization,
      status: 'active',
    };

    console.log('Creating event with data:', JSON.stringify(eventToCreate, null, 2));
    const event = await Event.create(eventToCreate);
    console.log('Event created successfully:', event._id);

    return NextResponse.json({ event, created: true });
  } catch (error: any) {
    console.error('=== ERROR CREATING EVENT ===');
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('Full error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create event' },
      { status: 500 }
    );
  }
}

// Update event
export async function PATCH(request: NextRequest) {
  try {
    const { eventId, ...updates } = await request.json();

    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID required' },
        { status: 400 }
      );
    }

    await connectDB();

    // If date is being updated, convert to Date object
    if (updates.date) {
      updates.date = new Date(updates.date);
    }

    const event = await Event.findByIdAndUpdate(
      eventId,
      updates,
      { new: true }
    );

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ event, updated: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update event' },
      { status: 500 }
    );
  }
}

// Delete event
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('id');

    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID required' },
        { status: 400 }
      );
    }

    await connectDB();

    const event = await Event.findByIdAndDelete(eventId);

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ deleted: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to delete event' },
      { status: 500 }
    );
  }
}

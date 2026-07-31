import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@backend/lib/db/mongodb';
import EventRegistration from '@backend/lib/models/EventRegistration';
import { isAdmin } from '@backend/lib/admin';

// Get user's event registrations
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

    const registrations = await EventRegistration.find({ userId }).sort({ eventDate: 1 });

    return NextResponse.json({ registrations });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch registrations' },
      { status: 500 }
    );
  }
}

// Update registration attendance status
export async function PATCH(request: NextRequest) {
  try {
    const { registrationId, attended, adminEmail } = await request.json();

    if (!isAdmin(adminEmail)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (!registrationId || typeof attended !== 'boolean') {
      return NextResponse.json(
        { error: 'Registration ID and attended status required' },
        { status: 400 }
      );
    }

    await connectDB();

    const registration = await EventRegistration.findByIdAndUpdate(
      registrationId,
      { attended },
      { new: true }
    );

    if (!registration) {
      return NextResponse.json(
        { error: 'Registration not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ registration, updated: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update registration' },
      { status: 500 }
    );
  }
}

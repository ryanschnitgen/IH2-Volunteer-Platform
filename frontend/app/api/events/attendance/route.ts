import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import EventRegistration from '@/models/EventRegistration';

// Mark attendance and record hours for an event registration
export async function PATCH(request: NextRequest) {
  try {
    const { registrationId, attended, hoursCompleted } = await request.json();

    if (!registrationId) {
      return NextResponse.json(
        { error: 'Registration ID required' },
        { status: 400 }
      );
    }

    await connectDB();

    const registration = await EventRegistration.findByIdAndUpdate(
      registrationId,
      {
        attended: attended !== undefined ? attended : true,
        hoursCompleted: hoursCompleted || 0,
      },
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
      { error: error.message || 'Failed to update attendance' },
      { status: 500 }
    );
  }
}

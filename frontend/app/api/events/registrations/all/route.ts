import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import EventRegistration from '@/models/EventRegistration';

// Get all event registrations across all events
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const registrations = await EventRegistration.find({})
      .sort({ eventDate: -1 })
      .lean();

    return NextResponse.json({ registrations });
  } catch (error: any) {
    console.error('Error fetching all registrations:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch registrations' },
      { status: 500 }
    );
  }
}

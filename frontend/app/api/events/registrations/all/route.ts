import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@backend/lib/db/mongodb';
import EventRegistration from '@backend/lib/models/EventRegistration';
import User from '@backend/lib/models/User';

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const user = await User.findOne({ firebaseUid: userId }).lean();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

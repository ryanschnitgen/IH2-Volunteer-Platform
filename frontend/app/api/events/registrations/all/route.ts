import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@backend/lib/db/mongodb';
import EventRegistration from '@backend/lib/models/EventRegistration';
import { isAdmin } from '@backend/lib/admin';

export async function GET(request: NextRequest) {
  try {
    const adminEmail = request.nextUrl.searchParams.get('adminEmail');

    if (!isAdmin(adminEmail)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

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

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@backend/lib/db/mongodb';
import VolunteerProfile from '@backend/lib/models/VolunteerProfile';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Check if requesting a specific user's profile
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (userId) {
      // Return single profile for user
      const profile = await VolunteerProfile.findOne({ linkedUserId: userId }).lean();
      return NextResponse.json({ profile });
    }

    // Return all volunteers
    const volunteers = await VolunteerProfile.find({})
      .sort({ lastName: 1, firstName: 1 })
      .lean();

    return NextResponse.json({ volunteers });
  } catch (error: any) {
    console.error('Error fetching volunteers:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch volunteers' },
      { status: 500 }
    );
  }
}

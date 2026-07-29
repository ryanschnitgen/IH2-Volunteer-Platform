import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@backend/lib/db/mongodb';
import VolunteerProfile from '@backend/lib/models/VolunteerProfile';
import { isAdmin } from '@backend/lib/admin';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (userId) {
      const profile = await VolunteerProfile.findOne({ linkedUserId: userId }).lean();
      return NextResponse.json({ profile });
    }

    // All-volunteers dump requires admin
    const adminEmail = searchParams.get('adminEmail');
    if (!isAdmin(adminEmail)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

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

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@backend/lib/db/mongodb';
import VolunteerProfile from '@backend/lib/models/VolunteerProfile';

// Link a volunteer profile to a Firebase user when they log in
export async function POST(request: NextRequest) {
  try {
    const { userId, email } = await request.json();

    if (!userId || !email) {
      return NextResponse.json(
        { error: 'User ID and email required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Find volunteer profile by email
    const profile = await VolunteerProfile.findOne({
      email: email.toLowerCase().trim(),
    });

    if (!profile) {
      // No existing profile, that's OK
      return NextResponse.json({
        linked: false,
        message: 'No existing volunteer profile found'
      });
    }

    // Check if already linked
    if (profile.linkedUserId && profile.linkedUserId !== userId) {
      console.warn(`Profile ${email} already linked to different user`);
      return NextResponse.json({
        linked: false,
        message: 'Profile already linked to another account'
      });
    }

    // Link the profile
    profile.linkedUserId = userId;
    profile.lastUpdated = new Date();
    await profile.save();

    return NextResponse.json({
      linked: true,
      profile: {
        firstName: profile.firstName,
        lastName: profile.lastName,
        lifetimeHours: profile.lifetimeHours,
        volunteerDateJoined: profile.volunteerDateJoined,
      },
    });

  } catch (error: any) {
    console.error('Error linking volunteer profile:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to link profile' },
      { status: 500 }
    );
  }
}

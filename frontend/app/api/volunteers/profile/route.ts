import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@backend/lib/db/mongodb';
import VolunteerProfile from '@backend/lib/models/VolunteerProfile';

// Get user's volunteer profile
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    await connectDB();

    const profile = await VolunteerProfile.findOne({ linkedUserId: userId }).lean();

    return NextResponse.json({ profile });
  } catch (error: any) {
    console.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch profile' },
      { status: 500 }
    );
  }
}

// Create or update volunteer profile
export async function POST(request: NextRequest) {
  try {
    const {
      userId,
      firstName,
      lastName,
      email,
      phone,
      address,
      city,
      state,
      zipCode,
      country,
      birthday,
      canLiftHeavy,
    } = await request.json();

    if (!userId || !firstName || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if profile already exists for this email
    let profile = await VolunteerProfile.findOne({ email: email.toLowerCase().trim() });

    if (profile) {
      // Update existing profile
      profile.firstName = firstName;
      profile.lastName = lastName;
      profile.phone = phone || profile.phone;
      profile.address = address || profile.address;
      profile.city = city || profile.city;
      profile.state = state || profile.state;
      profile.zipCode = zipCode || profile.zipCode;
      profile.country = country || profile.country;
      if (birthday) profile.birthday = new Date(birthday);
      if (typeof canLiftHeavy === 'boolean') profile.canLiftHeavy = canLiftHeavy;
      // Only link if not already linked to a different account
      if (!profile.linkedUserId || profile.linkedUserId === userId) {
        profile.linkedUserId = userId;
      }
      profile.lastUpdated = new Date();
      await profile.save();
    } else {
      // Create new profile
      profile = await VolunteerProfile.create({
        firstName,
        lastName,
        email: email.toLowerCase().trim(),
        phone,
        address,
        city,
        state,
        zipCode,
        country,
        birthday: birthday ? new Date(birthday) : undefined,
        canLiftHeavy: canLiftHeavy || false,
        linkedUserId: userId,
        lifetimeHours: 0,
        volunteerDateJoined: new Date(),
      });
    }

    return NextResponse.json({ profile, success: true });
  } catch (error: any) {
    console.error('Error creating/updating volunteer profile:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to save profile' },
      { status: 500 }
    );
  }
}

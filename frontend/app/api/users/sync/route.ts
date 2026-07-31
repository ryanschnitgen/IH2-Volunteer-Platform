import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@backend/lib/db/mongodb';
import User from '@backend/lib/models/User';
import VolunteerProfile from '@backend/lib/models/VolunteerProfile';

export async function POST(request: NextRequest) {
  try {
    const { firebaseUid, email, displayName } = await request.json();

    if (!firebaseUid || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await dbConnect();

    const normalizedEmail = email.toLowerCase().trim();

    await User.findOneAndUpdate(
      { firebaseUid },
      {
        firebaseUid,
        email: normalizedEmail,
        displayName: displayName || email.split('@')[0],
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Auto-link existing VolunteerProfile to this account if not already linked
    await VolunteerProfile.findOneAndUpdate(
      { email: normalizedEmail, linkedUserId: { $exists: false } },
      { $set: { linkedUserId: firebaseUid } }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error syncing user:', error);
    return NextResponse.json({ error: error.message || 'Failed to sync user' }, { status: 500 });
  }
}

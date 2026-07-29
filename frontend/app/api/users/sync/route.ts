import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@backend/lib/db/mongodb';
import User from '@backend/lib/models/User';

export async function POST(request: NextRequest) {
  try {
    const { firebaseUid, email, displayName } = await request.json();

    if (!firebaseUid || !email) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await dbConnect();

    await User.findOneAndUpdate(
      { firebaseUid },
      {
        firebaseUid,
        email: email.toLowerCase().trim(),
        displayName: displayName || email.split('@')[0],
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error syncing user:', error);
    return NextResponse.json({ error: error.message || 'Failed to sync user' }, { status: 500 });
  }
}

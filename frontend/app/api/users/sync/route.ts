import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import VolunteerProfile from '@/models/VolunteerProfile';
import EventRegistration from '@/models/EventRegistration';
import HoursLog from '@/models/HoursLog';

// Sync Firebase user to MongoDB
export async function POST(request: NextRequest) {
  try {
    const { firebaseUid, email, displayName } = await request.json();

    if (!firebaseUid || !email) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if user exists
    let user = await User.findOne({ firebaseUid });

    const adminEmails = process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(',').map(e => e.trim()) || [];
    const isAdmin = adminEmails.includes(email);

    if (!user) {
      // Create new user
      user = await User.create({
        firebaseUid,
        email,
        displayName: displayName || email.split('@')[0],
        isAdmin,
      });
    } else {
      // Update existing user
      user.email = email;
      user.displayName = displayName || email.split('@')[0];
      user.isAdmin = isAdmin;
      await user.save();
    }

    // Auto-link volunteer profile if exists
    let volunteerProfile = null;
    try {
      const profile = await VolunteerProfile.findOne({
        email: email.toLowerCase().trim(),
      });

      if (profile && !profile.linkedUserId) {
        profile.linkedUserId = firebaseUid;
        profile.lastUpdated = new Date();
        await profile.save();
        volunteerProfile = {
          firstName: profile.firstName,
          lastName: profile.lastName,
          lifetimeHours: profile.lifetimeHours,
        };
        console.log(`✓ Auto-linked volunteer profile for ${email}`);

        // Update any walk-in event registrations to use the real Firebase UID
        const walkInUserId = `walk-in-${email.toLowerCase().trim()}`;
        const walkInRegistrations = await EventRegistration.find({
          userId: walkInUserId,
          userEmail: email.toLowerCase().trim(),
        });

        if (walkInRegistrations.length > 0) {
          console.log(`  → Updating ${walkInRegistrations.length} walk-in registrations`);
          await EventRegistration.updateMany(
            { userId: walkInUserId, userEmail: email.toLowerCase().trim() },
            { $set: { userId: firebaseUid } }
          );

          // Also update any hours logs
          await HoursLog.updateMany(
            { userId: walkInUserId, userEmail: email.toLowerCase().trim() },
            { $set: { userId: firebaseUid } }
          );

          console.log(`  ✓ Updated walk-in records to use Firebase UID`);
        }
      }
    } catch (linkError) {
      console.error('Error linking volunteer profile:', linkError);
      // Don't fail user sync if linking fails
    }

    return NextResponse.json({
      user,
      synced: true,
      volunteerProfile,
    });
  } catch (error: any) {
    console.error('Error syncing user:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync user' },
      { status: 500 }
    );
  }
}

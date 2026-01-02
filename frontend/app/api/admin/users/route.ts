import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import VolunteerProfile from '@/models/VolunteerProfile';
import EventRegistration from '@/models/EventRegistration';
import VolunteerHours from '@/models/VolunteerHours';
import { adminAuth } from '@/lib/firebaseAdmin';
import { isSuperAdmin } from '@/lib/admin';

// Get all users
export async function GET() {
  try {
    await connectDB();
    const users = await User.find({}).sort({ createdAt: -1 });
    return NextResponse.json({ users });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// Update user admin status
export async function PATCH(request: NextRequest) {
  try {
    const { userId, firebaseUid, isAdmin } = await request.json();

    if ((!userId && !firebaseUid) || typeof isAdmin !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    await connectDB();

    let user;
    if (firebaseUid) {
      // Find by Firebase UID
      user = await User.findOneAndUpdate(
        { firebaseUid },
        { isAdmin },
        { new: true }
      );
    } else {
      // Find by MongoDB _id
      user = await User.findByIdAndUpdate(
        userId,
        { isAdmin },
        { new: true }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ user, updated: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to update user' },
      { status: 500 }
    );
  }
}

// Delete user account and all associated data
export async function DELETE(request: NextRequest) {
  try {
    const { firebaseUid, email, requestingUserEmail } = await request.json();

    if (!firebaseUid && !email) {
      return NextResponse.json(
        { error: 'Firebase UID or email required' },
        { status: 400 }
      );
    }

    // Verify requesting user is a super admin
    if (!requestingUserEmail || !isSuperAdmin(requestingUserEmail)) {
      return NextResponse.json(
        { error: 'Unauthorized. Only super admins can delete accounts.' },
        { status: 403 }
      );
    }

    await connectDB();

    // Delete from Firebase Authentication if firebaseUid provided
    if (firebaseUid) {
      try {
        await adminAuth.deleteUser(firebaseUid);
      } catch (firebaseError: any) {
        console.error('Firebase deletion error:', firebaseError);
        // Continue even if Firebase deletion fails (user might not exist in Firebase)
      }
    }

    // Delete all associated data from MongoDB
    const deletePromises = [];

    // Delete user record
    if (firebaseUid) {
      deletePromises.push(User.deleteOne({ firebaseUid }));
    }
    if (email) {
      deletePromises.push(User.deleteOne({ email }));
    }

    // Delete volunteer profile
    if (firebaseUid) {
      deletePromises.push(VolunteerProfile.deleteOne({ linkedUserId: firebaseUid }));
    }
    if (email) {
      deletePromises.push(VolunteerProfile.deleteOne({ email }));
    }

    // Delete all event registrations
    if (firebaseUid) {
      deletePromises.push(EventRegistration.deleteMany({ userId: firebaseUid }));
    }

    // Delete all volunteer hours
    if (firebaseUid) {
      deletePromises.push(VolunteerHours.deleteMany({ userId: firebaseUid }));
    }

    await Promise.all(deletePromises);

    return NextResponse.json({
      deleted: true,
      message: 'User account and all associated data deleted successfully'
    });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete user' },
      { status: 500 }
    );
  }
}

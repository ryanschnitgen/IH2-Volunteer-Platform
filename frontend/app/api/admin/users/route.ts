import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@backend/lib/db/mongodb';
import User from '@backend/lib/models/User';
import VolunteerProfile from '@backend/lib/models/VolunteerProfile';
import EventRegistration from '@backend/lib/models/EventRegistration';
import HoursLog from '@backend/lib/models/HoursLog';
import { adminAuth } from '@backend/lib/firebaseAdmin';
import { isAdmin as checkIsAdmin, isSuperAdmin } from '@backend/lib/admin';

// Get all users
export async function GET(request: NextRequest) {
  try {
    const adminEmail = request.nextUrl.searchParams.get('adminEmail');
    if (!checkIsAdmin(adminEmail)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
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
    const { userId, firebaseUid, isAdmin, adminEmail } = await request.json();

    if (!checkIsAdmin(adminEmail)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

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
        console.log(`Successfully deleted Firebase user: ${firebaseUid}`);
      } catch (firebaseError: any) {
        console.error('Firebase deletion error:', firebaseError);
        // Only continue if user doesn't exist in Firebase
        // Otherwise, throw error to prevent partial deletion
        if (firebaseError.code !== 'auth/user-not-found') {
          throw new Error(`Failed to delete Firebase user: ${firebaseError.message}`);
        }
        console.log('Firebase user not found, continuing with database cleanup');
      }
    } else if (email) {
      // If no firebaseUid but we have email, try to find and delete by email
      try {
        const userRecord = await adminAuth.getUserByEmail(email);
        await adminAuth.deleteUser(userRecord.uid);
        console.log(`Successfully deleted Firebase user by email: ${email}`);
      } catch (firebaseError: any) {
        console.error('Firebase deletion by email error:', firebaseError);
        if (firebaseError.code !== 'auth/user-not-found') {
          throw new Error(`Failed to delete Firebase user: ${firebaseError.message}`);
        }
        console.log('Firebase user not found by email, continuing with database cleanup');
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
    const regQuery: any = { $or: [] };
    if (firebaseUid) regQuery.$or.push({ userId: firebaseUid });
    if (email) regQuery.$or.push({ userEmail: email.toLowerCase().trim() });
    if (regQuery.$or.length > 0) {
      deletePromises.push(EventRegistration.deleteMany(regQuery));
    }

    // Delete all volunteer hours
    const hoursQuery: any = { $or: [] };
    if (firebaseUid) hoursQuery.$or.push({ userId: firebaseUid });
    if (email) hoursQuery.$or.push({ userEmail: email.toLowerCase().trim() });
    if (hoursQuery.$or.length > 0) {
      deletePromises.push(HoursLog.deleteMany(hoursQuery));
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

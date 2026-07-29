import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@backend/lib/db/mongodb';
import HoursLog from '@backend/lib/models/HoursLog';
import { isAdmin } from '@backend/lib/admin';

// Create a new manual hours log entry
export async function POST(request: NextRequest) {
  try {
    const { userId, userEmail, userName, hours, date, notes } = await request.json();

    if (!userId || !userEmail || !userName || !hours || !date) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    if (hours <= 0) {
      return NextResponse.json(
        { error: 'Hours must be greater than 0' },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if auto-assigned hours already exist for this date
    const dateToCheck = new Date(date);
    const startOfDay = new Date(dateToCheck);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(dateToCheck);
    endOfDay.setHours(23, 59, 59, 999);

    const existingAutoHours = await HoursLog.findOne({
      userId,
      date: { $gte: startOfDay, $lte: endOfDay },
      autoAssigned: true,
    });

    if (existingAutoHours) {
      return NextResponse.json(
        {
          error: `Event hours already exist for ${new Date(date).toLocaleDateString()} (${existingAutoHours.eventTitle || 'Event'}). Cannot manually log hours for this date.`,
        },
        { status: 400 }
      );
    }

    // Also block if a pending check-in entry exists for this date — wait for admin approval first
    const existingPending = await HoursLog.findOne({
      userId,
      date: { $gte: startOfDay, $lte: endOfDay },
      pendingApproval: true,
    });

    if (existingPending) {
      return NextResponse.json(
        {
          error: `A pending check-in exists for ${new Date(date).toLocaleDateString()} (${existingPending.eventTitle || 'Event'}). Wait for admin approval before manually logging hours.`,
        },
        { status: 400 }
      );
    }

    const hoursLog = await HoursLog.create({
      userId,
      userEmail,
      userName,
      hours,
      date: new Date(date),
      autoAssigned: false, // Manually logged
      notes: notes || '',
    });

    return NextResponse.json({ hoursLog, success: true });
  } catch (error: any) {
    console.error('Error creating hours log:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create hours log' },
      { status: 500 }
    );
  }
}

// Get hours logs for a specific user
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

    const hoursLogs = await HoursLog.find({ userId })
      .sort({ date: -1 })
      .lean();

    return NextResponse.json({ hoursLogs });
  } catch (error: any) {
    console.error('Error fetching hours logs:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch hours logs' },
      { status: 500 }
    );
  }
}

// Update hours log entry
export async function PATCH(request: NextRequest) {
  try {
    const { hoursLogId, hours, notes, adminEmail } = await request.json();

    if (!isAdmin(adminEmail)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (!hoursLogId) {
      return NextResponse.json(
        { error: 'Hours log ID required' },
        { status: 400 }
      );
    }

    if (hours !== undefined && hours <= 0) {
      return NextResponse.json(
        { error: 'Hours must be greater than 0' },
        { status: 400 }
      );
    }

    await connectDB();

    const updates: any = {};
    if (hours !== undefined) updates.hours = hours;
    if (notes !== undefined) updates.notes = notes;

    const hoursLog = await HoursLog.findByIdAndUpdate(
      hoursLogId,
      updates,
      { new: true }
    );

    if (!hoursLog) {
      return NextResponse.json(
        { error: 'Hours log not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ hoursLog, updated: true });
  } catch (error: any) {
    console.error('Error updating hours log:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update hours log' },
      { status: 500 }
    );
  }
}

// Delete hours log entry
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const hoursLogId = searchParams.get('id');
    const adminEmail = searchParams.get('adminEmail');

    if (!isAdmin(adminEmail)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (!hoursLogId) {
      return NextResponse.json(
        { error: 'Hours log ID required' },
        { status: 400 }
      );
    }

    await connectDB();

    const hoursLog = await HoursLog.findByIdAndDelete(hoursLogId);

    if (!hoursLog) {
      return NextResponse.json(
        { error: 'Hours log not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ deleted: true });
  } catch (error: any) {
    console.error('Error deleting hours log:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete hours log' },
      { status: 500 }
    );
  }
}

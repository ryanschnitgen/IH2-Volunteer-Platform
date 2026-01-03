import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@backend/lib/db/mongodb';
import ClockInOut from '@backend/lib/models/ClockInOut';
import HoursLog from '@backend/lib/models/HoursLog';

// Clock in
export async function POST(request: NextRequest) {
  try {
    const { userId, userEmail, userName, activity, notes, location } = await request.json();

    if (!userId || !userEmail || !userName || !activity) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    await connectDB();

    // Check if user is already clocked in
    const existingClockIn = await ClockInOut.findOne({
      userId,
      clockOutTime: { $exists: false },
    });

    if (existingClockIn) {
      return NextResponse.json(
        { error: 'Already clocked in. Please clock out first.' },
        { status: 400 }
      );
    }

    const clockIn = await ClockInOut.create({
      userId,
      userEmail,
      userName,
      activity,
      notes: notes || '',
      location: location || '20 Leonberg Road, Building E Cranberry Township, PA 16066',
      clockInTime: new Date(),
    });

    return NextResponse.json({ clockIn, success: true });
  } catch (error: any) {
    console.error('Error clocking in:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to clock in' },
      { status: 500 }
    );
  }
}

// Get clock in/out records for a user
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

    // Get active clock-in
    const activeClockIn = await ClockInOut.findOne({
      userId,
      clockOutTime: { $exists: false },
    });

    // Get recent clock-in/out history
    const history = await ClockInOut.find({ userId })
      .sort({ clockInTime: -1 })
      .limit(20)
      .lean();

    return NextResponse.json({
      activeClockIn,
      history,
      isClockedIn: !!activeClockIn,
    });
  } catch (error: any) {
    console.error('Error fetching clock records:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch clock records' },
      { status: 500 }
    );
  }
}

// Clock out
export async function PATCH(request: NextRequest) {
  try {
    const { userId, notes } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Find active clock-in
    const clockIn = await ClockInOut.findOne({
      userId,
      clockOutTime: { $exists: false },
    });

    if (!clockIn) {
      return NextResponse.json(
        { error: 'No active clock-in found' },
        { status: 404 }
      );
    }

    const clockOutTime = new Date();
    const clockInTime = new Date(clockIn.clockInTime);
    const hoursWorked = (clockOutTime.getTime() - clockInTime.getTime()) / (1000 * 60 * 60);
    const roundedHours = Math.round(hoursWorked * 100) / 100; // Round to 2 decimals for precision

    // Update clock-in record
    await ClockInOut.findByIdAndUpdate(clockIn._id, {
      clockOutTime,
      hours: roundedHours,
      notes: notes || clockIn.notes,
    });

    // Create hours log entry
    await HoursLog.create({
      userId: clockIn.userId,
      userEmail: clockIn.userEmail,
      userName: clockIn.userName,
      hours: roundedHours,
      date: clockInTime,
      autoAssigned: false,
      notes: `${clockIn.activity}${notes ? ` - ${notes}` : ''}`,
    });

    return NextResponse.json({
      success: true,
      hours: roundedHours,
      clockInTime,
      clockOutTime,
    });
  } catch (error: any) {
    console.error('Error clocking out:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to clock out' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@backend/lib/db/mongodb';
import HoursLog from '@backend/lib/models/HoursLog';
import User from '@backend/lib/models/User';

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const user = await User.findOne({ firebaseUid: userId }).lean();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hoursLogs = await HoursLog.find({})
      .sort({ date: -1 })
      .lean();

    return NextResponse.json({ hoursLogs });
  } catch (error: any) {
    console.error('Error fetching all hours logs:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch hours logs' },
      { status: 500 }
    );
  }
}

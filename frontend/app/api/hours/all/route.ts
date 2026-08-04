import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@backend/lib/db/mongodb';
import HoursLog from '@backend/lib/models/HoursLog';
import { isAdmin } from '@backend/lib/admin';

export async function GET(request: NextRequest) {
  try {
    const adminEmail = request.nextUrl.searchParams.get('adminEmail');

    if (!isAdmin(adminEmail)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const walkIn = request.nextUrl.searchParams.get('walkIn') === 'true';

    await connectDB();

    const query = walkIn
      ? { source: 'Walk-in Check-In', pendingApproval: true }
      : {};

    const hoursLogs = await HoursLog.find(query)
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

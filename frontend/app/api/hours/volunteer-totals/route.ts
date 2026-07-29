import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@backend/lib/db/mongodb';
import HoursLog from '@backend/lib/models/HoursLog';
import { isAdmin } from '@backend/lib/admin';

// Returns approved platform hours totals keyed by userId
export async function GET(request: NextRequest) {
  try {
    const adminEmail = request.nextUrl.searchParams.get('adminEmail');
    if (!isAdmin(adminEmail)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await connectDB();

    const totals = await HoursLog.aggregate([
      {
        $match: {
          userId: { $exists: true, $nin: [null, ''] },
          pendingApproval: { $ne: true },
          hours: { $gt: 0 },
        },
      },
      {
        $group: {
          _id: '$userId',
          totalHours: { $sum: '$hours' },
        },
      },
    ]);

    // Also get pending hours per user
    const pending = await HoursLog.aggregate([
      {
        $match: {
          userId: { $exists: true, $nin: [null, ''] },
          pendingApproval: true,
          hours: { $gt: 0 },
        },
      },
      {
        $group: {
          _id: '$userId',
          pendingHours: { $sum: '$hours' },
        },
      },
    ]);

    const result: Record<string, { approved: number; pending: number }> = {};

    for (const row of totals) {
      result[row._id] = { approved: Math.round(row.totalHours * 100) / 100, pending: 0 };
    }
    for (const row of pending) {
      if (!result[row._id]) result[row._id] = { approved: 0, pending: 0 };
      result[row._id].pending = Math.round(row.pendingHours * 100) / 100;
    }

    return NextResponse.json({ totals: result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch totals' }, { status: 500 });
  }
}

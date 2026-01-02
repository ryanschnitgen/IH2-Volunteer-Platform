import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import HoursLog from '@/models/HoursLog';

// Get all hours logs (for admin stats)
export async function GET(request: NextRequest) {
  try {
    await connectDB();

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

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@backend/lib/db/mongodb';
import HoursLog from '@backend/lib/models/HoursLog';
import { isAdmin } from '@backend/lib/admin';

// Approve or reject a pending hours entry
export async function POST(request: NextRequest) {
  try {
    const { hoursLogId, approved, hours, adminEmail } = await request.json();

    if (!isAdmin(adminEmail)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (!hoursLogId) {
      return NextResponse.json({ error: 'hoursLogId required' }, { status: 400 });
    }

    await connectDB();

    const entry = await HoursLog.findById(hoursLogId);
    if (!entry) {
      return NextResponse.json({ error: 'Hours entry not found' }, { status: 404 });
    }

    if (!entry.pendingApproval) {
      return NextResponse.json({ error: 'Entry is not pending approval' }, { status: 400 });
    }

    if (!approved) {
      // Reject: delete the pending entry
      await HoursLog.findByIdAndDelete(hoursLogId);
      return NextResponse.json({ rejected: true });
    }

    // Approve: clear pending flag, optionally update hours
    const updates: any = { pendingApproval: false };
    if (hours !== undefined && hours > 0) {
      updates.hours = hours;
    }

    const updated = await HoursLog.findByIdAndUpdate(hoursLogId, updates, { new: true });
    return NextResponse.json({ approved: true, hoursLog: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to process approval' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import connectDB from '@backend/lib/db/mongodb';
import EventRegistration from '@backend/lib/models/EventRegistration';
import HoursLog from '@backend/lib/models/HoursLog';

// Public endpoint — returns aggregate community hours for the current year only.
// No individual volunteer data is exposed.
export async function GET() {
  try {
    await connectDB();

    const year = new Date().getFullYear();
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999);

    const [registrations, manualLogs] = await Promise.all([
      EventRegistration.find({
        eventDate: { $gte: yearStart, $lte: yearEnd },
        cancelled: { $ne: true },
        hoursCompleted: { $gt: 0 },
        $or: [{ checkedIn: true }, { attended: true }],
      }).select('hoursCompleted totalAttendees').lean(),
      HoursLog.find({
        date: { $gte: yearStart, $lte: yearEnd },
        autoAssigned: { $ne: true },
        pendingApproval: { $ne: true },
      }).select('hours').lean(),
    ]);

    const eventHours = registrations.reduce(
      (sum, r) => sum + (r.hoursCompleted || 0) * (r.totalAttendees || 1),
      0
    );
    const manualHours = manualLogs.reduce((sum, l) => sum + (l.hours || 0), 0);

    return NextResponse.json({ totalHours: parseFloat((eventHours + manualHours).toFixed(2)) });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@backend/lib/db/mongodb';
import VolunteerProfile from '@backend/lib/models/VolunteerProfile';
import HoursLog from '@backend/lib/models/HoursLog';
import EventRegistration from '@backend/lib/models/EventRegistration';
import { isAdmin } from '@backend/lib/admin';

function escapeField(field: any): string {
  if (field === null || field === undefined) return '';
  const str = String(field);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const adminEmail = searchParams.get('adminEmail');
    if (!isAdmin(adminEmail)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()));
    if (isNaN(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ error: 'Invalid year' }, { status: 400 });
    }

    const yearStart = new Date(year, 0, 1);           // Jan 1
    const yearEnd = new Date(year, 11, 31, 23, 59, 59, 999); // Dec 31

    await connectDB();

    const [profiles, hoursLogs, eventRegistrations] = await Promise.all([
      VolunteerProfile.find({}).sort({ lastName: 1, firstName: 1 }).lean(),
      HoursLog.find({
        date: { $gte: yearStart, $lte: yearEnd },
        pendingApproval: { $ne: true },
        autoAssigned: { $ne: true },
      }).lean(),
      EventRegistration.find({
        eventDate: { $gte: yearStart, $lte: yearEnd },
        cancelled: { $ne: true },
        $or: [{ checkedIn: true }, { attended: true }, { hoursCompleted: { $gt: 0 } }],
      }).lean(),
    ]);

    // Build per-email maps from hours logs and event registrations
    const manualHoursMap = new Map<string, number>();
    for (const log of hoursLogs) {
      const email = (log.userEmail || log.email || '').toLowerCase().trim();
      if (email) manualHoursMap.set(email, (manualHoursMap.get(email) || 0) + (log.hours || 0));
    }

    const eventHoursMap = new Map<string, number>();
    const eventsAttendedMap = new Map<string, number>();
    for (const reg of eventRegistrations) {
      const email = (reg.userEmail || '').toLowerCase().trim();
      if (email) {
        eventHoursMap.set(email, (eventHoursMap.get(email) || 0) + (reg.hoursCompleted || 0));
        eventsAttendedMap.set(email, (eventsAttendedMap.get(email) || 0) + 1);
      }
    }

    const headers = [
      'First Name',
      'Last Name',
      'Email',
      'Phone',
      `${year} Event Hours`,
      `${year} Manual Hours`,
      `${year} Total Hours`,
      `${year} Events Attended`,
      'Lifetime Hours (Imported)',
    ];

    const rows: string[] = [
      `IH2 Volunteer Platform - ${year} Yearly Volunteer Report`,
      `Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
      '',
      headers.join(','),
    ];

    for (const profile of profiles) {
      const email = (profile.email || '').toLowerCase().trim();
      const eventHours = eventHoursMap.get(email) || 0;
      const manualHours = manualHoursMap.get(email) || 0;
      const totalHours = eventHours + manualHours;
      const eventsAttended = eventsAttendedMap.get(email) || 0;

      rows.push([
        escapeField(profile.firstName),
        escapeField(profile.lastName),
        escapeField(profile.email),
        escapeField(profile.phone),
        escapeField(eventHours.toFixed(2)),
        escapeField(manualHours.toFixed(2)),
        escapeField(totalHours.toFixed(2)),
        escapeField(eventsAttended),
        escapeField((profile.lifetimeHours || 0).toFixed(2)),
      ].join(','));
    }

    const csv = rows.join('\n');

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="IH2-Yearly-Report-${year}.csv"`,
      },
    });
  } catch (error: any) {
    console.error('Yearly report error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate yearly report' },
      { status: 500 }
    );
  }
}

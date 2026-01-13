import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@backend/lib/db/mongodb';
import HoursLog from '@backend/lib/models/HoursLog';
import VolunteerProfile from '@backend/lib/models/VolunteerProfile';
import EventRegistration from '@backend/lib/models/EventRegistration';

// 93% of guests are assumed to be unique volunteers
const GUEST_UNIQUENESS_RATE = 0.93;

interface MonthlyBreakdown {
  month: string;
  uniqueVolunteers: number;
  activeVolunteers: number;
  guestVolunteers: number;
  sessions: number;
  hours: number;
}

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const format = searchParams.get('format');

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Include full end date

    const dateFilter = {
      date: {
        $gte: start,
        $lte: end,
      },
    };

    // Get ALL hours logs in date range (including manual logs, check-ins, event hours, etc.)
    const allHoursLogs = await HoursLog.find(dateFilter);

    // Get check-ins specifically (for guest tracking)
    const checkIns = allHoursLogs.filter(log => log.isUniqueVolunteer === true);

    // Collect all unique volunteer emails from ALL sources
    const uniqueVolunteerEmails = new Set<string>();

    // Add emails from hours logs (both email and userEmail fields)
    allHoursLogs.forEach(log => {
      if (log.email) {
        uniqueVolunteerEmails.add(log.email.toLowerCase().trim());
      }
      if (log.userEmail) {
        uniqueVolunteerEmails.add(log.userEmail.toLowerCase().trim());
      }
    });

    // Also get volunteers from event registrations in the date range
    // Include anyone who participated (checked in, attended, or completed hours)
    const eventRegistrations = await EventRegistration.find({
      eventDate: {
        $gte: start,
        $lte: end,
      },
      cancelled: { $ne: true }, // Exclude cancelled registrations
      $or: [
        { checkedIn: true },
        { attended: true },
        { hoursCompleted: { $gt: 0 } }
      ]
    });

    // Add emails from event registrations
    eventRegistrations.forEach(reg => {
      if (reg.userEmail) {
        uniqueVolunteerEmails.add(reg.userEmail.toLowerCase().trim());
      }
    });

    // Count signed-in volunteers (those who actually signed in, not guests)
    const totalSignedInVolunteers = uniqueVolunteerEmails.size;

    // Calculate total guests from check-ins
    const totalGuests = checkIns.reduce((sum, log) => {
      return sum + (log.guestCount || 0);
    }, 0);

    // Apply 93% uniqueness rate to guests
    const estimatedUniqueGuests = Math.round(totalGuests * GUEST_UNIQUENESS_RATE);

    // Total unique volunteers = signed in + 93% of guests
    const totalUniqueVolunteers = totalSignedInVolunteers + estimatedUniqueGuests;

    // Get all volunteer profiles with linked accounts
    const activeVolunteerProfiles = await VolunteerProfile.find({
      linkedUserId: { $exists: true, $ne: null },
    });

    // Create a set of active volunteer emails
    const activeVolunteerEmails = new Set(
      activeVolunteerProfiles.map(v => v.email.toLowerCase().trim())
    );

    // Count how many of the volunteers who participated during this period have accounts
    const activeVolunteersInPeriod = Array.from(uniqueVolunteerEmails).filter(email =>
      activeVolunteerEmails.has(email)
    ).length;

    // Count total sessions (all hours log entries + event registrations)
    const totalSessions = allHoursLogs.length + eventRegistrations.length;

    // Calculate total hours from all sources (avoid double-counting)
    // Hours are stored in two places:
    // 1. EventRegistration.hoursCompleted - when admin assigns hours to event attendees
    // 2. HoursLog - for manual logs, clock-in/out, and auto-assigned copies from events
    // To avoid double-counting, only count HoursLog entries that are NOT auto-assigned from events
    const hoursFromLogs = allHoursLogs
      .filter(log => !log.autoAssigned) // Exclude auto-assigned to avoid double-counting with event registrations
      .reduce((sum, log) => {
        return sum + (log.hours || 0);
      }, 0);

    const hoursFromEvents = eventRegistrations.reduce((sum, reg) => {
      return sum + (reg.hoursCompleted || 0);
    }, 0);

    const totalHours = hoursFromLogs + hoursFromEvents;

    // Generate monthly breakdown
    const monthlyData = new Map<string, MonthlyBreakdown>();

    // Process hours logs by month (only non-auto-assigned to avoid double-counting)
    allHoursLogs.forEach(log => {
      const date = new Date(log.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, {
          month: monthKey,
          uniqueVolunteers: 0,
          activeVolunteers: 0,
          guestVolunteers: 0,
          sessions: 0,
          hours: 0,
        });
      }

      const monthData = monthlyData.get(monthKey)!;
      monthData.sessions += 1;
      // Only count hours from non-auto-assigned logs to avoid double-counting with event registrations
      if (!log.autoAssigned) {
        monthData.hours += log.hours || 0;
      }
    });

    // Process event registrations by month
    eventRegistrations.forEach(reg => {
      const date = new Date(reg.eventDate);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyData.has(monthKey)) {
        monthlyData.set(monthKey, {
          month: monthKey,
          uniqueVolunteers: 0,
          activeVolunteers: 0,
          guestVolunteers: 0,
          sessions: 0,
          hours: 0,
        });
      }

      const monthData = monthlyData.get(monthKey)!;
      monthData.sessions += 1;
      monthData.hours += reg.hoursCompleted || 0;
    });

    // Calculate unique volunteers per month
    for (const [monthKey, monthData] of monthlyData.entries()) {
      const [year, month] = monthKey.split('-');
      const monthStart = new Date(parseInt(year), parseInt(month) - 1, 1);
      const monthEnd = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59, 999);

      // Get unique volunteers this month from hours logs
      const monthlyHoursLogs = await HoursLog.find({
        date: { $gte: monthStart, $lte: monthEnd },
      });

      const monthlyEmails = new Set<string>();
      monthlyHoursLogs.forEach(log => {
        if (log.email) monthlyEmails.add(log.email.toLowerCase().trim());
        if (log.userEmail) monthlyEmails.add(log.userEmail.toLowerCase().trim());
      });

      // Add emails from event registrations this month
      const monthlyEvents = await EventRegistration.find({
        eventDate: { $gte: monthStart, $lte: monthEnd },
        cancelled: { $ne: true },
        $or: [
          { checkedIn: true },
          { attended: true },
          { hoursCompleted: { $gt: 0 } }
        ]
      });

      monthlyEvents.forEach(reg => {
        if (reg.userEmail) monthlyEmails.add(reg.userEmail.toLowerCase().trim());
      });

      // Count guests for this month
      const monthlyCheckIns = monthlyHoursLogs.filter(log => log.isUniqueVolunteer === true);
      const monthlyGuests = monthlyCheckIns.reduce((sum, log) => sum + (log.guestCount || 0), 0);
      const monthlyUniqueGuests = Math.round(monthlyGuests * GUEST_UNIQUENESS_RATE);

      // Active volunteers this month
      const monthlyActive = Array.from(monthlyEmails).filter(email =>
        activeVolunteerEmails.has(email)
      ).length;

      monthData.uniqueVolunteers = monthlyEmails.size + monthlyUniqueGuests;
      monthData.activeVolunteers = monthlyActive;
      monthData.guestVolunteers = monthlyUniqueGuests;
    }

    const monthlyBreakdown = Array.from(monthlyData.values()).sort((a, b) =>
      a.month.localeCompare(b.month)
    );

    const reportData = {
      totalUniqueVolunteers,
      activeVolunteers: activeVolunteersInPeriod,
      guestVolunteers: estimatedUniqueGuests,
      totalSessions,
      totalHours: parseFloat(totalHours.toFixed(2)),
      signedInVolunteers: totalSignedInVolunteers,
      estimatedUniqueGuests,
      totalGuests,
      dateRange: {
        start: startDate,
        end: endDate,
      },
      breakdown: {
        byMonth: monthlyBreakdown,
        activeVolunteersWithAccounts: activeVolunteerProfiles.length,
      },
      calculation: {
        formula: 'Total Unique = Signed In + (Guests × 93%)',
        signedIn: totalSignedInVolunteers,
        totalGuests,
        uniquenessRate: '93%',
        estimatedUniqueGuests,
        total: totalUniqueVolunteers,
      },
    };

    // If CSV format requested, generate CSV
    if (format === 'csv') {
      const csv = generateCSV(reportData);
      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="volunteer-report-${startDate}-to-${endDate}.csv"`,
        },
      });
    }

    // Return JSON by default
    return NextResponse.json(reportData);
  } catch (error: any) {
    console.error('Volunteer report error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to generate volunteer report' },
      { status: 500 }
    );
  }
}

function generateCSV(data: any): string {
  const lines: string[] = [];

  // Header
  lines.push('IH2 Volunteer Platform - Volunteer Report');
  lines.push(`Report Period: ${data.dateRange.start} to ${data.dateRange.end}`);
  lines.push('');

  // Summary Section
  lines.push('SUMMARY');
  lines.push('Metric,Value');
  lines.push(`Total Unique Volunteers,${data.totalUniqueVolunteers}`);
  lines.push(`Active Volunteers (with accounts),${data.activeVolunteers}`);
  lines.push(`Guest Volunteers (without accounts),${data.guestVolunteers}`);
  lines.push(`Total Sessions,${data.totalSessions}`);
  lines.push(`Total Hours,${data.totalHours}`);
  lines.push('');

  // Calculation Details
  lines.push('CALCULATION DETAILS');
  lines.push('Metric,Value');
  lines.push(`Signed-In Volunteers,${data.signedInVolunteers}`);
  lines.push(`Total Guests Brought,${data.totalGuests}`);
  lines.push(`Estimated Unique Guests (93%),${data.estimatedUniqueGuests}`);
  lines.push(`Formula,"${data.calculation.formula}"`);
  lines.push('');

  // Monthly Breakdown
  lines.push('MONTHLY BREAKDOWN');
  lines.push('Month,Unique Volunteers,Active Volunteers,Guest Volunteers,Sessions,Hours');
  data.breakdown.byMonth.forEach((month: MonthlyBreakdown) => {
    lines.push(
      `${month.month},${month.uniqueVolunteers},${month.activeVolunteers},${month.guestVolunteers},${month.sessions},${month.hours}`
    );
  });
  lines.push('');

  // Footer
  lines.push(`Report Generated: ${new Date().toISOString()}`);

  return lines.join('\n');
}

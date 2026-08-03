import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@backend/lib/db/mongodb';
import Event from '@backend/lib/models/Event';
import EventRegistration from '@backend/lib/models/EventRegistration';
import HoursLog from '@backend/lib/models/HoursLog';
import VolunteerProfile from '@backend/lib/models/VolunteerProfile';
import CheckIn from '@backend/lib/models/CheckIn';
import { isAdmin } from '@backend/lib/admin';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const adminEmail = searchParams.get('adminEmail');

    if (!isAdmin(adminEmail)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await connectDB();

    const range = searchParams.get('range') || 'year';

    // Calculate date range
    const now = new Date();
    let startDate = new Date(0); // Beginning of time

    if (range === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (range === 'year') {
      startDate = new Date(now.getFullYear(), 0, 1);
    }

    // Fetch all data in parallel (exclude pending hours from all metrics)
    const [
      totalVolunteers,
      allEvents,
      allRegistrations,
      allHoursLogs,
      allCheckIns,
    ] = await Promise.all([
      VolunteerProfile.countDocuments(),
      Event.find({}).lean(),
      EventRegistration.find({}).lean(),
      HoursLog.find({ pendingApproval: { $ne: true } }).lean(),
      CheckIn.find({}).lean(),
    ]);

    // Filter by date range
    const events = allEvents.filter(e => new Date(e.date) >= startDate);
    const registrations = allRegistrations.filter(r => new Date(r.eventDate) >= startDate);
    const hoursLogs = allHoursLogs.filter(h => new Date(h.date) >= startDate);

    // Calculate total hours — multiply hoursCompleted by totalAttendees to include guest person-hours
    const eventHours = registrations
      .filter(r => r.hoursCompleted > 0 && (r.checkedIn || r.attended))
      .reduce((sum, r) => sum + r.hoursCompleted * (r.totalAttendees || 1), 0);

    const manualHours = hoursLogs
      .filter((log: any) => !log.autoAssigned && !log.pendingApproval)
      .reduce((sum, log) => sum + log.hours, 0);

    const totalHours = eventHours + manualHours;

    // Current year hours — multiply by totalAttendees to include guest person-hours
    const currentYear = now.getFullYear();
    const currentYearEventHours = allRegistrations
      .filter((r: any) => new Date(r.eventDate).getFullYear() === currentYear &&
        r.hoursCompleted > 0 && (r.checkedIn || r.attended) && r.cancelled !== true)
      .reduce((sum: number, r: any) => sum + r.hoursCompleted * (r.totalAttendees || 1), 0);
    const currentYearManualHours = allHoursLogs
      .filter((log: any) => new Date(log.date).getFullYear() === currentYear &&
        !log.autoAssigned && !log.pendingApproval)
      .reduce((sum: number, log: any) => sum + log.hours, 0);
    const currentYearHours = currentYearEventHours + currentYearManualHours;

    // Average hours per volunteer (all time)
    const avgHoursPerVolunteer = totalVolunteers > 0 ? totalHours / totalVolunteers : 0;

    // Check-in rate
    const totalCheckIns = registrations.filter(r => r.checkedIn).length;
    const totalReg = registrations.filter(r => !r.cancelled).length;
    const checkInRate = totalReg > 0 ? (totalCheckIns / totalReg) * 100 : 0;

    // Event status breakdown
    const upcomingEvents = events.filter(e => e.status === 'active' && new Date(e.date) >= now).length;
    const completedEvents = events.filter(e => e.status === 'completed').length;
    const cancelledEvents = events.filter(e => e.status === 'cancelled').length;

    // Top volunteers (by hours)
    const volunteerHours = new Map<string, { name: string; email: string; hours: number }>();

    for (const log of hoursLogs) {
      const key = log.userEmail;
      if (!volunteerHours.has(key)) {
        volunteerHours.set(key, {
          name: log.userName,
          email: log.userEmail,
          hours: 0,
        });
      }
      volunteerHours.get(key)!.hours += log.hours;
    }

    const topVolunteers = Array.from(volunteerHours.values())
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 5);

    // Monthly hours trend (last 12 months)
    const monthlyHours: Array<{ month: string; hours: number }> = [];
    for (let i = 11; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      const monthHours = allHoursLogs
        .filter(log => {
          const logDate = new Date(log.date);
          return logDate >= monthStart && logDate <= monthEnd;
        })
        .reduce((sum, log) => sum + log.hours, 0);

      monthlyHours.push({
        month: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        hours: monthHours,
      });
    }

    // Category breakdown
    const categoryMap = new Map<string, { count: number; hours: number }>();

    for (const event of allEvents) {
      const category = event.eventCategory || 'Uncategorized';
      if (!categoryMap.has(category)) {
        categoryMap.set(category, { count: 0, hours: 0 });
      }
      categoryMap.get(category)!.count++;

      // Calculate hours for this event
      const eventRegs = allRegistrations.filter(r =>
        r.eventId.toString() === event._id.toString() &&
        r.hoursCompleted > 0
      );
      const eventHours = eventRegs.reduce((sum, r) => sum + r.hoursCompleted, 0);
      categoryMap.get(category)!.hours += eventHours;
    }

    const categoryBreakdown = Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        category,
        count: data.count,
        hours: data.hours,
      }))
      .sort((a, b) => b.hours - a.hours);

    // Recent activity (last 10 items)
    const recentActivity: Array<{ type: string; description: string; date: string }> = [];

    // Add recent registrations
    const recentRegs = allRegistrations
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);

    for (const reg of recentRegs) {
      recentActivity.push({
        type: 'registration',
        description: `${reg.userName} registered for ${reg.eventTitle}`,
        date: reg.createdAt,
      });
    }

    // Add recent check-ins
    const recentCheckIns = allCheckIns
      .sort((a, b) => new Date(b.checkedInAt).getTime() - new Date(a.checkedInAt).getTime())
      .slice(0, 5);

    for (const checkIn of recentCheckIns) {
      recentActivity.push({
        type: 'check-in',
        description: `${checkIn.name} checked in`,
        date: checkIn.checkedInAt,
      });
    }

    // Sort all activity by date
    recentActivity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const limitedActivity = recentActivity.slice(0, 10);

    const analytics = {
      totalVolunteers,
      totalEvents: events.length,
      totalHours,
      currentYearHours,
      avgHoursPerVolunteer,
      totalRegistrations: registrations.length,
      totalCheckIns,
      checkInRate,
      upcomingEvents,
      completedEvents,
      cancelledEvents,
      topVolunteers,
      monthlyHours,
      categoryBreakdown,
      recentActivity: limitedActivity,
    };

    return NextResponse.json({ analytics });
  } catch (error: any) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}

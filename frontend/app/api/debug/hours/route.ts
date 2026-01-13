import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@backend/lib/db/mongodb';
import HoursLog from '@backend/lib/models/HoursLog';
import EventRegistration from '@backend/lib/models/EventRegistration';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const currentYear = new Date().getFullYear();

    // Get all hours logs for current year
    const allHoursLogs = await HoursLog.find({
      date: {
        $gte: new Date(`${currentYear}-01-01`),
        $lte: new Date(`${currentYear}-12-31`),
      }
    }).lean();

    // Get all event registrations for current year
    const allRegistrations = await EventRegistration.find({
      eventDate: {
        $gte: new Date(`${currentYear}-01-01`),
        $lte: new Date(`${currentYear}-12-31`),
      }
    }).lean();

    // Calculate hours breakdown
    const autoAssignedLogs = allHoursLogs.filter(log => log.autoAssigned);
    const manualLogs = allHoursLogs.filter(log => !log.autoAssigned);

    const autoAssignedHours = autoAssignedLogs.reduce((sum, log) => sum + (log.hours || 0), 0);
    const manualHours = manualLogs.reduce((sum, log) => sum + (log.hours || 0), 0);

    const registrationHours = allRegistrations
      .filter(reg => (reg.checkedIn || reg.attended) && reg.cancelled !== true)
      .reduce((sum, reg) => sum + (reg.hoursCompleted || 0), 0);

    const cancelledRegHours = allRegistrations
      .filter(reg => reg.cancelled === true)
      .reduce((sum, reg) => sum + (reg.hoursCompleted || 0), 0);

    return NextResponse.json({
      year: currentYear,
      hoursLogs: {
        total: allHoursLogs.length,
        autoAssigned: {
          count: autoAssignedLogs.length,
          hours: autoAssignedHours,
          samples: autoAssignedLogs.slice(0, 5).map(log => ({
            date: log.date,
            hours: log.hours,
            eventTitle: log.eventTitle,
            source: log.source,
          })),
        },
        manual: {
          count: manualLogs.length,
          hours: manualHours,
          samples: manualLogs.slice(0, 5).map(log => ({
            date: log.date,
            hours: log.hours,
            eventTitle: log.eventTitle,
            source: log.source,
            category: log.category,
          })),
        },
      },
      eventRegistrations: {
        total: allRegistrations.length,
        active: {
          count: allRegistrations.filter(reg => (reg.checkedIn || reg.attended) && reg.cancelled !== true).length,
          hours: registrationHours,
          samples: allRegistrations
            .filter(reg => (reg.checkedIn || reg.attended) && reg.cancelled !== true)
            .slice(0, 5)
            .map(reg => ({
              eventTitle: reg.eventTitle,
              eventDate: reg.eventDate,
              hoursCompleted: reg.hoursCompleted,
              checkedIn: reg.checkedIn,
              attended: reg.attended,
            })),
        },
        cancelled: {
          count: allRegistrations.filter(reg => reg.cancelled === true).length,
          hours: cancelledRegHours,
        },
      },
      calculatedTotal: {
        formula: 'manualHours + registrationHours',
        manualHours,
        registrationHours,
        total: manualHours + registrationHours,
        note: 'Auto-assigned hours are excluded to avoid double-counting',
      },
    });
  } catch (error: any) {
    console.error('Debug hours error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to debug hours' },
      { status: 500 }
    );
  }
}

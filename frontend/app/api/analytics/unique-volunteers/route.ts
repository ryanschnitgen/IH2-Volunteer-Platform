import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@backend/lib/db/mongodb';
import HoursLog from '@backend/lib/models/HoursLog';
import VolunteerProfile from '@backend/lib/models/VolunteerProfile';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let dateFilter: any = {};
    if (startDate) {
      dateFilter.$gte = new Date(startDate);
    }
    if (endDate) {
      dateFilter.$lte = new Date(endDate);
    }

    const query = Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {};

    // Get unique volunteers (distinct emails from check-ins)
    const uniqueVolunteers = await HoursLog.distinct('email', {
      ...query,
      isUniqueVolunteer: true,
    });

    // Get total attendees (volunteers + guests)
    const checkIns = await HoursLog.find({
      ...query,
      isUniqueVolunteer: true,
    });

    const totalAttendees = checkIns.reduce((sum, log) => {
      return sum + (log.totalAttendees || 1);
    }, 0);

    const totalGuests = checkIns.reduce((sum, log) => {
      return sum + (log.guestCount || 0);
    }, 0);

    // Get all registered volunteers (for comparison)
    const totalRegisteredVolunteers = await VolunteerProfile.countDocuments();

    return NextResponse.json({
      uniqueVolunteers: uniqueVolunteers.length,
      totalAttendees: totalAttendees,
      totalGuests: totalGuests,
      totalCheckIns: checkIns.length,
      totalRegisteredVolunteers: totalRegisteredVolunteers,
      dateRange: {
        start: startDate || 'all time',
        end: endDate || 'present',
      },
    });
  } catch (error: any) {
    console.error('Analytics error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to get analytics' },
      { status: 500 }
    );
  }
}

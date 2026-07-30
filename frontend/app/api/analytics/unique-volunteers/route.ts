import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@backend/lib/db/mongodb';
import HoursLog from '@backend/lib/models/HoursLog';
import VolunteerProfile from '@backend/lib/models/VolunteerProfile';
import { isAdmin } from '@backend/lib/admin';

// 93% of guests are assumed to be unique volunteers
const GUEST_UNIQUENESS_RATE = 0.93;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const adminEmail = searchParams.get('adminEmail');

    if (!isAdmin(adminEmail)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await dbConnect();

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

    // Get unique volunteers who signed in (distinct emails from check-ins)
    const uniqueSignedInVolunteers = await HoursLog.distinct('email', {
      ...query,
      isUniqueVolunteer: true,
    });

    // Get all check-ins for detailed analysis
    const checkIns = await HoursLog.find({
      ...query,
      isUniqueVolunteer: true,
    });

    // Calculate totals
    const totalSignedInVolunteers = uniqueSignedInVolunteers.length;

    const totalAttendees = checkIns.reduce((sum, log) => {
      return sum + (log.totalAttendees || 1);
    }, 0);

    const totalGuests = checkIns.reduce((sum, log) => {
      return sum + (log.guestCount || 0);
    }, 0);

    // Apply 93% uniqueness rate to guests
    const estimatedUniqueGuests = Math.round(totalGuests * GUEST_UNIQUENESS_RATE);

    // Total unique volunteers = signed in volunteers + 93% of guests
    const totalUniqueVolunteers = totalSignedInVolunteers + estimatedUniqueGuests;

    // Breakdown by match type
    const matchTypes = {
      email: 0,
      exactName: 0,
      fuzzyName: 0,
      new: 0,
    };

    checkIns.forEach(log => {
      const type = (log as any).matchType;
      if (type === 'email') matchTypes.email++;
      else if (type === 'exact-name') matchTypes.exactName++;
      else if (type === 'fuzzy-name') matchTypes.fuzzyName++;
      else if (type === 'new') matchTypes.new++;
    });

    // Get all registered volunteers (for comparison)
    const totalRegisteredVolunteers = await VolunteerProfile.countDocuments();

    return NextResponse.json({
      // Main metrics
      totalUniqueVolunteers: totalUniqueVolunteers,
      signedInVolunteers: totalSignedInVolunteers,
      estimatedUniqueGuests: estimatedUniqueGuests,

      // Details
      totalAttendees: totalAttendees,
      totalGuests: totalGuests,
      totalCheckIns: checkIns.length,

      // Match quality
      matchAccuracy: {
        emailMatches: matchTypes.email,
        exactNameMatches: matchTypes.exactName,
        fuzzyNameMatches: matchTypes.fuzzyName,
        newProfiles: matchTypes.new,
        totalMatches: checkIns.length,
      },

      // Database stats
      totalRegisteredVolunteers: totalRegisteredVolunteers,

      // Calculation details
      calculation: {
        formula: "Total Unique = Signed In + (Guests × 93%)",
        signedIn: totalSignedInVolunteers,
        totalGuests: totalGuests,
        uniquenessRate: `${GUEST_UNIQUENESS_RATE * 100}%`,
        estimatedUniqueGuests: estimatedUniqueGuests,
        total: totalUniqueVolunteers,
      },

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

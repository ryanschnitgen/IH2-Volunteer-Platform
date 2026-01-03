import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@backend/lib/db/mongodb';
import VolunteerProfile from '@backend/lib/models/VolunteerProfile';
import HoursLog from '@backend/lib/models/HoursLog';

export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Fetch all volunteer profiles and hours logs
    const [profiles, allHoursLogs] = await Promise.all([
      VolunteerProfile.find({}).lean(),
      HoursLog.find({}).lean(),
    ]);

    // Calculate total hours for each volunteer
    const hoursMap = new Map<string, number>();

    for (const log of allHoursLogs) {
      const email = log.userEmail;
      const currentHours = hoursMap.get(email) || 0;
      hoursMap.set(email, currentHours + log.hours);
    }

    // Build CSV content
    const headers = [
      'Email',
      'First Name',
      'Last Name',
      'Phone',
      'Address',
      'City',
      'State',
      'Zip Code',
      'Country',
      'Birthday',
      'Can Lift Heavy',
      'Total Hours',
      'Lifetime Hours (Imported)',
      'Account Created',
    ];

    let csvContent = headers.join(',') + '\n';

    for (const profile of profiles) {
      const totalHours = hoursMap.get(profile.email) || 0;
      const lifetimeHours = profile.lifetimeHours || 0;

      // Helper function to escape CSV fields
      const escapeField = (field: any) => {
        if (field === null || field === undefined) return '';
        const str = String(field);
        // If field contains comma, quotes, or newlines, wrap in quotes and escape existing quotes
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const row = [
        escapeField(profile.email),
        escapeField(profile.firstName),
        escapeField(profile.lastName),
        escapeField(profile.phone),
        escapeField(profile.address),
        escapeField(profile.city),
        escapeField(profile.state),
        escapeField(profile.zipCode),
        escapeField(profile.country),
        escapeField(profile.birthday ? new Date(profile.birthday).toISOString().split('T')[0] : ''),
        escapeField(profile.canLiftHeavy ? 'Yes' : 'No'),
        escapeField(totalHours.toFixed(2)),
        escapeField(lifetimeHours.toFixed(2)),
        escapeField(profile.createdAt ? new Date(profile.createdAt).toISOString() : ''),
      ];

      csvContent += row.join(',') + '\n';
    }

    // Return CSV file
    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="volunteers-export-${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error: any) {
    console.error('Error exporting CSV:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to export CSV' },
      { status: 500 }
    );
  }
}

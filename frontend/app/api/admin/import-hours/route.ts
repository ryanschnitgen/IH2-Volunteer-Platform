import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@backend/lib/db/mongodb';
import HoursLog from '@backend/lib/models/HoursLog';
import VolunteerProfile from '@backend/lib/models/VolunteerProfile';
import { isAdmin } from '@backend/lib/admin';

interface ImportRow {
  DateVolunteered: string;
  HoursWorked: number;
  ActivityCategoryName: string;
  ActivityName: string;
  FirstName: string;
  LastName: string;
  Username?: string;
}

// GET endpoint for preview/validation
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userEmail = searchParams.get('userEmail');

    if (!userEmail || !isAdmin(userEmail)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    await dbConnect();

    // Get all volunteer profiles for matching preview
    const allVolunteers = await VolunteerProfile.find({})
      .select('firstName lastName email linkedUserId username')
      .lean();

    return NextResponse.json({
      success: true,
      totalVolunteers: allVolunteers.length,
      volunteers: allVolunteers.map(v => ({
        name: `${v.firstName} ${v.lastName}`,
        email: v.email,
        hasAccount: !!v.linkedUserId,
        username: v.username,
      })),
    });
  } catch (error: any) {
    console.error('Preview error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to load preview' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userEmail, data } = await request.json();

    if (!userEmail || !isAdmin(userEmail)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 403 }
      );
    }

    if (!data || !Array.isArray(data)) {
      return NextResponse.json(
        { error: 'Invalid data format - expected array of rows' },
        { status: 400 }
      );
    }

    await dbConnect();

    const results = {
      total: data.length,
      imported: 0,
      matched: 0,
      created: 0,
      errors: [] as any[],
      skipped: 0,
    };

    for (const row of data as ImportRow[]) {
      try {
        // Validate required fields
        if (!row.DateVolunteered || !row.HoursWorked || !row.FirstName || !row.LastName) {
          results.skipped++;
          continue;
        }

        // Parse date (format: M/D/YY)
        const dateParts = row.DateVolunteered.split('/');
        let month = parseInt(dateParts[0]);
        let day = parseInt(dateParts[1]);
        let year = parseInt(dateParts[2]);

        // Convert 2-digit year to 4-digit (25 = 2025, 26 = 2026)
        if (year < 100) {
          year += 2000;
        }

        const volunteerDate = new Date(year, month - 1, day);

        // Find or create volunteer profile
        const firstName = row.FirstName.trim();
        const lastName = row.LastName.trim();
        const username = row.Username?.trim().toLowerCase().replace(/\s+/g, '');

        // Try to match by username first (most reliable)
        let volunteer = null;
        if (username) {
          volunteer = await VolunteerProfile.findOne({ username });
        }

        // Fall back to name matching if username not found
        if (!volunteer) {
          const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          volunteer = await VolunteerProfile.findOne({
            firstName: { $regex: new RegExp(`^${escapeRegex(firstName)}$`, 'i') },
            lastName: { $regex: new RegExp(`^${escapeRegex(lastName)}$`, 'i') },
          });
        }

        if (!volunteer) {
          // Create new volunteer profile ONLY if not found
          // Use username if available, otherwise create a legacy email
          const legacyEmail = username
            ? `${username}@legacy.ih2.org`
            : `${firstName.toLowerCase()}.${lastName.toLowerCase()}@legacy.ih2.org`;

          volunteer = await VolunteerProfile.create({
            firstName,
            lastName,
            email: legacyEmail,
            username: username,
            lifetimeHours: 0,
            importedAt: new Date(),
            lastUpdated: new Date(),
          });
          results.created++;
        } else {
          results.matched++;
        }

        // Check if this entry already exists (prevent duplicates)
        const existing = await HoursLog.findOne({
          volunteerId: volunteer._id,
          date: volunteerDate,
          hours: row.HoursWorked,
          category: row.ActivityCategoryName,
          description: row.ActivityName,
        });

        if (existing) {
          results.skipped++;
          continue;
        }

        // Create HoursLog entry
        await HoursLog.create({
          volunteerId: volunteer._id,
          email: volunteer.email,
          userEmail: volunteer.email,
          userName: `${firstName} ${lastName}`,
          date: volunteerDate,
          hours: row.HoursWorked,
          category: row.ActivityCategoryName,
          description: row.ActivityName,
          autoAssigned: false,
          source: 'Historical Import',
          notes: `Imported from legacy system`,
        });

        results.imported++;

      } catch (error: any) {
        console.error('Error importing row:', error);
        results.errors.push({
          row: row,
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Import completed: ${results.imported} hours imported, ${results.matched} volunteers matched, ${results.created} volunteers created, ${results.skipped} skipped`,
      results,
    });
  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to import hours' },
      { status: 500 }
    );
  }
}

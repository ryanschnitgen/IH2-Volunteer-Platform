import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@backend/lib/db/mongodb';
import VolunteerProfile from '@backend/lib/models/VolunteerProfile';
import { isAdmin } from '@backend/lib/admin';

interface ImportVolunteerRow {
  FirstName: string;
  LastName: string;
  Username?: string;
  EmailAddress?: string;
  CellPhone?: string;
  Address1?: string;
  City?: string;
  Province?: string;
  PostalCode?: string;
  Country?: string;
  Birthday?: string;
  VolunteerDateJoined?: string;
  'Q - Able to lift heavy items'?: string;
  HoursWorked?: number;
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
      .select('firstName lastName email linkedUserId')
      .lean();

    return NextResponse.json({
      success: true,
      totalVolunteers: allVolunteers.length,
      volunteers: allVolunteers.map(v => {
        // Extract username from legacy email (username@legacy.ih2.org)
        let username = undefined;
        if (v.email.endsWith('@legacy.ih2.org')) {
          username = v.email.replace('@legacy.ih2.org', '');
        }
        return {
          name: `${v.firstName} ${v.lastName}`,
          email: v.email,
          hasAccount: !!v.linkedUserId,
          username,
        };
      }),
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
      updated: 0,
      created: 0,
      errors: [] as any[],
      skipped: 0,
    };

    for (const row of data as ImportVolunteerRow[]) {
      try {
        // Validate required fields
        if (!row.FirstName || !row.LastName) {
          results.skipped++;
          continue;
        }

        const firstName = row.FirstName.trim();
        const lastName = row.LastName.trim();
        const username = row.Username?.trim().toLowerCase().replace(/\s+/g, '');

        // Determine email (prefer EmailAddress, fall back to legacy email with username)
        let email = row.EmailAddress?.trim().toLowerCase();
        if (!email && username) {
          email = `${username}@legacy.ih2.org`;
        }
        if (!email) {
          email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@legacy.ih2.org`;
        }

        // Try to match by username first (most reliable)
        let volunteer = null;
        if (username) {
          const legacyEmail = `${username}@legacy.ih2.org`;
          volunteer = await VolunteerProfile.findOne({
            email: legacyEmail,
          });
        }

        // Fall back to email match
        if (!volunteer && row.EmailAddress) {
          volunteer = await VolunteerProfile.findOne({
            email: email,
          });
        }

        // Fall back to name matching
        if (!volunteer) {
          volunteer = await VolunteerProfile.findOne({
            firstName: { $regex: new RegExp(`^${firstName}$`, 'i') },
            lastName: { $regex: new RegExp(`^${lastName}$`, 'i') },
          });
        }

        // Parse birthday
        let birthday = undefined;
        if (row.Birthday) {
          try {
            const parts = row.Birthday.split('/');
            if (parts.length === 3) {
              let month = parseInt(parts[0]);
              let day = parseInt(parts[1]);
              let year = parseInt(parts[2]);
              if (year < 100) year += 2000;
              birthday = new Date(year, month - 1, day);
            }
          } catch (e) {
            // Skip invalid birthday
          }
        }

        // Parse volunteer date joined
        let volunteerDateJoined = undefined;
        if (row.VolunteerDateJoined) {
          try {
            const parts = row.VolunteerDateJoined.split('/');
            if (parts.length === 3) {
              let month = parseInt(parts[0]);
              let day = parseInt(parts[1]);
              let year = parseInt(parts[2]);
              if (year < 100) year += 2000;
              volunteerDateJoined = new Date(year, month - 1, day);
            }
          } catch (e) {
            // Skip invalid date
          }
        }

        // Prepare update data
        const updateData = {
          firstName,
          lastName,
          email,
          phone: row.CellPhone?.trim(),
          address: row.Address1?.trim(),
          city: row.City?.trim(),
          state: row.Province?.trim(),
          zipCode: row.PostalCode?.trim(),
          country: row.Country?.trim(),
          birthday,
          volunteerDateJoined,
          canLiftHeavy: row['Q - Able to lift heavy items']?.toLowerCase() === 'yes',
          lifetimeHours: row.HoursWorked || 0,
          lastUpdated: new Date(),
        };

        if (volunteer) {
          // Update existing volunteer
          await VolunteerProfile.updateOne(
            { _id: volunteer._id },
            { $set: updateData }
          );
          results.updated++;
        } else {
          // Create new volunteer profile
          await VolunteerProfile.create({
            ...updateData,
            importedAt: new Date(),
          });
          results.created++;
        }

      } catch (error: any) {
        console.error('Error importing volunteer:', error);
        results.errors.push({
          row: row,
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Import completed: ${results.updated} volunteers updated, ${results.created} volunteers created, ${results.skipped} skipped`,
      results,
    });
  } catch (error: any) {
    console.error('Import error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to import volunteers' },
      { status: 500 }
    );
  }
}

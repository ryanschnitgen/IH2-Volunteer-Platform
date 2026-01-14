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
      updated: 0,
      notFound: 0,
      errors: [] as any[],
      skipped: 0,
      notFoundList: [] as any[],
    };

    for (const row of data as ImportVolunteerRow[]) {
      try {
        // Validate required fields
        if (!row.FirstName || !row.LastName) {
          results.skipped++;
          continue;
        }

        const firstName = row.FirstName?.trim();
        const lastName = row.LastName?.trim();
        const email = row.EmailAddress?.trim().toLowerCase();
        const username = row.Username?.trim().toLowerCase().replace(/\s+/g, '');

        if (!username || !email) {
          results.skipped++;
          continue;
        }

        // Match by email (most reliable for existing volunteers)
        const volunteer = await VolunteerProfile.findOne({
          email: email,
        });

        if (volunteer) {
          // Update existing volunteer with username
          await VolunteerProfile.updateOne(
            { _id: volunteer._id },
            { $set: { username, lastUpdated: new Date() } }
          );
          results.updated++;
        } else {
          // Not found - don't create, just track it
          results.notFound++;
          results.notFoundList.push({
            firstName: firstName || '',
            lastName: lastName || '',
            email,
            username,
          });
        }

      } catch (error: any) {
        console.error('Error importing volunteer username:', error);
        results.errors.push({
          row: row,
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: `Import completed: ${results.updated} volunteers updated with usernames, ${results.notFound} not found in database, ${results.skipped} skipped`,
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

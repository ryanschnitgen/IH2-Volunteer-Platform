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

    console.log(`Starting volunteer import: ${data.length} rows`);

    const results = {
      total: data.length,
      updated: 0,
      notFound: 0,
      errors: [] as any[],
      skipped: 0,
      notFoundList: [] as any[],
    };

    // Build a map of email -> username from CSV
    const emailToUsername = new Map<string, { username: string; firstName: string; lastName: string }>();

    for (const row of data as ImportVolunteerRow[]) {
      const firstName = row.FirstName?.trim();
      const lastName = row.LastName?.trim();
      const email = row.EmailAddress?.trim().toLowerCase();
      const username = row.Username?.trim().toLowerCase().replace(/\s+/g, '');

      if (!username || !email) {
        results.skipped++;
        continue;
      }

      emailToUsername.set(email, { username, firstName: firstName || '', lastName: lastName || '' });
    }

    console.log(`Processing ${emailToUsername.size} unique volunteers`);

    // Fetch all volunteers that match these emails in bulk
    const emails = Array.from(emailToUsername.keys());
    const volunteers = await VolunteerProfile.find({
      email: { $in: emails }
    }).select('email _id').lean();

    console.log(`Found ${volunteers.length} matching volunteers in database`);

    // Build bulk update operations
    const bulkOps = [];
    const foundEmails = new Set();

    for (const volunteer of volunteers) {
      const csvData = emailToUsername.get(volunteer.email);
      if (csvData) {
        foundEmails.add(volunteer.email);
        bulkOps.push({
          updateOne: {
            filter: { _id: volunteer._id },
            update: { $set: { username: csvData.username, lastUpdated: new Date() } }
          }
        });
      }
    }

    // Execute bulk update if there are operations
    if (bulkOps.length > 0) {
      console.log(`Executing bulk update for ${bulkOps.length} volunteers`);
      const bulkResult = await VolunteerProfile.bulkWrite(bulkOps);
      results.updated = bulkResult.modifiedCount;
      console.log(`Bulk update completed: ${results.updated} modified`);
    }

    // Track not found
    for (const [email, csvData] of emailToUsername.entries()) {
      if (!foundEmails.has(email)) {
        results.notFound++;
        results.notFoundList.push({
          firstName: csvData.firstName,
          lastName: csvData.lastName,
          email,
          username: csvData.username,
        });
      }
    }

    console.log(`Import completed: ${results.updated} updated, ${results.notFound} not found, ${results.skipped} skipped`);

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

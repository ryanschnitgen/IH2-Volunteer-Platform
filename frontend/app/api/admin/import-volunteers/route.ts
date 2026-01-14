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
      created: 0,
      errors: [] as any[],
      skipped: 0,
      skippedDetails: [] as any[],
    };

    // Build a map of email -> volunteer data from CSV
    const emailToVolunteerData = new Map<string, any>();

    for (const row of data as ImportVolunteerRow[]) {
      const firstName = row.FirstName?.trim();
      const lastName = row.LastName?.trim();
      const email = row.EmailAddress?.trim().toLowerCase();
      const username = row.Username?.trim().toLowerCase().replace(/\s+/g, '');

      // Skip if missing critical data
      if (!firstName || !lastName) {
        results.skipped++;
        results.skippedDetails.push({ reason: 'Missing name', firstName, lastName, email, username });
        continue;
      }

      if (!email && !username) {
        results.skipped++;
        results.skippedDetails.push({ reason: 'Missing both email and username', firstName, lastName });
        continue;
      }

      // Generate email if missing but have username
      let finalEmail = email;
      if (!finalEmail && username) {
        finalEmail = `${username}@legacy.ih2.org`;
      }
      // Generate email if missing both
      if (!finalEmail) {
        finalEmail = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@legacy.ih2.org`;
      }

      // Use email as key (generated or real)
      if (!emailToVolunteerData.has(finalEmail)) {
        emailToVolunteerData.set(finalEmail, {
          firstName,
          lastName,
          email: finalEmail,
          username,
          fullRow: row,
        });
      }
    }

    console.log(`Processing ${emailToVolunteerData.size} unique volunteers`);
    if (results.skippedDetails.length > 0) {
      console.log(`Skipped ${results.skippedDetails.length} rows:`, results.skippedDetails.slice(0, 10));
    }

    // Fetch all volunteers that match these emails in bulk
    const emails = Array.from(emailToVolunteerData.keys());
    const volunteers = await VolunteerProfile.find({
      email: { $in: emails }
    }).select('email _id').lean();

    console.log(`Found ${volunteers.length} matching volunteers in database`);

    // Build bulk update operations
    const bulkOps = [];
    const foundEmails = new Set();

    for (const volunteer of volunteers) {
      const csvData = emailToVolunteerData.get(volunteer.email);
      if (csvData) {
        foundEmails.add(volunteer.email);
        const updateFields: any = { lastUpdated: new Date() };
        if (csvData.username) {
          updateFields.username = csvData.username;
        }
        bulkOps.push({
          updateOne: {
            filter: { _id: volunteer._id },
            update: { $set: updateFields }
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

    // Create new volunteers for emails not found
    const volunteersToCreate = [];
    for (const [email, csvData] of emailToVolunteerData.entries()) {
      if (!foundEmails.has(email)) {
        const fullRow = csvData.fullRow;

        if (fullRow && csvData.firstName && csvData.lastName) {
          // Parse birthday
          let birthday = undefined;
          if (fullRow.Birthday) {
            try {
              const parts = fullRow.Birthday.split('/');
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
          if (fullRow.VolunteerDateJoined) {
            try {
              const parts = fullRow.VolunteerDateJoined.split('/');
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

          const volunteerData: any = {
            firstName: csvData.firstName,
            lastName: csvData.lastName,
            email: csvData.email,
            phone: fullRow.CellPhone?.trim(),
            address: fullRow.Address1?.trim(),
            city: fullRow.City?.trim(),
            state: fullRow.Province?.trim(),
            zipCode: fullRow.PostalCode?.trim(),
            country: fullRow.Country?.trim(),
            birthday,
            volunteerDateJoined,
            canLiftHeavy: fullRow['Q - Able to lift heavy items']?.toLowerCase() === 'yes',
            lifetimeHours: fullRow.HoursWorked || 0,
            importedAt: new Date(),
            lastUpdated: new Date(),
          };

          // Only add username if it exists
          if (csvData.username) {
            volunteerData.username = csvData.username;
          }

          volunteersToCreate.push(volunteerData);
        }
      }
    }

    // Bulk create new volunteers
    if (volunteersToCreate.length > 0) {
      console.log(`Creating ${volunteersToCreate.length} new volunteers`);
      const createResult = await VolunteerProfile.insertMany(volunteersToCreate, { ordered: false });
      results.created = createResult.length;
      console.log(`Created ${results.created} new volunteers`);
    }

    console.log(`Import completed: ${results.updated} updated, ${results.created} created, ${results.skipped} skipped`);

    return NextResponse.json({
      success: true,
      message: `Import completed: ${results.updated} volunteers updated with usernames, ${results.created} new volunteers created, ${results.skipped} skipped`,
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

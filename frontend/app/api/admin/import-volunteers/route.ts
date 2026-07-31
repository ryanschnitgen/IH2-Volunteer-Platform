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
        email: v.email || undefined,
        hasAccount: !!v.linkedUserId,
        username: v.username || undefined,
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
      matched: 0,  // How many CSV rows matched existing volunteers
      updated: 0,  // How many documents were actually modified
      attemptedCreate: 0,  // How many we tried to create
      created: 0,
      errors: [] as any[],
      skipped: 0,
      skippedDetails: [] as any[],
    };

    // Build a list of volunteer data from CSV
    const volunteersData = [];

    for (let i = 0; i < (data as ImportVolunteerRow[]).length; i++) {
      const row = (data as ImportVolunteerRow[])[i];
      const firstName = row.FirstName?.toString().trim();
      const lastName = row.LastName?.toString().trim();
      const email = row.EmailAddress?.toString().trim().toLowerCase() || undefined;
      const username = row.Username?.toString().trim().toLowerCase().replace(/\s+/g, '') || undefined;

      // Skip if missing critical data
      if (!firstName || firstName === '') {
        results.skipped++;
        results.skippedDetails.push({
          reason: 'Missing FirstName',
          row: i + 2, // +2 because Excel is 1-indexed and has header row
          firstName: firstName || '(empty)',
          lastName: lastName || '(empty)',
          email: email || '(empty)',
          username: username || '(empty)'
        });
        continue;
      }

      if (!lastName || lastName === '') {
        results.skipped++;
        results.skippedDetails.push({
          reason: 'Missing LastName',
          row: i + 2,
          firstName: firstName || '(empty)',
          lastName: lastName || '(empty)',
          email: email || '(empty)',
          username: username || '(empty)'
        });
        continue;
      }

      volunteersData.push({
        firstName,
        lastName,
        email, // undefined if not in CSV
        username, // undefined if not in CSV
        fullRow: row,
      });
    }

    if (results.skippedDetails.length > 0) {
    }

    // Build matching criteria - match by email OR username
    const emailsToMatch = volunteersData.filter(v => v.email).map(v => v.email);
    const usernamesToMatch = volunteersData.filter(v => v.username).map(v => v.username);

    // Fetch volunteers that match by email or username
    const volunteers = await VolunteerProfile.find({
      $or: [
        { email: { $in: emailsToMatch } },
        { username: { $in: usernamesToMatch } }
      ]
    }).select('email username _id').lean();


    // Build maps of existing volunteers by email and username
    const existingByEmail = new Map();
    const existingByUsername = new Map();
    for (const vol of volunteers) {
      if (vol.email) existingByEmail.set(vol.email, vol);
      if (vol.username) existingByUsername.set(vol.username, vol);
    }

    // Build bulk update operations and track which CSV volunteers to create
    const bulkOps = [];
    const matchedCsvIndices = new Set();

    for (let i = 0; i < volunteersData.length; i++) {
      const csvData = volunteersData[i];

      // Try to match by email first, then username
      let matchedVol = null;
      if (csvData.email) {
        matchedVol = existingByEmail.get(csvData.email);
      }
      if (!matchedVol && csvData.username) {
        matchedVol = existingByUsername.get(csvData.username);
      }

      if (matchedVol) {
        // Update existing volunteer
        matchedCsvIndices.add(i);
        const updateFields: any = { lastUpdated: new Date() };
        if (csvData.username) updateFields.username = csvData.username;
        if (csvData.email) updateFields.email = csvData.email;
        const fr = csvData.fullRow;
        if (fr.CellPhone?.toString().trim()) updateFields.phone = fr.CellPhone.toString().trim();
        if (fr.Address1?.toString().trim()) updateFields.address = fr.Address1.toString().trim();
        if (fr.City?.toString().trim()) updateFields.city = fr.City.toString().trim();
        if (fr.Province?.toString().trim()) updateFields.state = fr.Province.toString().trim();
        if (fr.PostalCode?.toString().trim()) updateFields.zipCode = fr.PostalCode.toString().trim();
        if (fr.Country?.toString().trim()) updateFields.country = fr.Country.toString().trim();
        if (fr.Birthday) {
          try {
            const parts = fr.Birthday.split('/');
            if (parts.length === 3) {
              let month = parseInt(parts[0]);
              let day = parseInt(parts[1]);
              let year = parseInt(parts[2]);
              if (year < 100) year += 2000;
              updateFields.birthday = new Date(year, month - 1, day);
            }
          } catch (e) {}
        }
        if (fr['Q - Able to lift heavy items'] !== undefined) {
          updateFields.canLiftHeavy = fr['Q - Able to lift heavy items'].toString().toLowerCase() === 'yes';
        }
        if (fr.HoursWorked !== undefined && fr.HoursWorked !== null) {
          updateFields.lifetimeHours = fr.HoursWorked;
        }
        if (fr.VolunteerDateJoined) {
          try {
            const parts = fr.VolunteerDateJoined.split('/');
            if (parts.length === 3) {
              let month = parseInt(parts[0]);
              let day = parseInt(parts[1]);
              let year = parseInt(parts[2]);
              if (year < 100) year += 2000;
              updateFields.volunteerDateJoined = new Date(year, month - 1, day);
            }
          } catch (e) {}
        }
        bulkOps.push({
          updateOne: {
            filter: { _id: matchedVol._id },
            update: { $set: updateFields }
          }
        });
      }
    }

    // Track how many matched
    results.matched = matchedCsvIndices.size;

    // Execute bulk update if there are operations
    if (bulkOps.length > 0) {
      const bulkResult = await VolunteerProfile.bulkWrite(bulkOps);
      results.updated = bulkResult.modifiedCount;
    }

    // Create new volunteers not found in database
    const volunteersToCreate: any[] = [];
    for (let i = 0; i < volunteersData.length; i++) {
      if (!matchedCsvIndices.has(i)) {
        const csvData = volunteersData[i];
        const fullRow = csvData.fullRow;

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
          phone: fullRow.CellPhone?.toString().trim(),
          address: fullRow.Address1?.toString().trim(),
          city: fullRow.City?.toString().trim(),
          state: fullRow.Province?.toString().trim(),
          zipCode: fullRow.PostalCode?.toString().trim(),
          country: fullRow.Country?.toString().trim(),
          birthday,
          volunteerDateJoined,
          canLiftHeavy: fullRow['Q - Able to lift heavy items']?.toString().toLowerCase() === 'yes',
          lifetimeHours: fullRow.HoursWorked || 0,
          importedAt: new Date(),
          lastUpdated: new Date(),
        };

        // Only add email if it exists in CSV
        if (csvData.email) {
          volunteerData.email = csvData.email;
        }

        // Only add username if it exists in CSV
        if (csvData.username) {
          volunteerData.username = csvData.username;
        }

        volunteersToCreate.push(volunteerData);
      }
    }

    // Bulk create new volunteers
    results.attemptedCreate = volunteersToCreate.length;
    if (volunteersToCreate.length > 0) {

      try {
        const createResult = await VolunteerProfile.insertMany(volunteersToCreate, { ordered: false });
        results.created = createResult.length;
      } catch (insertError: any) {

        // Check for bulk write error (partial success)
        if (insertError.insertedDocs) {
          results.created = insertError.insertedDocs.length;
        } else if (insertError.result?.insertedCount) {
          results.created = insertError.result.insertedCount;
        }

        // Log the errors
        if (insertError.writeErrors && insertError.writeErrors.length > 0) {
          insertError.writeErrors.slice(0, 10).forEach((err: any, idx: number) => {
            results.errors.push({
              type: 'create_failed',
              message: err.errmsg || err.message,
              volunteer: volunteersToCreate[err.index]?.firstName + ' ' + volunteersToCreate[err.index]?.lastName,
            });
          });
          if (insertError.writeErrors.length > 10) {
            results.errors.push({
              type: 'info',
              message: `... and ${insertError.writeErrors.length - 10} more errors`,
            });
          }
        } else if (insertError.errors && insertError.errors.length > 0) {
          // Mongoose validation errors
          Object.keys(insertError.errors).slice(0, 10).forEach((key: string) => {
            const err = insertError.errors[key];
            results.errors.push({
              type: 'validation_failed',
              field: key,
              message: err.message,
            });
          });
        } else {
          results.errors.push({
            type: 'create_failed',
            message: insertError.message || 'Unknown error during insert',
            code: insertError.code,
          });
        }
      }
    } else {
    }


    return NextResponse.json({
      success: true,
      message: `Import completed: ${results.matched} matched (${results.updated} modified), ${results.created} new volunteers created, ${results.skipped} skipped`,
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

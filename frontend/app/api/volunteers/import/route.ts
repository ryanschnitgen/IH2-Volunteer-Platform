import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@backend/lib/db/mongodb';
import VolunteerProfile from '@backend/lib/models/VolunteerProfile';

// CSV column mapping from the old platform
interface CSVRow {
  FirstName: string;
  LastName: string;
  EmailAddress: string;
  SecondaryEmailAddress?: string;
  HomePhone?: string;
  WorkPhone?: string;
  CellPhone?: string;
  PhonePreference?: string;
  Address1?: string;
  Address2?: string;
  City?: string;
  PostalCode?: string;
  Province?: string;
  Country?: string;
  Birthday?: string;
  VolunteerDateJoined?: string;
  'Q - Able to lift heavy items'?: string;
  HoursWorked?: string;
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== VOLUNTEER IMPORT STARTED ===');
    const { csvData } = await request.json();

    if (!csvData || !Array.isArray(csvData)) {
      return NextResponse.json(
        { error: 'Invalid CSV data format' },
        { status: 400 }
      );
    }

    console.log(`Processing ${csvData.length} rows...`);

    await connectDB();

    const results = {
      total: csvData.length,
      imported: 0,
      updated: 0,
      skipped: 0,
      errors: [] as any[],
    };

    // Group by email to handle duplicates
    const emailGroups = new Map<string, CSVRow[]>();

    for (const row of csvData) {
      const email = row.EmailAddress?.toLowerCase().trim();
      if (!email) {
        results.skipped++;
        continue;
      }

      if (!emailGroups.has(email)) {
        emailGroups.set(email, []);
      }
      emailGroups.get(email)!.push(row);
    }

    console.log(`Found ${emailGroups.size} unique emails`);

    // Process each email group
    for (const [email, rows] of emailGroups) {
      try {
        // Merge data from duplicate rows (take most recent or non-empty values)
        const mergedRow = mergeDuplicateRows(rows);

        // Determine phone number based on preference
        let phone = '';
        const preference = mergedRow.PhonePreference?.toLowerCase();
        if (preference === 'cell' || preference === 'mobile') {
          phone = mergedRow.CellPhone || mergedRow.HomePhone || mergedRow.WorkPhone || '';
        } else if (preference === 'home') {
          phone = mergedRow.HomePhone || mergedRow.CellPhone || mergedRow.WorkPhone || '';
        } else if (preference === 'work') {
          phone = mergedRow.WorkPhone || mergedRow.CellPhone || mergedRow.HomePhone || '';
        } else {
          // Default: prefer cell, then home, then work
          phone = mergedRow.CellPhone || mergedRow.HomePhone || mergedRow.WorkPhone || '';
        }

        // Parse birthday
        let birthday: Date | undefined;
        if (mergedRow.Birthday) {
          const parsed = new Date(mergedRow.Birthday);
          if (!isNaN(parsed.getTime())) {
            birthday = parsed;
          }
        }

        // Parse volunteer date joined
        let volunteerDateJoined: Date | undefined;
        if (mergedRow.VolunteerDateJoined) {
          const parsed = new Date(mergedRow.VolunteerDateJoined);
          if (!isNaN(parsed.getTime())) {
            volunteerDateJoined = parsed;
          }
        }

        // Parse hours
        const lifetimeHours = parseFloat(mergedRow.HoursWorked || '0') || 0;

        // Parse can lift heavy
        const canLiftHeavy = mergedRow['Q - Able to lift heavy items']?.toLowerCase() === 'yes';

        // Build address string
        const addressParts = [mergedRow.Address1, mergedRow.Address2].filter(Boolean);
        const address = addressParts.join(', ');

        const profileData = {
          firstName: mergedRow.FirstName,
          lastName: mergedRow.LastName,
          email: email,
          phone: phone || undefined,
          address: address || undefined,
          city: mergedRow.City || undefined,
          state: mergedRow.Province || undefined,
          zipCode: mergedRow.PostalCode || undefined,
          country: mergedRow.Country || undefined,
          birthday,
          volunteerDateJoined,
          canLiftHeavy,
          lifetimeHours,
          lastUpdated: new Date(),
        };

        // Check if profile already exists
        const existing = await VolunteerProfile.findOne({ email });

        if (existing) {
          // Update existing profile
          await VolunteerProfile.findByIdAndUpdate(existing._id, profileData);
          results.updated++;
          console.log(`  ✓ Updated: ${email}`);
        } else {
          // Create new profile
          await VolunteerProfile.create(profileData);
          results.imported++;
          console.log(`  ✓ Imported: ${email}`);
        }

      } catch (error: any) {
        console.error(`  ✗ Error processing ${email}:`, error.message);
        results.errors.push({
          email,
          error: error.message,
        });
        results.skipped++;
      }
    }

    console.log('=== IMPORT COMPLETE ===');
    console.log(`Imported: ${results.imported}`);
    console.log(`Updated: ${results.updated}`);
    console.log(`Skipped: ${results.skipped}`);
    console.log(`Errors: ${results.errors.length}`);

    return NextResponse.json({
      success: true,
      ...results,
    });

  } catch (error: any) {
    console.error('=== IMPORT FAILED ===');
    console.error(error);
    return NextResponse.json(
      { error: error.message || 'Failed to import volunteers' },
      { status: 500 }
    );
  }
}

// Helper function to merge duplicate rows
function mergeDuplicateRows(rows: CSVRow[]): CSVRow {
  if (rows.length === 1) return rows[0];

  const merged: any = {};

  // For each field, take the first non-empty value
  for (const row of rows) {
    for (const [key, value] of Object.entries(row)) {
      if (value && value.toString().trim() && !merged[key]) {
        merged[key] = value;
      }
    }
  }

  return merged as CSVRow;
}

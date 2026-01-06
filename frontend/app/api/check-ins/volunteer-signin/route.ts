import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@backend/lib/db/mongodb';
import VolunteerProfile from '@backend/lib/models/VolunteerProfile';
import HoursLog from '@backend/lib/models/HoursLog';

// Calculate Levenshtein distance for fuzzy name matching
function levenshteinDistance(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  const matrix: number[][] = [];

  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[s2.length][s1.length];
}

// Calculate similarity score (0-100%)
function nameSimilarity(name1: string, name2: string): number {
  const distance = levenshteinDistance(name1, name2);
  const maxLength = Math.max(name1.length, name2.length);
  return ((maxLength - distance) / maxLength) * 100;
}

// Normalize name for comparison
function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

export async function POST(request: NextRequest) {
  try {
    const { name, email, hasGuests, guestCount, timestamp } = await request.json();

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }

    await dbConnect();

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedName = normalizeName(name);

    // STEP 1: Try to match by email (most reliable)
    let volunteer = await VolunteerProfile.findOne({ email: normalizedEmail });
    let matchType = 'email';
    let isNewVolunteer = false;

    if (!volunteer) {
      // STEP 2: Try to match by exact name
      const nameParts = name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      volunteer = await VolunteerProfile.findOne({
        firstName: { $regex: new RegExp(`^${firstName}$`, 'i') },
        lastName: { $regex: new RegExp(`^${lastName}$`, 'i') }
      });

      if (volunteer) {
        matchType = 'exact-name';
        console.log(`✓ Matched by exact name: ${firstName} ${lastName} → ${volunteer.email}`);
      }
    } else {
      console.log(`✓ Matched by email: ${normalizedEmail}`);
    }

    if (!volunteer) {
      // STEP 3: Try fuzzy name matching (for typos, nicknames, etc.)
      const allVolunteers = await VolunteerProfile.find({});
      let bestMatch: any = null;
      let bestScore = 0;
      const SIMILARITY_THRESHOLD = 80; // 80% similarity required

      for (const v of allVolunteers) {
        const dbFullName = `${v.firstName} ${v.lastName}`;
        const similarity = nameSimilarity(normalizedName, normalizeName(dbFullName));

        if (similarity > bestScore && similarity >= SIMILARITY_THRESHOLD) {
          bestScore = similarity;
          bestMatch = v;
        }
      }

      if (bestMatch) {
        volunteer = bestMatch;
        matchType = 'fuzzy-name';
        console.log(`✓ Matched by fuzzy name: "${name}" → "${bestMatch.firstName} ${bestMatch.lastName}" (${bestScore.toFixed(1)}% match)`);
      }
    }

    if (!volunteer) {
      // STEP 4: Create new volunteer profile (no match found)
      const nameParts = name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      volunteer = await VolunteerProfile.create({
        firstName,
        lastName,
        email: normalizedEmail,
        createdAt: new Date(),
      });

      matchType = 'new';
      isNewVolunteer = true;
      console.log('✓ Created new volunteer profile:', volunteer._id);
    }

    // Log the check-in
    const totalAttendees = 1 + (hasGuests ? guestCount : 0);
    const actualGuestCount = hasGuests ? guestCount : 0;

    const checkInLog = await HoursLog.create({
      volunteerId: volunteer._id,
      volunteerName: name,
      email: normalizedEmail,
      date: new Date(timestamp),
      category: 'Check-In',
      description: hasGuests
        ? `Check-in with ${actualGuestCount} guest${actualGuestCount > 1 ? 's' : ''} (${totalAttendees} total people)`
        : 'Check-in (individual)',
      isUniqueVolunteer: true, // This person is a unique volunteer
      guestCount: actualGuestCount,
      totalAttendees: totalAttendees,
      hasGuests: hasGuests || false,
      hours: 0, // Hours will be assigned by admin later
      source: 'Volunteer Sign-In Form',
      matchType: matchType, // Track how we matched this volunteer
    });

    console.log('Check-in logged:', checkInLog._id);
    console.log(`Unique volunteer: ${name} (${normalizedEmail})`);
    console.log(`Match type: ${matchType}`);
    console.log(`Total people: ${totalAttendees} (1 volunteer + ${actualGuestCount} guests)`);

    return NextResponse.json({
      success: true,
      message: 'Check-in successful',
      volunteerId: volunteer._id,
      totalAttendees: totalAttendees,
      isNewVolunteer: isNewVolunteer,
      matchType: matchType,
    });
  } catch (error: any) {
    console.error('Check-in error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process check-in' },
      { status: 500 }
    );
  }
}

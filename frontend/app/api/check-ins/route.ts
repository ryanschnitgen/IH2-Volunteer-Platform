import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@backend/lib/db/mongodb';
import CheckIn from '@backend/lib/models/CheckIn';
import EventRegistration from '@backend/lib/models/EventRegistration';
import VolunteerProfile from '@backend/lib/models/VolunteerProfile';
import Event from '@backend/lib/models/Event';
import { isAdmin } from '@backend/lib/admin';

// Levenshtein distance for fuzzy string matching
function levenshteinDistance(str1: string, str2: string): number {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();
  const len1 = s1.length;
  const len2 = s2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len2; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len1; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= len2; i++) {
    for (let j = 1; j <= len1; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[len2][len1];
}

// Calculate similarity percentage (0-100)
function similarityScore(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1, str2);
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 100;
  return Math.round(((maxLen - distance) / maxLen) * 100);
}

// Match check-in to existing registrations
async function findBestMatch(eventId: string, name: string, email: string) {
  const registrations = await EventRegistration.find({ eventId, cancelled: { $ne: true } });
  const profiles = await VolunteerProfile.find({});

  let bestMatch: any = null;
  let bestScore = 0;

  for (const registration of registrations) {
    let score = 0;

    // Email matching (highest priority)
    const emailSimilarity = similarityScore(email, registration.userEmail);
    if (emailSimilarity === 100) {
      score += 50; // Exact email match is very strong
    } else if (emailSimilarity >= 80) {
      score += 30; // Close email match
    }

    // Name matching
    const nameSimilarity = similarityScore(name, registration.userName);
    if (nameSimilarity === 100) {
      score += 30; // Exact name match
    } else if (nameSimilarity >= 80) {
      score += 20; // Close name match
    } else {
      // Try matching just first name or last name
      const nameParts = name.toLowerCase().split(' ');
      const regNameParts = registration.userName.toLowerCase().split(' ');

      if (nameParts.some(part => regNameParts.includes(part))) {
        score += 10; // Partial name match
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = {
        registration,
        score,
        emailSimilarity,
        nameSimilarity,
      };
    }
  }

  // Also check against volunteer profiles for users who might not be registered
  for (const profile of profiles) {
    let score = 0;

    const emailSimilarity = similarityScore(email, profile.email);
    if (emailSimilarity === 100) {
      score += 40;
    } else if (emailSimilarity >= 80) {
      score += 25;
    }

    const fullName = `${profile.firstName} ${profile.lastName}`.trim();
    const nameSimilarity = similarityScore(name, fullName);
    if (nameSimilarity === 100) {
      score += 25;
    } else if (nameSimilarity >= 80) {
      score += 15;
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = {
        profile,
        score,
        emailSimilarity,
        nameSimilarity,
      };
    }
  }

  return bestMatch;
}

// POST - Import check-ins from Google Form
export async function POST(request: NextRequest) {
  try {
    const { eventId, checkIns, adminEmail } = await request.json();

    if (!isAdmin(adminEmail)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (!eventId || !checkIns || !Array.isArray(checkIns)) {
      return NextResponse.json(
        { error: 'Event ID and check-ins array required' },
        { status: 400 }
      );
    }

    await connectDB();

    const results = {
      imported: 0,
      matched: 0,
      newRegistrations: 0,
      errors: [] as any[],
      checkInRecords: [] as any[],
    };

    for (const checkIn of checkIns) {
      try {
        const { name, email, timestamp } = checkIn;

        if (!name || !email) {
          results.errors.push({ name, email, error: 'Missing name or email' });
          continue;
        }

        // Check if already checked in
        const existing = await CheckIn.findOne({
          eventId,
          email: email.toLowerCase().trim(),
        });

        if (existing) {
          continue;
        }

        // Find best match
        const match = await findBestMatch(eventId, name, email);

        const checkInRecord: any = {
          eventId,
          name: name.trim(),
          email: email.toLowerCase().trim(),
          checkedInAt: timestamp ? new Date(timestamp) : new Date(),
        };

        if (match && match.score >= 50) {
          // Good match found
          if (match.registration) {
            // Update existing registration
            await EventRegistration.findByIdAndUpdate(match.registration._id, {
              checkedIn: true,
            });

            checkInRecord.matched = true;
            checkInRecord.matchedUserId = match.registration.userId;
            checkInRecord.matchedRegistrationId = match.registration._id;
            checkInRecord.matchConfidence = match.score;
            checkInRecord.notes = `Auto-matched to ${match.registration.userName} (${match.registration.userEmail})`;

            results.matched++;
          } else if (match.profile) {
            // Create new registration from profile (only if account is linked)
            const profile = match.profile;

            if (!profile.linkedUserId) {
              checkInRecord.matched = false;
              checkInRecord.matchConfidence = match.score;
              checkInRecord.notes = `Profile found but no linked account (${match.score}% confidence)`;
            } else {
              const event = await Event.findById(eventId);

              if (event) {
                const newRegistration = await EventRegistration.create({
                  eventId,
                  userId: profile.linkedUserId,
                  userEmail: profile.email,
                  userName: `${profile.firstName} ${profile.lastName}`,
                  eventTitle: event.title,
                  eventDate: event.date,
                  eventStartTime: event.startTime,
                  eventEndTime: event.endTime,
                  eventCategory: event.eventCategory || 'General',
                  checkedIn: true,
                  attended: false,
                });

                checkInRecord.matched = true;
                checkInRecord.matchedUserId = profile.linkedUserId;
                checkInRecord.matchedRegistrationId = newRegistration._id;
                checkInRecord.matchConfidence = match.score;
                checkInRecord.notes = `Auto-created registration from profile (${match.score}% confidence)`;

                results.newRegistrations++;
              }
            }
          }
        } else {
          // No good match - store as unmatched
          checkInRecord.matched = false;
          checkInRecord.matchConfidence = match ? match.score : 0;
          checkInRecord.notes = match
            ? `Low confidence match (${match.score}%)`
            : 'No match found';

        }

        const savedCheckIn = await CheckIn.create(checkInRecord);
        results.checkInRecords.push(savedCheckIn);
        results.imported++;

      } catch (error: any) {
        console.error(`  ✗ Error processing ${checkIn.email}:`, error.message);
        results.errors.push({
          name: checkIn.name,
          email: checkIn.email,
          error: error.message,
        });
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
    });

  } catch (error: any) {
    console.error('Error importing check-ins:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to import check-ins' },
      { status: 500 }
    );
  }
}

// GET - Retrieve check-ins for an event
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');

    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID required' },
        { status: 400 }
      );
    }

    await connectDB();

    const checkIns = await CheckIn.find({ eventId })
      .sort({ checkedInAt: -1 })
      .lean();

    return NextResponse.json({ checkIns });
  } catch (error: any) {
    console.error('Error fetching check-ins:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch check-ins' },
      { status: 500 }
    );
  }
}

// PATCH - Manually match or update check-in
export async function PATCH(request: NextRequest) {
  try {
    const { checkInId, matchedRegistrationId, matchedUserId, notes, adminEmail } = await request.json();

    if (!isAdmin(adminEmail)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (!checkInId) {
      return NextResponse.json(
        { error: 'Check-in ID required' },
        { status: 400 }
      );
    }

    await connectDB();

    const updates: any = {
      notes: notes || '',
    };

    if (matchedRegistrationId) {
      updates.matched = true;
      updates.matchedRegistrationId = matchedRegistrationId;

      // Update registration to mark as checked in
      await EventRegistration.findByIdAndUpdate(matchedRegistrationId, {
        checkedIn: true,
      });
    }

    if (matchedUserId) {
      updates.matchedUserId = matchedUserId;
    }

    const checkIn = await CheckIn.findByIdAndUpdate(checkInId, updates, { new: true });

    if (!checkIn) {
      return NextResponse.json(
        { error: 'Check-in not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ checkIn, updated: true });
  } catch (error: any) {
    console.error('Error updating check-in:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update check-in' },
      { status: 500 }
    );
  }
}

// DELETE - Delete a check-in
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const checkInId = searchParams.get('id');
    const adminEmail = searchParams.get('adminEmail');

    if (!isAdmin(adminEmail)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (!checkInId) {
      return NextResponse.json(
        { error: 'Check-in ID required' },
        { status: 400 }
      );
    }

    await connectDB();

    const checkIn = await CheckIn.findByIdAndDelete(checkInId);

    if (!checkIn) {
      return NextResponse.json(
        { error: 'Check-in not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ deleted: true });
  } catch (error: any) {
    console.error('Error deleting check-in:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete check-in' },
      { status: 500 }
    );
  }
}

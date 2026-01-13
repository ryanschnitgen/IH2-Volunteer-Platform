import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@backend/lib/db/mongodb';
import VolunteerProfile from '@backend/lib/models/VolunteerProfile';
import HoursLog from '@backend/lib/models/HoursLog';
import EventRegistration from '@backend/lib/models/EventRegistration';
import Event from '@backend/lib/models/Event';

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

// Find the best matching event based on current time
async function findMatchingEvent(checkInTime: Date) {
  const now = checkInTime;

  // Find events within the time window (30 min before start to 30 min after end)
  const events = await Event.find({
    status: { $ne: 'cancelled' },
  });

  const matchingEvents = [];

  for (const event of events) {
    const eventDate = new Date(event.date);
    const [startHour, startMin] = event.startTime.split(':').map(Number);
    const [endHour, endMin] = event.endTime.split(':').map(Number);

    const eventStart = new Date(eventDate);
    eventStart.setHours(startHour, startMin, 0, 0);

    const eventEnd = new Date(eventDate);
    eventEnd.setHours(endHour, endMin, 0, 0);

    // 30 minutes before start
    const windowStart = new Date(eventStart.getTime() - 30 * 60 * 1000);
    // 30 minutes after end
    const windowEnd = new Date(eventEnd.getTime() + 30 * 60 * 1000);

    if (now >= windowStart && now <= windowEnd) {
      const hasStarted = now >= eventStart;
      const hasEnded = now > eventEnd;

      matchingEvents.push({
        event,
        eventStart,
        eventEnd,
        hasStarted,
        hasEnded,
        // Calculate how close we are to the start time
        distanceToStart: Math.abs(now.getTime() - eventStart.getTime()),
        // Time until event starts (negative if already started)
        timeUntilStart: eventStart.getTime() - now.getTime(),
      });
    }
  }

  if (matchingEvents.length === 0) {
    return null;
  }

  // Priority logic:
  // 1. Prioritize events that haven't started yet (upcoming events)
  // 2. Among upcoming events, pick the one starting soonest
  // 3. If no upcoming events, pick currently running events
  // 4. Among running events, pick the one that started most recently
  matchingEvents.sort((a, b) => {
    // Both haven't started - pick the one starting soonest
    if (!a.hasStarted && !b.hasStarted) {
      return a.timeUntilStart - b.timeUntilStart;
    }

    // One has started, one hasn't - prioritize the one that hasn't started
    if (!a.hasStarted && b.hasStarted) {
      return -1; // a comes first
    }
    if (a.hasStarted && !b.hasStarted) {
      return 1; // b comes first
    }

    // Both have started - pick the one that started most recently (smallest distance to start)
    return a.distanceToStart - b.distanceToStart;
  });

  const selected = matchingEvents[0];
  console.log(`Found ${matchingEvents.length} matching events.`);
  console.log(`Selected: ${selected.event.title} (starts: ${selected.eventStart.toLocaleTimeString()}, ${selected.hasStarted ? 'already started' : `starts in ${Math.round(selected.timeUntilStart / 60000)} min`})`);

  return selected.event;
}

export async function POST(request: NextRequest) {
  try {
    const { name, email, hasGuests, guestCount, timestamp, eventId } = await request.json();

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }

    await dbConnect();

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedName = normalizeName(name);
    const checkInTime = timestamp ? new Date(timestamp) : new Date();

    // Get event details
    let event = null;
    if (eventId) {
      // Specific event ID provided (for direct QR codes)
      event = await Event.findById(eventId);
      if (!event) {
        return NextResponse.json(
          { error: 'Event not found' },
          { status: 404 }
        );
      }
    } else {
      // No event ID - find the best matching event based on time
      event = await findMatchingEvent(checkInTime);
      if (event) {
        console.log(`✓ Auto-matched to event: ${event.title}`);
      }
    }

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

    // Calculate attendee counts
    const totalAttendees = 1 + (hasGuests ? guestCount : 0);
    const actualGuestCount = hasGuests ? guestCount : 0;

    // Handle event registration if eventId is provided
    let eventRegistration = null;
    if (event) {
      // Try to find existing registration
      eventRegistration = await EventRegistration.findOne({
        eventId: event._id,
        $or: [
          { userEmail: normalizedEmail },
          { userId: volunteer.linkedUserId }
        ],
        cancelled: { $ne: true }
      });

      if (eventRegistration) {
        // Update existing registration to mark as checked in
        eventRegistration.checkedIn = true;
        eventRegistration.groupSize = totalAttendees;
        await eventRegistration.save();
        console.log(`✓ Marked existing registration as checked in for event: ${event.title}`);
      } else {
        // Create new registration for walk-in
        eventRegistration = await EventRegistration.create({
          eventId: event._id,
          userId: volunteer.linkedUserId || '',
          userEmail: normalizedEmail,
          userName: name,
          eventTitle: event.title,
          eventDate: event.date,
          eventStartTime: event.startTime,
          eventEndTime: event.endTime,
          eventCategory: event.eventCategory || event.category || 'General',
          groupSize: totalAttendees,
          checkedIn: true,
          attended: false,
          registeredAt: new Date(timestamp),
        });
        console.log(`✓ Created new registration (walk-in) for event: ${event.title}`);
      }
    }

    // Log the check-in

    const checkInLog = await HoursLog.create({
      volunteerId: volunteer._id,
      volunteerName: name,
      email: normalizedEmail,
      date: new Date(timestamp),
      eventId: event?._id,
      eventTitle: event?.title,
      category: event ? 'Event Check-In' : 'Check-In',
      description: event
        ? `Event: ${event.title}${hasGuests ? ` (with ${actualGuestCount} guest${actualGuestCount > 1 ? 's' : ''})` : ''}`
        : hasGuests
        ? `Check-in with ${actualGuestCount} guest${actualGuestCount > 1 ? 's' : ''} (${totalAttendees} total people)`
        : 'Check-in (individual)',
      isUniqueVolunteer: true, // This person is a unique volunteer
      guestCount: actualGuestCount,
      totalAttendees: totalAttendees,
      hasGuests: hasGuests || false,
      hours: 0, // Hours will be assigned by admin later
      source: event ? 'Event QR Code Check-In' : 'Volunteer Sign-In Form',
      matchType: matchType, // Track how we matched this volunteer
    });

    console.log('Check-in logged:', checkInLog._id);
    console.log(`Unique volunteer: ${name} (${normalizedEmail})`);
    console.log(`Match type: ${matchType}`);
    if (event) console.log(`Event: ${event.title}`);
    console.log(`Total people: ${totalAttendees} (1 volunteer + ${actualGuestCount} guests)`);

    return NextResponse.json({
      success: true,
      message: event
        ? `Checked in successfully for ${event.title}`
        : 'Check-in successful',
      volunteerId: volunteer._id,
      totalAttendees: totalAttendees,
      isNewVolunteer: isNewVolunteer,
      matchType: matchType,
      eventTitle: event?.title,
      eventId: event?._id,
      autoMatched: eventId ? false : !!event, // True if we auto-matched to an event
      registrationMatched: !!eventRegistration,
    });
  } catch (error: any) {
    console.error('Check-in error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process check-in' },
      { status: 500 }
    );
  }
}

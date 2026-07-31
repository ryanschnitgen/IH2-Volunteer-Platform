import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@backend/lib/db/mongodb';
import CheckIn from '@backend/lib/models/CheckIn';
import EventRegistration from '@backend/lib/models/EventRegistration';
import VolunteerProfile from '@backend/lib/models/VolunteerProfile';
import Event from '@backend/lib/models/Event';
import HoursLog from '@backend/lib/models/HoursLog';

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

function similarityScore(str1: string, str2: string): number {
  const distance = levenshteinDistance(str1, str2);
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 100;
  return Math.round(((maxLen - distance) / maxLen) * 100);
}

async function findBestMatch(eventId: string, name: string, email: string) {
  const registrations = await EventRegistration.find({ eventId, cancelled: { $ne: true } });
  const profiles = await VolunteerProfile.find({});

  let bestMatch: any = null;
  let bestScore = 0;

  for (const registration of registrations) {
    let score = 0;

    const emailSimilarity = similarityScore(email, registration.userEmail);
    if (emailSimilarity === 100) {
      score = 100; // Exact email = 100% (email is unique identifier)
    } else if (emailSimilarity >= 80) {
      // For non-exact email, check name too
      const nameSimilarity = similarityScore(name, registration.userName);
      if (nameSimilarity === 100) {
        score = 70; // Close email + exact name = 70%
      } else if (nameSimilarity >= 80) {
        score = 50; // Close email + close name = 50%
      } else {
        const nameParts = name.toLowerCase().split(' ');
        const regNameParts = registration.userName.toLowerCase().split(' ');
        if (nameParts.some(part => regNameParts.includes(part))) {
          score = 30; // Close email + partial name = 30%
        }
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = { registration, score, emailSimilarity, nameSimilarity: emailSimilarity === 100 ? 100 : similarityScore(name, registration.userName) };
    }
  }

  for (const profile of profiles) {
    let score = 0;

    const emailSimilarity = similarityScore(email, profile.email);
    const fullName = `${profile.firstName} ${profile.lastName}`.trim();
    const nameSimilarity = similarityScore(name, fullName);

    if (emailSimilarity === 100) {
      score = 100; // Exact email = 100% (email is unique identifier)
    } else if (emailSimilarity >= 80) {
      // For non-exact email, check name too
      if (nameSimilarity === 100) {
        score = 70; // Close email + exact name = 70%
      } else if (nameSimilarity >= 80) {
        score = 50; // Close email + close name = 50%
      }
    }

    if (score > bestScore) {
      bestScore = score;
      bestMatch = { profile, score, emailSimilarity, nameSimilarity };
    }
  }

  return bestMatch;
}

// Find the event closest to the check-in time
function findClosestEvent(events: any[], checkInTime: Date) {
  const checkInHour = checkInTime.getHours();
  const checkInMinute = checkInTime.getMinutes();
  const checkInTotalMinutes = checkInHour * 60 + checkInMinute;

  let closestEvent = events[0];
  let closestDiff = Infinity;

  for (const event of events) {
    const [startHour, startMinute] = event.startTime.split(':').map(Number);
    const eventStartMinutes = startHour * 60 + startMinute;
    const diff = Math.abs(eventStartMinutes - checkInTotalMinutes);

    if (diff < closestDiff) {
      closestDiff = diff;
      closestEvent = event;
    }
  }

  return closestEvent;
}

// Calculate hours from event start/end time
function calculateEventHours(startTime: string, endTime: string): number {
  const start = startTime.split(':');
  const end = endTime.split(':');
  const startMinutes = parseInt(start[0]) * 60 + parseInt(start[1]);
  const endMinutes = parseInt(end[0]) * 60 + parseInt(end[1]);
  return Math.round(((endMinutes - startMinutes) / 60) * 10) / 10;
}

// Automatically assign hours for QR check-in
async function autoAssignHours(registration: any, event: any) {
  try {
    // Calculate hours
    const hoursToAssign = calculateEventHours(event.startTime, event.endTime);

    // Check if hours already assigned
    const existing = await HoursLog.findOne({
      userId: registration.userId,
      eventId: event._id,
    });

    if (existing) {
      return;
    }

    // Create hours log entry
    await HoursLog.create({
      userId: registration.userId,
      userEmail: registration.userEmail,
      userName: registration.userName,
      eventId: event._id,
      eventTitle: event.title,
      hours: hoursToAssign,
      date: event.date,
      autoAssigned: true,
      notes: `Auto-assigned - QR code check-in at ${event.title}`,
    });

    // Update registration with hours and attended status
    await EventRegistration.findByIdAndUpdate(registration._id, {
      hoursCompleted: hoursToAssign,
      attended: true,
    });

    // Mark event as completed now that hours have been assigned (event has happened)
    if (event.status === 'active') {
      await Event.findByIdAndUpdate(event._id, {
        status: 'completed',
      });
    }
  } catch (error: any) {
    console.error(`  ✗ Error auto-assigning hours:`, error.message);
  }
}

// Webhook endpoint for Google Forms
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    const { name, email, eventTitle, timestamp } = data;

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Find event by title or use smart time-based matching
    let event;
    if (eventTitle) {
      // Try to find event by exact or partial title match
      const escapedTitle = eventTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      event = await Event.findOne({
        title: new RegExp(escapedTitle, 'i'),
        status: 'active',
      }).sort({ date: -1 });
    }

    if (!event) {
      // Get all active events happening within 12 hours
      const now = new Date();
      const checkInTime = timestamp ? new Date(timestamp) : now;
      const windowStart = new Date(checkInTime);
      windowStart.setHours(windowStart.getHours() - 6); // 6 hours before
      const windowEnd = new Date(checkInTime);
      windowEnd.setHours(windowEnd.getHours() + 6); // 6 hours after

      const eventsInWindow = await Event.find({
        status: 'active',
        date: { $gte: windowStart, $lte: windowEnd },
      }).sort({ date: 1, startTime: 1 });

      if (eventsInWindow.length === 0) {
        return NextResponse.json(
          { error: 'No active events found within 12-hour window.' },
          { status: 404 }
        );
      }

      // Find which events the user is registered for
      const userRegistrations = await EventRegistration.find({
        userEmail: email.toLowerCase().trim(),
        eventId: { $in: eventsInWindow.map(e => e._id) },
        cancelled: { $ne: true },
      });

      if (userRegistrations.length > 0) {
        // User is registered for one or more events - pick the closest one by time
        const registeredEventIds = userRegistrations.map(r => r.eventId.toString());
        const registeredEvents = eventsInWindow.filter(e =>
          registeredEventIds.includes(e._id.toString())
        );

        // Find the event closest to the current time
        event = findClosestEvent(registeredEvents, checkInTime);
      } else {
        // User not registered - pick the closest event by time
        event = findClosestEvent(eventsInWindow, checkInTime);
      }
    }

    // Check if CheckIn record already exists
    const existingCheckIn = await CheckIn.findOne({
      eventId: event._id,
      email: email.toLowerCase().trim(),
    });

    // Check if registration already marked as checked in
    const existingRegistration = await EventRegistration.findOne({
      eventId: event._id,
      userEmail: email.toLowerCase().trim(),
    });

    if (existingRegistration && existingRegistration.checkedIn && existingRegistration.hoursCompleted > 0) {
      return NextResponse.json({
        success: true,
        message: 'Already checked in and hours assigned',
        event: event.title,
        duplicate: true,
      });
    }

    // Find best match
    const match = await findBestMatch(event._id.toString(), name, email);

    const checkInRecord: any = {
      eventId: event._id,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      checkedInAt: timestamp ? new Date(timestamp) : new Date(),
    };

    if (match && match.score >= 50) {
      if (match.registration) {
        // Update existing registration
        const updatedRegistration = await EventRegistration.findByIdAndUpdate(
          match.registration._id,
          { checkedIn: true },
          { new: true }
        );

        checkInRecord.matched = true;
        checkInRecord.matchedUserId = match.registration.userId;
        checkInRecord.matchedRegistrationId = match.registration._id;
        checkInRecord.matchConfidence = match.score;
        checkInRecord.notes = `Auto-matched to ${match.registration.userName} (${match.registration.userEmail})`;

        // Automatically assign hours for QR check-in (use updated registration)
        if (updatedRegistration) {
          await autoAssignHours(updatedRegistration, event);
        }
      } else if (match.profile) {
        // Create new registration from profile
        const profile = match.profile;

        const newRegistration = await EventRegistration.create({
          eventId: event._id,
          userId: profile.linkedUserId || '',
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
        checkInRecord.notes = `Auto-created registration (${match.score}% confidence)`;

        // Automatically assign hours for QR check-in
        await autoAssignHours(newRegistration, event);
      }
    } else {
      // Low confidence or no match - try exact email, then check guest names

      // First try exact email match
      let exactEmailRegistration = await EventRegistration.findOne({
        eventId: event._id,
        userEmail: email.toLowerCase().trim(),
        cancelled: { $ne: true },
      });

      // Guests cannot check in - only the main registrant can check in
      // This ensures only people who actually checked in get counted for hours

      if (exactEmailRegistration) {
        // Found exact email match - update it
        const updatedRegistration = await EventRegistration.findByIdAndUpdate(
          exactEmailRegistration._id,
          { checkedIn: true },
          { new: true }
        );

        checkInRecord.matched = true;
        checkInRecord.matchedUserId = exactEmailRegistration.userId;
        checkInRecord.matchedRegistrationId = exactEmailRegistration._id;
        checkInRecord.matchConfidence = 100;

        // Preserve guest check-in note if it was set earlier
        if (!checkInRecord.notes) {
          checkInRecord.notes = `Matched by exact email: ${email}`;
        }

        if (updatedRegistration) {
          await autoAssignHours(updatedRegistration, event);
        }
      } else {
        // No match found - create new registration and volunteer profile

        // Parse name into first/last
        const nameParts = name.trim().split(/\s+/);
        const firstName = nameParts[0] || 'Unknown';
        const lastName = nameParts.slice(1).join(' ') || '';

        // Check if volunteer profile exists, if not create one
        let profile = await VolunteerProfile.findOne({ email: email.toLowerCase().trim() });

        if (!profile) {
          profile = await VolunteerProfile.create({
            firstName,
            lastName,
            email: email.toLowerCase().trim(),
            lifetimeHours: 0,
            importedAt: new Date(),
            lastUpdated: new Date(),
          });
        }

        // Create new registration
        const newRegistration = await EventRegistration.create({
          eventId: event._id,
          userId: profile.linkedUserId || `walk-in-${email.toLowerCase().trim()}`,
          userEmail: email.toLowerCase().trim(),
          userName: name.trim(),
          eventTitle: event.title,
          eventDate: event.date,
          eventStartTime: event.startTime,
          eventEndTime: event.endTime,
          eventCategory: event.eventCategory || 'General',
          checkedIn: true,
          attended: false,
          totalAttendees: 1,
        });

        checkInRecord.matched = true;
        checkInRecord.matchedUserId = newRegistration.userId;
        checkInRecord.matchedRegistrationId = newRegistration._id;
        checkInRecord.matchConfidence = 100;
        checkInRecord.notes = `Walk-in registration created automatically via QR check-in`;

        // Automatically assign hours for QR check-in
        await autoAssignHours(newRegistration, event);
      }
    }

    // Create or update CheckIn record
    if (existingCheckIn) {
      await CheckIn.findByIdAndUpdate(existingCheckIn._id, checkInRecord);
    } else {
      await CheckIn.create(checkInRecord);
    }

    return NextResponse.json({
      success: true,
      message: checkInRecord.matched ? 'Check-in processed and hours assigned!' : 'Check-in recorded',
      event: event.title,
      matched: checkInRecord.matched,
      confidence: checkInRecord.matchConfidence,
    });

  } catch (error: any) {
    console.error('❌ Webhook error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process check-in' },
      { status: 500 }
    );
  }
}

// GET endpoint to verify webhook is working
export async function GET(request: NextRequest) {
  return NextResponse.json({
    status: 'active',
    message: 'QR Code Check-In Webhook Ready',
    endpoint: '/api/check-ins/webhook',
  });
}

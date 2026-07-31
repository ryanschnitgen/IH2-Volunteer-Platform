import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@backend/lib/db/mongodb';
import VolunteerProfile from '@backend/lib/models/VolunteerProfile';
import HoursLog from '@backend/lib/models/HoursLog';
import EventRegistration from '@backend/lib/models/EventRegistration';
import Event from '@backend/lib/models/Event';

function levenshteinDistance(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();
  const matrix: number[][] = [];
  for (let i = 0; i <= s2.length; i++) matrix[i] = [i];
  for (let j = 0; j <= s1.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
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
  return matrix[s2.length][s1.length];
}

function nameSimilarity(name1: string, name2: string): number {
  const distance = levenshteinDistance(name1, name2);
  const maxLength = Math.max(name1.length, name2.length);
  return ((maxLength - distance) / maxLength) * 100;
}

function normalizeName(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

interface ActiveEvent {
  event: any;
  eventStart: Date;
  eventEnd: Date;
  hasStarted: boolean;
  hasEnded: boolean;
  timeUntilStart: number;
}

// Returns all non-cancelled events scheduled for the same calendar day as checkInTime
async function findActiveEvents(checkInTime: Date): Promise<ActiveEvent[]> {
  const now = checkInTime;
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(now);
  dayEnd.setHours(23, 59, 59, 999);

  const events = await Event.find({
    status: { $ne: 'cancelled' },
    date: { $gte: dayStart, $lte: dayEnd },
  });
  const active: ActiveEvent[] = [];

  for (const event of events) {
    const eventDate = new Date(event.date);
    const [startHour, startMin] = event.startTime.split(':').map(Number);
    const [endHour, endMin] = event.endTime.split(':').map(Number);

    const eventStart = new Date(eventDate);
    eventStart.setHours(startHour, startMin, 0, 0);

    const eventEnd = new Date(eventDate);
    eventEnd.setHours(endHour, endMin, 0, 0);

    active.push({
      event,
      eventStart,
      eventEnd,
      hasStarted: now >= eventStart,
      hasEnded: now > eventEnd,
      timeUntilStart: eventStart.getTime() - now.getTime(),
    });
  }

  active.sort((a, b) => a.eventStart.getTime() - b.eventStart.getTime());
  return active;
}

// For an unregistered walk-in: pick the single best event using back-to-back logic.
// Rule: working from latest to earliest active event, pick the first one where
// now >= event.start - 20 min. Fall back to earliest if none match.
function selectBestEvent(activeEvents: ActiveEvent[], now: Date): ActiveEvent | null {
  if (activeEvents.length === 0) return null;
  if (activeEvents.length === 1) return activeEvents[0];

  // Iterate from latest to earliest
  for (let i = activeEvents.length - 1; i >= 0; i--) {
    const { eventStart } = activeEvents[i];
    const twentyMinBefore = new Date(eventStart.getTime() - 20 * 60 * 1000);
    if (now >= twentyMinBefore) {
      return activeEvents[i];
    }
  }

  // now is more than 20 min before all events — pick the earliest
  return activeEvents[0];
}

async function checkInToEvent(
  event: any,
  volunteer: any,
  normalizedEmail: string,
  name: string,
  totalAttendees: number,
  timestamp: string,
  existingRegistrationId?: string
) {
  const effectiveUserId = volunteer?.linkedUserId || (volunteer ? `walkin-${volunteer._id.toString()}` : `walkin-${Date.now()}`);

  let registration: any = null;

  if (existingRegistrationId) {
    registration = await EventRegistration.findById(existingRegistrationId);
  }

  if (!registration) {
    const checkInOrConditions: any[] = [{ userEmail: normalizedEmail }];
    if (volunteer?.linkedUserId) {
      checkInOrConditions.push({ userId: volunteer.linkedUserId });
    }
    registration = await EventRegistration.findOne({
      eventId: event._id,
      $or: checkInOrConditions,
      cancelled: { $ne: true }
    });
  }

  if (registration) {
    registration.checkedIn = true;
    registration.totalAttendees = totalAttendees;
    await registration.save();
  } else {
    registration = await EventRegistration.create({
      eventId: event._id,
      userId: effectiveUserId,
      userEmail: normalizedEmail,
      userName: name,
      eventTitle: event.title,
      eventDate: event.date,
      eventStartTime: event.startTime,
      eventEndTime: event.endTime,
      eventCategory: event.eventCategory || event.category || 'General',
      totalAttendees,
      checkedIn: true,
      attended: false,
      registeredAt: new Date(timestamp),
    });
  }

  return registration;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, hasGuests, timestamp, eventId } = body;
    const guestCount = parseInt(body.guestCount) || 0;

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    await dbConnect();

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedName = normalizeName(name);
    const checkInTime = timestamp ? new Date(timestamp) : new Date();
    const totalAttendees = 1 + (hasGuests ? guestCount : 0);
    const actualGuestCount = hasGuests ? guestCount : 0;

    // Find all events currently in their check-in window
    let activeEvents = await findActiveEvents(checkInTime);

    // If the kiosk passed a specific eventId (volunteer selected from dropdown),
    // always include that event regardless of the time window
    if (eventId) {
      const alreadyIncluded = activeEvents.some(ae => ae.event._id.toString() === eventId);
      if (!alreadyIncluded) {
        const specificEvent = await Event.findById(eventId);
        if (specificEvent && specificEvent.status !== 'cancelled') {
          const eventDate = new Date(specificEvent.date);
          const [startH, startM] = specificEvent.startTime.split(':').map(Number);
          const [endH, endM] = specificEvent.endTime.split(':').map(Number);
          const eventStart = new Date(eventDate);
          eventStart.setHours(startH, startM, 0, 0);
          const eventEnd = new Date(eventDate);
          eventEnd.setHours(endH, endM, 0, 0);
          activeEvents = [...activeEvents, {
            event: specificEvent,
            eventStart,
            eventEnd,
            hasStarted: checkInTime >= eventStart,
            hasEnded: checkInTime > eventEnd,
            timeUntilStart: eventStart.getTime() - checkInTime.getTime(),
          }];
        }
      }
    }

    let volunteer: any = null;
    let matchType = '';
    let isNewVolunteer = false;
    let eventsToCheckIn: Array<{ event: any; registrationId?: string }> = [];
    let autoMatched = false;

    // PRIORITY 1: Match against registrations for active events
    if (activeEvents.length > 0) {
      const eventIds = activeEvents.map(ae => ae.event._id);
      const allActiveRegs = await EventRegistration.find({
        eventId: { $in: eventIds },
        cancelled: { $ne: true },
      }).lean();

      // Group registrations by eventId for quick lookup
      const regsByEvent = new Map<string, any[]>();
      for (const reg of allActiveRegs) {
        const key = reg.eventId.toString();
        if (!regsByEvent.has(key)) regsByEvent.set(key, []);
        regsByEvent.get(key)!.push(reg);
      }

      // Find all registrations matching this check-in person
      // Step 1: email match across all active registrations
      const emailMatched = allActiveRegs.filter(
        r => r.userEmail?.toLowerCase() === normalizedEmail
      );

      // Step 2: name match (exact then fuzzy) if no email match
      let nameMatched: any[] = [];
      if (emailMatched.length === 0) {
        const exactNameMatched = allActiveRegs.filter(r => {
          return normalizeName(r.userName || '') === normalizedName;
        });
        if (exactNameMatched.length > 0) {
          nameMatched = exactNameMatched;
        } else {
          const THRESHOLD = 80;
          const fuzzyMatched = allActiveRegs.filter(r => {
            return nameSimilarity(normalizedName, normalizeName(r.userName || '')) >= THRESHOLD;
          });
          nameMatched = fuzzyMatched;
        }
      }

      const matchedRegs = emailMatched.length > 0 ? emailMatched : nameMatched;

      if (matchedRegs.length > 0) {
        matchType = emailMatched.length > 0 ? 'email-registration' : 'name-registration';

        // Resolve volunteer profile from the first matched registration
        const firstReg = matchedRegs[0];
        if (firstReg.userId && !firstReg.userId.startsWith('walkin-')) {
          volunteer = await VolunteerProfile.findOne({ linkedUserId: firstReg.userId });
        }
        if (!volunteer && firstReg.userEmail) {
          volunteer = await VolunteerProfile.findOne({ email: firstReg.userEmail.toLowerCase() });
        }

        // Map matched registrations to their events
        for (const reg of matchedRegs) {
          const eventId = reg.eventId.toString();
          const ae = activeEvents.find(a => a.event._id.toString() === eventId);
          if (ae) {
            eventsToCheckIn.push({ event: ae.event, registrationId: reg._id.toString() });
          }
        }
      }
    }

    // PRIORITY 2: Fall back to full VolunteerProfile lookup if no registration match
    if (eventsToCheckIn.length === 0) {
      volunteer = await VolunteerProfile.findOne({ email: normalizedEmail });
      if (volunteer) matchType = 'email';

      if (!volunteer) {
        const nameParts = name.trim().split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        volunteer = await VolunteerProfile.findOne({
          firstName: { $regex: new RegExp(`^${escapeRegex(firstName)}$`, 'i') },
          lastName: { $regex: new RegExp(`^${escapeRegex(lastName)}$`, 'i') },
        });
        if (volunteer) matchType = 'exact-name';
      }

      if (!volunteer) {
        const allVolunteers = await VolunteerProfile.find({});
        let bestMatch: any = null;
        let bestScore = 0;
        const THRESHOLD = 80;
        for (const v of allVolunteers) {
          const score = nameSimilarity(normalizedName, normalizeName(`${v.firstName} ${v.lastName}`));
          if (score > bestScore && score >= THRESHOLD) {
            bestScore = score;
            bestMatch = v;
          }
        }
        if (bestMatch) {
          volunteer = bestMatch;
          matchType = 'fuzzy-name';
        }
      }

      if (!volunteer) {
        const nameParts = name.trim().split(' ');
        volunteer = await VolunteerProfile.create({
          firstName: nameParts[0] || '',
          lastName: nameParts.slice(1).join(' ') || '',
          email: normalizedEmail,
          createdAt: new Date(),
        });
        matchType = 'new';
        isNewVolunteer = true;
      }

      // Now check if this volunteer is registered for any active events
      if (activeEvents.length > 0) {
        const orConditions: any[] = [{ userEmail: normalizedEmail }];
        if (volunteer.linkedUserId) {
          orConditions.push({ userId: volunteer.linkedUserId });
        }

        const registeredMatches = await EventRegistration.find({
          eventId: { $in: activeEvents.map(ae => ae.event._id) },
          $or: orConditions,
          cancelled: { $ne: true },
        }).lean();

        if (registeredMatches.length > 0) {
          for (const reg of registeredMatches) {
            const ae = activeEvents.find(a => a.event._id.toString() === reg.eventId.toString());
            if (ae) eventsToCheckIn.push({ event: ae.event, registrationId: reg._id.toString() });
          }
        } else {
          // Walk-in: apply back-to-back selection rule
          const best = selectBestEvent(activeEvents, checkInTime);
          if (best) {
            eventsToCheckIn = [{ event: best.event }];
            autoMatched = true;
          }
        }
      }
    }

    // If we matched via registration but still have no volunteer profile, create one
    if (!volunteer && eventsToCheckIn.length > 0) {
      const nameParts = name.trim().split(' ');
      volunteer = await VolunteerProfile.create({
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        email: normalizedEmail,
        createdAt: new Date(),
      });
      matchType = matchType || 'new';
      isNewVolunteer = true;
    }

    if (!volunteer) {
      const nameParts = name.trim().split(' ');
      volunteer = await VolunteerProfile.create({
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' ') || '',
        email: normalizedEmail,
        createdAt: new Date(),
      });
      matchType = 'new';
      isNewVolunteer = true;
    }

    // Perform check-ins
    for (const { event, registrationId } of eventsToCheckIn) {
      await checkInToEvent(
        event, volunteer, normalizedEmail, name,
        totalAttendees, timestamp || new Date().toISOString(),
        registrationId
      );
    }

    // Calculate estimated event hours for pending approval
    function calcEventHours(event: any): number {
      try {
        const [startH, startM] = event.startTime.split(':').map(Number);
        const [endH, endM] = event.endTime.split(':').map(Number);
        const mins = (endH * 60 + endM) - (startH * 60 + startM);
        return Math.round((mins / 60) * 10) / 10;
      } catch {
        return 0;
      }
    }

    const events = eventsToCheckIn.map(e => e.event);
    const estimatedHours = events.reduce((sum: number, e: any) => sum + calcEventHours(e), 0);
    const eventTitles = events.map((e: any) => e.title);
    const hasLinkedAccount = !!volunteer.linkedUserId;

    if (estimatedHours > 0) {
      await HoursLog.create({
        volunteerId: volunteer._id,
        userId: volunteer.linkedUserId || undefined,
        userEmail: normalizedEmail,
        userName: name,
        email: normalizedEmail,
        date: checkInTime,
        eventId: events[0]?._id,
        eventTitle: eventTitles.join(' + ') || undefined,
        category: events.length > 0 ? 'Event Check-In' : 'Check-In',
        description: events.length > 0
          ? `Event${events.length > 1 ? 's' : ''}: ${eventTitles.join(' + ')}${hasGuests ? ` (with ${actualGuestCount} guest${actualGuestCount > 1 ? 's' : ''})` : ''}`
          : hasGuests
          ? `Check-in with ${actualGuestCount} guest${actualGuestCount > 1 ? 's' : ''} (${totalAttendees} total people)`
          : 'Check-in (individual)',
        isUniqueVolunteer: true,
        guestCount: actualGuestCount,
        totalAttendees,
        hasGuests: hasGuests || false,
        hours: estimatedHours,
        pendingApproval: hasLinkedAccount && estimatedHours > 0,
        source: 'Universal Check-In',
        matchType,
      });
    }

    const responseMessage = events.length > 1
      ? `Checked in for ${events.length} events`
      : events.length === 1
      ? `Checked in for ${events[0].title}`
      : 'Check-in recorded — no active events found';

    return NextResponse.json({
      success: true,
      message: responseMessage,
      volunteerId: volunteer._id,
      totalAttendees,
      isNewVolunteer,
      matchType,
      eventTitles,
      eventCount: eventsToCheckIn.length,
      autoMatched,
    });
  } catch (error: any) {
    console.error('Check-in error:', error);
    return NextResponse.json({ error: error.message || 'Failed to process check-in' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@backend/lib/db/mongodb';
import Event from '@backend/lib/models/Event';
import EventRegistration from '@backend/lib/models/EventRegistration';
import HoursLog from '@backend/lib/models/HoursLog';
import { isAdmin } from '@backend/lib/admin';

export async function POST(request: NextRequest) {
  try {
    const { eventId, hours, adminEmail } = await request.json();

    if (!isAdmin(adminEmail)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID required' },
        { status: 400 }
      );
    }

    await connectDB();

    // Get event details
    const event = await Event.findById(eventId);
    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    // Calculate hours if not provided
    let hoursToAssign = hours;
    if (!hoursToAssign) {
      // Calculate based on event duration
      const start = event.startTime.split(':');
      const end = event.endTime.split(':');
      const startMinutes = parseInt(start[0]) * 60 + parseInt(start[1]);
      const endMinutes = parseInt(end[0]) * 60 + parseInt(end[1]);
      hoursToAssign = Math.round(((endMinutes - startMinutes) / 60) * 10) / 10;
      if (hoursToAssign <= 0) hoursToAssign += 24;
    }


    // First, handle registrations where people did NOT attend
    // Find registrations explicitly marked as not attended (attended: false) and not checked in
    const noShowRegistrations = await EventRegistration.find({
      eventId,
      cancelled: { $ne: true },
      attended: false,
      checkedIn: { $ne: true }
    });


    // No-shows are left as-is (attended: false); they are only skipped from hour assignment

    // Get all registrations that either:
    // 1. Checked in via QR code (checkedIn: true) - automatic approval
    // 2. Manually marked as attended by admin (attended: true)
    const registrations = await EventRegistration.find({
      eventId,
      cancelled: { $ne: true },
      $or: [
        { checkedIn: true },
        { attended: true }
      ]
    });


    const results = {
      assigned: 0,
      skipped: 0,
      removed: noShowRegistrations.length,
      errors: [] as any[],
    };

    for (const registration of registrations) {
      try {
        // Check if a pending check-in entry exists — approve it instead of creating a new one
        const pendingEntry = await HoursLog.findOne({
          userId: registration.userId,
          eventId,
          pendingApproval: true,
        });

        // Check if hours already fully assigned (non-pending) for this event
        const approvedEntry = await HoursLog.findOne({
          userId: registration.userId,
          eventId,
          pendingApproval: { $ne: true },
        });

        if (approvedEntry) {
          results.skipped++;
          continue;
        }

        // Also check for auto-assigned hours on this date from a different event
        const eventDateStart = new Date(event.date);
        eventDateStart.setHours(0, 0, 0, 0);
        const eventDateEnd = new Date(event.date);
        eventDateEnd.setHours(23, 59, 59, 999);

        const existingOnDate = await HoursLog.findOne({
          userId: registration.userId,
          date: { $gte: eventDateStart, $lte: eventDateEnd },
          autoAssigned: true,
          pendingApproval: { $ne: true },
        });

        if (existingOnDate && existingOnDate.eventId?.toString() !== eventId) {
          results.skipped++;
          continue;
        }

        // hoursToAssign is the per-person duration
        // totalAttendees on the registration captures the group size for analytics multiplication
        const isQRCheckIn = registration.checkedIn;
        const groupSize = registration.totalAttendees || 1;

        const noteText = groupSize > 1
          ? `Auto-assigned - ${hoursToAssign} hrs × ${groupSize} people (${(hoursToAssign * groupSize).toFixed(1)} total person-hours)`
          : isQRCheckIn
          ? `Auto-assigned - QR code check-in at ${event.title}`
          : `Auto-assigned for attending ${event.title}`;

        // HoursLog stores per-person hours (volunteer's personal credit)
        if (pendingEntry) {
          await HoursLog.findByIdAndUpdate(pendingEntry._id, {
            hours: hoursToAssign,
            autoAssigned: true,
            pendingApproval: false,
            notes: noteText,
          });
        } else {
          await HoursLog.create({
            userId: registration.userId,
            userEmail: registration.userEmail,
            userName: registration.userName,
            eventId,
            eventTitle: event.title,
            hours: hoursToAssign,
            date: event.date,
            autoAssigned: true,
            pendingApproval: false,
            notes: noteText,
          });
        }

        // hoursCompleted = per-person hours; analytics multiplies by totalAttendees
        await EventRegistration.findByIdAndUpdate(registration._id, {
          hoursCompleted: hoursToAssign,
          attended: true,
        });

        results.assigned++;

      } catch (error: any) {
        console.error(`  ✗ Error assigning hours to ${registration.userEmail}:`, error.message);
        results.errors.push({
          email: registration.userEmail,
          error: error.message,
        });
      }
    }


    // Mark event as completed if hours were assigned OR if the process ran (even with 0 attendees)
    if (event.status === 'active') {
      await Event.findByIdAndUpdate(eventId, {
        status: 'completed',
      });
    }

    return NextResponse.json({
      success: true,
      eventTitle: event.title,
      hoursAssigned: hoursToAssign,
      ...results,
    });

  } catch (error: any) {
    console.error('Error assigning hours:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to assign hours' },
      { status: 500 }
    );
  }
}

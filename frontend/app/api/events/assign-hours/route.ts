import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@backend/lib/db/mongodb';
import Event from '@backend/lib/models/Event';
import EventRegistration from '@backend/lib/models/EventRegistration';
import HoursLog from '@backend/lib/models/HoursLog';

export async function POST(request: NextRequest) {
  try {
    const { eventId, hours } = await request.json();

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
    }

    console.log(`Assigning ${hoursToAssign} hours for event: ${event.title}`);

    // First, handle registrations where people did NOT attend
    // Find registrations explicitly marked as not attended (attended: false) and not checked in
    const noShowRegistrations = await EventRegistration.find({
      eventId,
      cancelled: { $ne: true },
      attended: false,
      checkedIn: { $ne: true }
    });

    console.log(`Found ${noShowRegistrations.length} no-show registrations to remove`);

    // Delete no-show registrations
    for (const noShow of noShowRegistrations) {
      try {
        await EventRegistration.findByIdAndDelete(noShow._id);

        // Return spots to the event
        await Event.findByIdAndUpdate(eventId, {
          $inc: { spotsRemaining: noShow.totalAttendees || 1 }
        });

        console.log(`  ✓ Removed no-show registration for ${noShow.userEmail}`);
      } catch (error: any) {
        console.error(`  ✗ Error removing no-show for ${noShow.userEmail}:`, error.message);
      }
    }

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

    console.log(`Found ${registrations.length} registrations (checked in or attended)`);

    const results = {
      assigned: 0,
      skipped: 0,
      removed: noShowRegistrations.length,
      errors: [] as any[],
    };

    for (const registration of registrations) {
      try {
        // Check if hours already assigned for this specific event
        const existing = await HoursLog.findOne({
          userId: registration.userId,
          eventId,
        });

        if (existing) {
          console.log(`  → Skipping ${registration.userEmail} (already assigned for this event)`);
          results.skipped++;
          continue;
        }

        // Also check for any hours on this date to prevent duplicates
        const eventDateStart = new Date(event.date);
        eventDateStart.setHours(0, 0, 0, 0);
        const eventDateEnd = new Date(event.date);
        eventDateEnd.setHours(23, 59, 59, 999);

        const existingOnDate = await HoursLog.findOne({
          userId: registration.userId,
          date: { $gte: eventDateStart, $lte: eventDateEnd },
          autoAssigned: true,
        });

        if (existingOnDate && existingOnDate.eventId?.toString() !== eventId) {
          console.log(`  → Skipping ${registration.userEmail} (already has hours for different event on this date)`);
          results.skipped++;
          continue;
        }

        // Calculate total hours - multiply by group size if checking in for guests
        const isQRCheckIn = registration.checkedIn;
        const isGroupCheckIn = registration.isGroupCheckIn || false;
        const groupSize = registration.totalAttendees || 1;

        // For group check-ins, multiply hours by the total number of attendees
        const totalHoursToLog = isGroupCheckIn ? hoursToAssign * groupSize : hoursToAssign;

        // Create hours log entry
        await HoursLog.create({
          userId: registration.userId,
          userEmail: registration.userEmail,
          userName: registration.userName,
          eventId,
          eventTitle: event.title,
          hours: totalHoursToLog,
          date: event.date,
          autoAssigned: true,
          notes: isGroupCheckIn
            ? `Auto-assigned for ${groupSize} ${groupSize === 1 ? 'person' : 'people'} (group check-in) - ${hoursToAssign} hours each`
            : isQRCheckIn
            ? `Auto-assigned - QR code check-in at ${event.title}`
            : `Auto-assigned for attending ${event.title}`,
        });

        // Update the registration to reflect hours completed and attended status
        await EventRegistration.findByIdAndUpdate(registration._id, {
          hoursCompleted: hoursToAssign, // Per-person hours
          attended: true,
        });

        console.log(`  ✓ Assigned ${totalHoursToLog} hours to ${registration.userEmail}${isGroupCheckIn ? ` (${groupSize} people × ${hoursToAssign} hours)` : ''}`);
        results.assigned++;

      } catch (error: any) {
        console.error(`  ✗ Error assigning hours to ${registration.userEmail}:`, error.message);
        results.errors.push({
          email: registration.userEmail,
          error: error.message,
        });
      }
    }

    console.log(`Assignment complete: ${results.assigned} assigned, ${results.skipped} skipped, ${results.removed} removed (no-shows)`);

    // Mark event as completed if hours were assigned OR if the process ran (even with 0 attendees)
    if (event.status === 'active') {
      await Event.findByIdAndUpdate(eventId, {
        status: 'completed',
      });
      console.log(`✓ Event marked as completed`);
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

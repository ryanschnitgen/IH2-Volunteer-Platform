import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Event from '@/models/Event';
import EventRegistration from '@/models/EventRegistration';
import { sendEmail } from '@/lib/email';

// Send 24-hour reminder emails for upcoming events
// This endpoint should be called by a cron job once per day
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Get events happening in the next 24-48 hours
    const now = new Date();
    const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const fortyEightHoursFromNow = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const upcomingEvents = await Event.find({
      status: 'active',
      date: {
        $gte: twentyFourHoursFromNow,
        $lte: fortyEightHoursFromNow,
      },
    });

    console.log(`Found ${upcomingEvents.length} events needing reminders`);

    const results = {
      eventCount: upcomingEvents.length,
      emailsSent: 0,
      errors: [] as any[],
    };

    for (const event of upcomingEvents) {
      try {
        // Get all non-cancelled registrations for this event
        const registrations = await EventRegistration.find({
          eventId: event._id,
          cancelled: { $ne: true },
        });

        console.log(`  Event "${event.title}": ${registrations.length} registrations`);

        // Send reminder email to each registered volunteer
        for (const registration of registrations) {
          try {
            const eventDate = new Date(event.date);
            const formattedDate = eventDate.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            });

            const subject = `Reminder: ${event.title} Tomorrow`;
            const html = `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #7c3aed;">Event Reminder</h2>
                <p>Hi ${registration.userName},</p>
                <p>This is a friendly reminder that you're registered for the following volunteer event tomorrow:</p>

                <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h3 style="margin-top: 0; color: #1f2937;">${event.title}</h3>
                  <p style="margin: 8px 0;"><strong>Date:</strong> ${formattedDate}</p>
                  <p style="margin: 8px 0;"><strong>Time:</strong> ${event.startTime} - ${event.endTime}</p>
                  <p style="margin: 8px 0;"><strong>Location:</strong> ${event.location}</p>
                  ${registration.totalAttendees > 1 ? `<p style="margin: 8px 0;"><strong>Attendees:</strong> ${registration.totalAttendees} people</p>` : ''}
                </div>

                <p><strong>Event Description:</strong></p>
                <p>${event.description}</p>

                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                  <p style="font-size: 14px; color: #6b7280;">
                    If you can no longer attend, please cancel your registration as soon as possible so others can take your spot.
                  </p>
                  <p style="font-size: 14px; color: #6b7280;">
                    We look forward to seeing you!
                  </p>
                </div>

                <div style="margin-top: 20px; font-size: 12px; color: #9ca3af;">
                  <p>Inspired Hearts and Hands Volunteer Portal</p>
                </div>
              </div>
            `;

            await sendEmail({
              to: registration.userEmail,
              subject,
              html,
            });

            results.emailsSent++;
            console.log(`    ✓ Sent reminder to ${registration.userEmail}`);
          } catch (emailError: any) {
            console.error(`    ✗ Failed to send to ${registration.userEmail}:`, emailError.message);
            results.errors.push({
              event: event.title,
              email: registration.userEmail,
              error: emailError.message,
            });
          }
        }
      } catch (eventError: any) {
        console.error(`  ✗ Error processing event "${event.title}":`, eventError.message);
        results.errors.push({
          event: event.title,
          error: eventError.message,
        });
      }
    }

    console.log(`Reminder job complete: ${results.emailsSent} emails sent, ${results.errors.length} errors`);

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error: any) {
    console.error('Error in reminder job:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send reminders' },
      { status: 500 }
    );
  }
}

// GET endpoint to manually trigger reminders (for testing)
export async function GET(request: NextRequest) {
  return POST(request);
}

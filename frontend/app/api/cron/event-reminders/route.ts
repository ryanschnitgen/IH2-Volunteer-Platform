import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@backend/lib/db/mongodb';
import Event from '@backend/lib/models/Event';
import EventRegistration from '@backend/lib/models/EventRegistration';
import { formatTime } from '@/lib/formatTime';
import { sendEmail } from '@backend/lib/email';

export async function GET(request: NextRequest) {
  try {
    // Verify this is a cron request (optional security check)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    // Calculate time window: 24 hours from now
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setHours(tomorrow.getHours() + 24);

    // Find events happening in approximately 24 hours (within a 1-hour window)
    const reminderWindowStart = new Date(tomorrow);
    reminderWindowStart.setMinutes(reminderWindowStart.getMinutes() - 30);
    const reminderWindowEnd = new Date(tomorrow);
    reminderWindowEnd.setMinutes(reminderWindowEnd.getMinutes() + 30);

    // Get all active events happening tomorrow
    const dayStart = new Date(tomorrow);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(tomorrow);
    dayEnd.setUTCHours(23, 59, 59, 999);
    const upcomingEvents = await Event.find({
      date: { $gte: dayStart, $lte: dayEnd },
      status: 'active',
    });

    if (upcomingEvents.length === 0) {
      return NextResponse.json({
        message: 'No events found for tomorrow',
        remindersSent: 0,
      });
    }

    let totalRemindersSent = 0;
    const emailPromises = [];

    for (const event of upcomingEvents) {
      // Get all active registrations for this event
      const registrations = await EventRegistration.find({
        eventId: event._id.toString(),
        cancelled: { $ne: true },
        reminderSentAt: { $exists: false },
      });

      if (registrations.length === 0) continue;

      // Prepare email for each registration
      for (const registration of registrations) {
        const eventDate = new Date(event.date);
        const emailPromise = sendEmail({
          to: registration.userEmail,
          subject: `Reminder: ${event.title} Tomorrow`,
          html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #A7144C 0%, #8B1140 100%); padding: 30px; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 28px;">Event Reminder</h1>
                </div>

                <div style="padding: 30px; background: #ffffff;">
                  <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
                    Hi ${registration.userName},
                  </p>

                  <p style="font-size: 16px; color: #333; margin-bottom: 20px;">
                    This is a friendly reminder that you're registered for the following volunteer opportunity tomorrow:
                  </p>

                  <div style="background: #f8f9fa; border-left: 4px solid #A7144C; padding: 20px; margin: 20px 0; border-radius: 4px;">
                    <h2 style="color: #A7144C; margin-top: 0; font-size: 22px;">${event.title}</h2>

                    <div style="margin: 15px 0;">
                      <strong style="color: #555;">📅 Date:</strong>
                      <span style="color: #333; margin-left: 10px;">
                        ${eventDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </span>
                    </div>

                    <div style="margin: 15px 0;">
                      <strong style="color: #555;">🕐 Time:</strong>
                      <span style="color: #333; margin-left: 10px;">
                        ${formatTime(event.startTime)} - ${formatTime(event.endTime)}
                      </span>
                    </div>

                    <div style="margin: 15px 0;">
                      <strong style="color: #555;">📍 Location:</strong>
                      <span style="color: #333; margin-left: 10px;">
                        ${event.location}
                      </span>
                    </div>

                    <div style="margin: 15px 0;">
                      <strong style="color: #555;">ℹ️ Description:</strong>
                      <p style="color: #333; margin: 5px 0 0 0;">
                        ${event.description}
                      </p>
                    </div>
                  </div>

                  <div style="margin: 30px 0; text-align: center;">
                    <a href="${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/events/${event._id}"
                       style="background: linear-gradient(135deg, #A7144C 0%, #8B1140 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                      View Event Details
                    </a>
                  </div>

                  <p style="font-size: 14px; color: #666; margin-top: 30px;">
                    If you need to cancel your registration, please log in to your account and cancel as soon as possible so others can take your spot.
                  </p>

                  <p style="font-size: 14px; color: #666; margin-top: 20px;">
                    We look forward to seeing you tomorrow!
                  </p>

                  <p style="font-size: 14px; color: #666; margin-top: 20px;">
                    Thank you for your service,<br/>
                    <strong>Inspired Hearts and Hands</strong>
                  </p>
                </div>

                <div style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e0e0e0;">
                  <p style="font-size: 12px; color: #999; margin: 0;">
                    This is an automated reminder email.
                  </p>
                </div>
              </div>
            `,
        }).then(async () => {
          await EventRegistration.findByIdAndUpdate(registration._id, { reminderSentAt: new Date() });
          totalRemindersSent++;
        });

        emailPromises.push(emailPromise);
      }
    }

    // Send all emails
    await Promise.all(emailPromises);

    return NextResponse.json({
      message: `Successfully sent ${totalRemindersSent} reminder emails`,
      remindersSent: totalRemindersSent,
      eventsProcessed: upcomingEvents.length,
    });
  } catch (error: any) {
    console.error('Error sending event reminders:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send reminders' },
      { status: 500 }
    );
  }
}

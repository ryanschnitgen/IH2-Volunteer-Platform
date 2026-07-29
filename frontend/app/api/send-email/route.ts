import { Resend } from 'resend';
import { NextRequest, NextResponse } from 'next/server';
import { isAdmin } from '@backend/lib/admin';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { to, subject, html, from, adminEmail } = await request.json();

    if (!isAdmin(adminEmail)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Validate required fields
    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, html' },
        { status: 400 }
      );
    }

    // Check if API key is configured
    if (!process.env.RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY is not configured in .env.local');
      return NextResponse.json(
        { error: 'Email service is not configured. Please add RESEND_API_KEY to .env.local' },
        { status: 500 }
      );
    }

    console.log('📧 Attempting to send emails...');
    console.log('✓ Using verified domain: inspiredheartsandhands.com');

    const recipients = Array.isArray(to) ? to : [to];
    const results = [];
    const errors = [];

    // Send emails individually to avoid rate limits and ensure delivery
    for (const recipient of recipients) {
      try {
        console.log(`  → Sending to: ${recipient}`);
        const data = await resend.emails.send({
          from: from || 'IH2 Volunteer Portal <info@inspiredheartsandhands.com>',
          to: [recipient],
          subject,
          html,
          replyTo: 'info@inspiredheartsandhands.com',
        });
        console.log(`  ✓ Sent successfully to: ${recipient}`);
        results.push({ email: recipient, success: true, data });
      } catch (error: any) {
        console.error(`  ✗ Failed to send to ${recipient}:`, error.message);
        console.error('  Full error:', error);
        errors.push({ email: recipient, error: error.message, details: error.response?.data });
      }
    }

    console.log(`\n📊 Email Summary: ${results.length} sent, ${errors.length} failed`);

    // Return success if at least some emails were sent
    if (results.length > 0) {
      return NextResponse.json({
        success: true,
        sent: results.length,
        failed: errors.length,
        results,
        errors,
      });
    } else {
      return NextResponse.json(
        {
          error: 'Failed to send any emails',
          errors,
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('❌ Error sending email:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send email' },
      { status: 500 }
    );
  }
}

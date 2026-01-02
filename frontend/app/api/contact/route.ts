import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { name, email, message } = await request.json();

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'All fields are required' },
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

    console.log('📧 Sending contact form email...');
    console.log('⚠️  NOTE: Using test domain "onboarding@resend.dev" has limitations.');
    console.log('💡 For production, verify a custom domain at https://resend.com/domains');

    // Send email to admin
    const data = await resend.emails.send({
      from: 'IH2 Volunteer Portal <onboarding@resend.dev>',
      to: ['info@inspiredheartsandhands.com'],
      subject: `Contact Form: Message from ${name}`,
      replyTo: email,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #A7144C;">New Contact Form Submission</h2>
          <div style="margin: 20px 0;">
            <p><strong>From:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Message:</strong></p>
            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin-top: 10px;">
              ${message.replace(/\n/g, '<br>')}
            </div>
          </div>
          <hr style="border: 1px solid #e5e5e5; margin: 20px 0;">
          <p style="color: #666; font-size: 12px;">
            This email was sent from the IH2 Volunteer Portal contact form.
          </p>
        </div>
      `,
    });

    console.log('✓ Contact form email sent successfully');
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('❌ Error sending contact email:', error);
    console.error('Full error details:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to send email',
        suggestion: 'The test domain has limitations. Consider verifying a custom domain at https://resend.com/domains'
      },
      { status: 500 }
    );
  }
}

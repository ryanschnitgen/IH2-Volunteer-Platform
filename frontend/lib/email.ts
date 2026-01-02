import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendEmailParams {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

export async function sendEmail({
  to,
  subject,
  html,
  from = 'IH2 Volunteer Portal <onboarding@resend.dev>',
  replyTo,
}: SendEmailParams) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured');
  }

  try {
    const data = await resend.emails.send({
      from,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      ...(replyTo && { replyTo }),
    });

    return data;
  } catch (error: any) {
    console.error('Failed to send email:', error);
    throw new Error(`Email sending failed: ${error.message}`);
  }
}

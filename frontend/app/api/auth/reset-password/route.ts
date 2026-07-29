import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@backend/lib/firebaseAdmin';
import { sendEmail } from '@backend/lib/email';

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    console.log('🔐 Server-side password reset requested for:', email);

    // Use Firebase Admin SDK to generate password reset link
    // This bypasses client-side rate limiting and device fingerprinting
    const origin = request.headers.get('origin') || 'https://ih-2-volunteer-platform.vercel.app';
    const resetLink = await adminAuth.generatePasswordResetLink(email, {
      url: `${origin}/login`,
      handleCodeInApp: false,
    });

    console.log('✅ Password reset link generated');

    // Send email via Resend
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #A7144C; margin-bottom: 10px;">Reset Your Password</h1>
          <p style="color: #666; font-size: 16px;">IH2 Volunteer Portal</p>
        </div>

        <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 0 0 15px 0; color: #333;">Hello,</p>
          <p style="margin: 0 0 15px 0; color: #333;">
            We received a request to reset your password for the IH2 Volunteer Portal.
          </p>
          <p style="margin: 0 0 15px 0; color: #333;">
            Click the button below to reset your password:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}"
               style="background: linear-gradient(to right, #A7144C, #8B1040);
                      color: white;
                      padding: 14px 32px;
                      text-decoration: none;
                      border-radius: 8px;
                      font-weight: bold;
                      display: inline-block;">
              Reset Password
            </a>
          </div>
          <p style="margin: 15px 0 0 0; color: #666; font-size: 14px;">
            Or copy and paste this link into your browser:
          </p>
          <p style="margin: 5px 0 0 0; color: #0066cc; font-size: 13px; word-break: break-all;">
            ${resetLink}
          </p>
        </div>

        <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
          <p style="margin: 0; color: #856404; font-size: 14px;">
            <strong>⚠️ Important:</strong> This link will expire in 1 hour. If you didn't request this password reset, you can safely ignore this email.
          </p>
        </div>

        <div style="border-top: 1px solid #e5e5e5; padding-top: 20px; margin-top: 30px;">
          <p style="margin: 0; color: #666; font-size: 12px; text-align: center;">
            This email was sent by IH2 Volunteer Portal<br>
            Inspired Hearts and Hands<br>
            📞 724-230-6378 | 📧 info@inspiredheartsandhands.com
          </p>
        </div>
      </div>
    `;

    await sendEmail({
      to: email,
      subject: 'Reset Your Password - IH2 Volunteer Portal',
      html: emailHtml,
      replyTo: 'info@inspiredheartsandhands.com',
    });

    console.log('✅ Password reset email sent successfully');

    return NextResponse.json({
      success: true,
      message: 'Password reset email sent successfully',
    });
  } catch (error: any) {
    console.error('Password reset error:', error.code, error.message);

    if (error.code === 'auth/user-not-found') {
      return NextResponse.json(
        { error: 'No account found with this email address' },
        { status: 404 }
      );
    }

    if (error.code === 'auth/invalid-email') {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Google-only accounts can't receive a password reset link
    if (error.code === 'auth/invalid-provider-id' || error.message?.includes('INVALID_PROVIDER_ID') || error.message?.includes('PASSWORD_LOGIN_DISABLED')) {
      return NextResponse.json(
        { error: 'This account uses Google sign-in. Please sign in with Google instead.' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to send password reset email' },
      { status: 500 }
    );
  }
}

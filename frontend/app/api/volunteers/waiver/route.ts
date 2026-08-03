import { NextResponse } from "next/server";
import dbConnect from "@backend/lib/db/mongodb";
import VolunteerProfile from "@backend/lib/models/VolunteerProfile";

export async function POST(request: Request) {
  try {
    await dbConnect();

    const { userId, email, displayName } = await request.json();

    if (!userId || !email) {
      return NextResponse.json(
        { error: "User ID and email are required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const waiverFields = {
      waiverAccepted: true,
      waiverAcceptedDate: new Date(),
      waiverAcceptedIP: ip,
      lastUpdated: new Date(),
    };

    // Update ALL profiles belonging to this user (by UID or by email).
    // Using updateMany prevents duplicate-profile situations from causing
    // a stale waiverAccepted: false to reappear after a page refresh.
    const result = await VolunteerProfile.updateMany(
      { $or: [{ linkedUserId: userId }, { email: normalizedEmail }] },
      { $set: waiverFields }
    );

    // Link any email-matched profiles that don't have a linkedUserId yet.
    await VolunteerProfile.updateMany(
      {
        email: normalizedEmail,
        $or: [{ linkedUserId: { $exists: false } }, { linkedUserId: null }, { linkedUserId: '' }],
      },
      { $set: { linkedUserId: userId } }
    );

    // No profiles found at all — Google signup with no existing profile.
    if (result.matchedCount === 0) {
      const nameParts = (displayName || '').trim().split(' ');
      const firstName = nameParts[0] || normalizedEmail.split('@')[0];
      const lastName = nameParts.slice(1).join(' ') || '';

      await VolunteerProfile.create({
        firstName,
        lastName,
        email: normalizedEmail,
        linkedUserId: userId,
        ...waiverFields,
      });
    }

    return NextResponse.json({ success: true, message: "Waiver accepted successfully" });
  } catch (error: any) {
    console.error("Error saving waiver acceptance:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save waiver acceptance" },
      { status: 500 }
    );
  }
}

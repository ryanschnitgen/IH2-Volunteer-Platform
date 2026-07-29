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
      linkedUserId: userId,
      lastUpdated: new Date(),
    };

    // Try to find profile by linkedUserId first (email signup or previously linked)
    let profile = await VolunteerProfile.findOneAndUpdate(
      { linkedUserId: userId },
      { $set: waiverFields },
      { new: true }
    );

    // Fallback: find by email (covers Google users whose profile was linked on login)
    if (!profile) {
      profile = await VolunteerProfile.findOneAndUpdate(
        { email: normalizedEmail },
        { $set: waiverFields },
        { new: true }
      );
    }

    // Still not found: Google signup with no existing profile — create one
    if (!profile) {
      const nameParts = (displayName || '').trim().split(' ');
      const firstName = nameParts[0] || normalizedEmail.split('@')[0];
      const lastName = nameParts.slice(1).join(' ') || '';

      profile = await VolunteerProfile.create({
        firstName,
        lastName,
        email: normalizedEmail,
        ...waiverFields,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Waiver accepted successfully",
    });
  } catch (error: any) {
    console.error("Error saving waiver acceptance:", error);
    return NextResponse.json(
      { error: error.message || "Failed to save waiver acceptance" },
      { status: 500 }
    );
  }
}

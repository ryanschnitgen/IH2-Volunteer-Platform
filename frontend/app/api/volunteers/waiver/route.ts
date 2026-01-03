import { NextResponse } from "next/server";
import dbConnect from "@backend/lib/db/mongodb";
import VolunteerProfile from "@backend/lib/models/VolunteerProfile";

export async function POST(request: Request) {
  try {
    await dbConnect();

    const { userId, email } = await request.json();

    if (!userId || !email) {
      return NextResponse.json(
        { error: "User ID and email are required" },
        { status: 400 }
      );
    }

    // Find and update the volunteer profile with waiver acceptance
    const profile = await VolunteerProfile.findOneAndUpdate(
      { linkedUserId: userId },
      {
        $set: {
          waiverAccepted: true,
          waiverAcceptedDate: new Date(),
          waiverAcceptedIP: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
        },
      },
      { new: true, upsert: false }
    );

    if (!profile) {
      return NextResponse.json(
        { error: "Volunteer profile not found" },
        { status: 404 }
      );
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

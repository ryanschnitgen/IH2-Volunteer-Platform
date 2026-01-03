import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@backend/lib/db/mongodb';
import EventRegistration from '@backend/lib/models/EventRegistration';
import CheckIn from '@backend/lib/models/CheckIn';

// Migrate all registrations to have checkedIn field
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // First, add checkedIn: false to all registrations that don't have it
    const result = await EventRegistration.updateMany(
      { checkedIn: { $exists: false } },
      { $set: { checkedIn: false } }
    );

    console.log(`Added checkedIn field to ${result.modifiedCount} registrations`);

    // Now update the ones that should be true based on CheckIn records
    const checkIns = await CheckIn.find({ matched: true });
    
    let qrUpdated = 0;
    for (const checkIn of checkIns) {
      if (checkIn.matchedRegistrationId) {
        await EventRegistration.findByIdAndUpdate(
          checkIn.matchedRegistrationId,
          { $set: { checkedIn: true } }
        );
        qrUpdated++;
      }
    }

    console.log(`Updated ${qrUpdated} registrations to checkedIn: true based on QR check-ins`);

    return NextResponse.json({
      success: true,
      message: `Migration complete`,
      addedField: result.modifiedCount,
      qrCheckIns: qrUpdated,
    });
  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

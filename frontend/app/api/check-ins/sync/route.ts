import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import CheckIn from '@/models/CheckIn';
import EventRegistration from '@/models/EventRegistration';

// Sync CheckIn records to EventRegistrations
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Get all matched check-ins
    const checkIns = await CheckIn.find({ matched: true });

    let updated = 0;
    let skipped = 0;

    for (const checkIn of checkIns) {
      if (!checkIn.matchedRegistrationId) {
        console.log(`Skipping CheckIn ${checkIn._id} - no matched registration`);
        skipped++;
        continue;
      }

      const registration = await EventRegistration.findById(checkIn.matchedRegistrationId);
      
      if (!registration) {
        console.log(`Registration ${checkIn.matchedRegistrationId} not found`);
        skipped++;
        continue;
      }

      if (!registration.checkedIn) {
        await EventRegistration.findByIdAndUpdate(
          registration._id,
          { $set: { checkedIn: true } },
          { new: true }
        );

        // Verify the update
        const verified = await EventRegistration.findById(registration._id);
        console.log(`✓ Updated registration ${registration._id} - checkedIn is now: ${verified?.checkedIn}`);
        updated++;
      } else {
        console.log(`Skipping ${registration._id} - already has checkedIn: true`);
        skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Synced ${updated} registrations, ${skipped} already synced`,
      updated,
      skipped,
      totalCheckIns: checkIns.length,
    });
  } catch (error: any) {
    console.error('Error syncing check-ins:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync check-ins' },
      { status: 500 }
    );
  }
}

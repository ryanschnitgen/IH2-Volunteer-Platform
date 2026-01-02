import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import EventRegistration from '@/models/EventRegistration';
import CheckIn from '@/models/CheckIn';

// Debug endpoint to see registration data
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('eventId');

    if (!eventId) {
      return NextResponse.json({ error: 'eventId required' }, { status: 400 });
    }

    await connectDB();

    const registrations = await EventRegistration.find({ eventId }).lean();
    const checkIns = await CheckIn.find({ eventId }).lean();

    return NextResponse.json({
      registrations: registrations, // Return ALL fields unmodified
      checkIns: checkIns.map(c => ({
        _id: c._id,
        name: c.name,
        email: c.email,
        matched: c.matched,
        matchedRegistrationId: c.matchedRegistrationId,
      })),
      stats: {
        totalRegistrations: registrations.length,
        qrCheckIns: registrations.filter(r => r.checkedIn && !r.cancelled).length,
        manualAttended: registrations.filter(r => r.attended && !r.checkedIn && !r.cancelled).length,
        hoursAssigned: registrations.filter(r => r.hoursCompleted > 0 && !r.cancelled).length,
      }
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

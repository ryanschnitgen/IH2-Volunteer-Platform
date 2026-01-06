import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@backend/lib/db/mongodb';
import VolunteerProfile from '@backend/lib/models/VolunteerProfile';
import HoursLog from '@backend/lib/models/HoursLog';

export async function POST(request: NextRequest) {
  try {
    const { name, email, hasGuests, guestCount, timestamp } = await request.json();

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }

    await dbConnect();

    // Find or create volunteer profile
    let volunteer = await VolunteerProfile.findOne({ email: email.toLowerCase() });

    if (!volunteer) {
      // Create new volunteer profile
      const nameParts = name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      volunteer = await VolunteerProfile.create({
        firstName,
        lastName,
        email: email.toLowerCase(),
        createdAt: new Date(),
      });

      console.log('Created new volunteer profile:', volunteer._id);
    }

    // Log the check-in
    const totalAttendees = 1 + (hasGuests ? guestCount : 0);

    const checkInLog = await HoursLog.create({
      volunteerId: volunteer._id,
      volunteerName: name,
      email: email.toLowerCase(),
      date: new Date(timestamp),
      category: 'Check-In',
      description: hasGuests
        ? `Check-in with ${guestCount} guest${guestCount > 1 ? 's' : ''} (${totalAttendees} total people)`
        : 'Check-in (individual)',
      isUniqueVolunteer: true, // This person is a unique volunteer
      guestCount: hasGuests ? guestCount : 0,
      totalAttendees: totalAttendees,
      hasGuests: hasGuests || false,
      hours: 0, // Hours will be assigned by admin later
      source: 'Volunteer Sign-In Form',
    });

    console.log('Check-in logged:', checkInLog._id);
    console.log(`Unique volunteer: ${name} (${email})`);
    console.log(`Total people: ${totalAttendees} (1 volunteer + ${guestCount} guests)`);

    return NextResponse.json({
      success: true,
      message: 'Check-in successful',
      volunteerId: volunteer._id,
      totalAttendees: totalAttendees,
      isNewVolunteer: !volunteer.createdAt || volunteer.createdAt.toISOString() === new Date(timestamp).toISOString(),
    });
  } catch (error: any) {
    console.error('Check-in error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process check-in' },
      { status: 500 }
    );
  }
}

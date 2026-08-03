import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@backend/lib/db/mongodb';
import VolunteerGroup from '@backend/lib/models/VolunteerGroup';

// POST /api/groups/signup
// Called during account creation — no admin auth needed.
// Joins the user to existing groups and/or creates + joins a new group.
export async function POST(request: NextRequest) {
  try {
    const { email, groupIds, newGroupName } = await request.json();

    if (!email?.trim()) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 });
    }

    const normalized = email.toLowerCase().trim();
    await dbConnect();

    // Join existing groups
    if (Array.isArray(groupIds) && groupIds.length > 0) {
      await VolunteerGroup.updateMany(
        { _id: { $in: groupIds } },
        { $addToSet: { memberEmails: normalized } }
      );
    }

    // Create a new group and add the user as first member
    if (newGroupName?.trim()) {
      await VolunteerGroup.create({
        name: newGroupName.trim(),
        description: '',
        memberEmails: [normalized],
        createdBy: normalized,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

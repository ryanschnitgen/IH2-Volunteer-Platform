import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@backend/lib/db/mongodb';
import VolunteerGroup from '@backend/lib/models/VolunteerGroup';
import { isAdmin } from '@backend/lib/admin';

// GET /api/groups — list all groups (public, so volunteers can see groups to join)
export async function GET() {
  try {
    await dbConnect();
    const groups = await VolunteerGroup.find({}).sort({ name: 1 }).lean();
    return NextResponse.json({ groups });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST /api/groups — create a group (admin only)
export async function POST(request: NextRequest) {
  try {
    const { name, description, adminEmail } = await request.json();
    if (!isAdmin(adminEmail)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Group name is required' }, { status: 400 });
    }
    await dbConnect();
    const group = await VolunteerGroup.create({
      name: name.trim(),
      description: description?.trim() || '',
      memberEmails: [],
      createdBy: adminEmail,
    });
    return NextResponse.json({ group }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

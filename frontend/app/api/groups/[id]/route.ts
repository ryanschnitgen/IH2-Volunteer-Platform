import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@backend/lib/db/mongodb';
import VolunteerGroup from '@backend/lib/models/VolunteerGroup';
import { isAdmin } from '@backend/lib/admin';

// PATCH /api/groups/[id] — add or remove a member, or rename/update the group
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action, email, name, description, adminEmail, userEmail } = body;

    await dbConnect();
    const group = await VolunteerGroup.findById(id);
    if (!group) return NextResponse.json({ error: 'Group not found' }, { status: 404 });

    if (action === 'join') {
      // Volunteer joining themselves — only needs authenticated email
      if (!userEmail) return NextResponse.json({ error: 'userEmail required' }, { status: 400 });
      const normalized = userEmail.toLowerCase().trim();
      if (!group.memberEmails.includes(normalized)) {
        group.memberEmails.push(normalized);
        await group.save();
      }
      return NextResponse.json({ group });
    }

    if (action === 'leave') {
      if (!userEmail) return NextResponse.json({ error: 'userEmail required' }, { status: 400 });
      const normalized = userEmail.toLowerCase().trim();
      group.memberEmails = group.memberEmails.filter((e: string) => e !== normalized);
      await group.save();
      return NextResponse.json({ group });
    }

    // Admin-only actions below
    if (!isAdmin(adminEmail)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    if (action === 'add-member') {
      if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });
      const normalized = email.toLowerCase().trim();
      if (!group.memberEmails.includes(normalized)) {
        group.memberEmails.push(normalized);
        await group.save();
      }
      return NextResponse.json({ group });
    }

    if (action === 'remove-member') {
      if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });
      group.memberEmails = group.memberEmails.filter((e: string) => e !== email.toLowerCase().trim());
      await group.save();
      return NextResponse.json({ group });
    }

    if (action === 'update') {
      if (name?.trim()) group.name = name.trim();
      if (description !== undefined) group.description = description.trim();
      await group.save();
      return NextResponse.json({ group });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE /api/groups/[id] — delete a group (admin only)
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const adminEmail = searchParams.get('adminEmail');
    if (!isAdmin(adminEmail)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }
    await dbConnect();
    await VolunteerGroup.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

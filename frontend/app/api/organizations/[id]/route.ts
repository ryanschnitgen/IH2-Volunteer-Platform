import { NextRequest, NextResponse } from "next/server";
import connectDB from "@backend/lib/db/mongodb";
import Organization from "@backend/lib/models/Organization";
import mongoose from "mongoose";

// GET /api/organizations/[id] - Get a specific organization
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid organization ID" },
        { status: 400 }
      );
    }

    const organization = await Organization.findById(id)
      .populate("adminUserId", "firstName lastName email phone");

    if (!organization) {
      return NextResponse.json(
        { success: false, error: "Organization not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: organization,
    });
  } catch (error: any) {
    console.error("Error fetching organization:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch organization" },
      { status: 500 }
    );
  }
}

// PUT /api/organizations/[id] - Update an organization
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid organization ID" },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Remove fields that shouldn't be updated directly
    delete body._id;
    delete body.createdAt;
    delete body.updatedAt;

    const organization = await Organization.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    ).populate("adminUserId", "firstName lastName email");

    if (!organization) {
      return NextResponse.json(
        { success: false, error: "Organization not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: organization,
      message: "Organization updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating organization:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update organization" },
      { status: 500 }
    );
  }
}

// DELETE /api/organizations/[id] - Delete an organization
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid organization ID" },
        { status: 400 }
      );
    }

    const organization = await Organization.findByIdAndDelete(id);

    if (!organization) {
      return NextResponse.json(
        { success: false, error: "Organization not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Organization deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting organization:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete organization" },
      { status: 500 }
    );
  }
}

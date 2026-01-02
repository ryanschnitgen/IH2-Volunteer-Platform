import { NextRequest, NextResponse } from "next/server";
import connectDB from "@backend/lib/db/mongodb";
import Application from "@backend/lib/models/Application";
import mongoose from "mongoose";

// GET /api/applications/[id] - Get a specific application
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid application ID" },
        { status: 400 }
      );
    }

    const application = await Application.findById(id)
      .populate("userId", "firstName lastName email phone profileImage bio skills")
      .populate("opportunityId", "title description category location schedule")
      .populate("organizationId", "name logo email phone")
      .populate("reviewedBy", "firstName lastName");

    if (!application) {
      return NextResponse.json(
        { success: false, error: "Application not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: application,
    });
  } catch (error: any) {
    console.error("Error fetching application:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch application" },
      { status: 500 }
    );
  }
}

// PUT /api/applications/[id] - Update an application (status, review, etc.)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid application ID" },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Remove fields that shouldn't be updated directly
    delete body._id;
    delete body.createdAt;
    delete body.updatedAt;
    delete body.appliedAt;

    // If status is being changed to approved/rejected, set reviewedAt
    if (body.status === "approved" || body.status === "rejected") {
      body.reviewedAt = new Date();
    }

    const application = await Application.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    )
      .populate("userId", "firstName lastName email")
      .populate("opportunityId", "title category")
      .populate("organizationId", "name logo");

    if (!application) {
      return NextResponse.json(
        { success: false, error: "Application not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: application,
      message: "Application updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating application:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update application" },
      { status: 500 }
    );
  }
}

// DELETE /api/applications/[id] - Delete/withdraw an application
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid application ID" },
        { status: 400 }
      );
    }

    const application = await Application.findByIdAndDelete(id);

    if (!application) {
      return NextResponse.json(
        { success: false, error: "Application not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Application deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting application:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete application" },
      { status: 500 }
    );
  }
}

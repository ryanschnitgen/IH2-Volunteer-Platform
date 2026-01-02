import { NextRequest, NextResponse } from "next/server";
import connectDB from "@backend/lib/db/mongodb";
import Opportunity from "@backend/lib/models/Opportunity";
import mongoose from "mongoose";

// GET /api/opportunities/[id] - Get a specific opportunity
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid opportunity ID" },
        { status: 400 }
      );
    }

    const opportunity = await Opportunity.findById(id)
      .populate("organizationId", "name logo email phone address");

    if (!opportunity) {
      return NextResponse.json(
        { success: false, error: "Opportunity not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: opportunity,
    });
  } catch (error: any) {
    console.error("Error fetching opportunity:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch opportunity" },
      { status: 500 }
    );
  }
}

// PUT /api/opportunities/[id] - Update an opportunity
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid opportunity ID" },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Remove fields that shouldn't be updated directly
    delete body._id;
    delete body.createdAt;
    delete body.updatedAt;

    const opportunity = await Opportunity.findByIdAndUpdate(
      id,
      { $set: body },
      { new: true, runValidators: true }
    ).populate("organizationId", "name logo");

    if (!opportunity) {
      return NextResponse.json(
        { success: false, error: "Opportunity not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: opportunity,
      message: "Opportunity updated successfully",
    });
  } catch (error: any) {
    console.error("Error updating opportunity:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update opportunity" },
      { status: 500 }
    );
  }
}

// DELETE /api/opportunities/[id] - Delete an opportunity
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await connectDB();
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { success: false, error: "Invalid opportunity ID" },
        { status: 400 }
      );
    }

    const opportunity = await Opportunity.findByIdAndDelete(id);

    if (!opportunity) {
      return NextResponse.json(
        { success: false, error: "Opportunity not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Opportunity deleted successfully",
    });
  } catch (error: any) {
    console.error("Error deleting opportunity:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to delete opportunity" },
      { status: 500 }
    );
  }
}

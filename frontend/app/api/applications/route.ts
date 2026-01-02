import { NextRequest, NextResponse } from "next/server";
import connectDB from "@backend/lib/db/mongodb";
import Application from "@backend/lib/models/Application";

// GET /api/applications - Get all applications (with pagination and filtering)
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const userId = searchParams.get("userId");
    const opportunityId = searchParams.get("opportunityId");
    const organizationId = searchParams.get("organizationId");
    const status = searchParams.get("status");

    const skip = (page - 1) * limit;

    // Build filter query
    const filter: any = {};
    if (userId) {
      filter.userId = userId;
    }
    if (opportunityId) {
      filter.opportunityId = opportunityId;
    }
    if (organizationId) {
      filter.organizationId = organizationId;
    }
    if (status) {
      filter.status = status;
    }

    const applications = await Application.find(filter)
      .populate("userId", "firstName lastName email profileImage")
      .populate("opportunityId", "title category location")
      .populate("organizationId", "name logo")
      .skip(skip)
      .limit(limit)
      .sort({ appliedAt: -1 });

    const total = await Application.countDocuments(filter);

    return NextResponse.json({
      success: true,
      data: applications,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Error fetching applications:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch applications" },
      { status: 500 }
    );
  }
}

// POST /api/applications - Create a new application
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();

    // Validate required fields
    if (!body.userId || !body.opportunityId || !body.organizationId) {
      return NextResponse.json(
        {
          success: false,
          error: "User ID, opportunity ID, and organization ID are required",
        },
        { status: 400 }
      );
    }

    // Check if user has already applied to this opportunity
    const existingApplication = await Application.findOne({
      userId: body.userId,
      opportunityId: body.opportunityId,
    });

    if (existingApplication) {
      return NextResponse.json(
        {
          success: false,
          error: "You have already applied to this opportunity",
        },
        { status: 409 }
      );
    }

    // Create new application
    const application = await Application.create(body);

    // Populate related data
    const populatedApplication = await Application.findById(application._id)
      .populate("userId", "firstName lastName email profileImage")
      .populate("opportunityId", "title category location")
      .populate("organizationId", "name logo");

    return NextResponse.json(
      {
        success: true,
        data: populatedApplication,
        message: "Application submitted successfully",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating application:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create application" },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import connectDB from "@backend/lib/db/mongodb";
import Organization from "@backend/lib/models/Organization";

// GET /api/organizations - Get all organizations (with pagination and filtering)
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const category = searchParams.get("category");
    const verified = searchParams.get("verified");
    const search = searchParams.get("search");

    const skip = (page - 1) * limit;

    // Build filter query
    const filter: any = {};
    if (category) {
      filter.category = category;
    }
    if (verified === "true") {
      filter.verified = true;
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const organizations = await Organization.find(filter)
      .populate("adminUserId", "firstName lastName email")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Organization.countDocuments(filter);

    return NextResponse.json({
      success: true,
      data: organizations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Error fetching organizations:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch organizations" },
      { status: 500 }
    );
  }
}

// POST /api/organizations - Create a new organization
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();

    // Validate required fields
    if (!body.name || !body.description || !body.category || !body.email || !body.adminUserId) {
      return NextResponse.json(
        {
          success: false,
          error: "Name, description, category, email, and admin user ID are required",
        },
        { status: 400 }
      );
    }

    // Check if organization with same name already exists
    const existingOrg = await Organization.findOne({ name: body.name });
    if (existingOrg) {
      return NextResponse.json(
        { success: false, error: "Organization with this name already exists" },
        { status: 409 }
      );
    }

    // Create new organization
    const organization = await Organization.create(body);

    // Populate admin user data
    const populatedOrganization = await Organization.findById(organization._id)
      .populate("adminUserId", "firstName lastName email");

    return NextResponse.json(
      {
        success: true,
        data: populatedOrganization,
        message: "Organization created successfully",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating organization:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create organization" },
      { status: 500 }
    );
  }
}

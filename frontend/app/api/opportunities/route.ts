import { NextRequest, NextResponse } from "next/server";
import connectDB from "@backend/lib/db/mongodb";
import Opportunity from "@backend/lib/models/Opportunity";

// GET /api/opportunities - Get all opportunities (with pagination and filtering)
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const category = searchParams.get("category");
    const status = searchParams.get("status") || "active";
    const organizationId = searchParams.get("organizationId");
    const city = searchParams.get("city");
    const search = searchParams.get("search");
    const isRemote = searchParams.get("isRemote");

    const skip = (page - 1) * limit;

    // Build filter query
    const filter: any = {};
    if (status) {
      filter.status = status;
    }
    if (category) {
      filter.category = category;
    }
    if (organizationId) {
      filter.organizationId = organizationId;
    }
    if (city) {
      filter["location.city"] = { $regex: city, $options: "i" };
    }
    if (isRemote === "true") {
      filter["location.isRemote"] = true;
    }
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }

    const opportunities = await Opportunity.find(filter)
      .populate("organizationId", "name logo")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Opportunity.countDocuments(filter);

    return NextResponse.json({
      success: true,
      data: opportunities,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error("Error fetching opportunities:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch opportunities" },
      { status: 500 }
    );
  }
}

// POST /api/opportunities - Create a new opportunity
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const body = await request.json();

    // Validate required fields
    if (!body.title || !body.description || !body.organizationId || !body.category) {
      return NextResponse.json(
        {
          success: false,
          error: "Title, description, organization, and category are required",
        },
        { status: 400 }
      );
    }

    // Create new opportunity
    const opportunity = await Opportunity.create(body);

    // Populate organization data
    const populatedOpportunity = await Opportunity.findById(opportunity._id)
      .populate("organizationId", "name logo");

    return NextResponse.json(
      {
        success: true,
        data: populatedOpportunity,
        message: "Opportunity created successfully",
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating opportunity:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to create opportunity" },
      { status: 500 }
    );
  }
}

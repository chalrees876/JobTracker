import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createApplicationSchema, type ApiResponse, type Application } from "@shared/types";
import crypto from "crypto";

// Temporary: hardcode user ID until auth is added
const TEMP_USER_ID = "temp-user-id";

// GET /api/applications - List all applications
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") ?? "1");
    const pageSize = parseInt(searchParams.get("pageSize") ?? "50");

    const where = {
      userId: TEMP_USER_ID,
      ...(status ? { status: status as any } : {}),
    };

    const [applications, total] = await Promise.all([
      db.application.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          resumeVersions: {
            select: { id: true, createdAt: true },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          contacts: {
            select: { id: true, name: true, role: true },
          },
        },
      }),
      db.application.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        items: applications,
        total,
        page,
        pageSize,
        hasMore: total > page * pageSize,
      },
    });
  } catch (error) {
    console.error("Failed to fetch applications:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch applications" },
      { status: 500 }
    );
  }
}

// POST /api/applications - Create new application
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createApplicationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.message },
        { status: 400 }
      );
    }

    const { title, companyName, location, url, description, salary, source } = parsed.data;

    // Hash the description to detect duplicates/changes
    const descriptionHash = crypto
      .createHash("sha256")
      .update(description)
      .digest("hex")
      .slice(0, 16);

    // Check for existing application with same URL
    const existing = await db.application.findFirst({
      where: {
        userId: TEMP_USER_ID,
        url,
      },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Application already exists for this job posting" },
        { status: 409 }
      );
    }

    // Ensure user exists (temporary - will be handled by auth later)
    await db.user.upsert({
      where: { id: TEMP_USER_ID },
      create: { id: TEMP_USER_ID, email: "temp@example.com" },
      update: {},
    });

    const application = await db.application.create({
      data: {
        userId: TEMP_USER_ID,
        companyName,
        title,
        location,
        url,
        description,
        descriptionHash,
        salary,
        source,
      },
    });

    return NextResponse.json({ success: true, data: application }, { status: 201 });
  } catch (error) {
    console.error("Failed to create application:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create application" },
      { status: 500 }
    );
  }
}

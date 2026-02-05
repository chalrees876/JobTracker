import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { createApplicationSchema } from "@shared/types";
import crypto from "crypto";

// GET /api/applications - List all applications
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") ?? "1");
    const pageSize = parseInt(searchParams.get("pageSize") ?? "50");

    const where = {
      userId: session.user.id,
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
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = createApplicationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.message },
        { status: 400 }
      );
    }

    const { title, companyName, location, url, description, salary, source } = parsed.data;
    const normalizedUrl = url?.trim() || null;

    // Hash the description to detect duplicates/changes
    const descriptionHash = crypto
      .createHash("sha256")
      .update(description)
      .digest("hex")
      .slice(0, 16);

    // Check for existing application with same URL
    if (normalizedUrl) {
      const existing = await db.application.findFirst({
        where: {
          userId: session.user.id,
          url: normalizedUrl,
        },
      });

      if (existing) {
        return NextResponse.json(
          { success: false, error: "Application already exists for this job posting" },
          { status: 409 }
        );
      }
    }

    const application = await db.application.create({
      data: {
        userId: session.user.id,
        companyName,
        title,
        location,
        url: normalizedUrl,
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

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const updateApplicationSchema = z.object({
  status: z.string().optional(),
  notes: z.string().nullable().optional(),
  appliedAt: z.string().datetime({ offset: true }).nullable().optional(),
  appliedWithResumeId: z.string().nullable().optional(),
}).strict();

// GET /api/applications/[id] - Get single application
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const limited = rateLimit(session.user.id);
    if (limited) return limited;

    const { id } = await params;

    const application = await db.application.findFirst({
      where: {
        id,
        userId: session.user.id,
      },
      include: {
        resumeVersions: {
          orderBy: { createdAt: "desc" },
          include: {
            baseResume: {
              select: { name: true },
            },
          },
        },
        contacts: {
          include: {
            outreachMessages: true,
          },
        },
        companyInfo: true,
      },
    });

    if (!application) {
      return NextResponse.json(
        { success: false, error: "Application not found" },
        { status: 404 }
      );
    }

    // Fetch the base resume used when applying (if any)
    let appliedWithResume = null;
    if (application.appliedWithResumeId) {
      const baseResume = await db.baseResume.findUnique({
        where: { id: application.appliedWithResumeId },
        select: { id: true, name: true },
      });
      appliedWithResume = baseResume;
    }

    return NextResponse.json({
      success: true,
      data: {
        ...application,
        appliedWithResume,
      }
    });
  } catch (error) {
    console.error("Failed to fetch application:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch application" },
      { status: 500 }
    );
  }
}

// PATCH /api/applications/[id] - Update application
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const limited = rateLimit(session.user.id);
    if (limited) return limited;

    const { id } = await params;
    const body = await request.json();

    const parsed = updateApplicationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid request body" },
        { status: 400 }
      );
    }

    // Verify ownership
    const existing = await db.application.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Application not found" },
        { status: 404 }
      );
    }

    const { status, notes, appliedAt, appliedWithResumeId } = parsed.data;

    const application = await db.application.update({
      where: { id },
      data: {
        ...(status !== undefined && { status }),
        ...(notes !== undefined && { notes }),
        ...(appliedAt !== undefined && { appliedAt: appliedAt ? new Date(appliedAt) : null }),
        ...(appliedWithResumeId !== undefined && { appliedWithResumeId }),
      },
    });

    return NextResponse.json({ success: true, data: application });
  } catch (error) {
    console.error("Failed to update application:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update application" },
      { status: 500 }
    );
  }
}

// DELETE /api/applications/[id] - Delete application
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const limited = rateLimit(session.user.id);
    if (limited) return limited;

    const { id } = await params;

    // Verify ownership
    const existing = await db.application.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Application not found" },
        { status: 404 }
      );
    }

    await db.application.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete application:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete application" },
      { status: 500 }
    );
  }
}

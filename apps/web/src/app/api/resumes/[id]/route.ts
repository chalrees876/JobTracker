import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const updateResumeSchema = z.object({
  name: z.string().min(1).optional(),
  content: z.record(z.unknown()).optional(),
  isDefault: z.boolean().optional(),
}).strict();

// GET /api/resumes/[id] - Get a specific resume
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

    const resume = await db.baseResume.findFirst({
      where: {
        id,
        profile: { userId: session.user.id },
      },
    });

    if (!resume) {
      return NextResponse.json(
        { success: false, error: "Resume not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: resume });
  } catch (error) {
    console.error("Failed to fetch resume:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch resume" },
      { status: 500 }
    );
  }
}

// PATCH /api/resumes/[id] - Update a resume
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

    const parsed = updateResumeSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: "Invalid request body" },
        { status: 400 }
      );
    }

    // Verify ownership
    const existing = await db.baseResume.findFirst({
      where: {
        id,
        profile: { userId: session.user.id },
      },
      include: { profile: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Resume not found" },
        { status: 404 }
      );
    }

    const { name, content, isDefault } = parsed.data;

    // If setting as default, unset others
    if (isDefault) {
      await db.baseResume.updateMany({
        where: { profileId: existing.profileId },
        data: { isDefault: false },
      });
    }

    const resume = await db.baseResume.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(content !== undefined && { content }),
        ...(isDefault !== undefined && { isDefault }),
      },
    });

    return NextResponse.json({ success: true, data: resume });
  } catch (error) {
    console.error("Failed to update resume:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update resume" },
      { status: 500 }
    );
  }
}

// DELETE /api/resumes/[id] - Delete a resume
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
    const existing = await db.baseResume.findFirst({
      where: {
        id,
        profile: { userId: session.user.id },
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Resume not found" },
        { status: 404 }
      );
    }

    await db.baseResume.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete resume:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete resume" },
      { status: 500 }
    );
  }
}

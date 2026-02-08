import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const createResumeSchema = z.object({
  name: z.string().min(1, "Resume name is required"),
  content: z.object({
    name: z.string(),
    email: z.string(),
    phone: z.string().nullable().optional(),
    location: z.string().nullable().optional(),
    linkedin: z.string().nullable().optional(),
    website: z.string().nullable().optional(),
    summary: z.string().nullable().optional(),
    skills: z.array(z.string()).default([]),
    experience: z.array(z.object({
      company: z.string(),
      title: z.string(),
      startDate: z.string(),
      endDate: z.string().nullable(),
      location: z.string().nullable().optional(),
      bullets: z.array(z.string()),
    })).default([]),
    education: z.array(z.object({
      institution: z.string(),
      degree: z.string(),
      field: z.string().nullable().optional(),
      graduationDate: z.string().nullable().optional(),
      gpa: z.string().nullable().optional(),
    })).default([]),
    projects: z.array(z.object({
      name: z.string(),
      description: z.string(),
      technologies: z.array(z.string()),
      url: z.string().nullable().optional(),
      bullets: z.array(z.string()).default([]),
    })).default([]),
  }),
  isDefault: z.boolean().optional(),
});

// GET /api/resumes - List user's base resumes
export async function GET() {
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

    const profile = await db.userProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!profile) {
      return NextResponse.json({ success: true, data: [] });
    }

    const resumes = await db.baseResume.findMany({
      where: { profileId: profile.id },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ success: true, data: resumes });
  } catch (error) {
    console.error("Failed to fetch resumes:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch resumes" },
      { status: 500 }
    );
  }
}

// POST /api/resumes - Create a new base resume
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const parsed = createResumeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.message },
        { status: 400 }
      );
    }

    // Ensure profile exists
    let profile = await db.userProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!profile) {
      profile = await db.userProfile.create({
        data: { userId: session.user.id },
      });
    }

    const { name, content, isDefault } = parsed.data;

    // If this is set as default, unset other defaults
    if (isDefault) {
      await db.baseResume.updateMany({
        where: { profileId: profile.id },
        data: { isDefault: false },
      });
    }

    // If this is the first resume, make it default
    const existingCount = await db.baseResume.count({
      where: { profileId: profile.id },
    });

    const resume = await db.baseResume.create({
      data: {
        profileId: profile.id,
        name,
        content,
        isDefault: isDefault || existingCount === 0,
      },
    });

    return NextResponse.json({ success: true, data: resume }, { status: 201 });
  } catch (error) {
    console.error("Failed to create resume:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create resume" },
      { status: 500 }
    );
  }
}

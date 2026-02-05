import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import type { ResumeData } from "@shared/types";

const tailoredResumeSchema = z.object({
  summary: z.string().describe("A 2-3 sentence professional summary tailored to the job"),
  skills: z.array(z.string()).describe("Skills list reordered/filtered to match job requirements"),
  experience: z.array(
    z.object({
      company: z.string(),
      title: z.string(),
      startDate: z.string(),
      endDate: z.string().nullable(),
      location: z.string().nullable(),
      bullets: z.array(z.string()).describe("Achievement bullets rewritten to emphasize relevant skills"),
    }).strict()
  ),
  projects: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      technologies: z.array(z.string()),
      url: z.string().nullable(),
      bullets: z.array(z.string()),
    }).strict()
  ),
  keywords: z.array(z.string()).describe("Keywords extracted from the job description"),
}).strict();

// POST /api/applications/[id]/resume - Generate tailored resume
export async function POST(
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

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { baseResumeId } = body;

    // Get application with job description
    const application = await db.application.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!application) {
      return NextResponse.json(
        { success: false, error: "Application not found" },
        { status: 404 }
      );
    }

    // Get user's profile
    const profile = await db.userProfile.findFirst({
      where: { userId: session.user.id },
      include: { baseResumes: true },
    });

    if (!profile || profile.baseResumes.length === 0) {
      return NextResponse.json(
        { success: false, error: "No base resume found. Please add a resume in your profile first." },
        { status: 400 }
      );
    }

    // Find the specified base resume, or use the default
    let selectedResume = baseResumeId
      ? profile.baseResumes.find((r) => r.id === baseResumeId)
      : profile.baseResumes.find((r) => r.isDefault) || profile.baseResumes[0];

    if (!selectedResume) {
      return NextResponse.json(
        { success: false, error: "Selected resume not found" },
        { status: 400 }
      );
    }

    if (!selectedResume.content) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Resume content is missing. Please upload a text-based PDF resume so we can parse it for tailoring.",
        },
        { status: 400 }
      );
    }

    const baseResume = selectedResume.content as ResumeData;

    // Generate tailored resume using AI
    const { object: tailored } = await generateObject({
      model: openai("gpt-4o-2024-08-06", { structuredOutputs: true }),
      schemaName: "tailored_resume",
      schemaDescription: "A tailored resume object and extracted keywords",
      schema: tailoredResumeSchema,
      prompt: `You are an expert ATS resume optimizer. Given a base resume and job description, create a tailored version that:

1. Reorders skills to put the most relevant ones first
2. Rewrites experience bullets to emphasize matching skills and keywords
3. Creates a summary tailored to this specific role
4. Extracts key keywords from the job description

CRITICAL CONSTRAINTS:
- NEVER invent experience, companies, or projects that don't exist in the base resume
- NEVER fabricate metrics or numbers - only include quantifiable achievements if they exist in the original
- You may rephrase and reorder, but the underlying facts must remain truthful
- Focus on highlighting relevant existing experience, not creating new content

BASE RESUME:
${JSON.stringify(baseResume, null, 2)}

JOB DESCRIPTION:
Company: ${application.companyName}
Title: ${application.title}
Location: ${application.location || "Not specified"}

${application.description}

Generate a tailored resume that will perform well in ATS systems while remaining completely truthful.`,
    });

    // Merge tailored content with base resume (keep contact info, education, etc.)
    const tailoredResume: ResumeData = {
      name: baseResume.name,
      email: baseResume.email,
      phone: baseResume.phone,
      location: baseResume.location,
      linkedin: baseResume.linkedin,
      website: baseResume.website,
      summary: tailored.summary,
      skills: tailored.skills,
      experience: tailored.experience,
      education: baseResume.education,
      projects: tailored.projects,
    };

    // Save the resume version
    const resumeVersion = await db.resumeVersion.create({
      data: {
        applicationId: id,
        baseResumeId: selectedResume.id,
        content: tailoredResume,
        keywords: tailored.keywords,
        promptConfig: {
          model: "gpt-4o",
          baseResumeId: selectedResume.id,
          timestamp: new Date().toISOString(),
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: resumeVersion.id,
        content: tailoredResume,
        keywords: tailored.keywords,
        createdAt: resumeVersion.createdAt,
      },
    });
  } catch (error) {
    console.error("Failed to generate resume:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate tailored resume" },
      { status: 500 }
    );
  }
}

// GET /api/applications/[id]/resume - Get resume versions for application
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

    const { id } = await params;

    const versions = await db.resumeVersion.findMany({
      where: {
        applicationId: id,
        application: { userId: session.user.id },
      },
      orderBy: { createdAt: "desc" },
      include: {
        baseResume: {
          select: { name: true },
        },
      },
    });

    return NextResponse.json({ success: true, data: versions });
  } catch (error) {
    console.error("Failed to fetch resume versions:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch resume versions" },
      { status: 500 }
    );
  }
}

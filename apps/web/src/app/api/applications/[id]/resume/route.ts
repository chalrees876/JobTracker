import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import type { ResumeData } from "@shared/types";
import type { Prisma } from "@prisma/client";

const tailoredResumeSchema = z.object({
  summary: z.string().describe("A 2-3 sentence professional summary tailored to the job"),
  skills: z.array(z.string()).describe("Skills reordered/trimmed to match job requirements (must exist in base resume)"),
  experience: z.array(
    z.object({
      company: z.string(),
      title: z.string(),
      startDate: z.string(),
      endDate: z.string().nullable(),
      location: z.string().nullable(),
      bullets: z.array(z.string()).describe("Achievement bullets rewritten to emphasize relevant skills (no new facts)"),
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
  keywords: z.array(z.string()).describe("Keywords extracted from the job description (must appear in base resume)"),
}).strict();

type TailoredResume = z.infer<typeof tailoredResumeSchema>;

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function validateTailored(base: ResumeData, tailored: TailoredResume): string | null {
  if (!tailored.summary?.trim()) return "Missing summary";
  if (!tailored.skills?.length) return "Missing skills";
  if (!tailored.keywords?.length) return "Missing keywords";

  if (tailored.experience.length !== base.experience.length) {
    return "Experience count changed";
  }
  for (let i = 0; i < base.experience.length; i += 1) {
    const baseExp = base.experience[i];
    const tailoredExp = tailored.experience[i];
    if (
      normalizeText(baseExp.company) !== normalizeText(tailoredExp.company) ||
      normalizeText(baseExp.title) !== normalizeText(tailoredExp.title) ||
      normalizeText(baseExp.startDate) !== normalizeText(tailoredExp.startDate) ||
      normalizeText(baseExp.endDate || "") !== normalizeText(tailoredExp.endDate || "") ||
      normalizeText(baseExp.location || "") !== normalizeText(tailoredExp.location || "")
    ) {
      return "Experience fields changed";
    }
    if (tailoredExp.bullets.length > baseExp.bullets.length) {
      return "Experience bullet count increased";
    }
  }

  const baseProjects = base.projects ?? [];
  if (baseProjects.length === 0 && tailored.projects.length > 0) {
    return "Projects added without a base project";
  }
  if (baseProjects.length > 0 && tailored.projects.length !== baseProjects.length) {
    return "Project count changed";
  }
  for (let i = 0; i < baseProjects.length; i += 1) {
    const baseProject = baseProjects[i];
    const tailoredProject = tailored.projects[i];
    if (normalizeText(baseProject.name) !== normalizeText(tailoredProject.name)) {
      return `Unknown project: ${tailoredProject.name}`;
    }
    if (tailoredProject.bullets.length > baseProject.bullets.length) {
      return "Project bullet count increased";
    }
  }

  const baseSkills = base.skills.map((skill) => normalizeText(skill));
  const isSkillInBase = (skill: string) =>
    baseSkills.some((baseSkill) => baseSkill.includes(normalizeText(skill)) || normalizeText(skill).includes(baseSkill));
  for (const skill of tailored.skills) {
    if (!isSkillInBase(skill)) {
      return `Unknown skill: ${skill}`;
    }
  }

  const combinedText = [
    tailored.summary,
    ...tailored.skills,
    ...tailored.experience.flatMap((exp) => exp.bullets),
    ...tailored.projects.flatMap((project) => [project.description, ...project.bullets]),
  ]
    .join(" ")
    .toLowerCase();

  const keywordMatches = tailored.keywords.filter((keyword) =>
    combinedText.includes(keyword.toLowerCase())
  );
  const minMatches = Math.min(6, Math.max(3, Math.floor(tailored.keywords.length * 0.5)));
  if (keywordMatches.length < minMatches) {
    return "Low keyword coverage";
  }

  return null;
}

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

    const baseResume = selectedResume.content as unknown as ResumeData;

    const promptBase = `You are an expert ATS resume optimizer. Given a base resume (structured JSON) and a job description, create a tailored version that:

1. Rewrites the summary to align with the role (2-3 concise sentences).
2. Reorders and trims skills to the most relevant ones (ONLY from the base resume).
3. Rewrites experience bullets to emphasize matching skills/keywords while preserving facts.
4. Rewrites project descriptions/bullets to emphasize relevant skills (if projects exist).
5. Extracts keywords from the job description that ALSO appear in the base resume.

ATS STYLE:
- Concise, action-oriented, no first-person, no filler
- Keep bullets to ~1-2 lines
- Preserve any metrics/numbers exactly as in the base resume

CRITICAL CONSTRAINTS:
- Do NOT add or remove experience entries or projects
- Preserve company/title/dates/location exactly and in the same order
- Do NOT invent skills, tools, or technologies not present in the base resume
- Do NOT fabricate metrics or results

BASE RESUME (structured):
${JSON.stringify(baseResume, null, 2)}

JOB DESCRIPTION:
Company: ${application.companyName}
Title: ${application.title}
Location: ${application.location || "Not specified"}

${application.description}

Return JSON that matches the schema exactly.`;

    let tailored: TailoredResume | null = null;
    let validationError = "";

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const retryNote =
        attempt === 1
          ? ""
          : "\n\nRETRY STRICTLY: Keep company/title/dates/location and project names identical and in the same order. Do not add new skills. Keep bullet counts the same or fewer. Include at least 50% of extracted keywords in the rewritten content.";

      const { object } = await generateObject({
        model: openai("gpt-4o-2024-08-06", { structuredOutputs: true }),
        schemaName: "tailored_resume",
        schemaDescription: "A tailored resume object and extracted keywords",
        schema: tailoredResumeSchema,
        temperature: 0.2,
        prompt: `${promptBase}${retryNote}`,
      });

      const error = validateTailored(baseResume, object);
      if (!error) {
        tailored = object;
        break;
      }
      validationError = error;
    }

    if (!tailored) {
      return NextResponse.json(
        {
          success: false,
          error: `Failed to generate a valid tailored resume (${validationError}). Please try again.`,
        },
        { status: 500 }
      );
    }

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
        content: tailoredResume as unknown as Prisma.InputJsonValue,
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

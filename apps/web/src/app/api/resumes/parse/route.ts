import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import pdf from "pdf-parse";

const resumeSchema = z.object({
  name: z.string().describe("Full name of the person"),
  email: z.string().describe("Email address"),
  phone: z.string().nullable().describe("Phone number if present"),
  location: z.string().nullable().describe("City, State or location if present"),
  linkedin: z.string().nullable().describe("LinkedIn URL if present"),
  website: z.string().nullable().describe("Personal website or portfolio URL if present"),
  summary: z.string().nullable().describe("Professional summary or objective statement if present"),
  skills: z.array(z.string()).describe("List of skills, technologies, tools mentioned"),
  experience: z.array(
    z.object({
      company: z.string().describe("Company or organization name"),
      title: z.string().describe("Job title or role"),
      startDate: z.string().describe("Start date (e.g., 'Jan 2020' or '2020')"),
      endDate: z.string().nullable().describe("End date or 'Present' if current"),
      location: z.string().nullable().describe("Job location if mentioned"),
      bullets: z.array(z.string()).describe("Achievement bullets or responsibilities"),
    })
  ).describe("Work experience entries, ordered from most recent to oldest"),
  education: z.array(
    z.object({
      institution: z.string().describe("School or university name"),
      degree: z.string().describe("Degree type (e.g., B.S., M.S., Ph.D.)"),
      field: z.string().nullable().describe("Field of study or major"),
      graduationDate: z.string().nullable().describe("Graduation date or expected graduation"),
      gpa: z.string().nullable().describe("GPA if mentioned"),
    })
  ).describe("Education entries"),
  projects: z.array(
    z.object({
      name: z.string().describe("Project name"),
      description: z.string().describe("Brief description of the project"),
      technologies: z.array(z.string()).describe("Technologies used"),
      url: z.string().nullable().describe("Project URL if mentioned"),
      bullets: z.array(z.string()).describe("Key accomplishments or features"),
    })
  ).describe("Personal or professional projects if any are mentioned"),
});

// POST /api/resumes/parse - Parse PDF and extract resume data
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { success: false, error: "File must be a PDF" },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse PDF to extract text
    let pdfText: string;
    try {
      const pdfData = await pdf(buffer);
      pdfText = pdfData.text;
    } catch (pdfError) {
      console.error("PDF parsing error:", pdfError);
      return NextResponse.json(
        { success: false, error: "Failed to parse PDF. Please ensure the file is a valid PDF." },
        { status: 400 }
      );
    }

    if (!pdfText || pdfText.trim().length < 50) {
      return NextResponse.json(
        { success: false, error: "Could not extract text from PDF. The file may be image-based or corrupted." },
        { status: 400 }
      );
    }

    // Use AI to extract structured data
    const { object: parsedResume } = await generateObject({
      model: openai("gpt-4o"),
      schema: resumeSchema,
      prompt: `You are an expert resume parser. Extract structured data from the following resume text.

IMPORTANT GUIDELINES:
- Extract all information accurately from the text
- For dates, use a consistent format like "Jan 2020" or just the year "2020"
- If information is not present, use null
- For skills, extract ALL technical skills, soft skills, tools, and technologies mentioned
- For experience bullets, preserve the actual achievements and responsibilities
- Order experience from most recent to oldest
- Be thorough - don't miss any sections

RESUME TEXT:
${pdfText}

Extract all available information into the structured format.`,
    });

    return NextResponse.json({
      success: true,
      data: {
        parsed: parsedResume,
        rawText: pdfText.slice(0, 5000), // Include some raw text for reference
      },
    });
  } catch (error) {
    console.error("Failed to parse resume:", error);
    return NextResponse.json(
      { success: false, error: "Failed to parse resume" },
      { status: 500 }
    );
  }
}

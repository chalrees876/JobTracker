import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { unlink, writeFile, mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { promisify } from "node:util";
import { z } from "zod";
import type { ResumeData } from "@shared/types";

const experienceSchema = z.object({
  company: z.string().describe("Company or organization name"),
  title: z.string().describe("Job title or role"),
  startDate: z.string().describe("Start date (e.g., 'Jan 2020' or '2020')"),
  endDate: z.string().nullable().describe("End date or 'Present' if current"),
  location: z.string().nullable().describe("Job location if mentioned"),
  bullets: z.array(z.string()).describe("Achievement bullets or responsibilities"),
}).strict();

const educationSchema = z.object({
  institution: z.string().describe("School or university name"),
  degree: z.string().describe("Degree type (e.g., B.S., M.S., Ph.D.)"),
  field: z.string().nullable().describe("Field of study or major"),
  graduationDate: z.string().nullable().describe("Graduation date or expected graduation"),
  gpa: z.string().nullable().describe("GPA if mentioned"),
}).strict();

const projectSchema = z.object({
  name: z.string().describe("Project name"),
  description: z.string().describe("Brief description of the project"),
  technologies: z.array(z.string()).describe("Technologies used"),
  url: z.string().nullable().describe("Project URL if mentioned"),
  bullets: z.array(z.string()).describe("Key accomplishments or features"),
}).strict();

const sectionSchema = z.object({
  title: z.string().describe("Section header title as written in the resume"),
  content: z.array(z.string()).describe("Lines or bullets that belong to this section, in order"),
}).strict();

export const resumeSchema = z.object({
  name: z.string().describe("Full name of the person"),
  email: z.string().describe("Email address"),
  phone: z.string().nullable().describe("Phone number if present"),
  location: z.string().nullable().describe("City, State or location if present"),
  linkedin: z.string().nullable().describe("LinkedIn URL if present"),
  website: z.string().nullable().describe("Personal website or portfolio URL if present"),
  summary: z.string().nullable().describe("Professional summary or objective statement if present"),
  skills: z.array(z.string()).describe("List of skills, technologies, tools mentioned"),
  experience: z.array(experienceSchema).describe("Work experience entries, ordered from most recent to oldest"),
  education: z.array(educationSchema).describe("Education entries"),
  projects: z.array(projectSchema).describe("Personal or professional projects if any are mentioned"),
  sections: z.array(sectionSchema).describe("All resume sections in the order they appear, including any extra headers"),
}).strict();

export type ParsedResume = ResumeData;

const execFileAsync = promisify(execFile);
const MIN_TEXT_LENGTH = 200;
const TEMP_MAX_AGE_MS = 24 * 60 * 60 * 1000;
let didCleanupTempDir = false;

async function cleanupTempDir(tempDir: string) {
  try {
    const entries = await readdir(tempDir);
    const now = Date.now();
    await Promise.all(
      entries.map(async (entry) => {
        const fullPath = path.join(tempDir, entry);
        try {
          const info = await stat(fullPath);
          if (now - info.mtimeMs > TEMP_MAX_AGE_MS) {
            await unlink(fullPath);
          }
        } catch (error) {
          console.warn("Failed to cleanup temp resume file:", error);
        }
      })
    );
  } catch (error) {
    console.warn("Failed to scan temp resume directory:", error);
  }
}

function resolvePdfParseCli(): string {
  const candidates = [
    path.join(process.cwd(), "node_modules", "pdf-parse", "bin", "cli.mjs"),
    path.join(process.cwd(), "..", "node_modules", "pdf-parse", "bin", "cli.mjs"),
  ];

  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }

  throw new Error("PDF_PARSE_FAILED");
}

async function extractPdfText(buffer: Buffer): Promise<string> {
  const cliPath = resolvePdfParseCli();

  // Create temp file for pdf-parse CLI (always cleanup after)
  const tempDir = path.join(process.cwd(), "uploads", "tmp");
  await mkdir(tempDir, { recursive: true });
  if (!didCleanupTempDir) {
    didCleanupTempDir = true;
    await cleanupTempDir(tempDir);
  }
  const tempPath = path.join(tempDir, `${randomUUID()}.pdf`);
  await writeFile(tempPath, buffer);

  try {
    const { stdout } = await execFileAsync(
      process.execPath,
      [cliPath, "text", tempPath],
      { maxBuffer: 20 * 1024 * 1024 }
    );
    return stdout;
  } finally {
    await unlink(tempPath).catch((error) => {
      console.warn("Failed to remove temp resume file:", error);
    });
  }
}

function makeParseError(code: "PDF_PARSE_FAILED" | "NO_TEXT", cause?: unknown) {
  const err = new Error(code) as Error & { code?: string; cause?: unknown };
  err.code = code;
  err.cause = cause;
  return err;
}

export async function parseResumePdf(
  buffer: Buffer
): Promise<{ parsed: ParsedResume; rawText: string }> {
  let pdfText: string;
  try {
    pdfText = await extractPdfText(buffer);
  } catch (error) {
    throw makeParseError("PDF_PARSE_FAILED", error);
  }

  if (!pdfText || pdfText.trim().length < MIN_TEXT_LENGTH) {
    throw makeParseError("NO_TEXT");
  }

  const { object: parsedResume } = await generateObject({
    model: openai("gpt-4o-2024-08-06", { structuredOutputs: true }),
    schemaName: "parsed_resume",
    schemaDescription: "Structured resume data extracted from resume text",
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
- Build a sections array that captures every section header in order and ALL lines under each header
- Include sections even if they overlap with structured fields (summary, skills, experience, education, projects)

RESUME TEXT:
${pdfText}

Extract all available information into the structured format.`,
  });

  return { parsed: parsedResume, rawText: pdfText };
}

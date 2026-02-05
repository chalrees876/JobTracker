import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { unlink, writeFile } from "node:fs/promises";
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
}).strict();

export type ParsedResume = ResumeData;

const execFileAsync = promisify(execFile);

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

async function extractPdfText(buffer: Buffer, filePath?: string): Promise<string> {
  let tempPath: string | undefined;
  let cleanup = false;
  const cliPath = resolvePdfParseCli();

  if (filePath) {
    tempPath = filePath;
  } else {
    tempPath = path.join(process.cwd(), "uploads", `tmp-${randomUUID()}.pdf`);
    await writeFile(tempPath, buffer);
    cleanup = true;
  }

  try {
    const { stdout } = await execFileAsync(
      process.execPath,
      [cliPath, "text", tempPath],
      { maxBuffer: 20 * 1024 * 1024 }
    );
    return stdout;
  } finally {
    if (cleanup && tempPath) {
      await unlink(tempPath).catch(() => undefined);
    }
  }
}

function makeParseError(code: "PDF_PARSE_FAILED" | "NO_TEXT", cause?: unknown) {
  const err = new Error(code) as Error & { code?: string; cause?: unknown };
  err.code = code;
  err.cause = cause;
  return err;
}

export async function parseResumePdf(
  buffer: Buffer,
  filePath?: string
): Promise<{ parsed: ParsedResume; rawText: string }> {
  let pdfText: string;
  try {
    pdfText = await extractPdfText(buffer, filePath);
  } catch (error) {
    throw makeParseError("PDF_PARSE_FAILED", error);
  }

  if (!pdfText || pdfText.trim().length < 50) {
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

RESUME TEXT:
${pdfText}

Extract all available information into the structured format.`,
  });

  return { parsed: parsedResume, rawText: pdfText };
}

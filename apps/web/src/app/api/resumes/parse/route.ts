export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { parseResumePdf } from "@/lib/resume-parse";
import path from "node:path";

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

    const ext = path.extname(file.name).toLowerCase();
    const hasValidExt = ext === ".pdf";
    const hasValidType = !file.type || file.type === "application/pdf";
    if (!hasValidExt || !hasValidType) {
      return NextResponse.json(
        { success: false, error: "File must be a PDF" },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let parsedResume;
    let rawText;
    try {
      const parsed = await parseResumePdf(buffer);
      parsedResume = parsed.parsed;
      rawText = parsed.rawText;
    } catch (error) {
      const cause = error instanceof Error ? (error as Error & { cause?: unknown }).cause : undefined;
      console.error("Failed to parse resume:", error, cause);
      const code = error instanceof Error ? (error as Error & { code?: string }).code : undefined;
      const causeName =
        cause && typeof cause === "object" && "name" in cause ? String((cause as { name?: string }).name) : "";
      const message =
        code === "NO_TEXT"
          ? "Could not extract text from PDF. The file may be image-based or corrupted."
          : causeName === "PasswordException"
          ? "This PDF is password-protected. Please upload an unprotected, text-based PDF."
          : "Failed to parse PDF. Please ensure the file is a valid, text-based PDF.";
      return NextResponse.json(
        { success: false, error: message },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        parsed: parsedResume,
        rawText: rawText.slice(0, 5000), // Include some raw text for reference
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

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { writeFile, mkdir, unlink, readFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";

// Max file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Allowed file types
const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx"];

// POST /api/applications/[id]/final-resume - Upload final resume file
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
    const application = await db.application.findFirst({
      where: { id, userId: session.user.id },
    });

    if (!application) {
      return NextResponse.json(
        { success: false, error: "Application not found" },
        { status: 404 }
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
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { success: false, error: "Invalid file type. Please upload a PDF, DOC, or DOCX file." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: "File too large. Maximum size is 5MB." },
        { status: 400 }
      );
    }

    const uploadsDir = path.join(process.cwd(), "uploads", session.user.id, "applications", id);
    await mkdir(uploadsDir, { recursive: true });

    const uniqueId = randomUUID();
    const fileName = `${uniqueId}${ext}`;
    const filePath = path.join(uploadsDir, fileName);

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Clean up old file if present
    if (application.finalResumeFilePath) {
      const oldPath = path.join(process.cwd(), "uploads", application.finalResumeFilePath);
      await unlink(oldPath).catch(() => undefined);
    }

    const storedPath = path.join(session.user.id, "applications", id, fileName);
    const updated = await db.application.update({
      where: { id },
      data: {
        finalResumeFileName: file.name,
        finalResumeFileType: file.type || `application/${ext.slice(1)}`,
        finalResumeFileSize: file.size,
        finalResumeFilePath: storedPath,
        finalResumeUploadedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        fileName: updated.finalResumeFileName,
        fileType: updated.finalResumeFileType,
        fileSize: updated.finalResumeFileSize,
        filePath: updated.finalResumeFilePath,
        uploadedAt: updated.finalResumeUploadedAt,
      },
    });
  } catch (error) {
    console.error("Failed to upload final resume:", error);
    return NextResponse.json(
      { success: false, error: "Failed to upload final resume" },
      { status: 500 }
    );
  }
}

// GET /api/applications/[id]/final-resume - Download/view final resume file
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
    const application = await db.application.findFirst({
      where: { id, userId: session.user.id },
      select: {
        finalResumeFileName: true,
        finalResumeFileType: true,
        finalResumeFilePath: true,
      },
    });

    if (!application?.finalResumeFilePath) {
      return NextResponse.json(
        { success: false, error: "No final resume uploaded for this application" },
        { status: 404 }
      );
    }

    const absolutePath = path.join(process.cwd(), "uploads", application.finalResumeFilePath);
    const fileBuffer = await readFile(absolutePath);
    const contentType = application.finalResumeFileType || "application/octet-stream";

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${application.finalResumeFileName || "final_resume"}"`,
      },
    });
  } catch (error) {
    console.error("Failed to fetch final resume:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch final resume" },
      { status: 500 }
    );
  }
}

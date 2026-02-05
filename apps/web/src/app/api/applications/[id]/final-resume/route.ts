export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import path from "path";
import { randomUUID } from "crypto";

// Max file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Allowed file types
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

    // Generate unique filename and storage key
    const uniqueId = randomUUID();
    const fileName = `${uniqueId}${ext}`;
    const storageKey = `${session.user.id}/applications/${id}/${fileName}`;

    // Upload file to storage (GCS or local)
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const contentType = file.type || `application/${ext.slice(1)}`;
    await storage.upload(storageKey, buffer, contentType);

    // Clean up old file if present
    if (application.finalResumeFilePath) {
      await storage.delete(application.finalResumeFilePath);
    }

    const updated = await db.application.update({
      where: { id },
      data: {
        finalResumeFileName: file.name,
        finalResumeFileType: contentType,
        finalResumeFileSize: file.size,
        finalResumeFilePath: storageKey,
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

    const contentType = application.finalResumeFileType || "application/octet-stream";

    // Try to get signed URL for GCS, otherwise serve directly for local storage
    const signedUrl = await storage.getSignedUrl(application.finalResumeFilePath, {
      filename: application.finalResumeFileName || "final_resume",
    });

    if (signedUrl) {
      // GCS: redirect to signed URL
      return NextResponse.redirect(signedUrl);
    }

    // Local storage: serve file directly
    try {
      const fileBuffer = await storage.download(application.finalResumeFilePath);

      return new NextResponse(new Uint8Array(fileBuffer), {
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `inline; filename="${application.finalResumeFileName || "final_resume"}"`,
          "Content-Length": String(fileBuffer.length),
        },
      });
    } catch (fileError) {
      console.error("Failed to read file:", fileError);
      return NextResponse.json(
        { success: false, error: "File not found" },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("Failed to fetch final resume:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch final resume" },
      { status: 500 }
    );
  }
}

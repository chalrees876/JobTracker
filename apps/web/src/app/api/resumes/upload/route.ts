export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { storage } from "@/lib/storage";
import path from "path";
import { randomUUID } from "crypto";
import { parseResumePdf } from "@/lib/resume-parse";
import type { ResumeData } from "@shared/types";
import type { Prisma } from "@prisma/client";

// Max file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set(["application/pdf"]);
const ALLOWED_EXTENSIONS = new Set([".pdf"]);

// POST /api/resumes/upload - Upload a resume file
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get or create user profile
    let profile = await db.userProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!profile) {
      profile = await db.userProfile.create({
        data: { userId: session.user.id },
      });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const name = formData.get("name") as string | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    const ext = path.extname(file.name).toLowerCase();
    const hasValidExt = ALLOWED_EXTENSIONS.has(ext);
    const hasValidType = !file.type || ALLOWED_MIME_TYPES.has(file.type);
    if (!hasValidExt || !hasValidType) {
      return NextResponse.json(
        { success: false, error: "Invalid file type. Please upload a PDF file." },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: "File too large. Maximum size is 5MB." },
        { status: 400 }
      );
    }

    // Convert file to buffer (parse before upload to avoid orphaned files)
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const contentType = file.type || "application/pdf";

    let parsedContent: ResumeData | null = null;
    try {
      const parsed = await parseResumePdf(buffer);
      parsedContent = parsed.parsed;
    } catch (error) {
      const cause = error instanceof Error ? (error as Error & { cause?: unknown }).cause : undefined;
      console.error("Failed to parse resume during upload:", error, cause);
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

    // Generate unique filename and storage key
    const uniqueId = randomUUID();
    const fileName = `${uniqueId}${ext}`;
    const storageKey = `${session.user.id}/${fileName}`;

    // Upload file to storage (GCS or local)
    await storage.upload(storageKey, buffer, contentType);

    let baseResume;
    try {
      baseResume = await db.$transaction(async (tx) => {
        const hasDefault = await tx.baseResume.findFirst({
          where: { profileId: profile.id, isDefault: true },
          select: { id: true },
        });
        const isDefault = !hasDefault;

        const created = await tx.baseResume.create({
          data: {
            profileId: profile.id,
            name: name || file.name.replace(/\.[^/.]+$/, ""), // Use provided name or filename without extension
            fileName: file.name,
            fileType: contentType,
            fileSize: file.size,
            filePath: storageKey, // Storage key (works for both GCS and local)
            isDefault,
            content: (parsedContent ?? undefined) as Prisma.InputJsonValue | undefined,
          },
        });

        if (isDefault) {
          await tx.baseResume.updateMany({
            where: { profileId: profile.id, id: { not: created.id }, isDefault: true },
            data: { isDefault: false },
          });
        }

        return created;
      });
    } catch (error) {
      await storage.delete(storageKey).catch(() => undefined);
      throw error;
    }

    return NextResponse.json({
      success: true,
      data: {
        id: baseResume.id,
        name: baseResume.name,
        fileName: baseResume.fileName,
        fileType: baseResume.fileType,
        fileSize: baseResume.fileSize,
        isDefault: baseResume.isDefault,
        content: baseResume.content,
        createdAt: baseResume.createdAt,
      },
    });
  } catch (error) {
    console.error("Failed to upload resume:", error);
    return NextResponse.json(
      { success: false, error: "Failed to upload resume" },
      { status: 500 }
    );
  }
}

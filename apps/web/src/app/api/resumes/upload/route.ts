import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { writeFile, mkdir } from "fs/promises";
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
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json(
        { success: false, error: "Invalid file type. Please upload a PDF, DOC, or DOCX file." },
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

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), "uploads", session.user.id);
    await mkdir(uploadsDir, { recursive: true });

    // Generate unique filename
    const uniqueId = randomUUID();
    const fileName = `${uniqueId}${ext}`;
    const filePath = path.join(uploadsDir, fileName);

    // Write file to disk
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(filePath, buffer);

    // Check if this is the first resume (make it default)
    const existingResumes = await db.baseResume.count({
      where: { profileId: profile.id },
    });
    const isDefault = existingResumes === 0;

    // Create database record
    const baseResume = await db.baseResume.create({
      data: {
        profileId: profile.id,
        name: name || file.name.replace(/\.[^/.]+$/, ""), // Use provided name or filename without extension
        fileName: file.name,
        fileType: file.type || `application/${ext.slice(1)}`,
        fileSize: file.size,
        filePath: `${session.user.id}/${fileName}`, // Relative path for storage
        isDefault,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        id: baseResume.id,
        name: baseResume.name,
        fileName: baseResume.fileName,
        fileType: baseResume.fileType,
        fileSize: baseResume.fileSize,
        isDefault: baseResume.isDefault,
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

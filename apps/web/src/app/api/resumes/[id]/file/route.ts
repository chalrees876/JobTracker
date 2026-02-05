import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { readFile } from "fs/promises";
import path from "path";

// GET /api/resumes/[id]/file - Download/view a resume file
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

    // Get resume and verify ownership
    const resume = await db.baseResume.findFirst({
      where: { id },
      include: {
        profile: {
          select: { userId: true },
        },
      },
    });

    if (!resume) {
      return NextResponse.json(
        { success: false, error: "Resume not found" },
        { status: 404 }
      );
    }

    if (resume.profile.userId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 403 }
      );
    }

    if (!resume.filePath) {
      return NextResponse.json(
        { success: false, error: "No file associated with this resume" },
        { status: 404 }
      );
    }

    // Read file from disk
    const filePath = path.join(process.cwd(), "uploads", resume.filePath);

    try {
      const fileBuffer = await readFile(filePath);

      // Determine content type
      const contentType = resume.fileType || "application/octet-stream";

      // Return file with appropriate headers
      return new NextResponse(fileBuffer, {
        headers: {
          "Content-Type": contentType,
          "Content-Disposition": `inline; filename="${resume.fileName || "resume"}"`,
          "Content-Length": String(fileBuffer.length),
        },
      });
    } catch (fileError) {
      console.error("Failed to read file:", fileError);
      return NextResponse.json(
        { success: false, error: "File not found on disk" },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("Failed to fetch resume file:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch resume file" },
      { status: 500 }
    );
  }
}

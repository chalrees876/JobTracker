import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";

// GET /api/profile - Get user's profile
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    let profile = await db.userProfile.findUnique({
      where: { userId: session.user.id },
      include: {
        baseResumes: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    // Create profile if it doesn't exist
    if (!profile) {
      profile = await db.userProfile.create({
        data: {
          userId: session.user.id,
        },
        include: {
          baseResumes: true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        ...profile,
        user: {
          name: session.user.name,
          email: session.user.email,
          image: session.user.image,
        },
      },
    });
  } catch (error) {
    console.error("Failed to fetch profile:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

// PATCH /api/profile - Update profile
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { headline, targetRoles, targetLocations, onboardingComplete } = body;

    const profile = await db.userProfile.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        headline,
        targetRoles: targetRoles || [],
        targetLocations: targetLocations || [],
        onboardingComplete: onboardingComplete || false,
      },
      update: {
        ...(headline !== undefined && { headline }),
        ...(targetRoles !== undefined && { targetRoles }),
        ...(targetLocations !== undefined && { targetLocations }),
        ...(onboardingComplete !== undefined && { onboardingComplete }),
      },
      include: {
        baseResumes: true,
      },
    });

    return NextResponse.json({ success: true, data: profile });
  } catch (error) {
    console.error("Failed to update profile:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update profile" },
      { status: 500 }
    );
  }
}

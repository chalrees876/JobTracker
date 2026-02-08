import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { checkUsage } from "@/lib/usage";
import { rateLimit } from "@/lib/rate-limit";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const limited = rateLimit(session.user.id);
    if (limited) return limited;

    const usage = await checkUsage(session.user.id);

    // Also fetch subscription status for the frontend
    const subscription = await db.subscription.findUnique({
      where: { userId: session.user.id },
      select: { status: true, cancelAtPeriodEnd: true, currentPeriodEnd: true },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...usage,
        status: subscription?.status ?? "FREE",
        cancelAtPeriodEnd: subscription?.cancelAtPeriodEnd ?? false,
        currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
      },
    });
  } catch (error) {
    console.error("Failed to check usage:", error);
    return NextResponse.json(
      { success: false, error: "Failed to check usage" },
      { status: 500 }
    );
  }
}

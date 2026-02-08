import { db } from "@/lib/db";

interface UsageResult {
  allowed: boolean;
  used: number;
  limit: number;
  isPaid: boolean;
}

/**
 * Check whether a user can generate another ATS-tailored resume.
 *
 * - FREE users: 2 lifetime generations (count all ResumeVersion records ever)
 * - ACTIVE subscribers: `monthlyLimit` generations since `currentPeriodStart`
 * - PAST_DUE / CANCELED / UNPAID: treated as free (lifetime count, limit 2)
 *
 * Auto-creates a FREE Subscription record if none exists.
 */
export async function checkUsage(userId: string): Promise<UsageResult> {
  let subscription = await db.subscription.findUnique({
    where: { userId },
  });

  // Lazy-create a FREE subscription for new users
  if (!subscription) {
    subscription = await db.subscription.create({
      data: { userId, status: "FREE", monthlyLimit: 2 },
    });
  }

  const isPaid = subscription.status === "ACTIVE";
  const limit = subscription.monthlyLimit;

  let used: number;

  if (isPaid && subscription.currentPeriodStart) {
    // Paid: count generations within the current billing period
    used = await db.resumeVersion.count({
      where: {
        application: { userId },
        createdAt: { gte: subscription.currentPeriodStart },
      },
    });
  } else {
    // Free / canceled / past_due: count ALL generations (lifetime)
    used = await db.resumeVersion.count({
      where: {
        application: { userId },
      },
    });
  }

  return {
    allowed: used < limit,
    used,
    limit,
    isPaid,
  };
}

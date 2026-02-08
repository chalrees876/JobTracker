import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    logger.error("Webhook signature verification failed", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        if (!subscriptionId) break;

        // Fetch the full subscription to get period dates and price
        const sub = await stripe.subscriptions.retrieve(subscriptionId);

        // Stripe v20+ removed current_period_start/end; compute from start_date
        const periodStart = new Date(sub.start_date * 1000);
        const periodEnd = new Date(periodStart);
        periodEnd.setMonth(periodEnd.getMonth() + 1);

        await db.subscription.update({
          where: { stripeCustomerId: customerId },
          data: {
            stripeSubscriptionId: subscriptionId,
            stripePriceId: sub.items.data[0]?.price.id ?? null,
            status: "ACTIVE",
            monthlyLimit: 50,
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
          },
        });

        logger.info("Subscription activated", { customerId, subscriptionId });
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object;
        const customerId = sub.customer as string;

        const statusMap: Record<string, string> = {
          active: "ACTIVE",
          past_due: "PAST_DUE",
          canceled: "CANCELED",
          unpaid: "UNPAID",
        };

        const mappedStatus = statusMap[sub.status] || "ACTIVE";

        // Compute period from billing_cycle_anchor (Stripe v20+ removed current_period_*)
        const periodStart = new Date(sub.billing_cycle_anchor * 1000);
        // Walk forward to the most recent anchor that is <= now
        const now = new Date();
        while (periodStart < now) {
          const next = new Date(periodStart);
          next.setMonth(next.getMonth() + 1);
          if (next > now) break;
          periodStart.setMonth(periodStart.getMonth() + 1);
        }
        const periodEnd = new Date(periodStart);
        periodEnd.setMonth(periodEnd.getMonth() + 1);

        await db.subscription.update({
          where: { stripeCustomerId: customerId },
          data: {
            status: mappedStatus as any,
            currentPeriodStart: periodStart,
            currentPeriodEnd: periodEnd,
            cancelAtPeriodEnd: sub.cancel_at_period_end,
            monthlyLimit: mappedStatus === "ACTIVE" ? 50 : 2,
          },
        });

        logger.info("Subscription updated", {
          customerId,
          status: mappedStatus,
        });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const customerId = sub.customer as string;

        await db.subscription.update({
          where: { stripeCustomerId: customerId },
          data: {
            status: "CANCELED",
            stripeSubscriptionId: null,
            monthlyLimit: 2,
            cancelAtPeriodEnd: false,
          },
        });

        logger.info("Subscription canceled", { customerId });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const customerId = invoice.customer as string;

        if (customerId) {
          await db.subscription.update({
            where: { stripeCustomerId: customerId },
            data: { status: "PAST_DUE" },
          });

          logger.warn("Payment failed", { customerId });
        }
        break;
      }
    }
  } catch (err) {
    logger.error("Webhook handler error", {
      eventType: event.type,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { headers } from "next/headers";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";

async function upsertSubscription(params: {
  userId: string;
  stripeCustomerId: string;
  subscription: Stripe.Subscription;
}) {
  const { userId, stripeCustomerId, subscription } = params;
  const currentPeriodEnd = subscription.current_period_end
    ? new Date(subscription.current_period_end * 1000)
    : null;

  await db.subscription.upsert({
    where: { userId },
    update: {
      stripeCustomerId,
      stripeSubscriptionId: subscription.id,
      status: subscription.status,
      currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
    },
    create: {
      userId,
      stripeCustomerId,
      stripeSubscriptionId: subscription.id,
      status: subscription.status,
      currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end ?? false,
    },
  });
}

export async function POST(request: Request) {
  const signature = (await headers()).get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json(
      { success: false, error: "Missing Stripe signature" },
      { status: 400 }
    );
  }

  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (error) {
    console.error("Stripe webhook signature verification failed:", error);
    return NextResponse.json(
      { success: false, error: "Invalid signature" },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;
        if (!session.subscription || !session.customer) break;

        const stripeCustomerId = String(session.customer);
        const userId = session.metadata?.userId;
        const user = userId
          ? await db.user.findUnique({ where: { id: userId } })
          : await db.user.findFirst({ where: { stripeCustomerId } });

        if (!user) break;

        const subscription = await stripe.subscriptions.retrieve(
          String(session.subscription)
        );

        await db.user.update({
          where: { id: user.id },
          data: { stripeCustomerId },
        });

        await upsertSubscription({
          userId: user.id,
          stripeCustomerId,
          subscription,
        });
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const stripeCustomerId = String(subscription.customer);
        const user = await db.user.findFirst({
          where: { stripeCustomerId },
        });
        if (!user) break;
        await upsertSubscription({
          userId: user.id,
          stripeCustomerId,
          subscription,
        });
        break;
      }
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook handling failed:", error);
    return NextResponse.json(
      { success: false, error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

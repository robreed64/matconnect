import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import { getGymSettings } from "@/lib/gym-settings";
import Stripe from "stripe";

async function getStripe() {
  const settings = await getGymSettings();
  if (!settings.stripeSecretKey) return null;
  return new Stripe(settings.stripeSecretKey);
}

async function getOrCreateCoupon(stripe: Stripe, percent: number): Promise<string> {
  const couponId = `bjj-family-${percent}pct`;
  try {
    await stripe.coupons.retrieve(couponId);
    return couponId;
  } catch {
    await stripe.coupons.create({
      id: couponId,
      percent_off: percent,
      duration: "forever",
      name: `Family Discount ${percent}%`,
    });
    return couponId;
  }
}

type Params = Promise<{ memberId: string }>;

export async function POST(req: NextRequest, { params }: { params: Params }) {
  const { error } = await requireAuth("members");
  if (error) return error;

  const { memberId: rawId } = await params;
  const memberId = parseInt(rawId, 10);

  const settings = await getGymSettings();
  if (!settings.familyDiscountEnabled) {
    return NextResponse.json({ error: "Family discounts not enabled" }, { status: 400 });
  }

  const stripe = await getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const sub = await prisma.subscription.findFirst({
    where: { memberId, status: { in: ["active", "trial"] } },
    orderBy: { createdAt: "desc" },
  });

  if (!sub) {
    return NextResponse.json({ error: "No active subscription found" }, { status: 404 });
  }

  if (!sub.stripeSubscriptionId) {
    return NextResponse.json({ error: "Subscription has no Stripe ID" }, { status: 400 });
  }

  const couponId = await getOrCreateCoupon(stripe, settings.familyDiscountPercent);

  await stripe.subscriptions.update(sub.stripeSubscriptionId, {
    discounts: [{ coupon: couponId }],
  });

  await prisma.subscription.update({
    where: { id: sub.id },
    data: { familyDiscountApplied: true },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: Params }) {
  const { error } = await requireAuth("members");
  if (error) return error;

  const { memberId: rawId } = await params;
  const memberId = parseInt(rawId, 10);

  const stripe = await getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const sub = await prisma.subscription.findFirst({
    where: { memberId, status: { in: ["active", "trial"] }, familyDiscountApplied: true },
    orderBy: { createdAt: "desc" },
  });

  if (!sub) {
    return NextResponse.json({ error: "No discounted subscription found" }, { status: 404 });
  }

  if (sub.stripeSubscriptionId) {
    await stripe.subscriptions.update(sub.stripeSubscriptionId, {
      discounts: [],
    });
  }

  await prisma.subscription.update({
    where: { id: sub.id },
    data: { familyDiscountApplied: false },
  });

  return NextResponse.json({ ok: true });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPaymentProvider, type PaymentProvider } from "@/lib/payments/provider";
import type { PlanRefs } from "@/lib/payments/types";
import type { MembershipPlan } from "@prisma/client";
import { getGymSettings } from "@/lib/gym-settings";
import { CardDeclinedError } from "@/lib/payments/types";
import { SquareError } from "square";
import bcrypt from "bcryptjs";
import { sendEmail } from "@/lib/email";

function readableError(err: unknown): string {
  if (err instanceof CardDeclinedError) return `Card declined: ${err.message}`;
  if (err instanceof SquareError) {
    const first = err.errors?.[0];
    return first?.detail || first?.code || err.message;
  }
  if (err instanceof Error) return err.message;
  return "Unexpected error";
}

function isApiVersionIncompatible(err: unknown): boolean {
  return (
    err instanceof SquareError &&
    (err.errors ?? []).some(e => e.code === "API_VERSION_INCOMPATIBLE")
  );
}

// Plans created while the other provider was active have no refs on this one —
// create them lazily so enrollment doesn't dead-end after a provider switch.
async function ensurePlanRefs(provider: PaymentProvider, plan: MembershipPlan): Promise<PlanRefs | null> {
  if (provider.name === "stripe") {
    // Preserve original behavior: a plan with no Stripe price enrolls as trial
    return plan.stripePriceId ? { stripePriceId: plan.stripePriceId } : null;
  }
  if (plan.squarePlanVariationId) {
    return {
      squareCatalogPlanId: plan.squareCatalogPlanId,
      squarePlanVariationId: plan.squarePlanVariationId,
    };
  }
  const settings = await getGymSettings();
  const refs = await provider.createPlan({
    name: plan.name,
    description: plan.description,
    priceCents: plan.priceCents,
    billingInterval: plan.billingInterval,
    currency: settings.currency,
  });
  await prisma.membershipPlan.update({ where: { id: plan.id }, data: refs });
  return refs;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name, email, phone, dateOfBirth, ageGroup, trainingType,
      planId, paymentMethodId, promoCode,
    } = body;
    // `customerId` is the provider customer from the payment step;
    // `stripeCustomerId` is the legacy field name from older clients
    const customerIdInput: string | null = body.customerId ?? body.stripeCustomerId ?? null;

    if (!name?.trim() || !email?.trim() || !phone?.trim()) {
      return NextResponse.json({ error: "Name, email, and phone are required" }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return NextResponse.json({ error: "A valid email address is required" }, { status: 400 });
    }

    let resolvedCustomerId = customerIdInput;
    let subscriptionRef: string | null = null;
    // Default to trial; overridden to the provider's status after billing is confirmed.
    // Keeping this as 'trial' when provider is null prevents an unbilled member
    // from being marked active just because planId was supplied.
    let memberStatus = "trial";

    const provider = await getPaymentProvider();
    let savedCardId: string | null = null;

    if (planId && provider) {
      const plan = await prisma.membershipPlan.findUnique({ where: { id: parseInt(planId, 10) } });
      let planRefs = plan ? await ensurePlanRefs(provider, plan) : null;

      if (planRefs) {
        // Create customer if we somehow don't have one yet
        if (!resolvedCustomerId) {
          resolvedCustomerId = await provider.createCustomer({ name, email });
        }

        // Attach/store the card and make it the default
        if (paymentMethodId) {
          try {
            const saved = await provider.saveCard(resolvedCustomerId, paymentMethodId);
            savedCardId = saved.cardId;
          } catch (err) {
            if (err instanceof CardDeclinedError) {
              return NextResponse.json({ error: `Card declined: ${err.message}` }, { status: 402 });
            }
            throw err;
          }
        }

        const memberRefs = {
          stripeCustomerId: provider.name === "stripe" ? resolvedCustomerId : null,
          squareCustomerId: provider.name === "square" ? resolvedCustomerId : null,
          squareCardId: provider.name === "square" ? savedCardId : null,
        };

        let sub;
        try {
          sub = await provider.createSubscription({ member: memberRefs, planRefs, promoCode });
        } catch (err) {
          // Square API v2026-05-20 rejects subscriptions against plan variations
          // built with the old recurringPriceMoney field. Recreate the variation
          // using the new pricing format, save the new IDs, and retry once.
          if (isApiVersionIncompatible(err) && plan) {
            const settings = await getGymSettings();
            const freshRefs = await provider.createPlan({
              name: plan.name,
              description: plan.description,
              priceCents: plan.priceCents,
              billingInterval: plan.billingInterval,
              currency: settings.currency,
            });
            await prisma.membershipPlan.update({ where: { id: plan.id }, data: freshRefs });
            planRefs = freshRefs;
            sub = await provider.createSubscription({ member: memberRefs, planRefs: freshRefs, promoCode });
          } else {
            throw err;
          }
        }
        subscriptionRef = sub.subscriptionRef;
        memberStatus = sub.status;
      }
    }

    // Create the member record
    const member = await prisma.member.create({
      data: {
        name:            name.trim(),
        email:           email.trim(),
        phone:           phone.trim(),
        dateOfBirth:     dateOfBirth ? new Date(dateOfBirth) : null,
        ageGroup:        ageGroup  || "adult",
        trainingType:    trainingType || null,
        beltRank:        "white",
        status:          memberStatus,
        trialStartedAt:  memberStatus === "trial" ? new Date() : null,
        stripeCustomerId: provider?.name === "square" ? null : resolvedCustomerId,
        squareCustomerId: provider?.name === "square" ? resolvedCustomerId : null,
        squareCardId:     provider?.name === "square" ? savedCardId : null,
        waiverSignedAt:  new Date(),
      },
    });

    // Update the provider customer with the new member's DB id
    if (resolvedCustomerId && provider) {
      await provider.tagCustomerWithMember(resolvedCustomerId, member.id);
    }

    // Create subscription record
    if (planId) {
      await prisma.subscription.create({
        data: {
          memberId:             member.id,
          planId:               parseInt(planId, 10),
          stripeSubscriptionId: provider?.name === "square" ? null : subscriptionRef,
          squareSubscriptionId: provider?.name === "square" ? subscriptionRef : null,
          status:               memberStatus,
          startDate:            new Date(),
        },
      });
    }

    // Auto-create portal account if email provided and no account already exists
    if (member.email) {
      const existingUser = await prisma.user.findUnique({ where: { email: member.email } });
      if (!existingUser) {
        try {
          const tempPassword = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
          await prisma.user.create({
            data: {
              email:        member.email,
              name:         member.name,
              passwordHash: await bcrypt.hash(tempPassword, 10),
              role:         "member",
              memberId:     member.id,
              mustChangePassword: true, // emailed temp password is good for one login
            },
          });
          await sendEmail(
            member.email,
            "Welcome — your member portal login",
            `<p>Hi ${member.name},</p>
<p>Your account has been created. You can log in to the member portal at <strong>/login</strong>.</p>
<p><strong>Email:</strong> ${member.email}<br>
<strong>Temporary password:</strong> ${tempPassword}</p>
<p>Please change your password after logging in.</p>`
          ).catch(() => {});
        } catch {
          // Account creation failure should never block enrollment
        }
      }
    }

    return NextResponse.json({ success: true, memberId: member.id });
  } catch (err) {
    console.error("[enroll] POST error:", err);
    return NextResponse.json({ error: readableError(err) }, { status: 500 });
  }
}

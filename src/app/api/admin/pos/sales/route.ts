import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/require-auth";
import { getStripeClient } from "@/lib/stripe";
import { getGymSettings } from "@/lib/gym-settings";

export async function GET(req: Request) {
  const { error } = await requireAuth("pos");
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const page  = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const limit = 50;

  const [sales, total] = await Promise.all([
    prisma.sale.findMany({
      orderBy: { createdAt: "desc" },
      skip:  (page - 1) * limit,
      take:  limit,
      include: {
        member:    { select: { id: true, name: true } },
        lineItems: { include: { item: { select: { name: true, category: true } } } },
      },
    }),
    prisma.sale.count(),
  ]);

  return NextResponse.json({ sales, total, page, pages: Math.ceil(total / limit) });
}

export async function POST(req: Request) {
  const { error } = await requireAuth("pos");
  if (error) return error;

  const {
    memberId,
    paymentMethodType,
    lineItems,
    walkIn,
  }: {
    memberId:          number | null;
    paymentMethodType: string;
    lineItems:         { itemId: number; quantity: number }[];
    walkIn?:           { name: string; email?: string; phone?: string };
  } = await req.json();

  if (!lineItems?.length) {
    return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
  }

  // Server-side prices and tax — never trust client amounts
  const items = await prisma.item.findMany({
    where: { id: { in: lineItems.map((li) => li.itemId) } },
  });
  const itemById = new Map(items.map((i) => [i.id, i]));

  let totalCents = 0;
  let hasDayPass = false;
  const saleLines: { itemId: number; quantity: number; unitPriceCents: number }[] = [];
  for (const li of lineItems) {
    const item = itemById.get(li.itemId);
    if (!item || li.quantity < 1) {
      return NextResponse.json({ error: "Invalid item in cart" }, { status: 400 });
    }
    if (item.category === "day_pass") hasDayPass = true;
    const lineSubtotal = item.priceCents * li.quantity;
    totalCents += lineSubtotal + Math.round(lineSubtotal * Number(item.taxRate) / 100);
    saleLines.push({ itemId: item.id, quantity: li.quantity, unitPriceCents: item.priceCents });
  }

  // A day pass must be tied to a person (so they're checked in and enter the trial funnel)
  if (hasDayPass && !memberId && !walkIn?.name?.trim()) {
    return NextResponse.json({ error: "Day pass requires a member or a walk-in name" }, { status: 400 });
  }

  // Charge the saved card before recording anything; declined cards never produce a Sale
  let stripePaymentIntentId: string | null = null;
  if (paymentMethodType === "card_on_file") {
    if (!memberId) {
      return NextResponse.json({ error: "Select a member to charge their card on file" }, { status: 400 });
    }
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: { stripeCustomerId: true },
    });
    if (!member?.stripeCustomerId) {
      return NextResponse.json({ error: "Member has no card on file" }, { status: 400 });
    }

    const stripe = await getStripeClient();
    if (!stripe) {
      return NextResponse.json({ error: "Stripe is not configured" }, { status: 503 });
    }

    const customer = await stripe.customers.retrieve(member.stripeCustomerId, {
      expand: ["invoice_settings.default_payment_method"],
    });
    if ("deleted" in customer) {
      return NextResponse.json({ error: "Member has no card on file" }, { status: 400 });
    }
    const pm = customer.invoice_settings?.default_payment_method;
    if (!pm || typeof pm === "string") {
      return NextResponse.json(
        { error: "No default payment method — ask the member to add a card in the member portal" },
        { status: 400 }
      );
    }

    const settings = await getGymSettings();
    try {
      const intent = await stripe.paymentIntents.create({
        amount:         totalCents,
        currency:       settings.currency,
        customer:       customer.id,
        payment_method: pm.id,
        off_session:    true,
        confirm:        true,
        metadata:       { memberId: String(memberId), source: "pos" },
      });
      stripePaymentIntentId = intent.id;
    } catch (err) {
      if (err instanceof Stripe.errors.StripeCardError) {
        return NextResponse.json({ error: `Card declined: ${err.message}` }, { status: 402 });
      }
      console.error("POS Stripe charge failed:", err);
      return NextResponse.json({ error: "Payment failed — try another method" }, { status: 502 });
    }
  }

  try {
    let checkedIn = false;
    let waiverPending = false;

    const sale = await prisma.$transaction(async (tx) => {
      let saleMemberId = memberId ?? null;
      let hasWaiver = false;

      // Day-pass walk-in: create a trial member so they're trackable in the funnel
      if (hasDayPass && !saleMemberId && walkIn?.name?.trim()) {
        const created = await tx.member.create({
          data: {
            name:           walkIn.name.trim(),
            email:          walkIn.email?.trim() || null,
            phone:          walkIn.phone?.trim() || null,
            status:         "trial",
            trialStartedAt: new Date(),
          },
        });
        saleMemberId = created.id;
      } else if (hasDayPass && saleMemberId) {
        const buyer = await tx.member.findUnique({
          where: { id: saleMemberId },
          select: { waiverSignedAt: true },
        });
        hasWaiver = !!buyer?.waiverSignedAt;
      }

      const created = await tx.sale.create({
        data: {
          memberId: saleMemberId,
          totalCents,
          paymentMethodType,
          stripePaymentIntentId,
          lineItems: { create: saleLines },
        },
        include: {
          lineItems: { include: { item: true } },
          member:    { select: { id: true, name: true } },
        },
      });

      // Decrement stock for items that track it
      for (const li of saleLines) {
        await tx.item.updateMany({
          where: { id: li.itemId, stock: { not: null } },
          data:  { stock: { decrement: li.quantity } },
        });
      }

      // Day pass includes immediate check-in — but only with a waiver on file.
      // Unwaivered buyers (all walk-ins) sign at the kiosk, which completes the
      // check-in; /api/checkin is idempotent so this never double-counts.
      if (hasDayPass && saleMemberId) {
        if (hasWaiver) {
          await tx.attendance.create({
            data: { memberId: saleMemberId, classId: null, source: "staff" },
          });
          checkedIn = true;
        } else {
          waiverPending = true;
        }
      }

      return created;
    });

    return NextResponse.json({ ...sale, checkedIn, waiverPending }, { status: 201 });
  } catch (err) {
    // Card was already charged; surface the PI id so the sale can be reconciled in Stripe
    console.error(`POS sale record failed (paymentIntent: ${stripePaymentIntentId ?? "none"}):`, err);
    return NextResponse.json(
      { error: "Sale could not be recorded — check Stripe dashboard before retrying" },
      { status: 500 }
    );
  }
}

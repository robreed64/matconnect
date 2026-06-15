import { prisma } from "./prisma";

// Shared by the synchronous POS sale route and the async Square Terminal flow,
// which prices the cart up front and records the sale when the device reports
// the payment completed.

export type SaleLine = { itemId: number; quantity: number; unitPriceCents: number };

export type PricedCart = {
  totalCents: number;
  hasDayPass: boolean;
  saleLines: SaleLine[];
};

export type WalkIn = { name: string; email?: string; phone?: string };

// Server-side prices and tax — never trust client amounts
export async function priceCart(
  lineItems: { itemId: number; quantity: number }[]
): Promise<PricedCart | { error: string }> {
  const items = await prisma.item.findMany({
    where: { id: { in: lineItems.map((li) => li.itemId) } },
  });
  const itemById = new Map(items.map((i) => [i.id, i]));

  let totalCents = 0;
  let hasDayPass = false;
  const saleLines: SaleLine[] = [];
  for (const li of lineItems) {
    const item = itemById.get(li.itemId);
    if (!item || li.quantity < 1) {
      return { error: "Invalid item in cart" };
    }
    if (item.category === "day_pass") hasDayPass = true;
    const lineSubtotal = item.priceCents * li.quantity;
    totalCents += lineSubtotal + Math.round(lineSubtotal * Number(item.taxRate) / 100);
    saleLines.push({ itemId: item.id, quantity: li.quantity, unitPriceCents: item.priceCents });
  }

  return { totalCents, hasDayPass, saleLines };
}

export type RecordSaleResult = {
  sale: { id: number; totalCents: number } & Record<string, unknown>;
  checkedIn: boolean;
  waiverPending: boolean;
};

export async function recordSale(p: {
  memberId: number | null;
  walkIn?: WalkIn | null;
  paymentMethodType: string;
  totalCents: number;
  saleLines: SaleLine[];
  hasDayPass: boolean;
  stripePaymentIntentId?: string | null;
  squarePaymentId?: string | null;
}): Promise<RecordSaleResult> {
  let checkedIn = false;
  let waiverPending = false;

  const sale = await prisma.$transaction(async (tx) => {
    let saleMemberId = p.memberId ?? null;
    let hasWaiver = false;

    // Day-pass walk-in: create a trial member so they're trackable in the funnel
    if (p.hasDayPass && !saleMemberId && p.walkIn?.name?.trim()) {
      const created = await tx.member.create({
        data: {
          name:           p.walkIn.name.trim(),
          email:          p.walkIn.email?.trim() || null,
          phone:          p.walkIn.phone?.trim() || null,
          status:         "trial",
          trialStartedAt: new Date(),
        },
      });
      saleMemberId = created.id;
    } else if (p.hasDayPass && saleMemberId) {
      const buyer = await tx.member.findUnique({
        where: { id: saleMemberId },
        select: { waiverSignedAt: true },
      });
      hasWaiver = !!buyer?.waiverSignedAt;
    }

    const created = await tx.sale.create({
      data: {
        memberId: saleMemberId,
        totalCents: p.totalCents,
        paymentMethodType: p.paymentMethodType,
        stripePaymentIntentId: p.stripePaymentIntentId ?? null,
        squarePaymentId: p.squarePaymentId ?? null,
        lineItems: { create: p.saleLines },
      },
      include: {
        lineItems: { include: { item: true } },
        member:    { select: { id: true, name: true } },
      },
    });

    // Decrement stock for items that track it
    for (const li of p.saleLines) {
      await tx.item.updateMany({
        where: { id: li.itemId, stock: { not: null } },
        data:  { stock: { decrement: li.quantity } },
      });
    }

    // Day pass includes immediate check-in — but only with a waiver on file.
    // Unwaivered buyers (all walk-ins) sign at the kiosk, which completes the
    // check-in; /api/checkin is idempotent so this never double-counts.
    if (p.hasDayPass && saleMemberId) {
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

  return { sale, checkedIn, waiverPending };
}

// ── Square Terminal finalization ──────────────────────────────────────────────
// Called by both the POS polling endpoint and the terminal.checkout.updated
// webhook; the status-guarded claim makes it safe to call from both.

export async function finalizeTerminalCheckout(
  squareCheckoutId: string,
  squarePaymentId: string | null
): Promise<RecordSaleResult | null> {
  const claimed = await prisma.terminalCheckout.updateMany({
    where: { squareCheckoutId, status: "pending" },
    data: { status: "completed" },
  });
  if (claimed.count === 0) return null; // already finalized (or canceled)

  const row = await prisma.terminalCheckout.findUnique({ where: { squareCheckoutId } });
  if (!row) return null;

  const saleLines = row.lineItems as SaleLine[];
  const dayPassItems = await prisma.item.findMany({
    where: { id: { in: saleLines.map((l) => l.itemId) }, category: "day_pass" },
    select: { id: true },
  });

  let result: RecordSaleResult;
  try {
    result = await recordSale({
      memberId: row.memberId,
      walkIn: row.walkIn as WalkIn | null,
      paymentMethodType: "square_terminal",
      totalCents: row.totalCents,
      saleLines,
      hasDayPass: dayPassItems.length > 0,
      squarePaymentId,
    });
  } catch (err) {
    // The claim already flipped status to 'completed'; revert to 'failed' so
    // the POS client sees a terminal state and isn't left spinning forever.
    await prisma.terminalCheckout.update({
      where: { id: row.id },
      data: { status: "failed" },
    }).catch(() => {});
    throw err;
  }

  await prisma.terminalCheckout.update({
    where: { id: row.id },
    data: { saleId: result.sale.id },
  });

  return result;
}

export async function markTerminalCheckoutEnded(
  squareCheckoutId: string,
  status: "canceled" | "failed"
): Promise<void> {
  await prisma.terminalCheckout.updateMany({
    where: { squareCheckoutId, status: "pending" },
    data: { status },
  });
}

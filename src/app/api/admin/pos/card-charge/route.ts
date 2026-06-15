import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/require-auth";
import { getGymSettings } from "@/lib/gym-settings";
import { getSquareContext } from "@/lib/payments/square-client";
import { priceCart, recordSale, type WalkIn } from "@/lib/pos-sale";
import { SquareError } from "square";

// POS manual card entry: tokenized in the browser via the Square Web Payments
// SDK, charged here. No customer or stored card required.
export async function POST(req: Request) {
  const { error } = await requireAuth("pos");
  if (error) return error;

  const {
    nonce,
    memberId,
    lineItems,
    walkIn,
  }: {
    nonce: string;
    memberId: number | null;
    lineItems: { itemId: number; quantity: number }[];
    walkIn?: WalkIn;
  } = await req.json();

  if (!nonce) return NextResponse.json({ error: "Card nonce is required" }, { status: 400 });
  if (!lineItems?.length) return NextResponse.json({ error: "Cart is empty" }, { status: 400 });

  const cart = await priceCart(lineItems);
  if ("error" in cart) return NextResponse.json({ error: cart.error }, { status: 400 });

  if (cart.hasDayPass && !memberId && !walkIn?.name?.trim()) {
    return NextResponse.json({ error: "Day pass requires a member or a walk-in name" }, { status: 400 });
  }

  const ctx = await getSquareContext();
  if (!ctx) return NextResponse.json({ error: "Square is not configured" }, { status: 503 });

  const settings = await getGymSettings();
  const currency = (settings.currency || "USD").toUpperCase();

  let squarePaymentId: string;
  try {
    const res = await ctx.client.payments.create({
      idempotencyKey: crypto.randomUUID(),
      sourceId: nonce,
      amountMoney: { amount: BigInt(cart.totalCents), currency: currency as "USD" },
      locationId: ctx.config.locationId,
      autocomplete: true,
      referenceId: memberId ? String(memberId) : undefined,
      note: "POS sale",
    });
    const id = res.payment?.id;
    if (!id) throw new Error("Square payment returned no id");
    squarePaymentId = id;
  } catch (err) {
    if (
      err instanceof SquareError &&
      err.errors.some((e) => e.category === "PAYMENT_METHOD_ERROR")
    ) {
      const detail = err.errors[0]?.detail || err.errors[0]?.code || err.message;
      return NextResponse.json({ error: `Card declined: ${detail}` }, { status: 402 });
    }
    console.error("POS card charge failed:", err);
    return NextResponse.json({ error: "Payment failed — please try again" }, { status: 502 });
  }

  const result = await recordSale({
    memberId: memberId ?? null,
    walkIn,
    paymentMethodType: "square_card",
    totalCents: cart.totalCents,
    saleLines: cart.saleLines,
    hasDayPass: cart.hasDayPass,
    squarePaymentId,
  });

  return NextResponse.json({
    id: result.sale.id,
    totalCents: result.sale.totalCents,
    checkedIn: result.checkedIn,
    waiverPending: result.waiverPending,
  });
}

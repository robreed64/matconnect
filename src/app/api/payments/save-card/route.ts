import { NextRequest, NextResponse } from "next/server";
import { getPaymentProvider } from "@/lib/payments/provider";
import { CardDeclinedError } from "@/lib/payments/types";
import crypto from "crypto";

// Stores a tokenized card on a provider customer. Used by the Square enroll
// flow (Web Payments SDK nonce → stored card); Stripe saves cards client-side
// via confirmSetup so it never calls this.
export async function POST(req: NextRequest) {
  const provider = await getPaymentProvider();
  if (!provider) return NextResponse.json({ error: "Payments not configured" }, { status: 503 });

  const { customerId, token, customerToken } = await req.json();
  if (!customerId || !token) {
    return NextResponse.json({ error: "customerId and token are required" }, { status: 400 });
  }

  // Verify the customerId was issued by /api/payments/setup (prevents an
  // unauthenticated caller from attaching a card to an arbitrary customer id).
  if (!customerToken || !verifyCustomerToken(customerId, customerToken)) {
    return NextResponse.json({ error: "Invalid token" }, { status: 403 });
  }

  try {
    const saved = await provider.saveCard(customerId, token);
    return NextResponse.json(saved);
  } catch (err) {
    if (err instanceof CardDeclinedError) {
      return NextResponse.json({ error: `Card declined: ${err.message}` }, { status: 402 });
    }
    console.error("save-card failed:", err);
    return NextResponse.json({ error: "Failed to save card" }, { status: 502 });
  }
}

function verifyCustomerToken(customerId: string, token: string): boolean {
  try {
    const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
    if (!secret) return false;
    const expected = crypto
      .createHmac("sha256", secret)
      .update(customerId)
      .digest();
    const provided = Buffer.from(token, "hex");
    if (provided.length !== expected.length) return false;
    return crypto.timingSafeEqual(expected, provided);
  } catch {
    return false;
  }
}

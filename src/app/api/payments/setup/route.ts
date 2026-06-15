import { NextRequest, NextResponse } from "next/server";
import { getPaymentProvider } from "@/lib/payments/provider";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

// Starts card collection for the enroll flow (public, like /enroll itself).
// Stripe: creates the customer + a SetupIntent for Elements.
// Square: creates the customer; tokenization happens client-side.
export async function POST(req: NextRequest) {
  const provider = await getPaymentProvider();
  if (!provider) return NextResponse.json({ error: "Payments not configured" }, { status: 503 });

  const { name, email, memberId } = await req.json();

  let customerId: string | null = null;

  if (memberId) {
    const member = await prisma.member.findUnique({ where: { id: memberId } });
    customerId =
      (provider.name === "square" ? member?.squareCustomerId : member?.stripeCustomerId) ?? null;
  }

  if (!customerId) {
    customerId = await provider.createCustomer({ name, email });
  }

  const session = await provider.beginCardSetup(customerId);

  // Square: bind the customer to a signed token so /api/payments/save-card can
  // verify the request came from a legitimate setup call (prevents an
  // unauthenticated caller from attaching a card to an arbitrary customer id).
  if (provider.name === "square") {
    const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
    if (!secret) {
      console.error("[payments/setup] Neither AUTH_SECRET nor NEXTAUTH_SECRET is set");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }
    const customerToken = crypto
      .createHmac("sha256", secret)
      .update(customerId)
      .digest("hex");
    return NextResponse.json({ ...session, customerToken });
  }

  return NextResponse.json(session);
}

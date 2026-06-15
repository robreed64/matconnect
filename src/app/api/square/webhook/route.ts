import { NextRequest, NextResponse } from "next/server";
import { WebhooksHelper } from "square";
import { prisma } from "@/lib/prisma";
import { getSquareConfig } from "@/lib/payments/square-client";
import { mapSquareSubscriptionStatus } from "@/lib/payments/square-provider";
import { finalizeTerminalCheckout, markTerminalCheckoutEnded } from "@/lib/pos-sale";

// Square signs the exact notification URL registered in the developer
// dashboard, so behind a proxy the reconstructed URL must byte-match it —
// SQUARE_WEBHOOK_URL overrides when they differ.
function notificationUrl(req: NextRequest): string {
  if (process.env.SQUARE_WEBHOOK_URL) return process.env.SQUARE_WEBHOOK_URL;
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("host") ?? "";
  return `${proto}://${host}/api/square/webhook`;
}

// Webhook bodies are raw Square JSON (snake_case), not SDK objects
type SquareEvent = {
  type: string;
  data?: {
    object?: {
      subscription?: { id?: string; status?: string; customer_id?: string };
      invoice?: { primary_recipient?: { customer_id?: string }; subscription_id?: string };
      checkout?: { id?: string; status?: string; payment_ids?: string[] };
    };
  };
};

export async function POST(req: NextRequest) {
  const config = await getSquareConfig();
  if (!config) return NextResponse.json({ error: "Square not configured" }, { status: 503 });
  if (!config.webhookSignatureKey) {
    return NextResponse.json({ error: "Webhook signature key not configured" }, { status: 503 });
  }

  const body = await req.text();
  const signature = req.headers.get("x-square-hmacsha256-signature") ?? "";

  const valid = await WebhooksHelper.verifySignature({
    requestBody: body,
    signatureHeader: signature,
    signatureKey: config.webhookSignatureKey,
    notificationUrl: notificationUrl(req),
  });
  if (!valid) return NextResponse.json({ error: "Invalid signature" }, { status: 400 });

  let event: SquareEvent;
  try {
    event = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Status-sync semantics mirror /api/stripe/webhook exactly: Subscription
  // status + canceledAt transition stamp + Member.status mirror (marketing
  // triggers and MRR reports key off these).
  switch (event.type) {
    case "subscription.created":
    case "subscription.updated": {
      const sub = event.data?.object?.subscription;
      if (!sub?.id) break;
      const newStatus = mapSquareSubscriptionStatus(sub.status);
      if (newStatus === "canceled") {
        // Stamp canceledAt only on the transition into canceled (feeds churn reporting)
        await prisma.subscription.updateMany({
          where: { squareSubscriptionId: sub.id, status: { not: "canceled" } },
          data: { canceledAt: new Date() },
        });
      }
      const updated = await prisma.subscription.updateMany({
        where: { squareSubscriptionId: sub.id },
        data: { status: newStatus, updatedAt: new Date() },
      });
      if (updated.count > 0) {
        const dbSub = await prisma.subscription.findFirst({ where: { squareSubscriptionId: sub.id } });
        if (dbSub) {
          await prisma.member.update({
            where: { id: dbSub.memberId },
            data: { status: newStatus, updatedAt: new Date() },
          });
        }
      } else if (sub.customer_id) {
        // Subscription row not yet committed (webhook raced enrollment) — update
        // member directly via customerId so status isn't silently dropped.
        await prisma.member.updateMany({
          where: { squareCustomerId: sub.customer_id },
          data: { status: newStatus, updatedAt: new Date() },
        });
      }
      break;
    }

    case "invoice.scheduled_charge_failed":
    case "invoice.payment_failed": {
      const customerId = event.data?.object?.invoice?.primary_recipient?.customer_id;
      if (customerId) {
        await prisma.member.updateMany({
          where: { squareCustomerId: customerId },
          data: { status: "past_due", updatedAt: new Date() },
        });
        await prisma.subscription.updateMany({
          where: { member: { squareCustomerId: customerId }, status: "active" },
          data: { status: "past_due", updatedAt: new Date() },
        });
      }
      break;
    }

    case "invoice.payment_made": {
      const customerId = event.data?.object?.invoice?.primary_recipient?.customer_id;
      if (customerId) {
        await prisma.member.updateMany({
          where: { squareCustomerId: customerId, status: "past_due" },
          data: { status: "active", updatedAt: new Date() },
        });
        await prisma.subscription.updateMany({
          where: { member: { squareCustomerId: customerId }, status: "past_due" },
          data: { status: "active", updatedAt: new Date() },
        });
      }
      break;
    }

    // Records the sale even if the cashier closed the POS tab mid-payment;
    // the polling endpoint uses the same status-guarded finalize.
    case "terminal.checkout.updated": {
      const checkout = event.data?.object?.checkout;
      if (!checkout?.id) break;
      if (checkout.status === "COMPLETED") {
        try {
          await finalizeTerminalCheckout(checkout.id, checkout.payment_ids?.[0] ?? null);
        } catch (err) {
          console.error("Terminal checkout finalization failed in webhook:", err);
        }
      } else if (checkout.status === "CANCELED") {
        await markTerminalCheckoutEnded(checkout.id, "canceled");
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}

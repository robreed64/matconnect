import { requireAuth } from "@/lib/require-auth";
import { getSquareContext } from "@/lib/payments/square-client";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST() {
  const { error } = await requireAuth("settings");
  if (error) return error;

  const context = await getSquareContext();
  if (!context) {
    return NextResponse.json(
      { error: "Square is not configured" },
      { status: 400 }
    );
  }

  const { client, config } = context;

  try {
    let created = 0;
    let skipped = 0;

    // Fetch payments from last 12 months
    const beginTime = new Date();
    beginTime.setFullYear(beginTime.getFullYear() - 1);

    let cursor: string | undefined;
    try {
      do {
        const res = (await client.payments.list({
          locationId: config.locationId,
          beginTime: beginTime.toISOString(),
          cursor,
        })) as unknown as Record<string, unknown>;
        const payments = (res.payments as Array<Record<string, unknown>>) ?? [];

      for (const payment of payments) {
        const paymentId = payment.id as string | undefined;
        const amountMoney = payment.amountMoney as Record<string, unknown>;

        if (!paymentId || !amountMoney?.amount) {
          skipped++;
          continue;
        }

        // Check if already imported
        const existing = await prisma.sale.findFirst({
          where: { squarePaymentId: paymentId },
        });

        if (existing) {
          skipped++;
          continue;
        }

        // Find member by customerId (may be null for walk-ins)
        let memberId: number | null = null;
        const customerId = payment.customerId as string | undefined;
        if (customerId) {
          const member = await prisma.member.findFirst({
            where: { squareCustomerId: customerId },
          });
          memberId = member?.id ?? null;
        }

        // Create sale record
        await prisma.sale.create({
          data: {
            memberId,
            squarePaymentId: paymentId,
            totalCents: Number(amountMoney.amount),
            paymentMethodType: "card_on_file",
            createdAt: (payment.createdAt as string | undefined)
              ? new Date(payment.createdAt as string)
              : new Date(),
          },
        });

        created++;
      }

        cursor = res.cursor as string | undefined;
      } while (cursor);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      if (message.includes("sort_field") || message.includes("INVALID_ENUM")) {
        // Square SDK issue - return what we got so far
        if (created === 0 && skipped === 0) {
          return NextResponse.json(
            { error: "Unable to fetch payments from Square API", created: 0, skipped: 0 },
            { status: 200 }
          );
        }
      } else {
        throw err;
      }
    }

    return NextResponse.json({ created, skipped });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to import payments: ${message}` },
      { status: 500 }
    );
  }
}

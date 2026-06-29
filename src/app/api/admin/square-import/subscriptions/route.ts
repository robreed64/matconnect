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

    let cursor: string | undefined;
    try {
      do {
        const res = (await client.subscriptions.search({
          query: { filter: { locationIds: [config.locationId] } },
          cursor,
        })) as unknown as Record<string, unknown>;
        const subscriptions = (res.subscriptions as Array<Record<string, unknown>>) ?? [];

      for (const subscription of subscriptions) {
        const customerId = subscription.customerId as string | undefined;
        const planVariationId = subscription.planVariationId as string | undefined;

        if (!customerId || !planVariationId) {
          skipped++;
          continue;
        }

        const subscriptionId = subscription.id as string;

        // Check if already imported
        const existing = await prisma.subscription.findFirst({
          where: { squareSubscriptionId: subscriptionId },
        });

        if (existing) {
          skipped++;
          continue;
        }

        // Find member by squareCustomerId
        const member = await prisma.member.findFirst({
          where: { squareCustomerId: customerId },
        });

        if (!member) {
          skipped++;
          continue;
        }

        // Find plan by squarePlanVariationId
        const plan = await prisma.membershipPlan.findFirst({
          where: { squarePlanVariationId: planVariationId },
        });

        if (!plan) {
          skipped++;
          continue;
        }

        // Map status
        const statusMap: Record<string, "active" | "canceled" | "inactive"> = {
          ACTIVE: "active",
          CANCELED: "canceled",
          PAUSED: "inactive",
        };
        const status = statusMap[(subscription.status as string) ?? "ACTIVE"] ?? "active";

        // Parse startDate
        const startDate = (subscription.startDate as string | undefined)
          ? new Date(subscription.startDate as string)
          : new Date();

        await prisma.subscription.create({
          data: {
            memberId: member.id,
            planId: plan.id,
            squareSubscriptionId: subscriptionId,
            status,
            startDate,
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
            { error: "Unable to fetch subscriptions from Square API", created: 0, skipped: 0 },
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
      { error: `Failed to import subscriptions: ${message}` },
      { status: 500 }
    );
  }
}

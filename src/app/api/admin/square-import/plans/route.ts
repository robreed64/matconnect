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

  const { client } = context;

  try {
    let created = 0;
    let skipped = 0;

    let cursor: string | undefined;
    do {
      const res = (await client.catalog.list({
        cursor,
        types: "SUBSCRIPTION_PLAN",
      })) as unknown as Record<string, unknown>;
      const objects = (res.objects as Array<Record<string, unknown>>) ?? [];

      for (const obj of objects) {
        if (obj.type !== "SUBSCRIPTION_PLAN") {
          continue;
        }

        const planData = obj.subscriptionPlanData as Record<string, unknown>;
        const variations = (planData?.variations as Array<Record<string, unknown>>) ?? [];

        for (const variation of variations) {
          // Check if already imported
          const existing = await prisma.membershipPlan.findFirst({
            where: { squareCatalogPlanId: obj.id as string },
          });

          if (existing) {
            skipped++;
            continue;
          }

          const pricingCycles = (planData?.pricingCycles as Array<Record<string, unknown>>) ?? [];
          const priceMoney = pricingCycles[0]?.priceMoney as Record<string, unknown>;
          const priceCents = priceMoney?.amount ? Number(priceMoney.amount) : 0;

          await prisma.membershipPlan.create({
            data: {
              name: (planData?.name as string) || "Imported Plan",
              priceCents,
              billingInterval: "monthly",
              planType: "recurring",
              squareCatalogPlanId: obj.id as string,
              squarePlanVariationId: variation.id as string,
            },
          });

          created++;
        }
      }

      cursor = res.cursor as string | undefined;
    } while (cursor);

    return NextResponse.json({ created, skipped });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to import plans: ${message}` },
      { status: 500 }
    );
  }
}

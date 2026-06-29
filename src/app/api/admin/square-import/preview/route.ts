import { requireAuth } from "@/lib/require-auth";
import { getSquareContext } from "@/lib/payments/square-client";
import { NextResponse } from "next/server";

export async function GET() {
  const { error } = await requireAuth("settings");
  if (error) return error;

  const context = await getSquareContext();
  if (!context) {
    return NextResponse.json(
      { error: "Square is not configured. Add access token and location ID in settings." },
      { status: 400 }
    );
  }

  const { client, config } = context;

  try {
    // Fetch plan count
    let planCount = 0;
    let cursor: string | undefined;
    do {
      const res = (await client.catalog.list({
        cursor,
        types: "SUBSCRIPTION_PLAN",
      })) as unknown as Record<string, unknown>;
      const objects = (res.objects as Array<unknown>) ?? [];
      planCount += objects.length;
      cursor = res.cursor as string | undefined;
    } while (cursor);

    // Fetch customer count
    let customerCount = 0;
    cursor = undefined;
    do {
      const res = (await client.customers.list({ cursor })) as unknown as Record<string, unknown>;
      const customers = (res.customers as Array<unknown>) ?? [];
      customerCount += customers.length;
      cursor = res.cursor as string | undefined;
    } while (cursor);

    // Fetch subscription count
    let subscriptionCount = 0;
    cursor = undefined;
    do {
      const res = (await client.subscriptions.search({
        query: { filter: { locationIds: [config.locationId] } },
        cursor,
      })) as unknown as Record<string, unknown>;
      const subscriptions = (res.subscriptions as Array<unknown>) ?? [];
      subscriptionCount += subscriptions.length;
      cursor = res.cursor as string | undefined;
    } while (cursor);

    // Fetch payment count (last 12 months)
    const beginTime = new Date();
    beginTime.setFullYear(beginTime.getFullYear() - 1);
    let paymentCount = 0;
    cursor = undefined;
    do {
      const res = (await client.payments.list({
        locationId: config.locationId,
        beginTime: beginTime.toISOString(),
        cursor,
      })) as unknown as Record<string, unknown>;
      const payments = (res.payments as Array<unknown>) ?? [];
      paymentCount += payments.length;
      cursor = res.cursor as string | undefined;
    } while (cursor);

    return NextResponse.json({
      plans: planCount,
      customers: customerCount,
      subscriptions: subscriptionCount,
      payments: paymentCount,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to fetch Square data: ${message}` },
      { status: 500 }
    );
  }
}

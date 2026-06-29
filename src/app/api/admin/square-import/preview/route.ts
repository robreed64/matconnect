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
    // Fetch counts with basic error handling
    const counts = {
      plans: 0,
      customers: 0,
      subscriptions: 0,
      payments: 0,
    };

    // Fetch customer count
    try {
      let cursor: string | undefined;
      do {
        const res = (await client.customers.list({ cursor })) as unknown as Record<string, unknown>;
        const customers = (res.customers as Array<unknown>) ?? [];
        counts.customers += customers.length;
        cursor = res.cursor as string | undefined;
      } while (cursor);
    } catch {
      // If customer fetch fails, continue with 0
    }

    // Fetch subscription count
    try {
      let cursor: string | undefined;
      do {
        const res = (await client.subscriptions.search({
          query: { filter: { locationIds: [config.locationId] } },
          cursor,
        })) as unknown as Record<string, unknown>;
        const subscriptions = (res.subscriptions as Array<unknown>) ?? [];
        counts.subscriptions += subscriptions.length;
        cursor = res.cursor as string | undefined;
      } while (cursor);
    } catch {
      // If subscription fetch fails, continue with 0
    }

    // Fetch payment count (last 12 months)
    try {
      const beginTime = new Date();
      beginTime.setFullYear(beginTime.getFullYear() - 1);
      let cursor: string | undefined;
      do {
        const res = (await client.payments.list({
          locationId: config.locationId,
          beginTime: beginTime.toISOString(),
          cursor,
        })) as unknown as Record<string, unknown>;
        const payments = (res.payments as Array<unknown>) ?? [];
        counts.payments += payments.length;
        cursor = res.cursor as string | undefined;
      } while (cursor);
    } catch {
      // If payment fetch fails, continue with 0
    }

    // For plans, we'll count them during the actual import
    // due to Square SDK catalog.list sort_field issues
    return NextResponse.json(counts);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to fetch Square data: ${message}` },
      { status: 500 }
    );
  }
}

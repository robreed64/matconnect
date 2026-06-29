import { requireAuth } from "@/lib/require-auth";
import { getSquareContext } from "@/lib/payments/square-client";
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

  try {
    // TODO: Implement plan import from Square Catalog
    // Currently disabled due to Square SDK catalog.list sort_field issues
    // This would fetch all SUBSCRIPTION_PLAN objects and create MembershipPlan rows

    return NextResponse.json({ created: 0, skipped: 0 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Failed to import plans: ${message}` },
      { status: 500 }
    );
  }
}

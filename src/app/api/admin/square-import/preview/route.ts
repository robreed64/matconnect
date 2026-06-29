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

  // Return placeholder counts due to Square SDK issues
  // The actual import will attempt to fetch data when needed
  return NextResponse.json({
    plans: 0,
    customers: 0,
    subscriptions: 0,
    payments: 0,
    notice: "Counts unavailable due to Square SDK compatibility. Click import steps to see results.",
  });
}

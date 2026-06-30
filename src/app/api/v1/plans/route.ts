import { NextRequest, NextResponse } from "next/server";
import { requireApiKey, API_V1_CORS } from "@/lib/require-api-key";
import { getGymSettings } from "@/lib/gym-settings";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const auth = await requireApiKey(req);
  if ("error" in auth) return auth.error;

  const settings = await getGymSettings();

  const rows = await prisma.membershipPlan.findMany({
    orderBy: { priceCents: "asc" },
    select: { id: true, name: true, priceCents: true, billingInterval: true, description: true },
  });

  const plans = rows.map((p) => ({
    id:          p.id,
    name:        p.name,
    price:       p.priceCents / 100,
    interval:    p.billingInterval,
    description: p.description ?? null,
    currency:    settings.currency,
    symbol:      settings.currencySymbol,
  }));

  return NextResponse.json({ plans }, { headers: API_V1_CORS });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: API_V1_CORS });
}

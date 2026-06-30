import { NextRequest, NextResponse } from "next/server";
import { requireApiKey, API_V1_CORS } from "@/lib/require-api-key";
import { getGymSettings } from "@/lib/gym-settings";
import { resolveSiteConfig } from "@/lib/site-config";

export async function GET(req: NextRequest) {
  const auth = await requireApiKey(req);
  if ("error" in auth) return auth.error;

  const settings = await getGymSettings();
  const config = resolveSiteConfig(settings.siteConfig as Record<string, unknown>, settings.gymName);

  return NextResponse.json({ faq: config.faq }, { headers: API_V1_CORS });
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: API_V1_CORS });
}

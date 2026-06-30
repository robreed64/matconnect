import { NextRequest, NextResponse } from "next/server";
import { requireApiKey, API_V1_CORS } from "@/lib/require-api-key";
import { getGymSettings } from "@/lib/gym-settings";

export async function GET(req: NextRequest) {
  const auth = await requireApiKey(req);
  if ("error" in auth) return auth.error;

  const s = await getGymSettings();

  return NextResponse.json(
    {
      gymName:        s.gymName,
      logoUrl:        s.logoUrl        ?? null,
      gymPhone:       s.gymPhone       ?? null,
      gymAddress:     s.gymAddress     ?? null,
      gymEmail:       s.gymEmail       ?? null,
      instructorNames: s.instructorNames as string[],
      programTypes:   s.programTypes   as string[],
    },
    { headers: API_V1_CORS }
  );
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: API_V1_CORS });
}

import { NextRequest, NextResponse } from "next/server";
import { verifyKey } from "./api-keys";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
};

export { CORS as API_V1_CORS };

export async function requireApiKey(
  req: NextRequest
): Promise<{ error: NextResponse } | { keyId: string }> {
  const auth = req.headers.get("Authorization") ?? "";
  const rawKey = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";

  if (!rawKey) {
    return {
      error: NextResponse.json(
        { error: "Missing Authorization header" },
        { status: 401, headers: CORS }
      ),
    };
  }

  const verified = await verifyKey(rawKey);
  if (!verified) {
    return {
      error: NextResponse.json(
        { error: "Invalid or disabled API key" },
        { status: 401, headers: CORS }
      ),
    };
  }

  return { keyId: verified.id };
}

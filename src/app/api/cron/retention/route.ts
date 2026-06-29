import { NextResponse } from "next/server";
import { sendRetentionDigest } from "@/lib/retention-digest";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Invoked weekly by Vercel Cron (see vercel.json). Vercel sends
// `Authorization: Bearer $CRON_SECRET` when the env var is set on the project.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await sendRetentionDigest();
  return NextResponse.json(result);
}

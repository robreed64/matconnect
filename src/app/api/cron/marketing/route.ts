import { NextResponse } from "next/server";
import { runAllActiveWorkflows } from "@/lib/marketing-triggers";
import { sendRetentionDigest, type DigestResult } from "@/lib/retention-digest";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Invoked daily by Vercel Cron (see vercel.json). Vercel sends
// `Authorization: Bearer $CRON_SECRET` when the env var is set on the project.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results = await runAllActiveWorkflows();
  const sent    = results.reduce((sum, r) => sum + r.sent, 0);
  const skipped = results.reduce((sum, r) => sum + r.skipped, 0);

  // Weekly at-risk digest runs on Mondays from this daily cron, so we stay
  // within the Hobby plan's 2-cron limit (no separate retention cron).
  let digest: DigestResult | null = null;
  if (new Date().getUTCDay() === 1) {
    try {
      digest = await sendRetentionDigest();
    } catch (err) {
      console.error("[cron/marketing] retention digest failed:", err);
    }
  }

  return NextResponse.json({ sent, skipped, workflows: results, digest });
}

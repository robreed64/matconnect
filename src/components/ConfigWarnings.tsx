import Link from "next/link";
import type { GymSettings } from "@prisma/client";

// Surfaces features that silently no-op when unconfigured (email/sms senders,
// blob uploads, Stripe). Conditions mirror the guards in lib/email, lib/sms,
// lib/stripe and the upload routes.
export default function ConfigWarnings({ settings }: { settings: GymSettings }) {
  const gaps: string[] = [];

  if (!settings.brevoApiKey || !settings.brevoSenderEmail) {
    gaps.push("Email sending is disabled (Brevo API key / sender email not set)");
  } else if (!settings.brevoSmsFrom) {
    gaps.push("SMS sending is disabled (Brevo SMS sender not set)");
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    gaps.push("Photo and video uploads are disabled (BLOB_READ_WRITE_TOKEN not set)");
  }

  const stripeKey = settings.stripeSecretKey || process.env.STRIPE_SECRET_KEY;
  if (!stripeKey || stripeKey === "sk_test_...") {
    gaps.push("Payments are disabled (Stripe secret key not set)");
  }

  if (gaps.length === 0) return null;

  return (
    <div className="mx-4 mt-4 md:mx-8 md:mt-6 rounded-xl border border-amber-700/60 bg-amber-900/20 px-4 py-3">
      <p className="text-xs font-semibold text-amber-400 mb-1">Some features need configuration</p>
      <ul className="text-xs text-amber-200/80 list-disc list-inside space-y-0.5">
        {gaps.map((g) => <li key={g}>{g}</li>)}
      </ul>
      <Link href="/admin/settings" className="mt-2 inline-block text-xs text-amber-300 underline hover:text-amber-200 transition">
        Open Settings →
      </Link>
    </div>
  );
}

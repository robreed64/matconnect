"use client";

import { useState, type FormEvent } from "react";

const INTERESTS = [
  { value: "adult-gi",   label: "Adults · Gi",    ageGroup: "adult", trainingType: "Gi" },
  { value: "adult-nogi", label: "Adults · No-Gi", ageGroup: "adult", trainingType: "No-Gi" },
  { value: "adult-both", label: "Adults · Both",  ageGroup: "adult", trainingType: "Both" },
  { value: "kids",       label: "Kids Program",   ageGroup: "kids",  trainingType: null },
];

export default function SiteLeadForm({ themeColor, ctaLabel }: { themeColor: string; ctaLabel: string }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", interest: "" });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const selected = INTERESTS.find((i) => i.value === form.interest);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim() || undefined,
          ageGroup: selected?.ageGroup,
          trainingType: selected?.trainingType ?? undefined,
        }),
      });
      if (res.ok) {
        setDone(true);
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Something went wrong. Please try again.");
      }
    } catch {
      setError("Network error. Please try again.");
    }
    setLoading(false);
  }

  if (done) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
        <p className="text-lg font-bold text-gray-900">You&apos;re on the list!</p>
        <p className="mt-2 text-sm text-gray-500">
          Thanks for your interest — we&apos;ll reach out soon to get you on the mat.
        </p>
      </div>
    );
  }

  const inputClass =
    "w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2";

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Full name *</label>
        <input
          type="text" required value={form.name}
          onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
          placeholder="Jane Smith" className={inputClass} style={{ ["--tw-ring-color" as string]: themeColor }}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Email *</label>
        <input
          type="email" required autoComplete="email" autoCapitalize="none" value={form.email}
          onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
          placeholder="jane@example.com" className={inputClass} style={{ ["--tw-ring-color" as string]: themeColor }}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">Phone</label>
        <input
          type="tel" value={form.phone}
          onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
          placeholder="(555) 000-0000" className={inputClass} style={{ ["--tw-ring-color" as string]: themeColor }}
        />
      </div>
      <div>
        <label className="mb-1 block text-xs font-medium text-gray-600">I&apos;m interested in</label>
        <select
          value={form.interest}
          onChange={(e) => setForm((p) => ({ ...p, interest: e.target.value }))}
          className={`${inputClass} bg-white`} style={{ ["--tw-ring-color" as string]: themeColor }}
        >
          <option value="">Select a program…</option>
          {INTERESTS.map((i) => (
            <option key={i.value} value={i.value}>{i.label}</option>
          ))}
        </select>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <button
        type="submit" disabled={loading}
        className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
        style={{ backgroundColor: themeColor }}
      >
        {loading ? "Sending…" : ctaLabel}
      </button>
      <p className="pt-1 text-center text-xs text-gray-400">No spam — we&apos;ll only contact you about your trial.</p>
    </form>
  );
}

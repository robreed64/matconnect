"use client";

import { useEffect, useState, FormEvent } from "react";

type GymInfo = { gymName: string; logoUrl?: string | null };

const INTERESTS = [
  { value: "adult-gi",    label: "Adults · Gi",    ageGroup: "adult", trainingType: "Gi" },
  { value: "adult-nogi",  label: "Adults · No-Gi", ageGroup: "adult", trainingType: "No-Gi" },
  { value: "adult-both",  label: "Adults · Both",  ageGroup: "adult", trainingType: "Both" },
  { value: "kids",        label: "Kids Program",   ageGroup: "kids",  trainingType: null },
];

export default function LeadWidgetPage() {
  const [gym, setGym]     = useState<GymInfo | null>(null);
  const [form, setForm]   = useState({ name: "", email: "", phone: "", interest: "" });
  const [loading, setLoading] = useState(false);
  const [done, setDone]   = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings/public")
      .then(r => r.json())
      .then(d => setGym({ gymName: d.gymName, logoUrl: d.logoUrl }))
      .catch(() => setGym({ gymName: "Our Gym" }));
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const selected = INTERESTS.find(i => i.value === form.interest);

    const res = await fetch("/api/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name:         form.name.trim(),
        email:        form.email.trim(),
        phone:        form.phone.trim() || undefined,
        ageGroup:     selected?.ageGroup,
        trainingType: selected?.trainingType ?? undefined,
      }),
    });

    if (res.ok) {
      setDone(true);
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Something went wrong. Please try again.");
    }
    setLoading(false);
  }

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <div className="text-5xl mb-4">🥋</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">You&apos;re on the list!</h2>
        <p className="text-gray-500 max-w-xs">
          Thanks for your interest. We&apos;ll reach out soon to get you on the mat.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6">
      <div className="w-full max-w-sm">
        {/* Gym branding */}
        <div className="text-center mb-6">
          {gym?.logoUrl ? (
            <img src={gym.logoUrl} alt={gym.gymName} className="h-12 mx-auto mb-3 object-contain" />
          ) : (
            <div className="text-2xl mb-1">🥋</div>
          )}
          <h1 className="text-xl font-black text-gray-900">{gym?.gymName ?? ""}</h1>
          <p className="text-sm text-gray-500 mt-1">Sign up for a free trial class</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Full name *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="Jane Smith"
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email address *</label>
            <input
              type="text" inputMode="email" autoComplete="email" autoCorrect="off" autoCapitalize="none"
              required
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              placeholder="jane@example.com"
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Phone number</label>
            <input
              type="tel"
              value={form.phone}
              onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
              placeholder="(555) 000-0000"
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">I&apos;m interested in</label>
            <select
              value={form.interest}
              onChange={e => setForm(p => ({ ...p, interest: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 text-sm text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 bg-white"
            >
              <option value="">Select a program…</option>
              {INTERESTS.map(i => (
                <option key={i.value} value={i.value}>{i.label}</option>
              ))}
            </select>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-sm rounded-lg transition mt-1"
          >
            {loading ? "Sending…" : "Request a free class →"}
          </button>

          <p className="text-center text-xs text-gray-400 pt-1">
            No spam. We&apos;ll only contact you about your trial.
          </p>
        </form>
      </div>
    </div>
  );
}

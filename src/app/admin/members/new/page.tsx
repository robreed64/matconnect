"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Plan = { id: number; name: string; priceCents: number; billingInterval: string };

const BELTS   = ["white", "blue", "purple", "brown", "black"];
const STATUSES = ["active", "trial", "lead", "inactive", "past_due", "canceled"];
const TYPES   = ["Gi", "No-Gi", "Both"];
const GROUPS  = ["adult", "kids"];

export default function NewMemberPage() {
  const router = useRouter();
  const [plans, setPlans]   = useState<Plan[]>([]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    name: "", email: "", phone: "",
    dateOfBirth: "", ageGroup: "adult",
    beltRank: "white", trainingType: "",
    status: "active", planId: "",
  });

  useEffect(() => {
    fetch("/api/plans").then((r) => r.json()).then(setPlans);
  }, []);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const formatPhone = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 10);
    if (digits.length < 4) return digits;
    if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Invalid email";
    if (!form.phone.trim()) e.phone = "Phone is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    if (!validate()) return;
    setSaving(true);

    const res = await fetch("/api/admin/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        planId: form.planId || null,
        dateOfBirth: form.dateOfBirth || null,
      }),
    });

    setSaving(false);
    if (res.ok) {
      const data = await res.json();
      router.push(`/admin/members/${data.id}`);
    } else {
      const data = await res.json();
      setErrors({ submit: data.error ?? "Failed to create member" });
    }
  };

  return (
    <div className="p-8 max-w-lg">
      <h1 className="text-2xl font-bold mb-6">Add Member</h1>

      <div className="space-y-5">
        <Field label="Full Name *" error={errors.name}>
          <input autoFocus type="text" placeholder="First and last name" value={form.name}
            onChange={(e) => set("name", e.target.value)} className={inp(!!errors.name)} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Email *" error={errors.email}>
            <input type="text" inputMode="email" autoComplete="email" autoCorrect="off" autoCapitalize="none" placeholder="you@example.com" value={form.email}
              onChange={(e) => set("email", e.target.value)} className={inp(!!errors.email)} />
          </Field>
          <Field label="Phone *" error={errors.phone}>
            <input type="tel" placeholder="(555) 000-0000" value={form.phone}
              onChange={(e) => set("phone", formatPhone(e.target.value))} className={inp(!!errors.phone)} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Date of Birth">
            <input type="date" value={form.dateOfBirth}
              onChange={(e) => set("dateOfBirth", e.target.value)} className={inp(false)} />
          </Field>
          <Field label="Age Group">
            <Select value={form.ageGroup} onChange={(v) => set("ageGroup", v)} options={GROUPS} />
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Field label="Belt Rank">
            <Select value={form.beltRank} onChange={(v) => set("beltRank", v)} options={BELTS} />
          </Field>
          <Field label="Training Type">
            <select value={form.trainingType} onChange={(e) => set("trainingType", e.target.value)} className={inp(false)}>
              <option value="">— Not set —</option>
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={(v) => set("status", v)} options={STATUSES} />
          </Field>
        </div>

        <Field label="Membership Plan">
          <select value={form.planId} onChange={(e) => set("planId", e.target.value)} className={inp(false)}>
            <option value="">— No plan —</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} — ${(p.priceCents / 100).toFixed(0)}/{p.billingInterval}
              </option>
            ))}
          </select>
        </Field>

        {errors.submit && <p className="text-red-400 text-sm">{errors.submit}</p>}

        <div className="flex gap-3 pt-2">
          <button onClick={() => router.push("/admin/members")}
            className="px-4 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm font-medium transition">
            Cancel
          </button>
          <button onClick={submit} disabled={saving}
            className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-sm font-semibold text-white transition">
            {saving ? "Creating…" : "Create Member"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inp = (error: boolean) =>
  `w-full px-3 py-2.5 rounded-lg bg-gray-800 border text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm transition ${error ? "border-red-500" : "border-gray-700"}`;

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>
      {children}
      {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
    </div>
  );
}

function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)} className={inp(false)}>
      {options.map((o) => (
        <option key={o} value={o}>{o.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}</option>
      ))}
    </select>
  );
}

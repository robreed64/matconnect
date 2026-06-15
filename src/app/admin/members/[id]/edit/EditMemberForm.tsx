"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PhotoUploader from "@/components/PhotoUploader";

const BELT_RANKS   = ["white", "blue", "purple", "brown", "black"];
const AGE_GROUPS   = ["adult", "kids"];
const TRAINING     = ["Gi", "No-Gi", "Both"];
const STATUSES     = ["active", "trial", "lead", "past_due", "inactive", "canceled"];

const inp = "w-full px-3 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm transition";

type FormState = {
  name:         string;
  email:        string;
  phone:        string;
  address:      string;
  dateOfBirth:  string;
  ageGroup:     string;
  beltRank:     string;
  trainingType: string;
  status:       string;
  photoUrl:     string;
};

export default function EditMemberForm({ id }: { id: string }) {
  const router = useRouter();

  const [form,   setForm]   = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/admin/members/${id}`)
      .then((r) => r.json())
      .then((m) => {
        setForm({
          name:         m.name         ?? "",
          email:        m.email        ?? "",
          phone:        m.phone        ?? "",
          address:      m.address      ?? "",
          dateOfBirth:  m.dateOfBirth  ? m.dateOfBirth.slice(0, 10) : "",
          ageGroup:     m.ageGroup     ?? "",
          beltRank:     m.beltRank     ?? "",
          trainingType: m.trainingType ?? "",
          status:       m.status       ?? "active",
          photoUrl:     m.photoUrl     ?? "",
        });
      })
      .catch(() => setError("Failed to load member."));
  }, [id]);

  const set = (k: keyof FormState, v: string) =>
    setForm((f) => f ? { ...f, [k]: v } : f);

  const submit = async () => {
    if (!form?.name.trim()) { setError("Name is required."); return; }
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/members/${id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        name:         form.name.trim(),
        email:        form.email        || null,
        phone:        form.phone        || null,
        address:      form.address      || null,
        dateOfBirth:  form.dateOfBirth  || null,
        ageGroup:     form.ageGroup     || null,
        beltRank:     form.beltRank     || null,
        trainingType: form.trainingType || null,
        status:       form.status,
        photoUrl:     form.photoUrl     || null,
      }),
    });
    setSaving(false);
    if (res.ok) {
      router.push(`/admin/members/${id}`);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Failed to save changes.");
    }
  };

  if (!form && !error) {
    return <div className="p-8 text-gray-500 text-sm">Loading…</div>;
  }

  return (
    <div className="p-8 max-w-2xl">
      <Link href={`/admin/members/${id}`}
        className="text-sm text-gray-400 hover:text-white transition mb-6 inline-flex items-center gap-1">
        ← Member Profile
      </Link>

      <h1 className="text-2xl font-bold text-white mt-4 mb-6">Edit Member</h1>

      {error && !form && <p className="text-red-400 text-sm">{error}</p>}

      {form && (
        <div className="space-y-6">
          {/* Basic info */}
          <Section title="Basic Info">
            <div className="grid grid-cols-1 gap-4">
              <div className="flex items-start gap-6">
                <PhotoUploader
                  currentUrl={form.photoUrl || null}
                  uploadUrl={`/api/admin/members/${id}/photo`}
                  name={form.name}
                  onUpload={(url) => set("photoUrl", url)}
                />
                <div className="flex-1 space-y-4">
                  <Field label="Full Name *">
                    <input value={form.name} onChange={(e) => set("name", e.target.value)}
                      className={inp} placeholder="Jane Smith" />
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Email">
                      <input type="text" inputMode="email" autoComplete="email" autoCorrect="off" autoCapitalize="none" value={form.email} onChange={(e) => set("email", e.target.value)}
                        className={inp} placeholder="jane@email.com" />
                    </Field>
                    <Field label="Phone">
                      <input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)}
                        className={inp} placeholder="(555) 555-5555" />
                    </Field>
                  </div>
                </div>
              </div>
              <Field label="Address">
                <input value={form.address} onChange={(e) => set("address", e.target.value)}
                  className={inp} placeholder="123 Main St, City, ST 00000" />
              </Field>
              <Field label="Date of Birth">
                <input type="date" value={form.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)}
                  className="w-48 px-3 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-blue-500 text-sm transition" />
              </Field>
            </div>
          </Section>

          {/* Training info */}
          <Section title="Training">
            <div className="grid grid-cols-3 gap-4">
              <Field label="Belt Rank">
                <select value={form.beltRank} onChange={(e) => set("beltRank", e.target.value)} className={inp}>
                  <option value="">— None —</option>
                  {BELT_RANKS.map((b) => (
                    <option key={b} value={b}>{b.charAt(0).toUpperCase() + b.slice(1)}</option>
                  ))}
                </select>
              </Field>
              <Field label="Training Type">
                <select value={form.trainingType} onChange={(e) => set("trainingType", e.target.value)} className={inp}>
                  <option value="">— None —</option>
                  {TRAINING.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="Age Group">
                <select value={form.ageGroup} onChange={(e) => set("ageGroup", e.target.value)} className={inp}>
                  <option value="">— None —</option>
                  {AGE_GROUPS.map((g) => (
                    <option key={g} value={g}>{g.charAt(0).toUpperCase() + g.slice(1)}</option>
                  ))}
                </select>
              </Field>
            </div>
          </Section>

          {/* Status */}
          <Section title="Membership Status">
            <Field label="Status">
              <select value={form.status} onChange={(e) => set("status", e.target.value)} className={`${inp} max-w-xs`}>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s.replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase())}</option>
                ))}
              </select>
            </Field>
          </Section>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button onClick={() => router.push(`/admin/members/${id}`)}
              className="px-4 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm font-medium transition">
              Cancel
            </button>
            <button onClick={submit} disabled={saving}
              className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-sm font-semibold text-white transition">
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

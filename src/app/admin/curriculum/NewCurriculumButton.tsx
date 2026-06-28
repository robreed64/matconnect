"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const BELT_LEVELS = ["white", "blue", "purple", "brown", "black"];

export default function NewCurriculumButton() {
  const router = useRouter();
  const [open,   setOpen]   = useState(false);
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState<string | null>(null);
  const [form,   setForm]   = useState({ name: "", description: "", beltLevel: "", weeks: "12" });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name) { setError("Name is required."); return; }
    setSaving(true); setError(null);
    const res = await fetch("/api/admin/curriculum", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(form),
    });
    setSaving(false);
    if (res.ok) {
      const c = await res.json();
      setOpen(false);
      router.push(`/admin/curriculum/${c.id}`);
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Failed to create.");
    }
  };

  return (
    <>
      <button onClick={() => { setOpen(true); setError(null); setForm({ name: "", description: "", beltLevel: "", weeks: "12" }); }}
        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition">
        + New Curriculum
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f1117] border border-gray-700/50 rounded-2xl w-full max-w-md p-6">
            <h2 className="text-base font-bold text-white mb-5">New Curriculum</h2>
            <div className="space-y-4">
              <Field label="Name *">
                <input value={form.name} onChange={(e) => set("name", e.target.value)}
                  className={inp} placeholder="e.g. Fundamentals 12-Week Program" />
              </Field>
              <Field label="Description">
                <input value={form.description} onChange={(e) => set("description", e.target.value)}
                  className={inp} placeholder="Brief description" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Target Belt Level">
                  <select value={form.beltLevel} onChange={(e) => set("beltLevel", e.target.value)} className={inp}>
                    <option value="">All levels</option>
                    {BELT_LEVELS.map((b) => <option key={b} value={b}>{b.charAt(0).toUpperCase() + b.slice(1)}</option>)}
                  </select>
                </Field>
                <Field label="Duration (weeks)">
                  <input type="number" min={1} max={52} value={form.weeks} onChange={(e) => set("weeks", e.target.value)} className={inp} />
                </Field>
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={submit} disabled={saving}
                className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-sm transition">
                {saving ? "Creating…" : "Create Curriculum"}
              </button>
              <button onClick={() => setOpen(false)}
                className="px-4 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const inp = "w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500 transition";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Plan = {
  id: number;
  name: string;
  description: string | null;
  priceCents: number;
  billingInterval: string;
  planType: string;
  classLimit: number | null;
  stripePriceId: string | null;
  subCount: number;
};

const PLAN_TYPES = ["gi", "no-gi", "family", "kids", "online", "drop-in"];
const INTERVALS  = ["monthly", "yearly"];

export default function PlanSetupClient({ plans: initial, stripeConfigured }: { plans: Plan[]; stripeConfigured: boolean }) {
  const router = useRouter();
  const [plans, setPlans] = useState(initial);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState<Partial<Plan>>({});
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [error, setError] = useState("");

  const startEdit = (p: Plan) => { setEditing(p.id); setForm({ ...p }); setError(""); };
  const cancelEdit = () => { setEditing(null); setForm({}); };

  const saveEdit = async () => {
    if (!editing) return;
    setSaving(true); setError("");
    const res = await fetch(`/api/admin/plans/${editing}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        description: form.description,
        planType: form.planType,
        classLimit: form.classLimit ?? null,
        priceCents: form.priceCents,
        billingInterval: form.billingInterval,
      }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Save failed"); setSaving(false); return; }
    setPlans(ps => ps.map(p => p.id === editing ? { ...p, ...data, subCount: p.subCount } : p));
    setEditing(null); setSaving(false);
    router.refresh();
  };

  const deletePlan = async (plan: Plan) => {
    if (plan.subCount > 0) {
      if (!confirm(`This plan has ${plan.subCount} active subscription(s). Delete anyway?`)) return;
    } else {
      if (!confirm(`Delete plan "${plan.name}"?`)) return;
    }
    setDeleting(plan.id);
    const res = await fetch(`/api/admin/plans/${plan.id}`, { method: "DELETE" });
    if (res.ok) {
      setPlans(ps => ps.filter(p => p.id !== plan.id));
      router.refresh();
    } else {
      const d = await res.json();
      setError(d.error ?? "Delete failed");
    }
    setDeleting(null);
  };

  const inp = "w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500";
  const sel = "w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500";

  return (
    <div className="space-y-4">
      {error && <div className="bg-red-900/30 border border-red-800 text-red-300 text-sm rounded-lg px-4 py-3">{error}</div>}

      {plans.map(plan => (
        <div key={plan.id} className="bg-[#0f1117] border border-gray-700/50 rounded-2xl p-5">
          {editing === plan.id ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Name</label>
                  <input className={inp} value={form.name ?? ""} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Type</label>
                  <select className={sel} value={form.planType ?? ""} onChange={e => setForm(f => ({ ...f, planType: e.target.value }))}>
                    {PLAN_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Description</label>
                <input className={inp} value={form.description ?? ""} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Price ($)</label>
                  <input type="number" step="0.01" min="0" className={inp}
                    value={form.priceCents !== undefined ? (form.priceCents / 100).toFixed(2) : ""}
                    onChange={e => setForm(f => ({ ...f, priceCents: Math.round(parseFloat(e.target.value) * 100) || 0 }))} />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Interval</label>
                  <select className={sel} value={form.billingInterval ?? "monthly"} onChange={e => setForm(f => ({ ...f, billingInterval: e.target.value }))}>
                    {INTERVALS.map(i => <option key={i} value={i}>{i}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Class Limit</label>
                  <input type="number" min="0" placeholder="Unlimited" className={inp}
                    value={form.classLimit ?? ""}
                    onChange={e => setForm(f => ({ ...f, classLimit: e.target.value ? parseInt(e.target.value) : null }))} />
                </div>
              </div>
              {stripeConfigured && plan.stripePriceId && (
                <p className="text-xs text-yellow-400/80">Changing price or interval will archive the current Stripe price and create a new one.</p>
              )}
              <div className="flex gap-2">
                <button onClick={saveEdit} disabled={saving}
                  className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium disabled:opacity-50 transition">
                  {saving ? "Saving…" : "Save"}
                </button>
                <button onClick={cancelEdit} className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm text-gray-300 transition">Cancel</button>
              </div>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold text-white">{plan.name}</p>
                {plan.description && <p className="text-sm text-gray-500">{plan.description}</p>}
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  <span>${(plan.priceCents / 100).toFixed(2)}/{plan.billingInterval}</span>
                  <span className="capitalize">{plan.planType}</span>
                  {plan.classLimit && <span>{plan.classLimit} classes/mo</span>}
                  {plan.stripePriceId
                    ? <span className="text-green-400">● Stripe synced</span>
                    : <span className="text-gray-600">Stripe not linked</span>}
                  <span>{plan.subCount} subscriber{plan.subCount !== 1 ? "s" : ""}</span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => startEdit(plan)} className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 transition">Edit</button>
                <button onClick={() => deletePlan(plan)} disabled={deleting === plan.id}
                  className="px-3 py-1.5 rounded-lg bg-red-900/30 hover:bg-red-900/60 border border-red-800/60 text-xs text-red-400 transition disabled:opacity-50">
                  {deleting === plan.id ? "…" : "Delete"}
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      <Link href="/admin/plans/new"
        className="flex items-center justify-center gap-2 py-3 rounded-2xl border border-dashed border-gray-700 hover:border-gray-600 text-sm text-gray-500 hover:text-gray-300 transition">
        + New Plan
      </Link>
    </div>
  );
}

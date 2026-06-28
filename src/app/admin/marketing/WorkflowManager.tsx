"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type WorkflowConfig = {
  channel:          string;
  subject?:         string;
  body:             string;
  inactivity_days?: number;
  trial_classes?:   number;
  cooldown_days?:   number;
  days_before?:     number;
};

type Workflow = {
  id:          number;
  name:        string;
  triggerType: string;
  config:      WorkflowConfig;
  active:      boolean;
  _count:      { messages: number };
};

const TRIGGERS: { value: string; label: string; hint: string }[] = [
  { value: "inactivity",        label: "Inactivity",        hint: "Member hasn't checked in for N days" },
  { value: "trial_attendance",  label: "Trial Attendance",  hint: "Trial member hits N classes" },
  { value: "trial_expiring",    label: "Trial Expiring",    hint: "Trial ends in N days" },
  { value: "birthday",          label: "Birthday",          hint: "Member's birthday today" },
  { value: "failed_payment",    label: "Failed Payment",    hint: "Member status is past due" },
  { value: "promotion",         label: "Belt Promotion",    hint: "Fired when a member is promoted" },
];

const CHANNELS = ["email", "sms", "in_app"];

const TRIGGER_PILL: Record<string, string> = {
  inactivity:       "bg-orange-900/40 text-orange-300",
  trial_attendance: "bg-blue-900/40 text-blue-300",
  trial_expiring:   "bg-amber-900/40 text-amber-300",
  birthday:         "bg-pink-900/40 text-pink-300",
  failed_payment:   "bg-red-900/40 text-red-300",
  promotion:        "bg-green-900/40 text-green-300",
};

const CHANNEL_PILL: Record<string, string> = {
  email:  "bg-violet-900/40 text-violet-300",
  sms:    "bg-cyan-900/40 text-cyan-300",
  in_app: "bg-gray-700 text-gray-300",
};

const VARS_HINT: Record<string, string> = {
  inactivity:       "{{name}}, {{days}}",
  trial_attendance: "{{name}}, {{classes}}",
  trial_expiring:   "{{name}}, {{days_left}}",
  birthday:         "{{name}}",
  failed_payment:   "{{name}}",
  promotion:        "{{name}}, {{belt}}",
};

const EMPTY_CONFIG: WorkflowConfig = {
  channel: "email", subject: "", body: "", inactivity_days: 30, trial_classes: 3, cooldown_days: 30, days_before: 3,
};

function emptyForm(triggerType = "inactivity") {
  return { name: "", triggerType, config: { ...EMPTY_CONFIG } };
}

export default function WorkflowManager({ initialWorkflows }: { initialWorkflows: Workflow[] }) {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<Workflow[]>(initialWorkflows);
  const [showForm, setShowForm]   = useState(false);
  const [editing,  setEditing]    = useState<Workflow | null>(null);
  const [form,     setForm]       = useState(emptyForm());
  const [saving,   setSaving]     = useState(false);
  const [running,  setRunning]    = useState<number | null>(null);
  const [runResult, setRunResult] = useState<{ id: number; sent: number; skipped: number } | null>(null);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm());
    setShowForm(true);
  };

  const openEdit = (w: Workflow) => {
    setEditing(w);
    setForm({ name: w.name, triggerType: w.triggerType, config: { ...EMPTY_CONFIG, ...w.config } });
    setShowForm(true);
  };

  const setConfig = (patch: Partial<WorkflowConfig>) =>
    setForm((f) => ({ ...f, config: { ...f.config, ...patch } }));

  const save = async () => {
    setSaving(true);
    const body = { name: form.name, triggerType: form.triggerType, config: form.config };
    const res  = editing
      ? await fetch(`/api/admin/marketing/workflows/${editing.id}`, { method: "PUT",  headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      : await fetch("/api/admin/marketing/workflows",                { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

    if (res.ok) {
      const w = await res.json();
      setWorkflows((prev) =>
        editing
          ? prev.map((x) => x.id === editing.id ? { ...w, _count: x._count } : x)
          : [...prev, { ...w, _count: { messages: 0 } }]
      );
      setShowForm(false);
      router.refresh();
    }
    setSaving(false);
  };

  const toggle = async (w: Workflow) => {
    const res = await fetch(`/api/admin/marketing/workflows/${w.id}/toggle`, { method: "POST" });
    if (res.ok) {
      const updated = await res.json();
      setWorkflows((prev) => prev.map((x) => x.id === w.id ? { ...x, active: updated.active } : x));
    }
  };

  const remove = async (id: number) => {
    await fetch(`/api/admin/marketing/workflows/${id}`, { method: "DELETE" });
    setWorkflows((prev) => prev.filter((x) => x.id !== id));
  };

  const run = async (w: Workflow) => {
    setRunning(w.id);
    setRunResult(null);
    const res  = await fetch("/api/admin/marketing/trigger", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workflowId: w.id }),
    });
    const data = await res.json();
    setRunResult({ id: w.id, sent: data.sent ?? 0, skipped: data.skipped ?? 0 });
    setWorkflows((prev) => prev.map((x) => x.id === w.id ? { ...x, _count: { messages: x._count.messages + (data.sent ?? 0) } } : x));
    setRunning(null);
    router.refresh();
  };

  return (
    <div>
      <div className="flex justify-end mb-6">
        <button onClick={openNew}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition">
          + New Workflow
        </button>
      </div>

      {workflows.length === 0 ? (
        <div className="bg-[#0f1117] border border-gray-700/50 rounded-xl p-10 text-center text-gray-600 text-sm">
          No workflows yet. Create one to start automating outreach.
        </div>
      ) : (
        <div className="space-y-3">
          {workflows.map((w) => {
            const cfg = w.config as WorkflowConfig;
            return (
              <div key={w.id} className={`bg-gray-900 border rounded-xl p-5 transition ${w.active ? "border-gray-800" : "border-gray-800/50 opacity-60"}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-white">{w.name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TRIGGER_PILL[w.triggerType] ?? "bg-gray-700 text-gray-300"}`}>
                        {TRIGGERS.find((t) => t.value === w.triggerType)?.label ?? w.triggerType}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CHANNEL_PILL[cfg.channel] ?? "bg-gray-700 text-gray-300"}`}>
                        {cfg.channel}
                      </span>
                      {!w.active && <span className="text-xs text-gray-600">Paused</span>}
                    </div>
                    {cfg.subject && <p className="text-sm text-gray-400 mt-1 truncate">{cfg.subject}</p>}
                    <p className="text-xs text-gray-600 mt-0.5 truncate">{cfg.body}</p>
                    <p className="text-xs text-gray-600 mt-1">{w._count.messages} messages sent</p>
                    {runResult?.id === w.id && (
                      <p className="text-xs mt-1 text-green-400">
                        ✓ {runResult.sent} sent{runResult.skipped > 0 ? `, ${runResult.skipped} skipped (cooldown)` : ""}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {w.triggerType !== "promotion" && (
                      <button onClick={() => run(w)} disabled={running === w.id || !w.active}
                        className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 disabled:opacity-40 transition">
                        {running === w.id ? "Running…" : "Run Now"}
                      </button>
                    )}
                    <button onClick={() => toggle(w)}
                      className={`px-3 py-1.5 rounded-lg text-xs transition ${w.active ? "bg-gray-800 hover:bg-gray-700 text-gray-300" : "bg-green-900/40 hover:bg-green-800 text-green-400"}`}>
                      {w.active ? "Pause" : "Resume"}
                    </button>
                    <button onClick={() => openEdit(w)}
                      className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 transition">
                      Edit
                    </button>
                    <button onClick={() => remove(w.id)}
                      className="px-3 py-1.5 rounded-lg bg-red-900/40 hover:bg-red-800 text-xs text-red-400 hover:text-white transition">
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-[#0f1117] border border-gray-700/50 rounded-2xl w-full max-w-lg p-6 my-8">
            <h2 className="text-lg font-bold text-white mb-5">{editing ? "Edit Workflow" : "New Workflow"}</h2>
            <div className="space-y-4">

              <Field label="Workflow Name">
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500 transition"
                  placeholder="e.g. Win-back inactive members" />
              </Field>

              <Field label="Trigger">
                <select value={form.triggerType} onChange={(e) => setForm((f) => ({ ...f, triggerType: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500 transition">
                  {TRIGGERS.map((t) => <option key={t.value} value={t.value}>{t.label} — {t.hint}</option>)}
                </select>
              </Field>

              {/* Trigger-specific params */}
              {form.triggerType === "inactivity" && (
                <Field label="Days of inactivity before triggering">
                  <input type="number" min={1} value={form.config.inactivity_days ?? 30}
                    onChange={(e) => setConfig({ inactivity_days: Number(e.target.value) })}
                    className="w-32 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500 transition" />
                </Field>
              )}
              {form.triggerType === "trial_attendance" && (
                <Field label="Number of trial classes to trigger on">
                  <input type="number" min={1} value={form.config.trial_classes ?? 3}
                    onChange={(e) => setConfig({ trial_classes: Number(e.target.value) })}
                    className="w-32 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500 transition" />
                </Field>
              )}
              {form.triggerType === "trial_expiring" && (
                <Field label="Days before trial expiry to trigger">
                  <input type="number" min={1} value={form.config.days_before ?? 3}
                    onChange={(e) => setConfig({ days_before: Number(e.target.value) })}
                    className="w-32 px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500 transition" />
                </Field>
              )}

              <div className="grid grid-cols-2 gap-4">
                <Field label="Channel">
                  <select value={form.config.channel} onChange={(e) => setConfig({ channel: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500 transition">
                    {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Field>
                <Field label="Cooldown (days between sends)">
                  <input type="number" min={0} value={form.config.cooldown_days ?? 30}
                    onChange={(e) => setConfig({ cooldown_days: Number(e.target.value) })}
                    className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500 transition" />
                </Field>
              </div>

              {form.config.channel === "email" && (
                <Field label="Subject">
                  <input value={form.config.subject ?? ""} onChange={(e) => setConfig({ subject: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500 transition"
                    placeholder="e.g. We miss you, {{name}}!" />
                </Field>
              )}

              <Field label={`Message Body — available variables: ${VARS_HINT[form.triggerType] ?? "{{name}}"}`}>
                <textarea rows={4} value={form.config.body} onChange={(e) => setConfig({ body: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500 transition resize-none font-mono"
                  placeholder="Hi {{name}}, we haven't seen you in a while..." />
              </Field>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={save} disabled={saving || !form.name || !form.config.body}
                className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-sm transition">
                {saving ? "Saving…" : editing ? "Save Changes" : "Create Workflow"}
              </button>
              <button onClick={() => setShowForm(false)}
                className="px-4 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

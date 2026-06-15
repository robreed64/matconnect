"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Program = { id: number; name: string; type: string };
type GymSettings = { instructorNames?: string[] };

type FormState = {
  name: string;
  programId: string;
  date: string;
  startTime: string;
  endTime: string;
  instructorName: string;
  capacity: string;
  recurrenceRule: string;
  seriesEndDate: string;
};

type Props = {
  initialValues?: Partial<FormState>;
  classId?: number;
};

const RECURRENCE_OPTIONS = [
  { value: "",                    label: "One-time (no recurrence)" },
  { value: "FREQ=WEEKLY",        label: "Weekly (same day each week)" },
  { value: "FREQ=WEEKLY;BYDAY=MO,WE,FR", label: "Mon / Wed / Fri" },
  { value: "FREQ=WEEKLY;BYDAY=TU,TH",    label: "Tue / Thu" },
  { value: "FREQ=WEEKLY;BYDAY=SA,SU",    label: "Weekends" },
];

export default function ClassForm({ initialValues, classId }: Props) {
  const router  = useRouter();
  const [programs, setPrograms]             = useState<Program[]>([]);
  const [instructorNames, setInstructorNames] = useState<string[]>([]);
  const [saving, setSaving]                 = useState(false);
  const [error, setError]                   = useState<string | null>(null);

  const [form, setForm] = useState<FormState>({
    name:           initialValues?.name           ?? "",
    programId:      initialValues?.programId      ?? "",
    date:           initialValues?.date           ?? "",
    startTime:      initialValues?.startTime      ?? "18:00",
    endTime:        initialValues?.endTime        ?? "19:30",
    instructorName: initialValues?.instructorName ?? "",
    capacity:       initialValues?.capacity       ?? "",
    recurrenceRule: initialValues?.recurrenceRule ?? "",
    seriesEndDate:  initialValues?.seriesEndDate  ?? "",
  });

  useEffect(() => {
    fetch("/api/admin/programs").then((r) => r.json()).then(setPrograms);
    fetch("/api/admin/settings").then(r => r.json()).then((d: GymSettings) => {
      if (Array.isArray(d.instructorNames)) setInstructorNames(d.instructorNames);
    }).catch(() => {});
    // Set today's date client-side only to avoid server/client timezone mismatch
    if (!initialValues?.date) {
      setForm((f) => ({ ...f, date: new Date().toLocaleDateString("en-CA") }));
    }
  }, []);

  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name || !form.date || !form.startTime || !form.endTime) {
      setError("Name, date, start time and end time are required.");
      return;
    }
    if (form.recurrenceRule && !form.seriesEndDate) {
      setError("Please set a series end date for recurring classes.");
      return;
    }
    if (form.seriesEndDate && form.seriesEndDate < form.date) {
      setError("Series end date must be on or after the start date.");
      return;
    }

    const startTime = new Date(`${form.date}T${form.startTime}:00`);
    const endTime   = new Date(`${form.date}T${form.endTime}:00`);
    if (endTime <= startTime) { setError("End time must be after start time."); return; }

    setSaving(true);
    setError(null);

    const body = {
      name:           form.name,
      programId:      form.programId || null,
      date:           form.date,
      startTime:      startTime.toISOString(),
      endTime:        endTime.toISOString(),
      instructorName: form.instructorName || null,
      capacity:       form.capacity || null,
      recurrenceRule: form.recurrenceRule || null,
      seriesEndDate:  form.seriesEndDate  || null,
    };

    const res = classId
      ? await fetch(`/api/admin/classes/${classId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      : await fetch("/api/admin/classes",             { method: "POST",  headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

    setSaving(false);
    if (res.ok) {
      const d = await res.json();
      const weekStart = new Date(d.startTime);
      // Navigate to the week containing this class
      const day  = weekStart.getDay();
      const diff = day === 0 ? -6 : 1 - day;
      weekStart.setDate(weekStart.getDate() + diff);
      router.push(`/admin/schedule?week=${weekStart.toLocaleDateString("en-CA")}`);
      router.refresh();
    } else {
      setError("Failed to save class.");
    }
  };

  return (
    <div className="space-y-5">
      <Field label="Class Name *">
        <input type="text" placeholder="e.g. Fundamentals Gi" value={form.name}
          onChange={(e) => set("name", e.target.value)} className={inp} />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Program">
          <select value={form.programId} onChange={(e) => set("programId", e.target.value)} className={inp}>
            <option value="">— No program —</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.type})</option>
            ))}
          </select>
        </Field>
        <Field label="Instructor">
          <input
            type="text"
            list="instructor-names-list"
            placeholder="Instructor name"
            value={form.instructorName}
            onChange={(e) => set("instructorName", e.target.value)}
            className={inp}
          />
          {instructorNames.length > 0 && (
            <datalist id="instructor-names-list">
              {instructorNames.map(n => <option key={n} value={n} />)}
            </datalist>
          )}
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Field label={form.recurrenceRule ? "Series Start Date *" : "Date *"}>
          <input type="date" value={form.date}
            onChange={(e) => set("date", e.target.value)} className={inp} />
        </Field>
        <Field label="Start Time *">
          <input type="time" value={form.startTime}
            onChange={(e) => set("startTime", e.target.value)} className={inp} />
        </Field>
        <Field label="End Time *">
          <div className="space-y-1">
            <input type="time" value={form.endTime}
              onChange={(e) => set("endTime", e.target.value)} className={inp} />
            {form.startTime && form.endTime && (() => {
              const [sh, sm] = form.startTime.split(":").map(Number);
              const [eh, em] = form.endTime.split(":").map(Number);
              const mins = (eh * 60 + em) - (sh * 60 + sm);
              if (mins <= 0) return null;
              const h = Math.floor(mins / 60), m = mins % 60;
              return <p className="text-xs text-gray-500">{h > 0 ? `${h}h ` : ""}{m > 0 ? `${m}m` : ""} duration</p>;
            })()}
          </div>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Capacity">
          <input type="number" min="1" placeholder="Unlimited" value={form.capacity}
            onChange={(e) => set("capacity", e.target.value)} className={inp} />
        </Field>
        <Field label="Recurrence">
          <select value={form.recurrenceRule} onChange={(e) => set("recurrenceRule", e.target.value)} className={inp}>
            {RECURRENCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Field>
      </div>

      {form.recurrenceRule && (
        <Field label="Series End Date *">
          <input type="date" value={form.seriesEndDate} min={form.date}
            onChange={(e) => set("seriesEndDate", e.target.value)} className={inp} />
          <p className="text-xs text-gray-500 mt-1">Classes will be created for every matching day up to and including this date.</p>
        </Field>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button onClick={() => router.back()}
          className="px-4 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm font-medium transition">
          Cancel
        </button>
        <button onClick={submit} disabled={saving}
          className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-sm font-semibold text-white transition">
          {saving ? "Saving…" : classId ? "Save Changes" : "Create Class"}
        </button>
      </div>
    </div>
  );
}

const inp = "w-full px-3 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm transition";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

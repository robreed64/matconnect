"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type Program = { id: number; name: string; type: string };

type Props = {
  classId: number;
  initialValues: {
    name: string;
    programId: string;
    instructorName: string;
    capacity: string;
    startTimeISO: string;
    endTimeISO: string;
  };
  programs: Program[];
};

export default function EditSeriesForm({ classId, initialValues, programs }: Props) {
  const router = useRouter();
  const [name,           setName]           = useState(initialValues.name);
  const [programId,      setProgramId]      = useState(initialValues.programId);
  const [instructorName, setInstructorName] = useState(initialValues.instructorName);
  const [capacity,       setCapacity]       = useState(initialValues.capacity);
  const [startTime,      setStartTime]      = useState("");
  const [endTime,        setEndTime]        = useState("");
  const [origStartMs,    setOrigStartMs]    = useState(0);
  const [origEndMs,      setOrigEndMs]      = useState(0);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    const s = new Date(initialValues.startTimeISO);
    const e = new Date(initialValues.endTimeISO);
    const toHHMM = (d: Date) => d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    setStartTime(toHHMM(s));
    setEndTime(toHHMM(e));
    // Store the original time-of-day in ms since midnight (local)
    setOrigStartMs((s.getHours() * 60 + s.getMinutes()) * 60000);
    setOrigEndMs((e.getHours() * 60 + e.getMinutes()) * 60000);
  }, []);

  const submit = async () => {
    if (!name || !startTime || !endTime) {
      setError("Name, start time and end time are required.");
      return;
    }

    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const newStartMs = (sh * 60 + sm) * 60000;
    const newEndMs   = (eh * 60 + em) * 60000;

    if (newEndMs <= newStartMs) {
      setError("End time must be after start time.");
      return;
    }

    setSaving(true);
    setError(null);

    const res = await fetch(`/api/admin/classes/${classId}?series=true`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        programId:      programId || null,
        instructorName: instructorName || null,
        capacity:       capacity || null,
        startDeltaMs:   newStartMs - origStartMs,
        endDeltaMs:     newEndMs   - origEndMs,
      }),
    });

    setSaving(false);

    if (res.ok) {
      router.push("/admin/schedule");
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Failed to save series.");
    }
  };

  const inp = "w-full px-3 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm transition";

  const durationLabel = (() => {
    if (!startTime || !endTime) return null;
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    const mins = (eh * 60 + em) - (sh * 60 + sm);
    if (mins <= 0) return null;
    const h = Math.floor(mins / 60), m = mins % 60;
    return `${h > 0 ? `${h}h ` : ""}${m > 0 ? `${m}m` : ""}`;
  })();

  return (
    <div className="space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1.5">Class Name *</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} className={inp} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Program</label>
          <select value={programId} onChange={e => setProgramId(e.target.value)} className={inp}>
            <option value="">— No program —</option>
            {programs.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({p.type})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Instructor</label>
          <input type="text" value={instructorName} onChange={e => setInstructorName(e.target.value)} className={inp} placeholder="Instructor name" />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Start Time *</label>
          <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className={inp} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">End Time *</label>
          <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className={inp} />
          {durationLabel && <p className="text-xs text-gray-500 mt-1">{durationLabel} duration</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Capacity</label>
          <input type="number" min="1" placeholder="Unlimited" value={capacity} onChange={e => setCapacity(e.target.value)} className={inp} />
        </div>
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button onClick={() => router.back()} className="px-4 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm font-medium transition">
          Cancel
        </button>
        <button onClick={submit} disabled={saving} className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-sm font-semibold text-white transition">
          {saving ? "Saving…" : "Save Series"}
        </button>
      </div>
    </div>
  );
}

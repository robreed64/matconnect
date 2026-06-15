"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type AttendanceRecord = {
  id: number;
  timestamp: string;
  source: string;
  className: string | null;
};

type ActiveClass = { id: number; name: string };

export default function AttendanceManager({
  memberId,
  initialAttendance,
  readOnly = false,
}: {
  memberId: number;
  initialAttendance: AttendanceRecord[];
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [attendance, setAttendance] = useState(initialAttendance);
  const [showModal, setShowModal] = useState(false);
  const [addDate, setAddDate] = useState(() => new Date().toLocaleDateString("en-CA"));
  const [addTime, setAddTime] = useState("18:00");
  const [addClassId, setAddClassId] = useState<number | "">("");
  const [classes, setClasses] = useState<ActiveClass[]>([]);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  const openModal = async () => {
    setShowModal(true);
    try {
      const res = await fetch("/api/admin/classes/active");
      if (res.ok) setClasses(await res.json());
    } catch {}
  };

  const addCheckIn = async () => {
    setAdding(true);
    const timestamp = new Date(`${addDate}T${addTime}:00`).toISOString();
    const res = await fetch("/api/admin/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, classId: addClassId || null, timestamp }),
    });
    setAdding(false);
    if (res.ok) {
      const record = await res.json();
      const cls = classes.find(c => c.id === record.classId);
      setAttendance(prev => [{
        id: record.id,
        timestamp: record.timestamp,
        source: record.source,
        className: cls?.name ?? null,
      }, ...prev]);
      setShowModal(false);
      router.refresh();
    }
  };

  const deleteCheckIn = async (id: number) => {
    if (!confirm("Remove this check-in?")) return;
    setDeleting(id);
    const res = await fetch(`/api/admin/attendance/${id}`, { method: "DELETE" });
    setDeleting(null);
    if (res.ok) {
      setAttendance(prev => prev.filter(a => a.id !== id));
      router.refresh();
    }
  };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Recent check-ins</h2>
        {!readOnly && (
          <button
            onClick={openModal}
            className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition"
          >
            + Add Check-in
          </button>
        )}
      </div>

      {attendance.length === 0 ? (
        <p className="text-gray-500 text-sm">No check-ins yet</p>
      ) : (
        <div className="divide-y divide-gray-800">
          {attendance.map(a => {
            const d = new Date(a.timestamp);
            return (
              <div key={a.id} className="py-2.5 flex items-center justify-between text-sm">
                <div>
                  <span className="text-white">{a.className ?? "Open mat"}</span>
                  <span className="ml-2 text-gray-500 text-xs capitalize">{a.source}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-gray-400">
                    {d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}{" "}
                    <span className="text-gray-600">
                      {d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </span>
                  </span>
                  {!readOnly && (
                    <button
                      onClick={() => deleteCheckIn(a.id)}
                      disabled={deleting === a.id}
                      className="text-lg leading-none text-gray-700 hover:text-red-400 transition disabled:opacity-40"
                      aria-label="Delete check-in"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-base font-bold text-white">Add Manual Check-in</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Date</label>
                <input
                  type="date"
                  value={addDate}
                  onChange={e => setAddDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Time</label>
                <input
                  type="time"
                  value={addTime}
                  onChange={e => setAddTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none"
                />
              </div>
              {classes.length > 0 && (
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Class (optional)</label>
                  <select
                    value={addClassId}
                    onChange={e => setAddClassId(e.target.value ? parseInt(e.target.value, 10) : "")}
                    className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none"
                  >
                    <option value="">Open mat / no class</option>
                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={addCheckIn}
                disabled={adding}
                className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-sm transition"
              >
                {adding ? "Adding…" : "Add Check-in"}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm transition"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";

const CLASS_COLORS: Record<string, string> = {
  gi:      "bg-blue-900/40 border-blue-800",
  "no-gi": "bg-orange-900/40 border-orange-800",
  youth:   "bg-green-900/40 border-green-800",
  seminar: "bg-purple-900/40 border-purple-800",
  intro:   "bg-teal-900/40 border-teal-800",
  private: "bg-gray-800 border-gray-700",
};

type ScheduleClass = {
  id: number;
  name: string;
  instructorName: string | null;
  startTime: string;
  endTime: string;
  capacity: number | null;
  program: { name: string; type: string } | null;
  booking: { id: number; status: string } | null;
};

function groupByDay(classes: ScheduleClass[]) {
  const map = new Map<string, ScheduleClass[]>();
  for (const cls of classes) {
    const key = new Date(cls.startTime).toLocaleDateString("en-US", {
      weekday: "long", month: "long", day: "numeric",
    });
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(cls);
  }
  return map;
}

export default function SchedulePage() {
  const [classes, setClasses] = useState<ScheduleClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [busy, setBusy] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(() => {
    fetch("/api/member/schedule")
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setClasses)
      .catch(() => setFetchError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function book(classId: number) {
    setBusy(classId);
    const res = await fetch("/api/member/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId }),
    });
    if (res.ok) {
      const newBooking = await res.json();
      const status = newBooking.waitlisted ? "waitlisted" : "booked";
      setClasses(prev =>
        prev.map(c => c.id === classId ? { ...c, booking: { id: newBooking.id, status } } : c)
      );
      showToast(newBooking.waitlisted
        ? `Class full — you're #${newBooking.position} on the waitlist`
        : "Class booked!");
    } else {
      const err = await res.json().catch(() => ({}));
      showToast(err.error ?? "Could not book class");
    }
    setBusy(null);
  }

  async function cancel(classId: number, bookingId: number) {
    setBusy(classId);
    await fetch(`/api/member/bookings/${bookingId}`, { method: "DELETE" });
    setClasses(prev => prev.map(c => c.id === classId ? { ...c, booking: null } : c));
    showToast("Booking canceled");
    setBusy(null);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 gap-3 text-gray-400">
        <div className="w-5 h-5 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
        Loading schedule…
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
        <p className="text-gray-400 text-sm">Could not load the schedule. Your account may not be linked to a member record — contact your gym administrator.</p>
      </div>
    );
  }

  const grouped = groupByDay(classes);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">Class Schedule</h1>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-800 border border-gray-700 text-white text-sm px-5 py-3 rounded-xl shadow-lg z-50">
          {toast}
        </div>
      )}

      {grouped.size === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center">
          <p className="text-gray-500 text-sm">No classes scheduled in the next two weeks.</p>
        </div>
      ) : (
        Array.from(grouped.entries()).map(([day, dayClasses]) => (
          <div key={day}>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">{day}</h2>
            <div className="space-y-2">
              {dayClasses.map((cls) => {
                const color = CLASS_COLORS[cls.program?.type ?? ""] ?? CLASS_COLORS.private;
                const isBooked = !!cls.booking;
                const isBusy = busy === cls.id;
                return (
                  <div
                    key={cls.id}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl border ${color}`}
                  >
                    <div>
                      <p className="font-medium text-white text-sm">{cls.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(cls.startTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        {" – "}
                        {new Date(cls.endTime).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        {cls.instructorName && ` · ${cls.instructorName}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {isBooked ? (
                        <>
                          {cls.booking!.status === "waitlisted" ? (
                            <span className="text-xs text-amber-300 font-medium">Waitlisted</span>
                          ) : (
                            <span className="text-xs text-green-400 font-medium">Booked ✓</span>
                          )}
                          <button
                            onClick={() => cancel(cls.id, cls.booking!.id)}
                            disabled={isBusy}
                            className="text-xs text-gray-500 hover:text-red-400 transition disabled:opacity-50"
                          >
                            {isBusy ? "…" : "Cancel"}
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => book(cls.id)}
                          disabled={isBusy}
                          className="px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition disabled:opacity-50"
                        >
                          {isBusy ? "…" : "Book"}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

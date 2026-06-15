"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

const TYPE_COLORS: Record<string, string> = {
  gi:      "bg-blue-700   border-blue-500   text-white",
  "no-gi": "bg-orange-700 border-orange-500 text-white",
  youth:   "bg-green-700  border-green-500  text-white",
  seminar: "bg-purple-700 border-purple-500 text-white",
  intro:   "bg-yellow-700 border-yellow-500 text-white",
  private: "bg-gray-700   border-gray-500   text-white",
};

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOUR_START = 6;
const HOUR_END   = 22;
const PX_PER_MIN = 1.2;

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

function addDays(date: Date, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function toLocalISO(d: Date) {
  return d.toLocaleDateString("en-CA");
}

function getMondayOf(d: Date) {
  const day = d.getDay();
  return addDays(d, day === 0 ? -6 : 1 - day);
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function minutesSinceMidnight(iso: string) {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

function ScheduleInner() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const weekParam    = searchParams.get("week");

  const [weekStart, setWeekStart] = useState<Date>(() => {
    if (weekParam) return getMondayOf(new Date(weekParam + "T12:00:00"));
    return getMondayOf(new Date());
  });
  const [classes,   setClasses]   = useState<ScheduleClass[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [selected,  setSelected]  = useState<ScheduleClass | null>(null);
  const [busy,      setBusy]      = useState(false);
  const [toast,     setToast]     = useState<string | null>(null);
  const [today,     setToday]     = useState("");

  useEffect(() => { setToday(toLocalISO(new Date())); }, []);

  // Sync weekStart when URL param changes
  useEffect(() => {
    if (weekParam) setWeekStart(getMondayOf(new Date(weekParam + "T12:00:00")));
  }, [weekParam]);

  const loadWeek = useCallback((ws: Date) => {
    setLoading(true);
    const weekEnd = addDays(ws, 7);
    fetch(`/api/member/schedule?weekStart=${ws.toISOString()}&weekEnd=${weekEnd.toISOString()}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setClasses)
      .catch(() => setClasses([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { loadWeek(weekStart); }, [weekStart, loadWeek]);

  function navigate(offset: number) {
    const next = addDays(weekStart, offset);
    router.push(`/member/schedule?week=${toLocalISO(next)}`);
    setWeekStart(next);
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function book(cls: ScheduleClass) {
    setBusy(true);
    const res = await fetch("/api/member/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ classId: cls.id }),
    });
    if (res.ok) {
      const b = await res.json();
      const status = b.waitlisted ? "waitlisted" : "booked";
      setClasses(prev => prev.map(c => c.id === cls.id ? { ...c, booking: { id: b.id, status } } : c));
      setSelected(prev => prev?.id === cls.id ? { ...prev, booking: { id: b.id, status } } : prev);
      showToast(b.waitlisted ? `You're #${b.position} on the waitlist` : "Class booked!");
    } else {
      const err = await res.json().catch(() => ({}));
      showToast(err.error ?? "Could not book class");
    }
    setBusy(false);
  }

  async function cancel(cls: ScheduleClass) {
    if (!cls.booking) return;
    setBusy(true);
    await fetch(`/api/member/bookings/${cls.booking.id}`, { method: "DELETE" });
    setClasses(prev => prev.map(c => c.id === cls.id ? { ...c, booking: null } : c));
    setSelected(prev => prev?.id === cls.id ? { ...prev, booking: null } : prev);
    showToast("Booking canceled");
    setBusy(false);
  }

  const gridHeight = (HOUR_END - HOUR_START) * 60 * PX_PER_MIN;
  const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);
  const dayDates = DAYS.map((_, i) => addDays(weekStart, i));

  const classesForDay = (date: Date) => {
    const key = toLocalISO(date);
    return classes.filter(c => toLocalISO(new Date(c.startTime)) === key);
  };

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 56px)" }}>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate(-7)} className="p-2 rounded-lg hover:bg-gray-800 transition text-gray-300 text-lg leading-none">‹</button>
          <button onClick={() => { setWeekStart(getMondayOf(new Date())); router.push("/member/schedule"); }}
            className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm text-gray-300 transition">
            Today
          </button>
          <button onClick={() => navigate(7)} className="p-2 rounded-lg hover:bg-gray-800 transition text-gray-300 text-lg leading-none">›</button>
          <span className="text-white font-semibold ml-1 text-sm" suppressHydrationWarning>
            {weekStart.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </span>
        </div>
        <div className="flex gap-1.5 flex-wrap text-xs">
          {Object.entries(TYPE_COLORS).map(([type, cls]) => (
            <span key={type} className={`px-2 py-0.5 rounded border ${cls} capitalize hidden sm:inline`}>{type}</span>
          ))}
        </div>
      </div>

      {/* Calendar grid */}
      <div className="flex-1 overflow-auto relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-950/70 z-20">
            <div className="w-6 h-6 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
          </div>
        )}
        <div className="flex min-w-[560px]">
          {/* Hour labels */}
          <div className="w-12 flex-shrink-0 relative" style={{ height: gridHeight + 32 }}>
            <div className="h-8" />
            {hours.map(h => (
              <div key={h} className="absolute left-0 right-0 text-right pr-1.5 text-xs text-gray-600"
                style={{ top: 32 + (h - HOUR_START) * 60 * PX_PER_MIN - 8 }}>
                {h === 12 ? "12p" : h > 12 ? `${h - 12}p` : `${h}a`}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {dayDates.map((date, di) => {
            const dateKey = toLocalISO(date);
            const isToday = dateKey === today;
            const dayCls  = classesForDay(date);
            return (
              <div key={di} className="flex-1 border-l border-gray-800 min-w-0">
                <div className={`h-8 flex flex-col items-center justify-center text-xs font-medium sticky top-0 z-10 border-b border-gray-800 ${isToday ? "bg-blue-900/40 text-blue-300" : "bg-gray-950 text-gray-400"}`}>
                  <span>{DAYS[di]}</span>
                  <span className={isToday ? "text-blue-400 font-bold" : "text-gray-500"} suppressHydrationWarning>
                    {date.toLocaleDateString("en-US", { month: "numeric", day: "numeric" })}
                  </span>
                </div>
                <div className="relative" style={{ height: gridHeight }}>
                  {hours.map(h => (
                    <div key={h} className="absolute left-0 right-0 border-t border-gray-800/60"
                      style={{ top: (h - HOUR_START) * 60 * PX_PER_MIN }} />
                  ))}
                  {dayCls.map(cls => {
                    const color  = TYPE_COLORS[cls.program?.type ?? ""] ?? TYPE_COLORS.private;
                    const top    = Math.max(0, (minutesSinceMidnight(cls.startTime) - HOUR_START * 60) * PX_PER_MIN);
                    const height = Math.max(24, (new Date(cls.endTime).getTime() - new Date(cls.startTime).getTime()) / 60000 * PX_PER_MIN);
                    const booked = !!cls.booking;
                    return (
                      <button
                        key={cls.id}
                        onClick={() => setSelected(cls)}
                        className={`absolute left-0.5 right-0.5 rounded border-l-2 px-1 py-0.5 text-left overflow-hidden transition hover:brightness-110 ${color} ${booked ? "ring-2 ring-white/30" : ""}`}
                        style={{ top, height }}
                      >
                        <div className="text-xs font-semibold leading-tight truncate">{cls.name}</div>
                        {height > 30 && (
                          <div className="text-xs opacity-75 leading-tight truncate" suppressHydrationWarning>
                            {formatTime(cls.startTime)}
                          </div>
                        )}
                        {booked && height > 44 && (
                          <div className="text-xs opacity-90">✓ booked</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Class detail popover */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">{selected.name}</h3>
                {selected.program && (
                  <span className="text-sm text-gray-400 capitalize">{selected.program.type} · {selected.program.name}</span>
                )}
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
            </div>

            <div className="space-y-2 text-sm mb-5">
              <div className="flex justify-between"><span className="text-gray-500">Date</span>
                <span className="text-gray-200" suppressHydrationWarning>
                  {new Date(selected.startTime).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
                </span>
              </div>
              <div className="flex justify-between"><span className="text-gray-500">Time</span>
                <span className="text-gray-200" suppressHydrationWarning>
                  {formatTime(selected.startTime)} – {formatTime(selected.endTime)}
                </span>
              </div>
              {selected.instructorName && (
                <div className="flex justify-between"><span className="text-gray-500">Instructor</span>
                  <span className="text-gray-200">{selected.instructorName}</span>
                </div>
              )}
              {selected.capacity && (
                <div className="flex justify-between"><span className="text-gray-500">Capacity</span>
                  <span className="text-gray-200">{selected.capacity} students</span>
                </div>
              )}
            </div>

            {selected.booking ? (
              <div className="space-y-2">
                <div className={`text-center text-sm font-medium py-2 rounded-lg ${selected.booking.status === "waitlisted" ? "bg-amber-900/30 text-amber-300" : "bg-green-900/30 text-green-400"}`}>
                  {selected.booking.status === "waitlisted" ? "You're on the waitlist" : "✓ You're booked"}
                </div>
                <button onClick={() => cancel(selected)} disabled={busy}
                  className="w-full py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm text-gray-300 disabled:opacity-50 transition">
                  {busy ? "Canceling…" : "Cancel booking"}
                </button>
              </div>
            ) : (
              <button onClick={() => book(selected)} disabled={busy}
                className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-semibold text-white disabled:opacity-50 transition">
                {busy ? "Booking…" : "Book this class"}
              </button>
            )}
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-800 border border-gray-700 text-white text-sm px-5 py-3 rounded-xl shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}

export default function SchedulePage() {
  return (
    <Suspense>
      <ScheduleInner />
    </Suspense>
  );
}

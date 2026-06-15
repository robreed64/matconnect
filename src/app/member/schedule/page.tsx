"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PRESET_COLORS, buildColorMap } from "@/lib/program-colors";

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
  seriesId: string | null;
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

  const [exportOpen,  setExportOpen]  = useState(false);
  const [cancelMode,  setCancelMode]  = useState<"confirm" | null>(null);
  const [weekStart, setWeekStart] = useState<Date>(() => {
    if (weekParam) return getMondayOf(new Date(weekParam + "T12:00:00"));
    return getMondayOf(new Date());
  });
  const [classes,    setClasses]    = useState<ScheduleClass[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [selected,   setSelected]   = useState<ScheduleClass | null>(null);
  const [busy,       setBusy]       = useState(false);
  const [toast,      setToast]      = useState<string | null>(null);
  const [today,      setToday]      = useState("");
  const [typeColors, setTypeColors] = useState<Record<string, string>>(PRESET_COLORS);

  useEffect(() => { setToday(toLocalISO(new Date())); }, []);

  useEffect(() => {
    fetch("/api/meta/program-types")
      .then(r => r.ok ? r.json() : [])
      .then((types: string[]) => setTypeColors(buildColorMap(types)))
      .catch(() => {});
  }, []);

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
      setSelected(prev => prev?.id === cls.id ? { ...prev, booking: { id: b.id, status } } : prev);
      // Reload full week so series siblings show as booked too
      loadWeek(weekStart);
      showToast(cls.seriesId
        ? (b.waitlisted ? `You're on the waitlist for this class` : "Booked for all classes in this series!")
        : (b.waitlisted ? `You're #${b.position} on the waitlist` : "Class booked!"));
    } else {
      const err = await res.json().catch(() => ({}));
      showToast(err.error ?? "Could not book class");
    }
    setBusy(false);
  }

  async function cancel(cls: ScheduleClass, series = false) {
    if (!cls.booking) return;
    setBusy(true);
    await fetch(`/api/member/bookings/${cls.booking.id}${series ? "?series=true" : ""}`, { method: "DELETE" });
    setCancelMode(null);
    setSelected(null);
    loadWeek(weekStart);
    showToast(series ? "Series bookings canceled" : "Booking canceled");
    setBusy(false);
  }

  function handleCancelClick(cls: ScheduleClass) {
    if (cls.seriesId) {
      setCancelMode("confirm");
    } else {
      cancel(cls);
    }
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
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5 flex-wrap text-xs">
            {Object.entries(typeColors).map(([type, cls]) => (
              <span key={type} className={`px-2 py-0.5 rounded border ${cls} capitalize hidden sm:inline`}>{type}</span>
            ))}
          </div>
          {/* Export dropdown */}
          <div className="relative">
            <button
              onClick={() => setExportOpen(o => !o)}
              className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm text-gray-300 transition flex items-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export
            </button>
            {exportOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl z-30 overflow-hidden"
                onClick={() => setExportOpen(false)}>
                <a
                  href="/api/member/schedule/export?filter=all"
                  download="my-schedule.ics"
                  className="flex items-center gap-2 px-4 py-3 text-sm text-gray-200 hover:bg-gray-800 transition"
                >
                  <span>📅</span> All classes
                </a>
                <a
                  href="/api/member/schedule/export?filter=booked"
                  download="my-bookings.ics"
                  className="flex items-center gap-2 px-4 py-3 text-sm text-gray-200 hover:bg-gray-800 transition border-t border-gray-800"
                >
                  <span>✓</span> My bookings only
                </a>
              </div>
            )}
          </div>
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
                    const color  = typeColors[cls.program?.type ?? ""] ?? PRESET_COLORS.private;
                    const top    = Math.max(0, (minutesSinceMidnight(cls.startTime) - HOUR_START * 60) * PX_PER_MIN);
                    const height = Math.max(24, (new Date(cls.endTime).getTime() - new Date(cls.startTime).getTime()) / 60000 * PX_PER_MIN);
                    const booked = !!cls.booking && cls.booking.status !== "waitlisted";
                    const waitlisted = cls.booking?.status === "waitlisted";
                    return (
                      <button
                        key={cls.id}
                        onClick={() => setSelected(cls)}
                        className={`absolute left-0.5 right-0.5 rounded border-l-2 px-1 py-0.5 text-left overflow-hidden transition hover:brightness-110 ${color} ${booked ? "ring-2 ring-white ring-offset-1 ring-offset-gray-950 brightness-125" : waitlisted ? "ring-2 ring-amber-400/70" : ""}`}
                        style={{ top, height }}
                      >
                        <div className="text-xs font-semibold leading-tight truncate">{cls.name}</div>
                        {height > 30 && (
                          <div className="text-xs opacity-75 leading-tight truncate" suppressHydrationWarning>
                            {formatTime(cls.startTime)}
                          </div>
                        )}
                        {booked && (
                          <div className="text-xs font-bold text-white drop-shadow leading-tight">✓ Booked</div>
                        )}
                        {waitlisted && height > 30 && (
                          <div className="text-xs font-semibold text-amber-300 leading-tight">Waitlist</div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => { setSelected(null); setCancelMode(null); }}>
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">{selected.name}</h3>
                {selected.program && (
                  <span className="text-sm text-gray-400 capitalize">{selected.program.type} · {selected.program.name}</span>
                )}
              </div>
              <button onClick={() => { setSelected(null); setCancelMode(null); }} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
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
              cancelMode === "confirm" ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-300 text-center mb-1">This class is part of a recurring series.</p>
                  <button
                    onClick={() => cancel(selected, false)}
                    disabled={busy}
                    className="w-full py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm font-semibold text-gray-300 disabled:opacity-50 transition"
                  >
                    {busy ? "Canceling…" : "Cancel this class only"}
                  </button>
                  <button
                    onClick={() => cancel(selected, true)}
                    disabled={busy}
                    className="w-full py-2.5 rounded-lg bg-red-900/40 hover:bg-red-800/60 text-red-400 text-sm font-semibold disabled:opacity-50 transition"
                  >
                    {busy ? "Canceling…" : "Cancel entire series"}
                  </button>
                  <button
                    onClick={() => setCancelMode(null)}
                    disabled={busy}
                    className="w-full py-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-sm text-gray-500 transition"
                  >
                    Keep booking
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className={`text-center text-sm font-medium py-2 rounded-lg ${selected.booking.status === "waitlisted" ? "bg-amber-900/30 text-amber-300" : "bg-green-900/30 text-green-400"}`}>
                    {selected.booking.status === "waitlisted" ? "You're on the waitlist" : "✓ You're booked"}
                  </div>
                  <button onClick={() => handleCancelClick(selected)} disabled={busy}
                    className="w-full py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm text-gray-300 disabled:opacity-50 transition">
                    {busy ? "Canceling…" : "Cancel booking"}
                  </button>
                </div>
              )
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

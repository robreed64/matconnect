"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PRESET_COLORS, buildColorMap } from "@/lib/program-colors";

type Program = { id: number; name: string; type: string };
type ClassEvent = {
  id: number;
  name: string;
  startTime: string;
  endTime: string;
  instructorName: string | null;
  capacity: number | null;
  program: Program | null;
  seriesId: string | null;
  _count?: { bookings: number; attendance: number };
};


const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOUR_START = 6;   // 6am
const HOUR_END   = 22;  // 10pm
const PX_PER_MIN = 1.2; // 72px/hr

function addDays(date: Date, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function toLocalISODate(d: Date) {
  return d.toLocaleDateString("en-CA"); // YYYY-MM-DD
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function minutesSinceMidnight(iso: string) {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

function layoutClasses(classes: ClassEvent[]) {
  if (classes.length === 0) return [];
  const sorted = [...classes].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );
  const colEnds: number[] = [];
  const assignments = sorted.map(cls => {
    const start = new Date(cls.startTime).getTime();
    const end   = new Date(cls.endTime).getTime();
    let col = colEnds.findIndex(t => t <= start);
    if (col === -1) { col = colEnds.length; colEnds.push(end); }
    else colEnds[col] = end;
    return { cls, col };
  });
  return assignments.map(({ cls, col }) => {
    const start = new Date(cls.startTime).getTime();
    const end   = new Date(cls.endTime).getTime();
    const span  = Math.max(
      ...assignments
        .filter(({ cls: o }) => new Date(o.startTime).getTime() < end && new Date(o.endTime).getTime() > start)
        .map(({ col: c }) => c)
    ) + 1;
    return { cls, col, span };
  });
}

export default function WeekCalendar({
  classes,
  weekStartISO,
  canManage = false,
  programTypes = [],
}: {
  classes: ClassEvent[];
  weekStartISO: string;
  canManage?: boolean;
  programTypes?: string[];
}) {
  const typeColors = buildColorMap(programTypes);
  const router    = useRouter();
  const weekStart = new Date(weekStartISO);
  const [selected,    setSelected]    = useState<ClassEvent | null>(null);
  const [deleteMode,  setDeleteMode]  = useState<"confirm" | null>(null);
  const [deleting,    setDeleting]    = useState(false);
  // Derive today on the client only to avoid SSR/client mismatch
  const [today, setToday] = useState("");
  useEffect(() => { setToday(toLocalISODate(new Date())); }, []);

  const gridHeight = (HOUR_END - HOUR_START) * 60 * PX_PER_MIN;

  const prevWeek = () => {
    router.push(`/admin/schedule?week=${toLocalISODate(addDays(weekStart, -7))}`);
  };
  const nextWeek = () => {
    router.push(`/admin/schedule?week=${toLocalISODate(addDays(weekStart, 7))}`);
  };
  const goToday = () => {
    router.push(`/admin/schedule`);
  };

  const deleteClass = async (id: number, series = false) => {
    setDeleting(true);
    await fetch(`/api/admin/classes/${id}${series ? "?series=true" : ""}`, { method: "DELETE" });
    setSelected(null);
    setDeleteMode(null);
    setDeleting(false);
    router.refresh();
  };

  const handleDeleteClick = () => {
    if (selected?.seriesId) {
      setDeleteMode("confirm");
    } else {
      deleteClass(selected!.id);
    }
  };

  const dayDates = DAYS.map((_, i) => addDays(weekStart, i));

  const classesForDay = (date: Date) => {
    const key = toLocalISODate(date);
    return classes.filter((c) => toLocalISODate(new Date(c.startTime)) === key);
  };

  const topPx = (iso: string) => {
    const mins = minutesSinceMidnight(iso) - HOUR_START * 60;
    return Math.max(0, mins * PX_PER_MIN);
  };

  const heightPx = (start: string, end: string) => {
    const dur = (new Date(end).getTime() - new Date(start).getTime()) / 60000;
    return Math.max(24, dur * PX_PER_MIN);
  };

  const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={prevWeek} className="p-2 rounded-lg hover:bg-gray-800 transition text-gray-300">‹</button>
          <button onClick={goToday}  className="px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm text-gray-300 transition">Today</button>
          <button onClick={nextWeek} className="p-2 rounded-lg hover:bg-gray-800 transition text-gray-300">›</button>
          <span className="text-white font-semibold ml-1" suppressHydrationWarning>
            {weekStart.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-2 flex-wrap text-xs">
            {Object.entries(typeColors).map(([type, cls]) => (
              <span key={type} className={`px-2 py-0.5 rounded border ${cls} capitalize`}>{type}</span>
            ))}
          </div>
          {canManage && (
            <Link
              href="/admin/schedule/new"
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-semibold text-white transition"
            >
              + Add Class
            </Link>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto">
        <div className="flex min-w-[700px]">
          {/* Hour labels */}
          <div className="w-14 flex-shrink-0 relative" style={{ height: gridHeight + 32 }}>
            <div className="h-8" /> {/* header spacer */}
            {hours.map((h) => (
              <div
                key={h}
                className="absolute left-0 right-0 text-right pr-2 text-xs text-gray-600"
                style={{ top: 32 + (h - HOUR_START) * 60 * PX_PER_MIN - 8 }}
              >
                {h === 12 ? "12pm" : h > 12 ? `${h - 12}pm` : `${h}am`}
              </div>
            ))}
          </div>

          {/* Day columns */}
          {dayDates.map((date, di) => {
            const dateKey  = toLocalISODate(date);
            const isToday  = dateKey === today;
            const dayCls   = classesForDay(date);

            return (
              <div key={di} className="flex-1 border-l border-gray-800 min-w-0">
                {/* Day header */}
                <div className={`h-8 flex flex-col items-center justify-center text-xs font-medium sticky top-0 z-10 border-b border-gray-800 ${isToday ? "bg-blue-900/40 text-blue-300" : "bg-gray-950 text-gray-400"}`}>
                  <span>{DAYS[di]}</span>
                  <span className={isToday ? "text-blue-400 font-bold" : "text-gray-500"} suppressHydrationWarning>
                    {date.toLocaleDateString("en-US", { month: "numeric", day: "numeric" })}
                  </span>
                </div>

                {/* Time grid body */}
                <div className="relative" style={{ height: gridHeight }}>
                  {/* Hour lines */}
                  {hours.map((h) => (
                    <div
                      key={h}
                      className="absolute left-0 right-0 border-t border-gray-800/60"
                      style={{ top: (h - HOUR_START) * 60 * PX_PER_MIN }}
                    />
                  ))}

                  {/* Class blocks */}
                  {layoutClasses(dayCls).map(({ cls, col, span }) => {
                    const color    = typeColors[cls.program?.type ?? ""] ?? PRESET_COLORS.private;
                    const top      = topPx(cls.startTime);
                    const h        = heightPx(cls.startTime, cls.endTime);
                    const leftPct  = (col / span) * 100;
                    const widthPct = (1 / span) * 100;

                    return (
                      <button
                        key={cls.id}
                        onClick={() => setSelected(cls)}
                        className={`absolute rounded border-l-2 px-1 py-0.5 text-left overflow-hidden transition hover:brightness-110 ${color}`}
                        style={{ top, height: h, left: `calc(${leftPct}% + 2px)`, width: `calc(${widthPct}% - 4px)` }}
                      >
                        <div className="text-xs font-semibold leading-tight truncate">{cls.name}</div>
                        {h > 30 && (
                          <div className="text-xs opacity-75 leading-tight truncate" suppressHydrationWarning>
                            {formatTime(cls.startTime)}
                            {cls.instructorName && ` · ${cls.instructorName}`}
                          </div>
                        )}
                        {h > 48 && cls.capacity && (
                          <div className="text-xs opacity-60">{cls.capacity} max</div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => { setSelected(null); setDeleteMode(null); }}>
          <div
            className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-white">{selected.name}</h3>
                {selected.program && (
                  <span className="text-sm text-gray-400 capitalize">{selected.program.type} · {selected.program.name}</span>
                )}
              </div>
              <button onClick={() => { setSelected(null); setDeleteMode(null); }} className="text-gray-500 hover:text-white text-xl leading-none">×</button>
            </div>

            <div className="space-y-2 text-sm mb-5">
              <Row label="Time">
                <span suppressHydrationWarning>
                  {formatTime(selected.startTime)} – {formatTime(selected.endTime)}
                </span>
              </Row>
              {selected.instructorName && <Row label="Instructor">{selected.instructorName}</Row>}
              {selected.capacity       && <Row label="Capacity">{selected.capacity} students</Row>}
            </div>

            {deleteMode === "confirm" ? (
              <div className="space-y-2">
                <p className="text-sm text-gray-300 text-center mb-1">This class is part of a recurring series.</p>
                <button
                  onClick={() => deleteClass(selected.id, false)}
                  disabled={deleting}
                  className="w-full py-2.5 rounded-lg bg-red-900/40 hover:bg-red-800/60 text-red-400 text-sm font-semibold disabled:opacity-50 transition"
                >
                  {deleting ? "Deleting…" : "Delete this class only"}
                </button>
                <button
                  onClick={() => deleteClass(selected.id, true)}
                  disabled={deleting}
                  className="w-full py-2.5 rounded-lg bg-red-700/60 hover:bg-red-700/80 text-red-200 text-sm font-semibold disabled:opacity-50 transition"
                >
                  {deleting ? "Deleting…" : "Delete entire series"}
                </button>
                <button
                  onClick={() => setDeleteMode(null)}
                  disabled={deleting}
                  className="w-full py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm text-gray-400 transition"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex gap-2 flex-col">
                <Link
                  href={`/admin/schedule/${selected.id}/roster`}
                  className="w-full text-center py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-semibold text-white transition"
                >
                  View Roster
                </Link>
                <div className="flex gap-2">
                  {selected.seriesId ? (
                    <div className="flex-1 flex gap-1.5">
                      <Link
                        href={`/admin/schedule/${selected.id}/edit`}
                        className="flex-1 text-center py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs font-medium transition"
                      >
                        This class
                      </Link>
                      <Link
                        href={`/admin/schedule/${selected.id}/edit-series`}
                        className="flex-1 text-center py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-xs font-medium transition"
                      >
                        Entire series
                      </Link>
                    </div>
                  ) : (
                    <Link
                      href={`/admin/schedule/${selected.id}/edit`}
                      className="flex-1 text-center py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm font-medium transition"
                    >
                      Edit
                    </Link>
                  )}
                  <button
                    onClick={handleDeleteClick}
                    disabled={deleting}
                    className="flex-1 py-2 rounded-lg bg-red-900/40 hover:bg-red-800/60 text-red-400 text-sm font-medium disabled:opacity-50 transition"
                  >
                    {deleting ? "Deleting…" : "Delete"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-200 text-right">{children}</span>
    </div>
  );
}

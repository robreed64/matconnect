"use client";

import { useState, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Member = { id: number; name: string; beltRank: string | null; photoUrl: string | null; status: string };
type Booking = { id: number; status: string; member: Member };
type AttendanceRecord = { id: number; timestamp: string; source: string; member: Member };

type Props = {
  classId: number;
  bookings: Booking[];
  attendance: AttendanceRecord[];
  capacity: number | null;
};

const BELT_DOT: Record<string, string> = {
  white:  "bg-white",
  blue:   "bg-blue-500",
  purple: "bg-purple-600",
  brown:  "bg-amber-700",
  black:  "bg-gray-900 border border-gray-500",
};

const STATUS_STYLES: Record<string, { pill: string; label: string }> = {
  booked:     { pill: "bg-blue-500/15 text-blue-300",   label: "Booked" },
  attended:   { pill: "bg-green-500/15 text-green-400", label: "Attended" },
  no_show:    { pill: "bg-red-500/15 text-red-400",     label: "No-show" },
  canceled:   { pill: "bg-gray-700/50 text-gray-500",   label: "Canceled" },
  waitlisted: { pill: "bg-amber-500/15 text-amber-300", label: "Waitlisted" },
};

function Initials({ name }: { name: string }) {
  const p = name.trim().split(" ");
  const i = p.length >= 2 ? p[0][0] + p[p.length - 1][0] : p[0].slice(0, 2);
  return <span className="text-xs font-bold text-gray-400">{i.toUpperCase()}</span>;
}

function Avatar({ member }: { member: Member }) {
  const dot = member.beltRank ? BELT_DOT[member.beltRank.toLowerCase()] : null;
  return (
    <div className="flex items-center gap-3">
      <div className="relative w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center flex-shrink-0 overflow-hidden border border-gray-600">
        {member.photoUrl
          ? <Image src={member.photoUrl} alt={member.name} fill sizes="32px" className="object-cover" />
          : <Initials name={member.name} />}
      </div>
      <div>
        <div className="text-sm font-medium text-white">{member.name}</div>
        {dot && (
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
            <span className="text-xs text-gray-500 capitalize">{member.beltRank}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default function RosterClient({ classId, bookings: initialBookings, attendance: initialAttendance, capacity }: Props) {
  const router = useRouter();
  const [bookings, setBookings]     = useState<Booking[]>(initialBookings);
  const [attendance]                = useState<AttendanceRecord[]>(initialAttendance);
  const [searchQ, setSearchQ]       = useState("");
  const [searchResults, setSearchResults] = useState<Member[]>([]);
  const [searching, setSearching]   = useState(false);
  const [adding, setAdding]         = useState<number | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Members on roster (by id set)
  const bookedIds = new Set(bookings.map((b) => b.member.id));

  // Walk-in only (attended but no booking)
  const walkInIds = new Set(
    attendance.filter((a) => !bookedIds.has(a.member.id)).map((a) => a.member.id)
  );

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const res  = await fetch(`/api/members/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    setSearchResults(data);
    setSearching(false);
  }, []);

  const onSearchChange = (q: string) => {
    setSearchQ(q);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => search(q), 250);
  };

  const addMember = async (member: Member, markAttended: boolean) => {
    setAdding(member.id);
    const res = await fetch(`/api/admin/classes/${classId}/roster`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId: member.id, markAttended }),
    });
    if (res.ok) {
      const booking = await res.json();
      setBookings((prev) =>
        prev.some((b) => b.member.id === member.id)
          ? prev.map((b) => b.member.id === member.id ? { ...b, status: booking.status } : b)
          : [...prev, { id: booking.id, status: booking.status, member }]
      );
      setSearchQ("");
      setSearchResults([]);
      router.refresh();
    }
    setAdding(null);
  };

  const updateStatus = async (bookingId: number, status: string) => {
    const res = await fetch(`/api/admin/bookings/${bookingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setBookings((prev) => prev.map((b) => b.id === bookingId ? { ...b, status } : b));
      router.refresh();
    }
  };

  const removeBooking = async (bookingId: number) => {
    await fetch(`/api/admin/bookings/${bookingId}`, { method: "DELETE" });
    setBookings((prev) => prev.filter((b) => b.id !== bookingId));
  };

  const attended   = bookings.filter((b) => b.status === "attended").length + walkInIds.size;
  const waitlisted = bookings.filter((b) => b.status === "waitlisted");
  const total      = bookings.filter((b) => b.status !== "canceled" && b.status !== "waitlisted").length;

  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="flex gap-4">
        <Stat label="Enrolled"  value={total} />
        <Stat label="Attended"  value={attended} color="text-green-400" />
        <Stat label="No-shows"  value={bookings.filter((b) => b.status === "no_show").length} color="text-red-400" />
        {waitlisted.length > 0 && <Stat label="Waitlist" value={waitlisted.length} color="text-amber-300" />}
        {capacity && <Stat label="Capacity" value={capacity} />}
      </div>

      {/* Add member search */}
      <div className="relative">
        <label className="block text-sm font-medium text-gray-400 mb-2">Add member to roster</label>
        <div className="relative">
          <input
            type="text"
            placeholder="Search by name…"
            value={searchQ}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm transition"
          />
          {searching && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
          )}
        </div>
        {searchResults.length > 0 && (
          <ul className="absolute z-10 mt-1 w-full bg-gray-800 border border-gray-700 rounded-xl shadow-xl overflow-hidden">
            {searchResults.map((m) => (
              <li key={m.id} className="flex items-center justify-between px-4 py-3 hover:bg-gray-700 transition">
                <Avatar member={m} />
                <div className="flex gap-2 flex-shrink-0 ml-4">
                  {!bookedIds.has(m.id) && (
                    <button
                      onClick={() => addMember(m, false)}
                      disabled={adding === m.id}
                      className="px-3 py-1 rounded-lg bg-gray-700 hover:bg-gray-600 text-xs font-medium text-gray-200 disabled:opacity-50 transition"
                    >
                      Book
                    </button>
                  )}
                  <button
                    onClick={() => addMember(m, true)}
                    disabled={adding === m.id}
                    className="px-3 py-1 rounded-lg bg-green-700 hover:bg-green-600 text-xs font-medium text-white disabled:opacity-50 transition"
                  >
                    {adding === m.id ? "…" : "Check In"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Roster table */}
      <div className="rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 bg-gray-900/60 text-gray-400 text-left">
              <th className="px-4 py-3 font-medium">Member</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {bookings.length === 0 && walkInIds.size === 0 && (
              <tr><td colSpan={3} className="px-4 py-10 text-center text-gray-600">No one on the roster yet</td></tr>
            )}

            {bookings.filter((b) => b.status !== "waitlisted").map((b) => {
              const s = STATUS_STYLES[b.status] ?? STATUS_STYLES.booked;
              return (
                <tr key={b.id} className="hover:bg-gray-900/40 transition">
                  <td className="px-4 py-3">
                    <Link href={`/admin/members/${b.member.id}`} className="hover:opacity-80 transition">
                      <Avatar member={b.member} />
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.pill}`}>{s.label}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {b.status !== "attended" && (
                        <button onClick={() => updateStatus(b.id, "attended")}
                          className="px-2.5 py-1 rounded-lg bg-green-700/40 hover:bg-green-700 text-green-300 text-xs font-medium transition">
                          ✓ Attended
                        </button>
                      )}
                      {b.status !== "no_show" && b.status !== "attended" && (
                        <button onClick={() => updateStatus(b.id, "no_show")}
                          className="px-2.5 py-1 rounded-lg bg-red-700/40 hover:bg-red-700 text-red-300 text-xs font-medium transition">
                          No-show
                        </button>
                      )}
                      {b.status === "attended" && (
                        <button onClick={() => updateStatus(b.id, "no_show")}
                          className="px-2.5 py-1 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-400 text-xs transition">
                          Undo
                        </button>
                      )}
                      <button onClick={() => removeBooking(b.id)}
                        className="px-2.5 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-500 hover:text-red-400 text-xs transition">
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}

            {/* Walk-ins (attended, no booking) */}
            {attendance.filter((a) => walkInIds.has(a.member.id)).map((a) => (
              <tr key={`walkin-${a.id}`} className="hover:bg-gray-900/40 transition">
                <td className="px-4 py-3">
                  <Link href={`/admin/members/${a.member.id}`} className="hover:opacity-80 transition">
                    <Avatar member={a.member} />
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/15 text-green-400">
                    Walk-in ✓
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-600" suppressHydrationWarning>
                  {new Date(a.timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} via {a.source}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Waitlist */}
      {waitlisted.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-amber-300 mb-2">Waitlist ({waitlisted.length})</h3>
          <div className="rounded-xl border border-amber-800/40 overflow-hidden">
            <table className="w-full text-sm">
              <tbody className="divide-y divide-gray-800">
                {[...waitlisted].sort((a, b) => a.id - b.id).map((b, i) => (
                  <tr key={b.id} className="hover:bg-gray-900/40 transition">
                    <td className="px-4 py-3 w-8 text-amber-300/70 text-xs font-bold">#{i + 1}</td>
                    <td className="px-4 py-3">
                      <Link href={`/admin/members/${b.member.id}`} className="hover:opacity-80 transition">
                        <Avatar member={b.member} />
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => updateStatus(b.id, "booked")}
                          className="px-2.5 py-1 rounded-lg bg-amber-700/40 hover:bg-amber-700 text-amber-200 text-xs font-medium transition">
                          Promote
                        </button>
                        <button onClick={() => removeBooking(b.id)}
                          className="px-2.5 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-500 hover:text-red-400 text-xs transition">
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color = "text-white" }: { label: string; value: number; color?: string }) {
  return (
    <div className="bg-[#0f1117] border border-gray-700/50 rounded-xl px-4 py-3 text-center min-w-[80px]">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-0.5">{label}</div>
    </div>
  );
}

"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import KioskExitModal from "./KioskExitModal";
import WaiverScreen from "./WaiverScreen";

const QRScannerView = dynamic(() => import("./QRScannerView"), { ssr: false });

const CONFETTI_COLORS = ["#3b82f6", "#22c55e", "#eab308", "#ef4444", "#a855f7", "#f97316"];

function Confetti() {
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      <style>{`@keyframes kiosk-confetti { 0% { transform: translateY(-5vh) rotate(0deg); opacity: 1; } 100% { transform: translateY(105vh) rotate(720deg); opacity: 0.6; } }`}</style>
      {Array.from({ length: 36 }).map((_, i) => (
        <span
          key={i}
          className="absolute block w-2.5 h-2.5 rounded-sm"
          style={{
            left: `${(i * 137) % 100}%`,
            top: "-3vh",
            backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            animation: `kiosk-confetti ${2.2 + (i % 5) * 0.4}s linear ${(i % 7) * 0.15}s forwards`,
          }}
        />
      ))}
    </div>
  );
}

function MilestoneBanner({ milestone }: { milestone: number }) {
  return (
    <div className="px-4 py-2 rounded-xl bg-yellow-500/15 border border-yellow-500/40 text-yellow-300 font-bold text-lg">
      🎉 {milestone} classes — congratulations!
    </div>
  );
}

type MemberResult = {
  id: number;
  name: string;
  beltRank: string | null;
  ageGroup: string | null;
  status: string;
  photoUrl: string | null;
  trainingType: string | null;
};

type CheckInState = "idle" | "loading" | "success" | "error";
type Mode = "search" | "scan";

const BELT_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  white:  { bg: "bg-white",       text: "text-gray-900", label: "White Belt" },
  blue:   { bg: "bg-blue-600",    text: "text-white",    label: "Blue Belt" },
  purple: { bg: "bg-purple-700",  text: "text-white",    label: "Purple Belt" },
  brown:  { bg: "bg-amber-800",   text: "text-white",    label: "Brown Belt" },
  black:  { bg: "bg-gray-900",    text: "text-white",    label: "Black Belt" },
};

const STATUS_STYLES: Record<string, { badge: string; label: string }> = {
  active:   { badge: "bg-green-500/20 text-green-400 border-green-500/40",   label: "Active" },
  trial:    { badge: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40", label: "Trial" },
  past_due: { badge: "bg-red-500/20 text-red-400 border-red-500/40",         label: "Past Due" },
  inactive: { badge: "bg-gray-500/20 text-gray-400 border-gray-500/40",      label: "Inactive" },
  lead:     { badge: "bg-blue-500/20 text-blue-400 border-blue-500/40",      label: "Lead" },
};

function BeltBadge({ rank }: { rank: string | null }) {
  const belt = rank ? BELT_STYLES[rank.toLowerCase()] : null;
  if (!belt) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${belt.bg} ${belt.text}`}>
      <span className="w-2 h-2 rounded-full bg-current opacity-60" />
      {belt.label}
    </span>
  );
}

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(" ");
  const initials = parts.length >= 2
    ? parts[0][0] + parts[parts.length - 1][0]
    : parts[0].slice(0, 2);
  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-700 text-4xl font-bold text-gray-300 select-none">
      {initials.toUpperCase()}
    </div>
  );
}

export default function KioskPage() {
  const [gymName, setGymName] = useState("BJJ Check-In");
  const [showExit, setShowExit] = useState(false);
  const [mode, setMode] = useState<Mode>("search");

  useEffect(() => {
    fetch("/api/settings/public").then(r => r.json()).then(d => {
      if (d.gymName) setGymName(d.gymName + " Check-In");
      if (d.waiverText) setWaiverText(d.waiverText);
    }).catch(() => {});
  }, []);

  // Fullscreen lock
  useEffect(() => {
    try { document.documentElement.requestFullscreen().catch(() => {}); } catch {}
    const onBeforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", onBeforeUnload);
    history.pushState(null, "", window.location.href);
    const onPopState = () => history.pushState(null, "", window.location.href);
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MemberResult[]>([]);
  const [selected, setSelected] = useState<MemberResult | null>(null);
  const [checkInState, setCheckInState] = useState<CheckInState>("idle");
  const [searching, setSearching] = useState(false);
  const [milestone, setMilestone] = useState<number | null>(null);
  const [waiverText, setWaiverText] = useState("");
  const [waiverFlow, setWaiverFlow] = useState<{ id: number; name: string } | null>(null);
  // QR scan result state
  const [scanResult, setScanResult] = useState<{
    state: "loading" | "success" | "error";
    name?: string;
    beltRank?: string | null;
    milestone?: number | null;
  } | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); setSearching(false); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/members/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => search(query), 250);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [query, search]);

  const handleSelect = (member: MemberResult) => {
    setSelected(member);
    setResults([]);
    setQuery("");
    setCheckInState("idle");
    inputRef.current?.blur();
  };

  const finishSearchSuccess = useCallback((hitMilestone: number | null) => {
    setMilestone(hitMilestone);
    setCheckInState("success");
    setTimeout(() => {
      setSelected(null);
      setCheckInState("idle");
      setMilestone(null);
      inputRef.current?.focus();
    }, hitMilestone ? 5000 : 3000);
  }, []);

  const handleCheckIn = async () => {
    if (!selected) return;
    setCheckInState("loading");
    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: selected.id }),
      });
      // A 2xx with an unparseable body still means the check-in was recorded
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.waiverRequired) {
        setCheckInState("idle");
        setWaiverFlow(data.member);
      } else if (res.ok) {
        finishSearchSuccess(data.milestone ?? null);
      } else {
        setCheckInState("error");
      }
    } catch {
      setCheckInState("error");
    }
  };

  // QR scan handler — auto check-in, no confirmation tap needed
  const handleQRScan = useCallback(async (token: string) => {
    setScanResult({ state: "loading" });
    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      // A 2xx with an unparseable body still means the check-in was recorded
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.waiverRequired) {
        setScanResult(null);
        setWaiverFlow(data.member);
        return;
      }
      if (res.ok) {
        const hitMilestone = data.milestone ?? null;
        setScanResult({ state: "success", name: data.member?.name, beltRank: data.member?.beltRank, milestone: hitMilestone });
        setTimeout(() => setScanResult(null), hitMilestone ? 5000 : 3000);
        return;
      }
      setScanResult({ state: "error" });
    } catch {
      setScanResult({ state: "error" });
    }
    // Reset after 3 seconds and re-open scanner
    setTimeout(() => setScanResult(null), 3000);
  }, []);

  // Waiver signed → check-in completed inside WaiverScreen; route result to the active mode
  const handleWaiverComplete = useCallback((data: { milestone?: number | null; member?: { name: string; beltRank: string | null } }) => {
    setWaiverFlow(null);
    if (mode === "search") {
      finishSearchSuccess(data.milestone ?? null);
    } else {
      const hitMilestone = data.milestone ?? null;
      setScanResult({ state: "success", name: data.member?.name, beltRank: data.member?.beltRank ?? null, milestone: hitMilestone });
      setTimeout(() => setScanResult(null), hitMilestone ? 5000 : 3000);
    }
  }, [mode, finishSearchSuccess]);

  const handleReset = () => {
    setSelected(null);
    setQuery("");
    setResults([]);
    setCheckInState("idle");
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const belt = selected?.beltRank ? BELT_STYLES[selected.beltRank.toLowerCase()] : null;

  return (
    <div className="min-h-dvh flex flex-col items-center bg-gray-950 px-4 pt-12 pb-8 relative">
      {/* Hidden admin exit button */}
      <div className="absolute top-3 right-3 group">
        <button
          onClick={() => setShowExit(true)}
          className="w-9 h-9 rounded-full flex items-center justify-center text-transparent group-hover:text-gray-600 transition-colors duration-500"
          aria-label="Admin exit"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </button>
      </div>

      {showExit && <KioskExitModal onClose={() => setShowExit(false)} />}

      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-black tracking-tight text-white">{gymName}</h1>

        {/* Mode toggle */}
        <div className="mt-5 inline-flex rounded-xl bg-gray-800 p-1 gap-1">
          <button
            onClick={() => { setMode("search"); setScanResult(null); }}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${mode === "search" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}
          >
            Search by name
          </button>
          <button
            onClick={() => { setMode("scan"); setSelected(null); setQuery(""); setResults([]); }}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition ${mode === "scan" ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white"}`}
          >
            Scan QR code
          </button>
        </div>
      </div>

      {/* ── WAIVER FLOW (either mode) ── */}
      {waiverFlow && (
        <WaiverScreen
          member={waiverFlow}
          waiverText={waiverText}
          onComplete={handleWaiverComplete}
          onCancel={() => setWaiverFlow(null)}
        />
      )}

      {/* ── SEARCH MODE ── */}
      {!waiverFlow && mode === "search" && (
        <>
          {!selected && (
            <div className="w-full max-w-xl relative">
              <div className="relative">
                <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                </svg>
                <input
                  ref={inputRef}
                  autoFocus
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Type your name..."
                  className="w-full pl-12 pr-4 py-5 text-xl rounded-2xl bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition"
                />
                {searching && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <div className="w-5 h-5 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
                  </div>
                )}
              </div>

              {results.length > 0 && (
                <ul className="absolute top-full mt-2 w-full bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl overflow-hidden z-10">
                  {results.map((m) => {
                    const statusStyle = STATUS_STYLES[m.status] ?? STATUS_STYLES.inactive;
                    const beltStyle = m.beltRank ? BELT_STYLES[m.beltRank.toLowerCase()] : null;
                    return (
                      <li key={m.id}>
                        <button
                          onClick={() => handleSelect(m)}
                          className="w-full flex items-center gap-4 px-5 py-4 hover:bg-gray-700 transition text-left"
                        >
                          <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border-2 border-gray-600">
                            {m.photoUrl
                              ? <Image src={m.photoUrl} alt={m.name} width={40} height={40} className="object-cover w-full h-full" />
                              : <Initials name={m.name} />
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-white truncate">{m.name}</div>
                            <div className="text-sm text-gray-400">{m.trainingType ?? "—"}</div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {beltStyle && (
                              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${beltStyle.bg} ${beltStyle.text}`}>
                                {beltStyle.label}
                              </span>
                            )}
                            <span className={`px-2 py-0.5 rounded border text-xs font-medium ${statusStyle.badge}`}>
                              {statusStyle.label}
                            </span>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {query.length >= 2 && !searching && results.length === 0 && (
                <p className="mt-4 text-center text-gray-500">No members found for &ldquo;{query}&rdquo;</p>
              )}
            </div>
          )}

          {selected && (
            <div className="w-full max-w-sm">
              <div className={`rounded-3xl overflow-hidden shadow-2xl border transition-all duration-300 ${
                checkInState === "success" ? "border-green-500/60 shadow-green-500/20"
                : checkInState === "error"  ? "border-red-500/60"
                : "border-gray-700"
              }`}>
                {belt && <div className={`h-2 w-full ${belt.bg}`} />}
                <div className="bg-gray-900 p-8 flex flex-col items-center text-center gap-4">
                  <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-gray-700 flex-shrink-0">
                    {selected.photoUrl
                      ? <Image src={selected.photoUrl} alt={selected.name} width={112} height={112} className="object-cover w-full h-full" />
                      : <Initials name={selected.name} />
                    }
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold text-white">{selected.name}</h2>
                    <div className="mt-2 flex items-center justify-center gap-2 flex-wrap">
                      <BeltBadge rank={selected.beltRank} />
                      {selected.ageGroup && <span className="text-sm text-gray-400 capitalize">{selected.ageGroup}</span>}
                    </div>
                  </div>
                  {(() => {
                    const s = STATUS_STYLES[selected.status] ?? STATUS_STYLES.inactive;
                    return <span className={`px-3 py-1 rounded-full border text-sm font-medium ${s.badge}`}>{s.label}</span>;
                  })()}

                  {checkInState === "success" ? (
                    <div className="mt-2 flex flex-col items-center gap-2">
                      {milestone && <Confetti />}
                      <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                        <svg className="w-9 h-9 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <p className="text-green-400 font-semibold text-lg">Checked In!</p>
                      {milestone && <MilestoneBanner milestone={milestone} />}
                      <p className="text-gray-500 text-sm">See you on the mats</p>
                    </div>
                  ) : checkInState === "error" ? (
                    <div className="mt-2 flex flex-col items-center gap-3 w-full">
                      <p className="text-red-400 font-medium">Check-in failed</p>
                      <button onClick={handleCheckIn} className="w-full py-4 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-bold text-lg transition">Try Again</button>
                    </div>
                  ) : (
                    <button onClick={handleCheckIn} disabled={checkInState === "loading"}
                      className="mt-2 w-full py-5 rounded-2xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-60 text-white font-bold text-xl transition-colors">
                      {checkInState === "loading"
                        ? <span className="flex items-center justify-center gap-2"><span className="w-5 h-5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Checking in…</span>
                        : "Check In"}
                    </button>
                  )}
                </div>
              </div>
              {checkInState !== "success" && (
                <button onClick={handleReset} className="mt-5 w-full py-3 rounded-2xl text-gray-400 hover:text-white hover:bg-gray-800 text-sm font-medium transition">
                  ← Back to search
                </button>
              )}
            </div>
          )}

          <Link href="/kiosk/new" className="mt-8 inline-block px-6 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-base font-semibold text-white transition">
            I&apos;m new here — Sign up
          </Link>
        </>
      )}

      {/* ── SCAN MODE ── */}
      {!waiverFlow && mode === "scan" && (
        <div className="flex flex-col items-center gap-6 w-full max-w-xs">
          {scanResult ? (
            <div className={`w-full rounded-3xl border p-8 flex flex-col items-center gap-4 text-center transition-all ${
              scanResult.state === "success" ? "border-green-500/60 bg-gray-900" : "border-red-500/60 bg-gray-900"
            }`}>
              {scanResult.state === "loading" && (
                <>
                  <div className="w-12 h-12 border-4 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
                  <p className="text-gray-400">Checking in…</p>
                </>
              )}
              {scanResult.state === "success" && (
                <>
                  {scanResult.milestone && <Confetti />}
                  <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center">
                    <svg className="w-9 h-9 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  {scanResult.name && (
                    <>
                      <p className="text-white text-2xl font-bold">{scanResult.name}</p>
                      <BeltBadge rank={scanResult.beltRank ?? null} />
                    </>
                  )}
                  <p className="text-green-400 font-semibold text-lg">Checked In!</p>
                  {scanResult.milestone && <MilestoneBanner milestone={scanResult.milestone} />}
                  <p className="text-gray-500 text-sm">See you on the mats</p>
                </>
              )}
              {scanResult.state === "error" && (
                <>
                  <p className="text-red-400 font-semibold text-lg">Check-in failed</p>
                  <p className="text-gray-500 text-sm">Invalid QR or membership canceled</p>
                </>
              )}
            </div>
          ) : (
            <QRScannerView onScan={handleQRScan} />
          )}

        </div>
      )}
    </div>
  );
}

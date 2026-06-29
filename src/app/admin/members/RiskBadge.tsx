import type { RiskBand, RiskReason } from "@/lib/risk-scoring";

const BAND_STYLES: Record<RiskBand, { pill: string; label: string }> = {
  high:   { pill: "bg-red-500/15 text-red-400 border-red-500/30",      label: "High" },
  medium: { pill: "bg-amber-500/15 text-amber-300 border-amber-500/30", label: "Medium" },
  low:    { pill: "bg-green-500/15 text-green-400 border-green-500/30",  label: "Low" },
};

/** Colored pill showing risk band + numeric score, e.g. "High · 75". */
export function RiskPill({ score, band }: { score: number; band: RiskBand }) {
  const s = BAND_STYLES[band];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-xs font-semibold ${s.pill}`}>
      {s.label} · {score}
    </span>
  );
}

/** Reason chips explaining a score; shows up to `max`, then "+n more". */
export function RiskReasons({ reasons, max = 3 }: { reasons: RiskReason[]; max?: number }) {
  if (reasons.length === 0) return <span className="text-gray-600 text-xs">—</span>;
  const shown = reasons.slice(0, max);
  const extra = reasons.length - shown.length;
  return (
    <div className="flex flex-wrap gap-1.5">
      {shown.map((r) => (
        <span
          key={r.code}
          className="text-xs text-gray-300 bg-gray-800 border border-gray-700/60 rounded px-1.5 py-0.5"
        >
          {r.label}
        </span>
      ))}
      {extra > 0 && <span className="text-xs text-gray-500 self-center">+{extra} more</span>}
    </div>
  );
}

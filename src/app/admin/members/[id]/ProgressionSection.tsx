"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BELT_TECHNIQUES, BELT_STYLES } from "@/lib/belt-data";

type TechRecord = { techniqueName: string; mastered: boolean };
type Requirement = { minClasses: number; minMonths: number; minTechniques: number } | null;

type Props = {
  memberId: number;
  currentBelt: string | null;
  nextBelt: string | null;
  totalClasses: number;
  monthsTraining: number;
  requirement: Requirement;
  initialTechniques: TechRecord[];
  readOnly?: boolean;
};

function pct(value: number, min: number) {
  return min === 0 ? 100 : Math.min(100, Math.round((value / min) * 100));
}

function ProgressBar({ value, min, label }: { value: number; min: number; label: string }) {
  const p = pct(value, min);
  const color = p >= 100 ? "bg-green-500" : p >= 75 ? "bg-yellow-500" : "bg-blue-500";
  const textColor = p >= 100 ? "text-green-400" : p >= 75 ? "text-yellow-400" : "text-gray-300";
  return (
    <div>
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs text-gray-500">{label}</span>
        <span className={`text-xs font-semibold ${textColor}`}>{value}/{min} ({p}%)</span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${p}%` }} />
      </div>
    </div>
  );
}

export default function ProgressionSection({
  memberId, nextBelt, totalClasses, monthsTraining, requirement, initialTechniques, readOnly = false,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [techniques, setTechniques] = useState<TechRecord[]>(initialTechniques);
  const [promoting, setPromoting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  if (!nextBelt) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-xs font-semibold tracking-wide text-gray-400 mb-3">Belt Progression</h2>
        <p className="text-sm text-yellow-400 font-medium">Black belt — highest rank achieved.</p>
      </div>
    );
  }

  const techList    = BELT_TECHNIQUES[nextBelt] ?? [];
  const masteredSet = new Set(techniques.filter((t) => t.mastered).map((t) => t.techniqueName));
  const masteredCount = masteredSet.size;

  const nextStyle = BELT_STYLES[nextBelt];
  const req = requirement ?? { minClasses: 0, minMonths: 0, minTechniques: 0 };

  const overallPct = Math.round(
    (pct(totalClasses, req.minClasses) + pct(monthsTraining, req.minMonths) + pct(masteredCount, req.minTechniques)) / 3
  );
  const ready = totalClasses >= req.minClasses && monthsTraining >= req.minMonths && masteredCount >= req.minTechniques;

  const toggleTechnique = async (techniqueName: string, mastered: boolean) => {
    // Optimistic update
    setTechniques((prev) => {
      const exists = prev.find((t) => t.techniqueName === techniqueName);
      if (exists) return prev.map((t) => t.techniqueName === techniqueName ? { ...t, mastered } : t);
      return [...prev, { techniqueName, mastered }];
    });

    await fetch(`/api/admin/members/${memberId}/techniques`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ beltRank: nextBelt, techniqueName, mastered }),
    });
  };

  const promote = async () => {
    setPromoting(true);
    const res = await fetch(`/api/admin/members/${memberId}/promote`, { method: "POST" });
    if (res.ok) {
      startTransition(() => router.refresh());
    }
    setPromoting(false);
    setShowConfirm(false);
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-semibold tracking-wide text-gray-400">Belt Progression</h2>
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${nextStyle.bg} ${nextStyle.text}`}>
            → {nextBelt}
          </span>
          <span className={`text-sm font-bold ${overallPct >= 100 ? "text-green-400" : overallPct >= 75 ? "text-yellow-400" : "text-blue-400"}`}>
            {overallPct}%
          </span>
        </div>
      </div>

      {/* Progress bars */}
      <div className="space-y-3 mb-5">
        <ProgressBar value={totalClasses}  min={req.minClasses}    label="Classes attended" />
        <ProgressBar value={monthsTraining} min={req.minMonths}    label="Months training" />
        <ProgressBar value={masteredCount}  min={req.minTechniques} label={`Techniques mastered (${nextBelt})`} />
      </div>

      {/* Promote button */}
      {!readOnly && (
        <div className="mb-5">
          {!showConfirm ? (
            <button
              onClick={() => setShowConfirm(true)}
              disabled={isPending}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                ready
                  ? "bg-green-700 hover:bg-green-600 text-white"
                  : "bg-gray-800 hover:bg-gray-700 text-gray-300"
              }`}
            >
              {ready ? "Promote to " : "Promote early to "}
              <span className="capitalize">{nextBelt}</span>
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-300">Promote to <span className="font-semibold capitalize">{nextBelt}</span>?</span>
              <button
                onClick={promote}
                disabled={promoting}
                className="px-4 py-1.5 rounded-lg bg-green-700 hover:bg-green-600 text-white text-xs font-semibold transition disabled:opacity-50"
              >
                {promoting ? "…" : "Confirm"}
              </button>
              <button onClick={() => setShowConfirm(false)} className="text-xs text-gray-500 hover:text-gray-300 transition">
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      {/* Technique checklist */}
      {techList.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              {nextBelt} Techniques ({masteredCount}/{techList.length})
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {techList.map((tech) => {
              const checked = masteredSet.has(tech);
              return (
                <label
                  key={tech}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition group ${readOnly ? "cursor-default" : "hover:bg-gray-800 cursor-pointer"}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={readOnly ? undefined : (e) => toggleTechnique(tech, e.target.checked)}
                    readOnly={readOnly}
                    className={`w-4 h-4 rounded border-gray-600 bg-gray-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 focus:ring-1 ${readOnly ? "cursor-default" : "cursor-pointer"}`}
                  />
                  <span className={`text-xs transition ${checked ? "text-green-400 line-through decoration-green-700" : "text-gray-400 group-hover:text-gray-200"}`}>
                    {tech}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

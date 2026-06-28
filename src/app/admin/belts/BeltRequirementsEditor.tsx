"use client";

import { useState } from "react";

type Requirement = {
  id?: number;
  beltRank: string;
  minClasses: number;
  minMonths: number;
  minTechniques: number;
};

const BELT_COLORS: Record<string, string> = {
  blue:   "bg-blue-600 text-white",
  purple: "bg-purple-700 text-white",
  brown:  "bg-amber-800 text-white",
  black:  "bg-gray-900 text-white border border-gray-600",
};

export default function BeltRequirementsEditor({ initial }: { initial: Requirement[] }) {
  const [reqs,   setReqs]   = useState<Requirement[]>(initial);
  const [saving, setSaving] = useState(false);
  const [saved,  setSaved]  = useState(false);

  const update = (beltRank: string, field: keyof Omit<Requirement, "id" | "beltRank">, value: number) => {
    setSaved(false);
    setReqs((prev) => prev.map((r) => r.beltRank === beltRank ? { ...r, [field]: value } : r));
  };

  const save = async () => {
    setSaving(true);
    const res = await fetch("/api/admin/belts/requirements", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(reqs),
    });
    if (res.ok) {
      const updated = await res.json();
      setReqs(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
    setSaving(false);
  };

  return (
    <div className="bg-[#0f1117] border border-gray-700/50 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
        <h2 className="text-xs font-semibold tracking-wide text-gray-400">Promotion Requirements</h2>
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold transition"
        >
          {saving ? "Saving…" : saved ? "Saved ✓" : "Save"}
        </button>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 text-gray-500 text-xs">
            <th className="px-5 py-3 text-left font-medium">Belt</th>
            <th className="px-5 py-3 text-left font-medium">Min Classes</th>
            <th className="px-5 py-3 text-left font-medium">Min Months</th>
            <th className="px-5 py-3 text-left font-medium">Min Techniques</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {reqs.map((r) => (
            <tr key={r.beltRank} className="hover:bg-gray-800/40 transition">
              <td className="px-5 py-3">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize ${BELT_COLORS[r.beltRank] ?? "bg-gray-700 text-white"}`}>
                  {r.beltRank}
                </span>
              </td>
              {(["minClasses", "minMonths", "minTechniques"] as const).map((field) => (
                <td key={field} className="px-5 py-3">
                  <input
                    type="number"
                    min={0}
                    value={r[field]}
                    onChange={(e) => update(r.beltRank, field, parseInt(e.target.value) || 0)}
                    className="w-24 px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500 transition"
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Belt = { key: string; name: string; color: string; maxStripes: number };

export default function BeltSetupClient({ belts: initial }: { belts: Belt[] }) {
  const router  = useRouter();
  const [belts, setBelts] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<"idle" | "ok" | "error">("idle");

  const update = (i: number, field: keyof Belt, value: string | number) =>
    setBelts(prev => prev.map((b, idx) => idx === i ? { ...b, [field]: value } : b));

  const addBelt = () =>
    setBelts(prev => [...prev, { key: `belt_${Date.now()}`, name: "New Belt", color: "#6b7280", maxStripes: 4 }]);

  const removeBelt = (i: number) => setBelts(prev => prev.filter((_, idx) => idx !== i));

  const save = async () => {
    setSaving(true);
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ beltConfig: belts }),
    });
    setSaving(false);
    setStatus(res.ok ? "ok" : "error");
    if (res.ok) { router.refresh(); setTimeout(() => setStatus("idle"), 2500); }
  };

  const inp = "px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500";

  return (
    <div className="space-y-3">
      <div className="bg-[#0f1117] border border-gray-700/50 rounded-2xl p-6 space-y-3">
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-3 items-center text-xs text-gray-500 mb-1 px-1">
          <span>Color</span><span>Name</span><span>Max Stripes</span><span></span>
        </div>

        {belts.map((belt, i) => (
          <div key={belt.key} className="grid grid-cols-[auto_1fr_auto_auto] gap-3 items-center">
            <input
              type="color"
              value={belt.color}
              onChange={e => update(i, "color", e.target.value)}
              className="w-10 h-9 rounded-lg cursor-pointer border border-gray-700 bg-gray-800 p-0.5"
            />
            <input
              className={`${inp} w-full`}
              value={belt.name}
              onChange={e => update(i, "name", e.target.value)}
              placeholder="Belt name"
            />
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Stripes:</span>
              <input
                type="number" min="0" max="20"
                className={`${inp} w-16 text-center`}
                value={belt.maxStripes}
                onChange={e => update(i, "maxStripes", parseInt(e.target.value) || 0)}
              />
            </div>
            <button
              onClick={() => removeBelt(i)}
              disabled={belts.length <= 1}
              className="text-gray-600 hover:text-red-400 transition disabled:opacity-30 px-2"
            >
              ✕
            </button>
          </div>
        ))}

        <button onClick={addBelt} className="text-sm text-blue-400 hover:text-blue-300 transition mt-2">
          + Add Belt
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-sm transition"
        >
          {saving ? "Saving…" : status === "ok" ? "Saved ✓" : "Save Belt Config"}
        </button>
        {status === "error" && <span className="text-red-400 text-sm">Save failed.</span>}
      </div>

      <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 mt-4">
        <p className="text-xs text-gray-500">Preview:</p>
        <div className="flex flex-wrap gap-3 mt-3">
          {belts.map(b => (
            <div key={b.key} className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-full border border-gray-600" style={{ backgroundColor: b.color }} />
              <span className="text-sm text-gray-300">{b.name}</span>
              {b.maxStripes > 0 && (
                <div className="flex gap-0.5">
                  {Array.from({ length: Math.min(b.maxStripes, 4) }).map((_, i) => (
                    <div key={i} className="w-2 h-4 rounded-sm bg-gray-700 border border-gray-600" />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

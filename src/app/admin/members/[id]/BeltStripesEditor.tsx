"use client";

import { useState } from "react";

export default function BeltStripesEditor({
  memberId,
  currentStripes,
  maxStripes,
  readOnly = false,
}: {
  memberId: number;
  currentStripes: number;
  maxStripes: number;
  readOnly?: boolean;
}) {
  const [stripes, setStripes] = useState(currentStripes);
  const [saving, setSaving] = useState(false);

  const setStripe = async (n: number) => {
    if (readOnly) return;
    const next = stripes === n ? 0 : n;
    setSaving(true);
    const res = await fetch(`/api/admin/members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ beltStripes: next }),
    });
    setSaving(false);
    if (res.ok) setStripes(next);
  };

  if (maxStripes === 0) return null;

  return (
    <div className="flex items-center gap-1.5" title={`${stripes} stripe${stripes !== 1 ? "s" : ""}`}>
      {Array.from({ length: maxStripes }, (_, i) => i + 1).map(n => (
        readOnly ? (
          <span
            key={n}
            className={`w-3.5 h-3.5 rounded-full border-2 ${
              n <= stripes ? "bg-white border-white" : "bg-transparent border-gray-500"
            }`}
          />
        ) : (
          <button
            key={n}
            onClick={() => setStripe(n)}
            disabled={saving}
            aria-label={`Set ${n} stripe${n !== 1 ? "s" : ""}`}
            className={`w-3.5 h-3.5 rounded-full border-2 transition-all disabled:opacity-40 ${
              n <= stripes
                ? "bg-white border-white"
                : "bg-transparent border-gray-500 hover:border-gray-300"
            }`}
          />
        )
      ))}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  memberId: number;
  discountApplied: boolean;
  discountPercent: number;
  hasActiveSubscription: boolean;
};

export default function FamilyDiscountActions({ memberId, discountApplied, discountPercent, hasActiveSubscription }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!hasActiveSubscription) {
    return <span className="text-xs text-gray-700">No subscription</span>;
  }

  async function apply() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/admin/families/${memberId}/discount`, { method: "POST" });
    if (res.ok) {
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Failed to apply discount");
    }
    setLoading(false);
  }

  async function remove() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/admin/families/${memberId}/discount`, { method: "DELETE" });
    if (res.ok) {
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Failed to remove discount");
    }
    setLoading(false);
  }

  return (
    <span className="flex items-center gap-2">
      {discountApplied ? (
        <>
          <span className="text-xs text-green-400 bg-green-900/30 px-2 py-0.5 rounded-full">
            {discountPercent}% off
          </span>
          <button
            onClick={remove}
            disabled={loading}
            className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50 transition"
          >
            {loading ? "…" : "Remove"}
          </button>
        </>
      ) : (
        <button
          onClick={apply}
          disabled={loading}
          className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-50 transition"
        >
          {loading ? "Applying…" : `Apply ${discountPercent}% discount`}
        </button>
      )}
      {error && <span className="text-xs text-red-400">{error}</span>}
    </span>
  );
}

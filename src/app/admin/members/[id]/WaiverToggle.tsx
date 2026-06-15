"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function WaiverToggle({ memberId, waiverSignedAt, readOnly = false }: { memberId: number; waiverSignedAt: string | null; readOnly?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const setWaiver = async (signed: boolean) => {
    if (!signed && !confirm("Clear the waiver record? The member will be asked to sign at the kiosk on their next check-in.")) return;
    setBusy(true);
    await fetch(`/api/admin/members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ waiverSigned: signed }),
    });
    setBusy(false);
    router.refresh();
  };

  return waiverSignedAt ? (
    <span className="inline-flex items-center gap-2 text-xs text-gray-400">
      <span className="text-green-400">✓ Waiver signed</span>
      {new Date(waiverSignedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
      {!readOnly && (
        <button onClick={() => setWaiver(false)} disabled={busy}
          className="text-gray-600 hover:text-red-400 transition disabled:opacity-50">
          clear
        </button>
      )}
    </span>
  ) : (
    <span className="inline-flex items-center gap-2 text-xs">
      <span className="text-amber-400">⚠ No waiver on file — kiosk will require signing</span>
      {!readOnly && (
        <button onClick={() => setWaiver(true)} disabled={busy}
          className="px-2 py-0.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 transition disabled:opacity-50">
          {busy ? "…" : "Mark signed (paper)"}
        </button>
      )}
    </span>
  );
}

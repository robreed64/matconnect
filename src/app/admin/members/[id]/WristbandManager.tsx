"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function WristbandManager({
  memberId,
  initialRfidToken,
  readOnly = false,
}: {
  memberId: number;
  initialRfidToken: string | null;
  readOnly?: boolean;
}) {
  const router = useRouter();
  const [rfidToken, setRfidToken] = useState(initialRfidToken);
  const [showModal, setShowModal] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [tapMode, setTapMode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const save = async (token: string | null) => {
    setBusy(true);
    setError(null);
    const res = await fetch(`/api/admin/members/${memberId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rfidToken: token }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      setError(data?.error ?? "Failed to save — try again");
      return;
    }
    setRfidToken(token);
    setShowModal(false);
    setInputValue("");
    setTapMode(false);
    router.refresh();
  };

  const handleRemove = () => save(null);

  const handleAssign = () => {
    const uid = inputValue.trim().toUpperCase().replace(/\s/g, "");
    if (!uid) { setError("Enter or tap a wristband UID"); return; }
    save(uid);
  };

  const enableTapMode = () => {
    setTapMode(true);
    setInputValue("");
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  const maskedUid = rfidToken
    ? `···· ${rfidToken.slice(-4)}`
    : null;

  return (
    <div className="space-y-3">
      {rfidToken ? (
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-sm text-green-400 font-medium">Wristband assigned</span>
            <span className="ml-2 text-xs text-gray-500 font-mono">{maskedUid}</span>
          </div>
          {!readOnly && (
            <button
              onClick={handleRemove}
              disabled={busy}
              className="text-xs text-gray-500 hover:text-red-400 transition disabled:opacity-50"
            >
              Remove
            </button>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-gray-500">No wristband assigned</span>
          {!readOnly && (
            <button
              onClick={() => { setShowModal(true); setError(null); }}
              className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition"
            >
              Assign Wristband
            </button>
          )}
        </div>
      )}

      {!showModal && error && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      {showModal && (
        <div role="dialog" aria-modal="true" aria-labelledby="wristband-modal-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-[#0f1117] border border-gray-700/50 rounded-xl p-6 w-full max-w-sm mx-4 shadow-xl">
            <h3 id="wristband-modal-title" className="text-sm font-semibold text-white mb-4">Assign Wristband</h3>

            <div className="space-y-3">
              {tapMode ? (
                <p className="text-xs text-gray-400">
                  Tap the wristband on the USB reader at the desk…
                </p>
              ) : (
                <p className="text-xs text-gray-400">
                  Tap the wristband on the desk USB reader, or type the UID printed on it.
                </p>
              )}

              <input
                ref={inputRef}
                type="text"
                aria-label="Wristband UID"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value.toUpperCase())}
                onKeyDown={(e) => { if (e.key === "Enter") handleAssign(); }}
                placeholder="e.g. A3F2C1D4"
                className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 font-mono focus:outline-none focus:border-gray-400"
              />

              {error && <p className="text-xs text-red-400">{error}</p>}

              <div className="flex gap-2 pt-1">
                {!tapMode && (
                  <button
                    onClick={enableTapMode}
                    className="flex-1 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm text-gray-300 transition"
                  >
                    Tap to assign
                  </button>
                )}
                <button
                  onClick={handleAssign}
                  disabled={busy || !inputValue.trim()}
                  className="flex-1 py-2 rounded-lg bg-white text-gray-900 text-sm font-medium hover:bg-gray-100 transition disabled:opacity-40"
                >
                  {busy ? "Saving…" : "Confirm"}
                </button>
                <button
                  onClick={() => { setShowModal(false); setTapMode(false); setInputValue(""); setError(null); }}
                  disabled={busy}
                  className="px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-gray-300 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PasswordInput from "@/components/PasswordInput";

export default function KioskExitModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!email || !password) { setError("Email and password required"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/kiosk/exit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.ok) {
        try { await document.exitFullscreen(); } catch {}
        router.push("/admin");
      } else {
        const data = await res.json();
        setError(data.error ?? "Invalid credentials");
        setLoading(false);
      }
    } catch {
      setError("Network error");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0f1117] border border-gray-700/50 rounded-2xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <h2 className="text-base font-bold text-white">Admin Exit</h2>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="space-y-3">
          <input
            type="text" inputMode="email" autoComplete="email" autoCorrect="off" autoCapitalize="none"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Admin email"
            autoFocus
            className="w-full px-3 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500 transition"
          />
          <PasswordInput
            value={password}
            onChange={e => setPassword(e.target.value)}
            onKeyDown={e => e.key === "Enter" && submit()}
            placeholder="Password"
            className="w-full px-3 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500 transition"
          />
        </div>
        <div className="flex gap-3 pt-1">
          <button
            onClick={submit}
            disabled={loading}
            className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-sm transition"
          >
            {loading ? "Verifying…" : "Exit Kiosk"}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

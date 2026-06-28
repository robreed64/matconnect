"use client";

import { useState, FormEvent } from "react";
import { signIn } from "next-auth/react";
import PasswordInput from "@/components/PasswordInput";

export default function ChangePasswordForm({ email }: { email: string }) {
  const [current, setCurrent] = useState("");
  const [next, setNext]       = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (next !== confirm) { setError("New passwords don't match."); return; }
    setLoading(true);

    try {
      const res = await fetch("/api/account/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Could not change password.");
        setLoading(false);
        return;
      }

      // Re-sign-in with the new password so the session token drops the
      // must-change flag, then continue to the right home page
      await signIn("credentials", { email, password: next, redirect: false });
      window.location.href = "/dashboard";
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  const inp = "w-full px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm transition";

  return (
    <div className="min-h-dvh bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-black tracking-tight text-white">Set a new password</h1>
          <p className="text-gray-500 mt-2 text-sm">
            Your temporary password was good for one login — choose your own to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-[#0f1117] border border-gray-700/50 rounded-2xl p-6 space-y-4">
          {error && (
            <div className="bg-red-900/30 border border-red-800 text-red-300 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Temporary password</label>
            <PasswordInput required autoComplete="current-password" value={current}
              onChange={(e) => setCurrent(e.target.value)} className={inp} placeholder="••••••••" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">New password</label>
            <PasswordInput required autoComplete="new-password" value={next}
              onChange={(e) => setNext(e.target.value)} className={inp} placeholder="At least 8 characters" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Confirm new password</label>
            <PasswordInput required autoComplete="new-password" value={confirm}
              onChange={(e) => setConfirm(e.target.value)} className={inp} placeholder="Repeat new password" />
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-sm transition">
            {loading ? "Saving…" : "Set password & continue"}
          </button>
        </form>
      </div>
    </div>
  );
}

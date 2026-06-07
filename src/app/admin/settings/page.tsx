"use client";

import { useState, FormEvent } from "react";

export default function SettingsPage() {
  const [current,  setCurrent]  = useState("");
  const [next,     setNext]     = useState("");
  const [confirm,  setConfirm]  = useState("");
  const [status,   setStatus]   = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [message,  setMessage]  = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage("");

    if (next !== confirm) {
      setStatus("error");
      setMessage("New passwords do not match.");
      return;
    }
    if (next.length < 6) {
      setStatus("error");
      setMessage("New password must be at least 6 characters.");
      return;
    }

    const res = await fetch("/api/admin/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: current, newPassword: next }),
    });

    const data = await res.json();
    if (res.ok) {
      setStatus("ok");
      setMessage("Password updated successfully.");
      setCurrent(""); setNext(""); setConfirm("");
    } else {
      setStatus("error");
      setMessage(data.error ?? "Something went wrong.");
    }
  };

  return (
    <div className="p-8 max-w-md">
      <h1 className="text-2xl font-bold text-white mb-6">Settings</h1>

      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Change Password</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {status === "ok" && (
            <div className="bg-green-900/30 border border-green-800 text-green-300 text-sm rounded-lg px-4 py-3">
              {message}
            </div>
          )}
          {status === "error" && (
            <div className="bg-red-900/30 border border-red-800 text-red-300 text-sm rounded-lg px-4 py-3">
              {message}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Current Password</label>
            <input
              type="password"
              required
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">New Password</label>
            <input
              type="password"
              required
              value={next}
              onChange={(e) => setNext(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-blue-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Confirm New Password</label>
            <input
              type="password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-blue-500 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={status === "loading"}
            className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-sm transition"
          >
            {status === "loading" ? "Updating…" : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PasswordInput from "@/components/PasswordInput";

export default function CreateMemberAccount({
  memberId,
  memberName,
  existingEmail,
}: {
  memberId:      number;
  memberName:    string;
  existingEmail: string | null;
}) {
  const router = useRouter();
  const [open,          setOpen]          = useState(false);
  const [resetOpen,     setResetOpen]     = useState(false);
  const [email,         setEmail]         = useState(existingEmail ?? "");
  const [password,      setPassword]      = useState("");
  const [resetPw,       setResetPw]       = useState("");
  const [showPw,        setShowPw]        = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [resetSaving,   setResetSaving]   = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [resetError,    setResetError]    = useState<string | null>(null);
  const [removing,      setRemoving]      = useState(false);

  const hasAccount = !!existingEmail;

  const create = async () => {
    setError(null);
    if (!email || !password) { setError("Email and password are required."); return; }
    setSaving(true);
    const res = await fetch(`/api/admin/members/${memberId}/portal-account`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ email, password }),
    });
    setSaving(false);
    if (res.ok) {
      setOpen(false);
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to create account.");
    }
  };

  const remove = async () => {
    if (!confirm(`Remove portal access for ${memberName}?`)) return;
    setRemoving(true);
    await fetch(`/api/admin/members/${memberId}/portal-account`, { method: "DELETE" });
    setRemoving(false);
    router.refresh();
  };

  const resetPassword = async () => {
    if (resetPw.length < 8) { setResetError("Minimum 8 characters"); return; }
    setResetSaving(true); setResetError(null);
    const res = await fetch(`/api/admin/members/${memberId}/portal-account`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: resetPw }),
    });
    setResetSaving(false);
    if (res.ok) { setResetOpen(false); setResetPw(""); }
    else { const d = await res.json(); setResetError(d.error ?? "Failed"); }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {hasAccount ? (
          <>
            <span className="text-xs text-green-400 bg-green-900/30 px-2 py-1 rounded-lg">
              Portal: {existingEmail}
            </span>
            <button onClick={() => { setResetOpen(true); setResetPw(""); setResetError(null); }}
              className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition">
              Reset Password
            </button>
            <button onClick={remove} disabled={removing}
              className="text-xs px-3 py-1.5 rounded-lg bg-red-900/40 text-red-400 hover:bg-red-800 hover:text-white transition disabled:opacity-40">
              {removing ? "Removing…" : "Remove Access"}
            </button>
          </>
        ) : (
          <button onClick={() => { setOpen(true); setError(null); setPassword(""); }}
            className="text-xs px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition">
            + Create Member Account
          </button>
        )}
      </div>

      {open && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6">
            <h2 className="text-base font-bold text-white mb-4">Create Member Portal Account</h2>
            <p className="text-sm text-gray-400 mb-4">
              This gives <strong className="text-white">{memberName}</strong> access to log in and view their own progress, attendance, and schedule.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Email</label>
                <input value={email} onChange={(e) => setEmail(e.target.value)} type="text" inputMode="email" autoComplete="email" autoCorrect="off" autoCapitalize="none"
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500 transition"
                  placeholder="member@email.com" />
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Password</label>
                <div className="relative">
                  <input value={password} onChange={(e) => setPassword(e.target.value)}
                    type={showPw ? "text" : "password"}
                    className="w-full px-3 py-2 pr-10 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500 transition"
                    placeholder="Min. 8 characters" />
                  <button type="button" onClick={() => setShowPw((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition">
                    {showPw ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={create} disabled={saving}
                className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-sm transition">
                {saving ? "Creating…" : "Create Account"}
              </button>
              <button onClick={() => setOpen(false)}
                className="px-4 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {resetOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md p-6">
            <h2 className="text-base font-bold text-white mb-4">Reset Portal Password</h2>
            <p className="text-sm text-gray-400 mb-4">
              Set a new password for <strong className="text-white">{memberName}</strong>&apos;s portal account.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">New Password</label>
                <PasswordInput
                  value={resetPw}
                  onChange={e => setResetPw(e.target.value)}
                  placeholder="Min. 8 characters"
                  className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500 transition"
                />
              </div>
              {resetError && <p className="text-sm text-red-400">{resetError}</p>}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={resetPassword} disabled={resetSaving}
                className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-sm transition">
                {resetSaving ? "Saving…" : "Save Password"}
              </button>
              <button onClick={() => setResetOpen(false)}
                className="px-4 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

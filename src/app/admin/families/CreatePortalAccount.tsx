"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Member = { id: number; name: string; email: string | null };

export default function CreatePortalAccount({ members }: { members: Member[] }) {
  const router   = useRouter();
  const [memberId, setMemberId] = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState("");

  const onMemberChange = (id: string) => {
    setMemberId(id);
    const m = members.find((m) => String(m.id) === id);
    if (m?.email) setEmail(m.email);
  };

  const submit = async () => {
    setError(""); setSuccess("");
    if (!memberId || !email || !password) { setError("All fields required."); return; }
    setSaving(true);
    const res = await fetch("/api/admin/families", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId: Number(memberId), email, password }),
    });
    const data = await res.json();
    if (res.ok) {
      setSuccess(`Portal account created for ${data.name} (${data.email})`);
      setMemberId(""); setEmail(""); setPassword("");
      router.refresh();
    } else {
      setError(data.error ?? "Failed to create account.");
    }
    setSaving(false);
  };

  return (
    <div className="space-y-3">
      {error   && <p className="text-red-400 text-sm">{error}</p>}
      {success && <p className="text-green-400 text-sm">{success}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <select
          value={memberId}
          onChange={(e) => onMemberChange(e.target.value)}
          className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500 transition"
        >
          <option value="">Select member…</option>
          {members.map((m) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
        <input
          type="text" inputMode="email" autoComplete="email" autoCorrect="off" autoCapitalize="none"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500 transition placeholder-gray-500"
        />
        <div className="relative">
          <input
            type={showPw ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 pr-9 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500 transition placeholder-gray-500"
          />
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPw((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition"
            aria-label={showPw ? "Hide password" : "Show password"}
          >
            {showPw ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
              </svg>
            )}
          </button>
        </div>
      </div>
      <button
        onClick={submit}
        disabled={saving}
        className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold transition"
      >
        {saving ? "Creating…" : "Create Portal Account"}
      </button>
    </div>
  );
}

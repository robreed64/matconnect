"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import PasswordInput from "@/components/PasswordInput";

type Child = { id: number; name: string; ageGroup: string | null; beltRank: string | null; attendanceCount: number };
type Family = { id: number; name: string; beltRank: string | null; portalEmail: string | null; children: Child[] };

export default function FamiliesSetupClient({ families: initial }: { families: Family[] }) {
  const router = useRouter();
  const [families, setFamilies] = useState(initial);
  const [resetModal, setResetModal] = useState<number | null>(null);
  const [newPw, setNewPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  const unlinkChild = async (childId: number, parentId: number) => {
    if (!confirm("Remove this child from the family?")) return;
    const res = await fetch(`/api/admin/members/${childId}/parent`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parentId: null }),
    });
    if (res.ok) {
      setFamilies(prev =>
        prev.map(f =>
          f.id === parentId
            ? { ...f, children: f.children.filter(c => c.id !== childId) }
            : f
        ).filter(f => f.children.length > 0)
      );
      router.refresh();
    }
  };

  const removePortal = async (parentId: number) => {
    if (!confirm("Remove portal access for this family?")) return;
    const res = await fetch(`/api/admin/members/${parentId}/portal-account`, { method: "DELETE" });
    if (res.ok) {
      setFamilies(prev => prev.map(f => f.id === parentId ? { ...f, portalEmail: null } : f));
    }
  };

  const resetPassword = async (parentId: number) => {
    if (newPw.length < 8) { setPwError("Min 8 characters"); return; }
    setPwSaving(true); setPwError("");
    const res = await fetch(`/api/admin/members/${parentId}/portal-account`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPw }),
    });
    const data = await res.json();
    if (!res.ok) { setPwError(data.error ?? "Failed"); setPwSaving(false); return; }
    setPwSaving(false);
    setResetModal(null);
    setNewPw("");
  };

  if (families.length === 0) {
    return (
      <div className="bg-[#0f1117] border border-gray-700/50 rounded-2xl p-8 text-center">
        <p className="text-gray-500 text-sm">No family groups yet.</p>
        <p className="text-gray-600 text-xs mt-2">Link children to a parent from the member&apos;s detail page.</p>
        <Link href="/admin/members" className="inline-block mt-4 text-sm text-blue-400 hover:underline">Browse Members →</Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {families.map(f => (
        <div key={f.id} className="bg-[#0f1117] border border-gray-700/50 rounded-2xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Link href={`/admin/members/${f.id}`} className="font-semibold text-white hover:text-blue-400 transition">{f.name}</Link>
              <span className="ml-2 text-xs text-gray-600 capitalize">{f.beltRank ?? "unranked"}</span>
              {f.portalEmail
                ? <p className="text-xs text-green-400 mt-0.5">Portal: {f.portalEmail}</p>
                : <p className="text-xs text-gray-600 mt-0.5">No portal account</p>}
            </div>
            <div className="flex gap-2">
              {f.portalEmail ? (
                <>
                  <button onClick={() => { setResetModal(f.id); setNewPw(""); setPwError(""); }}
                    className="text-xs px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 transition">
                    Reset Password
                  </button>
                  <button onClick={() => removePortal(f.id)}
                    className="text-xs px-2 py-1 rounded bg-red-900/30 hover:bg-red-900/60 border border-red-800/40 text-red-400 transition">
                    Remove Access
                  </button>
                </>
              ) : (
                <Link href={`/admin/families`} className="text-xs px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 transition">
                  Create Portal
                </Link>
              )}
            </div>
          </div>

          {/* Children */}
          <div className="mt-4 pl-4 border-l border-gray-800 space-y-2">
            {f.children.map(c => (
              <div key={c.id} className="flex items-center justify-between">
                <div>
                  <Link href={`/admin/members/${c.id}`} className="text-sm text-gray-300 hover:text-white transition">{c.name}</Link>
                  <span className="ml-2 text-xs text-gray-600 capitalize">{c.ageGroup ?? ""} · {c.beltRank ?? "unranked"} · {c.attendanceCount} classes</span>
                </div>
                <button onClick={() => unlinkChild(c.id, f.id)} className="text-xs text-gray-600 hover:text-red-400 transition">Unlink</button>
              </div>
            ))}
          </div>

          {/* Password reset modal inline */}
          {resetModal === f.id && (
            <div className="mt-4 p-4 rounded-xl bg-gray-800 border border-gray-700 space-y-3">
              <p className="text-sm font-medium text-white">Reset Portal Password</p>
              {pwError && <p className="text-xs text-red-400">{pwError}</p>}
              <PasswordInput
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                placeholder="New password (min 8 chars)"
                className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-white text-sm focus:outline-none"
              />
              <div className="flex gap-2">
                <button onClick={() => resetPassword(f.id)} disabled={pwSaving}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium disabled:opacity-50 transition">
                  {pwSaving ? "Saving…" : "Save Password"}
                </button>
                <button onClick={() => setResetModal(null)} className="px-3 py-1.5 rounded-lg bg-gray-700 text-xs text-gray-300 transition">Cancel</button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

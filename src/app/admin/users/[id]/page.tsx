"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import PasswordInput from "@/components/PasswordInput";

const input = "w-full px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm";
const select = "w-full px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-blue-500 text-sm";

type User = { id: number; email: string; name: string; role: string };

export default function EditUserPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [user,     setUser]     = useState<User | null>(null);
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [role,     setRole]     = useState("front_desk");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [deleting,   setDeleting]   = useState(false);

  useEffect(() => {
    fetch(`/api/admin/users/${id}`)
      .then(r => r.json())
      .then((u: User) => {
        setUser(u);
        setName(u.name);
        setEmail(u.email);
        setRole(u.role);
      });
  }, [id]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setSaveStatus("loading");

    const body: Record<string, string> = { name, email, role };
    if (password) body.password = password;

    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      setSaveStatus("error");
    } else {
      setSaveStatus("ok");
      setPassword("");
      setTimeout(() => setSaveStatus("idle"), 2500);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete account for ${user?.name}? This cannot be undone.`)) return;
    setDeleting(true);
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/admin/users");
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error ?? "Failed to delete");
      setDeleting(false);
    }
  };

  if (!user) return <div className="p-8 text-gray-500 text-sm">Loading…</div>;

  return (
    <div className="p-8 max-w-lg">
      <div className="mb-6">
        <Link href="/admin/users" className="text-sm text-gray-500 hover:text-gray-300 transition">
          ← Back to Users
        </Link>
        <h1 className="text-2xl font-bold mt-2">Edit Account</h1>
      </div>

      <form onSubmit={handleSave} className="bg-[#0f1117] border border-gray-700/50 rounded-2xl p-6 space-y-4">
        {error && (
          <div className="bg-red-900/30 border border-red-800 text-red-300 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}
        {saveStatus === "ok" && (
          <div className="bg-green-900/30 border border-green-800 text-green-300 text-sm rounded-lg px-4 py-3">
            Saved.
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Full Name</label>
          <input type="text" required value={name} onChange={e => setName(e.target.value)} className={input} />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Email</label>
          <input type="text" inputMode="email" autoComplete="email" autoCorrect="off" autoCapitalize="none" required value={email} onChange={e => setEmail(e.target.value)} className={input} />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Role</label>
          <select value={role} onChange={e => setRole(e.target.value)} className={select}>
            <option value="admin">Admin — full access</option>
            <option value="manager">Manager — all except settings & users</option>
            <option value="front_desk">Front Desk — members, POS, schedule, kiosk</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">New Password (leave blank to keep current)</label>
          <PasswordInput
            value={password}
            onChange={e => setPassword(e.target.value)}
            className={input} placeholder="Min 6 characters"
            autoComplete="new-password"
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            type="submit" disabled={saveStatus === "loading"}
            className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-sm transition"
          >
            {saveStatus === "loading" ? "Saving…" : saveStatus === "ok" ? "Saved ✓" : "Save Changes"}
          </button>
          <button
            type="button" onClick={handleDelete} disabled={deleting}
            className="px-4 py-2 rounded-lg bg-red-900/30 hover:bg-red-900/60 border border-red-800 text-red-400 text-sm font-medium transition disabled:opacity-50"
          >
            {deleting ? "Deleting…" : "Delete Account"}
          </button>
        </div>
      </form>
    </div>
  );
}

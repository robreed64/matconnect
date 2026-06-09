"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PasswordInput from "@/components/PasswordInput";

const input = "w-full px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm";
const select = "w-full px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-blue-500 text-sm";

export default function NewUserPage() {
  const router = useRouter();
  const [name,     setName]     = useState("");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [role,     setRole]     = useState("front_desk");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const res = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      setLoading(false);
      return;
    }

    router.refresh();
    router.push("/admin/users");
  };

  return (
    <div className="p-8 max-w-lg">
      <div className="mb-6">
        <Link href="/admin/users" className="text-sm text-gray-500 hover:text-gray-300 transition">
          ← Back to Users
        </Link>
        <h1 className="text-2xl font-bold mt-2">Add Staff Account</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
        {error && (
          <div className="bg-red-900/30 border border-red-800 text-red-300 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Full Name</label>
          <input
            type="text" required value={name}
            onChange={e => setName(e.target.value)}
            className={input} placeholder="Jane Smith"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Email</label>
          <input
            type="email" required value={email}
            onChange={e => setEmail(e.target.value)}
            className={input} placeholder="jane@yourgym.com"
          />
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
          <label className="block text-xs font-medium text-gray-400 mb-1">Temporary Password</label>
          <PasswordInput
            required value={password}
            onChange={e => setPassword(e.target.value)}
            className={input} placeholder="Min 6 characters"
            autoComplete="new-password"
          />
          <p className="text-xs text-gray-600 mt-1">The user can change this from Settings after they log in.</p>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit" disabled={loading}
            className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-sm transition"
          >
            {loading ? "Creating…" : "Create Account"}
          </button>
          <Link
            href="/admin/users"
            className="px-5 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm font-medium text-gray-300 transition"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

"use client";

import { useState, useEffect, FormEvent, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import PasswordInput from "@/components/PasswordInput";

function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl  = searchParams.get("callbackUrl") ?? "/dashboard";

  const [gymName,   setGymName]  = useState("BJJ Admin");
  const [email,     setEmail]    = useState("");
  const [password,  setPassword] = useState("");
  const [error,     setError]    = useState("");
  const [loading,   setLoading]  = useState(false);

  useEffect(() => {
    fetch("/api/settings/public").then(r => r.json()).then(d => {
      if (d.gymName) setGymName(d.gymName);
    }).catch(() => {});
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error || result?.ok === false) {
        setError("Invalid email or password.");
        setLoading(false);
      } else {
        window.location.href = callbackUrl;
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh bg-gray-950 flex items-center justify-center px-4 relative overflow-hidden">
      {/* Ambient radial glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[500px] w-[700px] -translate-x-1/2 rounded-full bg-blue-600/10 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-black tracking-tight text-white">{gymName}</h1>
          <p className="text-gray-500 mt-2 text-sm">Sign in to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm px-4 py-3">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold tracking-wide text-gray-400 mb-1.5">Email</label>
              <input
                type="text" inputMode="email" autoComplete="email" autoCorrect="off" autoCapitalize="none"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#0f1117] border border-gray-700/50 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-sm transition"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold tracking-wide text-gray-400 mb-1.5">Password</label>
              <PasswordInput
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-[#0f1117] border border-gray-700/50 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 text-sm transition"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] disabled:opacity-50 text-white font-semibold text-sm transition"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

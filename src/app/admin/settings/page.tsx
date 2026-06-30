"use client";

import { useState, useEffect, useRef, FormEvent, useCallback } from "react";
import { useRouter } from "next/navigation";
import PasswordInput from "@/components/PasswordInput";

type GymSettings = {
  gymName: string;
  gymEmail: string;
  gymPhone: string;
  gymAddress: string;
  logoUrl: string;
  waiverText: string;
  currency: string;
  currencySymbol: string;
  locale: string;
  timezone: string;
  defaultTaxRate: number;
  paymentProvider: string;
  stripePublishableKey: string | null;
  stripeSecretKey: string | null;
  stripeWebhookSecret: string | null;
  squareAccessToken: string | null;
  squareApplicationId: string | null;
  squareLocationId: string | null;
  squareWebhookSignatureKey: string | null;
  squareEnvironment: string;
  squareTerminalDeviceId: string | null;
  brevoApiKey: string | null;
  brevoSenderEmail: string | null;
  brevoSenderName: string | null;
  brevoSmsFrom: string | null;
  familyDiscountEnabled: boolean;
  familyDiscountPercent: number;
  trialLengthDays: number;
};

function maskKey(key: string | null | undefined): string {
  if (!key) return "";
  if (key.length <= 8) return "****";
  return key.slice(0, 7) + "****" + key.slice(-4);
}

function stripeMode(key: string | null | undefined): "live" | "test" | null {
  if (!key) return null;
  if (key.includes("_live_")) return "live";
  if (key.includes("_test_")) return "test";
  return null;
}

const CURRENCIES = [
  { value: "usd", symbol: "$",   locale: "en-US", label: "USD — US Dollar ($)" },
  { value: "cad", symbol: "CA$", locale: "en-CA", label: "CAD — Canadian Dollar (CA$)" },
  { value: "gbp", symbol: "£",   locale: "en-GB", label: "GBP — British Pound (£)" },
  { value: "eur", symbol: "€",   locale: "de-DE", label: "EUR — Euro (€)" },
  { value: "aud", symbol: "A$",  locale: "en-AU", label: "AUD — Australian Dollar (A$)" },
];

const TIMEZONES = [
  "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
  "America/Phoenix", "America/Anchorage", "Pacific/Honolulu",
  "America/Toronto", "America/Vancouver",
  "Europe/London", "Europe/Paris", "Europe/Berlin",
  "Australia/Sydney", "Australia/Melbourne", "Pacific/Auckland",
];

const input = "w-full px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm";
const select = "w-full px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-blue-500 text-sm";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-[#0f1117] border border-gray-700/50 rounded-2xl p-6 space-y-4">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">{title}</h2>
      {children}
    </div>
  );
}

function SaveButton({ loading, status }: { loading: boolean; status: "idle" | "loading" | "ok" | "error" }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-sm transition"
    >
      {loading ? "Saving…" : status === "ok" ? "Saved ✓" : "Save"}
    </button>
  );
}

type ApiKeyRecord = {
  id: string;
  name: string;
  prefix: string;
  lastUsedAt: string | null;
  enabled: boolean;
  createdAt: string;
};

function IntegrationsSection() {
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [creating, setCreating] = useState(false);
  const [rawKey, setRawKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadKeys = useCallback(async () => {
    const res = await fetch("/api/admin/api-keys");
    if (res.ok) setKeys(await res.json());
  }, []);

  useEffect(() => { loadKeys(); }, [loadKeys]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    setCreating(true);
    const res = await fetch("/api/admin/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newKeyName.trim() }),
    });
    if (res.ok) {
      const data = await res.json();
      setRawKey(data.rawKey);
      setNewKeyName("");
      loadKeys();
    }
    setCreating(false);
  }

  async function toggleEnabled(id: string, enabled: boolean) {
    await fetch(`/api/admin/api-keys/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    loadKeys();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this API key? Any integration using it will stop working immediately.")) return;
    await fetch(`/api/admin/api-keys/${id}`, { method: "DELETE" });
    loadKeys();
  }

  function copyKey() {
    if (!rawKey) return;
    navigator.clipboard.writeText(rawKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Section title="Integrations — API Keys">
      <p className="text-sm text-gray-400">
        Use API keys to connect external tools like WordPress plugins to your MatConnect data.
        Each key is shown only once when created.
      </p>

      {rawKey && (
        <div className="bg-green-900/20 border border-green-700 rounded-xl p-4 space-y-2">
          <p className="text-sm text-green-300 font-semibold">API key created — copy it now, it won&apos;t be shown again.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-gray-900 rounded-lg px-3 py-2 text-xs text-green-200 font-mono break-all">
              {rawKey}
            </code>
            <button
              onClick={copyKey}
              className="px-3 py-2 rounded-lg bg-green-700 hover:bg-green-600 text-white text-xs font-medium transition shrink-0"
            >
              {copied ? "Copied ✓" : "Copy"}
            </button>
          </div>
          <button
            onClick={() => setRawKey(null)}
            className="text-xs text-gray-500 hover:text-gray-400 transition"
          >
            Dismiss
          </button>
        </div>
      )}

      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          value={newKeyName}
          onChange={e => setNewKeyName(e.target.value)}
          placeholder="Key label (e.g. My WordPress Site)"
          className={input + " flex-1"}
        />
        <button
          type="submit"
          disabled={creating || !newKeyName.trim()}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-sm font-semibold transition shrink-0"
        >
          {creating ? "Creating…" : "Generate Key"}
        </button>
      </form>

      {keys.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-gray-700">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-left text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Key prefix</th>
                <th className="px-4 py-2">Last used</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id} className="border-b border-gray-800 last:border-0">
                  <td className="px-4 py-3 text-white font-medium">{k.name}</td>
                  <td className="px-4 py-3 font-mono text-gray-400 text-xs">{k.prefix}…</td>
                  <td className="px-4 py-3 text-gray-400">
                    {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : "Never"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleEnabled(k.id, !k.enabled)}
                      className={`text-xs font-medium px-2 py-0.5 rounded-full transition ${
                        k.enabled
                          ? "bg-green-900/40 text-green-400 hover:bg-red-900/40 hover:text-red-400"
                          : "bg-red-900/40 text-red-400 hover:bg-green-900/40 hover:text-green-400"
                      }`}
                    >
                      {k.enabled ? "Active" : "Disabled"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDelete(k.id)}
                      className="text-xs text-gray-600 hover:text-red-400 transition"
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {keys.length === 0 && !rawKey && (
        <p className="text-sm text-gray-600">No API keys yet. Generate one above to connect your WordPress plugin.</p>
      )}
    </Section>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<GymSettings | null>(null);
  const [origin, setOrigin] = useState("");
  const embedRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setOrigin(window.location.origin); }, []);

  // Stripe state (new values typed by user — separate from what's stored)
  const [stripePk,      setStripePk]      = useState("");
  const [stripeSk,      setStripeSk]      = useState("");
  const [stripeWh,      setStripeWh]      = useState("");
  const [stripeStatus,  setStripeStatus]  = useState<"idle" | "loading" | "ok" | "error">("idle");

  // Square state
  const [squareToken,   setSquareToken]   = useState("");
  const [squareWh,      setSquareWh]      = useState("");
  const [squareStatus,  setSquareStatus]  = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [providerStatus, setProviderStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [subStats, setSubStats] = useState<{ stripeActive: number; squareActive: number } | null>(null);

  // Terminal pairing state
  const [pairing, setPairing] = useState<{ id: string; code: string | null } | null>(null);
  const [pairError, setPairError] = useState<string | null>(null);

  // Brevo state
  const [brevoKey,      setBrevoKey]      = useState("");
  const [brevoStatus,   setBrevoStatus]   = useState<"idle" | "loading" | "ok" | "error">("idle");

  // Password change state
  const [pwCurrent, setPwCurrent]  = useState("");
  const [pwNext,    setPwNext]     = useState("");
  const [pwConfirm, setPwConfirm]  = useState("");
  const [pwStatus,  setPwStatus]   = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [pwMsg,     setPwMsg]      = useState("");

  // Per-section save status
  const [infoStatus,     setInfoStatus]     = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [regionStatus,   setRegionStatus]   = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [waiverStatus,   setWaiverStatus]   = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [taxStatus,      setTaxStatus]      = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [discountStatus, setDiscountStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [trialStatus,    setTrialStatus]    = useState<"idle" | "loading" | "ok" | "error">("idle");

  useEffect(() => {
    fetch("/api/admin/settings").then(r => r.json()).then(setSettings);
    fetch("/api/admin/payments/stats").then(r => r.json()).then(setSubStats).catch(() => {});
  }, []);

  // Poll pairing status while a device code is outstanding
  useEffect(() => {
    if (!pairing) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/admin/square/device-code?id=${pairing.id}`);
        const data = await res.json();
        if (data.status === "PAIRED" && data.deviceId) {
          setPairing(null);
          setSettings(s => s ? { ...s, squareTerminalDeviceId: data.deviceId } : s);
        } else if (data.status === "EXPIRED") {
          setPairing(null);
          setPairError("Pairing code expired — try again");
        }
      } catch { /* keep polling */ }
    }, 3000);
    return () => clearInterval(interval);
  }, [pairing]);

  const startPairing = async () => {
    setPairError(null);
    const res = await fetch("/api/admin/square/device-code", { method: "POST" });
    const data = await res.json().catch(() => null);
    if (res.ok && data?.id) setPairing({ id: data.id, code: data.code });
    else setPairError(data?.error ?? "Could not create a pairing code");
  };

  const handleSquare = async (e: FormEvent) => {
    e.preventDefault();
    setSquareStatus("loading");
    const payload: Record<string, string> = {
      // Non-secret fields always reflect what's on screen
      squareApplicationId: settings!.squareApplicationId ?? "",
      squareLocationId:    settings!.squareLocationId ?? "",
      squareEnvironment:   settings!.squareEnvironment || "sandbox",
    };
    if (squareToken.trim()) payload.squareAccessToken = squareToken.trim();
    if (squareWh.trim())    payload.squareWebhookSignatureKey = squareWh.trim();
    const ok = await patch(payload as Partial<GymSettings>);
    if (ok) { setSquareToken(""); setSquareWh(""); router.refresh(); }
    setSquareStatus(ok ? "ok" : "error");
    setTimeout(() => setSquareStatus("idle"), 2500);
  };

  const patch = async (data: Partial<GymSettings>) => {
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) setSettings(s => s ? { ...s, ...data } : s);
    return res.ok;
  };

  const handleCurrency = (val: string) => {
    const c = CURRENCIES.find(c => c.value === val);
    if (c && settings) setSettings({ ...settings, currency: c.value, currencySymbol: c.symbol, locale: c.locale });
  };

  const save = async (
    fields: Partial<GymSettings>,
    setStatus: (s: "idle" | "loading" | "ok" | "error") => void
  ) => {
    setStatus("loading");
    const ok = await patch(fields);
    setStatus(ok ? "ok" : "error");
    if (ok) router.refresh();
    setTimeout(() => setStatus("idle"), 2500);
  };

  const handleStripe = async (e: FormEvent) => {
    e.preventDefault();
    setStripeStatus("loading");
    const payload: Record<string, string> = {};
    if (stripePk.trim()) payload.stripePublishableKey = stripePk.trim();
    if (stripeSk.trim()) payload.stripeSecretKey      = stripeSk.trim();
    if (stripeWh.trim()) payload.stripeWebhookSecret  = stripeWh.trim();
    if (!Object.keys(payload).length) { setStripeStatus("idle"); return; }
    const ok = await patch(payload as Partial<GymSettings>);
    if (ok) { setStripePk(""); setStripeSk(""); setStripeWh(""); router.refresh(); }
    setStripeStatus(ok ? "ok" : "error");
    setTimeout(() => setStripeStatus("idle"), 2500);
  };

  const handleBrevo = async (e: FormEvent) => {
    e.preventDefault();
    setBrevoStatus("loading");
    const payload: Record<string, string> = {};
    if (brevoKey.trim()) payload.brevoApiKey = brevoKey.trim();
    if (settings!.brevoSenderEmail !== null) payload.brevoSenderEmail = settings!.brevoSenderEmail ?? "";
    if (settings!.brevoSenderName  !== null) payload.brevoSenderName  = settings!.brevoSenderName  ?? "";
    if (settings!.brevoSmsFrom     !== null) payload.brevoSmsFrom     = settings!.brevoSmsFrom     ?? "";
    // always send the non-secret fields from current settings
    const full = {
      brevoSenderEmail: settings!.brevoSenderEmail ?? "",
      brevoSenderName:  settings!.brevoSenderName  ?? "",
      brevoSmsFrom:     settings!.brevoSmsFrom     ?? "",
      ...payload,
    };
    const ok = await patch(full as Partial<GymSettings>);
    if (ok) { setBrevoKey(""); router.refresh(); }
    setBrevoStatus(ok ? "ok" : "error");
    setTimeout(() => setBrevoStatus("idle"), 2500);
  };

  const handlePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPwStatus("loading"); setPwMsg("");
    if (pwNext !== pwConfirm) { setPwStatus("error"); setPwMsg("Passwords do not match."); return; }
    if (pwNext.length < 6)    { setPwStatus("error"); setPwMsg("Min 6 characters."); return; }
    const res = await fetch("/api/admin/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: pwCurrent, newPassword: pwNext }),
    });
    const d = await res.json();
    if (res.ok) { setPwStatus("ok"); setPwMsg("Password updated."); setPwCurrent(""); setPwNext(""); setPwConfirm(""); }
    else        { setPwStatus("error"); setPwMsg(d.error ?? "Something went wrong."); }
  };

  if (!settings) return <div className="p-8 text-gray-500 text-sm">Loading…</div>;

  return (
    <div className="p-8 max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-white">Settings</h1>

      {/* Gym Info */}
      <Section title="Gym Information">
        <form onSubmit={e => { e.preventDefault(); save({ gymName: settings.gymName, gymEmail: settings.gymEmail, gymPhone: settings.gymPhone, gymAddress: settings.gymAddress, logoUrl: settings.logoUrl }, setInfoStatus); }} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Gym Name</label>
            <input type="text" required value={settings.gymName} onChange={e => setSettings({ ...settings, gymName: e.target.value })} className={input} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Email</label>
              <input type="email" autoComplete="email" autoCorrect="off" autoCapitalize="none" value={settings.gymEmail} onChange={e => setSettings({ ...settings, gymEmail: e.target.value })} className={input} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Phone</label>
              <input type="tel" value={settings.gymPhone} onChange={e => setSettings({ ...settings, gymPhone: e.target.value })} className={input} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Address</label>
            <input type="text" value={settings.gymAddress} onChange={e => setSettings({ ...settings, gymAddress: e.target.value })} className={input} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Logo URL</label>
            <input type="url" value={settings.logoUrl} onChange={e => setSettings({ ...settings, logoUrl: e.target.value })} className={input} placeholder="https://yourgym.com/logo.png" />
          </div>
          <SaveButton loading={infoStatus === "loading"} status={infoStatus} />
        </form>
      </Section>

      {/* Region */}
      <Section title="Region & Currency">
        <form onSubmit={e => { e.preventDefault(); save({ currency: settings.currency, currencySymbol: settings.currencySymbol, locale: settings.locale, timezone: settings.timezone }, setRegionStatus); }} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Currency</label>
            <select value={settings.currency} onChange={e => handleCurrency(e.target.value)} className={select}>
              {CURRENCIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Timezone</label>
            <select value={settings.timezone} onChange={e => setSettings({ ...settings, timezone: e.target.value })} className={select}>
              {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz.replace("_", " ")}</option>)}
            </select>
          </div>
          <SaveButton loading={regionStatus === "loading"} status={regionStatus} />
        </form>
      </Section>

      {/* Waiver */}
      <Section title="Liability Waiver">
        <form onSubmit={e => { e.preventDefault(); save({ waiverText: settings.waiverText }, setWaiverStatus); }} className="space-y-4">
          <p className="text-xs text-gray-500">Members read and sign this at enrollment.</p>
          <textarea
            value={settings.waiverText}
            onChange={e => setSettings({ ...settings, waiverText: e.target.value })}
            rows={12}
            className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm font-mono focus:outline-none focus:border-blue-500 resize-y"
          />
          <SaveButton loading={waiverStatus === "loading"} status={waiverStatus} />
        </form>
      </Section>

      {/* Tax */}
      <Section title="Tax & POS">
        <form onSubmit={e => { e.preventDefault(); save({ defaultTaxRate: settings.defaultTaxRate }, setTaxStatus); }} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Default Tax Rate (%)</label>
            <input
              type="number" min={0} max={100} step={0.01}
              value={settings.defaultTaxRate}
              onChange={e => setSettings({ ...settings, defaultTaxRate: parseFloat(e.target.value) || 0 })}
              className="w-48 px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-blue-500 text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">Applied to new POS items by default. Override per item as needed.</p>
          </div>
          <SaveButton loading={taxStatus === "loading"} status={taxStatus} />
        </form>
      </Section>

      {/* Trials */}
      <Section title="Trials">
        <form onSubmit={e => { e.preventDefault(); save({ trialLengthDays: settings.trialLengthDays }, setTrialStatus); }} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Trial Length (days)</label>
            <input
              type="number" min={1} max={365}
              value={settings.trialLengthDays}
              onChange={e => setSettings({ ...settings, trialLengthDays: parseInt(e.target.value) || 14 })}
              className="w-48 px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-blue-500 text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              Used for the days-remaining badge on trial members and the &ldquo;Trial Expiring&rdquo; marketing trigger.
            </p>
          </div>
          <SaveButton loading={trialStatus === "loading"} status={trialStatus} />
        </form>
      </Section>

      {/* Payment Provider */}
      <Section title="Payment Provider">
        <form onSubmit={e => { e.preventDefault(); save({ paymentProvider: settings.paymentProvider }, setProviderStatus); }} className="space-y-4">
          <p className="text-xs text-gray-500">
            New enrollments, subscriptions, and POS card payments run on the selected provider.
          </p>
          <div className="flex gap-3">
            {(["stripe", "square"] as const).map((p) => (
              <label
                key={p}
                className={`flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border cursor-pointer transition ${
                  settings.paymentProvider === p
                    ? "border-blue-500 bg-blue-600/10"
                    : "border-gray-700 bg-gray-800 hover:border-gray-600"
                }`}
              >
                <input
                  type="radio"
                  name="paymentProvider"
                  checked={settings.paymentProvider === p}
                  onChange={() => setSettings({ ...settings, paymentProvider: p })}
                  className="accent-blue-500"
                />
                <span className="text-sm font-semibold text-white capitalize">{p}</span>
              </label>
            ))}
          </div>
          {subStats && settings.paymentProvider === "square" && subStats.stripeActive > 0 && (
            <p className="text-xs text-amber-300 bg-amber-900/20 border border-amber-700/60 rounded-lg px-4 py-3">
              {subStats.stripeActive} active subscription{subStats.stripeActive === 1 ? "" : "s"} will keep
              billing on Stripe and stay synced via the Stripe webhook. Saved cards do not transfer —
              new enrollments use Square. Use &ldquo;Sync plans&rdquo; on the Plans page to create your
              membership plans on Square.
            </p>
          )}
          {subStats && settings.paymentProvider === "stripe" && subStats.squareActive > 0 && (
            <p className="text-xs text-amber-300 bg-amber-900/20 border border-amber-700/60 rounded-lg px-4 py-3">
              {subStats.squareActive} active subscription{subStats.squareActive === 1 ? "" : "s"} will keep
              billing on Square and stay synced via the Square webhook. Saved cards do not transfer —
              new enrollments use Stripe.
            </p>
          )}
          <SaveButton loading={providerStatus === "loading"} status={providerStatus} />
        </form>
      </Section>

      {/* Square */}
      <Section title="Square Payments">
        <form onSubmit={handleSquare} className="space-y-4">
          <p className="text-xs text-gray-500">
            Create an application at{" "}
            <a href="https://developer.squareup.com/apps" target="_blank" rel="noreferrer" className="underline">developer.squareup.com</a>.
            Enter only the secrets you want to update — saved secrets are masked.
            {settings.squareAccessToken && (
              <span className={`ml-2 px-2 py-0.5 rounded text-xs font-semibold ${settings.squareEnvironment === "production" ? "bg-green-900/50 text-green-400" : "bg-yellow-900/50 text-yellow-400"}`}>
                {settings.squareEnvironment === "production" ? "Production" : "Sandbox"}
              </span>
            )}
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Environment</label>
              <select
                value={settings.squareEnvironment || "sandbox"}
                onChange={e => setSettings({ ...settings, squareEnvironment: e.target.value })}
                className={select}
              >
                <option value="sandbox">Sandbox (testing)</option>
                <option value="production">Production</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Application ID</label>
              <input
                type="text"
                value={settings.squareApplicationId ?? ""}
                onChange={e => setSettings({ ...settings, squareApplicationId: e.target.value })}
                className={input}
                placeholder="sq0idp-…"
                autoComplete="off"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Access Token
              {settings.squareAccessToken && <span className="ml-2 font-mono text-gray-600 text-xs">(current: {maskKey(settings.squareAccessToken)})</span>}
            </label>
            <PasswordInput
              value={squareToken}
              onChange={e => setSquareToken(e.target.value)}
              className={input}
              placeholder={settings.squareAccessToken ? "Enter new token to replace…" : "EAAA…"}
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Location ID</label>
            <input
              type="text"
              value={settings.squareLocationId ?? ""}
              onChange={e => setSettings({ ...settings, squareLocationId: e.target.value })}
              className={input}
              placeholder="L1234567890"
              autoComplete="off"
            />
            <p className="text-xs text-gray-600 mt-1">
              The location&apos;s currency in Square must match the currency configured above.
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Webhook Signature Key
              {settings.squareWebhookSignatureKey && <span className="ml-2 font-mono text-gray-600 text-xs">(current: {maskKey(settings.squareWebhookSignatureKey)})</span>}
            </label>
            <PasswordInput
              value={squareWh}
              onChange={e => setSquareWh(e.target.value)}
              className={input}
              placeholder={settings.squareWebhookSignatureKey ? "Enter new key to replace…" : "Signature key…"}
              autoComplete="new-password"
            />
            <p className="text-xs text-gray-600 mt-1">
              In the Square developer dashboard, subscribe a webhook to{" "}
              <code className="bg-gray-800 px-1 rounded">/api/square/webhook</code> with the
              subscription, invoice, and terminal.checkout events.
            </p>
          </div>

          <SaveButton loading={squareStatus === "loading"} status={squareStatus} />

          {/* Terminal pairing */}
          <div className="border-t border-gray-800 pt-4 space-y-3">
            <p className="text-xs font-medium text-gray-400">Square Terminal (in-person tap/dip)</p>
            <p className="text-xs text-gray-600">
              Requires Square Terminal hardware — the handheld Square Reader is not supported by the
              Terminal API.
            </p>
            {settings.squareTerminalDeviceId ? (
              <p className="text-xs text-green-400">
                ✓ Terminal paired <span className="font-mono text-gray-500">({settings.squareTerminalDeviceId})</span>
              </p>
            ) : (
              <p className="text-xs text-gray-500">No Terminal paired yet.</p>
            )}
            {pairing ? (
              <div className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 space-y-1">
                <p className="text-sm text-white">
                  On the Terminal, go to <strong>Settings → Pair Device</strong> and enter:{" "}
                  <span className="font-mono text-lg font-bold text-blue-400">{pairing.code}</span>
                </p>
                <p className="text-xs text-gray-500">Waiting for the device to pair…</p>
              </div>
            ) : (
              <button
                type="button"
                onClick={startPairing}
                disabled={!settings.squareAccessToken || !settings.squareLocationId}
                className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white text-sm font-medium transition"
              >
                {settings.squareTerminalDeviceId ? "Pair a different Terminal" : "Pair Terminal"}
              </button>
            )}
            {pairError && <p className="text-xs text-red-400">{pairError}</p>}
          </div>
        </form>
      </Section>

      {/* Stripe */}
      <Section title="Stripe Payments">
        <form onSubmit={handleStripe} className="space-y-4">
          <p className="text-xs text-gray-500">
            Enter only the keys you want to update. Saved secrets are masked for security.
            {settings.stripeSecretKey && (
              <span className={`ml-2 px-2 py-0.5 rounded text-xs font-semibold ${stripeMode(settings.stripeSecretKey) === "live" ? "bg-green-900/50 text-green-400" : "bg-yellow-900/50 text-yellow-400"}`}>
                {stripeMode(settings.stripeSecretKey) === "live" ? "Live mode" : "Test mode"}
              </span>
            )}
          </p>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Publishable Key
              {settings.stripePublishableKey && <span className="ml-2 font-mono text-gray-600 text-xs">(current: {maskKey(settings.stripePublishableKey)})</span>}
            </label>
            <input
              type="text"
              value={stripePk}
              onChange={e => setStripePk(e.target.value)}
              className={input}
              placeholder={settings.stripePublishableKey ? "Enter new key to replace…" : "pk_live_…"}
              autoComplete="off"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Secret Key
              {settings.stripeSecretKey && <span className="ml-2 font-mono text-gray-600 text-xs">(current: {maskKey(settings.stripeSecretKey)})</span>}
            </label>
            <PasswordInput
              value={stripeSk}
              onChange={e => setStripeSk(e.target.value)}
              className={input}
              placeholder={settings.stripeSecretKey ? "Enter new key to replace…" : "sk_live_…"}
              autoComplete="new-password"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              Webhook Signing Secret
              {settings.stripeWebhookSecret && <span className="ml-2 font-mono text-gray-600 text-xs">(current: {maskKey(settings.stripeWebhookSecret)})</span>}
            </label>
            <PasswordInput
              value={stripeWh}
              onChange={e => setStripeWh(e.target.value)}
              className={input}
              placeholder={settings.stripeWebhookSecret ? "Enter new secret to replace…" : "whsec_…"}
              autoComplete="new-password"
            />
            <p className="text-xs text-gray-600 mt-1">
              Find this in your Stripe Dashboard → Developers → Webhooks. Point your webhook to{" "}
              <code className="bg-gray-800 px-1 rounded">/api/stripe/webhook</code>.
            </p>
          </div>

          <SaveButton loading={stripeStatus === "loading"} status={stripeStatus} />
        </form>
      </Section>

      {/* Brevo Email & SMS */}
      <Section title="Email & SMS (Brevo)">
        <form onSubmit={handleBrevo} className="space-y-4">
          <p className="text-xs text-gray-500">
            <a href="https://app.brevo.com" target="_blank" rel="noreferrer" className="underline">Sign up at brevo.com</a> for a free account (300 emails/day). Enter your API key and sender details below.
            {settings.brevoApiKey && <span className="ml-2 px-2 py-0.5 rounded text-xs font-semibold bg-green-900/50 text-green-400">Configured</span>}
          </p>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">
              API Key
              {settings.brevoApiKey && <span className="ml-2 font-mono text-gray-600 text-xs">(current: {maskKey(settings.brevoApiKey)})</span>}
            </label>
            <PasswordInput
              value={brevoKey}
              onChange={e => setBrevoKey(e.target.value)}
              className={input}
              placeholder={settings.brevoApiKey ? "Enter new key to replace…" : "xkeysib-…"}
              autoComplete="new-password"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Sender Email</label>
              <input
                type="email" autoComplete="email" autoCorrect="off" autoCapitalize="none"
                value={settings.brevoSenderEmail ?? ""}
                onChange={e => setSettings({ ...settings, brevoSenderEmail: e.target.value })}
                className={input}
                placeholder="noreply@yourgym.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Sender Name</label>
              <input
                type="text"
                value={settings.brevoSenderName ?? ""}
                onChange={e => setSettings({ ...settings, brevoSenderName: e.target.value })}
                className={input}
                placeholder="City BJJ"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">SMS From (max 11 chars)</label>
            <input
              type="text"
              maxLength={11}
              value={settings.brevoSmsFrom ?? ""}
              onChange={e => setSettings({ ...settings, brevoSmsFrom: e.target.value })}
              className="w-48 px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-blue-500 text-sm"
              placeholder="CityBJJ"
            />
            <p className="text-xs text-gray-500 mt-1">Shown as the sender name on SMS messages. Leave blank to skip SMS.</p>
          </div>

          <SaveButton loading={brevoStatus === "loading"} status={brevoStatus} />
        </form>
      </Section>

      {/* Family Discounts */}
      <Section title="Family Discounts">
        <form onSubmit={e => { e.preventDefault(); save({ familyDiscountEnabled: settings.familyDiscountEnabled, familyDiscountPercent: settings.familyDiscountPercent }, setDiscountStatus); }} className="space-y-4">
          <p className="text-xs text-gray-500">
            When enabled, staff can apply a discount to sibling subscriptions from the{" "}
            <a href="/admin/families" className="underline text-blue-400 hover:text-blue-300">Family Accounts</a>{" "}
            page. Discounts are applied via Stripe coupons or Square price overrides, depending on your payment provider.
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSettings({ ...settings, familyDiscountEnabled: !settings.familyDiscountEnabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.familyDiscountEnabled ? "bg-blue-600" : "bg-gray-700"}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${settings.familyDiscountEnabled ? "translate-x-6" : "translate-x-1"}`} />
            </button>
            <label className="text-sm text-gray-300">
              {settings.familyDiscountEnabled ? "Enabled" : "Disabled"}
            </label>
          </div>
          {settings.familyDiscountEnabled && (
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Sibling Discount (%)</label>
              <input
                type="number" min={1} max={100} step={1}
                value={settings.familyDiscountPercent}
                onChange={e => setSettings({ ...settings, familyDiscountPercent: parseInt(e.target.value) || 10 })}
                className="w-32 px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white focus:outline-none focus:border-blue-500 text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">Applied to each child member&apos;s active subscription.</p>
            </div>
          )}
          <SaveButton loading={discountStatus === "loading"} status={discountStatus} />
        </form>
      </Section>

      {/* Lead Capture */}
      <Section title="Lead Capture Widget">
        <div id="lead-capture" className="space-y-4">
          <p className="text-xs text-gray-500">
            Embed this form on your gym&apos;s website. Submissions create a new lead in{" "}
            <a href="/admin/leads" className="underline text-blue-400 hover:text-blue-300">Leads</a>{" "}
            and send you an email notification (if Brevo is configured).
          </p>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Embed Code</label>
            <textarea
              ref={embedRef}
              readOnly
              rows={4}
              value={origin ? `<iframe\n  src="${origin}/widget/lead"\n  width="100%"\n  height="520"\n  frameborder="0"\n  style="border-radius:12px;border:1px solid #e5e7eb;"\n></iframe>` : "Loading…"}
              className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 text-xs font-mono resize-none focus:outline-none focus:border-blue-500"
              onClick={() => embedRef.current?.select()}
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => {
                embedRef.current?.select();
                document.execCommand("copy");
              }}
              className="px-4 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium transition"
            >
              Copy code
            </button>
            {origin && (
              <a
                href={`${origin}/widget/lead`}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-blue-400 hover:text-blue-300 transition"
              >
                Preview form →
              </a>
            )}
          </div>
        </div>
      </Section>

      {/* Integrations — API Keys */}
      <IntegrationsSection />

      {/* Change Password */}
      <Section title="Change Password">
        <form onSubmit={handlePassword} className="space-y-4">
          {pwStatus === "ok"    && <div className="bg-green-900/30 border border-green-800 text-green-300 text-sm rounded-lg px-4 py-3">{pwMsg}</div>}
          {pwStatus === "error" && <div className="bg-red-900/30 border border-red-800 text-red-300 text-sm rounded-lg px-4 py-3">{pwMsg}</div>}
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Current Password</label>
            <PasswordInput required value={pwCurrent} onChange={e => setPwCurrent(e.target.value)} className={input} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">New Password</label>
            <PasswordInput required value={pwNext} onChange={e => setPwNext(e.target.value)} className={input} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Confirm New Password</label>
            <PasswordInput required value={pwConfirm} onChange={e => setPwConfirm(e.target.value)} className={input} />
          </div>
          <SaveButton loading={pwStatus === "loading"} status={pwStatus} />
        </form>
      </Section>
    </div>
  );
}

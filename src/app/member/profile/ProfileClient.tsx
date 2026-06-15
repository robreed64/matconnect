"use client";

import { useEffect, useRef, useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import SquareCardForm from "@/components/payments/SquareCardForm";
import QRCode from "react-qr-code";
import PhotoUploader from "@/components/PhotoUploader";
import PasswordInput from "@/components/PasswordInput";

// ── Contact Info ─────────────────────────────────────────────────────────────

function ContactSection() {
  const [form, setForm]       = useState({ name: "", email: "", phone: "", address: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [status, setStatus]   = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/member/profile")
      .then(r => r.json())
      .then(d => {
        setForm({
          name:    d.name    ?? "",
          email:   d.email   ?? "",
          phone:   d.phone   ?? "",
          address: d.address ?? "",
        });
      })
      .finally(() => setLoading(false));
  }, []);

  async function save() {
    setSaving(true);
    setStatus(null);
    const res = await fetch("/api/member/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setStatus(res.ok ? "Saved!" : (data.error ?? "Save failed"));
    setSaving(false);
  }

  if (loading) return <div className="text-sm text-gray-500">Loading…</div>;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Contact Info</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Name"    value={form.name}    onChange={v => setForm(p => ({ ...p, name: v }))} />
        <Field label="Email"   value={form.email}   onChange={v => setForm(p => ({ ...p, email: v }))} type="text" inputMode="email" autoComplete="email" autoCorrect="off" autoCapitalize="none" />
        <Field label="Phone"   value={form.phone}   onChange={v => setForm(p => ({ ...p, phone: v }))} type="tel" />
        <Field label="Address" value={form.address} onChange={v => setForm(p => ({ ...p, address: v }))} />
      </div>
      <div className="flex items-center gap-4 pt-1">
        <button
          onClick={save}
          disabled={saving}
          className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
        {status && (
          <span className={`text-sm ${status === "Saved!" ? "text-green-400" : "text-red-400"}`}>
            {status}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Password ─────────────────────────────────────────────────────────────────

function PasswordSection() {
  const [form, setForm]       = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [saving, setSaving]   = useState(false);
  const [status, setStatus]   = useState<string | null>(null);

  async function save() {
    if (form.newPassword !== form.confirm) {
      setStatus("Passwords do not match");
      return;
    }
    setSaving(true);
    setStatus(null);
    const res = await fetch("/api/member/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword }),
    });
    const data = await res.json();
    if (res.ok) {
      setForm({ currentPassword: "", newPassword: "", confirm: "" });
      setStatus("Password updated!");
    } else {
      setStatus(data.error ?? "Update failed");
    }
    setSaving(false);
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Change Password</h2>
      <div className="space-y-3 max-w-sm">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Current password</label>
          <PasswordInput value={form.currentPassword} onChange={e => setForm(p => ({ ...p, currentPassword: e.target.value }))}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">New password (min 8 chars)</label>
          <PasswordInput value={form.newPassword} onChange={e => setForm(p => ({ ...p, newPassword: e.target.value }))}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Confirm new password</label>
          <PasswordInput value={form.confirm} onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 transition" />
        </div>
      </div>
      <div className="flex items-center gap-4 pt-1">
        <button
          onClick={save}
          disabled={saving || !form.currentPassword || !form.newPassword}
          className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition"
        >
          {saving ? "Updating…" : "Update password"}
        </button>
        {status && (
          <span className={`text-sm ${status.includes("updated") ? "text-green-400" : "text-red-400"}`}>
            {status}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Card on File ─────────────────────────────────────────────────────────────

type PublicPaymentSettings = {
  paymentProvider: string;
  stripePublishableKey: string | null;
  squareApplicationId: string | null;
  squareLocationId: string | null;
  squareEnvironment: string;
};

function CardSection() {
  const [card, setCard]           = useState<{ brand: string; last4: string } | null>(null);
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [provider, setProvider]   = useState<string>("stripe");
  const [squareCfg, setSquareCfg] = useState<PublicPaymentSettings | null>(null);
  const [stripePromise, setStripe] = useState<ReturnType<typeof loadStripe> | null>(null);
  const [clientSecret, setSecret] = useState<string | null>(null);
  const [setupError, setSetupError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/member/payment-method")
      .then(r => r.json())
      .then(d => setCard(d.card))
      .finally(() => setLoading(false));
  }, []);

  async function startUpdate() {
    setSetupError(null);
    const [pubRes, sessionRes] = await Promise.all([
      fetch("/api/settings/public").then(r => r.json()),
      fetch("/api/member/setup-intent", { method: "POST" }).then(r => r.json()),
    ]);
    if (sessionRes.error) { setSetupError(sessionRes.error); return; }

    if (sessionRes.provider === "square") {
      if (!pubRes.squareApplicationId || !pubRes.squareLocationId) {
        setSetupError("Square not configured");
        return;
      }
      setProvider("square");
      setSquareCfg(pubRes);
      setShowForm(true);
      return;
    }

    const key = pubRes.stripePublishableKey || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!key || key === "pk_test_...") { setSetupError("Stripe not configured"); return; }
    setProvider("stripe");
    setStripe(loadStripe(key));
    setSecret(sessionRes.clientSecret);
    setShowForm(true);
  }

  function onCardSaved() {
    setShowForm(false);
    setLoading(true);
    fetch("/api/member/payment-method")
      .then(r => r.json())
      .then(d => setCard(d.card))
      .finally(() => setLoading(false));
  }

  if (loading) return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="text-sm text-gray-500">Loading payment info…</div>
    </div>
  );

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Payment Method</h2>
      {card ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono text-gray-200">
              {card.brand?.toUpperCase()} ···· {card.last4}
            </div>
          </div>
          {!showForm && (
            <button
              onClick={startUpdate}
              className="text-sm text-blue-400 hover:text-blue-300 transition"
            >
              Update card
            </button>
          )}
        </div>
      ) : (
        <p className="text-sm text-gray-500">
          {showForm ? null : "No payment method on file."}
        </p>
      )}
      {setupError && <p className="text-sm text-red-400">{setupError}</p>}
      {!showForm && !card && (
        <button
          onClick={startUpdate}
          className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition"
        >
          Add card
        </button>
      )}
      {showForm && provider === "stripe" && stripePromise && clientSecret && (
        <Elements
          stripe={stripePromise}
          options={{ clientSecret, appearance: { theme: "night", variables: { colorPrimary: "#3b82f6" } } }}
        >
          <CardForm onSuccess={onCardSaved} onCancel={() => setShowForm(false)} />
        </Elements>
      )}
      {showForm && provider === "square" && squareCfg?.squareApplicationId && squareCfg.squareLocationId && (
        <SquareCardForm
          applicationId={squareCfg.squareApplicationId}
          locationId={squareCfg.squareLocationId}
          environment={squareCfg.squareEnvironment}
          submitLabel="Save card"
          secondaryAction={{ label: "Cancel", onClick: () => setShowForm(false) }}
          onToken={async (token) => {
            const res = await fetch("/api/member/payment-method", {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ paymentMethodId: token }),
            });
            if (!res.ok) {
              const d = await res.json().catch(() => ({}));
              return d.error ?? "Failed to save card";
            }
            onCardSaved();
            return null;
          }}
        />
      )}
    </div>
  );
}

function CardForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const stripe   = useStripe();
  const elements = useElements();
  const [error, setError]   = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function confirm() {
    if (!stripe || !elements) return;
    setSaving(true);
    setError(null);

    const { setupIntent, error: stripeError } = await stripe.confirmSetup({
      elements,
      confirmParams: { return_url: `${window.location.origin}/member/profile` },
      redirect: "if_required",
    });

    if (stripeError) {
      setError(stripeError.message ?? "Card error");
      setSaving(false);
      return;
    }

    if (setupIntent?.status === "succeeded") {
      const pmId =
        typeof setupIntent.payment_method === "string"
          ? setupIntent.payment_method
          : setupIntent.payment_method?.id ?? "";

      const res = await fetch("/api/member/payment-method", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentMethodId: pmId }),
      });
      if (res.ok) {
        onSuccess();
      } else {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Failed to save card");
      }
    }
    setSaving(false);
  }

  return (
    <div className="space-y-4 pt-2">
      <PaymentElement options={{ layout: "tabs" }} />
      {error && (
        <p className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">{error}</p>
      )}
      <div className="flex items-center gap-3">
        <button
          onClick={confirm}
          disabled={!stripe || saving}
          className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition"
        >
          {saving ? "Saving…" : "Save card"}
        </button>
        <button
          onClick={onCancel}
          className="text-sm text-gray-500 hover:text-gray-300 transition"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

// ── Photo ─────────────────────────────────────────────────────────────────────

function PhotoSection() {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [name, setName]         = useState("");
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    fetch("/api/member/profile")
      .then(r => r.json())
      .then(d => { setPhotoUrl(d.photoUrl ?? null); setName(d.name ?? ""); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Profile Photo</h2>
      <div className="flex items-center gap-5 pt-1">
        <PhotoUploader
          currentUrl={photoUrl}
          uploadUrl="/api/member/photo"
          name={name}
          onUpload={setPhotoUrl}
        />
        <p className="text-sm text-gray-400">
          Your photo helps staff and teammates recognize you. Click the circle to upload or change it.
        </p>
      </div>
    </div>
  );
}

// ── Push Notifications ───────────────────────────────────────────────────────

function PushSection() {
  const [status,    setStatus]    = useState<"idle" | "loading" | "subscribed" | "unsupported">("idle");
  const [subState,  setSubState]  = useState<"unknown" | "granted" | "denied" | "default">("unknown");
  const [msg,       setMsg]       = useState<string | null>(null);

  async function checkState() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setSubState("denied");
      return;
    }
    const perm = Notification.permission;
    setSubState(perm as typeof subState);
    if (perm === "granted") {
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (existing) setStatus("subscribed");
    }
  }

  useEffect(() => { checkState(); }, []);

  async function subscribe() {
    if (!("serviceWorker" in navigator)) { setMsg("Not supported in this browser"); return; }
    setStatus("loading");
    setMsg(null);
    try {
      const reg = await navigator.serviceWorker.register("/sw.js");
      const vapidRes = await fetch("/api/push/vapid-public-key");
      const { publicKey } = await vapidRes.json();

      const urlBase64ToUint8 = (base64: string) => {
        const padded = base64.replace(/-/g, "+").replace(/_/g, "/").padEnd(base64.length + (4 - base64.length % 4) % 4, "=");
        const raw = atob(padded);
        return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
      };

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8(publicKey),
      });

      const json = sub.toJSON();
      const saveRes = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: sub.endpoint, keys: json.keys }),
      });

      if (!saveRes.ok) {
        const d = await saveRes.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed to save subscription");
      }

      setStatus("subscribed");
      setSubState("granted");
      setMsg("Notifications enabled!");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed";
      setMsg(message.includes("denied") ? "Permission denied in browser" : "Failed to subscribe");
      setStatus("idle");
    }
  }

  async function unsubscribe() {
    setStatus("loading");
    setMsg(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setStatus("idle");
      setMsg("Notifications disabled");
    } catch {
      setMsg("Failed to unsubscribe");
      setStatus("idle");
    }
  }

  if (subState === "denied") return null;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Push Notifications</h2>
      <p className="text-sm text-gray-400">
        Get notified about class changes, announcements, and updates from the gym.
      </p>
      <div className="flex items-center gap-4">
        {status === "subscribed" ? (
          <button
            onClick={unsubscribe}
            disabled={status !== "subscribed"}
            className="px-4 py-2 text-sm font-medium border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white rounded-lg transition"
          >
            Disable notifications
          </button>
        ) : (
          <button
            onClick={subscribe}
            disabled={status === "loading"}
            className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg transition"
          >
            {status === "loading" ? "Enabling…" : "Enable notifications"}
          </button>
        )}
        {msg && (
          <span className={`text-sm ${msg.includes("denied") || msg.includes("Failed") ? "text-red-400" : "text-green-400"}`}>
            {msg}
          </span>
        )}
      </div>
    </div>
  );
}

// ── QR Check-in Card ─────────────────────────────────────────────────────────

function QRSection() {
  const [token, setToken]   = useState<string | null>(null);
  const [name, setName]     = useState<string>("");
  const [loading, setLoading] = useState(true);
  const qrRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/member/qr-token")
      .then(r => r.json())
      .then(d => { setToken(d.token); setName(d.name ?? ""); })
      .finally(() => setLoading(false));
  }, []);

  function printCard() {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg || !token) return;
    const win = window.open("", "_blank", "width=360,height=480");
    if (!win) return;
    win.document.write(`<!DOCTYPE html>
<html>
<head>
<title>Check-in Card</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, sans-serif; text-align: center; padding: 40px 32px; }
  h2 { font-size: 22px; font-weight: 700; margin-bottom: 6px; }
  p  { font-size: 13px; color: #666; margin-bottom: 24px; }
  svg { display: block; margin: 0 auto; }
</style>
</head>
<body>
  <h2>${name}</h2>
  <p>Scan at kiosk to check in</p>
  ${svg.outerHTML}
  <script>setTimeout(function(){ window.print(); window.close(); }, 250);</script>
</body>
</html>`);
    win.document.close();
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500">Check-in QR Code</h2>
      {loading ? (
        <div className="text-sm text-gray-500">Generating…</div>
      ) : token ? (
        <div className="flex flex-col items-center gap-4">
          <div ref={qrRef} className="bg-white p-3 rounded-xl">
            <QRCode value={token} size={160} />
          </div>
          <p className="text-xs text-gray-500 text-center">
            Present this at the kiosk to check in instantly.
          </p>
          <button
            onClick={printCard}
            className="px-4 py-2 text-sm font-medium border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white rounded-lg transition"
          >
            Print card
          </button>
        </div>
      ) : (
        <p className="text-sm text-gray-500">QR code unavailable.</p>
      )}
    </div>
  );
}

// ── Belt Rank Display ─────────────────────────────────────────────────────────

const BELT_COLORS: Record<string, { bg: string; text: string; stripe: string }> = {
  white:  { bg: "bg-white",      text: "text-gray-900", stripe: "bg-gray-400" },
  blue:   { bg: "bg-blue-600",   text: "text-white",    stripe: "bg-white" },
  purple: { bg: "bg-purple-700", text: "text-white",    stripe: "bg-white" },
  brown:  { bg: "bg-amber-800",  text: "text-white",    stripe: "bg-white" },
  black:  { bg: "bg-gray-900 border border-gray-600", text: "text-white", stripe: "bg-white" },
};

function RankBadge({ beltRank, beltStripes }: { beltRank: string | null; beltStripes: number }) {
  if (!beltRank) return null;
  const colors = BELT_COLORS[beltRank.toLowerCase()] ?? BELT_COLORS.white;
  const label  = beltRank.charAt(0).toUpperCase() + beltRank.slice(1);
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">Current Rank</h2>
      <div className="flex items-center gap-4">
        {/* Belt pill */}
        <span className={`px-4 py-1.5 rounded-full text-sm font-bold ${colors.bg} ${colors.text}`}>
          {label} Belt
        </span>
        {/* Stripe dots */}
        {beltStripes > 0 && (
          <div className="flex items-center gap-1.5">
            {Array.from({ length: beltStripes }).map((_, i) => (
              <span
                key={i}
                className={`w-3 h-3 rounded-full ${colors.bg} border-2 ${beltRank.toLowerCase() === "white" ? "border-gray-400" : "border-gray-600"}`}
                style={{ boxShadow: "inset 0 0 0 1.5px rgba(255,255,255,0.4)" }}
              />
            ))}
            <span className="text-sm text-gray-400 ml-1">
              {beltStripes} {beltStripes === 1 ? "stripe" : "stripes"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function ProfileSections({
  showCheckins,
  beltRank,
  beltStripes,
}: {
  showCheckins: boolean;
  beltRank: string | null;
  beltStripes: number;
}) {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-white">My Profile</h1>
      {beltRank && <RankBadge beltRank={beltRank} beltStripes={beltStripes} />}
      <PhotoSection />
      <ContactSection />
      <PasswordSection />
      <CardSection />
      <PushSection />
      {showCheckins && <QRSection />}
    </div>
  );
}

// ── Shared Field ──────────────────────────────────────────────────────────────

function Field({
  label,
  value,
  onChange,
  type = "text",
  inputMode,
  autoComplete,
  autoCorrect,
  autoCapitalize,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  inputMode?: React.InputHTMLAttributes<HTMLInputElement>["inputMode"];
  autoComplete?: string;
  autoCorrect?: string;
  autoCapitalize?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      <input
        type={type}
        inputMode={inputMode}
        autoComplete={autoComplete}
        autoCorrect={autoCorrect}
        autoCapitalize={autoCapitalize}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition"
      />
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import SquareCardForm from "@/components/payments/SquareCardForm";

type Props = {
  name: string;
  email: string;
  onSuccess: (data: { customerId: string; paymentMethodId: string }) => void;
  onSkip: () => void;
};

type PublicSettings = {
  paymentProvider: string;
  stripePublishableKey: string | null;
  squareApplicationId: string | null;
  squareLocationId: string | null;
  squareEnvironment: string;
};

export default function PaymentStep(props: Props) {
  const [settings, setSettings] = useState<PublicSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings/public")
      .then(r => r.json())
      .then(setSettings)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 gap-3 text-gray-400">
        <div className="w-5 h-5 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
        Setting up payment…
      </div>
    );
  }

  if (settings?.paymentProvider === "square") {
    return <SquarePaymentStep settings={settings} {...props} />;
  }
  return <StripePaymentStep settings={settings} {...props} />;
}

// ── Not-configured fallback ──────────────────────────────────────────────────

function NotConfigured({ providerLabel, onSkip }: { providerLabel: string; onSkip: () => void }) {
  return (
    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-5 text-sm text-yellow-300 space-y-2">
      <p className="font-semibold">{providerLabel} not configured</p>
      <p className="text-yellow-400/80">
        Add your {providerLabel} keys in <strong>Settings → Payments</strong> to enable card collection. The member will be enrolled and payment can be collected separately.
      </p>
      <button onClick={onSkip} className="mt-3 px-4 py-2 rounded-lg bg-yellow-600/30 hover:bg-yellow-600/50 text-yellow-200 font-medium transition">
        Continue without payment →
      </button>
    </div>
  );
}

// ── Square ───────────────────────────────────────────────────────────────────

function SquarePaymentStep({ settings, name, email, onSuccess, onSkip }: Props & { settings: PublicSettings }) {
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerToken, setCustomerToken] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch("/api/payments/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email }),
    })
      .then(r => r.json())
      .then(data => {
        if (data?.customerId && data?.customerToken) {
          setCustomerId(data.customerId);
          setCustomerToken(data.customerToken);
        } else {
          setFailed(true);
        }
      })
      .catch(() => setFailed(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, email]);

  if (!settings.squareApplicationId || !settings.squareLocationId) {
    return <NotConfigured providerLabel="Square" onSkip={onSkip} />;
  }
  if (failed) {
    return (
      <div className="space-y-3">
        <p className="text-red-400 text-sm">Failed to initialize payment. Please try again or continue without a card.</p>
        <button onClick={onSkip} className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-sm font-medium transition">
          Continue without payment →
        </button>
      </div>
    );
  }
  if (!customerId) {
    return (
      <div className="flex items-center justify-center h-40 gap-3 text-gray-400">
        <div className="w-5 h-5 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
        Setting up payment…
      </div>
    );
  }

  return (
    <SquareCardForm
      applicationId={settings.squareApplicationId}
      locationId={settings.squareLocationId}
      environment={settings.squareEnvironment}
      secondaryAction={{ label: "Skip — collect payment later", onClick: onSkip }}
      onToken={async (token) => {
        const res = await fetch("/api/payments/save-card", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ customerId, customerToken, token }),
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.cardId) return data?.error ?? "Failed to save card";
        onSuccess({ customerId, paymentMethodId: data.cardId });
        return null;
      }}
    />
  );
}

// ── Stripe ───────────────────────────────────────────────────────────────────

function StripePaymentStep({ settings, name, email, onSuccess, onSkip }: Props & { settings: PublicSettings | null }) {
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null);
  const [clientSecret, setClientSecret]   = useState<string | null>(null);
  const [customerId, setCustomerId]       = useState<string | null>(null);
  const [loading, setLoading]             = useState(true);

  useEffect(() => {
    const key = settings?.stripePublishableKey || process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!key || key === "pk_test_...") { setLoading(false); return; }
    setStripePromise(loadStripe(key));

    fetch("/api/payments/setup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email }),
    })
      .then(r => r.json())
      .then((data) => {
        if (data?.clientSecret) {
          setClientSecret(data.clientSecret);
          setCustomerId(data.customerId);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, email]);

  if (!stripePromise) {
    return <NotConfigured providerLabel="Stripe" onSkip={onSkip} />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-40 gap-3 text-gray-400">
        <div className="w-5 h-5 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
        Setting up payment…
      </div>
    );
  }

  if (!clientSecret || !customerId) {
    return (
      <div className="space-y-3">
        <p className="text-red-400 text-sm">Failed to initialize payment. Please try again or continue without a card.</p>
        <button onClick={onSkip} className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-sm font-medium transition">
          Continue without payment →
        </button>
      </div>
    );
  }

  return (
    <Elements
      stripe={stripePromise}
      options={{ clientSecret, appearance: { theme: "night", variables: { colorPrimary: "#3b82f6" } } }}
    >
      <PaymentForm customerId={customerId} onSuccess={onSuccess} onSkip={onSkip} />
    </Elements>
  );
}

function PaymentForm({
  customerId,
  onSuccess,
  onSkip,
}: {
  customerId: string;
  onSuccess: (data: { customerId: string; paymentMethodId: string }) => void;
  onSkip: () => void;
}) {
  const stripe   = useStripe();
  const elements = useElements();
  const [error, setError]     = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const confirm = async () => {
    if (!stripe || !elements) return;
    setLoading(true);
    setError(null);

    const { setupIntent, error: stripeError } = await stripe.confirmSetup({
      elements,
      confirmParams: { return_url: `${window.location.origin}/enroll` },
      redirect: "if_required",
    });

    if (stripeError) {
      setError(stripeError.message ?? "Card error");
      setLoading(false);
      return;
    }

    if (setupIntent?.status === "succeeded") {
      const pmId = typeof setupIntent.payment_method === "string"
        ? setupIntent.payment_method
        : setupIntent.payment_method?.id ?? "";
      onSuccess({ customerId, paymentMethodId: pmId });
    }

    setLoading(false);
  };

  return (
    <div className="space-y-5">
      <PaymentElement options={{ layout: "tabs" }} />
      {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3">{error}</p>}
      <div className="flex justify-between items-center pt-1">
        <button onClick={onSkip} className="text-sm text-gray-500 hover:text-gray-300 transition">
          Skip — collect payment later
        </button>
        <button
          onClick={confirm}
          disabled={!stripe || loading}
          className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold transition"
        >
          {loading ? "Confirming…" : "Save Card →"}
        </button>
      </div>
    </div>
  );
}

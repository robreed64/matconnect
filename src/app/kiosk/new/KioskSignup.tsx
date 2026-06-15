"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";

const SignaturePad = dynamic(() => import("@/components/SignaturePad"), { ssr: false });
const PaymentStep = dynamic(() => import("@/app/enroll/PaymentStep"), { ssr: false });

type Plan = {
  id: number;
  name: string;
  description: string | null;
  priceCents: number;
  billingInterval: string;
  classLimit: number | null;
};

export default function KioskSignup({
  gymName,
  waiverText,
}: {
  gymName: string;
  waiverText: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [plans, setPlans] = useState<Plan[]>([]);

  // Personal info
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [ageGroup, setAgeGroup] = useState<"adult" | "kids">("adult");
  const [errors, setErrors] = useState<{ name?: string; email?: string; phone?: string }>({});

  // Waiver
  const [signed, setSigned] = useState(false);
  const [accepted, setAccepted] = useState(false);

  // Plan & payment
  const [planId, setPlanId] = useState<number | null>(null);

  // Submit
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Success countdown
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    fetch("/api/plans")
      .then((r) => r.json())
      .then(setPlans)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (step !== 5) return;
    const id = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          router.push("/kiosk");
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [step, router]);

  const validateInfo = () => {
    const errs: typeof errors = {};
    if (!name.trim()) errs.name = "Name is required";
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errs.email = "Valid email is required";
    if (!phone.trim()) errs.phone = "Phone number is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submitEnroll = useCallback(
    async (opts: {
      planId: number | null;
      customerId: string | null;
      paymentMethodId: string | null;
    }) => {
      setSubmitting(true);
      setError(null);
      try {
        const res = await fetch("/api/enroll", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim(),
            ageGroup,
            trainingType: "",
            planId: opts.planId,
            customerId: opts.customerId,
            paymentMethodId: opts.paymentMethodId,
            promoCode: "",
          }),
        });
        if (res.ok) {
          setStep(5);
        } else {
          const data = await res.json().catch(() => ({}));
          setError(data.error ?? "Sign-up failed — please try again");
        }
      } catch {
        setError("Network error — please try again");
      } finally {
        setSubmitting(false);
      }
    },
    [name, email, phone, ageGroup]
  );

  const inp =
    "w-full px-5 py-4 rounded-2xl bg-gray-800 border border-gray-700 text-white text-xl placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition";
  const lbl = "block text-sm font-medium text-gray-400 mb-2";

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Progress dots for steps 1-4 */}
      {step > 0 && step < 5 && (
        <div className="flex justify-center gap-2 pt-8 pb-2">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`w-3 h-3 rounded-full transition-colors ${
                s < step
                  ? "bg-blue-500"
                  : s === step
                  ? "bg-white"
                  : "bg-gray-700"
              }`}
            />
          ))}
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center px-6 py-8 w-full max-w-lg mx-auto">
        {/* Step 0 — Welcome */}
        {step === 0 && (
          <div className="text-center space-y-8 w-full">
            <div>
              <h1 className="text-5xl font-black">{gymName}</h1>
              <p className="text-2xl text-gray-400 mt-3">
                Let&apos;s get you set up.
              </p>
            </div>
            <button
              onClick={() => setStep(1)}
              className="w-full py-5 rounded-2xl bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold text-2xl transition"
            >
              Sign Up Now
            </button>
            <Link
              href="/kiosk"
              className="block text-gray-500 hover:text-gray-300 text-base transition"
            >
              Already a member? Check in here →
            </Link>
          </div>
        )}

        {/* Step 1 — Personal info */}
        {step === 1 && (
          <div className="w-full space-y-6">
            <h2 className="text-3xl font-bold text-center">
              Tell us about yourself
            </h2>
            <div>
              <label className={lbl}>Full Name *</label>
              <input
                className={`${inp} ${errors.name ? "border-red-500" : ""}`}
                placeholder="Jane Smith"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setErrors((p) => ({ ...p, name: undefined }));
                }}
              />
              {errors.name && (
                <p className="text-red-400 text-sm mt-1">{errors.name}</p>
              )}
            </div>
            <div>
              <label className={lbl}>Email *</label>
              <input
                className={`${inp} ${errors.email ? "border-red-500" : ""}`}
                type="email"
                inputMode="email"
                placeholder="jane@email.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrors((p) => ({ ...p, email: undefined }));
                }}
              />
              {errors.email && (
                <p className="text-red-400 text-sm mt-1">{errors.email}</p>
              )}
            </div>
            <div>
              <label className={lbl}>Phone *</label>
              <input
                className={`${inp} ${errors.phone ? "border-red-500" : ""}`}
                type="tel"
                inputMode="tel"
                placeholder="(555) 000-0000"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setErrors((p) => ({ ...p, phone: undefined }));
                }}
              />
              {errors.phone && (
                <p className="text-red-400 text-sm mt-1">{errors.phone}</p>
              )}
            </div>
            <div>
              <label className={lbl}>I am a</label>
              <div className="flex gap-3">
                {(["adult", "kids"] as const).map((ag) => (
                  <button
                    key={ag}
                    onClick={() => setAgeGroup(ag)}
                    className={`flex-1 py-4 rounded-2xl text-lg font-semibold transition ${
                      ageGroup === ag
                        ? "bg-blue-600 text-white"
                        : "bg-gray-800 text-gray-400 hover:text-white"
                    }`}
                  >
                    {ag === "adult" ? "Adult" : "Child / Teen"}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => {
                if (validateInfo()) setStep(2);
              }}
              className="w-full py-5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xl transition"
            >
              Next →
            </button>
            <button
              onClick={() => setStep(0)}
              className="w-full text-gray-500 hover:text-gray-300 text-sm transition"
            >
              ← Back
            </button>
          </div>
        )}

        {/* Step 2 — Waiver */}
        {step === 2 && (
          <div className="w-full space-y-5">
            <h2 className="text-3xl font-bold text-center">
              Participation Agreement
            </h2>
            <div className="h-52 overflow-y-auto bg-gray-900 border border-gray-700 rounded-2xl p-4 text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">
              {waiverText}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-400 mb-2">
                Sign below
              </p>
              <SignaturePad onChange={setSigned} />
            </div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="mt-1 w-5 h-5 rounded accent-blue-500 flex-shrink-0"
              />
              <span className="text-sm text-gray-300">
                I have read and agree to the terms of this participation
                agreement and release of liability.
              </span>
            </label>
            <button
              onClick={() => setStep(3)}
              disabled={!signed || !accepted}
              className="w-full py-5 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xl transition"
            >
              I Agree — Next →
            </button>
            <button
              onClick={() => setStep(1)}
              className="w-full text-gray-500 hover:text-gray-300 text-sm transition"
            >
              ← Back
            </button>
          </div>
        )}

        {/* Step 3 — Plan selection */}
        {step === 3 && (
          <div className="w-full space-y-4">
            <h2 className="text-3xl font-bold text-center">
              Choose a Membership
            </h2>

            {/* Trial tile */}
            <button
              onClick={() =>
                submitEnroll({ planId: null, customerId: null, paymentMethodId: null })
              }
              disabled={submitting}
              className="w-full p-5 rounded-2xl bg-gray-800 hover:bg-gray-700 border-2 border-gray-700 hover:border-gray-500 text-left transition disabled:opacity-50"
            >
              <div className="font-bold text-white text-xl">
                Try my first class
              </div>
              <div className="text-gray-400 text-sm mt-1">
                No commitment — come try it out
              </div>
            </button>

            {/* Plan tiles */}
            {plans.map((plan) => (
              <button
                key={plan.id}
                onClick={() => {
                  setPlanId(plan.id);
                  setStep(4);
                }}
                disabled={submitting}
                className="w-full p-5 rounded-2xl bg-gray-800 hover:bg-gray-700 border-2 border-gray-700 hover:border-blue-500 text-left transition disabled:opacity-50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="font-bold text-white text-xl">{plan.name}</div>
                  <div className="text-right flex-shrink-0">
                    <span className="text-2xl font-bold text-white">
                      ${(plan.priceCents / 100).toFixed(0)}
                    </span>
                    <span className="text-gray-400 text-sm">
                      /{plan.billingInterval === "yearly" ? "yr" : "mo"}
                    </span>
                  </div>
                </div>
                {plan.description && (
                  <p className="text-gray-400 text-sm mt-1">{plan.description}</p>
                )}
                {plan.classLimit && (
                  <p className="text-gray-500 text-xs mt-1">
                    {plan.classLimit} classes/month
                  </p>
                )}
              </button>
            ))}

            {error && (
              <p className="text-red-400 text-sm text-center">{error}</p>
            )}
            {submitting && (
              <div className="flex items-center justify-center gap-2 text-gray-400">
                <div className="w-5 h-5 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
                Creating your account…
              </div>
            )}
            <button
              onClick={() => setStep(2)}
              className="w-full text-gray-500 hover:text-gray-300 text-sm transition"
            >
              ← Back
            </button>
          </div>
        )}

        {/* Step 4 — Payment */}
        {step === 4 && (
          <div className="w-full space-y-6">
            <h2 className="text-3xl font-bold text-center">Payment Info</h2>
            <p className="text-gray-400 text-center text-sm">
              Add a card to start your membership. You can update it anytime in
              the member portal.
            </p>
            {error && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                {error}
              </p>
            )}
            <PaymentStep
              name={name}
              email={email}
              onSuccess={({ customerId, paymentMethodId }) =>
                submitEnroll({ planId, customerId, paymentMethodId })
              }
              onSkip={() =>
                submitEnroll({ planId, customerId: null, paymentMethodId: null })
              }
            />
            {submitting && (
              <div className="flex items-center justify-center gap-2 text-gray-400">
                <div className="w-5 h-5 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
                Creating your account…
              </div>
            )}
            <button
              onClick={() => setStep(3)}
              className="w-full text-gray-500 hover:text-gray-300 text-sm transition"
            >
              ← Back
            </button>
          </div>
        )}

        {/* Step 5 — Success */}
        {step === 5 && (
          <div className="text-center space-y-8 w-full">
            <div className="w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
              <svg
                className="w-14 h-14 text-green-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-4xl font-black">
                You&apos;re all set
                {name ? `, ${name.split(" ")[0]}` : ""}!
              </h2>
              <p className="text-gray-400 mt-2">
                Your account is created. Check your email for login info.
              </p>
            </div>
            <button
              onClick={() => router.push("/kiosk")}
              className="w-full py-5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xl transition"
            >
              Check In Now →
            </button>
            <p className="text-gray-600 text-sm">
              Returning to check-in in {countdown}s
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";

const SignaturePad  = dynamic(() => import("@/components/SignaturePad"),  { ssr: false });
const PaymentStep  = dynamic(() => import("./PaymentStep"),   { ssr: false });

type Plan = {
  id: number;
  name: string;
  description: string | null;
  priceCents: number;
  billingInterval: string;
  planType: string;
  classLimit: number | null;
};

type FormData = {
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  ageGroup: string;
  trainingType: string;
  planId: number | null;
  customerId: string | null; // payment-provider customer (Stripe or Square)
  paymentMethodId: string | null;
  promoCode: string;
};

const STEPS = ["Personal Info", "Waiver", "Choose Plan", "Payment", "Confirm"];

const WAIVER_TEXT = `PARTICIPATION AGREEMENT AND RELEASE OF LIABILITY

By enrolling at this academy, you ("Participant") acknowledge and agree to the following:

1. NATURE OF ACTIVITY. Brazilian Jiu-Jitsu (BJJ) is a full-contact martial art involving grappling, submissions, takedowns, and ground fighting. You understand that participation involves inherent risks of physical injury, including but not limited to bruises, sprains, fractures, joint injuries, and in rare cases, more serious harm.

2. ASSUMPTION OF RISK. You voluntarily assume all risks associated with participation in BJJ training, classes, seminars, open mats, and any other activities at this academy. You acknowledge that no amount of instruction or precaution can eliminate all risk.

3. MEDICAL FITNESS. You represent that you are in good physical health and have no condition, injury, or illness that would prevent safe participation. You agree to inform instructors of any health conditions, injuries, or limitations before participating.

4. RELEASE OF LIABILITY. To the fullest extent permitted by law, you release and hold harmless the academy, its owners, instructors, staff, and other participants from any and all claims, damages, or liability arising from your participation, including claims arising from negligence.

5. RULES AND CONDUCT. You agree to follow all academy rules, tap promptly when submitted or in pain, respect your training partners, and conduct yourself in a safe and sportsmanlike manner at all times.

6. PHOTO & MEDIA RELEASE. You grant permission for the academy to use photographs or video of you for promotional, educational, or social media purposes.

7. MEMBERSHIP TERMS. You understand that membership fees are billed on the selected interval and that cancellation requires written notice per the academy's cancellation policy.

By signing below, you confirm that you have read, understood, and agree to all terms of this agreement.`;

export default function EnrollPage() {
  const router = useRouter();
  const [step, setStep]   = useState(0);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [signed, setSigned]   = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newMemberId, setNewMemberId] = useState<number | null>(null);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [waiverText, setWaiverText] = useState(WAIVER_TEXT);

  const [form, setForm] = useState<FormData>({
    name: "", email: "", phone: "", dateOfBirth: "",
    ageGroup: "adult", trainingType: "", planId: null,
    customerId: null, paymentMethodId: null, promoCode: "",
  });
  const [promoSupported, setPromoSupported] = useState(true);

  type PromoState = { status: "idle" | "checking" | "valid" | "invalid"; label?: string };
  const [promo, setPromo] = useState<PromoState>({ status: "idle" });

  const applyPromo = async () => {
    if (!form.promoCode.trim()) return;
    setPromo({ status: "checking" });
    try {
      const res = await fetch("/api/enroll/validate-promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: form.promoCode }),
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        const off = data.coupon.percentOff != null
          ? `${data.coupon.percentOff}% off`
          : data.coupon.amountOff != null
          ? `$${(data.coupon.amountOff / 100).toFixed(2)} off`
          : "discount";
        setPromo({ status: "valid", label: `${data.coupon.name} — ${off}` });
      } else {
        setPromo({ status: "invalid" });
      }
    } catch {
      setPromo({ status: "invalid" });
    }
  };

  useEffect(() => {
    fetch("/api/plans").then((r) => r.json()).then(setPlans);
    fetch("/api/admin/settings").then(r => r.json()).then(d => {
      if (d.waiverText) setWaiverText(d.waiverText);
    }).catch(() => {});
    // Promo codes are a Stripe feature — hide the field for Square gyms
    fetch("/api/settings/public").then(r => r.json()).then(d => {
      if (d.paymentProvider === "square") setPromoSupported(false);
    }).catch(() => {});
  }, []);

  const set = (field: keyof FormData, value: string | number | null) =>
    setForm((f) => ({ ...f, [field]: value }));

  const formatPhone = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 10);
    if (digits.length < 4)  return digits;
    if (digits.length < 7)  return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  };

  const validateStep0 = () => {
    const e: Partial<FormData> = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.email.trim()) e.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Invalid email";
    if (!form.phone.trim()) e.phone = "Phone is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (step === 0 && !validateStep0()) return;
    // Skip payment step (3) when no plan selected
    if (step === 2 && !form.planId) { setStep(4); return; }
    setStep((s) => s + 1);
  };
  const back = () => {
    // Skip payment step (3) when no plan selected
    if (step === 4 && !form.planId) { setStep(2); return; }
    setStep((s) => s - 1);
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setNewMemberId(data.memberId);
        setStep(4); // success
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── Success screen ──────────────────────────────────────────────────────────
  if (step === 4) {
    return (
      <div className="min-h-dvh bg-gray-950 flex items-center justify-center px-4">
        <div className="text-center space-y-5 max-w-sm w-full">
          <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto">
            <svg className="w-10 h-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">Welcome, {form.name.split(" ")[0]}!</h1>
          <p className="text-gray-400">Your enrollment is complete. You&apos;re ready to train.</p>

          {/* Optional photo capture */}
          {newMemberId && (
            <EnrollPhotoCapture memberId={newMemberId} memberName={form.name} />
          )}

          <div className="flex flex-col gap-3 pt-2">
            <button
              onClick={() => router.push("/kiosk")}
              className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-lg transition"
            >
              Check In Now
            </button>
            {newMemberId && (
              <button
                onClick={() => router.push(`/admin/members/${newMemberId}`)}
                className="w-full py-3 rounded-2xl bg-gray-800 hover:bg-gray-700 text-gray-300 font-medium transition"
              >
                View Profile
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const selectedPlan = plans.find((p) => p.id === form.planId);

  return (
    <div className="min-h-dvh bg-gray-950 text-white flex flex-col">
      {/* Header + stepper */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-5">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-xl font-bold mb-4">New Member Enrollment</h1>
          <div className="flex items-center gap-2">
            {STEPS.map((label, i) => (
              <div key={i} className="flex items-center gap-2 flex-1 last:flex-none">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition ${
                  i < step ? "bg-blue-600 text-white" : i === step ? "bg-blue-600 text-white ring-2 ring-blue-400/40" : "bg-gray-800 text-gray-500"
                }`}>
                  {i < step ? "✓" : i + 1}
                </div>
                <span className={`text-xs hidden sm:block ${i === step ? "text-white font-medium" : "text-gray-500"}`}>{label}</span>
                {i < STEPS.length - 1 && <div className={`flex-1 h-px ${i < step ? "bg-blue-600" : "bg-gray-800"}`} />}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 flex items-start justify-center px-4 py-10">
        <div className="w-full max-w-2xl">

          {/* Step 0 — Personal Info */}
          {step === 0 && (
            <div className="space-y-5">
              <h2 className="text-2xl font-bold">Personal Information</h2>

              <Field label="Full Name *">
                <input
                  autoFocus
                  type="text"
                  placeholder="First and last name"
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  className={inputCls(!!errors.name)}
                />
                {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <Field label="Email *">
                  <input type="email" autoComplete="email" autoCorrect="off" autoCapitalize="none" placeholder="you@example.com" value={form.email}
                    onChange={(e) => set("email", e.target.value)} className={inputCls(!!errors.email)} />
                  {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
                </Field>
                <Field label="Phone *">
                  <input type="tel" placeholder="(555) 000-0000" value={form.phone}
                    onChange={(e) => set("phone", formatPhone(e.target.value))} className={inputCls(!!errors.phone)} />
                  {errors.phone && <p className="text-red-400 text-xs mt-1">{errors.phone}</p>}
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                <Field label="Date of Birth">
                  <input type="date" value={form.dateOfBirth}
                    onChange={(e) => set("dateOfBirth", e.target.value)} className={inputCls(false)} />
                </Field>
                <Field label="Age Group">
                  <select value={form.ageGroup} onChange={(e) => set("ageGroup", e.target.value)} className={inputCls(false)}>
                    <option value="adult">Adult</option>
                    <option value="kids">Kids / Youth</option>
                  </select>
                </Field>
                <Field label="Training Interest">
                  <select value={form.trainingType} onChange={(e) => set("trainingType", e.target.value)} className={inputCls(false)}>
                    <option value="">Not sure yet</option>
                    <option value="Gi">Gi</option>
                    <option value="No-Gi">No-Gi</option>
                    <option value="Both">Both</option>
                  </select>
                </Field>
              </div>
            </div>
          )}

          {/* Step 1 — Waiver */}
          {step === 1 && (
            <div className="space-y-5">
              <h2 className="text-2xl font-bold">Participation Agreement</h2>
              <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 h-64 overflow-y-auto text-sm text-gray-300 leading-relaxed whitespace-pre-line">
                {waiverText}
              </div>
              <div>
                <p className="text-sm font-medium text-gray-300 mb-2">Signature</p>
                <SignaturePad onChange={setSigned} />
              </div>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={accepted}
                  onChange={(e) => setAccepted(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded accent-blue-500 flex-shrink-0"
                />
                <span className="text-sm text-gray-300">
                  I have read and agree to the Participation Agreement and Release of Liability above.
                </span>
              </label>
            </div>
          )}

          {/* Step 2 — Choose Plan */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold">Choose a Membership</h2>
                <p className="text-gray-400 text-sm mt-1">You can skip this and pay later — you&apos;ll start as a trial member.</p>
              </div>
              <div className="grid gap-3">
                {plans.map((plan) => {
                  const selected = form.planId === plan.id;
                  return (
                    <button
                      key={plan.id}
                      onClick={() => set("planId", selected ? null : plan.id)}
                      className={`w-full text-left p-4 rounded-xl border transition ${
                        selected
                          ? "border-blue-500 bg-blue-600/10"
                          : "border-gray-700 bg-gray-900 hover:border-gray-600"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-white">{plan.name}</div>
                          {plan.description && <div className="text-sm text-gray-400 mt-0.5">{plan.description}</div>}
                        </div>
                        <div className="text-right flex-shrink-0 ml-4">
                          <div className="font-bold text-white">${(plan.priceCents / 100).toFixed(0)}</div>
                          <div className="text-xs text-gray-500">/{plan.billingInterval}</div>
                        </div>
                      </div>
                      {selected && (
                        <div className="mt-2 text-xs text-blue-400 font-medium">✓ Selected</div>
                      )}
                    </button>
                  );
                })}
              </div>

              {form.planId && promoSupported && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1.5">Promo code (optional)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={form.promoCode}
                      onChange={(e) => { set("promoCode", e.target.value.toUpperCase()); setPromo({ status: "idle" }); }}
                      placeholder="e.g. WELCOME10"
                      className="flex-1 px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm transition"
                    />
                    <button
                      type="button"
                      onClick={applyPromo}
                      disabled={!form.promoCode.trim() || promo.status === "checking"}
                      className="px-4 py-2.5 rounded-lg bg-gray-700 hover:bg-gray-600 disabled:opacity-40 text-white text-sm font-medium transition"
                    >
                      {promo.status === "checking" ? "…" : "Apply"}
                    </button>
                  </div>
                  {promo.status === "valid" && (
                    <p className="mt-1.5 text-xs text-green-400">✓ {promo.label}</p>
                  )}
                  {promo.status === "invalid" && (
                    <p className="mt-1.5 text-xs text-red-400">Code not valid or expired</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Step 3 — Payment */}
          {step === 3 && form.planId && (
            <div className="space-y-5">
              <div>
                <h2 className="text-2xl font-bold">Payment</h2>
                <p className="text-gray-400 text-sm mt-1">Your card will be charged when your membership activates.</p>
              </div>
              <PaymentStep
                name={form.name}
                email={form.email}
                onSuccess={({ customerId, paymentMethodId }) => {
                  setForm((f) => ({ ...f, customerId, paymentMethodId }));
                  setStep(4);
                }}
                onSkip={() => setStep(4)}
              />
            </div>
          )}

          {/* Step 4 — Confirm */}
          {step === 4 && (
            <div className="space-y-5">
              <h2 className="text-2xl font-bold">Confirm Enrollment</h2>
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-3 text-sm">
                <Row label="Name"     value={form.name} />
                <Row label="Email"    value={form.email || "—"} />
                <Row label="Phone"    value={form.phone || "—"} />
                <Row label="DOB"      value={form.dateOfBirth || "—"} />
                <Row label="Group"    value={form.ageGroup} />
                <Row label="Training" value={form.trainingType || "Not specified"} />
                <Row label="Waiver"   value="Signed ✓" valueClass="text-green-400" />
                <Row label="Plan"     value={selectedPlan ? `${selectedPlan.name} — $${(selectedPlan.priceCents / 100).toFixed(0)}/mo` : "Trial (no plan)"} />
                {selectedPlan && promo.status === "valid" && (
                  <Row label="Promo"  value={promo.label ?? form.promoCode} valueClass="text-green-400" />
                )}
                <Row label="Payment"  value={form.paymentMethodId ? "Card saved ✓" : "Collect later"} valueClass={form.paymentMethodId ? "text-green-400" : "text-yellow-400"} />
              </div>
              {!selectedPlan && (
                <p className="text-yellow-400 text-sm bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-3">
                  No plan selected — member will be added as a trial. You can assign a plan from their profile.
                </p>
              )}
            </div>
          )}

          {/* Nav buttons */}
          <div className="flex justify-between items-center mt-8">
            {step > 0 ? (
              <button onClick={back} className="px-5 py-3 rounded-xl bg-gray-800 hover:bg-gray-700 text-sm font-medium transition">
                ← Back
              </button>
            ) : (
              <button onClick={() => router.push("/kiosk")} className="px-5 py-3 rounded-xl text-gray-500 hover:text-gray-300 text-sm transition">
                Cancel
              </button>
            )}

            {step < 4 ? (
              // Hide the next button on step 3 — PaymentStep manages its own CTA
              step !== 3 && (
                <button
                  onClick={next}
                  disabled={step === 1 && (!signed || !accepted)}
                  className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold transition"
                >
                  Continue →
                </button>
              )
            ) : (
              <button
                onClick={submit}
                disabled={submitting}
                className="px-6 py-3 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-60 text-white font-bold transition"
              >
                {submitting ? "Enrolling…" : "Complete Enrollment"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Enrollment photo capture (shown on success screen) ───────────────────────

function EnrollPhotoCapture({ memberId }: { memberId: number; memberName: string }) {
  const [preview, setPreview]     = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [done, setDone]           = useState(false);
  const inputRef                  = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    if (file.size > 4 * 1024 * 1024) return;
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch(`/api/admin/members/${memberId}/photo`, { method: "POST", body: fd });
    if (res.ok) setDone(true);
    setUploading(false);
  }

  if (done) {
    return (
      <div className="flex items-center justify-center gap-2 text-green-400 text-sm">
        {preview && <img src={preview} alt="photo" className="w-10 h-10 rounded-full object-cover" />}
        <span>Photo saved ✓</span>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
      <p className="text-sm text-gray-400 mb-3">Add a photo so staff can recognize you at the front desk.</p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
      {preview ? (
        <div className="flex items-center gap-3">
          <img src={preview} alt="preview" className="w-14 h-14 rounded-full object-cover border-2 border-gray-600" />
          <span className="text-sm text-gray-400">{uploading ? "Uploading…" : "Ready"}</span>
        </div>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full py-2.5 rounded-xl bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium transition"
        >
          📷 Take or upload photo
        </button>
      )}
    </div>
  );
}

const inputCls = (error: boolean) =>
  `w-full px-4 py-3 rounded-xl bg-gray-800 border text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 transition ${
    error ? "border-red-500" : "border-gray-700"
  }`;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-300 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function Row({ label, value, valueClass = "text-gray-200" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-gray-800 last:border-0">
      <span className="text-gray-500">{label}</span>
      <span className={valueClass}>{value}</span>
    </div>
  );
}

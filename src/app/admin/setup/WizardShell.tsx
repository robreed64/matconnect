"use client";

import { useState } from "react";
import StepGymInfo   from "./StepGymInfo";
import StepMembers   from "./StepMembers";
import StepRegion    from "./StepRegion";
import StepWaiver    from "./StepWaiver";
import StepTaxAndPOS from "./StepTaxAndPOS";
import StepDone      from "./StepDone";

export type WizardValues = {
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
};

const STEPS = ["Gym Info", "Members", "Region", "Waiver", "Tax & POS", "Done"];

type Props = { initialValues: WizardValues };

export default function WizardShell({ initialValues }: Props) {
  const [step, setStep]     = useState(0);
  const [values, setValues] = useState<WizardValues>(initialValues);

  const onChange = (partial: Partial<WizardValues>) =>
    setValues(v => ({ ...v, ...partial }));

  const next = () => setStep(s => Math.min(s + 1, STEPS.length - 1));
  const back = () => setStep(s => Math.max(s - 1, 0));

  const saveStep = async (extra?: Partial<WizardValues>) => {
    const payload = extra ? { ...values, ...extra } : values;
    await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    next();
  };

  return (
    <div className="min-h-dvh bg-gray-950 flex items-center justify-center px-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black tracking-tight text-white">Welcome</h1>
          <p className="text-gray-500 mt-1 text-sm">Let&apos;s set up your gym in a few steps.</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center mb-8">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center flex-1 last:flex-none">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${i < step ? "bg-blue-600 text-white" : i === step ? "bg-blue-500 text-white ring-2 ring-blue-400" : "bg-gray-800 text-gray-500"}`}>
                {i < step ? "✓" : i + 1}
              </div>
              <span className={`ml-1.5 text-xs font-medium hidden sm:block ${i === step ? "text-white" : "text-gray-600"}`}>{label}</span>
              {i < STEPS.length - 1 && <div className={`flex-1 h-px mx-2 ${i < step ? "bg-blue-600" : "bg-gray-800"}`} />}
            </div>
          ))}
        </div>

        {/* Step content */}
        <div className="bg-[#0f1117] border border-gray-700/50 rounded-2xl p-6">
          {step === 0 && <StepGymInfo   values={values} onChange={onChange} onNext={() => saveStep()} />}
          {step === 1 && <StepMembers   onNext={next} onBack={back} />}
          {step === 2 && <StepRegion    values={values} onChange={onChange} onNext={() => saveStep()} onBack={back} />}
          {step === 3 && <StepWaiver    values={values} onChange={onChange} onNext={() => saveStep()} onBack={back} />}
          {step === 4 && <StepTaxAndPOS values={values} onChange={onChange} onNext={() => saveStep()} onBack={back} />}
          {step === 5 && <StepDone      values={values} onBack={back} />}
        </div>
      </div>
    </div>
  );
}

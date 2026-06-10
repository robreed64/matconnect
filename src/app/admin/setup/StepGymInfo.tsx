"use client";

import { type WizardValues } from "./WizardShell";

type Props = { values: WizardValues; onChange: (v: Partial<WizardValues>) => void; onNext: () => void };

export default function StepGymInfo({ values, onChange, onNext }: Props) {
  const field = "w-full px-4 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm";

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-white">Gym Information</h2>
        <p className="text-sm text-gray-400 mt-1">This appears on portals, the kiosk, and enrollment pages.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-400 mb-1.5">Gym Name <span className="text-red-400">*</span></label>
        <input type="text" required value={values.gymName} onChange={e => onChange({ gymName: e.target.value })} className={field} placeholder="e.g. Triangle BJJ Academy" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1.5">Email</label>
          <input type="text" inputMode="email" autoComplete="email" autoCorrect="off" autoCapitalize="none" value={values.gymEmail} onChange={e => onChange({ gymEmail: e.target.value })} className={field} placeholder="info@yourgym.com" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1.5">Phone</label>
          <input type="tel" value={values.gymPhone} onChange={e => onChange({ gymPhone: e.target.value })} className={field} placeholder="(555) 000-0000" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-400 mb-1.5">Address</label>
        <input type="text" value={values.gymAddress} onChange={e => onChange({ gymAddress: e.target.value })} className={field} placeholder="123 Main St, City, State 00000" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-400 mb-1.5">Logo URL <span className="text-gray-600 font-normal">(optional)</span></label>
        <input type="url" value={values.logoUrl} onChange={e => onChange({ logoUrl: e.target.value })} className={field} placeholder="https://yourgym.com/logo.png" />
      </div>

      <button
        onClick={() => { if (values.gymName.trim()) onNext(); }}
        disabled={!values.gymName.trim()}
        className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-semibold text-sm transition"
      >
        Continue
      </button>
    </div>
  );
}

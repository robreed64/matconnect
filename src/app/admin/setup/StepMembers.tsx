"use client";

import { useState } from "react";
import MemberImportModal from "@/components/MemberImportModal";

type Props = {
  onNext: () => void;
  onBack: () => void;
};

export default function StepMembers({ onNext, onBack }: Props) {
  const [showImport, setShowImport] = useState(false);
  const [imported, setImported] = useState(false);

  const handleImportComplete = () => {
    setImported(true);
  };

  return (
    <>
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-bold text-white">Import Members</h2>
          <p className="text-sm text-gray-400 mt-1">Upload a CSV file with your members, or skip to add them manually later.</p>
        </div>

        {!imported ? (
          <div className="border-2 border-dashed border-gray-700 rounded-xl p-8 text-center">
            <p className="text-gray-400 text-sm mb-4">You can import members from a CSV file now, or add them individually later in the Members section.</p>
            <button
              onClick={() => setShowImport(true)}
              className="px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition active:scale-[0.98]"
            >
              Import Members
            </button>
          </div>
        ) : (
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 text-center">
            <p className="text-green-300 text-sm font-medium">✓ Members imported successfully</p>
          </div>
        )}

        <p className="text-xs text-gray-600">CSV should contain columns like: name, email, phone, belt rank, status, notes</p>

        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="flex-1 px-4 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm font-medium transition"
          >
            Back
          </button>
          <button onClick={onNext} className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition active:scale-[0.98]">
            Next
          </button>
        </div>
      </div>

      {showImport && (
        <MemberImportModal
          onComplete={handleImportComplete}
          onCancel={() => setShowImport(false)}
        />
      )}
    </>
  );
}

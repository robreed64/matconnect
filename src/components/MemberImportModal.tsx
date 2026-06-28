"use client";

import { useState, useRef } from "react";

type ImportRow = {
  name?: string;
  email?: string;
  phone?: string;
  beltRank?: string;
  status?: string;
  notes?: string;
  ageGroup?: string;
  trainingType?: string;
  address?: string;
  dateOfBirth?: string;
  _index: number;
  _error?: string;
  _duplicate?: boolean;
  _existingId?: number;
};

type ImportPreview = {
  rows: ImportRow[];
  headers: string[];
  errors: string[];
  duplicates: number;
};

type Props = {
  onComplete?: (result: { created: number; updated: number; skipped: number }) => void;
  onCancel?: () => void;
};

export default function MemberImportModal({ onComplete, onCancel }: Props) {
  const [step, setStep] = useState<"upload" | "preview" | "merge" | "importing">("upload");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [mergeMap, setMergeMap] = useState<Record<number, { skip?: boolean; update?: string[] }>>({});
  const [error, setError] = useState<string>("");
  const [result, setResult] = useState<{ created: number; updated: number; skipped: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/members/import", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to parse CSV");
        return;
      }

      setPreview(data);
      setStep(data.duplicates > 0 ? "merge" : "preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    }
  };

  const handleMergeDecision = (existingId: number, decision: "skip" | "update", fieldsToUpdate?: string[]) => {
    setMergeMap((m) => ({
      ...m,
      [existingId]: decision === "skip" ? { skip: true } : { update: fieldsToUpdate || [] },
    }));
  };

  const handleImport = async () => {
    if (!preview) return;

    setStep("importing");
    setError("");

    try {
      const res = await fetch("/api/admin/members/import", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: preview.rows, mergeMap }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Import failed");
        setStep("preview");
        return;
      }

      setResult(data);
      onComplete?.(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
      setStep("preview");
    }
  };

  if (step === "upload") {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-[#0f1117] border border-gray-700/50 rounded-2xl p-8 max-w-md w-full">
          <h2 className="text-2xl font-bold text-white mb-2">Import Members</h2>
          <p className="text-gray-400 text-sm mb-6">Upload a CSV file with your member data.</p>

          {error && <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>}

          <div className="border-2 border-dashed border-gray-700 rounded-xl p-8 text-center mb-6 hover:border-gray-600 transition cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <p className="text-gray-400 text-sm">
              Drag and drop a CSV file here, or <span className="text-blue-400 font-medium">click to select</span>
            </p>
            <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
          </div>

          <p className="text-xs text-gray-600 mb-4">CSV should contain columns like: name, email, phone, belt rank, status, notes</p>

          <div className="flex gap-3">
            <button onClick={onCancel} className="flex-1 px-4 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm font-medium transition">
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "merge" && preview) {
    const duplicates = preview.rows.filter((r) => r._duplicate);

    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-[#0f1117] border border-gray-700/50 rounded-2xl p-8 max-w-2xl w-full my-8">
          <h2 className="text-2xl font-bold text-white mb-2">Resolve Duplicates</h2>
          <p className="text-gray-400 text-sm mb-6">{duplicates.length} member(s) already exist. Choose whether to skip or merge with existing data.</p>

          <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
            {duplicates.map((row) => (
              <div key={row._existingId} className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-4">
                <div className="font-semibold text-white mb-3">{row.name}</div>

                <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                  <div>
                    <p className="text-gray-500">Email</p>
                    <p className="text-gray-300">{row.email || "—"}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Belt</p>
                    <p className="text-gray-300">{row.beltRank || "—"}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleMergeDecision(row._existingId!, "skip")}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition ${
                      mergeMap[row._existingId!]?.skip ? "bg-red-500 text-white" : "bg-gray-700 hover:bg-gray-600 text-gray-300"
                    }`}
                  >
                    Skip
                  </button>
                  <button
                    onClick={() => handleMergeDecision(row._existingId!, "update", Object.keys(row).filter((k) => !k.startsWith("_") && row[k as keyof ImportRow]))}
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition ${
                      mergeMap[row._existingId!]?.update ? "bg-blue-600 text-white" : "bg-gray-700 hover:bg-gray-600 text-gray-300"
                    }`}
                  >
                    Merge
                  </button>
                </div>
              </div>
            ))}
          </div>

          {error && <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>}

          <div className="flex gap-3">
            <button onClick={() => setStep("upload")} className="flex-1 px-4 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm font-medium transition">
              Back
            </button>
            <button
              onClick={() => setStep("preview")}
              className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition active:scale-[0.98]"
            >
              Continue to Preview
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "preview" && preview) {
    const newMembers = preview.rows.filter((r) => !r._duplicate && !r._error);
    const errors = preview.rows.filter((r) => r._error);

    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-[#0f1117] border border-gray-700/50 rounded-2xl p-8 max-w-3xl w-full my-8">
          <h2 className="text-2xl font-bold text-white mb-2">Import Preview</h2>
          <p className="text-gray-400 text-sm mb-6">Review the data before importing.</p>

          {errors.length > 0 && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
              <p className="text-red-300 font-medium text-sm mb-2">{errors.length} row(s) with errors:</p>
              <ul className="space-y-1 text-xs text-red-300">
                {errors.slice(0, 5).map((r) => (
                  <li key={r._index}>
                    Row {r._index}: {r._error}
                  </li>
                ))}
                {errors.length > 5 && <li>... and {errors.length - 5} more</li>}
              </ul>
            </div>
          )}

          <div className="bg-gray-800/30 border border-gray-700/50 rounded-lg p-4 mb-6 max-h-64 overflow-y-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-700">
                  {preview.headers.map((h) => (
                    <th key={h} className="text-left py-2 px-2 text-gray-400 font-semibold">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {newMembers.slice(0, 5).map((r) => (
                  <tr key={r._index} className="border-b border-gray-700/30">
                    <td className="py-2 px-2 text-gray-300">{r.name}</td>
                    <td className="py-2 px-2 text-gray-400">{r.email || "—"}</td>
                    <td className="py-2 px-2 text-gray-400">{r.phone || "—"}</td>
                    <td className="py-2 px-2 text-gray-400">{r.beltRank || "—"}</td>
                    <td className="py-2 px-2 text-gray-400">{r.status || "active"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {newMembers.length > 5 && <p className="text-gray-600 text-xs mt-2">... and {newMembers.length - 5} more</p>}
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6 text-center">
            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
              <p className="text-2xl font-bold text-blue-400">{newMembers.length}</p>
              <p className="text-xs text-gray-400">New members</p>
            </div>
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
              <p className="text-2xl font-bold text-amber-400">{preview.duplicates}</p>
              <p className="text-xs text-gray-400">Duplicates</p>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
              <p className="text-2xl font-bold text-red-400">{errors.length}</p>
              <p className="text-xs text-gray-400">Errors</p>
            </div>
          </div>

          {error && <div className="bg-red-500/10 border border-red-500/30 text-red-300 px-4 py-3 rounded-lg text-sm mb-4">{error}</div>}

          <div className="flex gap-3">
            <button onClick={() => setStep("upload")} className="flex-1 px-4 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm font-medium transition">
              Back
            </button>
            <button
              onClick={handleImport}
              className="flex-1 px-4 py-2.5 rounded-lg bg-green-600 hover:bg-green-500 text-white text-sm font-medium transition active:scale-[0.98]"
            >
              Import {newMembers.length} Member{newMembers.length !== 1 ? "s" : ""}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === "importing") {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
        <div className="bg-[#0f1117] border border-gray-700/50 rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white font-medium">Importing members...</p>
        </div>
      </div>
    );
  }

  if (step === "preview" && result) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-[#0f1117] border border-gray-700/50 rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-12 h-12 bg-green-500/10 text-green-400 rounded-full flex items-center justify-center mx-auto mb-4 text-xl">✓</div>
          <h2 className="text-2xl font-bold text-white mb-4">Import Complete</h2>
          <div className="space-y-2 mb-6 text-sm">
            <p className="text-gray-300">
              <span className="font-semibold text-green-400">{result.created}</span> new member{result.created !== 1 ? "s" : ""} created
            </p>
            {result.updated > 0 && <p className="text-gray-300">
              <span className="font-semibold text-blue-400">{result.updated}</span> member{result.updated !== 1 ? "s" : ""} updated
            </p>}
            {result.skipped > 0 && <p className="text-gray-300">
              <span className="font-semibold text-gray-400">{result.skipped}</span> member{result.skipped !== 1 ? "s" : ""} skipped
            </p>}
          </div>
          <button
            onClick={onCancel}
            className="w-full px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition"
          >
            Done
          </button>
        </div>
      </div>
    );
  }

  return null;
}

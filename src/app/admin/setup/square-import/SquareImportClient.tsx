"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type PreviewData = {
  plans: number;
  customers: number;
  subscriptions: number;
  payments: number;
};

type StepResult = {
  created: number;
  matched?: number;
  skipped: number;
};

const STEPS = ["Plans", "Customers", "Subscriptions", "Payments"];

export default function SquareImportClient() {
  const [step, setStep] = useState(0);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, StepResult>>({});
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPreview = async () => {
      try {
        const res = await fetch("/api/admin/square-import/preview");
        if (!res.ok) {
          const data = await res.json();
          setPreviewError(data.error || "Failed to fetch preview");
          setPreviewLoading(false);
          return;
        }
        const data = await res.json();
        setPreview(data);
        setPreviewLoading(false);
      } catch (err) {
        setPreviewError(err instanceof Error ? err.message : "Unknown error");
        setPreviewLoading(false);
      }
    };
    fetchPreview();
  }, []);

  const runStep = async (stepIndex: number) => {
    const stepNames = ["plans", "customers", "subscriptions", "payments"];
    const stepName = stepNames[stepIndex];

    setRunning(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/square-import/${stepName}`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || `Failed to import ${stepName}`);
        setRunning(false);
        return;
      }

      const data = await res.json();
      setResults((prev) => ({ ...prev, [stepName]: data }));
      setStep(Math.min(stepIndex + 1, STEPS.length - 1));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setRunning(false);
    }
  };

  if (previewLoading) {
    return (
      <div className="p-8 max-w-2xl">
        <p className="text-gray-400">Loading Square data...</p>
      </div>
    );
  }

  if (previewError) {
    return (
      <div className="p-8 max-w-2xl">
        <Link
          href="/admin/setup"
          className="text-sm text-amber-500 hover:text-amber-300 transition mb-6 inline-flex items-center gap-1"
        >
          ← Configure
        </Link>
        <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 mt-4">
          <p className="text-red-300 text-sm">{previewError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl">
      <Link
        href="/admin/setup"
        className="text-sm text-amber-500 hover:text-amber-300 transition mb-6 inline-flex items-center gap-1"
      >
        ← Configure
      </Link>

      <h1 className="text-2xl font-bold text-white mt-4 mb-2">Import from Square</h1>
      <p className="text-gray-400 text-sm mb-6">
        Pull your customers, plans, subscriptions, and payment history from Square.
      </p>

      {/* Preview counts */}
      {preview && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: "Plans", value: preview.plans },
            { label: "Customers", value: preview.customers },
            { label: "Subscriptions", value: preview.subscriptions },
            { label: "Payments", value: preview.payments },
          ].map((item) => (
            <div
              key={item.label}
              className="bg-gray-900/50 border border-gray-800 rounded-lg p-3 text-center"
            >
              <p className="text-lg font-bold text-white">{item.value}</p>
              <p className="text-xs text-gray-500 mt-1">{item.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Steps */}
      <div className="space-y-3 mb-8">
        {STEPS.map((stepName, idx) => {
          const isCompleted = !!results[stepName.toLowerCase()];
          const isCurrent = step === idx;
          const isDisabled = idx > step;

          const result = results[stepName.toLowerCase()];

          return (
            <div
              key={stepName}
              className={`border rounded-lg p-4 transition ${
                isCompleted
                  ? "bg-green-900/20 border-green-700"
                  : isCurrent
                  ? "bg-blue-900/20 border-blue-700"
                  : isDisabled
                  ? "bg-gray-900/20 border-gray-700"
                  : "bg-gray-900/50 border-gray-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-white">{stepName}</h3>
                  {result && (
                    <p className="text-xs text-gray-400 mt-1">
                      Created: {result.created}
                      {result.matched !== undefined && ` • Matched: ${result.matched}`} •
                      Skipped: {result.skipped}
                    </p>
                  )}
                </div>
                {isCompleted && <span className="text-green-400 text-sm">✓ Done</span>}
                {!isCompleted && !isDisabled && (
                  <button
                    onClick={() => runStep(idx)}
                    disabled={running}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-medium text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {running ? "Running..." : "Run"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-800 rounded-lg p-4 mb-6">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {Object.keys(results).length === STEPS.length && (
        <div className="bg-green-900/20 border border-green-700 rounded-lg p-4 mb-6">
          <p className="text-green-300 text-sm">
            ✓ All imports complete! Check the Members and Plans pages to see imported data.
          </p>
        </div>
      )}

      <div className="flex gap-3">
        <Link
          href="/admin/setup"
          className="flex-1 px-4 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-center text-sm font-medium text-gray-300 transition"
        >
          Back
        </Link>
        <Link
          href="/admin/members"
          className="flex-1 px-4 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-center text-white text-sm font-medium transition"
        >
          View Members
        </Link>
      </div>
    </div>
  );
}

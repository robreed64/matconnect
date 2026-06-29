"use client";
import { useState } from "react";
import type { FaqItem } from "@/lib/site-config";

export function SiteFaqAccordion({ faq, color }: { faq: FaqItem[]; color: string }) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <div className="divide-y divide-gray-200">
      {faq.map((item, i) => (
        <div key={i} className="py-4">
          <button
            type="button"
            onClick={() => setOpenIdx(openIdx === i ? null : i)}
            className="flex w-full items-center justify-between text-left text-sm font-semibold text-gray-900"
          >
            <span>{item.question}</span>
            <svg
              className={`h-5 w-5 flex-shrink-0 transition-transform ${openIdx === i ? "rotate-180" : ""}`}
              style={{ color }}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {openIdx === i && (
            <p className="mt-3 text-sm text-gray-600 leading-relaxed">{item.answer}</p>
          )}
        </div>
      ))}
    </div>
  );
}

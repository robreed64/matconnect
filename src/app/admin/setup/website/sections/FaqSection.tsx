"use client";
import type { FaqItem } from "@/lib/site-config";

export function FaqSection({
  faq,
  onChange,
}: {
  faq: FaqItem[];
  onChange: (f: FaqItem[]) => void;
}) {
  function update(index: number, patch: Partial<FaqItem>) {
    const updated = faq.map((item, i) => (i === index ? { ...item, ...patch } : item));
    onChange(updated);
  }
  function remove(index: number) {
    onChange(faq.filter((_, i) => i !== index));
  }
  function add() {
    onChange([...faq, { question: "", answer: "" }]);
  }

  return (
    <div className="space-y-4">
      {faq.map((item, i) => (
        <div key={i} className="rounded-lg border border-gray-700/60 bg-gray-900/50 p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Question</label>
            <input value={item.question} onChange={(e) => update(i, { question: e.target.value })}
              className="w-full rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              placeholder="How many classes per week?" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Answer</label>
            <textarea value={item.answer} onChange={(e) => update(i, { answer: e.target.value })} rows={3}
              className="w-full rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
              placeholder="You can attend as many classes as you like…" />
          </div>
          <button type="button" onClick={() => remove(i)}
            className="text-xs text-red-400 hover:text-red-300 transition">
            Remove
          </button>
        </div>
      ))}
      <button type="button" onClick={add}
        className="flex items-center gap-2 rounded-lg border border-dashed border-gray-600 px-4 py-3 text-sm text-gray-400 transition hover:border-gray-400 hover:text-white w-full justify-center">
        + Add FAQ item
      </button>
    </div>
  );
}

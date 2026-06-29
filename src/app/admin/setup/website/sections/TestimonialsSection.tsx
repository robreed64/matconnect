"use client";
import type { Testimonial } from "@/lib/site-config";

export function TestimonialsSection({
  testimonials,
  onChange,
}: {
  testimonials: Testimonial[];
  onChange: (t: Testimonial[]) => void;
}) {
  function update(index: number, patch: Partial<Testimonial>) {
    const updated = testimonials.map((t, i) => (i === index ? { ...t, ...patch } : t));
    onChange(updated);
  }
  function remove(index: number) {
    onChange(testimonials.filter((_, i) => i !== index));
  }
  function add() {
    onChange([...testimonials, { name: "", belt: "White Belt", text: "" }]);
  }

  return (
    <div className="space-y-4">
      {testimonials.map((t, i) => (
        <div key={i} className="rounded-lg border border-gray-700/60 bg-gray-900/50 p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Name</label>
              <input value={t.name} onChange={(e) => update(i, { name: e.target.value })}
                className="w-full rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                placeholder="Alice Santos" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Belt</label>
              <input value={t.belt} onChange={(e) => update(i, { belt: e.target.value })}
                className="w-full rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                placeholder="Blue Belt" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-400 mb-1">Quote</label>
            <textarea value={t.text} onChange={(e) => update(i, { text: e.target.value })} rows={3}
              className="w-full rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
              placeholder="Best gym I've ever trained at…" />
          </div>
          <button type="button" onClick={() => remove(i)}
            className="text-xs text-red-400 hover:text-red-300 transition">
            Remove
          </button>
        </div>
      ))}
      <button type="button" onClick={add}
        className="flex items-center gap-2 rounded-lg border border-dashed border-gray-600 px-4 py-3 text-sm text-gray-400 transition hover:border-gray-400 hover:text-white w-full justify-center">
        + Add testimonial
      </button>
    </div>
  );
}

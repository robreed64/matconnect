export const PRESET_COLORS: Record<string, string> = {
  gi:      "bg-blue-700   border-blue-500   text-white",
  "no-gi": "bg-orange-700 border-orange-500 text-white",
  youth:   "bg-green-700  border-green-500  text-white",
  seminar: "bg-purple-700 border-purple-500 text-white",
  intro:   "bg-yellow-700 border-yellow-500 text-white",
  private: "bg-gray-700   border-gray-500   text-white",
};

const OVERFLOW_COLORS = [
  "bg-teal-700   border-teal-500   text-white",
  "bg-pink-700   border-pink-500   text-white",
  "bg-indigo-700 border-indigo-500 text-white",
  "bg-red-700    border-red-500    text-white",
  "bg-cyan-700   border-cyan-500   text-white",
  "bg-lime-700   border-lime-500   text-white",
  "bg-rose-700   border-rose-500   text-white",
  "bg-violet-700 border-violet-500 text-white",
];

export function buildColorMap(programTypes: string[]): Record<string, string> {
  const map: Record<string, string> = { ...PRESET_COLORS };
  let idx = 0;
  for (const t of programTypes) {
    if (!map[t]) {
      map[t] = OVERFLOW_COLORS[idx % OVERFLOW_COLORS.length];
      idx++;
    }
  }
  return map;
}

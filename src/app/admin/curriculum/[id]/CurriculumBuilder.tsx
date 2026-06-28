"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import VideoPlayer from "@/components/VideoPlayer";

type Technique = { name: string; description?: string; videoUrl?: string };

type Lesson = {
  id:         number;
  title:      string;
  weekNumber: number;
  dayOfWeek:  string | null;
  warmup:     string | null;
  techniques: Technique[];
  notes:      string | null;
  position:   number;
};

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const emptyLesson = (weekNumber: number): Omit<Lesson, "id"> => ({
  title:      "",
  weekNumber,
  dayOfWeek:  null,
  warmup:     null,
  techniques: [],
  notes:      null,
  position:   0,
});

export default function CurriculumBuilder({
  curriculumId,
  weeks,
  initialLessons,
}: {
  curriculumId:   number;
  weeks:          number;
  initialLessons: Lesson[];
}) {
  const router = useRouter();
  const [lessons,    setLessons]    = useState<Lesson[]>(initialLessons);
  const [editing,    setEditing]    = useState<Lesson | null>(null);
  const [adding,     setAdding]     = useState<number | null>(null); // weekNumber
  const [form,       setForm]       = useState<Omit<Lesson, "id"> | null>(null);
  const [saving,     setSaving]     = useState(false);
  const [activeWeek, setActiveWeek] = useState(1);

  const weekNumbers = Array.from({ length: weeks }, (_, i) => i + 1);
  const byWeek = (wk: number) => lessons.filter((l) => l.weekNumber === wk).sort((a, b) => a.position - b.position);

  const openAdd = (weekNumber: number) => {
    setEditing(null);
    setAdding(weekNumber);
    setForm(emptyLesson(weekNumber));
  };

  const openEdit = (lesson: Lesson) => {
    setAdding(null);
    setEditing(lesson);
    setForm({ ...lesson });
  };

  const closeForm = () => { setAdding(null); setEditing(null); setForm(null); };

  const setF = (k: string, v: unknown) =>
    setForm((f) => f ? { ...f, [k]: v } : f);

  // Technique helpers
  const addTechnique = () =>
    setForm((f) => f ? { ...f, techniques: [...f.techniques, { name: "", description: "", videoUrl: "" }] } : f);

  const updateTechnique = (i: number, k: keyof Technique, v: string) =>
    setForm((f) => {
      if (!f) return f;
      const ts = [...f.techniques];
      ts[i] = { ...ts[i], [k]: v };
      return { ...f, techniques: ts };
    });

  const removeTechnique = (i: number) =>
    setForm((f) => f ? { ...f, techniques: f.techniques.filter((_, idx) => idx !== i) } : f);

  const save = useCallback(async () => {
    if (!form || !form.title.trim()) return;
    setSaving(true);

    const cleanTechniques = form.techniques
      .filter((t) => t.name.trim())
      .map((t) => ({
        name:        t.name.trim(),
        description: t.description?.trim() || undefined,
        videoUrl:    t.videoUrl?.trim()    || undefined,
      }));

    const body = { ...form, techniques: cleanTechniques };

    if (editing) {
      const res = await fetch(`/api/admin/curriculum/${curriculumId}/lessons/${editing.id}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      if (res.ok) {
        const updated = await res.json();
        setLessons((prev) => prev.map((l) => l.id === editing.id ? { ...updated, techniques: updated.techniques as Technique[] } : l));
      }
    } else {
      const res = await fetch(`/api/admin/curriculum/${curriculumId}/lessons`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      if (res.ok) {
        const created = await res.json();
        setLessons((prev) => [...prev, { ...created, techniques: created.techniques as Technique[] }]);
      }
    }

    setSaving(false);
    closeForm();
    router.refresh();
  }, [form, editing, curriculumId, router]);

  const deleteLesson = async (lesson: Lesson) => {
    if (!confirm(`Delete "${lesson.title}"?`)) return;
    await fetch(`/api/admin/curriculum/${curriculumId}/lessons/${lesson.id}`, { method: "DELETE" });
    setLessons((prev) => prev.filter((l) => l.id !== lesson.id));
    router.refresh();
  };

  return (
    <div className="flex gap-6 min-h-0">
      {/* Week selector sidebar */}
      <div className="w-24 flex-shrink-0">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Week</p>
        <div className="space-y-1">
          {weekNumbers.map((wk) => {
            const count = byWeek(wk).length;
            return (
              <button key={wk} onClick={() => setActiveWeek(wk)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm transition ${
                  activeWeek === wk
                    ? "bg-blue-600 text-white font-semibold"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                }`}>
                Week {wk}
                {count > 0 && (
                  <span className={`ml-1 text-xs ${activeWeek === wk ? "text-blue-200" : "text-gray-600"}`}>
                    ({count})
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Lesson list for active week */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-white">Week {activeWeek}</h2>
          <button onClick={() => openAdd(activeWeek)}
            className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition">
            + Add Lesson
          </button>
        </div>

        {byWeek(activeWeek).length === 0 ? (
          <div className="bg-gray-900 border border-dashed border-gray-700 rounded-xl p-8 text-center">
            <p className="text-gray-600 text-sm">No lessons for Week {activeWeek} yet.</p>
            <button onClick={() => openAdd(activeWeek)}
              className="mt-3 text-xs text-blue-400 hover:text-blue-300 transition">
              + Add first lesson
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {byWeek(activeWeek).map((lesson) => (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                onEdit={() => openEdit(lesson)}
                onDelete={() => deleteLesson(lesson)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Lesson form panel */}
      {form && (
        <div className="fixed inset-0 bg-black/70 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-[#0f1117] border border-gray-700/50 rounded-2xl w-full max-w-2xl p-6 my-8">
            <h2 className="text-base font-bold text-white mb-5">
              {editing ? "Edit Lesson" : `New Lesson — Week ${adding}`}
            </h2>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Lesson Title *">
                  <input value={form.title} onChange={(e) => setF("title", e.target.value)}
                    className={inp} placeholder="e.g. Armbar from Guard" />
                </Field>
                <Field label="Day of Week">
                  <select value={form.dayOfWeek ?? ""} onChange={(e) => setF("dayOfWeek", e.target.value || null)}
                    className={inp}>
                    <option value="">Any day</option>
                    {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </Field>
              </div>

              <Field label="Warm-up / Drilling Notes">
                <textarea rows={2} value={form.warmup ?? ""} onChange={(e) => setF("warmup", e.target.value || null)}
                  className={`${inp} resize-none`} placeholder="e.g. Shrimping, hip escapes, pummeling 5 min each" />
              </Field>

              {/* Techniques */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-medium text-gray-400">Techniques</label>
                  <button onClick={addTechnique}
                    className="text-xs text-blue-400 hover:text-blue-300 transition">+ Add technique</button>
                </div>
                {form.techniques.length === 0 && (
                  <p className="text-xs text-gray-600 mb-2">No techniques added yet.</p>
                )}
                <div className="space-y-3">
                  {form.techniques.map((t, i) => (
                    <div key={i} className="bg-gray-800 rounded-lg p-3 space-y-2">
                      <div className="flex gap-2">
                        <input value={t.name} onChange={(e) => updateTechnique(i, "name", e.target.value)}
                          className={`${inp} flex-1`} placeholder="Technique name *" />
                        <button onClick={() => removeTechnique(i)}
                          className="text-red-500 hover:text-red-400 px-2 transition text-lg leading-none flex-shrink-0">×</button>
                      </div>
                      <input value={t.description ?? ""} onChange={(e) => updateTechnique(i, "description", e.target.value)}
                        className={inp} placeholder="Description / coaching notes (optional)" />
                      <VideoInput
                        value={t.videoUrl ?? ""}
                        onChange={(v) => updateTechnique(i, "videoUrl", v)}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <Field label="Additional Notes">
                <textarea rows={2} value={form.notes ?? ""} onChange={(e) => setF("notes", e.target.value || null)}
                  className={`${inp} resize-none`} placeholder="Sparring format, homework, reminders…" />
              </Field>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={save} disabled={saving || !form.title.trim()}
                className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-sm transition">
                {saving ? "Saving…" : editing ? "Save Changes" : "Add Lesson"}
              </button>
              <button onClick={closeForm}
                className="px-4 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LessonCard({ lesson, onEdit, onDelete }: { lesson: Lesson; onEdit: () => void; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const techs = lesson.techniques ?? [];

  return (
    <div className="bg-[#0f1117] border border-gray-700/50 rounded-xl overflow-hidden">
      <button onClick={() => setExpanded((v) => !v)}
        className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 hover:bg-gray-800/50 transition">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-white">{lesson.title}</span>
            {lesson.dayOfWeek && (
              <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">{lesson.dayOfWeek}</span>
            )}
          </div>
          <p className="text-xs text-gray-600 mt-0.5">{techs.length} technique{techs.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="px-2.5 py-1 rounded-lg bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 transition">Edit</button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="px-2.5 py-1 rounded-lg bg-red-900/40 hover:bg-red-800 text-xs text-red-400 hover:text-white transition">Delete</button>
          <span className={`text-gray-600 transition-transform ${expanded ? "rotate-180" : ""}`}>▾</span>
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 border-t border-gray-800 pt-4 space-y-4">
          {lesson.warmup && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Warm-up</p>
              <p className="text-sm text-gray-300">{lesson.warmup}</p>
            </div>
          )}
          {techs.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Techniques</p>
              <div className="space-y-2">
                {techs.map((t, i) => (
                  <div key={i} className="bg-gray-800 rounded-lg px-3 py-2.5 space-y-2">
                    <p className="text-sm font-medium text-white">{t.name}</p>
                    {t.description && <p className="text-xs text-gray-400">{t.description}</p>}
                    {t.videoUrl && <VideoPlayer url={t.videoUrl} />}
                  </div>
                ))}
              </div>
            </div>
          )}
          {lesson.notes && (
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Notes</p>
              <p className="text-sm text-gray-300">{lesson.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function VideoInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [mode, setMode] = useState<"upload" | "url">(value ? "url" : "upload");
  const [err, setErr] = useState<string | null>(null);

  async function handleFile(file: File) {
    if (file.size > 200 * 1024 * 1024) { setErr("Max 200 MB"); return; }
    setUploading(true); setErr(null);
    const fd = new FormData(); fd.append("file", file);
    const res = await fetch("/api/admin/media/video", { method: "POST", body: fd });
    const data = await res.json();
    if (res.ok) onChange(data.videoUrl);
    else setErr(data.error ?? "Upload failed");
    setUploading(false);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => setMode("upload")}
          className={`text-xs px-2.5 py-1 rounded-full transition ${mode === "upload" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-400 hover:text-white"}`}>
          Upload
        </button>
        <button type="button" onClick={() => setMode("url")}
          className={`text-xs px-2.5 py-1 rounded-full transition ${mode === "url" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-400 hover:text-white"}`}>
          URL
        </button>
        {value && (
          <button type="button" onClick={() => { onChange(""); setErr(null); }}
            className="ml-auto text-xs text-red-400 hover:text-red-300 transition">Clear</button>
        )}
      </div>

      {mode === "upload" ? (
        <div>
          <input ref={fileRef} type="file" accept="video/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          <button type="button" disabled={uploading} onClick={() => fileRef.current?.click()}
            className="w-full py-2 rounded-lg border border-dashed border-gray-600 hover:border-blue-500 text-xs text-gray-400 hover:text-white transition disabled:opacity-50">
            {uploading ? "Uploading…" : value ? "Replace video" : "Click to upload video (MP4, WebM, MOV — max 200 MB)"}
          </button>
        </div>
      ) : (
        <input
          value={value}
          onChange={e => onChange(e.target.value)}
          className={inp}
          placeholder="YouTube, Vimeo, or direct video URL"
        />
      )}

      {err && <p className="text-xs text-red-400">{err}</p>}
      {value && <VideoPlayer url={value} />}
    </div>
  );
}

const inp = "w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500 transition";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

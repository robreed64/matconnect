"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Program = { id: number; name: string; type: string; description: string | null; classCount: number };
type DeleteState = { id: number; stage: "confirm" } | { id: number; stage: "unassign"; count: number } | null;

const PROGRAM_TYPES = ["gi", "no-gi", "youth", "seminar", "intro", "private"];

export default function ScheduleSetupClient({
  programs: initial,
  instructorNames: initialNames,
}: {
  programs: Program[];
  instructorNames: string[];
}) {
  const router = useRouter();
  const [programs, setPrograms]       = useState(initial);
  const [instructors, setInstructors] = useState(initialNames);
  const [newName, setNewName]         = useState("");
  const [editingProg, setEditingProg] = useState<number | null>(null);
  const [progForm, setProgForm]       = useState<Partial<Program>>({});
  const [showNewProg, setShowNewProg] = useState(false);
  const [newProg, setNewProg]         = useState({ name: "", type: "gi", description: "" });
  const [savingProg, setSavingProg]   = useState(false);
  const [deletingProg, setDeletingProg] = useState(false);
  const [deleteState, setDeleteState] = useState<DeleteState>(null);
  const [savingNames, setSavingNames] = useState(false);
  const [error, setError]             = useState("");

  // Programs
  const saveProgram = async (id?: number) => {
    setSavingProg(true); setError("");
    try {
      const body = id ? progForm : newProg;
      const res = await fetch(id ? `/api/admin/programs/${id}` : "/api/admin/programs", {
        method: id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Save failed"); return; }
      if (id) {
        setPrograms(ps => ps.map(p => p.id === id ? { ...p, ...data } : p));
        setEditingProg(null);
      } else {
        setPrograms(ps => [...ps, { ...data, classCount: 0 }]);
        setNewProg({ name: "", type: "gi", description: "" });
        setShowNewProg(false);
      }
      router.refresh();
    } catch {
      setError("Something went wrong — please try again.");
    } finally {
      setSavingProg(false);
    }
  };

  const confirmDelete = (p: Program) => {
    setDeleteState({ id: p.id, stage: "confirm" });
    setEditingProg(null);
  };

  const doDelete = async (id: number, unassign: boolean) => {
    setDeletingProg(true); setError("");
    try {
      const url = unassign ? `/api/admin/programs/${id}?unassign=true` : `/api/admin/programs/${id}`;
      const res  = await fetch(url, { method: "DELETE" });
      const data = await res.json();
      if (res.status === 409 && data.error === "has_classes") {
        setDeleteState({ id, stage: "unassign", count: data.count });
        return;
      }
      if (!res.ok) { setError(data.error ?? "Delete failed"); setDeleteState(null); return; }
      setPrograms(ps => ps.filter(x => x.id !== id));
      setDeleteState(null);
      router.refresh();
    } catch {
      setError("Something went wrong — please try again.");
      setDeleteState(null);
    } finally {
      setDeletingProg(false);
    }
  };

  // Instructors
  const addInstructor = () => {
    const trimmed = newName.trim();
    if (!trimmed || instructors.includes(trimmed)) return;
    setInstructors(prev => [...prev, trimmed]);
    setNewName("");
  };

  const removeInstructor = (name: string) => setInstructors(prev => prev.filter(n => n !== name));

  const saveInstructors = async () => {
    setSavingNames(true);
    await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instructorNames: instructors }),
    });
    setSavingNames(false);
    router.refresh();
  };

  const inp = "px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500";
  const sel = "px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500";

  return (
    <div className="space-y-6">
      {error && <div className="bg-red-900/30 border border-red-800 text-red-300 text-sm rounded-lg px-4 py-3">{error}</div>}

      {/* Programs */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Programs</h2>
        <div className="space-y-2 mb-4">
          {programs.map(p => (
            <div key={p.id} className="rounded-lg bg-gray-800/60 border border-gray-700 px-4 py-3">
              {editingProg === p.id ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input className={`${inp} w-full`} value={progForm.name ?? ""} onChange={e => setProgForm(f => ({ ...f, name: e.target.value }))} placeholder="Name" />
                    <select className={`${sel} w-full`} value={progForm.type ?? "gi"} onChange={e => setProgForm(f => ({ ...f, type: e.target.value }))}>
                      {PROGRAM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <input className={`${inp} w-full`} value={progForm.description ?? ""} onChange={e => setProgForm(f => ({ ...f, description: e.target.value }))} placeholder="Description (optional)" />
                  <div className="flex gap-2">
                    <button onClick={() => saveProgram(p.id)} disabled={savingProg} className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium disabled:opacity-50 transition">{savingProg ? "…" : "Save"}</button>
                    <button onClick={() => setEditingProg(null)} className="px-3 py-1.5 rounded-lg bg-gray-700 text-xs text-gray-300 transition">Cancel</button>
                  </div>
                </div>
              ) : deleteState?.id === p.id && deleteState.stage === "confirm" ? (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Delete <span className="font-medium text-white">{p.name}</span>?</span>
                  <div className="flex gap-2">
                    <button onClick={() => doDelete(p.id, false)} disabled={deletingProg} className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-medium disabled:opacity-50 transition">
                      {deletingProg ? "…" : "Yes, delete"}
                    </button>
                    <button onClick={() => setDeleteState(null)} className="px-3 py-1.5 rounded-lg bg-gray-700 text-xs text-gray-300 transition">Cancel</button>
                  </div>
                </div>
              ) : deleteState?.id === p.id && deleteState.stage === "unassign" ? (
                <div className="space-y-2">
                  <p className="text-sm text-amber-300">
                    <span className="font-medium">{p.name}</span> is assigned to {(deleteState as { id: number; stage: "unassign"; count: number }).count} class{(deleteState as { id: number; stage: "unassign"; count: number }).count !== 1 ? "es" : ""}. Remove the program tag from those classes and delete?
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => doDelete(p.id, true)} disabled={deletingProg} className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-medium disabled:opacity-50 transition">
                      {deletingProg ? "…" : "Remove & delete"}
                    </button>
                    <button onClick={() => setDeleteState(null)} className="px-3 py-1.5 rounded-lg bg-gray-700 text-xs text-gray-300 transition">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-white text-sm">{p.name}</span>
                    <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-gray-700 text-gray-400 capitalize">{p.type}</span>
                    <span className="ml-2 text-xs text-gray-600">{p.classCount} class{p.classCount !== 1 ? "es" : ""}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingProg(p.id); setProgForm({ ...p }); setDeleteState(null); }} className="text-xs text-gray-400 hover:text-white transition">Edit</button>
                    <button onClick={() => confirmDelete(p)} className="text-xs text-red-500 hover:text-red-300 transition">Delete</button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {programs.length === 0 && <p className="text-sm text-gray-600">No programs yet.</p>}
        </div>

        {showNewProg ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <input className={`${inp} w-full`} value={newProg.name} onChange={e => setNewProg(f => ({ ...f, name: e.target.value }))} placeholder="Program name" />
              <select className={`${sel} w-full`} value={newProg.type} onChange={e => setNewProg(f => ({ ...f, type: e.target.value }))}>
                {PROGRAM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <input className={`${inp} w-full`} value={newProg.description} onChange={e => setNewProg(f => ({ ...f, description: e.target.value }))} placeholder="Description (optional)" />
            <div className="flex gap-2">
              <button onClick={() => saveProgram()} disabled={!newProg.name || savingProg} className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium disabled:opacity-50 transition">{savingProg ? "…" : "Add Program"}</button>
              <button onClick={() => setShowNewProg(false)} className="px-3 py-1.5 rounded-lg bg-gray-700 text-xs text-gray-300 transition">Cancel</button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowNewProg(true)} className="text-sm text-blue-400 hover:text-blue-300 transition">+ Add Program</button>
        )}
      </div>

      {/* Instructor Names */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Instructor Names</h2>
        <p className="text-xs text-gray-600 mb-3">These appear as suggestions when creating or editing classes.</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {instructors.map(name => (
            <span key={name} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-800 text-sm text-gray-300">
              {name}
              <button onClick={() => removeInstructor(name)} className="text-gray-600 hover:text-red-400 transition ml-1">×</button>
            </span>
          ))}
          {instructors.length === 0 && <p className="text-sm text-gray-600">No instructors saved.</p>}
        </div>
        <div className="flex gap-2">
          <input
            className={`${inp} flex-1`}
            placeholder="Instructor name"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addInstructor()}
          />
          <button onClick={addInstructor} className="px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm text-gray-300 transition">Add</button>
        </div>
        <button onClick={saveInstructors} disabled={savingNames} className="mt-3 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium disabled:opacity-50 transition">
          {savingNames ? "Saving…" : "Save Instructors"}
        </button>
      </div>
    </div>
  );
}

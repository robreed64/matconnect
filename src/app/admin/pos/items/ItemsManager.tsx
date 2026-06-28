"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Item = {
  id: number; name: string; priceCents: number;
  taxRate: number; stock: number | null; category: string; barcode: string | null;
};

const CAT_PILL: Record<string, string> = {
  drinks:   "bg-cyan-900/50 text-cyan-300",
  gear:     "bg-violet-900/50 text-violet-300",
  events:   "bg-amber-900/50 text-amber-300",
  day_pass: "bg-green-900/50 text-green-300",
};

const EMPTY_FORM = { name: "", priceCents: "", taxRate: "0", stock: "", category: "drinks", barcode: "" };

function catLabel(slug: string) {
  return slug.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function ItemsManager({ initialItems, categories: CATEGORIES }: { initialItems: Item[]; categories: string[] }) {
  const router = useRouter();
  const [items,       setItems]       = useState<Item[]>(initialItems);
  const [showForm,    setShowForm]    = useState(false);
  const [editing,     setEditing]     = useState<Item | null>(null);
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [saving,      setSaving]      = useState(false);
  const [deletingId,  setDeletingId]  = useState<number | null>(null);
  const [filterCat,   setFilterCat]   = useState<string>("all");

  const openNew = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (item: Item) => {
    setEditing(item);
    setForm({
      name:       item.name,
      priceCents: String(item.priceCents / 100),
      taxRate:    String(item.taxRate),
      stock:      item.stock != null ? String(item.stock) : "",
      category:   item.category,
      barcode:    item.barcode ?? "",
    });
    setShowForm(true);
  };

  const save = async () => {
    setSaving(true);
    const body = {
      name:       form.name,
      barcode:    form.barcode || null,
      priceCents: Math.round(parseFloat(form.priceCents || "0") * 100),
      taxRate:    parseFloat(form.taxRate || "0"),
      stock:      form.stock !== "" ? parseInt(form.stock) : null,
      category:   form.category,
    };

    const res = editing
      ? await fetch(`/api/admin/pos/items/${editing.id}`, { method: "PUT",  headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      : await fetch("/api/admin/pos/items",                { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

    if (res.ok) {
      const item = await res.json();
      setItems((prev) =>
        editing
          ? prev.map((i) => i.id === editing.id ? { ...item, taxRate: Number(item.taxRate) } : i)
          : [...prev, { ...item, taxRate: Number(item.taxRate) }]
      );
      setShowForm(false);
      router.refresh();
    }
    setSaving(false);
  };

  const remove = async (id: number) => {
    setDeletingId(id);
    await fetch(`/api/admin/pos/items/${id}`, { method: "DELETE" });
    setItems((prev) => prev.filter((i) => i.id !== id));
    setDeletingId(null);
  };

  const visible = filterCat === "all" ? items : items.filter((i) => i.category === filterCat);

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-2">
          {["all", ...CATEGORIES].map((cat) => (
            <button key={cat} onClick={() => setFilterCat(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition ${filterCat === cat ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"}`}>
              {cat === "all" ? "All" : catLabel(cat)}
            </button>
          ))}
        </div>
        <button onClick={openNew}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition">
          + Add Item
        </button>
      </div>

      {/* Item list */}
      <div className="bg-[#0f1117] border border-gray-700/50 rounded-xl overflow-hidden">
        {visible.length === 0 ? (
          <p className="px-5 py-10 text-center text-gray-600 text-sm">No items yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-500 text-xs">
                <th className="px-5 py-3 text-left font-medium">Name</th>
                <th className="px-5 py-3 text-left font-medium">Category</th>
                <th className="px-5 py-3 text-left font-medium">Price</th>
                <th className="px-5 py-3 text-left font-medium">Tax %</th>
                <th className="px-5 py-3 text-left font-medium">Stock</th>
                <th className="px-5 py-3 text-left font-medium">Barcode</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {visible.map((item) => (
                <tr key={item.id} className="hover:bg-gray-800/40 transition">
                  <td className="px-5 py-3 font-medium text-white">{item.name}</td>
                  <td className="px-5 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${CAT_PILL[item.category] ?? "bg-gray-700 text-gray-300"}`}>
                      {item.category}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-200">${(item.priceCents / 100).toFixed(2)}</td>
                  <td className="px-5 py-3 text-gray-400">{Number(item.taxRate)}%</td>
                  <td className="px-5 py-3">
                    {item.stock === null
                      ? <span className="text-gray-600">—</span>
                      : <span className={item.stock <= 3 ? "text-red-400 font-semibold" : "text-gray-300"}>{item.stock}</span>
                    }
                  </td>
                  <td className="px-5 py-3 text-gray-500 font-mono text-xs">{item.barcode ?? "—"}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => openEdit(item)}
                        className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 text-xs text-gray-200 transition">
                        Edit
                      </button>
                      <button onClick={() => remove(item.id)} disabled={deletingId === item.id}
                        className="px-3 py-1 rounded bg-red-900/40 hover:bg-red-800 text-xs text-red-400 hover:text-white transition disabled:opacity-50">
                        {deletingId === item.id ? "…" : "Delete"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#0f1117] border border-gray-700/50 rounded-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-white mb-5">{editing ? "Edit Item" : "Add Item"}</h2>
            <div className="space-y-4">
              <Field label="Name" required>
                <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="input-field" placeholder="e.g. Gatorade" />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Price ($)" required>
                  <input type="number" step="0.01" min="0" value={form.priceCents}
                    onChange={(e) => setForm((f) => ({ ...f, priceCents: e.target.value }))}
                    className="input-field" placeholder="0.00" />
                </Field>
                <Field label="Tax rate (%)">
                  <input type="number" step="0.01" min="0" value={form.taxRate}
                    onChange={(e) => setForm((f) => ({ ...f, taxRate: e.target.value }))}
                    className="input-field" placeholder="0" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Category">
                  <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    className="input-field">
                    {CATEGORIES.map((c) => <option key={c} value={c}>{catLabel(c)}</option>)}
                  </select>
                </Field>
                <Field label="Stock (leave blank = unlimited)">
                  <input type="number" min="0" value={form.stock}
                    onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))}
                    className="input-field" placeholder="—" />
                </Field>
              </div>
              <Field label="Barcode (optional)">
                <input value={form.barcode} onChange={(e) => setForm((f) => ({ ...f, barcode: e.target.value }))}
                  className="input-field font-mono" placeholder="e.g. 012345678901" />
              </Field>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={save} disabled={saving || !form.name || !form.priceCents}
                className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-sm transition">
                {saving ? "Saving…" : editing ? "Save Changes" : "Add Item"}
              </button>
              <button onClick={() => setShowForm(false)}
                className="px-4 py-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm transition">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .input-field {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border-radius: 0.5rem;
          background: rgb(31 41 55);
          border: 1px solid rgb(55 65 81);
          color: white;
          font-size: 0.875rem;
          outline: none;
          transition: border-color 0.15s;
        }
        .input-field:focus { border-color: rgb(59 130 246); }
        select.input-field option { background: rgb(17 24 39); }
      `}</style>
    </div>
  );
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-400 mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

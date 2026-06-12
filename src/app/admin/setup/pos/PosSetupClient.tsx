"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Item = { id: number; name: string; category: string; priceCents: number; taxRate: number; stock: number | null; barcode: string | null };

export default function PosSetupClient({ categories: initial, items: initial_items }: { categories: string[]; items: Item[] }) {
  const router = useRouter();
  const [categories, setCategories] = useState(initial);
  const [items, setItems] = useState(initial_items);
  const [newCat, setNewCat] = useState("");
  const [savingCats, setSavingCats] = useState(false);
  const [catStatus, setCatStatus] = useState<"idle" | "ok" | "error">("idle");
  const [editingItem, setEditingItem] = useState<number | "new" | null>(null);
  const [itemForm, setItemForm] = useState<Partial<Item & { priceStr: string }>>({});
  const [savingItem, setSavingItem] = useState(false);
  const [error, setError] = useState("");

  const addCategory = () => {
    const slug = newCat.trim().toLowerCase().replace(/\s+/g, "_");
    if (!slug || categories.includes(slug)) return;
    setCategories(prev => [...prev, slug]);
    setNewCat("");
  };

  const removeCategory = (cat: string) => {
    const count = items.filter(i => i.category === cat).length;
    if (count > 0) {
      alert(`"${cat}" has ${count} item(s). Move or delete them first.`);
      return;
    }
    setCategories(prev => prev.filter(c => c !== cat));
  };

  const renameCategory = (oldCat: string, newLabel: string) => {
    const slug = newLabel.trim().toLowerCase().replace(/\s+/g, "_");
    if (!slug || categories.includes(slug)) return;
    setCategories(prev => prev.map(c => c === oldCat ? slug : c));
    setItems(prev => prev.map(i => i.category === oldCat ? { ...i, category: slug } : i));
  };

  const saveCategories = async () => {
    setSavingCats(true);
    const res = await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ posCategories: categories }),
    });
    setSavingCats(false);
    setCatStatus(res.ok ? "ok" : "error");
    if (res.ok) { router.refresh(); setTimeout(() => setCatStatus("idle"), 2500); }
  };

  const startEditItem = (item: Item) => {
    setEditingItem(item.id);
    setItemForm({ ...item, priceStr: (item.priceCents / 100).toFixed(2) });
    setError("");
  };

  const startAddItem = () => {
    setEditingItem("new");
    setItemForm({ name: "", category: categories[0], priceStr: "", taxRate: 0, stock: null });
    setError("");
  };

  const saveItem = async () => {
    if (!editingItem) return;
    if (!itemForm.name?.trim()) { setError("Item name is required"); return; }
    setSavingItem(true); setError("");
    const priceCents = Math.round(parseFloat(itemForm.priceStr ?? "0") * 100);
    const body = JSON.stringify({
      name: itemForm.name,
      category: itemForm.category,
      priceCents,
      taxRate: itemForm.taxRate,
      stock: itemForm.stock ?? null,
    });
    const res = editingItem === "new"
      ? await fetch("/api/admin/pos/items", { method: "POST", headers: { "Content-Type": "application/json" }, body })
      : await fetch(`/api/admin/pos/items/${editingItem}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "Save failed"); setSavingItem(false); return; }
    setItems(prev => editingItem === "new"
      ? [...prev, { ...data, taxRate: Number(data.taxRate) }]
      : prev.map(i => i.id === editingItem ? { ...i, ...data, taxRate: Number(data.taxRate) } : i));
    setEditingItem(null);
    setSavingItem(false);
    router.refresh();
  };

  const deleteItem = async (id: number, name: string) => {
    if (!confirm(`Delete item "${name}"?`)) return;
    const res = await fetch(`/api/admin/pos/items/${id}`, { method: "DELETE" });
    if (res.ok) {
      setItems(prev => prev.filter(i => i.id !== id));
      router.refresh();
    }
  };

  const inp = "px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white text-sm focus:outline-none focus:border-blue-500";
  const [renamingCat, setRenamingCat] = useState<string | null>(null);
  const [renameVal, setRenameVal] = useState("");

  // Shared between the inline edit rows and the add-item slot
  const itemFormFields = (
    <div className="px-5 py-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Name</label>
          <input className={`${inp} w-full`} value={itemForm.name ?? ""} onChange={e => setItemForm(f => ({ ...f, name: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Category</label>
          <select className={`${inp} w-full`} value={itemForm.category ?? ""} onChange={e => setItemForm(f => ({ ...f, category: e.target.value }))}>
            {categories.map(c => <option key={c} value={c}>{c.replace(/_/g, " ")}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Price ($)</label>
          <input type="number" step="0.01" min="0" className={`${inp} w-full`}
            value={itemForm.priceStr ?? ""} onChange={e => setItemForm(f => ({ ...f, priceStr: e.target.value }))} />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Tax %</label>
          <input type="number" step="0.01" min="0" max="100" className={`${inp} w-full`}
            value={itemForm.taxRate ?? ""} onChange={e => setItemForm(f => ({ ...f, taxRate: parseFloat(e.target.value) || 0 }))} />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Stock</label>
          <input type="number" min="0" placeholder="Unlimited" className={`${inp} w-full`}
            value={itemForm.stock ?? ""} onChange={e => setItemForm(f => ({ ...f, stock: e.target.value ? parseInt(e.target.value) : null }))} />
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={saveItem} disabled={savingItem} className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium disabled:opacity-50 transition">{savingItem ? "…" : "Save"}</button>
        <button onClick={() => setEditingItem(null)} className="px-3 py-1.5 rounded-lg bg-gray-700 text-xs text-gray-300 transition">Cancel</button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {error && <div className="bg-red-900/30 border border-red-800 text-red-300 text-sm rounded-lg px-4 py-3">{error}</div>}

      {/* Categories */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Categories</h2>
        <div className="space-y-2 mb-4">
          {categories.map(cat => (
            <div key={cat} className="flex items-center gap-2">
              {renamingCat === cat ? (
                <>
                  <input className={`${inp} flex-1`} value={renameVal} onChange={e => setRenameVal(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { renameCategory(cat, renameVal); setRenamingCat(null); } }} />
                  <button onClick={() => { renameCategory(cat, renameVal); setRenamingCat(null); }} className="text-xs text-blue-400 hover:text-blue-300">Save</button>
                  <button onClick={() => setRenamingCat(null)} className="text-xs text-gray-500 hover:text-gray-300">Cancel</button>
                </>
              ) : (
                <>
                  <span className="flex-1 text-sm text-gray-300 capitalize">{cat.replace(/_/g, " ")}</span>
                  <span className="text-xs text-gray-600">{items.filter(i => i.category === cat).length} items</span>
                  {cat === "day_pass" ? (
                    // Walk-in day-pass behavior (POS check-in, trial member creation)
                    // keys off this slug — renaming it would silently disable the feature
                    <span className="text-xs text-gray-600">built-in</span>
                  ) : (
                    <>
                      <button onClick={() => { setRenamingCat(cat); setRenameVal(cat); }} className="text-xs text-gray-500 hover:text-gray-300">Rename</button>
                      <button onClick={() => removeCategory(cat)} className="text-xs text-red-500 hover:text-red-300">Delete</button>
                    </>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2 mb-3">
          <input className={`${inp} flex-1`} placeholder="New category name" value={newCat}
            onChange={e => setNewCat(e.target.value)} onKeyDown={e => e.key === "Enter" && addCategory()} />
          <button onClick={addCategory} className="px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 text-sm text-gray-300 transition">Add</button>
        </div>
        <button onClick={saveCategories} disabled={savingCats}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium disabled:opacity-50 transition">
          {savingCats ? "Saving…" : catStatus === "ok" ? "Saved ✓" : "Save Categories"}
        </button>
      </div>

      {/* Items */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Items</h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-600">{items.length} total</span>
            <button onClick={startAddItem}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition">
              + Add Item
            </button>
          </div>
        </div>
        <div className="divide-y divide-gray-800">
          {editingItem === "new" && itemFormFields}
          {items.map(item => (
            <div key={item.id}>
              {editingItem === item.id ? (
                itemFormFields
              ) : (
                <div className="px-5 py-3 flex items-center gap-4">
                  <div className="flex-1">
                    <span className="text-sm font-medium text-white">{item.name}</span>
                    <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 capitalize">{item.category.replace(/_/g, " ")}</span>
                  </div>
                  <span className="text-sm text-gray-400">${(item.priceCents / 100).toFixed(2)}</span>
                  {item.stock !== null && <span className="text-xs text-gray-600">{item.stock} in stock</span>}
                  <button onClick={() => startEditItem(item)} className="text-xs text-gray-400 hover:text-white transition">Edit</button>
                  <button onClick={() => deleteItem(item.id, item.name)} className="text-xs text-red-500 hover:text-red-300 transition">Delete</button>
                </div>
              )}
            </div>
          ))}
          {items.length === 0 && editingItem !== "new" && (
            <p className="px-5 py-8 text-center text-sm text-gray-600">No items yet — use + Add Item above.</p>
          )}
        </div>
      </div>
    </div>
  );
}

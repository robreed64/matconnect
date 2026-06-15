"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type MemberSummary = { id: number; name: string; beltRank: string | null };

type Props = {
  memberId:    number;
  currentParent: MemberSummary | null;
  childMembers:  MemberSummary[];
  readOnly?: boolean;
};

export default function FamilyManager({ memberId, currentParent, childMembers, readOnly = false }: Props) {
  const router   = useRouter();
  const [parent, setParent]     = useState<MemberSummary | null>(currentParent);
  const [kids,   setKids]       = useState<MemberSummary[]>(childMembers);
  const [search, setSearch]     = useState("");
  const [results, setResults]   = useState<MemberSummary[]>([]);
  const [loading, setLoading]   = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchMembers = useCallback(async (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    setLoading(true);
    const res  = await fetch(`/api/members/search?q=${encodeURIComponent(q)}`);
    const data = await res.json();
    // Exclude self and already-linked members
    const linked = new Set([memberId, parent?.id, ...kids.map((k) => k.id)].filter(Boolean));
    setResults((data as MemberSummary[]).filter((m) => !linked.has(m.id)));
    setLoading(false);
  }, [memberId, parent, kids]);

  const onInput = (q: string) => {
    setSearch(q);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => searchMembers(q), 250);
  };

  // Link THIS member as a child of the selected parent
  const linkAsChild = async (parentMember: MemberSummary) => {
    const res = await fetch(`/api/admin/members/${memberId}/parent`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parentId: parentMember.id }),
    });
    if (res.ok) {
      setParent(parentMember);
      setSearch(""); setResults([]);
      router.refresh();
    }
  };

  // Link selected member as a child of THIS member
  const linkAsParent = async (childMember: MemberSummary) => {
    const res = await fetch(`/api/admin/members/${childMember.id}/parent`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parentId: memberId }),
    });
    if (res.ok) {
      setKids((prev) => [...prev, childMember]);
      setSearch(""); setResults([]);
      router.refresh();
    }
  };

  const unlinkParent = async () => {
    const res = await fetch(`/api/admin/members/${memberId}/parent`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parentId: null }),
    });
    if (res.ok) { setParent(null); router.refresh(); }
  };

  const unlinkChild = async (childId: number) => {
    const res = await fetch(`/api/admin/members/${childId}/parent`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parentId: null }),
    });
    if (res.ok) { setKids((prev) => prev.filter((k) => k.id !== childId)); router.refresh(); }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-4">Family</h2>

      {/* Parent */}
      <div className="mb-4">
        <p className="text-xs text-gray-600 mb-1.5">Parent</p>
        {parent ? (
          <div className="flex items-center justify-between">
            <Link href={`/admin/members/${parent.id}`} className="text-sm text-blue-400 hover:underline">
              {parent.name}
            </Link>
            {!readOnly && (
              <button onClick={unlinkParent}
                className="text-xs text-gray-600 hover:text-red-400 transition">
                Unlink
              </button>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-600">None</p>
        )}
      </div>

      {/* Children */}
      <div className="mb-4">
        <p className="text-xs text-gray-600 mb-1.5">Children</p>
        {kids.length === 0 ? (
          <p className="text-sm text-gray-600">None</p>
        ) : (
          <div className="space-y-1.5">
            {kids.map((child) => (
              <div key={child.id} className="flex items-center justify-between">
                <Link href={`/admin/members/${child.id}`} className="text-sm text-blue-400 hover:underline">
                  {child.name}
                </Link>
                {!readOnly && (
                  <button onClick={() => unlinkChild(child.id)}
                    className="text-xs text-gray-600 hover:text-red-400 transition">
                    Unlink
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Search to link */}
      {!readOnly && (
        <div className="relative border-t border-gray-800 pt-4">
          <p className="text-xs text-gray-600 mb-1.5">Link a family member</p>
          <input
            type="text"
            placeholder="Search members…"
            value={search}
            onChange={(e) => onInput(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white placeholder-gray-500 text-xs focus:outline-none focus:border-blue-500 transition"
          />
          {loading && (
            <div className="absolute right-3 top-[2.35rem] w-3 h-3 border-2 border-gray-600 border-t-blue-500 rounded-full animate-spin" />
          )}
          {results.length > 0 && (
            <ul className="absolute z-10 mt-1 w-full bg-gray-800 border border-gray-700 rounded-xl shadow-xl overflow-hidden">
              {results.map((m) => (
                <li key={m.id} className="flex items-center justify-between px-3 py-2.5 hover:bg-gray-700 transition">
                  <span className="text-sm text-white">{m.name}</span>
                  <div className="flex gap-2">
                    {!parent && (
                      <button onClick={() => linkAsChild(m)}
                        className="text-xs px-2 py-0.5 rounded bg-gray-600 hover:bg-gray-500 text-gray-200 transition">
                        Set as my parent
                      </button>
                    )}
                    <button onClick={() => linkAsParent(m)}
                      className="text-xs px-2 py-0.5 rounded bg-blue-700 hover:bg-blue-600 text-white transition">
                      Add as child
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

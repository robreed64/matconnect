"use client";

import { useState } from "react";
import Link from "next/link";
import MemberImportModal from "@/components/MemberImportModal";

type Props = {
  canManage: boolean;
};

export default function MembersActions({ canManage }: Props) {
  const [showImport, setShowImport] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        {canManage && (
          <Link
            href="/admin/members/at-risk"
            className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm font-semibold text-gray-300 hover:text-white transition"
          >
            At-risk
          </Link>
        )}
        {canManage && (
          <button
            onClick={() => setShowImport(true)}
            className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-sm font-semibold text-gray-300 hover:text-white transition"
          >
            Import
          </button>
        )}
        {canManage && (
          <Link
            href="/admin/members/new"
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-semibold transition"
          >
            + Add Member
          </Link>
        )}
      </div>

      {showImport && (
        <MemberImportModal
          onComplete={() => {
            setShowImport(false);
            window.location.reload();
          }}
          onCancel={() => setShowImport(false)}
        />
      )}
    </>
  );
}

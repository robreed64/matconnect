"use client";
import { signOut } from "next-auth/react";

export default function LogoutButton() {
  return (
    <button
      onClick={async () => { await signOut({ redirect: false }); window.location.href = "/login"; }}
      className="text-sm text-gray-400 hover:text-white transition"
    >
      Sign out
    </button>
  );
}

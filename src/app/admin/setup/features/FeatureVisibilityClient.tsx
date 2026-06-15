"use client";

import { useState } from "react";
import Link from "next/link";

const NAV_FEATURES = [
  { key: "members",       label: "Members",       icon: "👥", desc: "Member directory and profiles" },
  { key: "leads",         label: "Leads",         icon: "🎯", desc: "Lead tracking and follow-ups" },
  { key: "plans",         label: "Plans",         icon: "💳", desc: "Membership plans and billing" },
  { key: "schedule",      label: "Schedule",      icon: "📅", desc: "Class schedule and bookings" },
  { key: "belts",         label: "Belts",         icon: "🥋", desc: "Belt ranks and stripe tracking" },
  { key: "curriculum",    label: "Curriculum",    icon: "📖", desc: "Technique curriculum builder" },
  { key: "families",      label: "Families",      icon: "👨‍👩‍👧", desc: "Family accounts and discounts" },
  { key: "pos",           label: "POS",           icon: "🛒", desc: "Point of sale and inventory" },
  { key: "marketing",     label: "Marketing",     icon: "📣", desc: "Email and SMS campaigns" },
  { key: "notifications", label: "Notifications", icon: "🔔", desc: "Push notifications" },
  { key: "reports",       label: "Reports",       icon: "📊", desc: "Analytics and reports" },
  { key: "kiosk",         label: "Kiosk",         icon: "📲", desc: "Self check-in kiosk" },
];

const PROFILE_FEATURES = [
  { key: "belt_progression", label: "Belt Progression", icon: "🥋", desc: "Belt stripes editor and promotion requirements on member profiles" },
  { key: "checkins",         label: "Check-In History",  icon: "✅", desc: "Attendance stats, QR code, and check-in log on member profiles" },
];

export default function FeatureVisibilityClient({ initialHidden }: { initialHidden: string[] }) {
  const [hidden, setHidden] = useState<string[]>(initialHidden);
  const [saving, setSaving] = useState<string | null>(null);

  const toggle = async (key: string) => {
    const next = hidden.includes(key) ? hidden.filter((k) => k !== key) : [...hidden, key];
    setSaving(key);
    setHidden(next);
    await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hiddenFeatures: next }),
    });
    setSaving(null);
  };

  return (
    <div className="p-8 max-w-3xl">
      <Link
        href="/admin/setup"
        className="text-sm text-amber-400 hover:text-amber-200 transition mb-6 inline-flex items-center gap-1"
      >
        ← Configure
      </Link>

      <h1 className="text-2xl font-bold text-white mt-4 mb-2">Feature Visibility</h1>
      <p className="text-gray-400 text-sm mb-8">
        Turn off features you don&apos;t use. Nav features are removed from the sidebar for managers
        and staff. Profile features are hidden system-wide on every member profile.
      </p>

      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Navigation</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        {NAV_FEATURES.map((f) => <ToggleCard key={f.key} feature={f} hidden={hidden} saving={saving} onToggle={toggle} />)}
      </div>

      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">Member Profile</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {PROFILE_FEATURES.map((f) => <ToggleCard key={f.key} feature={f} hidden={hidden} saving={saving} onToggle={toggle} />)}
      </div>

      {hidden.length > 0 && (
        <p className="mt-6 text-xs text-gray-600">
          {hidden.length} feature{hidden.length !== 1 ? "s" : ""} currently hidden.
        </p>
      )}
    </div>
  );
}

function ToggleCard({
  feature, hidden, saving, onToggle,
}: {
  feature: { key: string; label: string; icon: string; desc: string };
  hidden: string[];
  saving: string | null;
  onToggle: (key: string) => void;
}) {
  const isHidden = hidden.includes(feature.key);
  const isSaving = saving === feature.key;
  return (
    <button
      onClick={() => onToggle(feature.key)}
      disabled={isSaving}
      className={`flex items-center gap-4 p-4 rounded-xl border text-left transition disabled:cursor-wait ${
        isHidden
          ? "bg-gray-900/30 border-gray-800 opacity-50 hover:opacity-60"
          : "bg-gray-900 border-gray-700 hover:border-gray-500"
      }`}
    >
      <span className={`text-2xl flex-shrink-0 ${isHidden ? "grayscale opacity-50" : ""}`}>{feature.icon}</span>
      <div className="flex-1 min-w-0">
        <p className={`font-semibold text-sm ${isHidden ? "text-gray-500 line-through" : "text-white"}`}>{feature.label}</p>
        <p className="text-xs text-gray-500 mt-0.5">{feature.desc}</p>
      </div>
      <div className={`relative w-10 h-5 rounded-full flex-shrink-0 transition-colors ${isHidden ? "bg-gray-700" : "bg-green-600"}`}>
        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${isHidden ? "left-0.5" : "left-5"}`} />
      </div>
    </button>
  );
}

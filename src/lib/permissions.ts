export type Feature =
  | "settings" | "setup" | "users"
  | "members" | "plans" | "schedule" | "manage_schedule"
  | "belts" | "curriculum" | "families"
  | "pos" | "marketing" | "reports" | "kiosk" | "leads" | "notifications";

const ROLE_FEATURES: Record<string, Feature[]> = {
  admin:      ["settings", "setup", "users", "members", "plans", "schedule", "manage_schedule", "belts", "curriculum", "families", "pos", "marketing", "reports", "kiosk", "leads", "notifications"],
  manager:    ["members", "plans", "schedule", "manage_schedule", "belts", "curriculum", "families", "pos", "marketing", "reports", "kiosk", "leads", "notifications"],
  staff:      ["members", "plans", "schedule", "manage_schedule", "belts", "curriculum", "families", "pos", "marketing", "reports", "kiosk", "leads", "notifications"],
  front_desk: ["members", "pos", "schedule", "kiosk"],
};

export function can(role: string | undefined, feature: Feature): boolean {
  if (!role) return false;
  return (ROLE_FEATURES[role] ?? []).includes(feature);
}

export type NavItem = { href: string; label: string; icon: string };

const ALL_NAV: Array<NavItem & { feature: Feature }> = [
  { href: "/admin/members",    label: "Members",    icon: "👥", feature: "members" },
  { href: "/admin/leads",      label: "Leads",      icon: "🎯", feature: "leads" },
  { href: "/admin/plans",      label: "Plans",      icon: "💳", feature: "plans" },
  { href: "/admin/schedule",   label: "Schedule",   icon: "📅", feature: "schedule" },
  { href: "/admin/belts",      label: "Belts",      icon: "🥋", feature: "belts" },
  { href: "/admin/curriculum", label: "Curriculum", icon: "📖", feature: "curriculum" },
  { href: "/admin/families",   label: "Families",   icon: "👨‍👩‍👧", feature: "families" },
  { href: "/admin/pos",        label: "POS",        icon: "🛒", feature: "pos" },
  { href: "/admin/marketing",      label: "Marketing",      icon: "📣", feature: "marketing" },
  { href: "/admin/notifications",  label: "Notifications",  icon: "🔔", feature: "notifications" },
  { href: "/admin/reports",        label: "Reports",        icon: "📊", feature: "reports" },
  { href: "/admin/users",      label: "Users",      icon: "👤", feature: "users" },
  { href: "/kiosk",            label: "Kiosk",      icon: "📲", feature: "kiosk" },
];

export function navForRole(role: string | undefined): NavItem[] {
  return ALL_NAV.filter((item) => can(role, item.feature));
}

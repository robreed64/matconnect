// Shape + defaults for the per-gym public website ("website builder").
// Stored as GymSettings.siteConfig (Json). resolveSiteConfig merges stored
// values over sensible defaults so the template always has complete data.

export type SiteConfig = {
  enabled: boolean;
  themeColor: string;
  hero: { headline: string; subhead: string; imageUrl: string; ctaLabel: string };
  about: string;
  showSchedule: boolean;
  showPricing: boolean;
  socials: { instagram: string; facebook: string; youtube: string };
  seo: { title: string; description: string; ogImageUrl: string };
};

const DEFAULT_THEME = "#2563eb"; // blue-600
const DEFAULT_SUBHEAD =
  "Brazilian Jiu-Jitsu and martial arts for every level. Come train with us.";
const DEFAULT_CTA = "Start your free trial";

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}
function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

/** Merge stored siteConfig over defaults. `gymName` seeds the hero headline. */
export function resolveSiteConfig(raw: unknown, gymName: string): SiteConfig {
  const r = obj(raw);
  const hero = obj(r.hero);
  const socials = obj(r.socials);
  const seo = obj(r.seo);

  return {
    enabled: r.enabled === true,
    themeColor: str(r.themeColor) || DEFAULT_THEME,
    hero: {
      headline: str(hero.headline) || gymName,
      subhead: str(hero.subhead) || DEFAULT_SUBHEAD,
      imageUrl: str(hero.imageUrl),
      ctaLabel: str(hero.ctaLabel) || DEFAULT_CTA,
    },
    about: str(r.about),
    // default the toggles ON so an enabled site shows real data out of the box
    showSchedule: r.showSchedule !== false,
    showPricing: r.showPricing !== false,
    socials: {
      instagram: str(socials.instagram),
      facebook: str(socials.facebook),
      youtube: str(socials.youtube),
    },
    seo: {
      title: str(seo.title),
      description: str(seo.description),
      ogImageUrl: str(seo.ogImageUrl),
    },
  };
}

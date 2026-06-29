"use client";

import { useState } from "react";
import Link from "next/link";
import type { SiteConfig, Testimonial, FaqItem } from "@/lib/site-config";
import { TestimonialsSection } from "./sections/TestimonialsSection";
import { FaqSection } from "./sections/FaqSection";

function SnippetBlock({
  label,
  snippet,
  copied,
  onCopy,
}: {
  label: string;
  snippet: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="space-y-2">
      {label && <p className="text-xs font-medium text-gray-400">{label}</p>}
      <pre className="w-full overflow-x-auto rounded-lg border border-gray-700 bg-gray-900 px-4 py-3 font-mono text-xs text-gray-300">
        <code>{snippet}</code>
      </pre>
      <button
        type="button"
        onClick={onCopy}
        className="rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-gray-600"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}

// Defined at module scope (not inside the component) so their identity is stable
// across renders — otherwise inputs inside them remount and lose focus on each
// keystroke.
function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between rounded-lg border border-gray-700/60 bg-[#0f1117] px-4 py-3 text-left transition hover:border-gray-600"
    >
      <span>
        <span className="block text-sm font-medium text-white">{label}</span>
        {hint && <span className="block text-xs text-gray-500">{hint}</span>}
      </span>
      <span className={`relative h-6 w-11 flex-shrink-0 rounded-full transition ${checked ? "bg-blue-600" : "bg-gray-700"}`}>
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${checked ? "left-[22px]" : "left-0.5"}`} />
      </span>
    </button>
  );
}

function Accordion({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-gray-700/50 bg-[#0f1117]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-6 py-4 text-left"
      >
        <span className="text-sm font-semibold text-white">{title}</span>
        <svg
          className={`h-4 w-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="space-y-4 px-6 pb-6">{children}</div>}
    </div>
  );
}

const THEME_PRESETS = [
  { id: "custom" as const, label: "Custom", color: "" },
  { id: "light" as const, label: "Default", color: "#2563eb" },
  { id: "dark" as const, label: "Dark", color: "#0f172a" },
  { id: "bold" as const, label: "Bold", color: "#dc2626" },
];

export default function WebsiteEditor({
  initial,
  siteDomain,
  appUrl,
}: {
  initial: SiteConfig;
  siteDomain: string;
  appUrl: string;
}) {
  const [cfg, setCfg] = useState<SiteConfig>(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState(0);

  function set<K extends keyof SiteConfig>(key: K, value: SiteConfig[K]) {
    setCfg((p) => ({ ...p, [key]: value }));
    setStatus("idle");
  }
  function setHero<K extends keyof SiteConfig["hero"]>(key: K, value: string) {
    setCfg((p) => ({ ...p, hero: { ...p.hero, [key]: value } }));
    setStatus("idle");
  }
  function setSocial(key: keyof SiteConfig["socials"], value: string) {
    setCfg((p) => ({ ...p, socials: { ...p.socials, [key]: value } }));
    setStatus("idle");
  }
  function setSeo(key: keyof SiteConfig["seo"], value: string) {
    setCfg((p) => ({ ...p, seo: { ...p.seo, [key]: value } }));
    setStatus("idle");
  }
  function setTestimonials(t: Testimonial[]) { setCfg(p => ({ ...p, testimonials: t })); setStatus("idle"); }
  function setFaq(f: FaqItem[]) { setCfg(p => ({ ...p, faq: f })); setStatus("idle"); }

  function handleCopy(id: string, text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }).catch(() => {});
  }

  const baseUrl = siteDomain
    ? `https://${siteDomain}`
    : appUrl || "https://your-app-domain.com";

  const encodedColor = cfg.themeColor.replace("#", "%23");

  const scheduleSnippet =
    `<iframe\n  src="${baseUrl}/widget/schedule?color=${encodedColor}"\n  width="100%"\n  height="400"\n  frameborder="0"\n  style="border-radius:12px;border:none"\n></iframe>`;

  const pricingSnippet =
    `<iframe\n  src="${baseUrl}/widget/pricing?color=${encodedColor}"\n  width="100%"\n  height="400"\n  frameborder="0"\n  style="border-radius:12px;border:none"\n></iframe>`;

  const leadSnippet =
    `<iframe\n  src="${baseUrl}/widget/lead?color=${encodedColor}"\n  width="100%"\n  height="520"\n  frameborder="0"\n  style="border-radius:12px;border:none"\n></iframe>`;

  async function save() {
    setStatus("saving");
    setError(null);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteConfig: cfg }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setError(d.error ?? "Failed to save");
        setStatus("idle");
        return;
      }
      setStatus("saved");
      setPreviewKey(k => k + 1);
    } catch {
      setError("Network error");
      setStatus("idle");
    }
  }

  const input =
    "w-full rounded-lg bg-gray-900 border border-gray-700 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500";
  const labelCls = "block text-xs font-medium text-gray-400 mb-1";

  return (
    <div className="flex min-h-screen flex-col xl:flex-row xl:items-start">
      {/* Left column: form */}
      <div className="flex-1 max-w-2xl p-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Website</h1>
            <p className="mt-1 text-sm text-gray-500">Publish a public site for your gym from your existing data.</p>
          </div>
          <Link href="/admin/setup" className="text-sm text-gray-400 transition hover:text-white">← Configure</Link>
        </div>

        <div className="space-y-5">
          <Toggle
            checked={cfg.enabled}
            onChange={(v) => set("enabled", v)}
            label={cfg.enabled ? "Published" : "Draft"}
            hint={cfg.enabled ? "Your site is live at /site" : "Only visible to you via Preview until published"}
          />

          <Accordion title="Custom Domain" defaultOpen={false}>
            {siteDomain ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center rounded-full bg-green-900/40 px-3 py-1 text-xs font-semibold text-green-400 ring-1 ring-inset ring-green-700/50">
                    Configured
                  </span>
                  <span className="text-sm text-gray-300">{siteDomain}</span>
                </div>
                <a
                  href={`https://${siteDomain}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-400 transition hover:text-blue-300"
                >
                  View live site →
                </a>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg border border-gray-700/60 bg-gray-900/50 px-4 py-3">
                  <p className="mb-3 text-sm font-medium text-white">Set up a custom domain</p>
                  <ol className="space-y-2 text-sm text-gray-400">
                    <li>
                      <span className="font-medium text-gray-300">1.</span> Add your domain in the{" "}
                      <span className="text-gray-300">Vercel dashboard → Project → Settings → Domains</span>
                    </li>
                    <li>
                      <span className="font-medium text-gray-300">2.</span> Set the{" "}
                      <code className="rounded bg-gray-800 px-1.5 py-0.5 text-xs text-blue-300">NEXT_PUBLIC_SITE_DOMAIN</code>{" "}
                      environment variable to your domain (e.g.{" "}
                      <code className="rounded bg-gray-800 px-1.5 py-0.5 text-xs text-blue-300">mygym.com</code>
                      ) in Vercel env vars, then redeploy
                    </li>
                  </ol>
                </div>
                <div>
                  <p className="mb-2 text-xs font-medium text-gray-400">DNS records</p>
                  <div className="rounded-lg border border-gray-700/60 bg-gray-900 px-4 py-3 font-mono text-xs text-gray-300 space-y-1.5">
                    <div className="grid grid-cols-[auto_1fr_auto] gap-x-4">
                      <span className="text-gray-500">A</span>
                      <span>mygym.com</span>
                      <span className="text-blue-300">76.76.21.21</span>
                    </div>
                    <div className="grid grid-cols-[auto_1fr_auto] gap-x-4">
                      <span className="text-gray-500">CNAME</span>
                      <span>www.mygym.com</span>
                      <span className="text-blue-300">cname.vercel-dns.com</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </Accordion>

          <Accordion title="Branding" defaultOpen={true}>
            <div>
              <label className={labelCls}>Theme</label>
              <div className="flex flex-wrap gap-2">
                {THEME_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      if (preset.id === "custom") {
                        setCfg((p) => ({ ...p, presetTheme: "custom" }));
                      } else {
                        setCfg((p) => ({ ...p, presetTheme: preset.id, themeColor: preset.color }));
                      }
                      setStatus("idle");
                    }}
                    className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                      cfg.presetTheme === preset.id
                        ? "border-blue-500 bg-blue-950/40 text-white"
                        : "border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-500 hover:text-white"
                    }`}
                  >
                    <span
                      className="h-4 w-4 rounded-full border border-white/20"
                      style={{ backgroundColor: preset.id === "custom" ? cfg.themeColor : preset.color }}
                    />
                    {preset.label}
                  </button>
                ))}
              </div>
              {cfg.presetTheme === "custom" && (
                <div className="flex items-center gap-3 mt-3">
                  <input type="color" value={cfg.themeColor} onChange={(e) => set("themeColor", e.target.value)} className="h-9 w-14 cursor-pointer rounded border border-gray-700 bg-gray-900" />
                  <input value={cfg.themeColor} onChange={(e) => set("themeColor", e.target.value)} className={`${input} max-w-[140px]`} />
                </div>
              )}
            </div>
          </Accordion>

          <Accordion title="Hero" defaultOpen={true}>
            <div>
              <label className={labelCls}>Headline</label>
              <input value={cfg.hero.headline} onChange={(e) => setHero("headline", e.target.value)} className={input} placeholder="Your gym name" />
            </div>
            <div>
              <label className={labelCls}>Subheadline</label>
              <textarea value={cfg.hero.subhead} onChange={(e) => setHero("subhead", e.target.value)} rows={2} className={`${input} resize-none`} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={labelCls}>CTA button label</label>
                <input value={cfg.hero.ctaLabel} onChange={(e) => setHero("ctaLabel", e.target.value)} className={input} />
              </div>
              <div>
                <label className={labelCls}>Background image URL</label>
                <input value={cfg.hero.imageUrl} onChange={(e) => setHero("imageUrl", e.target.value)} className={input} placeholder="https://…" />
              </div>
            </div>
          </Accordion>

          <Accordion title="About" defaultOpen={false}>
            <textarea value={cfg.about} onChange={(e) => set("about", e.target.value)} rows={4} className={`${input} resize-none`} placeholder="Tell visitors about your gym…" />
          </Accordion>

          <Accordion title="Sections" defaultOpen={false}>
            <Toggle checked={cfg.showSchedule} onChange={(v) => set("showSchedule", v)} label="Show class schedule" hint="Pulls this week's classes" />
            <Toggle checked={cfg.showPricing} onChange={(v) => set("showPricing", v)} label="Show membership pricing" hint="Pulls your active plans" />
            <Toggle checked={cfg.showTestimonials} onChange={(v) => set("showTestimonials", v)} label="Show testimonials" hint="Member reviews you add below" />
            <Toggle checked={cfg.showFaq} onChange={(v) => set("showFaq", v)} label="Show FAQ" hint="Questions & answers you add below" />
            <Toggle checked={cfg.showMap} onChange={(v) => set("showMap", v)} label="Show map" hint="Google Maps embed of your location" />
          </Accordion>

          <Accordion title="Testimonials" defaultOpen={false}>
            <TestimonialsSection testimonials={cfg.testimonials} onChange={setTestimonials} />
          </Accordion>

          <Accordion title="FAQ" defaultOpen={false}>
            <FaqSection faq={cfg.faq} onChange={setFaq} />
          </Accordion>

          <Accordion title="Map" defaultOpen={false}>
            <div className="space-y-3">
              <p className="text-xs text-gray-500">
                Get an embed URL from{" "}
                <a href="https://maps.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300">
                  Google Maps
                </a>
                {" "}→ Share → Embed a map → copy the src URL.
              </p>
              <div>
                <label className={labelCls}>Google Maps embed URL</label>
                <input
                  value={cfg.mapEmbedUrl}
                  onChange={(e) => set("mapEmbedUrl", e.target.value)}
                  className={input}
                  placeholder="https://www.google.com/maps/embed?pb=…"
                />
              </div>
            </div>
          </Accordion>

          <Accordion title="Social links" defaultOpen={false}>
            <div>
              <label className={labelCls}>Instagram URL</label>
              <input value={cfg.socials.instagram} onChange={(e) => setSocial("instagram", e.target.value)} className={input} placeholder="https://instagram.com/…" />
            </div>
            <div>
              <label className={labelCls}>Facebook URL</label>
              <input value={cfg.socials.facebook} onChange={(e) => setSocial("facebook", e.target.value)} className={input} placeholder="https://facebook.com/…" />
            </div>
            <div>
              <label className={labelCls}>YouTube URL</label>
              <input value={cfg.socials.youtube} onChange={(e) => setSocial("youtube", e.target.value)} className={input} placeholder="https://youtube.com/…" />
            </div>
          </Accordion>

          <Accordion title="SEO" defaultOpen={false}>
            <div>
              <label className={labelCls}>Page title</label>
              <input value={cfg.seo.title} onChange={(e) => setSeo("title", e.target.value)} className={input} placeholder="Defaults to your gym name" />
            </div>
            <div>
              <label className={labelCls}>Meta description</label>
              <textarea value={cfg.seo.description} onChange={(e) => setSeo("description", e.target.value)} rows={2} className={`${input} resize-none`} />
            </div>
            <div>
              <label className={labelCls}>Social share image URL</label>
              <input value={cfg.seo.ogImageUrl} onChange={(e) => setSeo("ogImageUrl", e.target.value)} className={input} placeholder="https://…" />
            </div>
          </Accordion>

          {/* Embed Codes */}
          <Accordion title="WordPress Embed Codes" defaultOpen={false}>
            <p className="text-xs text-gray-500">
              Paste these iframe snippets into your WordPress pages to embed MatConnect widgets. The accent color above is pre-filled.
            </p>
            <div className="space-y-6">
              <SnippetBlock
                label="Class Schedule"
                snippet={scheduleSnippet}
                copied={copiedId === "schedule"}
                onCopy={() => handleCopy("schedule", scheduleSnippet)}
              />
              <SnippetBlock
                label="Membership Pricing"
                snippet={pricingSnippet}
                copied={copiedId === "pricing"}
                onCopy={() => handleCopy("pricing", pricingSnippet)}
              />
              <SnippetBlock
                label="Trial Signup Form"
                snippet={leadSnippet}
                copied={copiedId === "lead"}
                onCopy={() => handleCopy("lead", leadSnippet)}
              />
            </div>
          </Accordion>
        </div>

        <div className="sticky bottom-0 mt-6 flex items-center gap-3 border-t border-gray-800 bg-gray-950/80 py-4 backdrop-blur">
          <button
            onClick={save}
            disabled={status === "saving"}
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-500 disabled:opacity-50"
          >
            {status === "saving" ? "Saving…" : status === "saved" ? "Saved ✓" : "Save changes"}
          </button>
          <a href="/site?preview=1" target="_blank" rel="noopener noreferrer" className="rounded-lg bg-gray-800 px-5 py-2.5 text-sm font-medium text-gray-200 transition hover:bg-gray-700">
            Preview
          </a>
          {cfg.enabled && !siteDomain && (
            <a href="/site" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-400 transition hover:text-blue-300">
              View live site →
            </a>
          )}
          {error && <span className="text-sm text-red-400">{error}</span>}
        </div>
      </div>

      {/* Right column: preview — only visible at xl+ */}
      <div className="hidden xl:block xl:sticky xl:top-0 xl:h-screen xl:w-[480px] xl:p-4 xl:flex-shrink-0">
        <div className="h-full rounded-2xl border border-gray-700/50 overflow-hidden">
          <iframe
            key={previewKey}
            src="/site?preview=1"
            className="h-full w-full"
            title="Site preview"
          />
        </div>
      </div>
    </div>
  );
}

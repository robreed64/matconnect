import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getGymSettings, formatCurrency } from "@/lib/gym-settings";
import { resolveSiteConfig } from "@/lib/site-config";
import SiteLeadForm from "./SiteLeadForm";
import { SiteFaqAccordion } from "./SiteFaqAccordion";

export const dynamic = "force-dynamic";

const PROGRAM_LABELS: Record<string, string> = {
  gi: "Gi", "no-gi": "No-Gi", youth: "Youth", seminar: "Seminars", intro: "Intro", private: "Private Lessons",
};
const programLabel = (k: string) => PROGRAM_LABELS[k] ?? k.charAt(0).toUpperCase() + k.slice(1);

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getGymSettings();
  const site = resolveSiteConfig(settings.siteConfig, settings.gymName);
  if (!site.enabled) return { title: settings.gymName };
  const title = site.seo.title || settings.gymName;
  const description = site.seo.description || site.hero.subhead;
  const image = site.seo.ogImageUrl || site.hero.imageUrl || settings.logoUrl || undefined;
  return {
    title,
    description,
    openGraph: { title, description, images: image ? [image] : undefined },
  };
}

type SearchParams = Promise<{ preview?: string }>;

export default async function GymSitePage({ searchParams }: { searchParams: SearchParams }) {
  const settings = await getGymSettings();
  const site = resolveSiteConfig(settings.siteConfig, settings.gymName);
  const isPreview = (await searchParams).preview === "1";

  // Not published yet — only admins previewing (?preview=1) can see it.
  if (!site.enabled && !isPreview) notFound();

  const theme = site.themeColor;
  const tz = settings.timezone;
  const programs = (Array.isArray(settings.programTypes) ? settings.programTypes : []) as string[];
  const instructors = (Array.isArray(settings.instructorNames) ? settings.instructorNames : []) as string[];

  // Upcoming classes for the next 7 days, grouped by weekday.
  const now = new Date();
  const weekAhead = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const classes = site.showSchedule
    ? await prisma.class.findMany({
        where: { startTime: { gte: now, lt: weekAhead } },
        orderBy: { startTime: "asc" },
        select: { id: true, name: true, startTime: true, instructorName: true },
      })
    : [];
  const byDay = new Map<string, { name: string; time: string; instructor: string | null }[]>();
  for (const c of classes) {
    const day = c.startTime.toLocaleDateString("en-US", { weekday: "long", timeZone: tz });
    const time = c.startTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz });
    if (!byDay.has(day)) byDay.set(day, []);
    byDay.get(day)!.push({ name: c.name, time, instructor: c.instructorName });
  }
  const scheduleDays = WEEKDAYS.filter((d) => byDay.has(d));

  const plans = site.showPricing
    ? await prisma.membershipPlan.findMany({
        orderBy: { priceCents: "asc" },
        select: { id: true, name: true, priceCents: true, billingInterval: true },
      })
    : [];

  const socials = [
    { url: site.socials.instagram, label: "Instagram" },
    { url: site.socials.facebook, label: "Facebook" },
    { url: site.socials.youtube, label: "YouTube" },
  ].filter((s) => s.url);

  const btn = "inline-flex items-center justify-center rounded-xl px-6 py-3 text-base font-semibold text-white transition hover:opacity-90";

  return (
    <div className="min-h-dvh bg-white text-gray-900">
      {isPreview && !site.enabled && (
        <div className="bg-amber-100 px-4 py-2 text-center text-sm text-amber-900">
          Preview — this site isn&apos;t published yet. Enable it in Settings → Website.
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-gray-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            {settings.logoUrl ? (
              <Image src={settings.logoUrl} alt={settings.gymName} width={140} height={36} className="h-9 w-auto object-contain" />
            ) : (
              <span className="text-lg font-black">{settings.gymName}</span>
            )}
          </div>
          <nav className="hidden items-center gap-7 text-sm font-medium text-gray-600 md:flex">
            {site.showSchedule && scheduleDays.length > 0 && <a href="#schedule" className="hover:text-gray-900">Schedule</a>}
            {site.showPricing && plans.length > 0 && <a href="#pricing" className="hover:text-gray-900">Pricing</a>}
            <a href="#contact" className="hover:text-gray-900">Contact</a>
          </nav>
          <a href="#contact" className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90" style={{ backgroundColor: theme }}>
            {site.hero.ctaLabel}
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {site.hero.imageUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={site.hero.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-black/55" />
          </>
        ) : (
          <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${theme}, #0b1220)` }} />
        )}
        <div className="relative mx-auto max-w-4xl px-6 py-28 text-center text-white">
          <h1 className="text-4xl font-black leading-tight tracking-tight sm:text-5xl md:text-6xl">{site.hero.headline}</h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-white/85">{site.hero.subhead}</p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a href="#contact" className={btn} style={{ backgroundColor: theme }}>{site.hero.ctaLabel}</a>
            <Link href="/enroll" className="inline-flex items-center justify-center rounded-xl border border-white/40 px-6 py-3 text-base font-semibold text-white transition hover:bg-white/10">
              Join now
            </Link>
          </div>
        </div>
      </section>

      {/* About */}
      {site.about && (
        <section className="mx-auto max-w-3xl px-6 py-20 text-center">
          <h2 className="text-3xl font-bold tracking-tight">About us</h2>
          <p className="mt-5 whitespace-pre-line text-lg leading-relaxed text-gray-600">{site.about}</p>
        </section>
      )}

      {/* Programs */}
      {programs.length > 0 && (
        <section className="border-t border-gray-100 bg-gray-50">
          <div className="mx-auto max-w-6xl px-6 py-20">
            <h2 className="text-center text-3xl font-bold tracking-tight">Programs</h2>
            <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {programs.map((p) => (
                <div key={p} className="rounded-2xl border border-gray-200 bg-white p-6 text-center">
                  <div className="mx-auto mb-3 h-1.5 w-10 rounded-full" style={{ backgroundColor: theme }} />
                  <p className="font-semibold">{programLabel(p)}</p>
                </div>
              ))}
            </div>
            {instructors.length > 0 && (
              <p className="mt-10 text-center text-gray-600">
                <span className="font-semibold text-gray-900">Coaches:</span> {instructors.join(" · ")}
              </p>
            )}
          </div>
        </section>
      )}

      {/* Schedule */}
      {site.showSchedule && scheduleDays.length > 0 && (
        <section id="schedule" className="mx-auto max-w-5xl px-6 py-20">
          <h2 className="text-center text-3xl font-bold tracking-tight">This week&apos;s schedule</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {scheduleDays.map((day) => (
              <div key={day} className="rounded-2xl border border-gray-200 p-5">
                <h3 className="mb-3 font-bold" style={{ color: theme }}>{day}</h3>
                <ul className="space-y-2">
                  {byDay.get(day)!.map((c, i) => (
                    <li key={i} className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="font-medium text-gray-900">{c.name}</span>
                      <span className="whitespace-nowrap text-gray-500">{c.time}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Pricing */}
      {site.showPricing && plans.length > 0 && (
        <section id="pricing" className="border-t border-gray-100 bg-gray-50">
          <div className="mx-auto max-w-5xl px-6 py-20">
            <h2 className="text-center text-3xl font-bold tracking-tight">Membership</h2>
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {plans.map((plan) => (
                <div key={plan.id} className="flex flex-col rounded-2xl border border-gray-200 bg-white p-7">
                  <p className="font-semibold text-gray-900">{plan.name}</p>
                  <p className="mt-3 text-3xl font-black tracking-tight">
                    {formatCurrency(plan.priceCents, settings.currencySymbol, settings.locale)}
                    <span className="text-sm font-medium text-gray-500">/{plan.billingInterval}</span>
                  </p>
                  <a href="#contact" className={`${btn} mt-6 w-full`} style={{ backgroundColor: theme }}>Get started</a>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Testimonials */}
      {site.showTestimonials && site.testimonials.length > 0 && (
        <section className="py-16 bg-gray-50">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <h2 className="mb-10 text-center text-2xl font-bold text-gray-900 sm:text-3xl">
              What our members say
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {site.testimonials.map((t, i) => (
                <blockquote key={i} className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-200">
                  <p className="text-sm leading-relaxed text-gray-700 italic">&ldquo;{t.text}&rdquo;</p>
                  <footer className="mt-4 flex items-center gap-3">
                    <div
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                      style={{ backgroundColor: site.themeColor }}
                      aria-hidden="true"
                    >
                      {t.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{t.name}</p>
                      <p className="text-xs text-gray-500">{t.belt}</p>
                    </div>
                  </footer>
                </blockquote>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      {site.showFaq && site.faq.length > 0 && (
        <section className="py-16 bg-white">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <h2 className="mb-10 text-center text-2xl font-bold text-gray-900 sm:text-3xl">
              Frequently asked questions
            </h2>
            <SiteFaqAccordion faq={site.faq} color={site.themeColor} />
          </div>
        </section>
      )}

      {/* Map */}
      {site.showMap && site.mapEmbedUrl && (
        <section className="py-16 bg-gray-50">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <h2 className="mb-10 text-center text-2xl font-bold text-gray-900 sm:text-3xl">
              Find us
            </h2>
            <div className="overflow-hidden rounded-2xl shadow-sm ring-1 ring-gray-200">
              <iframe
                src={site.mapEmbedUrl}
                width="100%"
                height="400"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Gym location map"
                className="border-0"
              />
            </div>
          </div>
        </section>
      )}

      {/* Contact */}
      <section id="contact" className="mx-auto max-w-5xl px-6 py-20">
        <div className="grid items-start gap-10 md:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Start training</h2>
            <p className="mt-4 text-lg text-gray-600">
              Request a free trial class and we&apos;ll get you on the mat. No experience needed.
            </p>
            <div className="mt-8 space-y-2 text-sm text-gray-600">
              {settings.gymAddress && (
                <p>
                  <span className="font-semibold text-gray-900">Address:</span>{" "}
                  <a className="hover:underline" style={{ color: theme }} href={`https://maps.google.com/?q=${encodeURIComponent(settings.gymAddress)}`} target="_blank" rel="noopener noreferrer">
                    {settings.gymAddress}
                  </a>
                </p>
              )}
              {settings.gymPhone && (
                <p><span className="font-semibold text-gray-900">Phone:</span> <a className="hover:underline" href={`tel:${settings.gymPhone}`}>{settings.gymPhone}</a></p>
              )}
              {settings.gymEmail && (
                <p><span className="font-semibold text-gray-900">Email:</span> <a className="hover:underline" href={`mailto:${settings.gymEmail}`}>{settings.gymEmail}</a></p>
              )}
            </div>
          </div>
          <SiteLeadForm themeColor={theme} ctaLabel={site.hero.ctaLabel} />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-sm text-gray-500 sm:flex-row">
          <span className="font-bold text-gray-900">{settings.gymName}</span>
          {socials.length > 0 && (
            <div className="flex gap-5">
              {socials.map((s) => (
                <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer" className="hover:text-gray-900">{s.label}</a>
              ))}
            </div>
          )}
          <span>© {new Date().getFullYear()} {settings.gymName}</span>
        </div>
      </footer>
    </div>
  );
}

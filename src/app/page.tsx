import Link from "next/link";

// ── SVG Icons ────────────────────────────────────────────────────────────────
function IconUsers() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}
function IconTablet() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/>
      <line x1="12" y1="18" x2="12.01" y2="18"/>
    </svg>
  );
}
function IconTrophy() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="8 21 12 17 16 21"/>
      <line x1="12" y1="17" x2="12" y2="11"/>
      <path d="M7 4h10l1 7H6z"/>
      <path d="M6 11a5 5 0 0 1-5-5V4h5M18 11a5 5 0 0 0 5-5V4h-5"/>
    </svg>
  );
}
function IconCalendar() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
      <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
      <line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  );
}
function IconCreditCard() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
      <line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  );
}
function IconMail() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
      <polyline points="22,6 12,13 2,6"/>
    </svg>
  );
}
function IconCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}
function IconArrowRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
    </svg>
  );
}
function IconChart() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  );
}
function IconPhone() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="2.5" ry="2.5"/><line x1="12" y1="18" x2="12.01" y2="18"/>
    </svg>
  );
}
function IconUserPlus() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
    </svg>
  );
}
function IconGlobe() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  );
}
function IconShield() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    </svg>
  );
}
function IconChevron() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  );
}

// ── Nav ───────────────────────────────────────────────────────────────────────
function Nav() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 border-b border-gray-800/60 bg-gray-950/80 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-6 h-16 flex items-center justify-between gap-8">
        <span className="text-xl font-black tracking-tight text-white">
          Mat<span className="text-blue-500">Connect</span>
        </span>
        <nav className="hidden md:flex items-center gap-8 text-sm text-gray-400">
          <a href="#features" className="hover:text-white transition">Features</a>
          <a href="#how-it-works" className="hover:text-white transition">How it works</a>
          <a href="#pricing" className="hover:text-white transition">Pricing</a>
          <a href="#faq" className="hover:text-white transition">FAQ</a>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/login" className="hidden sm:block text-sm text-gray-400 hover:text-white transition px-3 py-2">
            Sign in
          </Link>
          <Link
            href="/login"
            className="text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition active:scale-[0.98]"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}

// ── App Preview Mockup ────────────────────────────────────────────────────────
function AppPreview() {
  return (
    <div className="relative w-full max-w-2xl mx-auto select-none pointer-events-none">
      <div className="rounded-2xl overflow-hidden border border-gray-700/60 shadow-2xl shadow-blue-950/40 bg-[#0c0e14]">
        {/* Browser chrome */}
        <div className="flex items-center gap-1.5 px-4 py-3 bg-[#0a0b10] border-b border-gray-800/60">
          <div className="w-2.5 h-2.5 rounded-full bg-gray-700" />
          <div className="w-2.5 h-2.5 rounded-full bg-gray-700" />
          <div className="w-2.5 h-2.5 rounded-full bg-gray-700" />
          <div className="mx-auto flex-1 max-w-xs h-5 bg-gray-800/60 rounded-md" />
        </div>
        {/* App content */}
        <div className="flex h-[320px]">
          {/* Sidebar */}
          <div className="w-44 border-r border-gray-800/60 bg-[#0c0e14] flex flex-col p-3 gap-1 flex-shrink-0">
            <div className="text-xs font-black text-white px-2 py-3">MatConnect</div>
            {["Dashboard", "Members", "Schedule", "Billing", "Reports"].map((item, i) => (
              <div
                key={item}
                className={`text-xs px-2 py-2 rounded-lg ${
                  i === 1 ? "bg-blue-500/10 text-blue-300 font-medium" : "text-gray-500"
                }`}
              >
                {item}
              </div>
            ))}
          </div>
          {/* Main content */}
          <div className="flex-1 p-4 overflow-hidden">
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[["142", "Members"], ["18", "Today"], ["$4,280", "MRR"]].map(([val, label]) => (
                <div key={label} className="bg-[#0f1117] border border-gray-700/50 rounded-lg p-2.5">
                  <div className="text-sm font-bold text-white">{val}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{label}</div>
                </div>
              ))}
            </div>
            {/* Recent check-ins */}
            <div className="bg-[#0f1117] border border-gray-700/50 rounded-lg overflow-hidden mb-3">
              <div className="text-[10px] font-semibold text-gray-500 px-3 py-2 border-b border-gray-800/60">
                Recent Check-ins
              </div>
              {[
                { name: "Marcus T.", belt: "Blue", time: "9:02 AM" },
                { name: "Dani R.", belt: "Purple", time: "8:58 AM" },
                { name: "Cole H.", belt: "White", time: "8:51 AM" },
              ].map((m) => (
                <div
                  key={m.name}
                  className="flex items-center justify-between px-3 py-2 border-b border-gray-800/40 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded bg-gray-700 flex-shrink-0" />
                    <span className="text-[10px] text-gray-200">{m.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">{m.belt}</span>
                    <span className="text-[9px] text-gray-600">{m.time}</span>
                  </div>
                </div>
              ))}
            </div>
            {/* Upcoming classes */}
            <div className="bg-[#0f1117] border border-gray-700/50 rounded-lg p-3">
              <div className="text-[10px] font-semibold text-gray-500 mb-2">Upcoming Classes</div>
              {[
                ["Gi — Fundamentals", "6:00 PM", "12"],
                ["No-Gi", "7:30 PM", "8"],
              ].map(([cls, time, count]) => (
                <div key={cls} className="flex items-center justify-between mb-1.5 last:mb-0">
                  <span className="text-[10px] text-gray-300">{cls}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] text-gray-500">{time}</span>
                    <span className="text-[9px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded">
                      {count} enrolled
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {/* Glow under mockup */}
      <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-3/4 h-24 bg-blue-600/20 blur-[60px] rounded-full" />
    </div>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative min-h-dvh flex flex-col items-center justify-center px-6 pt-32 pb-24 text-center overflow-hidden">
      {/* Ambient glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-blue-600/8 blur-[140px]" />
        <div className="absolute left-1/4 top-1/3 h-[300px] w-[400px] rounded-full bg-indigo-600/6 blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-full mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
          Built for BJJ &amp; martial arts schools
        </div>

        <h1 className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight text-white leading-[1.05] mb-6">
          Run your gym.
          <br />
          <span className="text-blue-400">Not spreadsheets.</span>
        </h1>

        <p className="text-lg sm:text-xl text-gray-400 leading-relaxed max-w-2xl mx-auto mb-10">
          MatConnect handles member check-in, belt progression, scheduling, and billing —
          so you can stay on the mats instead of behind a desk.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-7 py-3.5 rounded-xl transition active:scale-[0.98] shadow-lg shadow-blue-700/25 text-base"
          >
            Start free trial <IconArrowRight />
          </Link>
          <a
            href="#features"
            className="inline-flex items-center gap-2 text-gray-300 hover:text-white border border-gray-700 hover:border-gray-600 px-7 py-3.5 rounded-xl transition text-base font-medium"
          >
            See features
          </a>
        </div>

        <AppPreview />
      </div>
    </section>
  );
}

// ── Stats ─────────────────────────────────────────────────────────────────────
function Stats() {
  const stats = [
    { value: "All-in-one", label: "Check-in to billing in one app" },
    { value: "Stripe & Square", label: "Bring your own processor" },
    { value: "Set up in a day", label: "No onboarding calls or IT" },
    { value: "No contracts", label: "Month to month, cancel anytime" },
  ];
  return (
    <section className="border-y border-gray-800/60 bg-[#0a0b10]">
      <div className="mx-auto max-w-6xl px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8">
        {stats.map(({ value, label }) => (
          <div key={label} className="text-center">
            <div className="text-2xl font-black text-white tracking-tight">{value}</div>
            <div className="text-sm text-gray-500 mt-1">{label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

// ── Features ──────────────────────────────────────────────────────────────────
const FEATURES = [
  {
    icon: <IconTablet />,
    title: "Self-service kiosk",
    desc: "Members check in on any tablet — no staff required. New students can sign up and sign waivers on the spot.",
  },
  {
    icon: <IconUsers />,
    title: "Member management",
    desc: "Full profiles with photos, contact info, family accounts, waiver history, and attendance records in one place.",
  },
  {
    icon: <IconTrophy />,
    title: "Belt progression & curriculum",
    desc: "Set class, time, and technique requirements per rank, build week-by-week lesson plans, and let members track their own progress toward the next belt.",
  },
  {
    icon: <IconCalendar />,
    title: "Class scheduling",
    desc: "Recurring classes, one-offs, instructor assignment, and live rosters — with booking, waitlists, and automatic waitlist promotion.",
  },
  {
    icon: <IconCreditCard />,
    title: "Integrated billing & POS",
    desc: "Stripe and Square subscriptions, an in-person card terminal, a point of sale for gear and day passes, and automatic retries on failed payments.",
  },
  {
    icon: <IconMail />,
    title: "Automated outreach",
    desc: "Email and SMS workflows triggered by inactivity, birthdays, trial expiry, failed payments, and promotions — plus automated waiver reminders.",
  },
  {
    icon: <IconPhone />,
    title: "Member portal",
    desc: "Members get their own login to book classes, see their schedule and attendance, follow the curriculum, and track belt progress — with web push notifications.",
  },
  {
    icon: <IconChart />,
    title: "Reports & churn scoring",
    desc: "Track MRR, attendance trends, belt distribution, and member growth. Every active member gets a 0–100 churn risk score with plain-English reasons — so you know who to reach out to before they quit.",
  },
  {
    icon: <IconUserPlus />,
    title: "Lead capture & trials",
    desc: "Embed a lead form on your site, manage prospects in a pipeline, and run trials with automatic trial-expiry follow-ups to turn visitors into members.",
  },
  {
    icon: <IconGlobe />,
    title: "Built-in gym website",
    desc: "Publish a public website for your gym in minutes — hero, schedule, pricing, testimonials, FAQ, and Google Maps, all pulled live from your MatConnect data. Edit in a side-by-side preview with preset themes.",
  },
  {
    icon: <IconShield />,
    title: "WordPress & Elementor",
    desc: "Already on WordPress? Drop MatConnect blocks directly onto any page — schedule, pricing, lead form, testimonials, and FAQ — using Gutenberg blocks, shortcodes, or Elementor widgets.",
  },
];

function Features() {
  return (
    <section id="features" className="py-28 px-6">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-4">
            Everything your gym needs
          </h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            Built specifically for martial arts schools — not watered down from generic gym software.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map(({ icon, title, desc }) => (
            <div
              key={title}
              className="bg-[#0f1117] border border-gray-700/50 rounded-2xl p-6 hover:border-gray-600/60 transition group"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4 group-hover:bg-blue-500/15 transition">
                {icon}
              </div>
              <h3 className="text-base font-bold text-white mb-2">{title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── How It Works ──────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Set up in minutes",
      desc: "Add your gym info, create your class schedule, and invite staff. The setup wizard walks you through everything.",
    },
    {
      n: "02",
      title: "Members check in",
      desc: "Mount a tablet at your door. Members tap their name, new students fill out their waiver, and you get a live roster.",
    },
    {
      n: "03",
      title: "Manage from anywhere",
      desc: "The admin panel works on any device. Track attendance, process payments, and message your entire roster in seconds.",
    },
  ];

  return (
    <section id="how-it-works" className="py-28 px-6 bg-[#0a0b10] border-y border-gray-800/60">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-4">
            Up and running in a day
          </h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            No onboarding calls. No IT setup. Just sign up and start training.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map(({ n, title, desc }) => (
            <div key={n} className="relative">
              <div className="text-6xl font-black text-gray-800/80 mb-4 leading-none">{n}</div>
              <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
              <p className="text-gray-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Pricing ───────────────────────────────────────────────────────────────────
const PLANS = [
  {
    name: "Starter",
    price: "Free",
    period: "",
    desc: "For small schools just getting started.",
    features: ["Up to 30 members", "Kiosk check-in", "Class scheduling", "Email support"],
    cta: "Get started free",
    highlight: false,
  },
  {
    name: "Pro",
    price: "$99",
    period: "/month",
    desc: "For growing gyms that need the full stack.",
    features: [
      "Unlimited members",
      "Belt progression & curriculum",
      "Stripe & Square billing + POS",
      "Member portal & reports",
      "Churn risk scoring",
      "Built-in gym website",
      "Email & SMS automation",
      "Waiver management",
      "Priority support",
    ],
    cta: "Start free trial",
    highlight: true,
  },
  {
    name: "Academy",
    price: "$179",
    period: "/month",
    desc: "For multi-location schools and growing academies.",
    features: [
      "Everything in Pro",
      "Up to 3 locations (+$49 each additional)",
      "Native mobile app",
      "Staff roles & permissions",
      "Custom branding & logo",
      "Square data import / migration",
      "WordPress & Elementor plugin",
      "Dedicated support",
    ],
    cta: "Contact us",
    highlight: false,
  },
];

function Pricing() {
  return (
    <section id="pricing" className="py-28 px-6">
      <div className="mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-4">
            Simple, honest pricing
          </h2>
          <p className="text-gray-400 text-lg max-w-xl mx-auto">
            No setup fees. Cancel any time. Pro plans include a 14-day free trial.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map(({ name, price, period, desc, features, cta, highlight }) => (
            <div
              key={name}
              className={`relative rounded-2xl p-7 flex flex-col ${
                highlight
                  ? "bg-blue-600 border border-blue-500 shadow-xl shadow-blue-800/30"
                  : "bg-[#0f1117] border border-gray-700/50"
              }`}
            >
              {highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold bg-white text-blue-700 px-3 py-1 rounded-full">
                  Most popular
                </div>
              )}
              <div className="mb-6">
                <p className={`text-sm font-semibold mb-1 ${highlight ? "text-blue-100" : "text-gray-400"}`}>
                  {name}
                </p>
                <div className="flex items-end gap-1 mb-2">
                  <span className="text-4xl font-black tracking-tight text-white">{price}</span>
                  {period && (
                    <span className={`text-sm mb-1.5 ${highlight ? "text-blue-200" : "text-gray-500"}`}>
                      {period}
                    </span>
                  )}
                </div>
                <p className={`text-sm ${highlight ? "text-blue-100" : "text-gray-500"}`}>{desc}</p>
              </div>
              <ul className="space-y-3 flex-1 mb-8">
                {features.map((f) => (
                  <li
                    key={f}
                    className={`flex items-start gap-2.5 text-sm ${highlight ? "text-blue-50" : "text-gray-300"}`}
                  >
                    <span className={`mt-0.5 flex-shrink-0 ${highlight ? "text-blue-200" : "text-blue-400"}`}>
                      <IconCheck />
                    </span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/login"
                className={`block text-center text-sm font-semibold py-3 rounded-xl transition active:scale-[0.98] ${
                  highlight
                    ? "bg-white text-blue-700 hover:bg-blue-50"
                    : "bg-gray-800 hover:bg-gray-700 text-white"
                }`}
              >
                {cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── FAQ ───────────────────────────────────────────────────────────────────────
const FAQS = [
  {
    q: "What is MatConnect?",
    a: "MatConnect is all-in-one management software built for BJJ and martial arts schools. It handles member check-in, profiles, belt progression, class scheduling, billing, automated marketing, churn risk scoring, and a built-in public website — so you can spend less time on admin and more time coaching.",
  },
  {
    q: "How long does setup take?",
    a: "Most schools are up and running in a day. A setup wizard walks you through adding your gym details, building your class schedule, configuring belts, and inviting staff. There are no mandatory onboarding calls and no IT work required.",
  },
  {
    q: "Can I switch from my current software?",
    a: "Yes. If you're on Square today, you can import your customers, subscriptions, and payment history directly. Moving from another platform is straightforward too — reach out and we'll help you bring your members, plans, and waivers over.",
  },
  {
    q: "Which payment processors do you support?",
    a: "Both Stripe and Square. You can run recurring memberships, sell gear and day passes through the point of sale, and take in-person payments with a Square Terminal card reader. Use whichever processor you already have and keep your own rates.",
  },
  {
    q: "Do members get their own login?",
    a: "Yes. Every member gets a portal where they can book classes, view their schedule and attendance, follow the curriculum, and track their progress toward the next belt — plus opt-in push notifications for reminders and waitlist spots. It runs in any browser; a native mobile app is on the roadmap.",
  },
  {
    q: "Does MatConnect include a website for my gym?",
    a: "Yes. Every account gets a public gym website hosted under your MatConnect URL — with a hero section, live class schedule, pricing, testimonials, FAQ, Google Maps, and social links, all pulled from your account data. You edit it in a side-by-side preview with preset themes. If you already have a WordPress site, you can also drop MatConnect blocks directly onto any page using Gutenberg blocks or Elementor widgets.",
  },
  {
    q: "How does churn risk scoring work?",
    a: "MatConnect calculates a 0–100 risk score for every active member based on six signals: days since last check-in, whether training frequency is dropping compared to last month, payment status, trial ending with low engagement, belt progression stalled, and slow start for new members. Each score comes with plain-English reasons — so you can see at a glance who needs a call, not just a list of absent names.",
  },
  {
    q: "What hardware do I need for the kiosk?",
    a: "Just a tablet with a web browser. Mount it at your door and members tap in themselves — new students can sign up and sign their waiver on the spot. No proprietary hardware to buy.",
  },
  {
    q: "Does it track belt progression?",
    a: "Yes — it's built for martial arts. Set the class, time-in-rank, and technique requirements for each belt, build week-by-week curriculum and lesson plans, and let members see exactly how close they are to their next promotion.",
  },
  {
    q: "How does billing work for families?",
    a: "Link parents and children into a single family account, and apply an automatic family discount across their memberships. Failed payments are retried automatically, and at-risk and past-due members are flagged for follow-up.",
  },
  {
    q: "Is there a free trial or a contract?",
    a: "Pro plans include a 14-day free trial with no credit card required, and there are no setup fees. Billing is month to month — cancel any time.",
  },
  {
    q: "Can MatConnect manage multiple locations?",
    a: "Today MatConnect is built for a single school. Multi-location support for academies and affiliates is on the roadmap — if you're running more than one location, get in touch and we'll talk through your timeline.",
  },
];

function FAQ() {
  return (
    <section id="faq" className="py-28 px-6">
      <div className="mx-auto max-w-3xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-4">
            Frequently asked questions
          </h2>
          <p className="text-gray-400 text-lg">Everything you need to know before you start.</p>
        </div>
        <div className="space-y-3">
          {FAQS.map(({ q, a }) => (
            <details
              key={q}
              className="group bg-[#0f1117] border border-gray-700/50 rounded-2xl px-6 open:border-gray-600/60 transition"
            >
              <summary className="flex items-center justify-between gap-4 cursor-pointer py-5 list-none [&::-webkit-details-marker]:hidden">
                <span className="text-base font-semibold text-white">{q}</span>
                <span className="text-gray-500 flex-shrink-0 transition-transform group-open:rotate-180">
                  <IconChevron />
                </span>
              </summary>
              <p className="text-sm text-gray-400 leading-relaxed pb-6 -mt-1">{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Final CTA ─────────────────────────────────────────────────────────────────
function FinalCTA() {
  return (
    <section className="py-28 px-6 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-blue-600/8 blur-[120px] rounded-full" />
      </div>
      <div className="relative z-10 mx-auto max-w-3xl text-center">
        <h2 className="text-4xl md:text-5xl font-black tracking-tight text-white mb-5">
          Ready to take your gym off spreadsheets?
        </h2>
        <p className="text-gray-400 text-lg mb-10 max-w-xl mx-auto">
          Start your 14-day free trial. No credit card required. Cancel any time.
        </p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-4 rounded-xl transition active:scale-[0.98] shadow-lg shadow-blue-700/30 text-base"
        >
          Start free trial <IconArrowRight />
        </Link>
        <p className="text-xs text-gray-600 mt-4">Set up in under 10 minutes. No IT required.</p>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="border-t border-gray-800/60 py-10 px-6">
      <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="text-lg font-black tracking-tight text-white">
          Mat<span className="text-blue-500">Connect</span>
        </span>
        <div className="flex items-center gap-6 text-sm text-gray-500">
          <a href="#features" className="hover:text-gray-300 transition">Features</a>
          <a href="#pricing" className="hover:text-gray-300 transition">Pricing</a>
          <a href="#faq" className="hover:text-gray-300 transition">FAQ</a>
          <Link href="/login" className="hover:text-gray-300 transition">Sign in</Link>
        </div>
        <p className="text-sm text-gray-700">© {new Date().getFullYear()} MatConnect</p>
      </div>
    </footer>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-gray-950 text-white">
      <Nav />
      <main>
        <Hero />
        <Stats />
        <Features />
        <HowItWorks />
        <Pricing />
        {/* Testimonials removed until real customer quotes are available — re-add a <Testimonials /> section here. */}
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  );
}

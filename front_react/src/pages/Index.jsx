import { ArrowRight, FileText, ScanSearch } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import AppHeader from "@/components/AppHeader";
import Logo from "@/components/Logo";
import { useAuth } from "@/contexts/AuthContext";
import {
  getDefaultRouteForRole,
  getPrimaryActionLabelForRole,
} from "@/lib/roles";

const stats = [
  { value: "60", unit: "%", caption: "of referrals require manual chart review before routing." },
  { value: "40", unit: "h", caption: "per week spent reviewing documentation by hand." },
  { value: "1", unit: "×", caption: "PDF packet in — the right clinic out. No guesswork." },
];

const steps = [
  {
    no: "01",
    Icon: FileText,
    title: "Submit the packet",
    desc: "A referring provider uploads the patient record and one PDF through a simple two-step form.",
  },
  {
    no: "02",
    Icon: ScanSearch,
    title: "Eligio reads & matches",
    desc: "The AI summarizes the note and matches it to the right subspecialty clinic and intake rules.",
  },
  {
    no: "03",
    Icon: ArrowRight,
    title: "Team routes",
    desc: "A scheduler confirms the recommendation from the routing desk — fast, auditable, repeatable.",
  },
];

const features = [
  { no: "01", title: "Patient triage chat", desc: "Describe symptoms and attach a packet — get an intelligent routing recommendation in seconds.", tag: "Clinician" },
  { no: "02", title: "Referral upload", desc: "Referring providers submit a record plus one PDF through a simple two-step form.", tag: "Referrer" },
  { no: "03", title: "Specialist index", desc: "A routing knowledge base of subspecialty clinics, conditions, and intake requirements.", tag: "Scheduler" },
  { no: "04", title: "Routing desk", desc: "One workspace for every open referral with AI-assisted triage chat alongside it.", tag: "Team" },
];

const testimonials = [
  {
    initials: "KG",
    role: "Neurologist",
    org: "Johns Hopkins Hospital",
    quote: "Having Eligio AI would cut my note review time by 70%. I would be able to spend more quality time with my patients instead of drowning in paperwork.",
  },
  {
    initials: "JB",
    role: "Cardiologist",
    org: "Mount Sinai Hospital",
    quote: "Eligio AI would be a game-changer for our practice. The AI insights would help us identify patient needs we might have missed. Absolutely revolutionary.",
  },
  {
    initials: "RP",
    role: "Patient Access Leadership Team",
    org: "Johns Hopkins Hospital",
    quote: "60% of referrals require manual chart review, and it takes 40 hours/week to review documentation. Eligio AI would really help us reduce scheduling time and streamline referrals.",
  },
];

const Index = () => {
  const { isAuthenticated, user } = useAuth();
  const primaryRoute = getDefaultRouteForRole(user?.role);
  const primaryActionLabel = getPrimaryActionLabelForRole(user?.role);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <AppHeader />

      <main className="idx-in">
        {/* HERO */}
        <section className="mx-auto max-w-[1280px] border-b border-line px-4 py-14 sm:px-8 lg:py-16">
          <div className="mb-7 flex items-center gap-3.5">
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-signal">No. 01 — 06</span>
            <span className="h-px flex-1 bg-line" />
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">AI patient triage &amp; referral</span>
          </div>
          <h1 className="max-w-[1000px] font-display text-[44px] font-extrabold leading-[0.98] tracking-[-0.035em] sm:text-[64px] lg:text-[84px] lg:leading-[0.96]">
            The routing record,
            <br />
            set <span className="text-signal">straight.</span>
          </h1>
          <div className="mt-8 flex flex-col items-start gap-8 sm:flex-row sm:items-end sm:justify-between">
            <p className="max-w-[520px] border-l-2 border-signal pl-4 font-sans text-lg leading-[1.6] text-muted2">
              AI-powered note summarization and intelligent scheduling recommendations that help doctors focus on what
              matters most — patient care.
            </p>
            <div className="flex gap-3">
              {isAuthenticated ? (
                <Link to={primaryRoute}>
                  <Button size="lg" className="gap-2.5">
                    {primaryActionLabel}
                    <ArrowRight className="size-4" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/register">
                    <Button size="lg" className="gap-2.5">
                      Get started
                      <ArrowRight className="size-4" />
                    </Button>
                  </Link>
                  <Link to="/login">
                    <Button size="lg" variant="outline">
                      Sign in
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>

        {/* STATS BAND */}
        <section className="bg-strong text-on-strong">
          <div className="mx-auto grid max-w-[1280px] grid-cols-1 px-4 sm:grid-cols-3 sm:px-8">
            {stats.map((s, i) => (
              <div
                key={s.value + s.unit}
                className={`py-10 ${i > 0 ? "sm:border-l sm:border-strong-hair sm:pl-9" : ""} ${i > 0 ? "border-t border-strong-hair sm:border-t-0" : ""}`}
              >
                <div className="font-display text-[44px] font-extrabold leading-none tracking-[-0.04em] sm:text-[56px]">
                  {s.value}
                  <span className="text-signal">{s.unit}</span>
                </div>
                <div className="mt-2 max-w-[300px] font-sans text-sm leading-[1.5] text-faint">{s.caption}</div>
              </div>
            ))}
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section className="mx-auto max-w-[1280px] border-b border-line px-4 py-14 sm:px-8">
          <div className="mb-8 flex items-baseline justify-between">
            <h2 className="font-display text-[26px] font-extrabold tracking-[-0.03em] sm:text-[30px]">How a referral moves</h2>
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">Three steps</span>
          </div>
          <div className="grid grid-cols-1 border border-line sm:grid-cols-3">
            {steps.map((st, i) => (
              <div
                key={st.no}
                className={`px-6 py-8 ${i > 0 ? "border-t border-line sm:border-l sm:border-t-0" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-display text-[46px] font-extrabold leading-none tracking-[-0.04em]">{st.no}</span>
                  <st.Icon className="size-6 text-signal" />
                </div>
                <div className="mt-4 font-display text-lg font-bold tracking-[-0.02em]">{st.title}</div>
                <div className="mt-2 font-sans text-sm leading-[1.55] text-muted2">{st.desc}</div>
              </div>
            ))}
          </div>
        </section>

        {/* FEATURE INDEX */}
        <section className="mx-auto max-w-[1280px] border-b border-line px-4 py-14 sm:px-8">
          <div className="mb-2 flex items-baseline justify-between">
            <h2 className="font-display text-[26px] font-extrabold tracking-[-0.03em] sm:text-[30px]">Built for the people who route</h2>
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">The index</span>
          </div>
          {features.map((f) => (
            <div
              key={f.no}
              className="grid grid-cols-[40px_1fr_60px] items-center gap-4 border-t border-line py-6 transition-colors hover:bg-paper sm:grid-cols-[80px_1fr_1.4fr_90px] sm:gap-6"
            >
              <span className="font-mono text-[13px] text-signal">{f.no}</span>
              <span className="font-display text-lg font-bold tracking-[-0.02em] sm:text-xl">{f.title}</span>
              <span className="col-span-2 mt-1 font-sans text-sm leading-[1.5] text-muted2 sm:col-span-1 sm:mt-0">{f.desc}</span>
              <span className="hidden font-mono text-[11px] uppercase tracking-[0.12em] sm:block sm:justify-self-end">{f.tag}</span>
            </div>
          ))}
        </section>

        {/* TESTIMONIALS */}
        <section className="mx-auto max-w-[1280px] border-b border-line px-4 py-14 sm:px-8">
          <div className="mb-8 flex items-baseline justify-between">
            <h2 className="font-display text-[26px] font-extrabold tracking-[-0.03em] sm:text-[30px]">Trusted by healthcare professionals</h2>
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">What they say</span>
          </div>
          <div className="grid grid-cols-1 border border-line sm:grid-cols-3">
            {testimonials.map((t, i) => (
              <div
                key={t.initials}
                className={`flex flex-col gap-4 px-6 py-7 ${i > 0 ? "border-t border-line sm:border-l sm:border-t-0" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center border border-line font-mono text-xs font-medium">
                    {t.initials}
                  </span>
                  <div>
                    <div className="font-display text-sm font-bold leading-tight">{t.role}</div>
                    <div className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted-foreground">{t.org}</div>
                  </div>
                </div>
                <p className="font-sans text-sm italic leading-[1.6] text-muted2">&ldquo;{t.quote}&rdquo;</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-[1280px] px-4 py-12 sm:px-8">
          <div className="flex flex-col items-start gap-8 bg-signal px-7 py-12 text-white sm:flex-row sm:items-center sm:justify-between sm:px-12">
            <div>
              <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/75">Ready when you are</div>
              <h2 className="mt-2.5 max-w-[560px] font-display text-3xl font-extrabold leading-[1.02] tracking-[-0.035em] sm:text-[44px]">
                Transform your practice&apos;s referral workflow.
              </h2>
            </div>
            <Link to={isAuthenticated ? primaryRoute : "/register"} className="shrink-0">
              <Button size="lg" className="gap-2.5 bg-strong text-on-strong">
                Get started
                <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        </section>

        {/* FOOTER */}
        <footer className="border-t border-line bg-surface">
          <div className="mx-auto flex max-w-[1280px] items-center justify-between px-4 py-7 sm:px-8">
            <Logo />
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              © {new Date().getFullYear()} · Right care, routed
            </span>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default Index;

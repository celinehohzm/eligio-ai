import { useCallback } from "react";
import { ArrowRight, Calendar, FileText, Users, Shield, Zap, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import RoleTabs from "@/components/RoleTabs";
import { ThemeToggle } from "@/components/ThemeToggle";
import eligioLogo from "@/assets/eligio-logo.png";
import {
  getDefaultRouteForRole,
  getPrimaryActionLabelForRole,
} from "@/lib/roles";

const featureItems = [
  {
    Icon: FileText,
    title: "Smart Note Summarization",
    body:
      "Automatically extract key insights from patient notes using advanced AI, saving hours of manual review time.",
  },
  {
    Icon: Calendar,
    title: "Intelligent Scheduling",
    body:
      "Get personalized scheduling recommendations based on patient history, urgency levels, and optimal care windows.",
  },
  {
    Icon: Brain,
    title: "AI-Powered Insights",
    body:
      "Discover patterns in patient data and receive actionable insights to improve treatment outcomes.",
  },
  {
    Icon: Users,
    title: "Team Collaboration",
    body:
      "Seamlessly share insights and coordinate care with your medical team in real-time.",
  },
  {
    Icon: Shield,
    title: "HIPAA Compliant",
    body:
      "Enterprise-grade security ensures all patient data is protected with full HIPAA compliance.",
  },
  {
    Icon: Zap,
    title: "Lightning Fast",
    body:
      "Process thousands of medical notes in seconds, not hours. Get instant results when you need them most.",
  },
];

const testimonialItems = [
  {
    initials: "KG",
    role: "Neurologist",
    org: "Johns Hopkins Hospital",
    quote:
      "Having Eligio AI would cut my note review time by 70%. I would be able to spend more quality time with my patients instead of drowning in paperwork.",
  },
  {
    initials: "JB",
    role: "Cardiologist",
    org: "Mount Sinai Hospital",
    quote:
      "Eligio AI would be a game-changer for our practice. The AI insights would help us identify patient needs we might have missed. Absolutely revolutionary.",
  },
  {
    initials: "RP",
    role: "Patient Access Leadership Team",
    org: "Johns Hopkins Hospital",
    quote:
      "60% of referrals require manual chart review, and it takes 40 hours/week to review documentation. Eligio AI would really help us reduce scheduling time and streamline referrals.",
  },
];

const SectionDivider = ({ dark = false }) => (
  <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-16" aria-hidden>
    <div
      className={`absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent ${
        dark ? "via-white/35" : "via-primary/30"
      } to-transparent`}
    />
    <div
      className={`absolute left-1/2 top-0 h-14 w-px -translate-x-1/2 bg-gradient-to-b ${
        dark ? "from-white/35" : "from-primary/35"
      } to-transparent`}
    />
    <span
      className={`absolute left-1/2 top-3 size-2 -translate-x-1/2 rounded-full border ${
        dark
          ? "border-white/45 bg-white/70 shadow-[0_0_26px_rgba(255,255,255,0.45)]"
          : "border-primary/35 bg-background shadow-[0_0_24px_hsl(var(--primary)/0.28)]"
      }`}
    />
  </div>
);

const Index = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const primaryRoute = getDefaultRouteForRole(user?.role);
  const primaryActionLabel = getPrimaryActionLabelForRole(user?.role);
  const handlePointerMove = useCallback((event) => {
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--cursor-x", `${event.clientX - rect.left}px`);
    event.currentTarget.style.setProperty("--cursor-y", `${event.clientY - rect.top}px`);
  }, []);

  return (
    <div
      className="relative min-h-screen overflow-x-hidden"
      onPointerMove={handlePointerMove}
      style={{ "--cursor-x": "50vw", "--cursor-y": "18rem" }}
    >
      <header className="site-header">
        <div className="container mx-auto flex w-full items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="relative flex shrink-0">
              <span
                className="absolute inset-[-6px] rounded-2xl bg-gradient-to-br from-cyan-400/35 via-transparent to-teal-400/35 opacity-80 blur-md motion-safe:animate-pulse motion-reduce:hidden"
                aria-hidden
              />
              <img
                src={eligioLogo}
                alt="Eligio AI"
                className="relative size-14 object-contain motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out motion-safe:hover:scale-[1.03]"
              />
            </span>
            <span className="bg-gradient-to-r from-foreground via-foreground to-primary bg-clip-text text-xl font-bold tracking-tight text-transparent">
              Eligio AI
            </span>
          </div>
          <div className="flex items-center gap-3 md:gap-8">
            <ThemeToggle />
            <div className="hidden items-center gap-8 md:flex">
            {isAuthenticated ? (
              <>
                <RoleTabs />
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">Welcome, {user?.name}</span>
                  <Button variant="outline" size="sm" onClick={logout}>
                    Logout
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-primary"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="text-sm font-medium text-muted-foreground transition-colors duration-200 hover:text-primary"
                >
                  Register
                </Link>
              </>
            )}
            </div>
          </div>
        </div>
      </header>

      <section
        className="relative overflow-hidden bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(192_58%_96%)_48%,hsl(186_45%_94%)_100%)] px-4 pb-24 pt-16 dark:bg-[linear-gradient(180deg,hsl(var(--background))_0%,hsl(216_38%_9%)_52%,hsl(198_44%_10%)_100%)] lg:pb-32 lg:pt-24"
        onPointerMove={handlePointerMove}
      >
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(115deg,transparent_0%,transparent_58%,hsl(var(--primary)/0.08)_58.2%,transparent_76%),linear-gradient(90deg,hsl(var(--foreground)/0.075)_1px,transparent_1px),linear-gradient(180deg,hsl(var(--foreground)/0.055)_1px,transparent_1px)] bg-[auto,52px_52px,52px_52px]" aria-hidden />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_360px_at_var(--cursor-x)_var(--cursor-y),hsl(var(--primary)/0.18),transparent_62%)] opacity-90 transition-opacity duration-300 motion-reduce:hidden" aria-hidden />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,hsl(var(--primary)/0.16)_1px,transparent_1px),linear-gradient(180deg,hsl(var(--primary)/0.12)_1px,transparent_1px)] bg-[52px_52px] opacity-0 [mask-image:radial-gradient(circle_260px_at_var(--cursor-x)_var(--cursor-y),black,transparent_72%)] transition-opacity duration-300 motion-safe:hover:opacity-100" aria-hidden />
        <div className="pointer-events-none absolute left-1/2 top-[12%] h-72 w-[min(100%,820px)] -translate-x-1/2 bg-[radial-gradient(ellipse_at_center,hsl(var(--primary)/0.14),transparent_66%)] blur-[70px]" aria-hidden />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent via-background/55 to-muted/45" aria-hidden />
        <div className="container relative mx-auto text-center">
          <div className="mx-auto max-w-4xl">
            <div className="motion-safe:animate-fade-down">
              <p className="mb-6 inline-flex items-center rounded-full border border-border/70 bg-background/80 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground shadow-sm backdrop-blur-sm">
                Clinical workflow • AI-assisted
              </p>
              <h1 className="text-balance text-4xl font-bold leading-[1.1] tracking-tight text-foreground md:text-6xl lg:text-[3.5rem] motion-safe:animate-fade-up">
                Revolutionize Your
                <span className="mt-3 block bg-gradient-to-r from-cyan-600 via-teal-500 to-cyan-600 bg-[length:200%_auto] bg-clip-text pb-2 text-transparent motion-safe:animate-gradient-shift">
                  Patient Workflow
                </span>
              </h1>
            </div>

            <p className="mx-auto mb-12 mt-8 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground motion-safe:animate-fade-up motion-safe:animate-in-delay-100 md:text-xl">
              AI-powered medical note summarization and intelligent scheduling recommendations that help doctors focus on
              what matters most — patient care.
            </p>

            <div className="flex flex-col items-center justify-center gap-4 motion-safe:animate-fade-up motion-safe:animate-in-delay-200 sm:flex-row">
              {isAuthenticated ? (
                <Link to={primaryRoute}>
                  <Button size="lg" className="group min-w-[200px] gap-2 px-8 text-lg">
                    {primaryActionLabel}
                    <ArrowRight className="h-5 w-5 motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:translate-x-1" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link to="/register">
                    <Button size="lg" className="group min-w-[200px] gap-2 px-8 text-lg">
                      Get Started Now
                      <ArrowRight className="h-5 w-5 motion-safe:transition-transform motion-safe:duration-300 motion-safe:group-hover:translate-x-1" />
                    </Button>
                  </Link>
                  <Link to="/login">
                    <Button size="lg" variant="outline" className="min-w-[160px] border-primary/35 px-8 text-lg text-primary backdrop-blur-sm hover:border-primary/50">
                      Sign In
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <section
        id="features"
        className="relative overflow-hidden border-y border-primary/15 bg-[linear-gradient(180deg,hsl(188_48%_95%)_0%,hsl(203_42%_97%)_48%,hsl(185_38%_94%)_100%)] px-4 py-24 backdrop-blur-[1px] dark:bg-[linear-gradient(180deg,hsl(202_36%_10%)_0%,hsl(218_34%_8%)_54%,hsl(190_34%_9%)_100%)]"
        onPointerMove={handlePointerMove}
      >
        <SectionDivider />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-[linear-gradient(174deg,transparent_0%,transparent_45%,hsl(var(--background)/0.62)_46%,transparent_68%)]" aria-hidden />
        <div className="pointer-events-none absolute inset-x-8 top-0 hidden h-px bg-gradient-to-r from-transparent via-cyan-300/55 to-transparent md:block" aria-hidden />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,hsl(var(--primary)/0.095)_1px,transparent_1px),linear-gradient(180deg,hsl(var(--primary)/0.075)_1px,transparent_1px)] bg-[42px_42px] opacity-80" aria-hidden />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_420px_at_var(--cursor-x)_var(--cursor-y),hsl(var(--primary)/0.16),transparent_64%)] opacity-80 motion-reduce:hidden" aria-hidden />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,hsl(var(--primary)/0.2)_1px,transparent_1px),linear-gradient(180deg,hsl(var(--primary)/0.16)_1px,transparent_1px)] bg-[42px_42px] opacity-0 [mask-image:radial-gradient(circle_300px_at_var(--cursor-x)_var(--cursor-y),black,transparent_74%)] transition-opacity duration-300 motion-safe:hover:opacity-100" aria-hidden />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(132deg,transparent_0%,transparent_18%,hsl(var(--background)/0.62)_18.2%,transparent_44%,transparent_100%)]" aria-hidden />
        <div className="container relative mx-auto">
          <div className="mb-20 text-center motion-safe:animate-fade-up">
            <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Powerful Features for Modern Healthcare
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-pretty text-lg text-muted-foreground">
              Our AI-driven platform streamlines your workflow and enhances patient care.
            </p>
          </div>

          <div className="-mx-4 -my-5 overflow-hidden px-4 py-5 [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)] motion-safe:animate-fade-up">
            <div className="relative z-10 flex w-max gap-6 motion-safe:animate-marquee-left motion-reduce:w-full motion-reduce:flex-wrap motion-reduce:justify-center motion-reduce:[animation:none] hover:[animation-play-state:paused]">
              {[...featureItems, ...featureItems].map(({ Icon, title, body }, i) => (
                <Card
                  key={`${title}-${i}`}
                  aria-hidden={i >= featureItems.length}
                  className="group relative min-h-[17rem] w-[min(82vw,22rem)] shrink-0 overflow-hidden border border-primary/25 border-t-primary/45 bg-card/90 p-0 shadow-[inset_0_1px_0_hsl(var(--primary)/0.28),0_1px_2px_hsl(var(--primary)/0.05)] outline outline-1 outline-cyan-50/70 backdrop-blur-sm transition-[background-color,border-color,box-shadow,transform] duration-300 hover:border-primary/45 hover:border-t-primary/65 hover:bg-card hover:shadow-[inset_0_1px_0_hsl(var(--primary)/0.42),0_18px_36px_hsl(var(--primary)/0.10)] motion-safe:hover:-translate-y-1 [&:hover_.feature-icon-shell]:border-primary/30 [&:hover_.feature-icon-shell]:bg-primary/10 [&:hover_.feature-icon-shell]:text-primary [&:hover_.feature-orbit]:opacity-100"
                >
                  <div className="absolute right-0 top-0 h-24 w-24 translate-x-8 -translate-y-8 rounded-full bg-muted/70 blur-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100" aria-hidden />
                  <CardContent className="relative p-6">
                    <div className="mb-6 flex items-start justify-between gap-4">
                      <span className="feature-icon-shell relative inline-flex size-12 items-center justify-center rounded-lg border border-border/80 bg-background/80 text-primary/90 shadow-sm transition-[background-color,border-color,color,transform] duration-300 motion-safe:group-hover:scale-[1.04]">
                        <span className="feature-orbit absolute -inset-2 rounded-xl border border-primary/20 opacity-0 transition-opacity duration-300" aria-hidden />
                        <Icon className="relative size-6" aria-hidden />
                      </span>
                      <span className="mt-1 h-px flex-1 bg-gradient-to-r from-border via-border/60 to-transparent" aria-hidden />
                    </div>
                    <h3 className="mb-3 max-w-[14rem] text-xl font-semibold tracking-tight text-foreground">{title}</h3>
                    <p className="text-sm leading-6 text-muted-foreground">{body}</p>
                    <span className="mt-6 block h-px w-12 bg-border transition-[width] duration-300 group-hover:w-20" aria-hidden />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="testimonials" className="relative overflow-hidden bg-[linear-gradient(180deg,hsl(198_50%_98%)_0%,hsl(180_30%_96%)_48%,hsl(210_32%_97%)_100%)] px-4 py-24 dark:bg-[linear-gradient(180deg,hsl(219_34%_8%)_0%,hsl(205_30%_10%)_50%,hsl(222_34%_7%)_100%)]">
        <SectionDivider />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(186deg,hsl(var(--muted)/0.42)_0%,transparent_58%)]" aria-hidden />
        <div className="pointer-events-none absolute left-1/2 top-0 h-px w-[min(88%,980px)] -translate-x-1/2 bg-gradient-to-r from-transparent via-border to-transparent" aria-hidden />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(145deg,hsl(178_56%_90%/0.34)_0%,transparent_28%,transparent_72%,hsl(204_72%_92%/0.45)_100%)] dark:bg-[linear-gradient(145deg,hsl(178_46%_18%/0.32)_0%,transparent_30%,transparent_70%,hsl(204_56%_18%/0.25)_100%)]" aria-hidden />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-[linear-gradient(0deg,hsl(var(--background)/0.82),transparent)]" aria-hidden />
        <div className="container relative mx-auto">
          <div className="mb-16 text-center motion-safe:animate-fade-up">
            <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Trusted by Healthcare Professionals
            </h2>
            <p className="mt-4 text-xl text-muted-foreground">
              See how Eligio AI will transform medical practices nationwide.
            </p>
          </div>

          <div className="-mx-4 -my-5 overflow-hidden px-4 py-5 [mask-image:linear-gradient(90deg,transparent,black_8%,black_92%,transparent)] motion-safe:animate-fade-up">
            <div className="relative z-10 flex w-max gap-6 motion-safe:animate-marquee-right motion-reduce:w-full motion-reduce:flex-wrap motion-reduce:justify-center motion-reduce:[animation:none] hover:[animation-play-state:paused]">
              {[...testimonialItems, ...testimonialItems].map((t, idx) => (
                <Card
                  key={`${t.initials}-${idx}`}
                  aria-hidden={idx >= testimonialItems.length}
                  className="min-h-[17rem] w-[min(82vw,23rem)] shrink-0 border border-primary/18 border-t-primary/35 bg-card/98 p-6 shadow-[inset_0_1px_0_hsl(var(--primary)/0.22),0_1px_2px_hsl(var(--primary)/0.04)] transition-[border-color,box-shadow,transform] duration-300 hover:border-primary/35 hover:border-t-primary/55 hover:shadow-[inset_0_1px_0_hsl(var(--primary)/0.36),0_18px_36px_hsl(var(--primary)/0.10)] motion-safe:hover:-translate-y-1"
                >
                  <CardContent className="p-0">
                    <div className="mb-5 flex items-center gap-4">
                      <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary to-teal-600 text-sm font-bold text-primary-foreground shadow-lg shadow-primary/25">
                        {t.initials}
                      </div>
                      <div>
                        <h4 className="font-semibold leading-snug text-foreground">{t.role}</h4>
                        <p className="text-sm text-muted-foreground">{t.org}</p>
                      </div>
                    </div>
                    <p className="text-pretty italic leading-relaxed text-muted-foreground">&ldquo;{t.quote}&rdquo;</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden bg-cyan-950 px-4 py-24" onPointerMove={handlePointerMove}>
        <SectionDivider dark />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,hsl(190_92%_31%)_0%,hsl(174_70%_31%)_42%,hsl(202_84%_18%)_100%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,hsl(0_0%_100%/0.12)_1px,transparent_1px),linear-gradient(180deg,hsl(0_0%_100%/0.09)_1px,transparent_1px)] bg-[48px_48px] opacity-50" aria-hidden />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_430px_at_var(--cursor-x)_var(--cursor-y),hsl(0_0%_100%/0.16),transparent_64%)] opacity-80 motion-reduce:hidden" aria-hidden />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,hsl(0_0%_100%/0.24)_1px,transparent_1px),linear-gradient(180deg,hsl(0_0%_100%/0.18)_1px,transparent_1px)] bg-[48px_48px] opacity-0 [mask-image:radial-gradient(circle_300px_at_var(--cursor-x)_var(--cursor-y),black,transparent_74%)] transition-opacity duration-300 motion-safe:hover:opacity-100" aria-hidden />
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-24 bg-[linear-gradient(176deg,hsl(var(--background))_0%,hsl(var(--background)/0.72)_34%,transparent_35%)]" aria-hidden />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(160deg,hsl(0_0%_100%/0.14)_0%,transparent_24%,transparent_100%),linear-gradient(20deg,transparent_0%,transparent_56%,hsl(184_80%_72%/0.16)_56.2%,transparent_78%)]" aria-hidden />
        <div className="relative container mx-auto text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight text-white md:text-4xl motion-safe:animate-fade-up">
            Ready to Transform Your Practice?
          </h2>
          <p className="mx-auto mb-12 mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-white/85 motion-safe:animate-fade-up motion-safe:animate-in-delay-100 md:text-xl">
            Join the waitlist to be among the first healthcare professionals to experience the future of AI-powered
            medical practice management with Eligio AI.
          </p>
          <div className="motion-safe:animate-fade-up motion-safe:animate-in-delay-200">
            <Link to={isAuthenticated ? primaryRoute : "/login"}>
              <Button size="lg" variant="outline" className="min-w-[220px] border-white/85 bg-white/10 px-8 text-lg text-white shadow-lg backdrop-blur-md transition-colors duration-300 hover:bg-white hover:text-primary">
                {isAuthenticated ? primaryActionLabel : "Eligio AI chat"}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-cyan-300/10 bg-[linear-gradient(180deg,hsl(203_70%_11%)_0%,hsl(222_47%_7%)_100%)] px-4 py-14 text-white">
        <div className="container mx-auto">
          <div className="text-center">
            <div className="mb-4 flex items-center justify-center gap-3">
              <img src={eligioLogo} alt="Eligio AI" className="size-14 object-contain opacity-95" />
              <span className="text-xl font-bold tracking-tight">Eligio AI</span>
            </div>
            <p className="text-pretty text-slate-400">Revolutionizing healthcare with AI-powered solutions for medical professionals.</p>
          </div>
          <div className="mt-10 border-t border-white/10 pt-8 text-center text-sm text-slate-500">
            <p>&copy; {new Date().getFullYear()} Eligio AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;

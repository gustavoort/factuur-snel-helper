import { Link } from "@tanstack/react-router";
import {
  ArrowDownRight,
  ArrowRight,
  Banknote,
  BellRing,
  BriefcaseBusiness,
  Check,
  ChevronRight,
  CircleCheck,
  Clock3,
  FileCheck2,
  FileText,
  HardHat,
  Menu,
  MessageCircle,
  PackageCheck,
  ReceiptText,
  Sparkles,
  Users,
  WalletCards,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { LanguageSelector } from "@/components/LanguageSelector";
import { cn } from "@/lib/utils";

const PRODUCT_NAME = "[NOME DO PRODUTO]";

const features = [
  [FileText, "Offertes", "Professionele offertes in minuten."],
  [ReceiptText, "Facturen", "Van afgeronde klus naar factuur."],
  [Users, "Klanten", "Alles van je klant op één plek."],
  [WalletCards, "Betalingen", "Betaallinks en status direct zichtbaar."],
  [Clock3, "Werkregistratie", "Uren, materialen en kosten per klus."],
  [BellRing, "Herinneringen", "Zie wat nog aandacht nodig heeft."],
] as const;

const audiences = [
  "Elektrotechniek",
  "Installatiebedrijven",
  "Loodgieters",
  "HVAC",
  "Onderhoud",
  "Renovatie",
  "Servicebedrijven",
  "Kleine aannemers",
];

const plans = [
  {
    name: "Free",
    price: "€0",
    description: "Om te beginnen.",
    features: ["3 klanten", "3 facturen per maand", "3 offertes", "Basis PDF", "Klantenbeheer"],
    cta: "Gratis starten",
  },
  {
    name: "Pro",
    price: "€9,99",
    description: "Voor vakmensen die willen doorgroeien.",
    features: [
      "Onbeperkte klanten",
      "Onbeperkte offertes",
      "Onbeperkte facturen",
      "Betaallinks",
      "Herinneringen",
      "Werkregistratie",
      "Meer inzicht",
    ],
    cta: "Probeer Pro",
    featured: true,
  },
  {
    name: "Business",
    price: "€24,99",
    description: "Voor kleine teams.",
    features: [
      "Alles in Pro",
      "Teamfuncties",
      "Geavanceerde inzichten",
      "Meerwerk workflow",
      "Prioriteit support",
      "Toekomstige AI-functies",
    ],
    cta: "Start Business",
  },
];

function BrandMark({ light = false }: { light?: boolean }) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", light ? "bg-landing-lime text-landing-ink" : "bg-primary text-primary-foreground")}>
        <ArrowDownRight className="size-5" strokeWidth={2.4} />
      </span>
      <span className={cn("truncate text-sm font-bold", light ? "text-landing-dark-foreground" : "text-foreground")}>
        {PRODUCT_NAME}
      </span>
    </span>
  );
}

function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("landing-reveal", className)}>{children}</div>;
}

function SectionIntro({ eyebrow, title, copy, dark = false }: { eyebrow?: string; title: ReactNode; copy?: string; dark?: boolean }) {
  return (
    <div className="max-w-3xl">
      {eyebrow && <p className={cn("mb-4 text-xs font-bold uppercase", dark ? "text-landing-lime" : "text-primary")}>{eyebrow}</p>}
      <h2 className={cn("text-3xl font-semibold leading-[1.08] sm:text-5xl lg:text-6xl", dark ? "text-landing-dark-foreground" : "text-foreground")}>{title}</h2>
      {copy && <p className={cn("mt-6 max-w-2xl text-base leading-7 sm:text-lg", dark ? "text-landing-dark-muted" : "text-muted-foreground")}>{copy}</p>}
    </div>
  );
}

function HeroDashboard() {
  return (
    <div className="relative mx-auto w-full max-w-2xl lg:ml-auto">
      <div className="rounded-[1.5rem] border border-border bg-card p-3 shadow-landing sm:p-5">
        <div className="rounded-[1.1rem] bg-landing-panel p-4 sm:p-6">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm text-muted-foreground">Goedemorgen, Mark</p>
              <p className="mt-1 text-xl font-semibold text-foreground sm:text-2xl">Deze week</p>
            </div>
            <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">M</span>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-2.5 sm:gap-3">
            {[
              ["€ 8.420", "Gefactureerd"],
              ["€ 1.280", "Nog te factureren"],
              ["€ 640", "Mogelijk meerwerk"],
              ["3", "Acties nodig"],
            ].map(([value, label], index) => (
              <div key={label} className={cn("min-w-0 rounded-2xl border border-border bg-card p-3.5 sm:p-5", index === 2 && "border-landing-lime bg-landing-lime-soft")}>
                <p className="text-xl font-semibold text-foreground sm:text-2xl">{value}</p>
                <p className="mt-1 truncate text-xs text-muted-foreground sm:text-sm">{label}</p>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-foreground">Omzet deze maand</p>
              <span className="text-xs font-medium text-primary">+12,4%</span>
            </div>
            <div className="mt-5 flex h-24 items-end gap-2" aria-hidden>
              {[38, 54, 47, 70, 57, 82, 74, 92].map((height, index) => (
                <span key={index} className={cn("flex-1 rounded-t-md bg-primary/15", index === 7 && "bg-primary")} style={{ height: `${height}%` }} />
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="landing-float landing-float-one mt-3 rounded-2xl border border-border bg-card p-4 shadow-landing sm:absolute sm:-left-12 sm:top-[38%] sm:mt-0 sm:w-64">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-landing-lime-soft text-primary"><Sparkles className="size-4" /></span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-primary">Meerwerk gevonden</p>
            <p className="mt-1 text-sm font-medium text-foreground">2 extra stopcontacten</p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <span className="font-semibold text-foreground">+ €146,00</span>
              <span className="rounded-lg bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">Toevoegen</span>
            </div>
          </div>
        </div>
      </div>
      <div className="landing-float landing-float-two mt-3 rounded-2xl border border-border bg-card p-4 shadow-landing sm:absolute sm:-right-6 sm:top-20 sm:mt-0 sm:w-52">
        <p className="flex items-center gap-2 text-xs font-semibold text-primary"><CircleCheck className="size-4" /> Factuur betaald</p>
        <p className="mt-2 text-sm text-muted-foreground">Factuur #2026-041</p>
        <p className="mt-0.5 text-lg font-semibold text-foreground">€1.250,00</p>
      </div>
      <div className="landing-float landing-float-three mt-3 rounded-2xl border border-border bg-card p-4 shadow-landing sm:absolute sm:-right-8 sm:bottom-8 sm:mt-0 sm:w-48">
        <p className="flex items-center gap-2 text-xs font-semibold text-foreground"><BellRing className="size-4 text-primary" /> Niet vergeten</p>
        <p className="mt-2 text-sm text-muted-foreground">Parkeerkosten</p>
        <p className="font-semibold text-foreground">€18,00</p>
      </div>
    </div>
  );
}

function WorkflowVisual() {
  const inputs = [
    [MessageCircle, "WhatsApp"], [FileText, "Foto's"], [Clock3, "Uren"], [ReceiptText, "Bonnetjes"], [BriefcaseBusiness, "Notities"], [FileCheck2, "Werkbon"],
  ] as const;
  return (
    <div className="mt-12 grid gap-8 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-2">
        {inputs.map(([Icon, label], i) => (
          <div key={label} className={cn("flex items-center gap-3 rounded-2xl border border-border bg-card p-4 shadow-sm", i % 2 === 1 && "lg:translate-y-5")}>
            <Icon className="size-4 shrink-0 text-primary" />
            <span className="text-sm font-medium text-foreground">{label}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-col items-center gap-4">
        <ArrowRight className="hidden size-6 text-muted-foreground lg:block" />
        <div className="rounded-2xl bg-primary px-5 py-4 text-center text-sm font-bold text-primary-foreground shadow-landing">{PRODUCT_NAME}</div>
        <ArrowRight className="size-6 rotate-90 text-muted-foreground lg:rotate-0" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        <div className="rounded-2xl border border-border bg-card p-5">
          <p className="text-xs uppercase text-muted-foreground">Factuur</p><p className="mt-2 text-xl font-semibold text-foreground">#2026-041</p>
        </div>
        <div className="rounded-2xl bg-landing-lime p-5 text-landing-ink">
          <p className="text-xs uppercase opacity-70">Betaling</p><p className="mt-2 flex items-center gap-2 text-xl font-semibold"><CircleCheck className="size-5" /> Ontvangen</p>
        </div>
      </div>
    </div>
  );
}

function Step({ number, title, copy, children, reverse = false }: { number: string; title: string; copy: string; children: ReactNode; reverse?: boolean }) {
  return (
    <Reveal className={cn("grid gap-8 border-t border-border py-12 lg:grid-cols-2 lg:items-center lg:gap-20", reverse && "lg:[&>*:first-child]:order-2")}>
      <div>
        <span className="text-sm font-bold text-primary">{number}</span>
        <h3 className="mt-5 text-3xl font-semibold leading-tight text-foreground sm:text-4xl">{title}</h3>
        <p className="mt-4 max-w-lg text-base leading-7 text-muted-foreground">{copy}</p>
      </div>
      <div>{children}</div>
    </Reveal>
  );
}

function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  const links = [["Product", "#product"], ["Hoe het werkt", "#werkwijze"], ["Voor vakmensen", "#vakmensen"], ["Prijzen", "#prijzen"]];
  return (
    <header className={cn("fixed inset-x-0 top-0 z-50 transition-all duration-300", scrolled && "border-b border-border bg-background/90 shadow-sm backdrop-blur-xl")}>
      <nav className="mx-auto grid h-20 max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-5 sm:px-8" aria-label="Hoofdnavigatie">
        <a href="#top" aria-label="Naar boven"><BrandMark /></a>
        <div className="hidden items-center gap-7 lg:flex">
          {links.map(([label, href]) => <a key={href} href={href} className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">{label}</a>)}
          <Button asChild variant="ghost"><Link to="/login">Inloggen</Link></Button>
          <Button asChild className="h-11 rounded-xl px-5 shadow-none"><Link to="/register">Gratis proberen <ArrowRight /></Link></Button>
        </div>
        <Button variant="ghost" size="icon" className="size-11 lg:hidden" aria-label={open ? "Menu sluiten" : "Menu openen"} onClick={() => setOpen((value) => !value)}>
          {open ? <X /> : <Menu />}
        </Button>
      </nav>
      {open && (
        <div className="border-t border-border bg-background px-5 py-5 shadow-lg lg:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1">
            {links.map(([label, href]) => <a key={href} href={href} onClick={() => setOpen(false)} className="rounded-xl px-3 py-3 text-sm font-medium text-foreground hover:bg-muted">{label}</a>)}
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Button asChild variant="outline" className="h-11 rounded-xl"><Link to="/login">Inloggen</Link></Button>
              <Button asChild className="h-11 rounded-xl"><Link to="/register">Gratis proberen</Link></Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

export function LandingPage() {
  useEffect(() => {
    const nodes = document.querySelectorAll(".landing-reveal");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      nodes.forEach((node) => node.classList.add("is-visible"));
      return;
    }
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add("is-visible")), { threshold: 0.12 });
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  return (
    <div id="top" className="overflow-x-clip bg-background font-sans text-foreground">
      <LandingNav />
      <main>
        <section className="relative min-h-[94svh] px-5 pb-20 pt-32 sm:px-8 lg:flex lg:items-center lg:pt-28">
          <div className="mx-auto grid w-full max-w-7xl items-center gap-14 lg:grid-cols-[0.88fr_1.12fr] lg:gap-12 xl:gap-20">
            <div className="relative z-10">
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground shadow-sm"><HardHat className="size-4 text-primary" /> Voor vakmensen die liever werken dan administreren.</span>
              <h1 className="mt-7 max-w-3xl text-5xl font-semibold leading-[0.98] text-foreground sm:text-6xl lg:text-7xl xl:text-8xl">Van klus naar <span className="relative inline-block text-primary">betaald<span className="absolute -bottom-1 left-0 h-2 w-full rounded-full bg-landing-lime -z-10" /></span>.<br />Zonder administratiegedoe.</h1>
              <p className="mt-7 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">Leg uren, materialen, kosten en meerwerk vast terwijl je werkt. {PRODUCT_NAME} helpt je niets te vergeten en zorgt dat uitgevoerd werk sneller op de factuur komt.</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="h-13 rounded-xl px-6 text-base shadow-landing"><Link to="/register">Probeer gratis <ArrowRight /></Link></Button>
                <Button asChild size="lg" variant="outline" className="h-13 rounded-xl px-6 text-base shadow-none"><a href="#werkwijze">Bekijk hoe het werkt <ChevronRight /></a></Button>
              </div>
              <p className="mt-4 text-xs font-medium text-muted-foreground">Geen creditcard nodig <span className="px-1.5">•</span> Binnen enkele minuten gestart</p>
            </div>
            <HeroDashboard />
          </div>
        </section>

        <section id="product" className="scroll-mt-20 border-y border-border bg-landing-panel px-5 py-24 sm:px-8 lg:py-36">
          <Reveal className="mx-auto max-w-7xl">
            <SectionIntro title={<>Goed werk doen is niet het probleem.<br /><span className="text-muted-foreground">Alles onthouden wel.</span></>} copy="Een extra uur hier. Meer materiaal daar. Parkeerkosten, een kleine wijziging van de klant of werk dat later nog op de factuur moet. Kleine dingen worden snel vergeten." />
            <WorkflowVisual />
            <p className="mt-12 text-center text-lg font-semibold text-foreground">Alles wat bij een klus hoort, op één plek.</p>
          </Reveal>
        </section>

        <section id="werkwijze" className="scroll-mt-20 px-5 py-24 sm:px-8 lg:py-36">
          <div className="mx-auto max-w-7xl">
            <Reveal><SectionIntro eyebrow="Hoe het werkt" title="Van werk naar omzet in drie stappen." /></Reveal>
            <div className="mt-14">
              <Step number="01" title="Leg vast wat je hebt gedaan" copy="Spreek het in of voeg uren, materialen, foto's, kosten en notities toe.">
                <div className="rounded-3xl border border-border bg-card p-5 shadow-landing sm:p-7">
                  <div className="flex items-center gap-3 border-b border-border pb-4"><span className="grid size-10 place-items-center rounded-full bg-primary text-primary-foreground"><MessageCircle className="size-4" /></span><div><p className="text-sm font-semibold text-foreground">Werknotitie</p><p className="text-xs text-muted-foreground">Vandaag, 16:42</p></div></div>
                  <p className="mt-5 text-lg leading-8 text-foreground">“Vandaag 7,5 uur gewerkt.<br />22 meter kabel gebruikt.<br />€18 parkeren.<br />2 extra stopcontacten geplaatst.”</p>
                </div>
              </Step>
              <Step number="02" title="Wij helpen controleren wat ontbreekt" copy="Signalen van extra werk, materialen of kosten worden zichtbaar voordat ze worden vergeten." reverse>
                <div className="rounded-3xl border border-landing-lime bg-landing-lime-soft p-6 shadow-landing sm:p-8">
                  <span className="rounded-full bg-landing-lime px-3 py-1.5 text-xs font-bold text-landing-ink">Mogelijk meerwerk</span>
                  <p className="mt-6 text-xl font-semibold text-foreground">2 extra stopcontacten</p>
                  <div className="mt-5 flex items-end justify-between gap-4"><div><p className="text-xs text-muted-foreground">Geschatte waarde</p><p className="mt-1 text-3xl font-semibold text-foreground">€146</p></div><div className="flex gap-2"><Button variant="outline" size="sm">Negeer</Button><Button size="sm">Toevoegen</Button></div></div>
                </div>
              </Step>
              <Step number="03" title="Maak er een factuur van" copy="Controleer, verstuur de factuur en laat je klant eenvoudig betalen.">
                <div className="rounded-3xl border border-border bg-card p-6 shadow-landing sm:p-8">
                  <div className="flex items-center justify-between border-b border-border pb-5"><div><p className="text-xs text-muted-foreground">Factuur</p><p className="mt-1 font-semibold text-foreground">#2026-041</p></div><span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">Concept</span></div>
                  <div className="grid grid-cols-2 gap-4 py-5"><div><p className="text-xs text-muted-foreground">Klant</p><p className="mt-1 font-medium text-foreground">Jansen B.V.</p></div><div className="text-right"><p className="text-xs text-muted-foreground">Totaal</p><p className="mt-1 text-xl font-semibold text-foreground">€1.487,50</p></div></div>
                  <Button className="h-11 w-full rounded-xl">Factuur versturen <ArrowRight /></Button>
                </div>
              </Step>
            </div>
          </div>
        </section>

        <section className="bg-landing-dark px-5 py-24 text-landing-dark-foreground sm:px-8 lg:py-36">
          <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[0.8fr_1.2fr] lg:items-center lg:gap-20">
            <Reveal><SectionIntro dark eyebrow="Money Recovery" title="Zie wat nog geld kan worden." copy="Niet alleen facturen maken. Zie welk uitgevoerd werk, mogelijke meerkosten en openstaande facturen nog aandacht nodig hebben." /><Button asChild className="mt-8 h-12 rounded-xl bg-landing-lime px-6 text-landing-ink hover:bg-landing-lime/90"><Link to="/register">Bekijk openstaande acties <ArrowRight /></Link></Button></Reveal>
            <Reveal className="rounded-3xl border border-landing-dark-border bg-landing-dark-card p-5 shadow-dark sm:p-8">
              <p className="text-sm text-landing-dark-muted">Wacht nog op actie</p><p className="mt-2 text-5xl font-semibold text-landing-dark-foreground sm:text-6xl">€3.840</p>
              <div className="mt-8 divide-y divide-landing-dark-border">
                {[["€1.250", "Uitgevoerd werk nog niet gefactureerd"], ["€620", "Mogelijk meerwerk"], ["€1.470", "Openstaande facturen"], ["€500", "Kosten nog niet toegewezen"]].map(([value, label], i) => (
                  <div key={label} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-4"><span className={cn("size-2 rounded-full", i === 1 ? "bg-landing-lime" : "bg-primary-foreground/40")} /><p className="min-w-0 text-sm text-landing-dark-muted">{label}</p><p className="font-semibold text-landing-dark-foreground">{value}</p></div>
                ))}
              </div>
            </Reveal>
          </div>
        </section>

        <section className="px-5 py-24 sm:px-8 lg:py-36">
          <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-2 lg:items-center lg:gap-24">
            <Reveal><span className="inline-flex rounded-full bg-landing-lime-soft px-3 py-1.5 text-xs font-bold text-primary">Job Memory · In ontwikkeling</span><SectionIntro title="Je bedrijf krijgt een geheugen." copy="Uren, materialen, foto's, notities en wijzigingen blijven gekoppeld aan de klus en klant." /></Reveal>
            <Reveal className="rounded-3xl border border-border bg-card p-5 shadow-landing sm:p-8">
              <div className="flex items-center gap-3 border-b border-border pb-5"><span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground"><Sparkles className="size-4" /></span><div><p className="font-semibold text-foreground">Job Memory</p><p className="text-xs text-muted-foreground">Klant: De Vries</p></div></div>
              <div className="mt-5 ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-primary p-4 text-sm text-primary-foreground">Wat hebben we vorige keer bij deze klant gedaan?</div>
              <div className="mt-3 max-w-[90%] rounded-2xl rounded-bl-md bg-muted p-4 text-sm leading-6 text-foreground">Op 18 augustus:<br />• Buitenlamp vervangen<br />• 14 meter kabel aangelegd<br />• 3 stopcontacten geplaatst<br />• 5,5 uur gewerkt</div>
              <div className="mt-3 ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-primary p-4 text-sm text-primary-foreground">Welke materialen gebruikten we?</div>
              <div className="mt-3 max-w-[90%] rounded-2xl rounded-bl-md bg-muted p-4 text-sm leading-6 text-foreground">YMvK 3x2.5 — 14 m<br />WCD Jung — 3 stuks<br />Lasdozen — 4 stuks</div>
            </Reveal>
          </div>
        </section>

        <section className="bg-landing-panel px-5 py-24 sm:px-8 lg:py-36">
          <div className="mx-auto grid max-w-7xl gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-24">
            <Reveal><SectionIntro eyebrow="Meerwerk" title="Meerwerk hoort niet in je geheugen." copy="Verschillen tussen wat is afgesproken en wat is uitgevoerd worden zichtbaar. Je beslist altijd zelf wat factureerbaar is." /><p className="mt-7 font-semibold text-foreground">Je beslist altijd zelf wat factureerbaar is.</p></Reveal>
            <Reveal className="rounded-3xl border border-border bg-card p-5 shadow-landing sm:p-8">
              <div className="grid grid-cols-2 gap-3"><div className="rounded-2xl bg-muted p-4"><p className="text-xs text-muted-foreground">Originele opdracht</p><p className="mt-2 text-2xl font-semibold text-foreground">40</p><p className="text-sm text-muted-foreground">stopcontacten</p></div><div className="rounded-2xl bg-landing-lime-soft p-4"><p className="text-xs text-muted-foreground">Uitgevoerd</p><p className="mt-2 text-2xl font-semibold text-foreground">47</p><p className="text-sm text-muted-foreground">stopcontacten <span className="font-semibold text-primary">+7</span></p></div></div>
              <div className="mt-4 rounded-2xl border border-landing-lime bg-landing-lime-soft p-4"><p className="flex items-center gap-2 text-sm font-semibold text-foreground"><Zap className="size-4 text-primary" /> Mogelijk meerwerk gevonden</p></div>
              <div className="mt-4 grid grid-cols-3 gap-3 border-t border-border pt-5"><div><p className="text-xs text-muted-foreground">Begroot</p><p className="mt-1 font-semibold text-foreground">32 uur</p></div><div><p className="text-xs text-muted-foreground">Geregistreerd</p><p className="mt-1 font-semibold text-foreground">41,5 uur</p></div><div><p className="text-xs text-muted-foreground">Verschil</p><p className="mt-1 font-semibold text-primary">+9,5 uur</p></div></div>
            </Reveal>
          </div>
        </section>

        <section className="px-5 py-24 sm:px-8 lg:py-36">
          <div className="mx-auto max-w-5xl text-center">
            <Reveal><SectionIntro title="Vrijdagmiddag. Vijf minuten administratie." /></Reveal>
            <Reveal className="mt-12 rounded-3xl border border-border bg-card p-5 text-left shadow-landing sm:p-8 lg:p-10">
              <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center"><div><p className="text-2xl font-semibold text-foreground">Je week is bijna klaar.</p><div className="mt-6 grid gap-3 sm:grid-cols-2">{[["4", "klussen afgerond"], ["2", "nog niet gefactureerd"], ["€380", "mogelijk meerwerk"], ["1", "factuur te laat"], ["€94", "kosten nog niet toegewezen"]].map(([value, label]) => <div key={label} className="flex items-center gap-3 rounded-2xl bg-muted p-4"><span className="text-xl font-semibold text-primary">{value}</span><span className="text-sm text-muted-foreground">{label}</span></div>)}</div></div><Button asChild size="lg" className="h-13 rounded-xl px-6"><Link to="/register">Regel mijn administratie <ArrowRight /></Link></Button></div>
            </Reveal>
          </div>
        </section>

        <section className="border-y border-border bg-card px-5 py-20 sm:px-8">
          <div className="mx-auto max-w-7xl"><Reveal><SectionIntro eyebrow="Functies" title="Alles tussen werk en betaling." /></Reveal><div className="mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">{features.map(([Icon, title, copy]) => <Reveal key={title} className="flex gap-4 border-t border-border pt-5"><Icon className="mt-0.5 size-5 shrink-0 text-primary" /><div><h3 className="font-semibold text-foreground">{title}</h3><p className="mt-1.5 text-sm leading-6 text-muted-foreground">{copy}</p></div></Reveal>)}</div></div>
        </section>

        <section id="vakmensen" className="scroll-mt-20 px-5 py-24 sm:px-8 lg:py-36">
          <div className="mx-auto max-w-7xl"><Reveal><SectionIntro title="Gebouwd voor bedrijven die buiten kantoor werken." copy="Voor zzp'ers en kleine teams die liever hun werk doen dan 's avonds administratie bijwerken." /></Reveal><Reveal className="mt-12 flex flex-wrap gap-3">{audiences.map((audience, i) => <span key={audience} className={cn("rounded-2xl border border-border px-5 py-3 text-sm font-semibold", i === 0 || i === 4 ? "bg-primary text-primary-foreground" : "bg-card text-foreground")}>{audience}</span>)}</Reveal></div>
        </section>

        <section className="bg-landing-panel px-5 py-24 sm:px-8 lg:py-36">
          <div className="mx-auto max-w-7xl"><Reveal><SectionIntro title="Niet nóg een boekhoudpakket." copy="Wij vervangen niet per se je boekhouder. We zorgen dat de informatie vóór de boekhouding niet verloren gaat." /></Reveal><div className="mt-12 grid gap-5 lg:grid-cols-2"><Reveal className="rounded-3xl border border-border bg-card p-6 sm:p-8"><p className="text-sm font-semibold text-muted-foreground">Traditionele administratie</p><div className="mt-7 space-y-3">{["Werk uitvoeren", "Later alles proberen te herinneren", "Administratie", "Factuur"].map((item, i) => <div key={item} className="flex items-center gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-muted text-xs text-muted-foreground">{i + 1}</span><p className="text-sm font-medium text-foreground">{item}</p></div>)}</div></Reveal><Reveal className="rounded-3xl bg-primary p-6 text-primary-foreground shadow-landing sm:p-8"><p className="text-sm font-semibold text-primary-foreground/70">{PRODUCT_NAME}</p><div className="mt-7 space-y-3">{["Werk uitvoeren", "Direct vastleggen", "Openstaande acties zichtbaar", "Factuur", "Betaald"].map((item, i) => <div key={item} className="flex items-center gap-3"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-landing-lime text-xs font-bold text-landing-ink">{i + 1}</span><p className="text-sm font-medium">{item}</p></div>)}</div></Reveal></div></div>
        </section>

        <section id="prijzen" className="scroll-mt-20 px-5 py-24 sm:px-8 lg:py-36">
          <div className="mx-auto max-w-7xl"><Reveal><SectionIntro eyebrow="Prijzen" title="Begin klein. Groei wanneer je wilt." copy="Kies wat nu bij je bedrijf past. De onderstaande plannen zijn een visuele weergave; de bestaande betaalomgeving blijft leidend." /></Reveal><div className="mt-12 grid gap-5 lg:grid-cols-3">{plans.map((plan) => <Reveal key={plan.name} className={cn("relative flex flex-col rounded-3xl border p-6 sm:p-8", plan.featured ? "border-primary bg-primary text-primary-foreground shadow-landing" : "border-border bg-card")}>
            {plan.featured && <span className="absolute right-5 top-5 rounded-full bg-landing-lime px-3 py-1 text-xs font-bold text-landing-ink">Meest gekozen</span>}<p className={cn("text-sm font-bold uppercase", plan.featured ? "text-primary-foreground/70" : "text-muted-foreground")}>{plan.name}</p><div className="mt-6 flex items-end gap-2"><span className="text-4xl font-semibold">{plan.price}</span><span className={cn("pb-1 text-sm", plan.featured ? "text-primary-foreground/70" : "text-muted-foreground")}>/per maand</span></div><p className={cn("mt-3 text-sm", plan.featured ? "text-primary-foreground/70" : "text-muted-foreground")}>{plan.description}</p><ul className="my-8 flex-1 space-y-3">{plan.features.map((feature) => <li key={feature} className="flex gap-3 text-sm"><Check className={cn("size-4 shrink-0", plan.featured ? "text-landing-lime" : "text-primary")} />{feature}</li>)}</ul><Button asChild variant={plan.featured ? "secondary" : "outline"} className={cn("h-11 rounded-xl", plan.featured && "bg-landing-lime text-landing-ink hover:bg-landing-lime/90")}><Link to="/register">{plan.cta}</Link></Button></Reveal>)}</div></div>
        </section>

        <section className="border-t border-border bg-card px-5 py-24 sm:px-8 lg:py-32">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.7fr_1.3fr] lg:gap-24"><Reveal><SectionIntro eyebrow="FAQ" title="Vragen voordat je begint?" /></Reveal><Reveal><Accordion type="single" collapsible className="w-full">{[
            ["Is [NOME DO PRODUTO] een boekhoudprogramma?", "Het helpt je offertes, werk en facturen organiseren. Voor volledige boekhouding kun je je bestaande boekhouder of boekhoudpakket blijven gebruiken."],
            ["Kan ik mijn bestaande klanten toevoegen?", "Ja."],
            ["Kan ik facturen als PDF versturen?", "Ja."],
            ["Kan een klant online betalen?", "Ja, via de betaallinks die in het product beschikbaar zijn."],
            ["Werkt het op mobiel?", "Ja, de interface is ontworpen voor desktop en mobiel."],
            ["Beslist AI automatisch wat ik moet factureren?", "Nee. Jij houdt altijd de controle. Het systeem kan signalen geven, maar jij beslist wat je toevoegt of factureert."],
          ].map(([question, answer]) => <AccordionItem key={question} value={question ?? "faq"}><AccordionTrigger className="py-6 text-left text-base font-semibold hover:no-underline">{question}</AccordionTrigger><AccordionContent className="max-w-2xl pb-6 text-base leading-7 text-muted-foreground">{answer}</AccordionContent></AccordionItem>)}</Accordion></Reveal></div>
        </section>

        <section className="px-5 py-8 sm:px-8"><Reveal className="mx-auto max-w-7xl rounded-3xl bg-landing-dark px-6 py-16 text-center sm:px-10 lg:py-24"><h2 className="mx-auto max-w-4xl text-4xl font-semibold leading-[1.05] text-landing-dark-foreground sm:text-6xl">Minder administratie.<br />Meer grip op je werk.<br /><span className="text-landing-lime">Sneller betaald.</span></h2><p className="mx-auto mt-6 max-w-xl text-base text-landing-dark-muted sm:text-lg">Start gratis en breng je volgende klus van werk naar betaling.</p><div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row"><Button asChild size="lg" className="h-13 rounded-xl bg-landing-lime px-7 text-landing-ink hover:bg-landing-lime/90"><Link to="/register">Probeer gratis <ArrowRight /></Link></Button><Button asChild size="lg" variant="outline" className="h-13 rounded-xl border-landing-dark-border bg-transparent px-7 text-landing-dark-foreground hover:bg-landing-dark-card hover:text-landing-dark-foreground"><Link to="/login">Inloggen</Link></Button></div><p className="mt-4 text-xs text-landing-dark-muted">Geen creditcard nodig.</p></Reveal></section>
      </main>

      <footer className="px-5 pb-10 pt-20 sm:px-8">
        <div className="mx-auto max-w-7xl border-t border-border pt-10"><div className="grid gap-10 md:grid-cols-[1fr_auto_auto] md:gap-16"><div><BrandMark /><p className="mt-4 max-w-xs text-sm leading-6 text-muted-foreground">Van klus naar betaald. Zonder administratiegedoe.</p></div><div><p className="text-sm font-semibold text-foreground">Product</p><div className="mt-4 flex flex-col gap-3 text-sm text-muted-foreground"><a href="#product">Functies</a><a href="#prijzen">Prijzen</a><Link to="/login">Inloggen</Link></div></div><div><p className="text-sm font-semibold text-foreground">Bedrijf</p><div className="mt-4 flex flex-col gap-3 text-sm text-muted-foreground"><a href="mailto:contact@example.com">Contact</a><span>Privacy</span><span>Voorwaarden</span></div></div></div><div className="mt-12 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-t border-border pt-6"><p className="min-w-0 text-xs text-muted-foreground">© 2026 {PRODUCT_NAME}. Alle rechten voorbehouden.</p><LanguageSelector className="w-36 shrink-0" /></div></div>
      </footer>
    </div>
  );
}

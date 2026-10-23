import { Link } from "@tanstack/react-router";
import {
  ArrowDownRight,
  ArrowRight,
  Check,
  CircleCheck,
  FileText,
  Menu,
  ReceiptText,
  Send,
  Users,
  WalletCards,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { LanguageSelector } from "@/components/LanguageSelector";
import { cn } from "@/lib/utils";

const PRODUCT_NAME = "Faktuvi";

const features = [
  [Users, "Klantenbeheer", "Bewaar klantgegevens centraal en gebruik ze direct in offertes en facturen."],
  [FileText, "Offertes", "Maak professionele offertes, download ze als PDF, verstuur ze per e-mail of deel via WhatsApp."],
  [ReceiptText, "Facturen", "Zet een geaccepteerde offerte om in een factuur en houd de betaalstatus bij."],
  [WalletCards, "Betaallinks", "Business-gebruikers kunnen voor facturen een Stripe-betaallink aanmaken."],
] as const;

const plans = [
  {
    name: "Free",
    price: "€0",
    description: "Voor wie eenvoudig wil starten.",
    items: ["5 offertes per maand", "5 facturen per maand", "Klantenbeheer", "PDF-downloads"],
  },
  {
    name: "Pro",
    price: "€9,99",
    description: "Voor zelfstandigen die onbeperkt willen factureren.",
    items: ["Onbeperkte offertes", "Onbeperkte facturen", "Logo upload", "PDF branding", "E-mail verzenden"],
    featured: true,
  },
  {
    name: "Business",
    price: "€24,99",
    description: "Voor bedrijven die klanten online willen laten betalen.",
    items: ["Alles in Pro", "Stripe-betaallinks", "Betaalstatus zichtbaar", "Prioriteit support"],
  },
];

function Brand() {
  return (
    <span className="flex items-center gap-3">
      <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
        <ArrowDownRight className="size-5" strokeWidth={2.4} />
      </span>
      <span className="text-sm font-bold text-foreground">{PRODUCT_NAME}</span>
    </span>
  );
}

function LandingNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [["Product", "#product"], ["Werkwijze", "#werkwijze"], ["Prijzen", "#prijzen"], ["FAQ", "#faq"]];

  return (
    <header className={cn("fixed inset-x-0 top-0 z-50 transition-all", scrolled && "border-b border-border bg-background/90 shadow-sm backdrop-blur-xl")}>
      <nav className="mx-auto flex h-20 max-w-7xl items-center justify-between gap-4 px-5 sm:px-8" aria-label="Hoofdnavigatie">
        <a href="#top" aria-label="Naar boven"><Brand /></a>
        <div className="hidden items-center gap-7 lg:flex">
          {links.map(([label, href]) => <a key={href} href={href} className="text-sm font-medium text-muted-foreground hover:text-foreground">{label}</a>)}
          <Button asChild variant="ghost"><Link to="/login">Inloggen</Link></Button>
          <Button asChild className="rounded-xl"><Link to="/register">Gratis starten <ArrowRight /></Link></Button>
        </div>
        <Button variant="ghost" size="icon" className="lg:hidden" aria-label={open ? "Menu sluiten" : "Menu openen"} onClick={() => setOpen((value) => !value)}>
          {open ? <X /> : <Menu />}
        </Button>
      </nav>
      {open && (
        <div className="border-t border-border bg-background px-5 py-5 shadow-lg lg:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-1">
            {links.map(([label, href]) => <a key={href} href={href} className="rounded-xl px-3 py-3 text-sm font-medium hover:bg-muted" onClick={() => setOpen(false)}>{label}</a>)}
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Button asChild variant="outline"><Link to="/login">Inloggen</Link></Button>
              <Button asChild><Link to="/register">Gratis starten</Link></Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

function ProductPreview() {
  return (
    <div className="rounded-[1.75rem] border border-border bg-card p-4 shadow-landing sm:p-6">
      <div className="rounded-2xl bg-landing-panel p-5 sm:p-7">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Dashboard</p>
            <p className="mt-1 text-2xl font-semibold">Deze maand</p>
          </div>
          <span className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">Pro</span>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-border bg-card p-4"><p className="text-2xl font-semibold">€8.420</p><p className="mt-1 text-xs text-muted-foreground">Betaalde omzet</p></div>
          <div className="rounded-2xl border border-border bg-card p-4"><p className="text-2xl font-semibold">€1.470</p><p className="mt-1 text-xs text-muted-foreground">Openstaand</p></div>
        </div>
        <div className="mt-4 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-3">
            <div><p className="text-xs text-muted-foreground">Factuur FAC-2026-0041</p><p className="mt-1 font-semibold">Jansen B.V.</p></div>
            <p className="text-lg font-semibold">€1.250,00</p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="rounded-lg bg-muted px-3 py-1.5 text-xs font-medium">PDF</span>
            <span className="rounded-lg bg-muted px-3 py-1.5 text-xs font-medium">E-mail</span>
            <span className="rounded-lg bg-muted px-3 py-1.5 text-xs font-medium">WhatsApp</span>
            <span className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">Betaallink</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function LandingPage() {
  return (
    <div id="top" className="overflow-x-clip bg-background font-sans text-foreground">
      <LandingNav />
      <main>
        <section className="px-5 pb-24 pt-32 sm:px-8 lg:pb-32 lg:pt-40">
          <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
            <div>
              <span className="inline-flex rounded-full border border-border bg-card px-3.5 py-2 text-xs font-semibold shadow-sm">Offertes en facturen zonder onnodig gedoe</span>
              <h1 className="mt-7 max-w-3xl text-5xl font-semibold leading-[0.98] sm:text-6xl lg:text-7xl">Van offerte naar <span className="text-primary">betaald</span>.</h1>
              <p className="mt-7 max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">Maak offertes en facturen, beheer klanten, verstuur documenten als PDF of per e-mail en houd betalingen overzichtelijk bij — in één eenvoudige omgeving.</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="h-12 rounded-xl px-6"><Link to="/register">Gratis starten <ArrowRight /></Link></Button>
                <Button asChild size="lg" variant="outline" className="h-12 rounded-xl px-6"><Link to="/login">Ik heb al een account</Link></Button>
              </div>
              <p className="mt-4 text-xs font-medium text-muted-foreground">Geen creditcard nodig voor het gratis plan.</p>
            </div>
            <ProductPreview />
          </div>
        </section>

        <section id="product" className="border-y border-border bg-landing-panel px-5 py-24 sm:px-8 lg:py-32">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl"><p className="text-xs font-bold uppercase text-primary">Product</p><h2 className="mt-4 text-3xl font-semibold sm:text-5xl">Alles wat je nodig hebt om sneller te factureren.</h2><p className="mt-5 text-base leading-7 text-muted-foreground sm:text-lg">Faktuvi richt zich op de dagelijkse administratie tussen klant, offerte, factuur en betaling.</p></div>
            <div className="mt-12 grid gap-5 md:grid-cols-2">
              {features.map(([Icon, title, copy]) => (
                <div key={title} className="rounded-3xl border border-border bg-card p-6 sm:p-8">
                  <span className="grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground"><Icon className="size-5" /></span>
                  <h3 className="mt-6 text-xl font-semibold">{title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{copy}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="werkwijze" className="px-5 py-24 sm:px-8 lg:py-32">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl"><p className="text-xs font-bold uppercase text-primary">Werkwijze</p><h2 className="mt-4 text-3xl font-semibold sm:text-5xl">Drie stappen van klant naar betaling.</h2></div>
            <div className="mt-12 grid gap-5 lg:grid-cols-3">
              {[
                ["01", "Voeg je klant toe", "Bewaar contact- en bedrijfsgegevens zodat je ze niet telkens opnieuw hoeft in te voeren."],
                ["02", "Maak offerte of factuur", "Voeg regels, aantallen, prijzen en btw toe. Faktuvi berekent de totalen voor je."],
                ["03", "Verstuur en volg", "Download als PDF, verstuur per e-mail, deel via WhatsApp en houd de status van je factuur bij."],
              ].map(([number, title, copy]) => (
                <div key={number} className="rounded-3xl border border-border bg-card p-6 sm:p-8"><span className="text-sm font-bold text-primary">{number}</span><h3 className="mt-5 text-2xl font-semibold">{title}</h3><p className="mt-4 text-sm leading-6 text-muted-foreground">{copy}</p></div>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-landing-dark px-5 py-24 text-landing-dark-foreground sm:px-8 lg:py-32">
          <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:items-center">
            <div><p className="text-xs font-bold uppercase text-landing-lime">Betalingen</p><h2 className="mt-4 text-3xl font-semibold sm:text-5xl">Zie wat betaald is en wat nog openstaat.</h2><p className="mt-6 max-w-xl text-base leading-7 text-landing-dark-muted">Markeer facturen als betaald of gebruik in Business een Stripe-betaallink. Na een bevestigde betaling kan de factuurstatus worden bijgewerkt.</p></div>
            <div className="rounded-3xl border border-landing-dark-border bg-landing-dark-card p-6 sm:p-8">
              <p className="text-sm text-landing-dark-muted">Factuur FAC-2026-0041</p><p className="mt-2 text-4xl font-semibold">€1.250,00</p>
              <div className="mt-7 flex items-center gap-3 rounded-2xl bg-landing-lime p-4 text-landing-ink"><CircleCheck className="size-5" /><span className="font-semibold">Betaald</span></div>
            </div>
          </div>
        </section>

        <section id="prijzen" className="px-5 py-24 sm:px-8 lg:py-32">
          <div className="mx-auto max-w-7xl">
            <div className="max-w-3xl"><p className="text-xs font-bold uppercase text-primary">Prijzen</p><h2 className="mt-4 text-3xl font-semibold sm:text-5xl">Start gratis. Upgrade wanneer je groeit.</h2><p className="mt-5 text-base leading-7 text-muted-foreground">Maandprijzen zoals aangeboden in de huidige betaalomgeving.</p></div>
            <div className="mt-12 grid gap-5 lg:grid-cols-3">
              {plans.map((plan) => (
                <div key={plan.name} className={cn("flex flex-col rounded-3xl border p-6 sm:p-8", plan.featured ? "border-primary bg-primary text-primary-foreground shadow-landing" : "border-border bg-card")}>
                  <p className={cn("text-sm font-bold uppercase", plan.featured ? "text-primary-foreground/70" : "text-muted-foreground")}>{plan.name}</p>
                  <div className="mt-6 flex items-end gap-2"><span className="text-4xl font-semibold">{plan.price}</span><span className={cn("pb-1 text-sm", plan.featured ? "text-primary-foreground/70" : "text-muted-foreground")}>/maand</span></div>
                  <p className={cn("mt-3 text-sm", plan.featured ? "text-primary-foreground/70" : "text-muted-foreground")}>{plan.description}</p>
                  <ul className="my-8 flex-1 space-y-3">{plan.items.map((item) => <li key={item} className="flex gap-3 text-sm"><Check className={cn("size-4 shrink-0", plan.featured ? "text-landing-lime" : "text-primary")} />{item}</li>)}</ul>
                  <Button asChild variant={plan.featured ? "secondary" : "outline"} className={cn("h-11 rounded-xl", plan.featured && "bg-landing-lime text-landing-ink hover:bg-landing-lime/90")}><Link to="/register">Start met {plan.name}</Link></Button>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="faq" className="border-y border-border bg-card px-5 py-24 sm:px-8 lg:py-32">
          <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[0.75fr_1.25fr] lg:gap-20">
            <div><p className="text-xs font-bold uppercase text-primary">FAQ</p><h2 className="mt-4 text-3xl font-semibold sm:text-5xl">Veelgestelde vragen.</h2></div>
            <Accordion type="single" collapsible>
              {[
                ["Kan ik Faktuvi gratis gebruiken?", "Ja. Het Free-plan bevat maximaal 5 offertes en 5 facturen per maand."],
                ["Kan ik offertes omzetten in facturen?", "Ja. Vanuit een offerte kun je een factuur aanmaken zonder alle regels opnieuw in te voeren."],
                ["Kan ik PDF's downloaden?", "Ja. Offertes en facturen kunnen als PDF worden gedownload."],
                ["Kan ik documenten per e-mail versturen?", "Ja. E-mailverzending is onderdeel van de betaalde functionaliteit en vereist een correct geconfigureerde e-mailservice."],
                ["Kan mijn klant online betalen?", "Met het Business-plan kan voor een factuur een Stripe-betaallink worden aangemaakt."],
                ["Werkt Faktuvi op mobiel?", "Ja. De interface is ontworpen voor zowel desktop als mobiel gebruik."],
              ].map(([question, answer]) => <AccordionItem key={question} value={question}><AccordionTrigger className="py-6 text-left text-base font-semibold">{question}</AccordionTrigger><AccordionContent className="pb-6 text-base leading-7 text-muted-foreground">{answer}</AccordionContent></AccordionItem>)}
            </Accordion>
          </div>
        </section>

        <section className="px-5 py-24 sm:px-8 lg:py-32">
          <div className="mx-auto max-w-7xl rounded-3xl bg-landing-dark px-6 py-16 text-center text-landing-dark-foreground sm:px-10 lg:py-20">
            <Send className="mx-auto size-7 text-landing-lime" />
            <h2 className="mx-auto mt-6 max-w-3xl text-4xl font-semibold sm:text-5xl">Je volgende factuur kan eenvoudiger.</h2>
            <p className="mx-auto mt-5 max-w-xl text-landing-dark-muted">Maak gratis een account en begin met je eerste klant, offerte of factuur.</p>
            <Button asChild size="lg" className="mt-8 h-12 rounded-xl bg-landing-lime px-7 text-landing-ink hover:bg-landing-lime/90"><Link to="/register">Gratis starten <ArrowRight /></Link></Button>
          </div>
        </section>
      </main>

      <footer className="px-5 pb-10 sm:px-8">
        <div className="mx-auto max-w-7xl border-t border-border pt-10">
          <div className="grid gap-8 md:grid-cols-[1fr_auto_auto] md:items-start">
            <div><Brand /><p className="mt-4 max-w-sm text-sm leading-6 text-muted-foreground">Eenvoudige offertes en facturen voor zelfstandigen en kleine bedrijven.</p></div>
            <div className="flex flex-col gap-3 text-sm"><span className="font-semibold">Product</span><a href="#product" className="text-muted-foreground hover:text-foreground">Functies</a><a href="#prijzen" className="text-muted-foreground hover:text-foreground">Prijzen</a><Link to="/login" className="text-muted-foreground hover:text-foreground">Inloggen</Link></div>
            <div className="flex flex-col gap-3 text-sm"><span className="font-semibold">Juridisch</span><Link to="/privacy" className="text-muted-foreground hover:text-foreground">Privacy</Link><Link to="/terms" className="text-muted-foreground hover:text-foreground">Voorwaarden</Link></div>
          </div>
          <div className="mt-10 flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-muted-foreground">© 2026 {PRODUCT_NAME}. Alle rechten voorbehouden.</p><div className="w-40"><LanguageSelector /></div></div>
        </div>
      </footer>
    </div>
  );
}

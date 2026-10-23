import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  component: () => (
    <main className="min-h-screen bg-background px-5 py-16 text-foreground">
      <article className="mx-auto max-w-3xl">
        <Link to="/">← Faktuvi</Link>
        <h1 className="mt-8 text-4xl font-semibold">Voorwaarden</h1>
        <div className="mt-6 space-y-4 leading-7 text-muted-foreground">
          <p>Faktuvi is software voor het beheren van klanten, offertes en facturen. De gebruiker blijft verantwoordelijk voor de juistheid van ingevoerde gegevens, documenten, belastinggegevens en betaalinformatie.</p>
          <p>Beschikbaarheid kan tijdelijk worden onderbroken voor onderhoud, beveiliging of storingen bij externe dienstverleners. Misbruik, ongeautoriseerde toegang en gebruik in strijd met toepasselijke wetgeving zijn niet toegestaan.</p>
          <p>Betaalde functies kunnen via externe betaalproviders worden afgerekend. Prijzen en planinhoud worden in de applicatie weergegeven voordat een betaling wordt gestart.</p>
          <p>Deze voorwaarden kunnen worden aangepast wanneer de dienst of toepasselijke regelgeving verandert.</p>
        </div>
        <p className="mt-8 text-sm text-muted-foreground">Laatst bijgewerkt: 14 september 2026.</p>
      </article>
    </main>
  ),
});

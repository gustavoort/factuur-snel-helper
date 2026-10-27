import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacyverklaring — Faktuvi" },
      {
        name: "description",
        content: "Lees hoe Faktuvi persoonsgegevens verwerkt, beschermt en bewaart bij het gebruik van offertes, facturen en klantbeheer.",
      },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: "Privacyverklaring — Faktuvi" },
      {
        property: "og:description",
        content: "Informatie over persoonsgegevens en privacy bij Faktuvi.",
      },
    ],
    links: [{ rel: "canonical", href: "https://www.faktuvi.nl/privacy" }],
  }),
  component: () => (
    <main className="min-h-screen bg-background px-5 py-16 text-foreground">
      <article className="mx-auto max-w-3xl">
        <Link to="/">← Faktuvi</Link>
        <h1 className="mt-8 text-4xl font-semibold">Privacy</h1>
        <p className="mt-6 leading-7 text-muted-foreground">Faktuvi verwerkt gegevens die nodig zijn om accounts, klanten, offertes, facturen, betalingen en ondersteuning te leveren. Gegevens worden alleen gebruikt voor de werking, beveiliging en verbetering van de dienst en om aan wettelijke verplichtingen te voldoen.</p>
        <p className="mt-4 leading-7 text-muted-foreground">Je kunt verzoeken om inzage, correctie of verwijdering van persoonsgegevens voor zover de toepasselijke wetgeving dat toestaat. Deze pagina wordt bijgewerkt wanneer leveranciers, functies of wettelijke vereisten veranderen.</p>
        <p className="mt-8 text-sm text-muted-foreground">Laatst bijgewerkt: 14 september 2026.</p>
      </article>
    </main>
  ),
});

import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FactuurSnel — Offertes en facturen in seconden" },
      {
        name: "description",
        content:
          "FactuurSnel is de eenvoudige facturatiesoftware voor Nederlandse ondernemers: klanten, offertes, facturen en PDF's.",
      },
      { property: "og:title", content: "FactuurSnel — Offertes en facturen in seconden" },
      {
        property: "og:description",
        content: "Beheer klanten, maak offertes en verstuur facturen — snel en professioneel.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <Logo />
        <div className="flex gap-2">
          <Button asChild variant="ghost">
            <Link to="/login">Inloggen</Link>
          </Button>
          <Button asChild>
            <Link to="/register">Gratis starten</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          Offertes en facturen in seconden
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground">
          FactuurSnel helpt Nederlandse ondernemers met klanten, offertes, facturen, PDF's en
          betaalstatus — alles op één plek.
        </p>
        <div className="mt-9 flex justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/register">Gratis account aanmaken</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/login">Inloggen</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}

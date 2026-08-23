import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/clients/new")({
  head: () => ({
    meta: [
      { title: "Nieuwe klant — FactuurSnel" },
      { name: "description", content: "Voeg een nieuwe klant toe." },
      { property: "og:title", content: "Nieuwe klant — FactuurSnel" },
      { property: "og:description", content: "Voeg een nieuwe klant toe." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Nieuwe klant" description="Voeg een nieuwe klant toe." />
      <EmptyState title="Binnenkort beschikbaar" description="Deze module wordt in de volgende stap uitgewerkt." />
    </>
  );
}

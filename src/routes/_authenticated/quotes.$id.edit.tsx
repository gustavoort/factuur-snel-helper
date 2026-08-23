import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/quotes/$id/edit")({
  head: () => ({
    meta: [
      { title: "Offerte bewerken — FactuurSnel" },
      { name: "description", content: "Werk de offerte bij." },
      { property: "og:title", content: "Offerte bewerken — FactuurSnel" },
      { property: "og:description", content: "Werk de offerte bij." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Offerte bewerken" description="Werk de offerte bij." />
      <EmptyState title="Binnenkort beschikbaar" description="Deze module wordt in de volgende stap uitgewerkt." />
    </>
  );
}

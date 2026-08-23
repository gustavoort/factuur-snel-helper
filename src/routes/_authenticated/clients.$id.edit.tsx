import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/clients/$id/edit")({
  head: () => ({
    meta: [
      { title: "Klant bewerken — FactuurSnel" },
      { name: "description", content: "Werk de klantgegevens bij." },
      { property: "og:title", content: "Klant bewerken — FactuurSnel" },
      { property: "og:description", content: "Werk de klantgegevens bij." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Klant bewerken" description="Werk de klantgegevens bij." />
      <EmptyState title="Binnenkort beschikbaar" description="Deze module wordt in de volgende stap uitgewerkt." />
    </>
  );
}

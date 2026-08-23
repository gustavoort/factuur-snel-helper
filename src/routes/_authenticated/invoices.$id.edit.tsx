import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/invoices/$id/edit")({
  head: () => ({
    meta: [
      { title: "Factuur bewerken — FactuurSnel" },
      { name: "description", content: "Werk de factuur bij." },
      { property: "og:title", content: "Factuur bewerken — FactuurSnel" },
      { property: "og:description", content: "Werk de factuur bij." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Factuur bewerken" description="Werk de factuur bij." />
      <EmptyState title="Binnenkort beschikbaar" description="Deze module wordt in de volgende stap uitgewerkt." />
    </>
  );
}

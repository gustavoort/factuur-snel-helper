import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/payment-success")({
  head: () => ({
    meta: [
      { title: "Betaling gelukt — FactuurSnel" },
      { name: "description", content: "Je betaling is verwerkt." },
      { property: "og:title", content: "Betaling gelukt — FactuurSnel" },
      { property: "og:description", content: "Je betaling is verwerkt." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Betaling gelukt" description="Je betaling is verwerkt." />
      <EmptyState title="Binnenkort beschikbaar" description="Deze module wordt in de volgende stap uitgewerkt." />
    </>
  );
}

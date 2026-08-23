import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/quotes/new")({
  head: () => ({
    meta: [
      { title: "Nieuwe offerte — FactuurSnel" },
      { name: "description", content: "Stel een nieuwe offerte op." },
      { property: "og:title", content: "Nieuwe offerte — FactuurSnel" },
      { property: "og:description", content: "Stel een nieuwe offerte op." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Nieuwe offerte" description="Stel een nieuwe offerte op." />
      <EmptyState title="Binnenkort beschikbaar" description="Deze module wordt in de volgende stap uitgewerkt." />
    </>
  );
}

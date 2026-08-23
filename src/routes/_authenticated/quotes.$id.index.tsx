import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/quotes/$id")({
  head: () => ({
    meta: [
      { title: "Offerte — FactuurSnel" },
      { name: "description", content: "Bekijk de offerte." },
      { property: "og:title", content: "Offerte — FactuurSnel" },
      { property: "og:description", content: "Bekijk de offerte." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Offerte" description="Bekijk de offerte." />
      <EmptyState title="Binnenkort beschikbaar" description="Deze module wordt in de volgende stap uitgewerkt." />
    </>
  );
}

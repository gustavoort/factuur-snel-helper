import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/quotes/")({
  head: () => ({
    meta: [
      { title: "Offertes — FactuurSnel" },
      { name: "description", content: "Beheer je offertes." },
      { property: "og:title", content: "Offertes — FactuurSnel" },
      { property: "og:description", content: "Beheer je offertes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Offertes" description="Beheer je offertes." />
      <EmptyState title="Nog geen offertes" description="Deze module wordt in de volgende stap uitgewerkt." />
    </>
  );
}

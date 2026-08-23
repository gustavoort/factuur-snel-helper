import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/clients/")({
  head: () => ({
    meta: [
      { title: "Klanten — FactuurSnel" },
      { name: "description", content: "Beheer je klanten." },
      { property: "og:title", content: "Klanten — FactuurSnel" },
      { property: "og:description", content: "Beheer je klanten." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Klanten" description="Beheer je klanten." />
      <EmptyState title="Nog geen klanten" description="Deze module wordt in de volgende stap uitgewerkt." />
    </>
  );
}

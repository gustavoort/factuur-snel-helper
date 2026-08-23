import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/invoices/new")({
  head: () => ({
    meta: [
      { title: "Nieuwe factuur — FactuurSnel" },
      { name: "description", content: "Maak een nieuwe factuur." },
      { property: "og:title", content: "Nieuwe factuur — FactuurSnel" },
      { property: "og:description", content: "Maak een nieuwe factuur." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Nieuwe factuur" description="Maak een nieuwe factuur." />
      <EmptyState title="Binnenkort beschikbaar" description="Deze module wordt in de volgende stap uitgewerkt." />
    </>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/invoices")({
  head: () => ({
    meta: [
      { title: "Facturen — FactuurSnel" },
      { name: "description", content: "Beheer je facturen." },
      { property: "og:title", content: "Facturen — FactuurSnel" },
      { property: "og:description", content: "Beheer je facturen." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Facturen" description="Beheer je facturen." />
      <EmptyState title="Nog geen facturen" description="Deze module wordt in de volgende stap uitgewerkt." />
    </>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/company")({
  head: () => ({
    meta: [
      { title: "Bedrijfsgegevens — FactuurSnel" },
      { name: "description", content: "Beheer je bedrijfsgegevens en logo." },
      { property: "og:title", content: "Bedrijfsgegevens — FactuurSnel" },
      { property: "og:description", content: "Beheer je bedrijfsgegevens en logo." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Bedrijfsgegevens" description="Beheer je bedrijfsgegevens en logo." />
      <EmptyState title="Binnenkort beschikbaar" description="Deze module wordt in de volgende stap uitgewerkt." />
    </>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, EmptyState } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/billing")({
  head: () => ({
    meta: [
      { title: "Abonnement — FactuurSnel" },
      { name: "description", content: "Bekijk je plan: Free, Pro of Business." },
      { property: "og:title", content: "Abonnement — FactuurSnel" },
      { property: "og:description", content: "Bekijk je plan: Free, Pro of Business." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <>
      <PageHeader title="Abonnement" description="Bekijk je plan: Free, Pro of Business." />
      <EmptyState title="Binnenkort beschikbaar" description="Deze module wordt in de volgende stap uitgewerkt." />
    </>
  );
}

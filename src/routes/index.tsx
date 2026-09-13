import { createFileRoute } from "@tanstack/react-router";
import { LandingPage } from "@/components/LandingPage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Van klus naar betaald — [NOME DO PRODUTO]" },
      { name: "description", content: "Leg uren, materialen, kosten en meerwerk vast en zet uitgevoerd werk sneller om in een betaalde factuur." },
      { property: "og:title", content: "Van klus naar betaald — [NOME DO PRODUTO]" },
      { property: "og:description", content: "Minder administratie, niets vergeten en sneller betaald voor vakmensen en kleine serviceteams." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});

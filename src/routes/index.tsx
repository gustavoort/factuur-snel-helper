import { createFileRoute } from "@tanstack/react-router";
import { LandingPage } from "@/components/LandingPage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FactuurSnel" },
      { name: "description", content: "Offertes en facturen voor zelfstandigen en kleine bedrijven." },
      { property: "og:title", content: "FactuurSnel" },
      { property: "og:description", content: "Offertes en facturen voor zelfstandigen en kleine bedrijven." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LandingPage,
});
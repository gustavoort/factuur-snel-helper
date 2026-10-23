import { createFileRoute } from "@tanstack/react-router";
import { LandingPage } from "@/components/LandingPage";

const description =
  "Maak offertes en facturen, beheer klanten en houd betalingen overzichtelijk bij met Faktuvi.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Faktuvi — Offertes en facturen zonder gedoe" },
      { name: "description", content: description },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: "Faktuvi — Offertes en facturen zonder gedoe" },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { property: "og:locale", content: "nl_NL" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Faktuvi — Offertes en facturen zonder gedoe" },
      { name: "twitter:description", content: description },
    ],
  }),
  component: LandingPage,
});
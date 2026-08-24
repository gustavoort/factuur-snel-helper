import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { LanguageSelector } from "@/components/LanguageSelector";
import i18n from "@/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: i18n.t("landing.metaTitle") },
      { name: "description", content: i18n.t("landing.metaDescription") },
      { property: "og:title", content: i18n.t("landing.metaTitle") },
      { property: "og:description", content: i18n.t("landing.subtitle") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-6 py-6">
        <Logo />
        <div className="flex items-center gap-2">
          <LanguageSelector className="w-40" />
          <Button asChild variant="ghost">
            <Link to="/login">{t("landing.login")}</Link>
          </Button>
          <Button asChild>
            <Link to="/register">{t("landing.register")}</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-24 text-center">
        <h1 className="text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
          {t("landing.title")}
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground">
          {t("landing.subtitle")}
        </p>
        <div className="mt-9 flex justify-center gap-3">
          <Button asChild size="lg">
            <Link to="/register">{t("landing.ctaPrimary")}</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link to="/login">{t("landing.login")}</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}

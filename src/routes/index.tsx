import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FactuurSnel" },
      {
        name: "description",
        content: "FactuurSnel — crie e envie faturas em segundos.",
      },
      { property: "og:title", content: "FactuurSnel" },
      {
        property: "og:description",
        content: "FactuurSnel — crie e envie faturas em segundos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <div className="flex items-center gap-2.5">
        <span
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground text-lg font-bold"
          aria-hidden
        >
          F
        </span>
        <span className="text-2xl font-semibold tracking-tight text-foreground">
          Factuur<span className="text-primary">Snel</span>
        </span>
      </div>

      <p className="mt-6 max-w-md text-base text-muted-foreground">
        Crie e envie faturas em segundos. O seu projeto está pronto para
        começar.
      </p>

      <div className="mt-10 h-px w-24 bg-border" />

      <p className="mt-6 text-xs text-muted-foreground">
        Projeto vazio · Pronto para desenvolvimento
      </p>
    </div>
  );
}

import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { FileText, Plus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { QuoteStatusBadge } from "@/components/quotes/QuoteStatusBadge";
import { formatCurrency, formatDate, quotesQueryOptions } from "@/lib/quotes";
import { getApiErrorMessage } from "@/lib/api";

const FILTERS = [
  { value: "", label: "Alle" },
  { value: "draft", label: "Concept" },
  { value: "sent", label: "Verzonden" },
  { value: "accepted", label: "Geaccepteerd" },
] as const;

export const Route = createFileRoute("/_authenticated/quotes/")({
  validateSearch: (search: Record<string, unknown>) => ({
    status: typeof search["status"] === "string" ? search["status"] : "",
  }),
  loaderDeps: ({ search }) => ({ status: search.status }),
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(quotesQueryOptions(deps.status || undefined)),
  head: () => ({
    meta: [
      { title: "Offertes — FactuurSnel" },
      { name: "description", content: "Beheer en verstuur uw offertes." },
      { property: "og:title", content: "Offertes — FactuurSnel" },
      { property: "og:description", content: "Beheer en verstuur uw offertes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  pendingComponent: QuotesLoading,
  errorComponent: QuotesError,
  component: QuotesPage,
});

function QuotesPage() {
  const { status } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const { data: quotes } = useSuspenseQuery(quotesQueryOptions(status || undefined));

  return (
    <>
      <PageHeader
        title="Offertes"
        description="Beheer en verstuur uw offertes."
        actions={
          <Button asChild>
            <Link to="/quotes/new">
              <Plus /> Nieuwe offerte
            </Link>
          </Button>
        }
      />

      <div className="mb-5 flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <Button
            key={filter.value}
            size="sm"
            variant={status === filter.value ? "default" : "outline"}
            onClick={() => void navigate({ search: { status: filter.value }, replace: true })}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {quotes.length === 0 ? (
        status ? (
          <div className="rounded-lg border border-dashed border-border px-6 py-12 text-center">
            <p className="font-medium text-foreground">Geen offertes gevonden</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Er zijn geen offertes met deze status.
            </p>
          </div>
        ) : (
          <QuotesEmpty />
        )
      ) : (
        <div className="grid gap-3">
          {quotes.map((quote) => (
            <Link
              key={quote.id}
              to="/quotes/$id"
              params={{ id: quote.id }}
              className="block rounded-lg border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/40 sm:p-5"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-foreground">
                      {quote.quote_number || `Offerte ${quote.id}`}
                    </h2>
                    <QuoteStatusBadge status={quote.status} />
                  </div>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    {quote.client_company || quote.client_name || "Onbekende klant"}
                  </p>
                </div>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:grid-cols-3 sm:text-right">
                  <div>
                    <dt className="text-xs text-muted-foreground">Datum</dt>
                    <dd className="text-foreground">{formatDate(quote.created_at)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Geldig tot</dt>
                    <dd className="text-foreground">{formatDate(quote.valid_until)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Totaal</dt>
                    <dd className="font-semibold text-foreground">{formatCurrency(quote.total)}</dd>
                  </div>
                </dl>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

function QuotesEmpty() {
  return (
    <div className="rounded-lg border border-dashed border-border px-6 py-14 text-center">
      <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
      <h2 className="mt-4 font-semibold text-foreground">Nog geen offertes</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        Maak uw eerste offerte voor een klant.
      </p>
      <Button asChild className="mt-5">
        <Link to="/quotes/new">
          <Plus /> Eerste offerte maken
        </Link>
      </Button>
    </div>
  );
}

function QuotesLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-24 w-full" />
    </div>
  );
}

function QuotesError({ error }: { error: Error }) {
  const router = useRouter();
  return (
    <div role="alert" className="rounded-lg border border-destructive/30 bg-card p-6">
      <h1 className="font-semibold text-foreground">Offertes konden niet worden geladen</h1>
      <p className="mt-1 text-sm text-destructive">{getApiErrorMessage(error)}</p>
      <Button className="mt-4" variant="outline" onClick={() => void router.invalidate()}>
        Opnieuw proberen
      </Button>
    </div>
  );
}

import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { getApiErrorMessage, isApiConfigured } from "@/lib/api";
import { quotesQueryOptions } from "@/lib/quotes";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/i18n/format";
import { pageMeta } from "@/i18n/head";

const STATUS_FILTERS = ["", "draft", "sent", "accepted", "rejected"] as const;

export const Route = createFileRoute("/_authenticated/quotes/")({
  head: () => ({ meta: pageMeta("quotes.title", "quotes.description") }),
  component: QuotesPage,
});

function QuotesPage() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<string>("");

  const { data, isPending, isError, error } = useQuery({
    ...quotesQueryOptions(status || undefined),
    enabled: isApiConfigured,
    retry: false,
  });

  const quotes = data ?? [];

  return (
    <>
      <PageHeader
        title={t("quotes.title")}
        description={t("quotes.description")}
        actions={
          <Button asChild>
            <Link to="/quotes/new">
              <Plus className="h-4 w-4" /> {t("quotes.new")}
            </Link>
          </Button>
        }
      />

      {!isApiConfigured && (
        <div className="mb-6 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          {t("common.apiNotConfigured")}
        </div>
      )}
      {isError && (
        <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {getApiErrorMessage(error, t("quotes.loadFailed"))}
        </div>
      )}

      <div className="mb-5 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((value) => (
          <Button
            key={value || "all"}
            size="sm"
            variant={status === value ? "default" : "outline"}
            onClick={() => setStatus(value)}
          >
            {value ? t(`status.${value}`) : t("common.all")}
          </Button>
        ))}
      </div>

      {isApiConfigured && isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : quotes.length === 0 ? (
        <EmptyState
          title={status ? t("quotes.noResults") : t("quotes.emptyTitle")}
          description={status ? t("quotes.noResultsHint") : t("quotes.emptyHint")}
        />
      ) : (
        <Card>
          <CardContent className="divide-y divide-border p-0">
            {quotes.map((quote) => (
              <Link
                key={quote.id}
                to="/quotes/$id"
                params={{ id: quote.id }}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 transition-colors hover:bg-accent/40"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {quote.quote_number || t("quotes.label")}
                    <span className="text-muted-foreground">
                      {" · "}
                      {quote.client_company || quote.client_name || t("common.unknownClient")}
                    </span>
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[formatDate(quote.created_at), formatDate(quote.valid_until)]
                      .filter(Boolean)
                      .join(" → ") || t("common.dash")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <StatusBadge status={quote.status} />
                  <span className="text-sm font-medium text-foreground">
                    {formatCurrency(quote.total)}
                  </span>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </>
  );
}

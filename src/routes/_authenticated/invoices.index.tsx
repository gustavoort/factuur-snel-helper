import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { getApiErrorMessage, isApiConfigured } from "@/lib/api";
import { invoicesQueryOptions } from "@/lib/invoices";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/i18n/format";
import { pageMeta } from "@/i18n/head";

const STATUS_FILTERS = ["", "draft", "sent", "paid", "overdue", "cancelled"] as const;

export const Route = createFileRoute("/_authenticated/invoices/")({
  head: () => ({ meta: pageMeta("invoices.title", "invoices.description") }),
  component: InvoicesPage,
});

function InvoicesPage() {
  const { t } = useTranslation();
  const [status, setStatus] = useState<string>("");

  const { data, isPending, isError, error } = useQuery({
    ...invoicesQueryOptions(status || undefined),
    enabled: isApiConfigured,
    retry: false,
  });

  const invoices = data ?? [];

  return (
    <>
      <PageHeader
        title={t("invoices.title")}
        description={t("invoices.description")}
        actions={
          <Button asChild>
            <Link to="/invoices/new">
              <Plus className="h-4 w-4" /> {t("invoices.new")}
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
          {getApiErrorMessage(error, t("invoices.loadFailed"))}
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
      ) : invoices.length === 0 ? (
        <EmptyState
          title={status ? t("invoices.noResults") : t("invoices.emptyTitle")}
          description={status ? t("invoices.noResultsHint") : t("invoices.emptyHint")}
        />
      ) : (
        <Card>
          <CardContent className="divide-y divide-border p-0">
            {invoices.map((invoice) => (
              <Link
                key={invoice.id}
                to="/invoices/$id"
                params={{ id: invoice.id }}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 transition-colors hover:bg-accent/40"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {invoice.invoice_number || t("invoices.label")}
                    <span className="text-muted-foreground">
                      {" · "}
                      {invoice.client_company || invoice.client_name || t("common.unknownClient")}
                    </span>
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[formatDate(invoice.created_at), formatDate(invoice.due_date)]
                      .filter(Boolean)
                      .join(" → ") || t("common.dash")}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <StatusBadge status={invoice.status} />
                  <span className="text-sm font-medium text-foreground">
                    {formatCurrency(invoice.total)}
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

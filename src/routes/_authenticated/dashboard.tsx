import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { AxiosError } from "axios";
import api, { isApiConfigured, getApiErrorMessage } from "@/lib/api";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/StatusBadge";
import { formatCurrency } from "@/i18n/format";
import { collection, asRecord, num, text } from "@/lib/normalize";
import { pageMeta } from "@/i18n/head";
import { currentSubscriptionQueryOptions } from "@/lib/subscription";
import { StatusBadge as PlanBadge } from "@/components/StatusBadge";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: pageMeta("dashboard.title", "dashboard.description") }),
  component: DashboardPage,
});

interface DashboardRow {
  id: string;
  number: string;
  clientName: string;
  total: number | null;
  status: string;
}

interface DashboardData {
  total_clients?: number;
  total_quotes?: number;
  total_invoices?: number;
  paid_revenue?: number;
  outstanding?: number;
  recent_quotes?: unknown;
  recent_invoices?: unknown;
}

function dashboardRows(value: unknown, kind: "invoice" | "quote"): DashboardRow[] {
  return collection(value, kind === "invoice" ? "invoices" : "quotes").map((item, index) => {
    const row = asRecord(item) ?? {};
    return {
      id: text(row["id"], String(index)),
      number: text(
        row["number"] ?? row[kind === "invoice" ? "invoice_number" : "quote_number"],
        `#${index + 1}`,
      ),
      clientName: text(row["client_name"] ?? asRecord(row["client"])?.["name"]),
      total: num(row["total"]),
      status: text(row["status"]),
    };
  });
}

function RecentList({ rows }: { rows: DashboardRow[] }) {
  return (
    <Card>
      <CardContent className="divide-y divide-border p-0">
        {rows.map((row) => (
          <div key={row.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
            <span className="min-w-0 truncate text-foreground">
              {row.number}
              {row.clientName ? (
                <span className="text-muted-foreground"> · {row.clientName}</span>
              ) : null}
            </span>
            <span className="flex shrink-0 items-center gap-3">
              {row.status ? <StatusBadge status={row.status} /> : null}
              <span className="text-muted-foreground">{formatCurrency(row.total)}</span>
            </span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function DashboardPage() {
  const { t } = useTranslation();
  const subscription = useQuery({
    ...currentSubscriptionQueryOptions(),
    enabled: isApiConfigured,
    retry: false,
  });
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => (await api.get<DashboardData>("/dashboard")).data,
    enabled: isApiConfigured,
    retry: false,
  });

  const isUnauthorized = error instanceof AxiosError && error.response?.status === 401;
  const loading = isApiConfigured && isPending;
  const hasData = Boolean(data);

  const stats = [
    { label: t("dashboard.revenue"), value: formatCurrency(data?.paid_revenue) },
    { label: t("dashboard.outstanding"), value: formatCurrency(data?.outstanding) },
    { label: t("dashboard.invoices"), value: String(data?.total_invoices ?? 0) },
    { label: t("dashboard.quotes"), value: String(data?.total_quotes ?? 0) },
    { label: t("dashboard.clients"), value: String(data?.total_clients ?? 0) },
  ];

  const recentInvoices = dashboardRows(data?.recent_invoices, "invoice");
  const recentQuotes = dashboardRows(data?.recent_quotes, "quote");

  return (
    <>
      <PageHeader
        title={t("dashboard.title")}
        description={t("dashboard.description")}
        actions={
          <>
            <Button asChild>
              <Link to="/invoices/new">
                <Plus className="h-4 w-4" /> {t("dashboard.newInvoice")}
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/quotes/new">{t("dashboard.newQuote")}</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/clients/new">{t("dashboard.newClient")}</Link>
            </Button>
          </>
        }
      />

      {!isApiConfigured && (
        <div className="mb-6 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          {t("common.apiNotConfigured")}
        </div>
      )}
      {isError && (
        <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {isUnauthorized
            ? t("errors.sessionExpired")
            : getApiErrorMessage(error, t("dashboard.loadFailed"))}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-7 w-24" />
              ) : (
                <p className="text-2xl font-semibold tracking-tight text-foreground">
                  {hasData ? s.value : t("common.dash")}
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {subscription.data ? (
        <Card className="mt-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("dashboard.currentPlan")}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-3">
            <p className="text-xl font-semibold capitalize text-foreground">
              {subscription.data.plan || t("billing.free")}
            </p>
            {subscription.data.status ? <PlanBadge status={subscription.data.status} /> : null}
            {(subscription.data.plan || "free").toLowerCase() === "free" && (
              <Button asChild size="sm" className="ml-auto">
                <Link to="/billing">{t("dashboard.upgrade")}</Link>
              </Button>
            )}
          </CardContent>
        </Card>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-sm font-semibold text-foreground">
            {t("dashboard.recentInvoices")}
          </h2>
          {loading ? (
            <Skeleton className="h-24 w-full" />
          ) : recentInvoices.length === 0 ? (
            <EmptyState
              title={t("dashboard.noInvoices")}
              description={t("dashboard.noInvoicesHint")}
            />
          ) : (
            <RecentList rows={recentInvoices} />
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-foreground">
            {t("dashboard.recentQuotes")}
          </h2>
          {loading ? (
            <Skeleton className="h-24 w-full" />
          ) : recentQuotes.length === 0 ? (
            <EmptyState title={t("dashboard.noQuotes")} description={t("dashboard.noQuotesHint")} />
          ) : (
            <RecentList rows={recentQuotes} />
          )}
        </section>
      </div>
    </>
  );
}

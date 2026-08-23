import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { AxiosError } from "axios";
import api, { isApiConfigured, getApiErrorMessage } from "@/lib/api";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — FactuurSnel" },
      { name: "description", content: "Overzicht van je omzet, openstaande facturen en klanten." },
      { property: "og:title", content: "Dashboard — FactuurSnel" },
      { property: "og:description", content: "Overzicht van je omzet, openstaande facturen en klanten." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DashboardPage,
});

interface DashboardRow {
  id?: string | number;
  number?: string;
  invoice_number?: string;
  quote_number?: string;
  client_name?: string;
  total?: number;
  status?: string;
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

const euro = (v: number | undefined) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(v ?? 0);

function dashboardRows(value: unknown): DashboardRow[] {
  if (Array.isArray(value)) return value as DashboardRow[];
  if (value && typeof value === "object") {
    const nested = (value as { items?: unknown; results?: unknown; data?: unknown }).items
      ?? (value as { results?: unknown }).results
      ?? (value as { data?: unknown }).data;
    if (Array.isArray(nested)) return nested as DashboardRow[];
  }
  return [];
}

function RecentList({ rows, kind }: { rows: DashboardRow[]; kind: "invoice" | "quote" }) {
  return (
    <Card>
      <CardContent className="divide-y divide-border p-0">
        {rows.map((row, i) => (
          <div key={row.id ?? i} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
            <span className="min-w-0 truncate text-foreground">
              {row.number ?? (kind === "invoice" ? row.invoice_number : row.quote_number) ?? `#${row.id ?? i + 1}`}
              {row.client_name ? <span className="text-muted-foreground"> · {row.client_name}</span> : null}
            </span>
            <span className="shrink-0 text-muted-foreground">{euro(row.total)}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function DashboardPage() {
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
    { label: "Omzet", value: euro(data?.paid_revenue) },
    { label: "Openstaand", value: euro(data?.outstanding) },
    { label: "Facturen", value: String(data?.total_invoices ?? 0) },
    { label: "Klanten", value: String(data?.total_clients ?? 0) },
  ];

  const recentInvoices = dashboardRows(data?.recent_invoices);
  const recentQuotes = dashboardRows(data?.recent_quotes);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Je financiële overzicht in één oogopslag."
        actions={
          <>
            <Button asChild>
              <Link to="/invoices/new">
                <Plus className="h-4 w-4" /> Nieuwe factuur
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/quotes/new">Nieuwe offerte</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/clients/new">Nieuwe klant</Link>
            </Button>
          </>
        }
      />

      {!isApiConfigured && (
        <div className="mb-6 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          Stel <code className="font-mono">VITE_API_URL</code> in (volledige URL van de FastAPI-backend) om live data te
          laden.
        </div>
      )}
      {isError && (
        <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {isUnauthorized
            ? "Je sessie is verlopen. Log opnieuw in."
            : getApiErrorMessage(error, "Kon dashboardgegevens niet laden.")}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-7 w-24" />
              ) : (
                <p className="text-2xl font-semibold tracking-tight text-foreground">{hasData ? s.value : "—"}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Recente facturen</h2>
          {loading ? (
            <Skeleton className="h-24 w-full" />
          ) : recentInvoices.length === 0 ? (
            <EmptyState title="Nog geen facturen" description="Maak je eerste factuur aan." />
          ) : (
            <RecentList rows={recentInvoices} kind="invoice" />
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Recente offertes</h2>
          {loading ? (
            <Skeleton className="h-24 w-full" />
          ) : recentQuotes.length === 0 ? (
            <EmptyState title="Nog geen offertes" description="Maak je eerste offerte aan." />
          ) : (
            <RecentList rows={recentQuotes} kind="quote" />
          )}
        </section>
      </div>
    </>
  );
}

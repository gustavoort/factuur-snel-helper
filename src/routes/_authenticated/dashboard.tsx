import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import api, { isApiConfigured } from "@/lib/api";
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

interface DashboardData {
  omzet?: number;
  revenue?: number;
  openstaand?: number;
  outstanding?: number;
  invoices_count?: number;
  clients_count?: number;
  recent_invoices?: Array<Record<string, unknown>>;
  recent_quotes?: Array<Record<string, unknown>>;
}

const euro = (v: number | undefined) =>
  new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(v ?? 0);

function DashboardPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard"],
    queryFn: async () => (await api.get<DashboardData>("/dashboard")).data,
    enabled: isApiConfigured,
  });

  const stats = [
    { label: "Omzet", value: euro(data?.omzet ?? data?.revenue) },
    { label: "Openstaand", value: euro(data?.openstaand ?? data?.outstanding) },
    { label: "Facturen", value: String(data?.invoices_count ?? 0) },
    { label: "Klanten", value: String(data?.clients_count ?? 0) },
  ];

  const recentInvoices = Array.isArray(data?.recent_invoices) ? data.recent_invoices : [];
  const recentQuotes = Array.isArray(data?.recent_quotes) ? data.recent_quotes : [];

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
          Stel <code className="font-mono">VITE_API_URL</code> in om live data van de FastAPI-backend te laden.
        </div>
      )}
      {isError && (
        <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Kon dashboardgegevens niet laden.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-7 w-24" />
              ) : (
                <p className="text-2xl font-semibold tracking-tight text-foreground">{s.value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Recente facturen</h2>
          {recentInvoices.length === 0 ? (
            <EmptyState title="Nog geen facturen" description="Maak je eerste factuur aan." />
          ) : (
            <Card>
              <CardContent className="divide-y divide-border p-0">
                {recentInvoices.map((row, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3 text-sm">
                    <span className="text-foreground">
                      {String(row['number'] ?? row['invoice_number'] ?? row['id'] ?? "—")}
                    </span>
                    <span className="text-muted-foreground">{euro(Number(row['total'] ?? 0))}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold text-foreground">Recente offertes</h2>
          {recentQuotes.length === 0 ? (
            <EmptyState title="Nog geen offertes" description="Maak je eerste offerte aan." />
          ) : (
            <Card>
              <CardContent className="divide-y divide-border p-0">
                {recentQuotes.map((row, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-3 text-sm">
                    <span className="text-foreground">
                      {String(row['number'] ?? row['quote_number'] ?? row['id'] ?? "—")}
                    </span>
                    <span className="text-muted-foreground">{euro(Number(row['total'] ?? 0))}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </section>
      </div>
    </>
  );
}

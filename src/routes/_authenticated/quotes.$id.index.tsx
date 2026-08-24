import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import {
  Copy,
  Download,
  FileCheck2,
  Mail,
  MessageCircle,
  Pencil,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { QuoteStatusBadge } from "@/components/quotes/QuoteStatusBadge";
import {
  convertQuote,
  deleteQuote,
  downloadQuotePdf,
  duplicateQuote,
  formatCurrency,
  formatDate,
  getQuoteWhatsapp,
  quoteQueryOptions,
  sendQuoteEmail,
} from "@/lib/quotes";
import { getApiErrorMessage } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/quotes/$id/")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(quoteQueryOptions(params.id)),
  head: () => ({
    meta: [
      { title: "Offerte — FactuurSnel" },
      { name: "description", content: "Bekijk, verstuur of converteer deze offerte." },
      { property: "og:title", content: "Offerte — FactuurSnel" },
      { property: "og:description", content: "Bekijk, verstuur of converteer deze offerte." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  pendingComponent: () => <Skeleton className="h-96 w-full" />,
  errorComponent: QuoteDetailError,
  notFoundComponent: () => <p role="alert">Offerte niet gevonden.</p>,
  component: QuoteDetailPage,
});

function QuoteDetailPage() {
  const { id } = Route.useParams();
  const { data: quote } = useSuspenseQuery(quoteQueryOptions(id));
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const invalidateAll = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["quotes"] }),
      queryClient.invalidateQueries({ queryKey: ["quote", id] }),
      queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
    ]);

  const duplicate = useMutation({
    mutationFn: () => duplicateQuote(id),
    onSuccess: async (created) => {
      await queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast.success("Offerte gedupliceerd");
      await navigate({ to: "/quotes/$id", params: { id: created.id } });
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Dupliceren is mislukt.")),
  });

  const convert = useMutation({
    mutationFn: () => convertQuote(id),
    onSuccess: async (invoice) => {
      await Promise.all([
        invalidateAll(),
        queryClient.invalidateQueries({ queryKey: ["invoices"] }),
      ]);
      toast.success("Factuur succesvol aangemaakt");
      await navigate({ to: "/invoices/$id", params: { id: invoice.id } });
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Omzetten is mislukt.")),
  });

  const pdf = useMutation({
    mutationFn: () => downloadQuotePdf(id, quote.quote_number),
    onError: (error) => toast.error(getApiErrorMessage(error, "PDF downloaden is mislukt.")),
  });

  const whatsapp = useMutation({
    mutationFn: () => getQuoteWhatsapp(id),
    onSuccess: (result) => {
      window.open(result.url, "_blank", "noopener,noreferrer");
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "WhatsApp-link ophalen is mislukt.")),
  });

  const email = useMutation({
    mutationFn: () => sendQuoteEmail(id),
    onSuccess: async (message) => {
      await invalidateAll();
      toast.success(message);
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "E-mail verzenden is mislukt.")),
  });

  const remove = useMutation({
    mutationFn: () => deleteQuote(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["quotes"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
      toast.success("Offerte succesvol verwijderd");
      await navigate({ to: "/quotes", search: { status: "" } });
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Verwijderen is mislukt.")),
  });

  const busy =
    duplicate.isPending ||
    convert.isPending ||
    pdf.isPending ||
    whatsapp.isPending ||
    email.isPending ||
    remove.isPending;

  return (
    <>
      <PageHeader
        title={quote.quote_number ? `Offerte ${quote.quote_number}` : "Offerte"}
        description={quote.client_company || quote.client_name || undefined}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link to="/quotes/$id/edit" params={{ id }}>
                <Pencil /> Bewerken
              </Link>
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => duplicate.mutate()}
            >
              <Copy /> Dupliceren
            </Button>
            <Button variant="outline" size="sm" disabled={busy} onClick={() => pdf.mutate()}>
              <Download /> Download PDF
            </Button>
            <Button variant="outline" size="sm" disabled={busy} onClick={() => whatsapp.mutate()}>
              <MessageCircle /> Via WhatsApp delen
            </Button>
            <Button variant="outline" size="sm" disabled={busy} onClick={() => email.mutate()}>
              <Mail /> Per e-mail verzenden
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button size="sm" disabled={busy}>
                  <FileCheck2 /> Omzetten naar factuur
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Deze offerte omzetten naar een factuur?</AlertDialogTitle>
                  <AlertDialogDescription>
                    De offerte wordt daarbij op geaccepteerd gezet.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={convert.isPending}>Annuleren</AlertDialogCancel>
                  <AlertDialogAction
                    disabled={convert.isPending}
                    onClick={() => convert.mutate()}
                  >
                    {convert.isPending ? "Bezig…" : "Omzetten"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={busy}>
                  <Trash2 /> Verwijderen
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Offerte verwijderen?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Weet u zeker dat u deze offerte wilt verwijderen? Deze actie kan niet ongedaan
                    worden gemaakt.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={remove.isPending}>Annuleren</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    disabled={remove.isPending}
                    onClick={() => remove.mutate()}
                  >
                    {remove.isPending ? "Verwijderen…" : "Offerte verwijderen"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        }
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="rounded-lg border border-border bg-card p-5 shadow-sm lg:col-span-2">
          <h2 className="mb-4 font-semibold text-foreground">Regels</h2>
          {quote.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">Deze offerte heeft geen regels.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="pb-2 font-medium">Omschrijving</th>
                    <th className="pb-2 text-right font-medium">Aantal</th>
                    <th className="pb-2 text-right font-medium">Prijs</th>
                    <th className="pb-2 text-right font-medium">BTW</th>
                    <th className="pb-2 text-right font-medium">Totaal</th>
                  </tr>
                </thead>
                <tbody>
                  {quote.items.map((item, index) => (
                    <tr key={`${item.description}-${index}`} className="border-b border-border/60">
                      <td className="py-2.5 text-foreground">{item.description}</td>
                      <td className="py-2.5 text-right text-foreground">{item.quantity}</td>
                      <td className="py-2.5 text-right text-foreground">
                        {formatCurrency(item.unit_price)}
                      </td>
                      <td className="py-2.5 text-right text-foreground">{item.vat_rate}%</td>
                      <td className="py-2.5 text-right font-medium text-foreground">
                        {formatCurrency(
                          item.total ??
                            item.quantity * item.unit_price * (1 + item.vat_rate / 100),
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <dl className="mt-5 space-y-2 border-t border-border pt-4 text-sm sm:ml-auto sm:max-w-xs">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Subtotaal</dt>
              <dd className="font-medium text-foreground">{formatCurrency(quote.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">BTW</dt>
              <dd className="font-medium text-foreground">{formatCurrency(quote.vat_total)}</dd>
            </div>
            <div className="flex justify-between border-t border-border pt-2 text-base">
              <dt className="font-semibold text-foreground">Totaal</dt>
              <dd className="font-semibold text-foreground">{formatCurrency(quote.total)}</dd>
            </div>
          </dl>

          {quote.notes && (
            <div className="mt-6 border-t border-border pt-4">
              <h3 className="text-sm font-medium text-foreground">Notities</h3>
              <p className="mt-1.5 whitespace-pre-wrap text-sm text-muted-foreground">
                {quote.notes}
              </p>
            </div>
          )}
        </section>

        <aside className="space-y-5">
          <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-3 font-semibold text-foreground">Gegevens</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Status</dt>
                <dd className="mt-1">
                  <QuoteStatusBadge status={quote.status} />
                </dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Offertenummer</dt>
                <dd className="text-foreground">{quote.quote_number || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Aangemaakt op</dt>
                <dd className="text-foreground">{formatDate(quote.created_at)}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Geldig tot</dt>
                <dd className="text-foreground">{formatDate(quote.valid_until)}</dd>
              </div>
              {quote.sent_at && (
                <div>
                  <dt className="text-xs text-muted-foreground">Verzonden op</dt>
                  <dd className="text-foreground">{formatDate(quote.sent_at)}</dd>
                </div>
              )}
            </dl>
          </section>

          <section className="rounded-lg border border-border bg-card p-5 shadow-sm">
            <h2 className="mb-3 font-semibold text-foreground">Klant</h2>
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-xs text-muted-foreground">Naam</dt>
                <dd className="text-foreground">{quote.client_name || "—"}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Bedrijf</dt>
                <dd className="text-foreground">{quote.client_company || "—"}</dd>
              </div>
              {quote.client_id && (
                <div>
                  <dt className="text-xs text-muted-foreground">Klantkaart</dt>
                  <dd>
                    <Link
                      to="/clients/$id/edit"
                      params={{ id: quote.client_id }}
                      className="text-primary hover:underline"
                    >
                      Klant bekijken
                    </Link>
                  </dd>
                </div>
              )}
            </dl>
          </section>
        </aside>
      </div>
    </>
  );
}

function QuoteDetailError({ error }: { error: Error }) {
  const router = useRouter();
  return (
    <div role="alert" className="rounded-lg border border-destructive/30 bg-card p-6">
      <h1 className="font-semibold text-foreground">Offerte kon niet worden geladen</h1>
      <p className="mt-1 text-sm text-destructive">{getApiErrorMessage(error)}</p>
      <Button className="mt-4" variant="outline" onClick={() => void router.invalidate()}>
        Opnieuw proberen
      </Button>
    </div>
  );
}

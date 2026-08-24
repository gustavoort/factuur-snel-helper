import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { QuoteForm, emptyQuoteItem, type QuoteFormValues } from "@/components/quotes/QuoteForm";
import { quoteQueryOptions, updateQuote } from "@/lib/quotes";
import { getApiErrorMessage } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/quotes/$id/edit")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(quoteQueryOptions(params.id)),
  head: () => ({
    meta: [
      { title: "Offerte bewerken — FactuurSnel" },
      { name: "description", content: "Werk de regels en voorwaarden van de offerte bij." },
      { property: "og:title", content: "Offerte bewerken — FactuurSnel" },
      { property: "og:description", content: "Werk de regels en voorwaarden van de offerte bij." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  pendingComponent: () => <Skeleton className="h-96 w-full" />,
  errorComponent: QuoteEditError,
  notFoundComponent: () => <p role="alert">Offerte niet gevonden.</p>,
  component: EditQuotePage,
});

function EditQuotePage() {
  const { id } = Route.useParams();
  const { data: quote } = useSuspenseQuery(quoteQueryOptions(id));
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (values: QuoteFormValues) =>
      updateQuote(id, {
        items: values.items,
        notes: values.notes,
        validity_days: values.validity_days,
        status: quote.status || undefined,
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["quotes"] }),
        queryClient.invalidateQueries({ queryKey: ["quote", id] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
      toast.success("Offerte succesvol bijgewerkt");
      await navigate({ to: "/quotes/$id", params: { id } });
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Offerte bijwerken is mislukt.")),
  });

  const defaultValues: QuoteFormValues = {
    client_id: quote.client_id,
    items: quote.items.length
      ? quote.items.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          vat_rate: item.vat_rate,
        }))
      : [{ ...emptyQuoteItem }],
    notes: quote.notes,
    validity_days: quote.validity_days,
  };

  return (
    <>
      <PageHeader
        title="Offerte bewerken"
        description={quote.quote_number ? `Offerte ${quote.quote_number}` : undefined}
      />
      <QuoteForm
        defaultValues={defaultValues}
        lockedClientLabel={quote.client_company || quote.client_name || "Onbekende klant"}
        submitLabel="Wijzigingen opslaan"
        isSubmitting={mutation.isPending}
        onSubmit={async (values) => {
          await mutation.mutateAsync(values).catch(() => undefined);
        }}
        onCancel={() => void navigate({ to: "/quotes/$id", params: { id } })}
      />
    </>
  );
}

function QuoteEditError({ error }: { error: Error }) {
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

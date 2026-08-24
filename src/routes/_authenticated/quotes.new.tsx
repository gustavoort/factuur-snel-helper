import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { QuoteForm, emptyQuoteValues, type QuoteFormValues } from "@/components/quotes/QuoteForm";
import { clientsQueryOptions } from "@/lib/clients";
import { createQuote } from "@/lib/quotes";
import { getApiErrorMessage } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/quotes/new")({
  loader: ({ context }) => context.queryClient.ensureQueryData(clientsQueryOptions()),
  head: () => ({
    meta: [
      { title: "Nieuwe offerte — FactuurSnel" },
      { name: "description", content: "Stel een nieuwe offerte op voor een klant." },
      { property: "og:title", content: "Nieuwe offerte — FactuurSnel" },
      { property: "og:description", content: "Stel een nieuwe offerte op voor een klant." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  pendingComponent: () => <Skeleton className="h-96 w-full" />,
  errorComponent: NewQuoteError,
  component: NewQuotePage,
});

function NewQuotePage() {
  const { data: clients } = useSuspenseQuery(clientsQueryOptions());
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (values: QuoteFormValues) =>
      createQuote({
        client_id: values.client_id,
        items: values.items,
        notes: values.notes,
        validity_days: values.validity_days,
      }),
    onSuccess: async (quote) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["quotes"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
      ]);
      toast.success("Offerte succesvol aangemaakt");
      await navigate({ to: "/quotes/$id", params: { id: quote.id } });
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Offerte aanmaken is mislukt.")),
  });

  return (
    <>
      <PageHeader title="Nieuwe offerte" description="Stel een nieuwe offerte op voor een klant." />
      {clients.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-6 py-12 text-center">
          <p className="font-medium text-foreground">Nog geen klanten</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Voeg eerst een klant toe om een offerte te kunnen maken.
          </p>
        </div>
      ) : (
        <QuoteForm
          defaultValues={emptyQuoteValues}
          clients={clients}
          submitLabel="Offerte opslaan"
          isSubmitting={mutation.isPending}
          onSubmit={async (values) => {
            await mutation.mutateAsync(values).catch(() => undefined);
          }}
          onCancel={() => void navigate({ to: "/quotes", search: { status: "" } })}
        />
      )}
    </>
  );
}

function NewQuoteError({ error }: { error: Error }) {
  const router = useRouter();
  return (
    <div role="alert" className="rounded-lg border border-destructive/30 bg-card p-6">
      <h1 className="font-semibold text-foreground">Klanten konden niet worden geladen</h1>
      <p className="mt-1 text-sm text-destructive">{getApiErrorMessage(error)}</p>
      <Button className="mt-4" variant="outline" onClick={() => void router.invalidate()}>
        Opnieuw proberen
      </Button>
    </div>
  );
}

import { createFileRoute, useNavigate, useRouter } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { ClientForm } from "@/components/clients/ClientForm";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { clientQueryOptions, updateClient, type ClientPayload } from "@/lib/clients";
import { getApiErrorMessage } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/clients/$id/edit")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(clientQueryOptions(params.id)),
  head: () => ({
    meta: [
      { title: "Klant bewerken — FactuurSnel" },
      { name: "description", content: "Werk de klantgegevens bij." },
      { property: "og:title", content: "Klant bewerken — FactuurSnel" },
      { property: "og:description", content: "Werk de klantgegevens bij." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  pendingComponent: () => <Skeleton className="h-96 w-full" />,
  errorComponent: ClientEditError,
  notFoundComponent: () => <p role="alert">Klant niet gevonden.</p>,
  component: EditClientPage,
});

function EditClientPage() {
  const { id } = Route.useParams();
  const { data: client } = useSuspenseQuery(clientQueryOptions(id));
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (values: ClientPayload) => updateClient(id, values),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["clients"] }),
        queryClient.invalidateQueries({ queryKey: ["clients", id] }),
      ]);
      toast.success("Klant succesvol bijgewerkt");
      await navigate({ to: "/clients", search: { q: "" } });
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Klant bijwerken is mislukt.")),
  });

  const submit = async (values: ClientPayload) => {
    await mutation.mutateAsync(values).catch(() => undefined);
  };

  return (
    <>
      <PageHeader title="Klant bewerken" description="Werk de klantgegevens bij." />
      <ClientForm
        defaultValues={client}
        submitLabel="Wijzigingen opslaan"
        isSubmitting={mutation.isPending}
        onSubmit={submit}
        onCancel={() => void navigate({ to: "/clients", search: { q: "" } })}
      />
    </>
  );
}

function ClientEditError({ error }: { error: Error }) {
  const router = useRouter();
  return (
    <div role="alert" className="rounded-lg border border-destructive/30 bg-card p-6">
      <h1 className="font-semibold text-foreground">Klant kon niet worden geladen</h1>
      <p className="mt-1 text-sm text-destructive">{getApiErrorMessage(error)}</p>
      <Button className="mt-4" variant="outline" onClick={() => void router.invalidate()}>
        Opnieuw proberen
      </Button>
    </div>
  );
}

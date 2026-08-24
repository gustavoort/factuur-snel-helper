import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { ClientForm } from "@/components/clients/ClientForm";
import { createClient, emptyClient, type ClientPayload } from "@/lib/clients";
import { getApiErrorMessage } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/clients/new")({
  head: () => ({
    meta: [
      { title: "Nieuwe klant — FactuurSnel" },
      { name: "description", content: "Voeg een nieuwe klant toe." },
      { property: "og:title", content: "Nieuwe klant — FactuurSnel" },
      { property: "og:description", content: "Voeg een nieuwe klant toe." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NewClientPage,
});

function NewClientPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: createClient,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Klant succesvol toegevoegd");
      await navigate({ to: "/clients", search: { q: "" } });
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Klant toevoegen is mislukt.")),
  });

  const submit = async (values: ClientPayload) => {
    await mutation.mutateAsync(values).catch(() => undefined);
  };

  return (
    <>
      <PageHeader title="Nieuwe klant" description="Voeg een nieuwe klant toe." />
      <ClientForm
        defaultValues={emptyClient}
        submitLabel="Klant toevoegen"
        isSubmitting={mutation.isPending}
        onSubmit={submit}
        onCancel={() => void navigate({ to: "/clients", search: { q: "" } })}
      />
    </>
  );
}

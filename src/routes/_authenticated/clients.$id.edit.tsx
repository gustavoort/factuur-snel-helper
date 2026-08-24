import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api";
import { clientQueryOptions, updateClient, type ClientPayload } from "@/lib/clients";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { ClientForm } from "@/components/clients/ClientForm";
import { Skeleton } from "@/components/ui/skeleton";
import { pageMeta } from "@/i18n/head";

export const Route = createFileRoute("/_authenticated/clients/$id/edit")({
  head: () => ({ meta: pageMeta("clients.editTitle", "clients.editDescription") }),
  component: EditClientPage,
});

function EditClientPage() {
  const { id } = Route.useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isPending, isError, error } = useQuery({
    ...clientQueryOptions(id),
    retry: false,
  });

  const update = useMutation({
    mutationFn: (values: ClientPayload) => updateClient(id, values),
    onSuccess: async () => {
      toast.success(t("clients.updated"));
      await queryClient.invalidateQueries({ queryKey: ["clients"] });
      void navigate({ to: "/clients" });
    },
    onError: (err) => toast.error(getApiErrorMessage(err, t("clients.updateFailed"))),
  });

  return (
    <>
      <PageHeader title={t("clients.editTitle")} description={t("clients.editDescription")} />

      {isPending ? (
        <Skeleton className="h-96 w-full" />
      ) : isError ? (
        <EmptyState
          title={t("clients.detailLoadFailed")}
          description={getApiErrorMessage(error, t("clients.notFound"))}
        />
      ) : (
        <ClientForm
          defaultValues={data}
          submitLabel={t("common.saveChanges")}
          isSubmitting={update.isPending}
          onSubmit={async (values) => {
            await update.mutateAsync(values).catch(() => undefined);
          }}
          onCancel={() => void navigate({ to: "/clients" })}
        />
      )}
    </>
  );
}

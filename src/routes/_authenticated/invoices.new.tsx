import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api";
import { clientsQueryOptions } from "@/lib/clients";
import { createInvoice } from "@/lib/invoices";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import {
  DocumentForm,
  emptyDocumentValues,
  type DocumentFormValues,
} from "@/components/documents/DocumentForm";
import { Skeleton } from "@/components/ui/skeleton";
import { pageMeta } from "@/i18n/head";

export const Route = createFileRoute("/_authenticated/invoices/new")({
  head: () => ({ meta: pageMeta("invoices.newTitle", "invoices.newDescription") }),
  component: NewInvoicePage,
});

function NewInvoicePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const clients = useQuery({ ...clientsQueryOptions(), retry: false });

  const create = useMutation({
    mutationFn: (values: DocumentFormValues) =>
      createInvoice({
        client_id: values.client_id,
        items: values.items,
        notes: values.notes,
      }),
    onSuccess: async (invoice) => {
      toast.success(t("invoices.created"));
      await queryClient.invalidateQueries({ queryKey: ["invoices"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void navigate({ to: "/invoices/$id", params: { id: invoice.id } });
    },
    onError: (err) => toast.error(getApiErrorMessage(err, t("invoices.createFailed"))),
  });

  return (
    <>
      <PageHeader title={t("invoices.newTitle")} description={t("invoices.newDescription")} />

      {clients.isPending ? (
        <Skeleton className="h-96 w-full" />
      ) : clients.isError ? (
        <EmptyState
          title={t("invoices.clientsLoadFailed")}
          description={getApiErrorMessage(clients.error)}
        />
      ) : clients.data.length === 0 ? (
        <EmptyState
          title={t("invoices.noClientsTitle")}
          description={t("invoices.noClientsHint")}
        />
      ) : (
        <DocumentForm
          kind="invoices"
          defaultValues={emptyDocumentValues}
          clients={clients.data}
          submitLabel={t("invoices.submitNew")}
          isSubmitting={create.isPending}
          onSubmit={async (values) => {
            await create.mutateAsync(values).catch(() => undefined);
          }}
          onCancel={() => void navigate({ to: "/invoices" })}
        />
      )}
    </>
  );
}

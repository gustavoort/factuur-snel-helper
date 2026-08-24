import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api";
import { clientsQueryOptions } from "@/lib/clients";
import { createQuote } from "@/lib/quotes";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import {
  DocumentForm,
  emptyDocumentValues,
  type DocumentFormValues,
} from "@/components/documents/DocumentForm";
import { Skeleton } from "@/components/ui/skeleton";
import { pageMeta } from "@/i18n/head";

export const Route = createFileRoute("/_authenticated/quotes/new")({
  head: () => ({ meta: pageMeta("quotes.newTitle", "quotes.newDescription") }),
  component: NewQuotePage,
});

function NewQuotePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const clients = useQuery({ ...clientsQueryOptions(), retry: false });

  const create = useMutation({
    mutationFn: (values: DocumentFormValues) =>
      createQuote({
        client_id: values.client_id,
        items: values.items,
        notes: values.notes,
        validity_days: values.validity_days,
      }),
    onSuccess: async (quote) => {
      toast.success(t("quotes.created"));
      await queryClient.invalidateQueries({ queryKey: ["quotes"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      void navigate({ to: "/quotes/$id", params: { id: quote.id } });
    },
    onError: (err) => toast.error(getApiErrorMessage(err, t("quotes.createFailed"))),
  });

  return (
    <>
      <PageHeader title={t("quotes.newTitle")} description={t("quotes.newDescription")} />

      {clients.isPending ? (
        <Skeleton className="h-96 w-full" />
      ) : clients.isError ? (
        <EmptyState
          title={t("quotes.clientsLoadFailed")}
          description={getApiErrorMessage(clients.error)}
        />
      ) : clients.data.length === 0 ? (
        <EmptyState title={t("quotes.noClientsTitle")} description={t("quotes.noClientsHint")} />
      ) : (
        <DocumentForm
          kind="quotes"
          defaultValues={emptyDocumentValues}
          clients={clients.data}
          submitLabel={t("quotes.submitNew")}
          isSubmitting={create.isPending}
          onSubmit={async (values) => {
            await create.mutateAsync(values).catch(() => undefined);
          }}
          onCancel={() => void navigate({ to: "/quotes" })}
        />
      )}
    </>
  );
}

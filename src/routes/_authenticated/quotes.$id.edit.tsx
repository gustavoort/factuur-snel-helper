import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api";
import { quoteQueryOptions, updateQuote } from "@/lib/quotes";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { DocumentForm, type DocumentFormValues } from "@/components/documents/DocumentForm";
import { Skeleton } from "@/components/ui/skeleton";
import { pageMeta } from "@/i18n/head";

const STATUS_OPTIONS = ["draft", "sent", "accepted", "rejected", "expired"];

export const Route = createFileRoute("/_authenticated/quotes/$id/edit")({
  head: () => ({ meta: pageMeta("quotes.editTitle", "quotes.editDescription") }),
  component: EditQuotePage,
});

function EditQuotePage() {
  const { id } = Route.useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isPending, isError, error } = useQuery({ ...quoteQueryOptions(id), retry: false });

  const update = useMutation({
    mutationFn: (values: DocumentFormValues) =>
      updateQuote(id, {
        items: values.items,
        notes: values.notes,
        validity_days: values.validity_days,
        status: values.status || undefined,
      }),
    onSuccess: async () => {
      toast.success(t("quotes.updated"));
      await queryClient.invalidateQueries({ queryKey: ["quotes"] });
      await queryClient.invalidateQueries({ queryKey: ["quote", id] });
      void navigate({ to: "/quotes/$id", params: { id } });
    },
    onError: (err) => toast.error(getApiErrorMessage(err, t("quotes.updateFailed"))),
  });

  return (
    <>
      <PageHeader title={t("quotes.editTitle")} description={t("quotes.editDescription")} />

      {isPending ? (
        <Skeleton className="h-96 w-full" />
      ) : isError ? (
        <EmptyState
          title={t("quotes.detailLoadFailed")}
          description={getApiErrorMessage(error, t("quotes.notFound"))}
        />
      ) : (
        <DocumentForm
          kind="quotes"
          defaultValues={{
            client_id: data.client_id,
            items: data.items.length
              ? data.items.map((item) => ({
                  description: item.description,
                  quantity: item.quantity,
                  unit_price: item.unit_price,
                  vat_rate: item.vat_rate,
                }))
              : [{ description: "", quantity: 1, unit_price: 0, vat_rate: 21 }],
            notes: data.notes,
            validity_days: data.validity_days,
            status: data.status || "draft",
          }}
          lockedClientLabel={
            data.client_company || data.client_name || t("common.unknownClient")
          }
          statusOptions={STATUS_OPTIONS}
          submitLabel={t("common.saveChanges")}
          isSubmitting={update.isPending}
          onSubmit={async (values) => {
            await update.mutateAsync(values).catch(() => undefined);
          }}
          onCancel={() => void navigate({ to: "/quotes/$id", params: { id } })}
        />
      )}
    </>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api";
import { invoiceQueryOptions, updateInvoice } from "@/lib/invoices";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { DocumentForm, type DocumentFormValues } from "@/components/documents/DocumentForm";
import { Skeleton } from "@/components/ui/skeleton";
import { pageMeta } from "@/i18n/head";

const STATUS_OPTIONS = ["draft", "sent", "paid", "overdue", "cancelled"];

export const Route = createFileRoute("/_authenticated/invoices/$id/edit")({
  head: () => ({ meta: pageMeta("invoices.editTitle", "invoices.editDescription") }),
  component: EditInvoicePage,
});

function EditInvoicePage() {
  const { id } = Route.useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isPending, isError, error } = useQuery({
    ...invoiceQueryOptions(id),
    retry: false,
  });

  const update = useMutation({
    mutationFn: (values: DocumentFormValues) =>
      updateInvoice(id, {
        items: values.items,
        notes: values.notes,
        status: values.status || undefined,
      }),
    onSuccess: async () => {
      toast.success(t("invoices.updated"));
      await queryClient.invalidateQueries({ queryKey: ["invoices"] });
      await queryClient.invalidateQueries({ queryKey: ["invoice", id] });
      void navigate({ to: "/invoices/$id", params: { id } });
    },
    onError: (err) => toast.error(getApiErrorMessage(err, t("invoices.updateFailed"))),
  });

  return (
    <>
      <PageHeader title={t("invoices.editTitle")} description={t("invoices.editDescription")} />

      {isPending ? (
        <Skeleton className="h-96 w-full" />
      ) : isError ? (
        <EmptyState
          title={t("invoices.detailLoadFailed")}
          description={getApiErrorMessage(error, t("invoices.notFound"))}
        />
      ) : (
        <DocumentForm
          kind="invoices"
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
            validity_days: 30,
            status: data.status || "draft",
          }}
          lockedClientLabel={data.client_company || data.client_name || t("common.unknownClient")}
          statusOptions={STATUS_OPTIONS}
          submitLabel={t("common.saveChanges")}
          isSubmitting={update.isPending}
          onSubmit={async (values) => {
            await update.mutateAsync(values).catch(() => undefined);
          }}
          onCancel={() => void navigate({ to: "/invoices/$id", params: { id } })}
        />
      )}
    </>
  );
}

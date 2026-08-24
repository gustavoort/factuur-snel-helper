import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api";
import { createClient, emptyClient, type ClientPayload } from "@/lib/clients";
import { PageHeader } from "@/components/PageHeader";
import { ClientForm } from "@/components/clients/ClientForm";
import { pageMeta } from "@/i18n/head";

export const Route = createFileRoute("/_authenticated/clients/new")({
  head: () => ({ meta: pageMeta("clients.newTitle", "clients.newDescription") }),
  component: NewClientPage,
});

function NewClientPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const create = useMutation({
    mutationFn: (values: ClientPayload) => createClient(values),
    onSuccess: async () => {
      toast.success(t("clients.created"));
      await queryClient.invalidateQueries({ queryKey: ["clients"] });
      void navigate({ to: "/clients" });
    },
    onError: (err) => toast.error(getApiErrorMessage(err, t("clients.createFailed"))),
  });

  return (
    <>
      <PageHeader title={t("clients.newTitle")} description={t("clients.newDescription")} />
      <ClientForm
        defaultValues={emptyClient}
        submitLabel={t("clients.submitNew")}
        isSubmitting={create.isPending}
        onSubmit={async (values) => {
          await create.mutateAsync(values).catch(() => undefined);
        }}
        onCancel={() => void navigate({ to: "/clients" })}
      />
    </>
  );
}

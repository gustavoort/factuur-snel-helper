import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { pageMeta } from "@/i18n/head";

type Search = { status?: "canceled" | undefined };

// Public return page for invoice payment links. The payer is the invoice
// recipient, who has no Faktuvi account, so this route must not require login.
export const Route = createFileRoute("/invoice-paid")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    status: search["status"] === "canceled" ? "canceled" : undefined,
  }),
  head: () => ({
    meta: [
      ...pageMeta("invoicePaid.metaTitle", "invoicePaid.metaDescription"),
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: InvoicePaidPage,
});

function InvoicePaidPage() {
  const { status } = Route.useSearch();
  const { t } = useTranslation();
  const canceled = status === "canceled";

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-16 text-foreground">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-4 p-8 text-center">
          {canceled ? (
            <XCircle className="mx-auto h-10 w-10 text-muted-foreground" />
          ) : (
            <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
          )}
          <h1 className="text-xl font-semibold">
            {canceled ? t("invoicePaid.canceledTitle") : t("invoicePaid.successTitle")}
          </h1>
          <p className="text-sm text-muted-foreground">
            {canceled ? t("invoicePaid.canceledHint") : t("invoicePaid.successHint")}
          </p>
          <p className="pt-2 text-xs text-muted-foreground">{t("invoicePaid.poweredBy")}</p>
        </CardContent>
      </Card>
    </main>
  );
}

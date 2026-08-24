import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { getApiErrorMessage, isApiConfigured } from "@/lib/api";
import { paymentStatusQueryOptions } from "@/lib/subscription";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { pageMeta } from "@/i18n/head";

type Search = { session_id?: string | undefined };

export const Route = createFileRoute("/_authenticated/payment-success")({
  validateSearch: (search: Record<string, unknown>): Search => ({
    session_id:
      typeof search["session_id"] === "string" ? (search["session_id"] as string) : undefined,
  }),
  head: () => ({ meta: pageMeta("payment.title", "payment.description") }),
  component: PaymentSuccessPage,
});

function PaymentSuccessPage() {
  const { session_id: sessionId } = Route.useSearch();
  const { t } = useTranslation();

  const status = useQuery({
    ...paymentStatusQueryOptions(sessionId ?? ""),
    enabled: isApiConfigured && Boolean(sessionId),
  });

  const paid = status.data?.paid === true;
  const failed = status.isError || (status.data && !status.data.paid && status.data.status !== "");

  return (
    <>
      <PageHeader title={t("payment.title")} description={t("payment.description")} />

      <Card className="max-w-xl">
        <CardContent className="space-y-4 p-7 text-center">
          {!sessionId ? (
            <>
              <XCircle className="mx-auto h-10 w-10 text-destructive" />
              <p className="font-medium text-foreground">{t("payment.failed")}</p>
              <p className="text-sm text-muted-foreground">{t("payment.missingSession")}</p>
            </>
          ) : status.isPending ? (
            <>
              <Skeleton className="mx-auto h-10 w-10 rounded-full" />
              <p className="text-sm text-muted-foreground">{t("payment.checking")}</p>
            </>
          ) : paid ? (
            <>
              <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
              <p className="font-medium text-foreground">{t("payment.success")}</p>
              <p className="text-sm text-muted-foreground">
                {status.data?.message || t("payment.successHint")}
              </p>
            </>
          ) : failed ? (
            <>
              <XCircle className="mx-auto h-10 w-10 text-destructive" />
              <p className="font-medium text-foreground">{t("payment.failed")}</p>
              <p className="text-sm text-muted-foreground">
                {status.isError
                  ? getApiErrorMessage(status.error, t("payment.failedHint"))
                  : status.data?.message || t("payment.failedHint")}
              </p>
            </>
          ) : (
            <>
              <Clock className="mx-auto h-10 w-10 text-muted-foreground" />
              <p className="font-medium text-foreground">{t("payment.pending")}</p>
              <p className="text-sm text-muted-foreground">{t("payment.pendingHint")}</p>
            </>
          )}

          <div className="flex flex-wrap justify-center gap-2 pt-2">
            <Button asChild>
              <Link to="/billing">{t("payment.backToBilling")}</Link>
            </Button>
            {sessionId && !paid && (
              <Button variant="outline" onClick={() => void status.refetch()}>
                {t("payment.checkAgain")}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

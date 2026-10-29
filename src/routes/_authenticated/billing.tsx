import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Check } from "lucide-react";
import { getApiErrorMessage, isApiConfigured } from "@/lib/api";
import {
  currentSubscriptionQueryOptions,
  plansQueryOptions,
  startCheckout,
} from "@/lib/subscription";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/i18n/format";
import { pageMeta } from "@/i18n/head";

export const Route = createFileRoute("/_authenticated/billing")({
  head: () => ({ meta: pageMeta("billing.title", "billing.description") }),
  component: BillingPage,
});

function BillingPage() {
  const { t } = useTranslation();

  const plans = useQuery({ ...plansQueryOptions(), enabled: isApiConfigured, retry: false });
  const current = useQuery({
    ...currentSubscriptionQueryOptions(),
    enabled: isApiConfigured,
    retry: false,
  });

  const checkout = useMutation({
    mutationFn: (plan: string) => startCheckout(plan),
    onSuccess: (url) => {
      // Navigate the current tab: window.open after an async request can be
      // blocked by mobile Safari and leave the user on /billing.
      if (!/^https:\/\//i.test(url)) {
        toast.error(t("billing.checkoutFailed"));
        return;
      }
      window.location.assign(url);
    },
    onError: (err) => toast.error(getApiErrorMessage(err, t("billing.checkoutFailed"))),
  });

  const currentPlan = current.data?.plan ?? "";

  return (
    <>
      <PageHeader title={t("billing.title")} description={t("billing.description")} />

      {!isApiConfigured && (
        <div className="mb-6 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          {t("common.apiNotConfigured")}
        </div>
      )}
      {(plans.isError || current.isError) && (
        <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {getApiErrorMessage(plans.error ?? current.error, t("billing.loadFailed"))}
        </div>
      )}

      <Card className="mb-8">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t("billing.currentPlan")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-4">
          {isApiConfigured && current.isPending ? (
            <Skeleton className="h-7 w-40" />
          ) : (
            <>
              <p className="text-2xl font-semibold tracking-tight text-foreground capitalize">
                {currentPlan || t("billing.free")}
              </p>
              {current.data?.status ? <StatusBadge status={current.data.status} /> : null}
              {current.data?.current_period_end ? (
                <span className="text-sm text-muted-foreground">
                  {formatDate(current.data.current_period_end)}
                </span>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <h2 className="mb-4 text-sm font-semibold text-foreground">{t("billing.availablePlans")}</h2>

      {isApiConfigured && plans.isPending ? (
        <div className="grid gap-4 sm:grid-cols-3">
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-56 w-full" />
        </div>
      ) : (plans.data ?? []).length === 0 ? (
        <EmptyState title={t("billing.loadFailed")} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(plans.data ?? []).map((plan) => {
            const active = currentPlan.toLowerCase() === plan.id.toLowerCase();
            return (
              <Card key={plan.id} className={active ? "border-primary" : undefined}>
                <CardHeader className="pb-2">
                  <CardTitle className="capitalize">{plan.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-2xl font-semibold tracking-tight text-foreground">
                    {plan.price ? formatCurrency(plan.price) : t("billing.free")}
                    {plan.price ? (
                      <span className="ml-1 text-xs font-normal text-muted-foreground">
                        {t("billing.perMonth")}
                      </span>
                    ) : null}
                  </p>
                  {plan.description && (
                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                  )}
                  {plan.features.length > 0 && (
                    <ul className="space-y-1.5 text-sm text-muted-foreground">
                      {plan.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <Button
                    className="w-full"
                    variant={active ? "outline" : "default"}
                    disabled={active || checkout.isPending}
                    onClick={() => checkout.mutate(plan.id)}
                  >
                    {active
                      ? t("billing.current")
                      : checkout.isPending
                        ? t("billing.upgrading")
                        : t("billing.upgrade")}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}

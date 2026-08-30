import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  ArrowLeft,
  Download,
  Mail,
  MessageCircle,
  Copy,
  Pencil,
  Trash2,
  FileUp,
} from "lucide-react";
import { getApiErrorMessage } from "@/lib/api";
import {
  convertQuote,
  deleteQuote,
  downloadQuotePdf,
  duplicateQuote,
  getQuoteWhatsapp,
  quoteQueryOptions,
  sendQuoteEmail,
  setQuoteStatus,
  QUOTE_STATUSES,
} from "@/lib/quotes";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { StatusBadge } from "@/components/StatusBadge";
import { StatusSelect } from "@/components/StatusSelect";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { formatCurrency, formatDate, formatNumber } from "@/i18n/format";
import { pageMeta } from "@/i18n/head";

export const Route = createFileRoute("/_authenticated/quotes/$id/")({
  head: () => ({ meta: pageMeta("quotes.detailTitle", "quotes.detailDescription") }),
  component: QuoteDetailPage,
});

function QuoteDetailPage() {
  const { id } = Route.useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirm, setConfirm] = useState<"delete" | "convert" | null>(null);

  const { data, isPending, isError, error } = useQuery({ ...quoteQueryOptions(id), retry: false });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["quotes"] });
    await queryClient.invalidateQueries({ queryKey: ["quote", id] });
    await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const pdf = useMutation({
    mutationFn: () => downloadQuotePdf(id, data?.quote_number ?? ""),
    onError: (err) => toast.error(getApiErrorMessage(err, t("quotes.pdfFailed"))),
  });

  const email = useMutation({
    mutationFn: () => sendQuoteEmail(id),
    onSuccess: async (message) => {
      toast.success(message);
      await invalidate();
    },
    onError: (err) => toast.error(getApiErrorMessage(err, t("quotes.emailFailed"))),
  });

  const whatsapp = useMutation({
    mutationFn: () => getQuoteWhatsapp(id),
    onSuccess: ({ url }) => window.open(url, "_blank", "noopener,noreferrer"),
    onError: (err) => toast.error(getApiErrorMessage(err, t("quotes.whatsappFailed"))),
  });

  const duplicate = useMutation({
    mutationFn: () => duplicateQuote(id),
    onSuccess: async (quote) => {
      toast.success(t("quotes.duplicated"));
      await invalidate();
      void navigate({ to: "/quotes/$id", params: { id: quote.id } });
    },
    onError: (err) => toast.error(getApiErrorMessage(err, t("quotes.duplicateFailed"))),
  });

  const convert = useMutation({
    mutationFn: () => convertQuote(id),
    onSuccess: async (invoice) => {
      toast.success(t("quotes.converted"));
      setConfirm(null);
      await invalidate();
      await queryClient.invalidateQueries({ queryKey: ["invoices"] });
      void navigate({ to: "/invoices/$id", params: { id: invoice.id } });
    },
    onError: (err) => toast.error(getApiErrorMessage(err, t("quotes.convertFailed"))),
  });

  const changeStatus = useMutation({
    mutationFn: (status: string) => setQuoteStatus(id, status),
    onSuccess: async () => {
      toast.success(t("quotes.statusUpdated"));
      await invalidate();
    },
    onError: (err) => toast.error(getApiErrorMessage(err, t("quotes.statusUpdateFailed"))),
  });

  const remove = useMutation({
    mutationFn: () => deleteQuote(id),
    onSuccess: async () => {
      toast.success(t("quotes.deleted"));
      setConfirm(null);
      await invalidate();
      void navigate({ to: "/quotes" });
    },
    onError: (err) => toast.error(getApiErrorMessage(err, t("quotes.deleteFailed"))),
  });

  if (isPending) return <Skeleton className="h-96 w-full" />;
  if (isError) {
    return (
      <EmptyState
        title={t("quotes.detailLoadFailed")}
        description={getApiErrorMessage(error, t("quotes.notFound"))}
      />
    );
  }

  const busy =
    pdf.isPending ||
    email.isPending ||
    whatsapp.isPending ||
    duplicate.isPending ||
    convert.isPending ||
    changeStatus.isPending ||
    remove.isPending;

  return (
    <>
      <Link
        to="/quotes"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {t("quotes.title")}
      </Link>

      <PageHeader
        title={`${t("quotes.label")} ${data.quote_number}`.trim()}
        description={data.client_company || data.client_name || t("common.unknownClient")}
        actions={
          <>
            <Button variant="outline" disabled={busy} onClick={() => pdf.mutate()}>
              <Download className="h-4 w-4" /> {t("common.downloadPdf")}
            </Button>
            <Button variant="outline" disabled={busy} onClick={() => email.mutate()}>
              <Mail className="h-4 w-4" /> {t("common.sendEmail")}
            </Button>
            <Button variant="outline" disabled={busy} onClick={() => whatsapp.mutate()}>
              <MessageCircle className="h-4 w-4" /> {t("common.shareWhatsapp")}
            </Button>
            <Button variant="outline" disabled={busy} onClick={() => duplicate.mutate()}>
              <Copy className="h-4 w-4" /> {t("common.duplicate")}
            </Button>
            <Button disabled={busy} onClick={() => setConfirm("convert")}>
              <FileUp className="h-4 w-4" /> {t("quotes.convert")}
            </Button>
            <Button asChild variant="outline">
              <Link to="/quotes/$id/edit" params={{ id }}>
                <Pencil className="h-4 w-4" /> {t("common.edit")}
              </Link>
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => setConfirm("delete")}>
              <Trash2 className="h-4 w-4" /> {t("common.delete")}
            </Button>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-0">
            {data.items.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">{t("quotes.noLines")}</p>
            ) : (
              <div className="divide-y divide-border">
                {data.items.map((item, index) => (
                  <div
                    key={`${item.description}-${index}`}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm"
                  >
                    <span className="min-w-0 flex-1 truncate text-foreground">
                      {item.description}
                    </span>
                    <span className="text-muted-foreground">
                      {formatNumber(item.quantity)} × {formatCurrency(item.unit_price)} ·{" "}
                      {formatNumber(item.vat_rate, 0)}% {t("common.vat")}
                    </span>
                    <span className="font-medium text-foreground">
                      {formatCurrency(
                        item.total ?? item.quantity * item.unit_price * (1 + item.vat_rate / 100),
                      )}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <dl className="space-y-2 border-t border-border p-4 text-sm sm:ml-auto sm:max-w-xs">
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("common.subtotal")}</dt>
                <dd className="font-medium text-foreground">{formatCurrency(data.subtotal)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted-foreground">{t("common.vat")}</dt>
                <dd className="font-medium text-foreground">{formatCurrency(data.vat_total)}</dd>
              </div>
              <div className="flex justify-between border-t border-border pt-2 text-base">
                <dt className="font-semibold text-foreground">{t("common.total")}</dt>
                <dd className="font-semibold text-foreground">{formatCurrency(data.total)}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-4 p-5 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">{t("common.status")}</p>
              <div className="mt-1">
                <StatusBadge status={data.status} />
              </div>
              <StatusSelect
                value={data.status}
                statuses={QUOTE_STATUSES}
                disabled={busy}
                label={t("quotes.changeStatus")}
                onChange={(status) => changeStatus.mutate(status)}
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("quotes.number")}</p>
              <p className="text-foreground">{data.quote_number || t("common.dash")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("common.createdAt")}</p>
              <p className="text-foreground">{formatDate(data.created_at) || t("common.dash")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("common.validUntil")}</p>
              <p className="text-foreground">{formatDate(data.valid_until) || t("common.dash")}</p>
            </div>
            {data.sent_at && (
              <div>
                <p className="text-xs text-muted-foreground">{t("common.sentAt")}</p>
                <p className="text-foreground">{formatDate(data.sent_at)}</p>
              </div>
            )}
            {data.client_id && (
              <Button asChild variant="outline" size="sm">
                <Link to="/clients/$id/edit" params={{ id: data.client_id }}>
                  {t("common.viewClient")}
                </Link>
              </Button>
            )}
            {data.notes && (
              <div>
                <p className="text-xs text-muted-foreground">{t("common.notes")}</p>
                <p className="whitespace-pre-line text-foreground">{data.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirm === "convert" ? t("quotes.convertTitle") : t("quotes.deleteTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "convert"
                ? t("quotes.convertDescription")
                : t("quotes.deleteDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                if (confirm === "convert") convert.mutate();
                else remove.mutate();
              }}
            >
              {confirm === "convert"
                ? convert.isPending
                  ? t("quotes.converting")
                  : t("quotes.convertAction")
                : remove.isPending
                  ? t("common.deleting")
                  : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

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
  CreditCard,
  CheckCircle2,
  Pencil,
  Trash2,
} from "lucide-react";
import { getApiErrorMessage } from "@/lib/api";
import {
  createInvoicePaymentLink,
  deleteInvoice,
  downloadInvoicePdf,
  getInvoiceWhatsapp,
  invoiceQueryOptions,
  markInvoicePaid,
  sendInvoiceEmail,
  setInvoiceStatus,
  INVOICE_STATUSES,
} from "@/lib/invoices";
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

export const Route = createFileRoute("/_authenticated/invoices/$id/")({
  head: () => ({ meta: pageMeta("invoices.detailTitle", "invoices.detailDescription") }),
  component: InvoiceDetailPage,
});

function InvoiceDetailPage() {
  const { id } = Route.useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [confirm, setConfirm] = useState<"delete" | "paid" | null>(null);
  const [paymentUrl, setPaymentUrl] = useState("");

  const { data, isPending, isError, error } = useQuery({
    ...invoiceQueryOptions(id),
    retry: false,
  });

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["invoices"] });
    await queryClient.invalidateQueries({ queryKey: ["invoice", id] });
    await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const pdf = useMutation({
    mutationFn: () => downloadInvoicePdf(id, data?.invoice_number ?? ""),
    onError: (err) => toast.error(getApiErrorMessage(err, t("invoices.pdfFailed"))),
  });

  const email = useMutation({
    mutationFn: () => sendInvoiceEmail(id),
    onSuccess: async (message) => {
      toast.success(message);
      await invalidate();
    },
    onError: (err) => toast.error(getApiErrorMessage(err, t("invoices.emailFailed"))),
  });

  const whatsapp = useMutation({
    mutationFn: () => getInvoiceWhatsapp(id),
    onSuccess: ({ url }) => window.open(url, "_blank", "noopener,noreferrer"),
    onError: (err) => toast.error(getApiErrorMessage(err, t("invoices.whatsappFailed"))),
  });

  const paymentLink = useMutation({
    mutationFn: () => createInvoicePaymentLink(id),
    onSuccess: (url) => {
      setPaymentUrl(url);
      window.open(url, "_blank", "noopener,noreferrer");
      toast.success(t("invoices.paymentLinkCreated"));
    },
    onError: (err) => toast.error(getApiErrorMessage(err, t("invoices.paymentLinkFailed"))),
  });

  const changeStatus = useMutation({
    mutationFn: (status: string) => setInvoiceStatus(id, status),
    onSuccess: async () => {
      toast.success(t("invoices.statusUpdated"));
      await invalidate();
    },
    onError: (err) => toast.error(getApiErrorMessage(err, t("invoices.statusUpdateFailed"))),
  });

  const markPaid = useMutation({
    mutationFn: () => markInvoicePaid(id),
    onSuccess: async () => {
      toast.success(t("invoices.markedPaid"));
      setConfirm(null);
      await invalidate();
    },
    onError: (err) => toast.error(getApiErrorMessage(err, t("invoices.markPaidFailed"))),
  });

  const remove = useMutation({
    mutationFn: () => deleteInvoice(id),
    onSuccess: async () => {
      toast.success(t("invoices.deleted"));
      setConfirm(null);
      await invalidate();
      void navigate({ to: "/invoices" });
    },
    onError: (err) => toast.error(getApiErrorMessage(err, t("invoices.deleteFailed"))),
  });

  if (isPending) return <Skeleton className="h-96 w-full" />;
  if (isError) {
    return (
      <EmptyState
        title={t("invoices.detailLoadFailed")}
        description={getApiErrorMessage(error, t("invoices.notFound"))}
      />
    );
  }

  const busy =
    pdf.isPending ||
    email.isPending ||
    whatsapp.isPending ||
    paymentLink.isPending ||
    markPaid.isPending ||
    changeStatus.isPending ||
    remove.isPending;
  const isPaid = data.status.toLowerCase() === "paid";

  return (
    <>
      <Link
        to="/invoices"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> {t("invoices.title")}
      </Link>

      <PageHeader
        title={`${t("invoices.label")} ${data.invoice_number}`.trim()}
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
            <Button variant="outline" disabled={busy} onClick={() => paymentLink.mutate()}>
              <CreditCard className="h-4 w-4" /> {t("invoices.paymentLink")}
            </Button>
            {!isPaid && (
              <Button disabled={busy} onClick={() => setConfirm("paid")}>
                <CheckCircle2 className="h-4 w-4" /> {t("invoices.markPaid")}
              </Button>
            )}
            <Button asChild variant="outline">
              <Link to="/invoices/$id/edit" params={{ id }}>
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
              <p className="p-6 text-sm text-muted-foreground">{t("invoices.noLines")}</p>
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
                statuses={INVOICE_STATUSES}
                disabled={busy}
                label={t("invoices.changeStatus")}
                onChange={(status) => changeStatus.mutate(status)}
              />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("invoices.number")}</p>
              <p className="text-foreground">{data.invoice_number || t("common.dash")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("common.createdAt")}</p>
              <p className="text-foreground">{formatDate(data.created_at) || t("common.dash")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("common.dueDate")}</p>
              <p className="text-foreground">{formatDate(data.due_date) || t("common.dash")}</p>
            </div>
            {data.paid_at && (
              <div>
                <p className="text-xs text-muted-foreground">{t("common.paidAt")}</p>
                <p className="text-foreground">{formatDate(data.paid_at)}</p>
              </div>
            )}
            {data.quote_id && (
              <Button asChild variant="outline" size="sm">
                <Link to="/quotes/$id" params={{ id: data.quote_id }}>
                  {t("invoices.fromQuote")}
                </Link>
              </Button>
            )}
            {data.client_id && (
              <Button asChild variant="outline" size="sm">
                <Link to="/clients/$id/edit" params={{ id: data.client_id }}>
                  {t("common.viewClient")}
                </Link>
              </Button>
            )}
            {paymentUrl && (
              <div>
                <p className="text-xs text-muted-foreground">{t("invoices.paymentLink")}</p>
                <a
                  href={paymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="break-all text-primary underline"
                >
                  {paymentUrl}
                </a>
              </div>
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
              {confirm === "paid" ? t("invoices.markPaidTitle") : t("invoices.deleteTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirm === "paid"
                ? t("invoices.markPaidDescription")
                : t("invoices.deleteDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              onClick={(e) => {
                e.preventDefault();
                if (confirm === "paid") markPaid.mutate();
                else remove.mutate();
              }}
            >
              {confirm === "paid"
                ? markPaid.isPending
                  ? t("common.busy")
                  : t("invoices.markPaidAction")
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

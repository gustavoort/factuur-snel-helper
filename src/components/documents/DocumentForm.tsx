import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { computeTotals, VAT_RATES } from "@/lib/quotes";
import { clientLabel, type Client } from "@/lib/clients";
import { formatCurrency } from "@/i18n/format";

type Translate = (key: string) => string;

export interface DocumentItemValues {
  description: string;
  quantity: number;
  unit_price: number;
  vat_rate: number;
}

export interface DocumentFormValues {
  client_id: string;
  items: DocumentItemValues[];
  notes: string;
  validity_days: number;
  status: string;
}

export const emptyDocumentItem: DocumentItemValues = {
  description: "",
  quantity: 1,
  unit_price: 0,
  vat_rate: 21,
};

export const emptyDocumentValues: DocumentFormValues = {
  client_id: "",
  items: [{ ...emptyDocumentItem }],
  notes: "",
  validity_days: 30,
  status: "",
};

const buildSchema = (t: Translate, requireClient: boolean) =>
  z.object({
    client_id: requireClient
      ? z.string().trim().min(1, t("validation.clientRequired"))
      : z.string(),
    items: z
      .array(
        z.object({
          description: z.string().trim().min(1, t("validation.descriptionRequired")),
          quantity: z.coerce.number().gt(0, t("validation.quantityPositive")),
          unit_price: z.coerce.number().min(0, t("validation.priceNonNegative")),
          vat_rate: z.coerce.number().min(0).max(100),
        }),
      )
      .min(1, t("validation.atLeastOneLine")),
    notes: z.string(),
    validity_days: z.coerce
      .number()
      .int(t("validation.validityInt"))
      .min(1, t("validation.validityMin"))
      .max(365, t("validation.validityMax")),
    status: z.string(),
  });

/** Shared line-item form used for both quotes and invoices. */
export function DocumentForm({
  kind,
  defaultValues,
  clients,
  lockedClientLabel,
  statusOptions,
  submitLabel,
  isSubmitting,
  onSubmit,
  onCancel,
}: {
  kind: "quotes" | "invoices";
  defaultValues: DocumentFormValues;
  clients?: Client[];
  lockedClientLabel?: string;
  statusOptions?: string[];
  submitLabel: string;
  isSubmitting: boolean;
  onSubmit: (values: DocumentFormValues) => Promise<void>;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const form = useForm<DocumentFormValues>({
    resolver: zodResolver(buildSchema(t as Translate, !lockedClientLabel)),
    defaultValues,
  });
  const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });
  const watchedItems = useWatch({ control: form.control, name: "items" }) ?? [];
  const totals = computeTotals(
    watchedItems.map((item) => ({
      description: item?.description ?? "",
      quantity: Number(item?.quantity) || 0,
      unit_price: Number(item?.unit_price) || 0,
      vat_rate: Number(item?.vat_rate) || 0,
    })),
  );

  return (
    <Form {...form}>
      <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
        <section className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-7">
          {lockedClientLabel ? (
            <div>
              <p className="text-sm font-medium text-foreground">{t("common.client")}</p>
              <p className="mt-1.5 text-sm text-muted-foreground">{lockedClientLabel}</p>
              <p className="mt-1 text-xs text-muted-foreground">{t(`${kind}.clientLocked`)}</p>
            </div>
          ) : (
            <FormField
              control={form.control}
              name="client_id"
              render={({ field }) => (
                <FormItem className="max-w-md">
                  <FormLabel>{t(`${kind}.clientLabel`)}</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isSubmitting}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t(`${kind}.chooseClient`)} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(clients ?? []).map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {clientLabel(client)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </section>

        <section className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-7">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-foreground">{t("common.lines")}</h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={() => append({ ...emptyDocumentItem })}
            >
              <Plus /> {t("common.addLine")}
            </Button>
          </div>

          <div className="space-y-4">
            {fields.map((item, index) => {
              const row = watchedItems[index];
              const lineTotal =
                (Number(row?.quantity) || 0) *
                (Number(row?.unit_price) || 0) *
                (1 + (Number(row?.vat_rate) || 0) / 100);

              return (
                <div
                  key={item.id}
                  className="grid gap-4 rounded-lg border border-border p-4 sm:grid-cols-12"
                >
                  <FormField
                    control={form.control}
                    name={`items.${index}.description`}
                    render={({ field }) => (
                      <FormItem className="sm:col-span-5">
                        <FormLabel>{t("common.description")}</FormLabel>
                        <FormControl>
                          <Input disabled={isSubmitting} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`items.${index}.quantity`}
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>{t("common.quantity")}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            disabled={isSubmitting}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`items.${index}.unit_price`}
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>{t("common.price")}</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            disabled={isSubmitting}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name={`items.${index}.vat_rate`}
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>{t("common.vat")}</FormLabel>
                        <Select
                          value={String(field.value)}
                          onValueChange={(value) => field.onChange(Number(value))}
                          disabled={isSubmitting}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {VAT_RATES.map((rate) => (
                              <SelectItem key={rate} value={String(rate)}>
                                {rate}%
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex items-end justify-between gap-2 sm:col-span-1">
                    <div className="text-sm">
                      <p className="text-xs text-muted-foreground">{t("common.total")}</p>
                      <p className="font-medium text-foreground">{formatCurrency(lineTotal)}</p>
                    </div>
                  </div>
                  <div className="sm:col-span-12">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isSubmitting || fields.length === 1}
                      onClick={() => remove(index)}
                    >
                      <Trash2 /> {t("common.removeLine")}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {form.formState.errors.items?.root?.message && (
            <p className="mt-3 text-sm text-destructive">
              {form.formState.errors.items.root.message}
            </p>
          )}

          <dl className="mt-6 space-y-2 border-t border-border pt-5 text-sm sm:ml-auto sm:max-w-xs">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t("common.subtotal")}</dt>
              <dd className="font-medium text-foreground">{formatCurrency(totals.subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">{t("common.vat")}</dt>
              <dd className="font-medium text-foreground">{formatCurrency(totals.vat)}</dd>
            </div>
            <div className="flex justify-between border-t border-border pt-2 text-base">
              <dt className="font-semibold text-foreground">{t("common.total")}</dt>
              <dd className="font-semibold text-foreground">{formatCurrency(totals.total)}</dd>
            </div>
          </dl>
        </section>

        <section className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-7">
          <div className="grid gap-5 sm:grid-cols-2">
            {kind === "quotes" && (
              <FormField
                control={form.control}
                name="validity_days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("quotes.validity")}</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" max="365" disabled={isSubmitting} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            {statusOptions && statusOptions.length > 0 && (
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("common.status")}</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {statusOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {t(`status.${option}`, { defaultValue: option })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem className="sm:col-span-2">
                  <FormLabel>{t("common.notes")}</FormLabel>
                  <FormControl>
                    <Textarea rows={4} disabled={isSubmitting} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </section>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" disabled={isSubmitting} onClick={onCancel}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? t("common.busy") : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}

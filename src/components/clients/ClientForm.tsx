import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import type { ClientPayload } from "@/lib/clients";
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

type Translate = (key: string) => string;

const buildSchema = (t: Translate) =>
  z.object({
    name: z.string().trim().min(1, t("validation.nameRequired")),
    company_name: z.string(),
    email: z
      .string()
      .refine(
        (value) => !value || z.string().email().safeParse(value).success,
        t("validation.invalidEmail"),
      ),
    phone: z.string(),
    address: z.string(),
    postal_code: z.string(),
    city: z.string(),
    country: z.string(),
    notes: z.string(),
  });

const fields: Array<{
  name: Exclude<keyof ClientPayload, "notes">;
  type?: string;
  autoComplete?: string;
  full?: boolean;
}> = [
  { name: "name", autoComplete: "name" },
  { name: "company_name", autoComplete: "organization" },
  { name: "email", type: "email", autoComplete: "email" },
  { name: "phone", type: "tel", autoComplete: "tel" },
  { name: "address", autoComplete: "street-address", full: true },
  { name: "postal_code", autoComplete: "postal-code" },
  { name: "city", autoComplete: "address-level2" },
  { name: "country", autoComplete: "country-name", full: true },
];

export function ClientForm({
  defaultValues,
  submitLabel,
  isSubmitting,
  onSubmit,
  onCancel,
}: {
  defaultValues: ClientPayload;
  submitLabel: string;
  isSubmitting: boolean;
  onSubmit: (values: ClientPayload) => Promise<void>;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const form = useForm<ClientPayload>({
    resolver: zodResolver(buildSchema(t as Translate)),
    defaultValues,
  });

  return (
    <Form {...form}>
      <form
        className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-7"
        onSubmit={form.handleSubmit(onSubmit)}
      >
        <div className="grid gap-5 sm:grid-cols-2">
          {fields.map((item) => (
            <FormField
              key={item.name}
              control={form.control}
              name={item.name}
              render={({ field }) => (
                <FormItem className={item.full ? "sm:col-span-2" : undefined}>
                  <FormLabel>{t(`clients.fields.${item.name}`)}</FormLabel>
                  <FormControl>
                    <Input
                      type={item.type}
                      autoComplete={item.autoComplete}
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ))}
          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>{t("common.notes")}</FormLabel>
                <FormControl>
                  <Textarea rows={5} disabled={isSubmitting} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="mt-7 flex flex-col-reverse gap-2 border-t border-border pt-5 sm:flex-row sm:justify-end">
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

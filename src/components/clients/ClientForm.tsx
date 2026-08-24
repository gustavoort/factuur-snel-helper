import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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

const clientSchema = z.object({
  name: z.string().trim().min(1, "Naam is verplicht."),
  company_name: z.string(),
  email: z.string().refine((value) => !value || z.string().email().safeParse(value).success, "Vul een geldig e-mailadres in."),
  phone: z.string(),
  address: z.string(),
  postal_code: z.string(),
  city: z.string(),
  country: z.string(),
  notes: z.string(),
});

const fields: Array<{
  name: Exclude<keyof ClientPayload, "notes">;
  label: string;
  type?: string;
  autoComplete?: string;
  full?: boolean;
}> = [
  { name: "name", label: "Naam *", autoComplete: "name" },
  { name: "company_name", label: "Bedrijfsnaam", autoComplete: "organization" },
  { name: "email", label: "E-mailadres", type: "email", autoComplete: "email" },
  { name: "phone", label: "Telefoonnummer", type: "tel", autoComplete: "tel" },
  { name: "address", label: "Adres", autoComplete: "street-address", full: true },
  { name: "postal_code", label: "Postcode", autoComplete: "postal-code" },
  { name: "city", label: "Plaats", autoComplete: "address-level2" },
  { name: "country", label: "Land", autoComplete: "country-name", full: true },
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
  const form = useForm<ClientPayload>({
    resolver: zodResolver(clientSchema),
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
                  <FormLabel>{item.label}</FormLabel>
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
                <FormLabel>Notities</FormLabel>
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
            Annuleren
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Bezig…" : submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
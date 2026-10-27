import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { z } from "zod";
import { Upload, Trash2 } from "lucide-react";
import { getApiErrorMessage, isApiConfigured } from "@/lib/api";
import { currentSubscriptionQueryOptions } from "@/lib/subscription";
import {
  companyQueryOptions,
  emptyCompany,
  removeCompanyLogo,
  updateCompany,
  uploadCompanyLogo,
  type CompanyProfile,
} from "@/lib/company";
import { PageHeader } from "@/components/PageHeader";
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
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { pageMeta } from "@/i18n/head";

export const Route = createFileRoute("/_authenticated/company")({
  head: () => ({ meta: pageMeta("company.title", "company.description") }),
  component: CompanyPage,
});

type Translate = (key: string) => string;

const TEXT_FIELDS = [
  { name: "company_name", section: "general" },
  { name: "owner_name", section: "general" },
  { name: "address", section: "address" },
  { name: "postal_code", section: "address" },
  { name: "city", section: "address" },
  { name: "country", section: "address" },
  { name: "phone", section: "contact" },
  { name: "email", section: "contact", type: "email" },
  { name: "kvk_number", section: "fiscal" },
  { name: "btw_number", section: "fiscal" },
  { name: "iban", section: "fiscal" },
] as const;

const NUMBER_FIELDS = ["payment_terms", "default_vat_rate"] as const;

const buildSchema = (t: Translate) =>
  z.object({
    company_name: z.string(),
    owner_name: z.string(),
    logo_base64: z.string(),
    address: z.string(),
    postal_code: z.string(),
    city: z.string(),
    country: z.string(),
    phone: z.string(),
    email: z.union([z.literal(""), z.string().email(t("validation.invalidEmail"))]),
    kvk_number: z.string(),
    btw_number: z.string(),
    iban: z.string(),
    payment_terms: z.coerce
      .number<number>({ message: t("validation.numberInvalid") })
      .min(0)
      .max(365),
    default_vat_rate: z.coerce
      .number<number>({ message: t("validation.numberInvalid") })
      .min(0)
      .max(100),
  });

function CompanyPage() {
  const { t } = useTranslation();

  const { data, isPending, isError, error } = useQuery({
    ...companyQueryOptions(),
    enabled: isApiConfigured,
    retry: false,
  });
  const subscription = useQuery({
    ...currentSubscriptionQueryOptions(),
    enabled: isApiConfigured,
    retry: false,
  });
  const canUploadLogo = ["pro", "business"].includes(subscription.data?.plan.toLowerCase() ?? "");

  return (
    <>
      <PageHeader title={t("company.title")} description={t("company.description")} />

      {!isApiConfigured && (
        <div className="mb-6 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          {t("common.apiNotConfigured")}
        </div>
      )}
      {isError && (
        <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {getApiErrorMessage(error, t("company.loadFailed"))}
        </div>
      )}

      {isApiConfigured && isPending ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <CompanyEditor profile={data ?? emptyCompany} canUploadLogo={canUploadLogo} />
      )}
    </>
  );
}

function CompanyEditor({
  profile,
  canUploadLogo,
}: {
  profile: CompanyProfile;
  canUploadLogo: boolean;
}) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);

  const form = useForm<CompanyProfile>({
    resolver: zodResolver(buildSchema(t as Translate)),
    defaultValues: profile,
  });

  const save = useMutation({
    mutationFn: (values: CompanyProfile) => updateCompany(values),
    onSuccess: async () => {
      toast.success(t("company.saved"));
      await queryClient.invalidateQueries({ queryKey: ["company"] });
    },
    onError: (err) => toast.error(getApiErrorMessage(err, t("company.saveFailed"))),
  });

  const upload = useMutation({
    mutationFn: (file: File) => uploadCompanyLogo(file),
    onSuccess: async () => {
      toast.success(t("company.logoUploaded"));
      await queryClient.refetchQueries({ queryKey: ["company"] });
    },
    onError: (err) => toast.error(getApiErrorMessage(err, t("company.logoFailed"))),
  });

  const removeLogo = useMutation({
    mutationFn: () => removeCompanyLogo(profile),
    onSuccess: async () => {
      toast.success(t("company.logoRemoved"));
      await queryClient.refetchQueries({ queryKey: ["company"] });
    },
    onError: (err) => toast.error(getApiErrorMessage(err, t("company.logoRemoveFailed"))),
  });

  const sections = ["general", "address", "contact", "fiscal"] as const;

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-wrap items-center gap-5 p-5 sm:p-7">
          {profile.logo_base64 ? (
            <img
              src={
                profile.logo_base64.startsWith("data:")
                  ? profile.logo_base64
                  : `data:image/png;base64,${profile.logo_base64}`
              }
              alt={t("company.logoAlt")}
              className="h-16 w-auto max-w-40 rounded border border-border bg-background object-contain p-1"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded border border-dashed border-border text-xs text-muted-foreground">
              {t("company.logo")}
            </div>
          )}
          <div>
            {canUploadLogo ? (
              <Button
                type="button"
                variant="outline"
                disabled={upload.isPending}
                onClick={() => fileInput.current?.click()}
              >
                <Upload className="h-4 w-4" />
                {upload.isPending ? t("company.logoUploading") : t("company.logoUpload")}
              </Button>
            ) : (
              <Button asChild variant="outline">
                <Link to="/billing">
                  <Upload className="h-4 w-4" />
                  {t("billing.upgrade")}
                </Link>
              </Button>
            )}
            {profile.logo_base64 ? (
              <Button
                type="button"
                variant="ghost"
                className="ml-2"
                disabled={removeLogo.isPending}
                onClick={() => removeLogo.mutate()}
              >
                <Trash2 className="h-4 w-4" />
                {t("company.logoRemove")}
              </Button>
            ) : null}
            <p className="mt-2 text-xs text-muted-foreground">{t("company.logoHint")}</p>
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) upload.mutate(file);
            }}
          />
        </CardContent>
      </Card>

      <Form {...form}>
        <form
          className="space-y-6"
          onSubmit={form.handleSubmit(async (values) => {
            await save.mutateAsync(values).catch(() => undefined);
          })}
        >
          {sections.map((section) => (
            <section
              key={section}
              className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-7"
            >
              <h2 className="mb-4 font-semibold text-foreground">
                {t(`company.sections.${section}`)}
              </h2>
              <div className="grid gap-5 sm:grid-cols-2">
                {TEXT_FIELDS.filter((field) => field.section === section).map((field) => (
                  <FormField
                    key={field.name}
                    control={form.control}
                    name={field.name}
                    render={({ field: input }) => (
                      <FormItem>
                        <FormLabel>{t(`company.fields.${field.name}`)}</FormLabel>
                        <FormControl>
                          <Input
                            type={"type" in field ? field.type : "text"}
                            disabled={save.isPending}
                            {...input}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
                {section === "fiscal" &&
                  NUMBER_FIELDS.map((name) => (
                    <FormField
                      key={name}
                      control={form.control}
                      name={name}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t(`company.fields.${name}`)}</FormLabel>
                          <FormControl>
                            <Input type="number" min="0" disabled={save.isPending} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  ))}
              </div>
            </section>
          ))}

          <div className="flex justify-end">
            <Button type="submit" disabled={save.isPending}>
              {save.isPending ? t("common.busy") : t("common.save")}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

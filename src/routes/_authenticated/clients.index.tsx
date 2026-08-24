import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Plus, Search, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getApiErrorMessage, isApiConfigured } from "@/lib/api";
import { clientsQueryOptions, deleteClient, type Client } from "@/lib/clients";
import { PageHeader, EmptyState } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { pageMeta } from "@/i18n/head";

export const Route = createFileRoute("/_authenticated/clients/")({
  head: () => ({ meta: pageMeta("clients.title", "clients.metaDescription") }),
  component: ClientsPage,
});

function ClientsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<Client | null>(null);

  const { data, isPending, isError, error } = useQuery({
    ...clientsQueryOptions(),
    enabled: isApiConfigured,
    retry: false,
  });

  const remove = useMutation({
    mutationFn: (client: Client) => deleteClient(client.id),
    onSuccess: async () => {
      toast.success(t("clients.deleted"));
      setPending(null);
      await queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (err) => toast.error(getApiErrorMessage(err, t("clients.deleteFailed"))),
  });

  const clients = data ?? [];
  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return clients;
    return clients.filter((client) =>
      [client.name, client.company_name, client.email, client.city]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(term)),
    );
  }, [clients, query]);

  return (
    <>
      <PageHeader
        title={t("clients.title")}
        description={t("clients.description")}
        actions={
          <Button asChild>
            <Link to="/clients/new">
              <Plus className="h-4 w-4" /> {t("clients.new")}
            </Link>
          </Button>
        }
      />

      {!isApiConfigured && (
        <div className="mb-6 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          {t("common.apiNotConfigured")}
        </div>
      )}

      {isError && (
        <div className="mb-6 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {getApiErrorMessage(error, t("clients.loadFailed"))}
        </div>
      )}

      {clients.length > 0 && (
        <div className="relative mb-5 max-w-md">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label={t("clients.searchLabel")}
            placeholder={t("clients.searchPlaceholder")}
            className="pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      )}

      {isApiConfigured && isPending ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : clients.length === 0 ? (
        <EmptyState title={t("clients.emptyTitle")} description={t("clients.emptyHint")} />
      ) : filtered.length === 0 ? (
        <EmptyState title={t("clients.noResults")} description={t("clients.noResultsHint")} />
      ) : (
        <Card>
          <CardContent className="divide-y divide-border p-0">
            {filtered.map((client) => (
              <div
                key={client.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {client.company_name || client.name || t("common.unknownClient")}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[client.name, client.email, client.city].filter(Boolean).join(" · ") ||
                      t("common.dash")}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      void navigate({ to: "/clients/$id/edit", params: { id: client.id } })
                    }
                  >
                    <Pencil className="h-4 w-4" /> {t("common.edit")}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setPending(client)}>
                    <Trash2 className="h-4 w-4" /> {t("common.delete")}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("clients.deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("clients.deleteDescription", {
                name: pending?.company_name || pending?.name || t("common.unknownClient"),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={remove.isPending}
              onClick={(e) => {
                e.preventDefault();
                if (pending) remove.mutate(pending);
              }}
            >
              {remove.isPending ? t("common.deleting") : t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

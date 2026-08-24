import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Building2, Mail, MapPin, Pencil, Phone, Plus, Search, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { clientsQueryOptions, deleteClient, type Client } from "@/lib/clients";
import { getApiErrorMessage } from "@/lib/api";

export const Route = createFileRoute("/_authenticated/clients/")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search["q"] === "string" ? search["q"] : "",
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(clientsQueryOptions()),
  head: () => ({
    meta: [
      { title: "Klanten — FactuurSnel" },
      { name: "description", content: "Beheer je klanten." },
      { property: "og:title", content: "Klanten — FactuurSnel" },
      { property: "og:description", content: "Beheer je klanten." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  pendingComponent: ClientsLoading,
  errorComponent: ClientsError,
  notFoundComponent: () => <ClientsEmpty />,
  component: ClientsPage,
});

function ClientsPage() {
  const { data: clients } = useSuspenseQuery(clientsQueryOptions());
  const { q } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const normalizedQuery = q.trim().toLocaleLowerCase("nl-NL");
  const filteredClients = normalizedQuery
    ? clients.filter((client) =>
        [client.name, client.company_name, client.email, client.city].some((value) =>
          value.toLocaleLowerCase("nl-NL").includes(normalizedQuery),
        ),
      )
    : clients;

  return (
    <>
      <PageHeader
        title="Klanten"
        description="Beheer uw klantgegevens voor offertes en facturen."
        actions={
          <Button asChild>
            <Link to="/clients/new">
              <Plus /> Nieuwe klant
            </Link>
          </Button>
        }
      />

      {clients.length === 0 ? (
        <ClientsEmpty />
      ) : (
        <>
          <div className="relative mb-5 max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              aria-label="Klanten zoeken"
              placeholder="Zoek op naam, bedrijf, e-mail of plaats"
              className="pl-9"
              value={q}
              onChange={(event) => {
                void navigate({ search: { q: event.target.value }, replace: true });
              }}
            />
          </div>

          {filteredClients.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border px-6 py-12 text-center">
              <p className="font-medium text-foreground">Geen klanten gevonden</p>
              <p className="mt-1 text-sm text-muted-foreground">Probeer een andere zoekterm.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {filteredClients.map((client) => (
                <ClientRow key={client.id} client={client} />
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}

function ClientRow({ client }: { client: Client }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => deleteClient(client.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Klant succesvol verwijderd");
    },
    onError: (error) => toast.error(getApiErrorMessage(error, "Klant verwijderen is mislukt.")),
  });

  const location = [client.postal_code, client.city].filter(Boolean).join(" ");

  return (
    <article className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="truncate font-semibold text-foreground">{client.name}</h2>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            {client.company_name && (
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="h-4 w-4" />
                {client.company_name}
              </span>
            )}
            {client.email && (
              <a
                className="inline-flex items-center gap-1.5 hover:text-foreground"
                href={`mailto:${client.email}`}
              >
                <Mail className="h-4 w-4" />
                {client.email}
              </a>
            )}
            {client.phone && (
              <a
                className="inline-flex items-center gap-1.5 hover:text-foreground"
                href={`tel:${client.phone}`}
              >
                <Phone className="h-4 w-4" />
                {client.phone}
              </a>
            )}
            {location && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {location}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/clients/$id/edit" params={{ id: client.id }}>
              <Pencil /> Bewerken
            </Link>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" disabled={mutation.isPending}>
                <Trash2 /> Verwijderen
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Klant verwijderen?</AlertDialogTitle>
                <AlertDialogDescription>
                  Weet u zeker dat u {client.name} wilt verwijderen? Deze actie kan niet ongedaan
                  worden gemaakt.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={mutation.isPending}>Annuleren</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  disabled={mutation.isPending}
                  onClick={() => mutation.mutate()}
                >
                  {mutation.isPending ? "Verwijderen…" : "Klant verwijderen"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </article>
  );
}

function ClientsEmpty() {
  return (
    <div className="rounded-lg border border-dashed border-border px-6 py-14 text-center">
      <Users className="mx-auto h-8 w-8 text-muted-foreground" />
      <h2 className="mt-4 font-semibold text-foreground">Nog geen klanten</h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        Voeg uw eerste klant toe om offertes en facturen te kunnen maken.
      </p>
      <Button asChild className="mt-5">
        <Link to="/clients/new">
          <Plus /> Eerste klant toevoegen
        </Link>
      </Button>
    </div>
  );
}

function ClientsLoading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-16 w-full" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-28 w-full" />
    </div>
  );
}

function ClientsError({ error }: { error: Error }) {
  const router = useRouter();
  return (
    <div role="alert" className="rounded-lg border border-destructive/30 bg-card p-6">
      <h1 className="font-semibold text-foreground">Klanten konden niet worden geladen</h1>
      <p className="mt-1 text-sm text-destructive">{getApiErrorMessage(error)}</p>
      <Button className="mt-4" variant="outline" onClick={() => void router.invalidate()}>
        Opnieuw proberen
      </Button>
    </div>
  );
}

# Klanten-module implementeren

## Doel
De bestaande placeholder-routes voor klanten vervangen door een volledig Nederlandstalig CRUD dat uitsluitend de bestaande Railway/FastAPI API gebruikt.

## Aanpak
- Een gedeelde client-APIlaag toevoegen met DTO-normalisatie voor de werkelijk gedocumenteerde velden en responsevormen, plus Query-opties voor lijst en detail.
- `/clients` bouwen met servercache via TanStack Query, frontend-zoekfunctie op naam, bedrijfsnaam, e-mail en plaats, loading/error/lege staten en responsieve klantweergave.
- Create/update/delete via `useMutation` uitvoeren, dubbele acties blokkeren, API-`detail` tonen, relevante Query-caches invalideren en Nederlandse success-toasts tonen.
- `/clients/new` en `/clients/$id/edit` bouwen rond één herbruikbaar formulier met alle door `ClientCreate` ondersteunde velden; edit haalt eerst `GET /api/clients/{id}` op.
- Verwijderen beveiligen met een duidelijke bevestigingsdialoog.
- De huidige index-route controleren/valideren zodat de verouderde `titulo`-runtimefout niet terugkomt; er is in de actuele bron geen `titulo`-referentie.

## Technische details
- Endpoints: `GET/POST /api/clients`, `GET/PUT/DELETE /api/clients/{client_id}`.
- FastAPI OpenAPI bevestigt `client_id` als string en exact deze payloadvelden: `name`, `company_name`, `email`, `phone`, `address`, `postal_code`, `city`, `country`, `notes`; alleen `name` is verplicht.
- Geen backend-, database-, auth- of globale layoutwijzigingen.
- URL-zoekstatus wordt met `validateSearch` en TanStack Router beheerd; initiële reads gebruiken loader + `ensureQueryData` en component + `useSuspenseQuery`.
- Na implementatie controleren we buildstatus en de publieke/runtimeweergave; volledig ingelogde CRUD-verificatie hangt af van een beschikbare bestaande sessie.

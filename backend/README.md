# Backend

This directory contains the FastAPI backend required by the SaaS so the official repository no longer depends on the legacy repository for source code.

## Runtime

The API is exposed under `/api` and is consumed by the TanStack frontend through the production same-origin proxy.

Main components:

- `server.py` — base FastAPI application and API contracts
- `patch_server.py` — deterministic production patch for real transactional email and recurring Stripe billing/webhooks
- `requirements.txt` — Python dependencies
- `Dockerfile` — reference container build
- `.env.example` — required variable names only

## Required environment variable names

- `APP_ENV`
- `MONGO_URL`
- `DB_NAME`
- `JWT_SECRET`
- `FRONTEND_URL`
- `CORS_ORIGINS`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

Final email setup also uses:

- `RESEND_API_KEY`
- `EMAIL_FROM`

Never commit real secret values.

## Production patch

The current production behavior originated from the legacy backend build where `patch_server.py` is applied before startup. The patch replaces mocked email flows with Resend calls and upgrades Stripe billing to recurring subscriptions plus webhook processing.

Before changing Railway to use this repository, validate that the build applies `patch_server.py` and that the resulting service starts successfully with the existing environment.

## Railway migration rule

The existing production backend must remain untouched until this consolidated backend has been validated. After validation, Railway should use this repository, branch `main`, root `/backend`. Do not create a second permanent backend codebase.

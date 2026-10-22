# Backend

This directory contains the FastAPI backend required by the SaaS so the official repository no longer depends on the legacy repository for source code.

## Runtime

The API is exposed under `/api` and is consumed by the TanStack frontend through the production same-origin proxy.

Main components:

- `server.py` — base FastAPI application and API contracts
- `patch_server.py` — deterministic production patch for real transactional email and recurring Stripe billing/webhooks
- `requirements.txt` — Python dependencies
- `Dockerfile` — production container build, including WeasyPrint system libraries and deterministic patches
- `railway.json` — instructs Railway to use the Dockerfile and start Uvicorn on the platform port
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

The existing Railway service is configured to source this repository at `/backend`. Its previous RAILPACK setting could skip the Dockerfile and therefore the production patch. `railway.json` now explicitly selects the Dockerfile; verify the new deployment build logs show Dockerfile execution and that the service starts successfully. The change is not proof of a successful deployment.

## Railway migration rule

Keep the existing Railway service, its environment variables and domain. Its Git source is already `gustavoort/factuur-snel-helper`, branch `main`, root `/backend`. Do not create a second permanent backend codebase. A fresh deployment and end-to-end validation are still required.

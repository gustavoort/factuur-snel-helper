from pathlib import Path
import re
import html

path = Path("server.py")
source = path.read_text(encoding="utf-8")

# Idempotency: each deploy starts from a clean checkout, but keep this safe.
if "# ============ EMAIL (REAL) ============" in source and 'É necessário concluir o pagamento no Stripe para ativar o novo plano.' in source and 'and not obj.get("pending_update")' in source and '@api_router.post("/stripe/webhook")' in source and '@api_router.post("/webhook/stripe")' in source and '"paid": transaction.get("payment_status") == "paid"' in source and "html_lib.escape" in source and "request_origin_value in configured_origins" in source and "def effective_plan(user: dict)" in source and 'require_plan(user, "business")' in source and 'O Stripe ainda não disponibilizou a página de pagamento desta alteração.' in source and 'event_type == "invoice.paid"' in source:
    print("server.py already patched")
    raise SystemExit(0)

# --- Imports and environment ---
if "import httpx\n" not in source:
    source = source.replace("import stripe\n", "import stripe\nimport httpx\n", 1)

if "import html as html_lib\n" not in source:
    source = source.replace("import stripe\n", "import stripe\nimport html as html_lib\n", 1)

old_env = '''STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY")
if not STRIPE_SECRET_KEY:
    raise RuntimeError("STRIPE_SECRET_KEY não configurada")

JWT_SECRET = os.environ.get("JWT_SECRET")'''
new_env = '''STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY")
if not STRIPE_SECRET_KEY:
    raise RuntimeError("STRIPE_SECRET_KEY não configurada")

STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "")
EMAIL_FROM = os.environ.get("EMAIL_FROM", "Faktuvi <onboarding@resend.dev>")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000").rstrip("/")

JWT_SECRET = os.environ.get("JWT_SECRET")'''
if old_env not in source:
    raise RuntimeError("Environment block not found")
source = source.replace(old_env, new_env, 1)

# --- Shared email helper ---
helper_marker = "# ============ AUTH ROUTES ============"
email_helper = r'''
async def send_transactional_email(
    to_email: str,
    subject: str,
    html: str,
    attachments: Optional[List[dict]] = None,
) -> None:
    if not RESEND_API_KEY:
        raise HTTPException(status_code=503, detail="E-mailservice is nog niet geconfigureerd")

    payload = {
        "from": EMAIL_FROM,
        "to": [to_email],
        "subject": subject,
        "html": html,
    }
    if attachments:
        payload["attachments"] = attachments

    try:
        async with httpx.AsyncClient(timeout=30.0) as http_client:
            response = await http_client.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {RESEND_API_KEY}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
        if response.status_code >= 400:
            logger.error("Resend error %s: %s", response.status_code, response.text[:500])
            raise HTTPException(status_code=502, detail="E-mail kon niet worden verzonden")
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("E-mail provider error: %s", exc)
        raise HTTPException(status_code=502, detail="E-mail kon niet worden verzonden")


def pdf_attachment(filename: str, pdf_bytes: bytes) -> dict:
    return {
        "filename": filename,
        "content": base64.b64encode(pdf_bytes).decode("utf-8"),
    }


'''
if helper_marker not in source:
    raise RuntimeError("Auth marker not found")
source = source.replace(helper_marker, email_helper + helper_marker, 1)

# --- Password reset: real email ---
old_reset = '''    logger.info(f"[MOCK EMAIL] Password reset link for {email}: /reset-password?token={token}")
    return {"message": "Als dit e-mailadres bestaat, ontvangt u een reset link"}'''
new_reset = '''    reset_url = f"{FRONTEND_URL}/reset-password?token={quote(token)}"
    await send_transactional_email(
        email,
        "Wachtwoord opnieuw instellen - Faktuvi",
        f"""
        <p>U heeft gevraagd om uw Faktuvi-wachtwoord opnieuw in te stellen.</p>
        <p><a href=\"{reset_url}\">Klik hier om een nieuw wachtwoord in te stellen</a>.</p>
        <p>Deze link is 1 uur geldig. Heeft u dit niet aangevraagd, dan kunt u dit bericht negeren.</p>
        """,
    )
    return {"message": "Als dit e-mailadres bestaat, ontvangt u een reset link"}'''
if old_reset not in source:
    raise RuntimeError("Mock password-reset block not found")
source = source.replace(old_reset, new_reset, 1)

# --- Password reset abuse protection: cap active reset links per account ---
old_reset_limit = '''    if not user:
        return {"message": "Als dit e-mailadres bestaat, ontvangt u een reset link"}

    token = secrets.token_urlsafe(32)'''
new_reset_limit = '''    if not user:
        return {"message": "Als dit e-mailadres bestaat, ontvangt u een reset link"}

    now = datetime.now(timezone.utc)
    active_reset_count = await db.password_reset_tokens.count_documents({
        "user_id": str(user["_id"]),
        "used": False,
        "expires_at": {"$gte": now},
    })
    if active_reset_count >= 3:
        return {"message": "Als dit e-mailadres bestaat, ontvangt u een reset link"}

    token = secrets.token_urlsafe(32)'''
if old_reset_limit not in source:
    raise RuntimeError("Password reset rate-limit insertion point not found")
source = source.replace(old_reset_limit, new_reset_limit, 1)

# --- Password reset token: atomic single-use consumption ---
old_reset_consume = '''    reset = await db.password_reset_tokens.find_one({"token": data.token, "used": False})
    if not reset:
        raise HTTPException(status_code=400, detail="Ongeldige of verlopen token")

    expires_at = reset["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Token is verlopen")'''
new_reset_consume = '''    reset = await db.password_reset_tokens.find_one_and_update(
        {"token": data.token, "used": False},
        {"$set": {"used": True, "used_at": datetime.now(timezone.utc)}},
        return_document=ReturnDocument.BEFORE,
    )
    if not reset:
        raise HTTPException(status_code=400, detail="Ongeldige of verlopen token")

    expires_at = reset["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    else:
        expires_at = expires_at.astimezone(timezone.utc)
    if expires_at <= datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Token is verlopen")'''
if old_reset_consume not in source:
    raise RuntimeError("Password reset consume block not found")
source = source.replace(old_reset_consume, new_reset_consume, 1)

old_mark_used = '''    await db.password_reset_tokens.update_one(
        {"token": data.token},
        {"$set": {"used": True}}
    )

'''
if old_mark_used not in source:
    raise RuntimeError("Password reset used-token update not found")
source = source.replace(old_mark_used, "", 1)

# --- Replace mocked quote/invoice email routes ---
email_start = source.index("# ============ EMAIL (MOCKED) ============")
email_end = source.index("# ============ WHATSAPP SHARING ============", email_start)
real_email_section = r'''# ============ EMAIL (REAL) ============

@api_router.post("/quotes/{quote_id}/send-email")
async def send_quote_email(quote_id: str, request: Request):
    user = await get_current_user(request)
    quote_obj_id = parse_object_id(quote_id, "quote_id")
    quote_doc = await db.quotes.find_one({"_id": quote_obj_id, "user_id": user["_id"]})
    if not quote_doc:
        raise HTTPException(status_code=404, detail="Offerte niet gevonden")

    client_id = quote_doc.get("client_id")
    if not client_id or not ObjectId.is_valid(client_id):
        raise HTTPException(status_code=400, detail="Ongeldige klant gekoppeld aan offerte")

    client_doc = await db.clients.find_one({"_id": ObjectId(client_id), "user_id": user["_id"]})
    if not client_doc or not client_doc.get("email"):
        raise HTTPException(status_code=400, detail="Klant heeft geen e-mailadres")

    company = await db.companies.find_one({"user_id": user["_id"]}) or {}
    company_name = company.get("company_name") or "Faktuvi"
    html_content = generate_pdf_html("quote", quote_doc, company, client_doc)
    pdf = HTML(string=html_content).write_pdf()
    quote_number = quote_doc.get("quote_number", quote_id)

    await send_transactional_email(
        client_doc["email"],
        f"Offerte {quote_number} - {company_name}",
        f"""
        <p>Beste {client_doc.get('name', '')},</p>
        <p>Hierbij ontvangt u offerte <strong>{quote_number}</strong> van {company_name}.</p>
        <p>Totaalbedrag: <strong>€{quote_doc.get('total', 0):.2f}</strong></p>
        <p>De offerte vindt u als PDF in de bijlage.</p>
        <p>Met vriendelijke groet,<br>{company_name}</p>
        """,
        [pdf_attachment(f"offerte-{quote_number}.pdf", pdf)],
    )

    await db.quotes.update_one(
        {"_id": quote_obj_id, "user_id": user["_id"]},
        {"$set": {"status": "sent", "sent_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": f"Offerte verzonden naar {client_doc['email']}"}


@api_router.post("/invoices/{invoice_id}/send-email")
async def send_invoice_email(invoice_id: str, request: Request):
    user = await get_current_user(request)
    invoice_obj_id = parse_object_id(invoice_id, "invoice_id")
    invoice_doc = await db.invoices.find_one({"_id": invoice_obj_id, "user_id": user["_id"]})
    if not invoice_doc:
        raise HTTPException(status_code=404, detail="Factuur niet gevonden")

    client_id = invoice_doc.get("client_id")
    if not client_id or not ObjectId.is_valid(client_id):
        raise HTTPException(status_code=400, detail="Ongeldige klant gekoppeld aan factuur")

    client_doc = await db.clients.find_one({"_id": ObjectId(client_id), "user_id": user["_id"]})
    if not client_doc or not client_doc.get("email"):
        raise HTTPException(status_code=400, detail="Klant heeft geen e-mailadres")

    company = await db.companies.find_one({"user_id": user["_id"]}) or {}
    company_name = company.get("company_name") or "Faktuvi"
    html_content = generate_pdf_html("invoice", invoice_doc, company, client_doc)
    pdf = HTML(string=html_content).write_pdf()
    invoice_number = invoice_doc.get("invoice_number", invoice_id)

    await send_transactional_email(
        client_doc["email"],
        f"Factuur {invoice_number} - {company_name}",
        f"""
        <p>Beste {client_doc.get('name', '')},</p>
        <p>Hierbij ontvangt u factuur <strong>{invoice_number}</strong> van {company_name}.</p>
        <p>Totaalbedrag: <strong>€{invoice_doc.get('total', 0):.2f}</strong></p>
        <p>De factuur vindt u als PDF in de bijlage.</p>
        <p>Met vriendelijke groet,<br>{company_name}</p>
        """,
        [pdf_attachment(f"factuur-{invoice_number}.pdf", pdf)],
    )

    await db.invoices.update_one(
        {"_id": invoice_obj_id, "user_id": user["_id"]},
        {"$set": {"status": "sent", "sent_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": f"Factuur verzonden naar {client_doc['email']}"}


'''
source = source[:email_start] + real_email_section + source[email_end:]

# --- Replace Stripe billing section ---
stripe_start = source.index("# ============ STRIPE PAYMENTS ============")
stripe_end = source.index("# ============ DASHBOARD ============", stripe_start)
stripe_section = r'''# ============ STRIPE PAYMENTS ============

SUBSCRIPTION_PLANS = {
    "free": {"name": "Gratis", "price": 0.0, "features": ["5 offertes/maand", "5 facturen/maand", "Basis functies"]},
    "pro": {"name": "Pro", "price": 9.99, "features": ["Onbeperkt offertes", "Onbeperkt facturen", "Logo upload", "PDF branding", "Email verzenden"]},
    "business": {"name": "Business", "price": 24.99, "features": ["Alles in Pro", "Betaallinks (Stripe)"]}
}

PAID_PLAN_AMOUNTS = {"pro": 999, "business": 2499}
PLAN_ALIASES = {"gratis": "free", "free": "free", "pro": "pro", "business": "business"}

PLAN_RANK = {"free": 0, "pro": 1, "business": 2}
ACTIVE_SUBSCRIPTION_STATUSES = {"active", "trialing", "cancel_at_period_end"}


def effective_plan(user: dict) -> str:
    plan = normalize_plan(user.get("subscription", "free"))
    if plan not in PLAN_RANK:
        return "free"
    if plan == "free":
        return "free"

    # Paid entitlements must be backed by an explicit active status and a
    # Stripe subscription ID. Missing or unknown billing state fails closed.
    status = str(user.get("subscription_status") or "").lower()
    subscription_id = user.get("stripe_subscription_id")
    if status not in ACTIVE_SUBSCRIPTION_STATUSES or not subscription_id:
        return "free"
    return plan


def require_plan(user: dict, required_plan: str) -> None:
    current = effective_plan(user)
    if PLAN_RANK.get(current, 0) < PLAN_RANK[required_plan]:
        raise HTTPException(
            status_code=403,
            detail=f"Deze functie vereist het {required_plan.capitalize()}-abonnement.",
        )


async def enforce_free_monthly_limit(user: dict, collection, document_label: str) -> None:
    if effective_plan(user) != "free":
        return
    month_start = datetime.now(timezone.utc).replace(
        day=1, hour=0, minute=0, second=0, microsecond=0
    )
    count = await collection.count_documents({
        "user_id": user["_id"],
        "created_at": {"$gte": month_start.isoformat()},
    })
    if count >= 5:
        raise HTTPException(
            status_code=403,
            detail=f"Limiet bereikt. Upgrade naar Pro voor onbeperkte {document_label}.",
        )


def normalize_plan(value: str) -> str:
    normalized = (value or "").strip().lower()
    return PLAN_ALIASES.get(normalized, normalized)


def request_origin(request: Request) -> str:
    # Never build Stripe return URLs from an arbitrary Origin header.
    configured_frontend = (FRONTEND_URL or "").rstrip("/")
    configured_origins = {
        value.strip().rstrip("/")
        for value in os.environ.get("CORS_ORIGINS", "").split(",")
        if value.strip()
    }
    if configured_frontend:
        configured_origins.add(configured_frontend)

    request_origin_value = (request.headers.get("origin") or "").rstrip("/")
    if request_origin_value in configured_origins:
        return request_origin_value
    return configured_frontend


@api_router.get("/subscription/plans")
async def get_subscription_plans():
    return SUBSCRIPTION_PLANS


@api_router.get("/subscription/current")
async def get_current_subscription(request: Request):
    user = await get_current_user(request)
    subscription = user.get("subscription", "free")
    return {
        "plan": subscription,
        "status": user.get("subscription_status", "active" if subscription != "free" else "free"),
        "details": SUBSCRIPTION_PLANS.get(subscription, SUBSCRIPTION_PLANS["free"])
    }


@api_router.post("/subscription/checkout")
async def create_subscription_checkout(data: SubscriptionPlan, request: Request):
    user = await get_current_user(request)
    plan = normalize_plan(data.plan)
    origin = request_origin(request)

    if plan == "free":
        subscription_id = user.get("stripe_subscription_id")
        if subscription_id:
            try:
                subscription = stripe.Subscription.retrieve(subscription_id)
                customer_id = subscription.get("customer")
                if isinstance(customer_id, dict):
                    customer_id = customer_id.get("id")
                if not customer_id:
                    raise HTTPException(status_code=409, detail="Não foi possível identificar o cliente Stripe.")
                portal = stripe.billing_portal.Session.create(
                    customer=customer_id,
                    return_url=f"{origin}/billing",
                )
                return {"url": portal.url, "message": "Gerencie ou cancele a subscrição diretamente no Stripe."}
            except HTTPException:
                raise
            except stripe.error.StripeError as exc:
                logger.exception("Stripe billing portal error: %s", exc)
                raise HTTPException(status_code=502, detail="Não foi possível abrir o portal de subscrição Stripe.")
        await db.users.update_one(
            {"_id": parse_object_id(user["_id"], "user_id")},
            {"$set": {"subscription": "free", "subscription_status": "free"}}
        )
        return {"url": f"{origin}/billing", "message": "Plano gratuito ativo"}

    if plan not in PAID_PLAN_AMOUNTS:
        raise HTTPException(status_code=400, detail="Ongeldig plan. Kies free, pro of business.")

    # Existing subscriptions are never modified by this endpoint. Use Stripe's
    # hosted Billing Portal for plan changes/cancellation; this avoids silent
    # price creation, proration charges, and duplicate subscriptions.
    existing_subscription_id = user.get("stripe_subscription_id")
    existing_status = str(user.get("subscription_status") or "").lower()
    if existing_subscription_id and existing_status not in {"canceled", "incomplete_expired", "free"}:
        try:
            current_subscription = stripe.Subscription.retrieve(existing_subscription_id)
            customer_id = current_subscription.get("customer")
            if isinstance(customer_id, dict):
                customer_id = customer_id.get("id")
            if not customer_id:
                raise HTTPException(status_code=409, detail="Não foi possível identificar o cliente Stripe.")
            portal = stripe.billing_portal.Session.create(
                customer=customer_id,
                return_url=f"{origin}/billing",
            )
            return {
                "url": portal.url,
                "message": "Continue no portal seguro do Stripe para gerir ou alterar a subscrição.",
            }
        except HTTPException:
            raise
        except stripe.error.StripeError as exc:
            logger.exception("Stripe billing portal error: %s", exc)
            raise HTTPException(status_code=502, detail="Não foi possível abrir o portal Stripe. A subscrição atual não foi alterada.")

    if existing_subscription_id and existing_status in {"canceled", "incomplete_expired"}:
        # A canceled subscription may be replaced with a new Checkout session.
        pass

    # If local linkage is missing but Stripe already has an active subscription
    # for this customer, stop rather than silently creating a duplicate.
    if not existing_subscription_id and user.get("stripe_customer_id"):
        try:
            customer_subscriptions = stripe.Subscription.list(
                customer=user["stripe_customer_id"],
                status="active",
                limit=10,
            )
            owned_active = [
                item for item in customer_subscriptions.get("data", [])
                if str((item.get("metadata") or {}).get("user_id", "")) == str(user["_id"])
            ]
            if owned_active:
                logger.warning(
                    "Checkout blocked for user %s: active Stripe subscription exists but local linkage is missing",
                    user["_id"],
                )
                raise HTTPException(
                    status_code=409,
                    detail="Já existe uma subscrição ativa no Stripe, mas a ligação à conta precisa de ser reconciliada. Não foi criada uma nova cobrança.",
                )
        except HTTPException:
            raise
        except stripe.error.StripeError as exc:
            logger.exception("Stripe duplicate-subscription check failed: %s", exc)
            raise HTTPException(status_code=502, detail="Não foi possível verificar a subscrição existente. Nenhuma nova cobrança foi criada.")

    try:
        session_kwargs = {
            "mode": "subscription",
            "success_url": f"{origin}/payment-success?session_id={{CHECKOUT_SESSION_ID}}",
            "cancel_url": f"{origin}/billing",
            "line_items": [
                {
                    "price_data": {
                        "currency": "eur",
                        "product_data": {"name": f"Faktuvi {SUBSCRIPTION_PLANS[plan]['name']}"},
                        "unit_amount": PAID_PLAN_AMOUNTS[plan],
                        "recurring": {"interval": "month"},
                    },
                    "quantity": 1,
                }
            ],
            "metadata": {"user_id": str(user["_id"]), "plan": plan, "type": "subscription"},
            "subscription_data": {"metadata": {"user_id": str(user["_id"]), "plan": plan, "type": "subscription"}},
        }
        if user.get("stripe_customer_id"):
            session_kwargs["customer"] = user["stripe_customer_id"]
        else:
            session_kwargs["customer_email"] = user.get("email")

        session = stripe.checkout.Session.create(**session_kwargs)
    except stripe.error.StripeError as exc:
        logger.exception("Stripe checkout error: %s", exc)
        raise HTTPException(status_code=502, detail="Stripe checkout kon niet worden gestart")

    await db.payment_transactions.update_one(
        {"session_id": session.id},
        {"$set": {
            "user_id": user["_id"],
            "session_id": session.id,
            "plan": plan,
            "type": "subscription",
            "payment_status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )
    return {"url": session.url}


@api_router.post("/invoices/{invoice_id}/payment-link")
async def create_invoice_payment_link(invoice_id: str, request: Request):
    user = await get_current_user(request)
    if user.get("subscription") != "business":
        raise HTTPException(status_code=403, detail="Business nodig")

    invoice_obj_id = parse_object_id(invoice_id, "invoice_id")
    invoice = await db.invoices.find_one({"_id": invoice_obj_id, "user_id": user["_id"]})
    if not invoice:
        raise HTTPException(status_code=404, detail="Factuur niet gevonden")
    if invoice.get("status") == "paid":
        raise HTTPException(status_code=400, detail="Factuur is al betaald")

    origin = request_origin(request)
    try:
        session = stripe.checkout.Session.create(
            mode="payment",
            success_url=f"{origin}/payment-success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{origin}/invoices/{invoice_id}",
            line_items=[{
                "price_data": {
                    "currency": "eur",
                    "product_data": {"name": f"Factuur {invoice['invoice_number']}"},
                    "unit_amount": int(round(invoice["total"] * 100)),
                },
                "quantity": 1,
            }],
            metadata={
                "invoice_id": invoice_id,
                "user_id": str(user["_id"]),
                "type": "invoice_payment",
            },
        )
    except stripe.error.StripeError as exc:
        logger.exception("Stripe invoice checkout error: %s", exc)
        raise HTTPException(status_code=502, detail="Betaallink kon niet worden aangemaakt")

    await db.payment_transactions.update_one(
        {"session_id": session.id},
        {"$set": {
            "user_id": user["_id"],
            "invoice_id": invoice_id,
            "session_id": session.id,
            "type": "invoice_payment",
            "payment_status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat(),
        }},
        upsert=True,
    )
    await db.invoices.update_one(
        {"_id": invoice_obj_id, "user_id": user["_id"]},
        {"$set": {"payment_link": session.url, "payment_session_id": session.id}}
    )
    return {"url": session.url}


async def apply_paid_checkout(session) -> None:
    metadata = session.get("metadata") or {}
    checkout_type = metadata.get("type")

    if checkout_type == "subscription":
        user_id = metadata.get("user_id")
        plan = normalize_plan(metadata.get("plan", ""))
        if user_id and ObjectId.is_valid(str(user_id)) and plan in PAID_PLAN_AMOUNTS:
            user_oid = parse_object_id(str(user_id), "user_id")
            user_doc = await db.users.find_one({"_id": user_oid})
            new_subscription_id = session.get("subscription")
            current_subscription_id = (user_doc or {}).get("stripe_subscription_id")
            # A delayed Checkout webhook for a second subscription must not
            # overwrite the account's already-linked subscription or plan.
            if user_doc and current_subscription_id and new_subscription_id and current_subscription_id != new_subscription_id:
                logger.warning(
                    "Ignoring Checkout session %s for subscription %s: user %s is already linked to %s",
                    session.get("id"), new_subscription_id, user_id, current_subscription_id,
                )
                return
            await db.users.update_one(
                {"_id": user_oid},
                {"$set": {
                    "subscription": plan,
                    "subscription_status": "active",
                    "stripe_customer_id": session.get("customer"),
                    "stripe_subscription_id": new_subscription_id,
                    "subscription_updated_at": datetime.now(timezone.utc).isoformat(),
                }}
            )
            await db.payment_transactions.update_one(
                {"session_id": session.get("id")},
                {"$set": {"payment_status": "paid", "paid_at": datetime.now(timezone.utc).isoformat()}},
                upsert=False,
            )

    elif checkout_type == "invoice_payment":
        invoice_id = metadata.get("invoice_id")
        if invoice_id:
            user_id = metadata.get("user_id")
            if not user_id or not ObjectId.is_valid(user_id):
                logger.error("Ignoring invoice payment with invalid owner metadata")
                return
            await db.invoices.update_one(
                {"_id": parse_object_id(invoice_id, "invoice_id"), "user_id": str(user_id)},
                {"$set": {"status": "paid", "paid_at": datetime.now(timezone.utc).isoformat()}}
            )
            await db.payment_transactions.update_one(
                {"session_id": session.get("id")},
                {"$set": {"payment_status": "paid", "paid_at": datetime.now(timezone.utc).isoformat()}},
                upsert=False,
            )


@api_router.get("/payments/status/{session_id}")
async def get_payment_status(session_id: str, request: Request):
    # Read-only: only signed Stripe webhooks can apply payments.
    user = await get_current_user(request)
    transaction = await db.payment_transactions.find_one(
        {"session_id": session_id, "user_id": user["_id"]},
        {"_id": 0, "payment_status": 1, "type": 1}
    )
    if not transaction:
        raise HTTPException(status_code=404, detail="Betaling niet gevonden")
    try:
        session = stripe.checkout.Session.retrieve(session_id)
    except stripe.error.StripeError as exc:
        logger.exception("Stripe status error: %s", exc)
        raise HTTPException(status_code=502, detail="Betaalstatus kon niet worden opgehaald")
    # Never mutate subscriptions or invoices from a browser status poll.
    return {
        "status": session.status,
        "payment_status": transaction.get("payment_status", "pending"),
        "paid": transaction.get("payment_status") == "paid",
        "type": transaction.get("type")
    }


@api_router.post("/stripe/webhook")
@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    if not STRIPE_WEBHOOK_SECRET:
        raise HTTPException(status_code=503, detail="Stripe webhook is niet geconfigureerd")

    payload = await request.body()
    signature = request.headers.get("stripe-signature")
    if not signature:
        raise HTTPException(status_code=400, detail="Stripe-Signature ontbreekt")

    try:
        event = stripe.Webhook.construct_event(payload, signature, STRIPE_WEBHOOK_SECRET)
    except (ValueError, stripe.error.SignatureVerificationError):
        raise HTTPException(status_code=400, detail="Ongeldige Stripe webhook")

    event_type = event.get("type")
    obj = event["data"]["object"]

    if event_type in {"checkout.session.completed", "checkout.session.async_payment_succeeded"}:
        if obj.get("payment_status") == "paid":
            await apply_paid_checkout(obj)

    elif event_type == "invoice.paid":
        # Invoice-paid is the authoritative signal for recurring charges and
        # prorated subscription upgrades. Do not grant a plan from a merely
        # updated subscription object.
        subscription_value = obj.get("subscription")
        subscription_id = subscription_value.get("id") if isinstance(subscription_value, dict) else subscription_value
        if subscription_id:
            try:
                paid_subscription = stripe.Subscription.retrieve(subscription_id)
            except stripe.error.StripeError:
                logger.exception("Could not retrieve subscription for paid invoice %s", obj.get("id"))
                return {"received": True}
            metadata = paid_subscription.get("metadata") or {}
            user_id = metadata.get("user_id")
            plan = normalize_plan(metadata.get("plan", ""))
            if user_id and ObjectId.is_valid(str(user_id)) and plan in PAID_PLAN_AMOUNTS:
                user_oid = parse_object_id(str(user_id), "user_id")
                user_doc = await db.users.find_one({"_id": user_oid})
                current_subscription_id = (user_doc or {}).get("stripe_subscription_id")
                # Never let an old/duplicate subscription replace a different
                # subscription already attached to this account.
                if user_doc and (not current_subscription_id or current_subscription_id == subscription_id):
                    if paid_subscription.get("status") in {"active", "trialing"} and not paid_subscription.get("pending_update"):
                        await db.users.update_one(
                            {"_id": user_oid},
                            {"$set": {
                                "subscription": plan,
                                "subscription_status": "cancel_at_period_end" if paid_subscription.get("cancel_at_period_end") else paid_subscription.get("status"),
                                "stripe_subscription_id": subscription_id,
                                "stripe_customer_id": paid_subscription.get("customer"),
                                "subscription_updated_at": datetime.now(timezone.utc).isoformat(),
                            }},
                        )
                elif user_doc and current_subscription_id != subscription_id:
                    logger.warning(
                        "Ignoring paid invoice %s for subscription %s: user %s is already linked to %s",
                        obj.get("id"), subscription_id, user_id, current_subscription_id,
                    )

    elif event_type == "customer.subscription.updated":
        metadata = obj.get("metadata") or {}
        user_id = metadata.get("user_id")
        if user_id and ObjectId.is_valid(str(user_id)):
            user_oid = parse_object_id(str(user_id), "user_id")
            user_doc = await db.users.find_one({"_id": user_oid})
            current_subscription_id = (user_doc or {}).get("stripe_subscription_id")
            # Status events from a duplicate/old subscription must not replace
            # the account's canonical Stripe subscription.
            if user_doc and (not current_subscription_id or current_subscription_id == obj.get("id")):
                update = {
                    "subscription_status": "cancel_at_period_end" if obj.get("cancel_at_period_end") else obj.get("status", "unknown"),
                    "stripe_subscription_id": obj.get("id"),
                    "stripe_customer_id": obj.get("customer"),
                    "subscription_updated_at": datetime.now(timezone.utc).isoformat(),
                }
                # Do not change plan here: only a verified paid invoice or
                # completed paid Checkout can grant/upgrade paid entitlements.
                if obj.get("status") in {"canceled", "incomplete_expired"}:
                    update["subscription"] = "free"
                await db.users.update_one({"_id": user_oid}, {"$set": update})

    elif event_type == "customer.subscription.deleted":
        metadata = obj.get("metadata") or {}
        user_id = metadata.get("user_id")
        if user_id and ObjectId.is_valid(str(user_id)):
            user_oid = parse_object_id(str(user_id), "user_id")
            user_doc = await db.users.find_one({"_id": user_oid})
            # Ignore deletion events for an old/duplicate subscription.
            if user_doc and user_doc.get("stripe_subscription_id") == obj.get("id"):
                await db.users.update_one(
                    {"_id": user_oid, "stripe_subscription_id": obj.get("id")},
                    {"$set": {
                        "subscription": "free",
                        "subscription_status": "canceled",
                        "stripe_subscription_id": None,
                        "subscription_updated_at": datetime.now(timezone.utc).isoformat(),
                    }}
                )

    return {"received": True}


'''
source = source[:stripe_start] + stripe_section + source[stripe_end:]


# --- Security hardening: tenant-scope embedded client lookups ---
# Apply ownership filters to every client join derived from a user's quote/invoice.
def replace_once(old: str, new: str, label: str) -> None:
    global source
    count = source.count(old)
    if count != 1:
        raise RuntimeError(f"Expected exactly one match for {label}, found {count}")
    source = source.replace(old, new, 1)


def replace_all_required(old: str, new: str, label: str) -> None:
    global source
    count = source.count(old)
    if count < 1:
        raise RuntimeError(f"Expected at least one match for {label}, found {count}")
    source = source.replace(old, new)


# Close Free quota bypasses through duplicate and quote-conversion endpoints.
replace_once(
    'async def duplicate_quote(quote_id: str, request: Request):\n    user = await get_current_user(request)\n',
    'async def duplicate_quote(quote_id: str, request: Request):\n    user = await get_current_user(request)\n    await enforce_free_monthly_limit(user, db.quotes, "offertes")\n',
    "duplicate quote monthly quota",
)
replace_once(
    'async def convert_quote_to_invoice(quote_id: str, request: Request):\n    user = await get_current_user(request)\n',
    'async def convert_quote_to_invoice(quote_id: str, request: Request):\n    user = await get_current_user(request)\n    await enforce_free_monthly_limit(user, db.invoices, "facturen")\n',
    "quote conversion invoice monthly quota",
)

# --- CSRF hardening: the frontend calls the API through same-origin /api proxy ---
replace_once(
    'def get_cookie_samesite() -> str:\n    return "none" if IS_PRODUCTION else "lax"',
    'def get_cookie_samesite() -> str:\n    # Same-origin /api proxy makes cross-site cookies unnecessary; Lax blocks cross-site POSTs.\n    return "lax"',
    "same-site cookie CSRF hardening",
)

# --- Enforce subscription entitlements in the backend (not only in the UI) ---
replace_all_required(
    '    subscription = user.get("subscription", "free")',
    '    subscription = effective_plan(user)',
    "effective subscription plan",
)
replace_once(
    '    if user.get("subscription") != "business":\n        raise HTTPException(status_code=403, detail="Business nodig")',
    '    require_plan(user, "business")',
    "business payment-link entitlement",
)
replace_once(
    'async def get_company(request: Request):\n    user = await get_current_user(request)\n    company = await db.companies.find_one({"user_id": user["_id"]}, {"_id": 0})\n    if not company:\n        company = {"user_id": user["_id"]}\n    return company',
    'async def get_company(request: Request):\n    user = await get_current_user(request)\n    company = await db.companies.find_one({"user_id": user["_id"]}, {"_id": 0})\n    if not company:\n        company = {"user_id": user["_id"]}\n    if effective_plan(user) == "free":\n        company.pop("logo_base64", None)\n    return company',
    "hide premium logo from Free plan profile response",
)
replace_once(
    'async def update_company(data: CompanyProfile, request: Request):\n    user = await get_current_user(request)\n    company_data = data.model_dump()',
    'async def update_company(data: CompanyProfile, request: Request):\n    user = await get_current_user(request)\n    company_data = data.model_dump()\n    company_data.pop("logo_base64", None)',
    "company profile logo entitlement",
)
replace_once(
    'async def upload_logo(request: Request, file: UploadFile = File(...)):\n    user = await get_current_user(request)\n',
    'async def upload_logo(request: Request, file: UploadFile = File(...)):\n    user = await get_current_user(request)\n    require_plan(user, "pro")\n',
    "logo upload entitlement",
)
replace_once(
    'async def send_quote_email(quote_id: str, request: Request):\n    user = await get_current_user(request)\n    quote_obj_id = parse_object_id(quote_id, "quote_id")',
    'async def send_quote_email(quote_id: str, request: Request):\n    user = await get_current_user(request)\n    require_plan(user, "pro")\n    quote_obj_id = parse_object_id(quote_id, "quote_id")',
    "quote email entitlement",
)
replace_once(
    'async def send_invoice_email(invoice_id: str, request: Request):\n    user = await get_current_user(request)\n    invoice_obj_id = parse_object_id(invoice_id, "invoice_id")\n    invoice_doc = await db.invoices.find_one',
    'async def send_invoice_email(invoice_id: str, request: Request):\n    user = await get_current_user(request)\n    require_plan(user, "pro")\n    invoice_obj_id = parse_object_id(invoice_id, "invoice_id")\n    invoice_doc = await db.invoices.find_one',
    "invoice email entitlement",
)
def add_pdf_plan_context(doc_type: str, doc_name: str) -> None:
    global source
    pattern = rf'(?m)^(?P<indent>[ ]*)html_content = generate_pdf_html\("{doc_type}", {doc_name}, company, client_doc\)$'

    def add_context(match):
        indent = match.group("indent")
        return (
            f'{indent}company["_plan"] = effective_plan(user)\n'
            f'{indent}html_content = generate_pdf_html("{doc_type}", {doc_name}, company, client_doc)'
        )

    source, count = re.subn(pattern, add_context, source)
    if count < 1:
        raise RuntimeError(f"Expected at least one {doc_type} PDF generation call, found {count}")


add_pdf_plan_context("quote", "quote_doc")
add_pdf_plan_context("invoice", "invoice_doc")


replace_once(
    '    if company.get("logo_base64"):\n        logo_html = f\'<img src="',
    '    if company.get("_plan") in {"pro", "business"} and company.get("logo_base64"):\n        logo_html = f\'<img src="',
    "PDF logo entitlement",
)
replace_all_required(
    'db.clients.find_one({"_id": ObjectId(quote_doc["client_id"])})',
    'db.clients.find_one({"_id": ObjectId(quote_doc["client_id"]), "user_id": user["_id"]})',
    "quote client ownership",
)
replace_all_required(
    'db.clients.find_one({"_id": ObjectId(invoice_doc["client_id"])})',
    'db.clients.find_one({"_id": ObjectId(invoice_doc["client_id"]), "user_id": user["_id"]})',
    "invoice client ownership",
)
replace_once(
    """class UserRegister(BaseModel):
    email: EmailStr
    password: str""",
    """class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)""",
    "registration password policy",
)
replace_once(
    """class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str""",
    """class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str = Field(min_length=12, max_length=128)""",
    "password reset policy",
)


# --- HTML injection hardening for generated PDFs and transactional email bodies ---
# Escape every user-controlled value inserted into HTML, including legacy logo values.
# New logo values are accepted only through the validated upload endpoint.
def replace_html_value(old: str, new: str, label: str) -> None:
    global source
    count = source.count(old)
    if count < 1:
        raise RuntimeError(f"Expected at least one match for HTML escaping {label}, found {count}")
    source = source.replace(old, new)


replace_html_value('{item["description"]}', '{html_lib.escape(str(item["description"]), quote=True)}', "line item description")
replace_html_value('{doc["notes"]}', '{html_lib.escape(str(doc["notes"]), quote=True)}', "document notes")
replace_html_value('{company.get("company_name", "")}', '{html_lib.escape(str(company.get("company_name", "")), quote=True)}', "company name")
replace_html_value('{company.get("address", "")}', '{html_lib.escape(str(company.get("address", "")), quote=True)}', "company address")
replace_html_value('{company.get("postal_code", "")}', '{html_lib.escape(str(company.get("postal_code", "")), quote=True)}', "company postal code")
replace_html_value('{company.get("city", "")}', '{html_lib.escape(str(company.get("city", "")), quote=True)}', "company city")
replace_html_value('{company.get("kvk_number", "")}', '{html_lib.escape(str(company.get("kvk_number", "")), quote=True)}', "company KvK")
replace_html_value('{company.get("btw_number", "")}', '{html_lib.escape(str(company.get("btw_number", "")), quote=True)}', "company VAT number")
replace_html_value('{company.get("iban", "")}', '{html_lib.escape(str(company.get("iban", "")), quote=True)}', "company IBAN")
replace_html_value('{client_doc.get("company_name") or client_doc.get("name", "")}', '{html_lib.escape(str(client_doc.get("company_name") or client_doc.get("name", "")), quote=True)}', "client company/name")
replace_html_value('{client_doc.get("name", "")}', '{html_lib.escape(str(client_doc.get("name", "")), quote=True)}', "client name")
replace_html_value('{client_doc.get("address", "")}', '{html_lib.escape(str(client_doc.get("address", "")), quote=True)}', "client address")
replace_html_value('{client_doc.get("postal_code", "")}', '{html_lib.escape(str(client_doc.get("postal_code", "")), quote=True)}', "client postal code")
replace_html_value('{client_doc.get("city", "")}', '{html_lib.escape(str(client_doc.get("city", "")), quote=True)}', "client city")
replace_html_value('{doc_number}', '{html_lib.escape(str(doc_number or ""), quote=True)}', "document number")
replace_html_value('{date_str}', '{html_lib.escape(str(date_str), quote=True)}', "document date")
replace_html_value('{parse_iso_date(due_date)}', '{html_lib.escape(parse_iso_date(due_date), quote=True)}', "invoice due date")
replace_html_value('{parse_iso_date(valid_until)}', '{html_lib.escape(parse_iso_date(valid_until), quote=True)}', "quote validity date")
replace_html_value('{company["logo_base64"]}', '{html_lib.escape(str(company["logo_base64"]), quote=True)}', "logo data URI")

replace_once(
    "            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');",
    "",
    "remove external PDF font dependency",
)


# Escape names and identifiers interpolated into transactional email HTML.
replace_html_value("{client_doc.get('name', '')}", "{html_lib.escape(str(client_doc.get('name', '')), quote=True)}", "email client name")
replace_html_value("{company_name}", "{html_lib.escape(str(company_name), quote=True)}", "email company name")
replace_html_value("{quote_number}</strong>", "{html_lib.escape(str(quote_number), quote=True)}</strong>", "email quote number")
replace_html_value("{invoice_number}</strong>", "{html_lib.escape(str(invoice_number), quote=True)}</strong>", "email invoice number")

path.write_text(source, encoding="utf-8")
print("server.py patched: real email + recurring Stripe billing + webhook")

from pathlib import Path
import html

path = Path("server.py")
source = path.read_text(encoding="utf-8")

# Idempotency: each deploy starts from a clean checkout, but keep this safe.
if "# ============ EMAIL (REAL) ============" in source and '@api_router.post("/stripe/webhook")' in source and "html.escape" in source:
    print("server.py already patched")
    raise SystemExit(0)

# --- Imports and environment ---
if "import httpx\n" not in source:
    source = source.replace("import stripe\n", "import stripe\nimport httpx\n", 1)

if "import html\n" not in source:
    source = source.replace("import stripe\n", "import stripe\nimport html\n", 1)

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
    status = str(user.get("subscription_status") or ("active" if plan != "free" else "free")).lower()
    if plan not in PLAN_RANK:
        return "free"
    if plan != "free" and status not in ACTIVE_SUBSCRIPTION_STATUSES:
        return "free"
    return plan


def require_plan(user: dict, required_plan: str) -> None:
    current = effective_plan(user)
    if PLAN_RANK.get(current, 0) < PLAN_RANK[required_plan]:
        raise HTTPException(
            status_code=403,
            detail=f"Deze functie vereist het {required_plan.capitalize()}-abonnement.",
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
                stripe.Subscription.modify(subscription_id, cancel_at_period_end=True)
                await db.users.update_one(
                    {"_id": parse_object_id(user["_id"], "user_id")},
                    {"$set": {"subscription_status": "cancel_at_period_end"}}
                )
                return {"url": f"{origin}/billing", "message": "Abonnement wordt aan het einde van de periode stopgezet"}
            except stripe.error.StripeError as exc:
                logger.exception("Stripe cancel error: %s", exc)
                raise HTTPException(status_code=502, detail="Abonnement kon niet worden opgezegd")

        await db.users.update_one(
            {"_id": parse_object_id(user["_id"], "user_id")},
            {"$set": {"subscription": "free", "subscription_status": "free"}}
        )
        return {"url": f"{origin}/billing", "message": "Gratis plan actief"}

    if plan not in PAID_PLAN_AMOUNTS:
        raise HTTPException(status_code=400, detail="Ongeldig plan. Kies free, pro of business.")

    try:
        session_kwargs = {
            "mode": "subscription",
            "success_url": f"{origin}/billing?session_id={{CHECKOUT_SESSION_ID}}",
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
        if user_id and plan in PAID_PLAN_AMOUNTS:
            await db.users.update_one(
                {"_id": parse_object_id(user_id, "user_id")},
                {"$set": {
                    "subscription": plan,
                    "subscription_status": "active",
                    "stripe_customer_id": session.get("customer"),
                    "stripe_subscription_id": session.get("subscription"),
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
                {"_id": parse_object_id(invoice_id, "invoice_id"), "user_id": parse_object_id(user_id, "user_id")},
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
        "type": transaction.get("type")
    }


@api_router.post("/stripe/webhook")
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

    elif event_type == "customer.subscription.updated":
        metadata = obj.get("metadata") or {}
        user_id = metadata.get("user_id")
        plan = normalize_plan(metadata.get("plan", ""))
        if user_id:
            update = {
                "subscription_status": obj.get("status", "unknown"),
                "stripe_subscription_id": obj.get("id"),
                "stripe_customer_id": obj.get("customer"),
                "subscription_updated_at": datetime.now(timezone.utc).isoformat(),
            }
            if plan in PAID_PLAN_AMOUNTS and obj.get("status") in {"active", "trialing"}:
                update["subscription"] = plan
            await db.users.update_one({"_id": parse_object_id(user_id, "user_id")}, {"$set": update})

    elif event_type == "customer.subscription.deleted":
        metadata = obj.get("metadata") or {}
        user_id = metadata.get("user_id")
        if user_id:
            await db.users.update_one(
                {"_id": parse_object_id(user_id, "user_id")},
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


# --- Enforce subscription entitlements in the backend (not only in the UI) ---
replace_all_required(
    '    subscription = user.get("subscription", "free")',
    '    subscription = effective_plan(user)',
    "effective subscription plan",
)
replace_once(
    '    if user.get("subscription") != "business":',
    '    require_plan(user, "business")',
    "business payment-link entitlement",
)
replace_once(
    'async def update_company(data: CompanyProfile, request: Request):\n    user = await get_current_user(request)\n    company_data = data.model_dump()',
    'async def update_company(data: CompanyProfile, request: Request):\n    user = await get_current_user(request)\n    company_data = data.model_dump()\n    if effective_plan(user) == "free":\n        company_data.pop("logo_base64", None)',
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
replace_all_required(
    '    html_content = generate_pdf_html("quote", quote_doc, company, client_doc)',
    '    company["_plan"] = effective_plan(user)\n    html_content = generate_pdf_html("quote", quote_doc, company, client_doc)',
    "quote PDF plan context",
)
replace_all_required(
    '    html_content = generate_pdf_html("invoice", invoice_doc, company, client_doc)',
    '    company["_plan"] = effective_plan(user)\n    html_content = generate_pdf_html("invoice", invoice_doc, company, client_doc)',
    "invoice PDF plan context",
)
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
# User-controlled text inserted into HTML must be escaped. The logo is a base64
# data URI generated by the upload handler and does not contain HTML delimiters.
def replace_html_value(old: str, new: str, label: str) -> None:
    global source
    count = source.count(old)
    if count < 1:
        raise RuntimeError(f"Expected at least one match for HTML escaping {label}, found {count}")
    source = source.replace(old, new)


replace_html_value('{item["description"]}', '{html.escape(str(item["description"]), quote=True)}', "line item description")
replace_html_value('{doc["notes"]}', '{html.escape(str(doc["notes"]), quote=True)}', "document notes")
replace_html_value('{company.get("company_name", "")}', '{html.escape(str(company.get("company_name", "")), quote=True)}', "company name")
replace_html_value('{company.get("address", "")}', '{html.escape(str(company.get("address", "")), quote=True)}', "company address")
replace_html_value('{company.get("postal_code", "")}', '{html.escape(str(company.get("postal_code", "")), quote=True)}', "company postal code")
replace_html_value('{company.get("city", "")}', '{html.escape(str(company.get("city", "")), quote=True)}', "company city")
replace_html_value('{company.get("kvk_number", "")}', '{html.escape(str(company.get("kvk_number", "")), quote=True)}', "company KvK")
replace_html_value('{company.get("btw_number", "")}', '{html.escape(str(company.get("btw_number", "")), quote=True)}', "company VAT number")
replace_html_value('{company.get("iban", "")}', '{html.escape(str(company.get("iban", "")), quote=True)}', "company IBAN")
replace_html_value('{client_doc.get("company_name") or client_doc.get("name", "")}', '{html.escape(str(client_doc.get("company_name") or client_doc.get("name", "")), quote=True)}', "client company/name")
replace_html_value('{client_doc.get("name", "")}', '{html.escape(str(client_doc.get("name", "")), quote=True)}', "client name")
replace_html_value('{client_doc.get("address", "")}', '{html.escape(str(client_doc.get("address", "")), quote=True)}', "client address")
replace_html_value('{client_doc.get("postal_code", "")}', '{html.escape(str(client_doc.get("postal_code", "")), quote=True)}', "client postal code")
replace_html_value('{client_doc.get("city", "")}', '{html.escape(str(client_doc.get("city", "")), quote=True)}', "client city")
replace_html_value('{doc_number}', '{html.escape(str(doc_number or ""), quote=True)}', "document number")
replace_html_value('{date_str}', '{html.escape(str(date_str), quote=True)}', "document date")

# Escape names and identifiers interpolated into transactional email HTML.
replace_html_value("{client_doc.get('name', '')}", "{html.escape(str(client_doc.get('name', '')), quote=True)}", "email client name")
replace_html_value("{company_name}", "{html.escape(str(company_name), quote=True)}", "email company name")
replace_html_value("{quote_number}</strong>", "{html.escape(str(quote_number), quote=True)}</strong>", "email quote number")
replace_html_value("{invoice_number}</strong>", "{html.escape(str(invoice_number), quote=True)}</strong>", "email invoice number")

path.write_text(source, encoding="utf-8")
print("server.py patched: real email + recurring Stripe billing + webhook")

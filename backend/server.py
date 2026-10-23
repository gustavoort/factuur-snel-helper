from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, File, UploadFile
from fastapi.responses import StreamingResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ReturnDocument
import os
import logging
import bcrypt
import jwt
import secrets
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
from datetime import datetime, timezone, timedelta
from bson import ObjectId
from urllib.parse import quote
import io
import base64
from weasyprint import HTML
import stripe

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Environment helpers
APP_ENV = os.environ.get("APP_ENV", "development").lower()
IS_PRODUCTION = APP_ENV == "production"

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME")

if not MONGO_URL:
    raise RuntimeError("MONGO_URL não configurada")
if not DB_NAME:
    raise RuntimeError("DB_NAME não configurada")

STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY")
if not STRIPE_SECRET_KEY:
    raise RuntimeError("STRIPE_SECRET_KEY não configurada")

JWT_SECRET = os.environ.get("JWT_SECRET")
if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET não configurada")

stripe.api_key = STRIPE_SECRET_KEY

# MongoDB connection
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# JWT Configuration
JWT_ALGORITHM = "HS256"
ALLOWED_LOGO_CONTENT_TYPES = {"image/png", "image/jpeg", "image/webp"}
MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024


def get_jwt_secret() -> str:
    return JWT_SECRET


def get_cookie_secure() -> bool:
    return IS_PRODUCTION


def get_cookie_samesite() -> str:
    return "none" if IS_PRODUCTION else "lax"


def set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    cookie_secure = get_cookie_secure()
    cookie_samesite = get_cookie_samesite()

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        secure=cookie_secure,
        samesite=cookie_samesite,
        max_age=86400,
        path="/"
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=cookie_secure,
        samesite=cookie_samesite,
        max_age=604800,
        path="/"
    )


def clear_auth_cookies(response: Response) -> None:
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")


def parse_object_id(value: str, field_name: str = "id") -> ObjectId:
    if not ObjectId.is_valid(value):
        raise HTTPException(status_code=400, detail=f"{field_name} inválido")
    return ObjectId(value)


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=24),
        "type": "access"
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "refresh"
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]

    if not token:
        raise HTTPException(status_code=401, detail="Niet geauthenticeerd")

    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])

        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Ongeldig token type")

        user = await db.users.find_one({"_id": parse_object_id(payload["sub"], "user_id")})
        if not user:
            raise HTTPException(status_code=401, detail="Gebruiker niet gevonden")

        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token verlopen")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Ongeldig token")
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Ongeldig token")


# Create the main app
app = FastAPI(title="Faktuvi API", version="1.0.0")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# ============ PYDANTIC MODELS ============

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class PasswordReset(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str


class CompanyProfile(BaseModel):
    company_name: str = ""
    owner_name: str = ""
    logo_base64: Optional[str] = None
    address: str = ""
    postal_code: str = ""
    city: str = ""
    country: str = "Nederland"
    phone: str = ""
    email: str = ""
    kvk_number: str = ""
    btw_number: str = ""
    iban: str = ""
    payment_terms: int = 14
    default_vat_rate: float = 21.0


class ClientCreate(BaseModel):
    name: str
    company_name: str = ""
    email: str = ""
    phone: str = ""
    address: str = ""
    postal_code: str = ""
    city: str = ""
    country: str = "Nederland"
    notes: str = ""


class QuoteItem(BaseModel):
    description: str
    quantity: float = Field(default=1, gt=0)
    unit_price: float = Field(default=0, ge=0)
    vat_rate: float = Field(default=21.0, ge=0, le=100)


class QuoteCreate(BaseModel):
    client_id: str
    items: List[QuoteItem]
    notes: str = ""
    validity_days: int = Field(default=30, ge=1, le=365)


class QuoteUpdate(BaseModel):
    items: Optional[List[QuoteItem]] = None
    notes: Optional[str] = None
    validity_days: Optional[int] = Field(default=None, ge=1, le=365)
    status: Optional[str] = None


class InvoiceCreate(BaseModel):
    client_id: str
    items: List[QuoteItem]
    notes: str = ""
    from_quote_id: Optional[str] = None


class InvoiceUpdate(BaseModel):
    items: Optional[List[QuoteItem]] = None
    notes: Optional[str] = None
    status: Optional[str] = None


class SubscriptionPlan(BaseModel):
    plan: str  # free, pro, business


class PaymentLinkRequest(BaseModel):
    invoice_id: str
    origin_url: str


# ============ HELPER FUNCTIONS ============

def calculate_totals(items: List[dict]) -> dict:
    subtotal = 0
    vat_total = 0

    for item in items:
        item_subtotal = item["quantity"] * item["unit_price"]
        item_vat = item_subtotal * (item["vat_rate"] / 100)
        subtotal += item_subtotal
        vat_total += item_vat

    return {
        "subtotal": round(subtotal, 2),
        "vat_total": round(vat_total, 2),
        "total": round(subtotal + vat_total, 2)
    }


async def get_next_number(user_id: str, doc_type: str) -> str:
    counter = await db.counters.find_one_and_update(
        {"user_id": user_id, "type": doc_type},
        {"$inc": {"count": 1}},
        upsert=True,
        return_document=ReturnDocument.AFTER
    )
    year = datetime.now().year
    prefix = "OFF" if doc_type == "quote" else "FAC"
    return f"{prefix}-{year}-{counter['count']:04d}"


def parse_iso_date(value: str) -> str:
    if not value:
        return datetime.now().strftime("%d-%m-%Y")
    try:
        dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
        return dt.strftime("%d-%m-%Y")
    except Exception:
        return value[:10]


# ============ AUTH ROUTES ============

@api_router.post("/auth/register")
async def register(data: UserRegister, response: Response):
    email = data.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="E-mailadres is al in gebruik")

    hashed = hash_password(data.password)
    user_doc = {
        "email": email,
        "password_hash": hashed,
        "name": data.name,
        "role": "user",
        "subscription": "free",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)

    await db.companies.insert_one({
        "user_id": user_id,
        "company_name": "",
        "owner_name": data.name,
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    set_auth_cookies(response, access_token, refresh_token)

    return {"id": user_id, "email": email, "name": data.name, "subscription": "free"}


@api_router.post("/auth/login")
async def login(data: UserLogin, response: Response, request: Request):
    email = data.email.lower()

    ip = request.client.host if request.client else "unknown"
    identifier = f"{ip}:{email}"
    attempt = await db.login_attempts.find_one({"identifier": identifier})

    if attempt and attempt.get("count", 0) >= 5:
        lockout_time = attempt.get("last_attempt")
        if lockout_time:
            lockout_dt = datetime.fromisoformat(lockout_time) if isinstance(lockout_time, str) else lockout_time
            if datetime.now(timezone.utc) - lockout_dt < timedelta(minutes=15):
                raise HTTPException(status_code=429, detail="Te veel inlogpogingen. Probeer later opnieuw.")
            else:
                await db.login_attempts.delete_one({"identifier": identifier})

    user = await db.users.find_one({"email": email})
    if not user or not verify_password(data.password, user["password_hash"]):
        await db.login_attempts.update_one(
            {"identifier": identifier},
            {"$inc": {"count": 1}, "$set": {"last_attempt": datetime.now(timezone.utc).isoformat()}},
            upsert=True
        )
        raise HTTPException(status_code=401, detail="Ongeldige inloggegevens")

    await db.login_attempts.delete_one({"identifier": identifier})

    user_id = str(user["_id"])
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)
    set_auth_cookies(response, access_token, refresh_token)

    return {
        "id": user_id,
        "email": email,
        "name": user.get("name", ""),
        "subscription": user.get("subscription", "free")
    }


@api_router.post("/auth/logout")
async def logout(response: Response):
    clear_auth_cookies(response)
    return {"message": "Uitgelogd"}


@api_router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    return user


@api_router.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="Geen refresh token")

    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])

        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Ongeldig token type")

        user = await db.users.find_one({"_id": parse_object_id(payload["sub"], "user_id")})
        if not user:
            raise HTTPException(status_code=401, detail="Gebruiker niet gevonden")

        access_token = create_access_token(str(user["_id"]), user["email"])
        response.set_cookie(
            key="access_token",
            value=access_token,
            httponly=True,
            secure=get_cookie_secure(),
            samesite=get_cookie_samesite(),
            max_age=86400,
            path="/"
        )
        return {"message": "Token vernieuwd"}

    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token verlopen")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Ongeldig token")


@api_router.post("/auth/forgot-password")
async def forgot_password(data: PasswordReset):
    email = data.email.lower()
    user = await db.users.find_one({"email": email})
    if not user:
        return {"message": "Als dit e-mailadres bestaat, ontvangt u een reset link"}

    token = secrets.token_urlsafe(32)
    await db.password_reset_tokens.insert_one({
        "token": token,
        "user_id": str(user["_id"]),
        "expires_at": datetime.now(timezone.utc) + timedelta(hours=1),
        "used": False
    })

    logger.info(f"[MOCK EMAIL] Password reset link for {email}: /reset-password?token={token}")
    return {"message": "Als dit e-mailadres bestaat, ontvangt u een reset link"}


@api_router.post("/auth/reset-password")
async def reset_password(data: PasswordResetConfirm):
    reset = await db.password_reset_tokens.find_one({"token": data.token, "used": False})
    if not reset:
        raise HTTPException(status_code=400, detail="Ongeldige of verlopen token")

    expires_at = reset["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Token is verlopen")

    hashed = hash_password(data.new_password)
    await db.users.update_one(
        {"_id": parse_object_id(reset["user_id"], "user_id")},
        {"$set": {"password_hash": hashed}}
    )
    await db.password_reset_tokens.update_one(
        {"token": data.token},
        {"$set": {"used": True}}
    )

    return {"message": "Wachtwoord succesvol gewijzigd"}


# ============ COMPANY ROUTES ============

@api_router.get("/company")
async def get_company(request: Request):
    user = await get_current_user(request)
    company = await db.companies.find_one({"user_id": user["_id"]}, {"_id": 0})
    if not company:
        company = {"user_id": user["_id"]}
    return company


@api_router.put("/company")
async def update_company(data: CompanyProfile, request: Request):
    user = await get_current_user(request)
    company_data = data.model_dump()
    company_data["user_id"] = user["_id"]
    company_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    await db.companies.update_one(
        {"user_id": user["_id"]},
        {"$set": company_data},
        upsert=True
    )
    return {"message": "Bedrijfsgegevens bijgewerkt"}


@api_router.post("/company/logo")
async def upload_logo(request: Request, file: UploadFile = File(...)):
    user = await get_current_user(request)

    content_type = file.content_type or ""
    if content_type not in ALLOWED_LOGO_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Ongeldig logo formaat. Gebruik PNG, JPG of WEBP.")

    contents = await file.read()
    if len(contents) > MAX_LOGO_SIZE_BYTES:
        raise HTTPException(status_code=400, detail="Logo bestand is te groot. Maximum is 2MB.")

    base64_logo = base64.b64encode(contents).decode("utf-8")
    logo_data = f"data:{content_type};base64,{base64_logo}"

    await db.companies.update_one(
        {"user_id": user["_id"]},
        {"$set": {
            "logo_base64": logo_data,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }},
        upsert=True
    )
    return {"message": "Logo geupload", "logo": logo_data}


# ============ CLIENT ROUTES ============

@api_router.get("/clients")
async def get_clients(request: Request, search: str = ""):
    user = await get_current_user(request)
    query = {"user_id": user["_id"]}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"company_name": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}}
        ]

    result = []
    async for client_doc in db.clients.find(query):
        client_doc["id"] = str(client_doc["_id"])
        del client_doc["_id"]
        result.append(client_doc)
    return result


@api_router.post("/clients")
async def create_client(data: ClientCreate, request: Request):
    user = await get_current_user(request)
    client_data = data.model_dump()
    client_data["user_id"] = user["_id"]
    client_data["created_at"] = datetime.now(timezone.utc).isoformat()

    result = await db.clients.insert_one(client_data)
    return {"id": str(result.inserted_id), "message": "Klant aangemaakt"}


@api_router.get("/clients/{client_id}")
async def get_client(client_id: str, request: Request):
    user = await get_current_user(request)
    client_doc = await db.clients.find_one({"_id": parse_object_id(client_id, "client_id"), "user_id": user["_id"]})
    if not client_doc:
        raise HTTPException(status_code=404, detail="Klant niet gevonden")
    client_doc["id"] = str(client_doc["_id"])
    del client_doc["_id"]
    return client_doc


@api_router.put("/clients/{client_id}")
async def update_client(client_id: str, data: ClientCreate, request: Request):
    user = await get_current_user(request)
    client_data = data.model_dump()
    client_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    result = await db.clients.update_one(
        {"_id": parse_object_id(client_id, "client_id"), "user_id": user["_id"]},
        {"$set": client_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Klant niet gevonden")
    return {"message": "Klant bijgewerkt"}


@api_router.delete("/clients/{client_id}")
async def delete_client(client_id: str, request: Request):
    user = await get_current_user(request)
    result = await db.clients.delete_one({"_id": parse_object_id(client_id, "client_id"), "user_id": user["_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Klant niet gevonden")
    return {"message": "Klant verwijderd"}


# ============ QUOTE ROUTES ============

@api_router.get("/quotes")
async def get_quotes(request: Request, status: str = ""):
    user = await get_current_user(request)
    query = {"user_id": user["_id"]}
    if status:
        query["status"] = status

    result = []
    async for quote_doc in db.quotes.find(query).sort("created_at", -1):
        quote_doc["id"] = str(quote_doc["_id"])
        del quote_doc["_id"]

        if quote_doc.get("client_id") and ObjectId.is_valid(quote_doc["client_id"]):
            client_doc = await db.clients.find_one({"_id": ObjectId(quote_doc["client_id"])})
            if client_doc:
                quote_doc["client_name"] = client_doc.get("name", "")
                quote_doc["client_company"] = client_doc.get("company_name", "")
        result.append(quote_doc)
    return result


@api_router.post("/quotes")
async def create_quote(data: QuoteCreate, request: Request):
    user = await get_current_user(request)

    subscription = user.get("subscription", "free")
    if subscription == "free":
        month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        quote_count = await db.quotes.count_documents({
            "user_id": user["_id"],
            "created_at": {"$gte": month_start.isoformat()}
        })
        if quote_count >= 5:
            raise HTTPException(status_code=403, detail="Limiet bereikt. Upgrade naar Pro voor onbeperkte offertes.")

    client_obj_id = parse_object_id(data.client_id, "client_id")
    client_doc = await db.clients.find_one({"_id": client_obj_id, "user_id": user["_id"]})
    if not client_doc:
        raise HTTPException(status_code=404, detail="Klant niet gevonden")

    quote_number = await get_next_number(user["_id"], "quote")
    items = [item.model_dump() for item in data.items]
    totals = calculate_totals(items)

    quote_data = {
        "user_id": user["_id"],
        "quote_number": quote_number,
        "client_id": data.client_id,
        "items": items,
        "notes": data.notes,
        "validity_days": data.validity_days,
        "valid_until": (datetime.now(timezone.utc) + timedelta(days=data.validity_days)).isoformat(),
        "status": "draft",
        "subtotal": totals["subtotal"],
        "vat_total": totals["vat_total"],
        "total": totals["total"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    result = await db.quotes.insert_one(quote_data)
    return {"id": str(result.inserted_id), "quote_number": quote_number, "message": "Offerte aangemaakt"}


@api_router.get("/quotes/{quote_id}")
async def get_quote(quote_id: str, request: Request):
    user = await get_current_user(request)
    quote_doc = await db.quotes.find_one({"_id": parse_object_id(quote_id, "quote_id"), "user_id": user["_id"]})
    if not quote_doc:
        raise HTTPException(status_code=404, detail="Offerte niet gevonden")
    quote_doc["id"] = str(quote_doc["_id"])
    del quote_doc["_id"]

    if quote_doc.get("client_id") and ObjectId.is_valid(quote_doc["client_id"]):
        client_doc = await db.clients.find_one({"_id": ObjectId(quote_doc["client_id"])})
        if client_doc:
            quote_doc["client"] = {
                "id": str(client_doc["_id"]),
                "name": client_doc.get("name", ""),
                "company_name": client_doc.get("company_name", ""),
                "email": client_doc.get("email", ""),
                "address": client_doc.get("address", ""),
                "postal_code": client_doc.get("postal_code", ""),
                "city": client_doc.get("city", "")
            }
    return quote_doc


@api_router.put("/quotes/{quote_id}")
async def update_quote(quote_id: str, data: QuoteUpdate, request: Request):
    user = await get_current_user(request)
    update_data = {}

    if data.items is not None:
        items = [item.model_dump() for item in data.items]
        totals = calculate_totals(items)
        update_data["items"] = items
        update_data["subtotal"] = totals["subtotal"]
        update_data["vat_total"] = totals["vat_total"]
        update_data["total"] = totals["total"]

    if data.notes is not None:
        update_data["notes"] = data.notes
    if data.validity_days is not None:
        update_data["validity_days"] = data.validity_days
        update_data["valid_until"] = (datetime.now(timezone.utc) + timedelta(days=data.validity_days)).isoformat()
    if data.status is not None:
        update_data["status"] = data.status

    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    result = await db.quotes.update_one(
        {"_id": parse_object_id(quote_id, "quote_id"), "user_id": user["_id"]},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Offerte niet gevonden")
    return {"message": "Offerte bijgewerkt"}


@api_router.delete("/quotes/{quote_id}")
async def delete_quote(quote_id: str, request: Request):
    user = await get_current_user(request)
    result = await db.quotes.delete_one({"_id": parse_object_id(quote_id, "quote_id"), "user_id": user["_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Offerte niet gevonden")
    return {"message": "Offerte verwijderd"}


@api_router.post("/quotes/{quote_id}/duplicate")
async def duplicate_quote(quote_id: str, request: Request):
    user = await get_current_user(request)
    quote_doc = await db.quotes.find_one({"_id": parse_object_id(quote_id, "quote_id"), "user_id": user["_id"]})
    if not quote_doc:
        raise HTTPException(status_code=404, detail="Offerte niet gevonden")

    quote_number = await get_next_number(user["_id"], "quote")
    new_quote = {
        "user_id": user["_id"],
        "quote_number": quote_number,
        "client_id": quote_doc["client_id"],
        "items": quote_doc["items"],
        "notes": quote_doc.get("notes", ""),
        "validity_days": quote_doc.get("validity_days", 30),
        "valid_until": (datetime.now(timezone.utc) + timedelta(days=quote_doc.get("validity_days", 30))).isoformat(),
        "status": "draft",
        "subtotal": quote_doc["subtotal"],
        "vat_total": quote_doc["vat_total"],
        "total": quote_doc["total"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    result = await db.quotes.insert_one(new_quote)
    return {"id": str(result.inserted_id), "quote_number": quote_number, "message": "Offerte gedupliceerd"}


@api_router.post("/quotes/{quote_id}/convert")
async def convert_quote_to_invoice(quote_id: str, request: Request):
    user = await get_current_user(request)
    quote_obj_id = parse_object_id(quote_id, "quote_id")
    quote_doc = await db.quotes.find_one({"_id": quote_obj_id, "user_id": user["_id"]})
    if not quote_doc:
        raise HTTPException(status_code=404, detail="Offerte niet gevonden")

    invoice_number = await get_next_number(user["_id"], "invoice")
    invoice_data = {
        "user_id": user["_id"],
        "invoice_number": invoice_number,
        "client_id": quote_doc["client_id"],
        "items": quote_doc["items"],
        "notes": quote_doc.get("notes", ""),
        "from_quote_id": quote_id,
        "status": "draft",
        "subtotal": quote_doc["subtotal"],
        "vat_total": quote_doc["vat_total"],
        "total": quote_doc["total"],
        "due_date": (datetime.now(timezone.utc) + timedelta(days=14)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    result = await db.invoices.insert_one(invoice_data)

    await db.quotes.update_one(
        {"_id": quote_obj_id},
        {"$set": {"status": "accepted"}}
    )

    return {"id": str(result.inserted_id), "invoice_number": invoice_number, "message": "Factuur aangemaakt van offerte"}


# ============ INVOICE ROUTES ============

@api_router.get("/invoices")
async def get_invoices(request: Request, status: str = ""):
    user = await get_current_user(request)
    query = {"user_id": user["_id"]}
    if status:
        query["status"] = status

    result = []
    async for invoice_doc in db.invoices.find(query).sort("created_at", -1):
        invoice_doc["id"] = str(invoice_doc["_id"])
        del invoice_doc["_id"]

        if invoice_doc.get("client_id") and ObjectId.is_valid(invoice_doc["client_id"]):
            client_doc = await db.clients.find_one({"_id": ObjectId(invoice_doc["client_id"])})
            if client_doc:
                invoice_doc["client_name"] = client_doc.get("name", "")
                invoice_doc["client_company"] = client_doc.get("company_name", "")
        result.append(invoice_doc)
    return result


@api_router.post("/invoices")
async def create_invoice(data: InvoiceCreate, request: Request):
    user = await get_current_user(request)

    subscription = user.get("subscription", "free")
    if subscription == "free":
        month_start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        invoice_count = await db.invoices.count_documents({
            "user_id": user["_id"],
            "created_at": {"$gte": month_start.isoformat()}
        })
        if invoice_count >= 5:
            raise HTTPException(status_code=403, detail="Limiet bereikt. Upgrade naar Pro voor onbeperkte facturen.")

    client_obj_id = parse_object_id(data.client_id, "client_id")
    client_doc = await db.clients.find_one({"_id": client_obj_id, "user_id": user["_id"]})
    if not client_doc:
        raise HTTPException(status_code=404, detail="Klant niet gevonden")

    company = await db.companies.find_one({"user_id": user["_id"]})
    payment_terms = company.get("payment_terms", 14) if company else 14

    invoice_number = await get_next_number(user["_id"], "invoice")
    items = [item.model_dump() for item in data.items]
    totals = calculate_totals(items)

    invoice_data = {
        "user_id": user["_id"],
        "invoice_number": invoice_number,
        "client_id": data.client_id,
        "items": items,
        "notes": data.notes,
        "from_quote_id": data.from_quote_id,
        "status": "draft",
        "subtotal": totals["subtotal"],
        "vat_total": totals["vat_total"],
        "total": totals["total"],
        "due_date": (datetime.now(timezone.utc) + timedelta(days=payment_terms)).isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    }

    result = await db.invoices.insert_one(invoice_data)
    return {"id": str(result.inserted_id), "invoice_number": invoice_number, "message": "Factuur aangemaakt"}


@api_router.get("/invoices/{invoice_id}")
async def get_invoice(invoice_id: str, request: Request):
    user = await get_current_user(request)
    invoice_doc = await db.invoices.find_one({"_id": parse_object_id(invoice_id, "invoice_id"), "user_id": user["_id"]})
    if not invoice_doc:
        raise HTTPException(status_code=404, detail="Factuur niet gevonden")
    invoice_doc["id"] = str(invoice_doc["_id"])
    del invoice_doc["_id"]

    if invoice_doc.get("client_id") and ObjectId.is_valid(invoice_doc["client_id"]):
        client_doc = await db.clients.find_one({"_id": ObjectId(invoice_doc["client_id"])})
        if client_doc:
            invoice_doc["client"] = {
                "id": str(client_doc["_id"]),
                "name": client_doc.get("name", ""),
                "company_name": client_doc.get("company_name", ""),
                "email": client_doc.get("email", ""),
                "address": client_doc.get("address", ""),
                "postal_code": client_doc.get("postal_code", ""),
                "city": client_doc.get("city", "")
            }
    return invoice_doc


@api_router.put("/invoices/{invoice_id}")
async def update_invoice(invoice_id: str, data: InvoiceUpdate, request: Request):
    user = await get_current_user(request)
    update_data = {}

    if data.items is not None:
        items = [item.model_dump() for item in data.items]
        totals = calculate_totals(items)
        update_data["items"] = items
        update_data["subtotal"] = totals["subtotal"]
        update_data["vat_total"] = totals["vat_total"]
        update_data["total"] = totals["total"]

    if data.notes is not None:
        update_data["notes"] = data.notes
    if data.status is not None:
        update_data["status"] = data.status
        if data.status == "paid":
            update_data["paid_at"] = datetime.now(timezone.utc).isoformat()

    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()

    result = await db.invoices.update_one(
        {"_id": parse_object_id(invoice_id, "invoice_id"), "user_id": user["_id"]},
        {"$set": update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Factuur niet gevonden")
    return {"message": "Factuur bijgewerkt"}


@api_router.delete("/invoices/{invoice_id}")
async def delete_invoice(invoice_id: str, request: Request):
    user = await get_current_user(request)
    result = await db.invoices.delete_one({"_id": parse_object_id(invoice_id, "invoice_id"), "user_id": user["_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Factuur niet gevonden")
    return {"message": "Factuur verwijderd"}


@api_router.post("/invoices/{invoice_id}/mark-paid")
async def mark_invoice_paid(invoice_id: str, request: Request):
    user = await get_current_user(request)
    result = await db.invoices.update_one(
        {"_id": parse_object_id(invoice_id, "invoice_id"), "user_id": user["_id"]},
        {"$set": {"status": "paid", "paid_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Factuur niet gevonden")
    return {"message": "Factuur gemarkeerd als betaald"}


# ============ PDF GENERATION ============

def generate_pdf_html(doc_type: str, doc: dict, company: dict, client_doc: dict) -> str:
    logo_html = ""
    if company.get("logo_base64"):
        logo_html = f'<img src="{company["logo_base64"]}" style="max-height: 60px; max-width: 150px;" />'

    items_html = ""
    for item in doc.get("items", []):
        item_subtotal = item["quantity"] * item["unit_price"]
        items_html += f"""
        <tr>
            <td style="padding: 12px; border-bottom: 1px solid #E2DFDA;">{item["description"]}</td>
            <td style="padding: 12px; border-bottom: 1px solid #E2DFDA; text-align: center;">{item["quantity"]}</td>
            <td style="padding: 12px; border-bottom: 1px solid #E2DFDA; text-align: right;">€{item["unit_price"]:.2f}</td>
            <td style="padding: 12px; border-bottom: 1px solid #E2DFDA; text-align: center;">{item["vat_rate"]}%</td>
            <td style="padding: 12px; border-bottom: 1px solid #E2DFDA; text-align: right;">€{item_subtotal:.2f}</td>
        </tr>
        """

    doc_number = doc.get("invoice_number") if doc_type == "invoice" else doc.get("quote_number")
    doc_title = "FACTUUR" if doc_type == "invoice" else "OFFERTE"
    date_label = "Factuurdatum" if doc_type == "invoice" else "Offertedatum"

    date_str = parse_iso_date(doc.get("created_at", ""))

    extra_date = ""
    if doc_type == "invoice":
        due_date = doc.get("due_date", "")
        if due_date:
            extra_date = f"<p style='margin: 4px 0;'><strong>Vervaldatum:</strong> {parse_iso_date(due_date)}</p>"
    else:
        valid_until = doc.get("valid_until", "")
        if valid_until:
            extra_date = f"<p style='margin: 4px 0;'><strong>Geldig tot:</strong> {parse_iso_date(valid_until)}</p>"

    payment_info = ""
    if doc_type == "invoice":
        payment_info = f"""
        <div style="margin-top: 30px; padding: 20px; background: #F9F8F6; border-radius: 8px;">
            <h3 style="margin: 0 0 10px 0; color: #345e4f; font-size: 14px;">Betalingsinformatie</h3>
            <p style="margin: 4px 0; font-size: 13px;"><strong>IBAN:</strong> {company.get("iban", "")}</p>
            <p style="margin: 4px 0; font-size: 13px;"><strong>T.n.v.:</strong> {company.get("company_name", "")}</p>
            <p style="margin: 4px 0; font-size: 13px;"><strong>Referentie:</strong> {doc_number}</p>
        </div>
        """

    notes_html = ""
    if doc.get("notes"):
        notes_html = f"""
        <div style="margin-top: 20px;">
            <h3 style="margin: 0 0 10px 0; color: #345e4f; font-size: 14px;">Opmerkingen</h3>
            <p style="font-size: 13px; color: #5F6B66;">{doc["notes"]}</p>
        </div>
        """

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap');
            body {{
                font-family: 'Inter', sans-serif;
                color: #1C211F;
                line-height: 1.5;
                margin: 0;
                padding: 40px;
                font-size: 14px;
            }}
            .header {{
                display: flex;
                justify-content: space-between;
                margin-bottom: 40px;
            }}
            .company-info {{
                text-align: right;
            }}
            .company-info p {{
                margin: 2px 0;
                font-size: 12px;
                color: #5F6B66;
            }}
            .doc-title {{
                color: #345e4f;
                font-size: 28px;
                font-weight: 600;
                margin-bottom: 20px;
            }}
            .addresses {{
                display: flex;
                justify-content: space-between;
                margin-bottom: 30px;
            }}
            .address-block h3 {{
                color: #345e4f;
                font-size: 11px;
                text-transform: uppercase;
                letter-spacing: 0.1em;
                margin: 0 0 8px 0;
            }}
            .address-block p {{
                margin: 2px 0;
                font-size: 13px;
            }}
            table {{
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
            }}
            th {{
                background: #345e4f;
                color: white;
                padding: 12px;
                text-align: left;
                font-size: 12px;
                text-transform: uppercase;
                letter-spacing: 0.05em;
            }}
            th:nth-child(2), th:nth-child(4) {{
                text-align: center;
            }}
            th:nth-child(3), th:nth-child(5) {{
                text-align: right;
            }}
            .totals {{
                margin-top: 20px;
                text-align: right;
            }}
            .totals p {{
                margin: 6px 0;
                font-size: 14px;
            }}
            .totals .total {{
                font-size: 18px;
                font-weight: 600;
                color: #345e4f;
                padding-top: 10px;
                border-top: 2px solid #345e4f;
                display: inline-block;
            }}
        </style>
    </head>
    <body>
        <div class="header">
            <div>
                {logo_html}
            </div>
            <div class="company-info">
                <p style="font-weight: 600; font-size: 14px; color: #1C211F;">{company.get("company_name", "")}</p>
                <p>{company.get("address", "")}</p>
                <p>{company.get("postal_code", "")} {company.get("city", "")}</p>
                <p>KvK: {company.get("kvk_number", "")}</p>
                <p>BTW: {company.get("btw_number", "")}</p>
            </div>
        </div>

        <h1 class="doc-title">{doc_title}</h1>

        <div class="addresses">
            <div class="address-block">
                <h3>Klant</h3>
                <p style="font-weight: 500;">{client_doc.get("company_name") or client_doc.get("name", "")}</p>
                <p>{client_doc.get("name", "")}</p>
                <p>{client_doc.get("address", "")}</p>
                <p>{client_doc.get("postal_code", "")} {client_doc.get("city", "")}</p>
            </div>
            <div class="address-block" style="text-align: right;">
                <h3>Details</h3>
                <p><strong>{doc_title.lower().capitalize()}nummer:</strong> {doc_number}</p>
                <p><strong>{date_label}:</strong> {date_str}</p>
                {extra_date}
            </div>
        </div>

        <table>
            <thead>
                <tr>
                    <th>Omschrijving</th>
                    <th>Aantal</th>
                    <th>Prijs</th>
                    <th>BTW</th>
                    <th>Totaal</th>
                </tr>
            </thead>
            <tbody>
                {items_html}
            </tbody>
        </table>

        <div class="totals">
            <p><strong>Subtotaal:</strong> €{doc.get("subtotal", 0):.2f}</p>
            <p><strong>BTW:</strong> €{doc.get("vat_total", 0):.2f}</p>
            <p class="total"><strong>Totaal:</strong> €{doc.get("total", 0):.2f}</p>
        </div>

        {notes_html}
        {payment_info}
    </body>
    </html>
    """
    return html


@api_router.get("/quotes/{quote_id}/pdf")
async def get_quote_pdf(quote_id: str, request: Request):
    user = await get_current_user(request)
    quote_doc = await db.quotes.find_one({"_id": parse_object_id(quote_id, "quote_id"), "user_id": user["_id"]})
    if not quote_doc:
        raise HTTPException(status_code=404, detail="Offerte niet gevonden")

    company = await db.companies.find_one({"user_id": user["_id"]}) or {}
    client_doc = {}
    if quote_doc.get("client_id") and ObjectId.is_valid(quote_doc["client_id"]):
        client_doc = await db.clients.find_one({"_id": ObjectId(quote_doc["client_id"])}) or {}

    html_content = generate_pdf_html("quote", quote_doc, company, client_doc)
    pdf = HTML(string=html_content).write_pdf()

    return StreamingResponse(
        io.BytesIO(pdf),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=offerte-{quote_doc.get('quote_number', quote_id)}.pdf"}
    )


@api_router.get("/invoices/{invoice_id}/pdf")
async def get_invoice_pdf(invoice_id: str, request: Request):
    user = await get_current_user(request)
    invoice_doc = await db.invoices.find_one({"_id": parse_object_id(invoice_id, "invoice_id"), "user_id": user["_id"]})
    if not invoice_doc:
        raise HTTPException(status_code=404, detail="Factuur niet gevonden")

    company = await db.companies.find_one({"user_id": user["_id"]}) or {}
    client_doc = {}
    if invoice_doc.get("client_id") and ObjectId.is_valid(invoice_doc["client_id"]):
        client_doc = await db.clients.find_one({"_id": ObjectId(invoice_doc["client_id"])}) or {}

    html_content = generate_pdf_html("invoice", invoice_doc, company, client_doc)
    pdf = HTML(string=html_content).write_pdf()

    return StreamingResponse(
        io.BytesIO(pdf),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=factuur-{invoice_doc.get('invoice_number', invoice_id)}.pdf"}
    )


# ============ EMAIL (MOCKED) ============

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

    client_doc = await db.clients.find_one({"_id": ObjectId(client_id)})
    if not client_doc or not client_doc.get("email"):
        raise HTTPException(status_code=400, detail="Klant heeft geen e-mailadres")

    logger.info(f"[MOCK EMAIL] Sending quote {quote_doc['quote_number']} to {client_doc['email']}")

    await db.quotes.update_one(
        {"_id": quote_obj_id},
        {"$set": {"status": "sent", "sent_at": datetime.now(timezone.utc).isoformat()}}
    )

    return {"message": f"Offerte verzonden naar {client_doc['email']} (mock)"}


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

    client_doc = await db.clients.find_one({"_id": ObjectId(client_id)})
    if not client_doc or not client_doc.get("email"):
        raise HTTPException(status_code=400, detail="Klant heeft geen e-mailadres")

    logger.info(f"[MOCK EMAIL] Sending invoice {invoice_doc['invoice_number']} to {client_doc['email']}")

    await db.invoices.update_one(
        {"_id": invoice_obj_id},
        {"$set": {"status": "sent", "sent_at": datetime.now(timezone.utc).isoformat()}}
    )

    return {"message": f"Factuur verzonden naar {client_doc['email']} (mock)"}


# ============ WHATSAPP SHARING ============

@api_router.get("/quotes/{quote_id}/whatsapp")
async def get_quote_whatsapp_link(quote_id: str, request: Request):
    user = await get_current_user(request)
    quote_doc = await db.quotes.find_one({"_id": parse_object_id(quote_id, "quote_id"), "user_id": user["_id"]})
    if not quote_doc:
        raise HTTPException(status_code=404, detail="Offerte niet gevonden")

    company = await db.companies.find_one({"user_id": user["_id"]}) or {}
    company_name = company.get("company_name", "Faktuvi")

    message = f"Beste, hierbij ontvangt u offerte {quote_doc['quote_number']} van {company_name}. Totaalbedrag: €{quote_doc['total']:.2f}"
    whatsapp_url = f"https://wa.me/?text={quote(message)}"

    return {"whatsapp_url": whatsapp_url, "message": message}


@api_router.get("/invoices/{invoice_id}/whatsapp")
async def get_invoice_whatsapp_link(invoice_id: str, request: Request):
    user = await get_current_user(request)
    invoice_doc = await db.invoices.find_one({"_id": parse_object_id(invoice_id, "invoice_id"), "user_id": user["_id"]})
    if not invoice_doc:
        raise HTTPException(status_code=404, detail="Factuur niet gevonden")

    company = await db.companies.find_one({"user_id": user["_id"]}) or {}
    company_name = company.get("company_name", "Faktuvi")

    message = f"Beste, hierbij ontvangt u factuur {invoice_doc['invoice_number']} van {company_name}. Totaalbedrag: €{invoice_doc['total']:.2f}"
    whatsapp_url = f"https://wa.me/?text={quote(message)}"

    return {"whatsapp_url": whatsapp_url, "message": message}


# ============ STRIPE PAYMENTS ============

SUBSCRIPTION_PLANS = {
    "free": {"name": "Gratis", "price": 0.0, "features": ["5 offertes/maand", "5 facturen/maand", "Basis functies"]},
    "pro": {"name": "Pro", "price": 9.99, "features": ["Onbeperkt offertes", "Onbeperkt facturen", "Logo upload", "PDF branding", "Email verzenden"]},
    "business": {"name": "Business", "price": 24.99, "features": ["Alles in Pro", "Betaallinks (Stripe)", "Geavanceerde rapporten", "Prioriteit support"]}
}


@api_router.get("/subscription/plans")
async def get_subscription_plans():
    return SUBSCRIPTION_PLANS


@api_router.get("/subscription/current")
async def get_current_subscription(request: Request):
    user = await get_current_user(request)
    subscription = user.get("subscription", "free")
    return {
        "plan": subscription,
        "details": SUBSCRIPTION_PLANS.get(subscription, SUBSCRIPTION_PLANS["free"])
    }


@api_router.post("/subscription/checkout")
async def create_subscription_checkout(data: SubscriptionPlan, request: Request):
    user = await get_current_user(request)
    plan = data.plan

    plans = {
        "pro": 999,
        "business": 2499
    }

    if plan not in plans:
        raise HTTPException(status_code=400, detail="Plan inválido")

    origin = request.headers.get("origin", "http://localhost:3000")

    session = stripe.checkout.Session.create(
        mode="payment",
        success_url=f"{origin}/billing?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{origin}/billing",
        line_items=[
            {
                "price_data": {
                    "currency": "eur",
                    "product_data": {
                        "name": f"Plano {plan}"
                    },
                    "unit_amount": plans[plan],
                },
                "quantity": 1,
            }
        ],
        metadata={
            "user_id": user["_id"],
            "plan": plan,
            "type": "subscription"
        }
    )

    await db.payment_transactions.insert_one({
        "user_id": user["_id"],
        "session_id": session.id,
        "plan": plan,
        "type": "subscription",
        "payment_status": "pending"
    })

    return {"url": session.url}


@api_router.post("/invoices/{invoice_id}/payment-link")
async def create_invoice_payment_link(invoice_id: str, request: Request):
    user = await get_current_user(request)

    if user.get("subscription") != "business":
        raise HTTPException(status_code=403, detail="Business nodig")

    invoice = await db.invoices.find_one({
        "_id": parse_object_id(invoice_id, "invoice_id"),
        "user_id": user["_id"]
    })
    if not invoice:
        raise HTTPException(status_code=404, detail="Factuur niet gevonden")

    origin = request.headers.get("origin", "http://localhost:3000")

    session = stripe.checkout.Session.create(
        mode="payment",
        success_url=f"{origin}/payment-success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{origin}/invoices/{invoice_id}",
        line_items=[
            {
                "price_data": {
                    "currency": "eur",
                    "product_data": {
                        "name": f"Invoice {invoice['invoice_number']}"
                    },
                    "unit_amount": int(invoice["total"] * 100),
                },
                "quantity": 1,
            }
        ],
        metadata={
            "invoice_id": invoice_id,
            "type": "invoice_payment"
        }
    )

    await db.invoices.update_one(
        {"_id": parse_object_id(invoice_id, "invoice_id")},
        {"$set": {"payment_link": session.url}}
    )

    return {"url": session.url}


@api_router.get("/payments/status/{session_id}")
async def get_payment_status(session_id: str):
    session = stripe.checkout.Session.retrieve(session_id)

    if session.payment_status == "paid":
        transaction = await db.payment_transactions.find_one({
            "session_id": session_id
        })

        if transaction and transaction["payment_status"] != "paid":
            await db.payment_transactions.update_one(
                {"session_id": session_id},
                {"$set": {"payment_status": "paid"}}
            )

            if transaction["type"] == "subscription":
                await db.users.update_one(
                    {"_id": parse_object_id(transaction["user_id"], "user_id")},
                    {"$set": {"subscription": transaction["plan"]}}
                )

            if transaction["type"] == "invoice_payment":
                await db.invoices.update_one(
                    {"_id": parse_object_id(transaction["invoice_id"], "invoice_id")},
                    {"$set": {"status": "paid"}}
                )

    return {
        "status": session.status,
        "payment_status": session.payment_status
    }


# ============ DASHBOARD ============

@api_router.get("/dashboard")
async def get_dashboard(request: Request):
    user = await get_current_user(request)
    user_id = user["_id"]

    total_clients = await db.clients.count_documents({"user_id": user_id})
    total_quotes = await db.quotes.count_documents({"user_id": user_id})
    total_invoices = await db.invoices.count_documents({"user_id": user_id})

    paid_invoices = await db.invoices.find({"user_id": user_id, "status": "paid"}).to_list(1000)
    paid_revenue = sum(inv.get("total", 0) for inv in paid_invoices)

    unpaid_invoices = await db.invoices.find({"user_id": user_id, "status": {"$in": ["sent", "draft"]}}).to_list(1000)
    outstanding = sum(inv.get("total", 0) for inv in unpaid_invoices)

    recent_quotes = []
    async for quote_doc in db.quotes.find({"user_id": user_id}).sort("created_at", -1).limit(5):
        quote_doc["id"] = str(quote_doc["_id"])
        del quote_doc["_id"]
        if quote_doc.get("client_id") and ObjectId.is_valid(quote_doc["client_id"]):
            client_doc = await db.clients.find_one({"_id": ObjectId(quote_doc["client_id"])})
            if client_doc:
                quote_doc["client_name"] = client_doc.get("name", "")
        recent_quotes.append(quote_doc)

    recent_invoices = []
    async for invoice_doc in db.invoices.find({"user_id": user_id}).sort("created_at", -1).limit(5):
        invoice_doc["id"] = str(invoice_doc["_id"])
        del invoice_doc["_id"]
        if invoice_doc.get("client_id") and ObjectId.is_valid(invoice_doc["client_id"]):
            client_doc = await db.clients.find_one({"_id": ObjectId(invoice_doc["client_id"])})
            if client_doc:
                invoice_doc["client_name"] = client_doc.get("name", "")
        recent_invoices.append(invoice_doc)

    return {
        "total_clients": total_clients,
        "total_quotes": total_quotes,
        "total_invoices": total_invoices,
        "paid_revenue": round(paid_revenue, 2),
        "outstanding": round(outstanding, 2),
        "recent_quotes": recent_quotes,
        "recent_invoices": recent_invoices
    }


# ============ SETUP ============

app.include_router(api_router)

cors_env = os.environ.get("CORS_ORIGINS") or os.environ.get("FRONTEND_URL") or "http://localhost:3000"
allow_origins = [origin.strip() for origin in cors_env.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=allow_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup_event():
    await db.users.create_index("email", unique=True)
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
    await db.login_attempts.create_index("identifier")
    await db.clients.create_index([("user_id", 1)])
    await db.quotes.create_index([("user_id", 1), ("created_at", -1)])
    await db.invoices.create_index([("user_id", 1), ("created_at", -1)])
    await db.payment_transactions.create_index("session_id")
    logger.info("Database indexes created")


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

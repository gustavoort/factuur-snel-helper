"""End-to-end API checks against a running backend and a throwaway MongoDB.

These tests never touch production. They run only when FAKTUVI_API_URL and
FAKTUVI_TEST_MONGO_URL are set (the CI job starts the patched backend and a
MongoDB service container); otherwise they are skipped.

Covered:
- account isolation: one account can never list, read, change, delete, render,
  share, convert or reference another account's clients, quotes and invoices;
- plan rules: Free limits, Pro/Business-only features and fail-closed
  entitlements when the billing state is incomplete;
- sessions: refresh issues a new access token, logout signs out, and a
  password reset revokes every session opened before it;
- the Stripe webhook rejects unsigned requests.
"""

import json
import os
import secrets
import time
import uuid
from datetime import datetime, timedelta, timezone

import pytest

requests = pytest.importorskip("requests")

API_URL = os.environ.get("FAKTUVI_API_URL", "").rstrip("/")
MONGO_URL = os.environ.get("FAKTUVI_TEST_MONGO_URL", "")
DB_NAME = os.environ.get("FAKTUVI_TEST_DB_NAME", "faktuvi_ci")
ORIGIN = os.environ.get("FAKTUVI_TEST_ORIGIN", "http://localhost:3000")

pytestmark = pytest.mark.skipif(
    not API_URL or not MONGO_URL,
    reason="FAKTUVI_API_URL and FAKTUVI_TEST_MONGO_URL are required for API integration tests",
)

ITEM = [{"description": "CI regel", "quantity": 1, "unit_price": 100, "vat_rate": 21}]


@pytest.fixture(scope="module")
def mongo_db():
    pymongo = pytest.importorskip("pymongo")
    if "localhost" not in MONGO_URL and "127.0.0.1" not in MONGO_URL:
        pytest.fail("Refusing to run integration tests against a non-local MongoDB")
    client = pymongo.MongoClient(MONGO_URL)
    yield client[DB_NAME]
    client.close()


def new_account(label: str):
    session = requests.Session()
    session.headers.update({"Origin": ORIGIN})
    email = f"ci-{label.lower()}-{uuid.uuid4().hex[:10]}@ci.faktuvi.nl"
    password = secrets.token_urlsafe(18)
    response = session.post(
        f"{API_URL}/auth/register",
        json={"email": email, "password": password, "name": f"CI Test {label}"},
    )
    assert response.status_code == 200, response.text
    return session, response.json()["id"]


def set_plan(mongo_db, user_id: str, plan: str, status="active", subscription_id="sub_ci_test"):
    from bson import ObjectId

    update = {"subscription": plan, "subscription_status": status}
    if subscription_id is None:
        mongo_db.users.update_one({"_id": ObjectId(user_id)}, {"$set": update, "$unset": {"stripe_subscription_id": ""}})
    else:
        update["stripe_subscription_id"] = subscription_id
        mongo_db.users.update_one({"_id": ObjectId(user_id)}, {"$set": update})


def items_of(payload, key):
    if isinstance(payload, list):
        return payload
    return payload.get("items", payload.get(key, []))


@pytest.fixture(scope="module")
def two_accounts(mongo_db):
    a, a_id = new_account("A")
    b, b_id = new_account("B")
    # Pro so A's own send-email/PDF paths are reachable; B stays on Free.
    set_plan(mongo_db, a_id, "business")
    client_id = a.post(f"{API_URL}/clients", json={"name": "CI Klant A", "city": "Groningen"}).json()["id"]
    quote = a.post(f"{API_URL}/quotes", json={"client_id": client_id, "items": ITEM})
    invoice = a.post(f"{API_URL}/invoices", json={"client_id": client_id, "items": ITEM})
    assert quote.status_code == 200, quote.text
    assert invoice.status_code == 200, invoice.text
    ids = {"clients": client_id, "quotes": quote.json()["id"], "invoices": invoice.json()["id"]}
    snapshot = {kind: a.get(f"{API_URL}/{kind}/{value}").json() for kind, value in ids.items()}
    return {"a": a, "b": b, "ids": ids, "snapshot": snapshot, "b_id": b_id}


def assert_denied(response):
    assert response.status_code in (403, 404), f"{response.request.method} {response.request.url} -> {response.status_code} {response.text[:200]}"


def test_other_account_lists_and_dashboard_are_empty(two_accounts):
    b, ids = two_accounts["b"], two_accounts["ids"]
    for kind in ("clients", "quotes", "invoices"):
        listed = items_of(b.get(f"{API_URL}/{kind}").json(), kind)
        assert not any(row.get("id") in ids.values() for row in listed), kind
    assert "CI Klant A" not in json.dumps(b.get(f"{API_URL}/dashboard").json())


def test_other_account_cannot_read_change_or_use_documents(two_accounts):
    b, ids = two_accounts["b"], two_accounts["ids"]
    for kind, value in ids.items():
        assert_denied(b.get(f"{API_URL}/{kind}/{value}"))
    assert_denied(b.put(f"{API_URL}/clients/{ids['clients']}", json={"name": "HACKED"}))
    assert_denied(b.put(f"{API_URL}/quotes/{ids['quotes']}", json={"notes": "HACKED"}))
    assert_denied(b.put(f"{API_URL}/invoices/{ids['invoices']}", json={"notes": "HACKED", "status": "paid"}))
    for kind in ("quotes", "invoices"):
        value = ids[kind]
        assert_denied(b.get(f"{API_URL}/{kind}/{value}/pdf"))
        assert_denied(b.get(f"{API_URL}/{kind}/{value}/whatsapp"))
        assert_denied(b.post(f"{API_URL}/{kind}/{value}/send-email", json={}))
    assert_denied(b.post(f"{API_URL}/quotes/{ids['quotes']}/duplicate"))
    assert_denied(b.post(f"{API_URL}/quotes/{ids['quotes']}/convert"))
    assert_denied(b.post(f"{API_URL}/invoices/{ids['invoices']}/mark-paid"))
    assert_denied(b.post(f"{API_URL}/invoices/{ids['invoices']}/payment-link"))
    assert_denied(b.post(f"{API_URL}/quotes", json={"client_id": ids["clients"], "items": ITEM}))
    assert_denied(b.post(f"{API_URL}/invoices", json={"client_id": ids["clients"], "items": ITEM}))
    assert_denied(b.get(f"{API_URL}/payments/status/cs_test_not_owned"))


def test_other_account_cannot_reference_foreign_quote(two_accounts):
    b, ids = two_accounts["b"], two_accounts["ids"]
    own_client = b.post(f"{API_URL}/clients", json={"name": "CI Klant B"}).json()["id"]
    response = b.post(
        f"{API_URL}/invoices",
        json={"client_id": own_client, "items": ITEM, "from_quote_id": ids["quotes"]},
    )
    assert_denied(response)


def test_other_account_cannot_delete_and_owner_data_is_unchanged(two_accounts):
    a, b, ids = two_accounts["a"], two_accounts["b"], two_accounts["ids"]
    for kind, value in ids.items():
        assert_denied(b.delete(f"{API_URL}/{kind}/{value}"))
    for kind, value in ids.items():
        assert a.get(f"{API_URL}/{kind}/{value}").json() == two_accounts["snapshot"][kind], kind
    assert b.get(f"{API_URL}/company").json().get("owner_name") == "CI Test B"


def test_free_plan_limits_and_paid_features(mongo_db):
    free, _ = new_account("Free")
    client_id = free.post(f"{API_URL}/clients", json={"name": "CI Klant Free"}).json()["id"]
    for _ in range(5):
        assert free.post(f"{API_URL}/invoices", json={"client_id": client_id, "items": ITEM}).status_code == 200
    sixth = free.post(f"{API_URL}/invoices", json={"client_id": client_id, "items": ITEM})
    assert sixth.status_code == 403
    invoice_id = items_of(free.get(f"{API_URL}/invoices").json(), "invoices")[0]["id"]
    assert free.post(f"{API_URL}/invoices/{invoice_id}/send-email", json={}).status_code == 403
    assert free.post(f"{API_URL}/invoices/{invoice_id}/payment-link").status_code == 403


def test_pro_is_unlimited_but_not_business(mongo_db):
    pro, pro_id = new_account("Pro")
    set_plan(mongo_db, pro_id, "pro")
    client_id = pro.post(f"{API_URL}/clients", json={"name": "CI Klant Pro"}).json()["id"]
    for _ in range(6):
        assert pro.post(f"{API_URL}/invoices", json={"client_id": client_id, "items": ITEM}).status_code == 200
    invoice_id = items_of(pro.get(f"{API_URL}/invoices").json(), "invoices")[0]["id"]
    assert pro.post(f"{API_URL}/invoices/{invoice_id}/payment-link").status_code == 403


@pytest.mark.parametrize(
    "status, subscription_id",
    [("past_due", "sub_ci_test"), ("canceled", "sub_ci_test"), ("active", None), ("", "sub_ci_test")],
)
def test_paid_plan_without_valid_billing_state_falls_back_to_free(mongo_db, status, subscription_id):
    user, user_id = new_account("Stale")
    set_plan(mongo_db, user_id, "business", status=status, subscription_id=subscription_id)
    client_id = user.post(f"{API_URL}/clients", json={"name": "CI Klant Stale"}).json()["id"]
    invoice_id = user.post(f"{API_URL}/invoices", json={"client_id": client_id, "items": ITEM}).json()["id"]
    assert user.post(f"{API_URL}/invoices/{invoice_id}/payment-link").status_code == 403
    assert user.post(f"{API_URL}/invoices/{invoice_id}/send-email", json={}).status_code == 403


def test_unauthenticated_requests_are_rejected():
    anonymous = requests.Session()
    for path in ("/auth/me", "/dashboard", "/clients", "/invoices", "/subscription/current"):
        assert anonymous.get(f"{API_URL}{path}").status_code == 401, path


def test_stripe_webhook_rejects_unsigned_and_forged_requests():
    body = json.dumps({"id": "evt_forged", "type": "checkout.session.completed"})
    unsigned = requests.post(f"{API_URL}/webhook/stripe", data=body, headers={"Content-Type": "application/json"})
    assert unsigned.status_code == 400
    forged = requests.post(
        f"{API_URL}/webhook/stripe",
        data=body,
        headers={"Content-Type": "application/json", "Stripe-Signature": "t=1,v1=deadbeef"},
    )
    assert forged.status_code == 400


def new_account_with_password(label: str):
    session = requests.Session()
    session.headers.update({"Origin": ORIGIN})
    email = f"ci-{label.lower()}-{uuid.uuid4().hex[:10]}@ci.faktuvi.nl"
    password = secrets.token_urlsafe(18)
    response = session.post(
        f"{API_URL}/auth/register",
        json={"email": email, "password": password, "name": f"CI Test {label}"},
    )
    assert response.status_code == 200, response.text
    return session, response.json()["id"], email, password


def test_refresh_token_renews_an_expired_access_token():
    session, _ = new_account("Refresh")
    assert session.get(f"{API_URL}/auth/me").status_code == 200
    # Simulate an expired access token: only the refresh cookie is left.
    session.cookies.clear(domain=session.cookies.list_domains()[0], path="/", name="access_token")
    assert session.get(f"{API_URL}/auth/me").status_code == 401
    assert session.post(f"{API_URL}/auth/refresh").status_code == 200
    assert session.get(f"{API_URL}/auth/me").status_code == 200


def test_refresh_without_refresh_token_is_rejected():
    session, _ = new_account("NoRefresh")
    session.cookies.clear()
    assert session.post(f"{API_URL}/auth/refresh").status_code == 401
    assert session.get(f"{API_URL}/auth/me").status_code == 401


def test_logout_clears_the_session():
    session, _ = new_account("Logout")
    assert session.post(f"{API_URL}/auth/logout").status_code == 200
    assert session.get(f"{API_URL}/auth/me").status_code == 401


def test_password_reset_revokes_existing_sessions(mongo_db):
    old_session, user_id, email, _ = new_account_with_password("Reset")
    refresh_cookie = old_session.cookies.get("refresh_token")
    assert old_session.get(f"{API_URL}/auth/me").status_code == 200
    # JWT iat has one-second precision: make sure the reset is in a later second.
    time.sleep(1.2)

    token = secrets.token_urlsafe(32)
    mongo_db.password_reset_tokens.insert_one({
        "token": token,
        "user_id": user_id,
        "expires_at": datetime.now(timezone.utc) + timedelta(hours=1),
        "used": False,
    })
    new_password = secrets.token_urlsafe(18)
    reset = requests.post(
        f"{API_URL}/auth/reset-password",
        json={"token": token, "new_password": new_password},
        headers={"Origin": ORIGIN},
    )
    assert reset.status_code == 200, reset.text

    # Both the old access token and the old refresh token stop working.
    assert old_session.get(f"{API_URL}/auth/me").status_code == 401
    stolen = requests.Session()
    stolen.headers.update({"Origin": ORIGIN})
    stolen.cookies.set("refresh_token", refresh_cookie)
    assert stolen.post(f"{API_URL}/auth/refresh").status_code == 401

    # A fresh login with the new password works right away.
    fresh = requests.Session()
    fresh.headers.update({"Origin": ORIGIN})
    login = fresh.post(f"{API_URL}/auth/login", json={"email": email, "password": new_password})
    assert login.status_code == 200, login.text
    assert fresh.get(f"{API_URL}/auth/me").status_code == 200

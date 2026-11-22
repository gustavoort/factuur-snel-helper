import ast
import asyncio
import hashlib
import shutil
import subprocess
import sys
import tempfile
import threading
from copy import deepcopy
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest


BACKEND_DIR = Path(__file__).parent


def build_patched_source() -> str:
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        shutil.copy(BACKEND_DIR / "server.py", temp_path / "server.py")
        shutil.copy(BACKEND_DIR / "patch_server.py", temp_path / "patch_server.py")
        subprocess.run(
            [sys.executable, "patch_server.py"],
            cwd=temp_path,
            check=True,
            capture_output=True,
            text=True,
        )
        return (temp_path / "server.py").read_text(encoding="utf-8")


def test_patch_is_idempotent_and_generated_source_compiles():
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        shutil.copy(BACKEND_DIR / "server.py", temp_path / "server.py")
        shutil.copy(BACKEND_DIR / "patch_server.py", temp_path / "patch_server.py")

        subprocess.run(
            [sys.executable, "patch_server.py"],
            cwd=temp_path,
            check=True,
            capture_output=True,
            text=True,
        )
        first_hash = hashlib.sha256((temp_path / "server.py").read_bytes()).hexdigest()
        subprocess.run(
            [sys.executable, "patch_server.py"],
            cwd=temp_path,
            check=True,
            capture_output=True,
            text=True,
        )
        second_hash = hashlib.sha256((temp_path / "server.py").read_bytes()).hexdigest()
        source = (temp_path / "server.py").read_text(encoding="utf-8")
        ast.parse(source)
        assert "async def claim_webhook_event" in source
        assert 'create_index("event_id", unique=True)' in source
        assert first_hash == second_hash


def assert_no_update_path_conflict(update):
    """Mirror MongoDB: one update may not touch the same path with two operators."""
    seen = {}
    for operator, fields in update.items():
        for field in fields:
            if field in seen:
                raise AssertionError(
                    f"Updating the path '{field}' would create a conflict at '{field}' "
                    f"({seen[field]} and {operator})"
                )
            seen[field] = operator


class DuplicateKeyError(Exception):
    pass


class FakeWebhookCollection:
    def __init__(self):
        self.document = None
        self.effects = []
        self.lock = threading.Lock()

    async def find_one_and_update(self, query, update, *, upsert=False, return_document=None, session=None):
        with self.lock:
            assert_no_update_path_conflict(update)
            now = datetime.now(timezone.utc)
            current = session.working_event if session else self.document
            if session:
                matches = (
                    current is not None
                    and all(current.get(key) == value for key, value in query.items() if key != "lease_until")
                    and current.get("lease_until", datetime.min.replace(tzinfo=timezone.utc))
                    > query["lease_until"]["$gt"]
                )
                if not matches:
                    return None
                current.update(update.get("$set", {}))
                for key, value in update.get("$inc", {}).items():
                    current[key] = current.get(key, 0) + value
                return deepcopy(current)
            matches = current is not None and (
                current["status"] in {"pending", "failed"}
                or (
                    current["status"] == "processing"
                    and current.get("lease_until") <= now
                )
            )
            if not matches:
                if current is not None:
                    raise DuplicateKeyError()
                self.document = {
                    "event_id": update["$setOnInsert"]["event_id"],
                    "payload": update["$setOnInsert"]["payload"],
                    "received_at": update["$setOnInsert"]["received_at"],
                    "status": "pending",
                    "attempts": 0,
                }
                current = session.working_event if session else self.document
            current.update(update["$set"])
            current["attempts"] += update["$inc"]["attempts"]
            return deepcopy(current)

    async def find_one(self, query, session=None):
        with self.lock:
            return deepcopy(session.working_event if session else self.document)

    async def update_one(self, query, update, session=None):
        with self.lock:
            assert_no_update_path_conflict(update)
            current = session.working_event if session else self.document
            if current is None:
                return type("Result", (), {"matched_count": 0})()
            def matches(document):
                for key, value in query.items():
                    if isinstance(value, dict) and "$gt" in value:
                        if document.get(key) is None or document[key] <= value["$gt"]:
                            return False
                    elif document.get(key) != value:
                        return False
                return True

            if not matches(current):
                return type("Result", (), {"matched_count": 0})()
            if session and not matches(self.document):
                return type("Result", (), {"matched_count": 0})()
            current.update(update.get("$set", {}))
            for key in update.get("$unset", {}):
                current.pop(key, None)
            return type("Result", (), {"matched_count": 1})()


class FakeTransaction:
    def __init__(self, session):
        self.session = session

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, traceback):
        if exc_type is None:
            self.session.store.document = deepcopy(self.session.working_event)
            self.session.store.effects.extend(self.session.working_effects)
        return False


class FakeMongoSession:
    def __init__(self, store):
        self.store = store
        self.working_event = deepcopy(store.document)
        self.working_effects = []

    def start_transaction(self):
        return FakeTransaction(self)

    def stage_effect(self, value):
        self.working_effects.append(value)

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, traceback):
        return False


class FakeMongoClient:
    def __init__(self, store):
        self.store = store

    async def start_session(self):
        return FakeMongoSession(self.store)


def load_webhook_state_functions():
    source = ast.parse(build_patched_source())
    nodes = [
        node
        for node in source.body
        if isinstance(node, (ast.Assign, ast.AsyncFunctionDef))
        and (
            (isinstance(node, ast.Assign) and any(
                isinstance(target, ast.Name)
                and target.id == "WEBHOOK_PROCESSING_LEASE"
                for target in node.targets
            ))
            or (
                isinstance(node, ast.AsyncFunctionDef)
                and node.name in {
                    "claim_webhook_event",
                    "complete_webhook_event",
                    "fail_webhook_event",
                    "run_fenced_webhook_effect",
                }
            )
        )
    ]
    namespace = {
        "datetime": datetime,
        "timezone": timezone,
        "timedelta": timedelta,
        "ReturnDocument": type("ReturnDocument", (), {"AFTER": object()}),
        "DuplicateKeyError": DuplicateKeyError,
        "secrets": type("Secrets", (), {"token_urlsafe": staticmethod(lambda _: "generated")}),
        "db": type("DB", (), {"stripe_webhook_events": FakeWebhookCollection()})(),
    }
    namespace["client"] = FakeMongoClient(namespace["db"].stripe_webhook_events)
    exec(compile(ast.Module(body=nodes, type_ignores=[]), "<webhook>", "exec"), namespace)
    collection = namespace["db"].stripe_webhook_events
    return (
        namespace["claim_webhook_event"],
        namespace["complete_webhook_event"],
        namespace["fail_webhook_event"],
        namespace["run_fenced_webhook_effect"],
        collection,
    )


def test_first_duplicate_concurrent_and_abandoned_claims():
    claim, _, _, _, collection = load_webhook_state_functions()

    assert asyncio.run(claim("evt_1", {"id": "evt_1"}, "token_a"))
    assert not asyncio.run(claim("evt_1", {"id": "evt_1"}, "token_b"))

    collection.document["status"] = "processing"
    collection.document["lease_until"] = datetime.now(timezone.utc) - timedelta(minutes=1)
    assert asyncio.run(claim("evt_1", {"id": "evt_1"}, "token_c"))
    assert collection.document["claim_token"] == "token_c"


def test_two_workers_only_one_claims():
    claim, _, _, _, _ = load_webhook_state_functions()
    results = []

    def worker(token):
        results.append(asyncio.run(claim("evt_concurrent", {"id": "evt_concurrent"}, token)))

    threads = [threading.Thread(target=worker, args=(f"token_{index}",)) for index in range(2)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()

    assert sorted(results) == [False, True]


def test_failure_is_persisted_and_retry_can_complete():
    claim, complete, fail, _, collection = load_webhook_state_functions()

    assert asyncio.run(claim("evt_retry", {"id": "evt_retry"}, "token_a"))
    asyncio.run(fail("evt_retry", "token_a", RuntimeError("temporary failure")))
    assert collection.document["status"] == "failed"
    assert "temporary failure" in collection.document["last_error"]

    assert asyncio.run(claim("evt_retry", {"id": "evt_retry"}, "token_b"))
    asyncio.run(complete("evt_retry", "token_b"))
    assert collection.document["status"] == "completed"
    assert collection.document["last_error"] is None


def test_old_worker_cannot_commit_effect_after_lease_is_fenced():
    claim, _, _, run_effect, collection = load_webhook_state_functions()
    assert asyncio.run(claim("evt_fenced", {"id": "evt_fenced"}, "token_a"))

    async def stale_effect(session):
        session.stage_effect("subscription-updated")
        collection.document.update({
            "status": "processing",
            "claim_token": "token_b",
            "lease_until": datetime.now(timezone.utc) + timedelta(minutes=5),
        })

    with pytest.raises(RuntimeError, match="fenced"):
        asyncio.run(run_effect("evt_fenced", "token_a", stale_effect))

    assert collection.effects == []
    assert collection.document["claim_token"] == "token_b"


def test_fenced_effect_commits_only_after_valid_claim():
    claim, _, _, run_effect, collection = load_webhook_state_functions()
    assert asyncio.run(claim("evt_commit", {"id": "evt_commit"}, "token_a"))

    async def effect(session):
        session.stage_effect("invoice-paid")

    asyncio.run(run_effect("evt_commit", "token_a", effect))
    assert collection.effects == ["invoice-paid"]
    assert collection.document["claim_token"] == "token_a"


def test_webhook_failure_is_retryable_and_ordering_guards_exist():
    source = build_patched_source()
    tree = ast.parse(source)
    webhook = next(node for node in tree.body if isinstance(node, ast.AsyncFunctionDef) and node.name == "stripe_webhook")
    webhook_source = ast.get_source_segment(source, webhook)
    assert "fail_webhook_event" in webhook_source
    assert "status_code=503" in webhook_source
    assert "complete_webhook_event" in webhook_source
    assert '"subscription_event_created"' in source
    assert '"$lt": event_created' in source
    assert "event_created <= 0" in webhook_source
    assert "Could not persist failed Stripe webhook state" in webhook_source


def test_invalid_metadata_is_not_processed_as_an_entitlement():
    source = build_patched_source()
    assert 'if user_id and ObjectId.is_valid(str(user_id)) and plan in PAID_PLAN_AMOUNTS:' in source
    assert 'if not user_id or not ObjectId.is_valid(user_id):' in source


def test_claim_succeeds_when_mongo_returns_truncated_naive_datetimes():
    """MongoDB stores datetimes with millisecond precision and returns them
    timezone-naive by default. The claim must still be recognised."""
    claim, complete, _, _, collection = load_webhook_state_functions()
    original = collection.find_one_and_update

    async def mongo_like_find_one_and_update(*args, **kwargs):
        doc = await original(*args, **kwargs)
        if doc and isinstance(doc.get("lease_until"), datetime):
            value = doc["lease_until"]
            doc["lease_until"] = value.replace(
                microsecond=(value.microsecond // 1000) * 1000, tzinfo=None
            )
        return doc

    collection.find_one_and_update = mongo_like_find_one_and_update
    assert asyncio.run(claim("evt_mongo", {"id": "evt_mongo"}, "token_mongo"))
    asyncio.run(complete("evt_mongo", "token_mongo"))
    assert collection.document["status"] == "completed"
    assert not asyncio.run(claim("evt_mongo", {"id": "evt_mongo"}, "token_retry"))


def test_local_subscription_status_treats_portal_cancel_at_as_pending_cancellation():
    source = build_patched_source()
    node = next(
        node
        for node in ast.parse(source).body
        if isinstance(node, ast.FunctionDef) and node.name == "local_subscription_status"
    )
    namespace: dict = {}
    exec(ast.get_source_segment(source, node), namespace)
    status_of = namespace["local_subscription_status"]

    # Billing Portal cancellation (sets cancel_at, not cancel_at_period_end).
    assert status_of({"status": "active", "cancel_at_period_end": False, "cancel_at": 1797943698}) == "cancel_at_period_end"
    assert status_of({"status": "active", "cancel_at_period_end": True, "cancel_at": None}) == "cancel_at_period_end"
    assert status_of({"status": "active", "cancel_at_period_end": False, "cancel_at": None}) == "active"
    assert status_of({"status": "canceled", "cancel_at": 1797943698}) == "canceled"
    assert status_of({"status": "past_due"}) == "past_due"

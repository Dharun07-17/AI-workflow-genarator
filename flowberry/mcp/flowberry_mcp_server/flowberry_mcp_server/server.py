import os
import re
import sys
import time
from dataclasses import dataclass
from typing import Any

import httpx
import jwt
from mcp.server.fastmcp import FastMCP


class FlowberryAuthError(RuntimeError):
    pass


_UUID_RE = re.compile(r"^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$")


def _normalize_uuid(value: str, field_name: str) -> str:
    # Some UIs wrap UUIDs with newlines/spaces; remove all whitespace defensively.
    normalized = re.sub(r"\s+", "", (value or ""))
    if not normalized:
        raise ValueError(f"{field_name} cannot be empty")
    if not _UUID_RE.match(normalized):
        raise ValueError(f"{field_name} must be a UUID (got {value!r})")
    return normalized


def _env(name: str, default: str | None = None) -> str | None:
    value = os.getenv(name)
    if value is None:
        return default
    value = value.strip()
    return value if value else default


@dataclass
class FlowberrySession:
    base_url: str
    email: str | None = None
    password: str | None = None
    access_token: str | None = None
    refresh_token: str | None = None
    mfa_token: str | None = None

    async def login(self) -> dict[str, Any]:
        if not self.email or not self.password:
            raise FlowberryAuthError(
                "Missing FLOWBERRY_EMAIL/FLOWBERRY_PASSWORD. "
                "Set tokens via env (FLOWBERRY_ACCESS_TOKEN) or call auth_set_tokens tool."
            )

        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(
                f"{self.base_url}/auth/login",
                json={"email": self.email, "password": self.password},
            )

        data: dict[str, Any] = resp.json() if resp.content else {}
        resp.raise_for_status()

        payload = data.get("data") or {}
        if isinstance(payload, dict) and payload.get("requires_mfa") is True:
            self.mfa_token = payload.get("mfa_token")
            self.access_token = None
            self.refresh_token = None
            return {
                "requires_mfa": True,
                "mfa_token_present": bool(self.mfa_token),
                "message": "MFA required. Call auth_mfa_request then auth_mfa_verify.",
            }

        if isinstance(payload, dict):
            self.access_token = payload.get("access_token")
            self.refresh_token = payload.get("refresh_token")
            self.mfa_token = None

        if not self.access_token:
            raise FlowberryAuthError("Login did not return an access token.")

        return {"requires_mfa": False, "access_token_present": True}

    async def refresh(self) -> bool:
        if not self.refresh_token:
            return False

        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(
                f"{self.base_url}/auth/refresh",
                json={"refresh_token": self.refresh_token},
            )

        if resp.status_code >= 400:
            return False

        data: dict[str, Any] = resp.json() if resp.content else {}
        payload = data.get("data") or {}
        if isinstance(payload, dict):
            self.access_token = payload.get("access_token")
            self.refresh_token = payload.get("refresh_token", self.refresh_token)

        return bool(self.access_token)

    async def mfa_request(self, email: str) -> dict[str, Any]:
        if not self.mfa_token:
            raise FlowberryAuthError("No MFA token present. Call auth_login first.")

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{self.base_url}/auth/mfa/request",
                json={"mfa_token": self.mfa_token, "email": email},
            )

        data: dict[str, Any] = resp.json() if resp.content else {}
        resp.raise_for_status()
        return data

    async def mfa_verify(self, otp_code: str) -> dict[str, Any]:
        if not self.mfa_token:
            raise FlowberryAuthError("No MFA token present. Call auth_login first.")

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{self.base_url}/auth/mfa/verify",
                json={"mfa_token": self.mfa_token, "otp_code": otp_code},
            )

        data: dict[str, Any] = resp.json() if resp.content else {}
        resp.raise_for_status()

        payload = data.get("data") or {}
        if isinstance(payload, dict):
            self.access_token = payload.get("access_token")
            self.refresh_token = payload.get("refresh_token")
            self.mfa_token = None

        return {
            "success": bool(self.access_token),
            "access_token_present": bool(self.access_token),
            "message": data.get("message", "MFA verified"),
        }

    async def ensure_access_token(self) -> None:
        if self.access_token:
            # If the JWT is expired/near-expiry, try to refresh proactively.
            try:
                payload = jwt.decode(self.access_token, options={"verify_signature": False})
                exp = payload.get("exp")
                if isinstance(exp, (int, float)):
                    # Refresh if expiring in the next minute (or already expired).
                    if time.time() >= float(exp) - 60:
                        if await self.refresh():
                            return
                        # Token is effectively unusable; clear it so we fall through.
                        self.access_token = None
            except Exception:
                # If we can't decode it, just proceed and let request()/401 logic handle it.
                pass

        if self.access_token:
            return

        # Try refresh first if we have it.
        if await self.refresh():
            return

        # If we have no credentials, make the error actionable.
        if not (self.email and self.password):
            raise FlowberryAuthError(
                "No valid access token. If your access token expired, provide FLOWBERRY_REFRESH_TOKEN "
                "(recommended) or set a fresh FLOWBERRY_ACCESS_TOKEN. "
                "Alternatively set credentials via auth_set_credentials then call auth_login/MFA tools."
            )

        result = await self.login()
        if result.get("requires_mfa") is True:
            raise FlowberryAuthError(
                "MFA required. Call auth_mfa_request then auth_mfa_verify, "
                "or set FLOWBERRY_ACCESS_TOKEN/FLOWBERRY_REFRESH_TOKEN to bypass login."
            )

    async def request(self, method: str, path: str, json: Any | None = None) -> Any:
        await self.ensure_access_token()

        url = f"{self.base_url}{path}"
        headers = {"Authorization": f"Bearer {self.access_token}"}

        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.request(method, url, json=json, headers=headers)

            if resp.status_code == 401:
                # One retry: refresh or re-login.
                if await self.refresh():
                    headers = {"Authorization": f"Bearer {self.access_token}"}
                    resp = await client.request(method, url, json=json, headers=headers)
                else:
                    # Without refresh, 401 likely means the access token is expired.
                    if not (self.email and self.password):
                        raise FlowberryAuthError(
                            "Flowberry returned 401 and no refresh token is configured. "
                            "Provide FLOWBERRY_REFRESH_TOKEN (best) or a fresh FLOWBERRY_ACCESS_TOKEN."
                        )

                    # Re-login once (might require MFA; surface as auth error).
                    await self.login()
                    await self.ensure_access_token()
                    headers = {"Authorization": f"Bearer {self.access_token}"}
                    resp = await client.request(method, url, json=json, headers=headers)

        data = resp.json() if resp.content else {}
        if resp.status_code >= 400:
            # Preserve API errors but make them readable.
            message = None
            if isinstance(data, dict):
                message = data.get("message") or data.get("detail")
            raise RuntimeError(f"Flowberry API error ({resp.status_code}): {message or data}")

        return data

    async def request_no_auth(self, method: str, path: str, json: Any | None = None) -> Any:
        url = f"{self.base_url}{path}"
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.request(method, url, json=json)
        data = resp.json() if resp.content else {}
        if resp.status_code >= 400:
            message = None
            if isinstance(data, dict):
                message = data.get("message") or data.get("detail")
            raise RuntimeError(f"Flowberry API error ({resp.status_code}): {message or data}")
        return data


session = FlowberrySession(
    base_url=_env("FLOWBERRY_API_BASE_URL", "http://localhost:8000/api/v1") or "http://localhost:8000/api/v1",
    email=_env("FLOWBERRY_EMAIL"),
    password=_env("FLOWBERRY_PASSWORD"),
    access_token=_env("FLOWBERRY_ACCESS_TOKEN"),
    refresh_token=_env("FLOWBERRY_REFRESH_TOKEN"),
)

mcp = FastMCP(
    "Flowberry",
    instructions="Flowberry MCP server. Tools call the Flowberry API to create and inspect workflows.",
    json_response=True,
)


@mcp.tool()
def auth_status() -> dict[str, Any]:
    """Return current auth state (no secrets)."""
    return {
        "base_url": session.base_url,
        "has_access_token": bool(session.access_token),
        "has_refresh_token": bool(session.refresh_token),
        "has_mfa_token": bool(session.mfa_token),
        "has_email_password": bool(session.email and session.password),
    }

@mcp.tool()
def debug_info() -> dict[str, Any]:
    """Return process/runtime info to debug environment/config issues (no secrets)."""
    return {
        "pid": os.getpid(),
        "python": sys.executable,
        "cwd": os.getcwd(),
        "sys_path_0": sys.path[0] if sys.path else None,
        "base_url": session.base_url,
        "access_token_present": bool(session.access_token),
        "access_token_len": len(session.access_token) if session.access_token else 0,
        "refresh_token_present": bool(session.refresh_token),
        "mfa_token_present": bool(session.mfa_token),
        "email_present": bool(session.email),
        "password_present": bool(session.password),
    }


@mcp.tool()
def auth_set_tokens(access_token: str, refresh_token: str | None = None) -> dict[str, Any]:
    """Set bearer tokens directly (useful when MFA blocks password login)."""
    session.access_token = access_token.strip()
    session.refresh_token = refresh_token.strip() if refresh_token else None
    session.mfa_token = None
    return {"success": True, "has_access_token": True, "has_refresh_token": bool(session.refresh_token)}


@mcp.tool()
def auth_set_credentials(email: str, password: str) -> dict[str, Any]:
    """Set email/password credentials for password-based login."""
    session.email = email.strip()
    session.password = password
    return {"success": True, "has_email_password": bool(session.email and session.password)}


@mcp.tool()
def set_base_url(base_url: str) -> dict[str, Any]:
    """Set the Flowberry API base URL (e.g. http://localhost:8000/api/v1)."""
    session.base_url = base_url.strip().rstrip("/")
    return {"success": True, "base_url": session.base_url}


@mcp.tool()
async def health() -> Any:
    """Call Flowberry /health (no auth)."""
    # /health is mounted at the app root, not under /api/v1.
    # If base_url ends with /api/v1, strip it for /health.
    base = session.base_url
    if base.endswith("/api/v1"):
        base = base[: -len("/api/v1")]
    old = session.base_url
    try:
        session.base_url = base
        return await session.request_no_auth("GET", "/health")
    finally:
        session.base_url = old


@mcp.tool()
async def check_ai_connectivity() -> Any:
    """Check server-side Gemini/Ollama connectivity (admin-only)."""
    return await session.request("GET", "/admin/ai/check")


@mcp.tool()
async def auth_login() -> dict[str, Any]:
    """Login with FLOWBERRY_EMAIL/FLOWBERRY_PASSWORD. If MFA is enabled, returns a status requiring MFA."""
    return await session.login()


@mcp.tool()
async def auth_mfa_request(email: str) -> Any:
    """Request an OTP code for MFA (sends an email via Flowberry/Gmail integration)."""
    return await session.mfa_request(email=email.strip())


@mcp.tool()
async def auth_mfa_verify(otp_code: str) -> dict[str, Any]:
    """Verify MFA OTP code and obtain access/refresh tokens."""
    return await session.mfa_verify(otp_code=otp_code.strip())


@mcp.tool()
async def create_workflow(prompt: str) -> Any:
    """Create a workflow from a natural-language prompt."""
    if not prompt or not prompt.strip():
        raise ValueError("Prompt cannot be empty")
    return await session.request("POST", "/workflows", json={"prompt": prompt})


@mcp.tool()
async def create_csv_workflow(prompt: str, csv_text: str) -> Any:
    """Create a workflow with an inline CSV payload."""
    if not prompt or not prompt.strip():
        raise ValueError("Prompt cannot be empty")
    if not csv_text or not csv_text.strip():
        raise ValueError("csv_text cannot be empty")
    if len(csv_text) > 1_000_000:
        raise ValueError("csv_text too large (max 1MB)")
    return await session.request("POST", "/workflows/csv", json={"prompt": prompt, "csv_text": csv_text})


@mcp.tool()
async def get_workflow(workflow_id: str) -> Any:
    """Fetch workflow summary by id."""
    workflow_id = _normalize_uuid(workflow_id, "workflow_id")
    return await session.request("GET", f"/workflows/{workflow_id}")


@mcp.tool()
async def get_steps(workflow_id: str) -> Any:
    """Fetch workflow steps by workflow id."""
    workflow_id = _normalize_uuid(workflow_id, "workflow_id")
    return await session.request("GET", f"/workflows/{workflow_id}/steps")


@mcp.tool()
async def get_steps_parsed(workflow_id: str) -> dict[str, Any]:
    """Like get_steps, but parses each step's output_payload JSON into output_payload_parsed."""
    workflow_id = _normalize_uuid(workflow_id, "workflow_id")
    resp = await session.request("GET", f"/workflows/{workflow_id}/steps")
    data = resp.get("data") if isinstance(resp, dict) else None
    if not isinstance(data, list):
        return {"success": False, "data": [], "message": "Unexpected response shape"}

    import json as _json

    parsed_steps: list[dict[str, Any]] = []
    for step in data:
        if not isinstance(step, dict):
            continue
        out_raw = step.get("output_payload")
        out_parsed = None
        if isinstance(out_raw, str) and out_raw:
            try:
                out_parsed = _json.loads(out_raw)
            except Exception:
                out_parsed = None
        step_copy = dict(step)
        step_copy["output_payload_parsed"] = out_parsed
        parsed_steps.append(step_copy)

    return {"success": True, "data": parsed_steps, "message": "Workflow steps fetched (parsed)"}


@mcp.tool()
async def get_step_output_parsed(workflow_id: str, step_id: str) -> dict[str, Any]:
    """Return parsed output payload for a specific step."""
    workflow_id = _normalize_uuid(workflow_id, "workflow_id")
    step_id = _normalize_uuid(step_id, "step_id")
    resp = await get_steps_parsed(workflow_id)
    steps = resp.get("data") if isinstance(resp, dict) else None
    if not isinstance(steps, list):
        return {"success": False, "data": None, "message": "Unexpected response shape"}
    step = next((s for s in steps if isinstance(s, dict) and s.get("id") == step_id), None)
    if not step:
        return {"success": False, "data": None, "message": "Step not found"}
    return {
        "success": True,
        "data": {
            "id": step.get("id"),
            "step_name": step.get("step_name"),
            "step_type": step.get("step_type"),
            "status": step.get("status"),
            "output_payload_parsed": step.get("output_payload_parsed"),
        },
        "message": "Step output fetched (parsed)",
    }


@mcp.tool()
async def get_logs(workflow_id: str) -> Any:
    """Fetch workflow logs by workflow id."""
    workflow_id = _normalize_uuid(workflow_id, "workflow_id")
    return await session.request("GET", f"/workflows/{workflow_id}/logs")


@mcp.tool()
async def retry_workflow(workflow_id: str) -> Any:
    """Retry all failed/queued steps for a workflow."""
    workflow_id = _normalize_uuid(workflow_id, "workflow_id")
    return await session.request("POST", f"/workflows/{workflow_id}/retry")


@mcp.tool()
async def approve_email_step(workflow_id: str, step_id: str) -> Any:
    """Approve an email-send step (queues email worker job)."""
    workflow_id = _normalize_uuid(workflow_id, "workflow_id")
    step_id = _normalize_uuid(step_id, "step_id")
    return await session.request("POST", f"/workflows/{workflow_id}/steps/{step_id}/approve-email")


@mcp.tool()
async def create_workflow_and_wait(
    prompt: str,
    timeout_seconds: int = 180,
    poll_interval_seconds: float = 2.0,
) -> Any:
    """Create a workflow and poll until it completes/fails (best-effort)."""
    if not prompt or not prompt.strip():
        raise ValueError("Prompt cannot be empty")
    if timeout_seconds < 5 or timeout_seconds > 3600:
        raise ValueError("timeout_seconds must be between 5 and 3600")
    if poll_interval_seconds <= 0.2 or poll_interval_seconds > 30:
        raise ValueError("poll_interval_seconds must be between 0.2 and 30")

    created = await create_workflow(prompt)
    workflow_id = (created.get("data") or {}).get("workflow_id") if isinstance(created, dict) else None
    if not workflow_id:
        return {"created": created, "error": "No workflow_id returned by API"}

    import asyncio
    import time

    deadline = time.monotonic() + float(timeout_seconds)
    last = None
    while time.monotonic() < deadline:
        last = await get_workflow(workflow_id)
        status = (last.get("data") or {}).get("status") if isinstance(last, dict) else None
        if status in {"completed", "failed"}:
            break
        await asyncio.sleep(float(poll_interval_seconds))

    steps = await get_steps(workflow_id)
    logs = await get_logs(workflow_id)
    return {
        "workflow_id": workflow_id,
        "workflow": last,
        "steps": steps,
        "logs": logs,
        "timed_out": time.monotonic() >= deadline,
    }


@mcp.tool()
async def get_final_summary(workflow_id: str) -> dict[str, Any]:
    """Return the final summarized report text for a workflow (best-effort)."""
    workflow_id = _normalize_uuid(workflow_id, "workflow_id")
    steps_resp = await get_steps(workflow_id)
    steps = steps_resp.get("data") if isinstance(steps_resp, dict) else None
    if not isinstance(steps, list) or not steps:
        return {"workflow_id": workflow_id, "status": None, "summary": None, "error": "No steps found"}

    # Prefer the last step by step_order; fallback to any step named "Summarize Results".
    last_step = None
    try:
        last_step = max(steps, key=lambda s: int((s or {}).get("step_order") or 0))
    except Exception:
        last_step = steps[-1]

    candidates = [last_step] + [s for s in steps if (s or {}).get("step_name") == "Summarize Results"]
    for step in candidates:
        if not isinstance(step, dict):
            continue
        output_payload = step.get("output_payload")
        if not output_payload:
            continue
        try:
            import json as _json

            parsed = _json.loads(output_payload)
            if isinstance(parsed, dict):
                summary = parsed.get("summary")
                if isinstance(summary, str) and summary.strip():
                    return {
                        "workflow_id": workflow_id,
                        "step_id": step.get("id"),
                        "step_status": step.get("status"),
                        "summary": summary,
                    }
        except Exception:
            continue

    return {
        "workflow_id": workflow_id,
        "step_id": last_step.get("id") if isinstance(last_step, dict) else None,
        "step_status": last_step.get("status") if isinstance(last_step, dict) else None,
        "summary": None,
        "error": "Final summary not available yet (step may still be running) or output payload format is unknown",
    }


def main() -> None:
    mcp.run(transport="stdio")


if __name__ == "__main__":
    main()

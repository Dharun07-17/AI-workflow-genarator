import asyncio
import base64
import json
import re
import time
from email.message import EmailMessage
import httpx
from app.core.db import db_manager
from app.models.integration import Integration
from app.models.workflow import Workflow
from app.models.workflow_step import WorkflowStep
from app.services.encryption_service import EncryptionService
from app.workers.consumer_base import WorkerConsumer
from app.services.ai_client import AIClient
from app.services.serpapi_service import SerpApiService
from app.core.config import settings


class EmailWorker(WorkerConsumer):
    async def process_task(self, queue_name: str, payload: dict) -> dict:
        if queue_name == "report-generation":
            tool = (payload.get("tool") or "").strip().lower()
            prompt = payload.get("prompt") or "Generate a concise workflow report."
            safe_prompt = self._normalize_websearch_query(prompt)
            topic_terms = self._extract_topic_terms(safe_prompt)

            # 1) Web search uses SerpAPI to fetch actual results.
            if tool == "websearch":
                raw_query = payload.get("input") if isinstance(payload.get("input"), str) else prompt
                query = self._normalize_websearch_query(raw_query)
                workflow_id = payload.get("workflow_id")
                api_key, api_key_source = self._get_serpapi_key(workflow_id)
                serp = SerpApiService(api_key=api_key)

                is_news = bool(re.search(r"\b(news|headline|headlines|breaking|latest|today)\b", query, flags=re.I))

                primary_engine = settings.serpapi_engine
                primary_tbm = settings.serpapi_tbm
                if is_news:
                    primary_engine = "google_news"
                    primary_tbm = None

                primary_payload = await serp.search(query=query, engine=primary_engine, tbm=primary_tbm)
                primary_results = serp.extract_results(primary_payload)

                cross_payload = None
                cross_results: list[dict] = []
                overlap_count = 0
                if is_news and settings.serpapi_news_crosscheck:
                    cross_payload = await serp.search(
                        query=query,
                        engine=settings.serpapi_news_crosscheck_engine,
                        tbm=settings.serpapi_news_crosscheck_tbm,
                    )
                    cross_results = serp.extract_results(cross_payload)
                    primary_urls = {str(r.get("url") or "") for r in primary_results if isinstance(r, dict) and r.get("url")}
                    cross_urls = {str(r.get("url") or "") for r in cross_results if isinstance(r, dict) and r.get("url")}
                    overlap_count = len(primary_urls.intersection(cross_urls))

                # Union results, preserving primary ordering.
                merged: list[dict] = []
                seen_urls: set[str] = set()
                for r in primary_results + cross_results:
                    if not isinstance(r, dict):
                        continue
                    url = str(r.get("url") or "")
                    if url and url in seen_urls:
                        continue
                    if url:
                        seen_urls.add(url)
                    merged.append(r)

                # Topic filter: if user asked for a specific subject (e.g. "cancer research"),
                # bias toward results that mention those terms. If filtering would wipe the
                # list, fall back to the unfiltered set to avoid returning nothing.
                filtered_results = self._filter_results_by_topic(merged, topic_terms)
                used_filtered = False
                if filtered_results and len(filtered_results) >= min(3, len(merged)):
                    merged = filtered_results
                    used_filtered = True

                primary_raw = primary_payload.get("raw") if isinstance(primary_payload, dict) else {}
                serp_error = primary_raw.get("error") if isinstance(primary_raw, dict) else None
                search_info = primary_raw.get("search_information") if isinstance(primary_raw, dict) else None
                return {
                    "report_id": f"report-{payload['workflow_step_id']}",
                    "status": "generated",
                    "tool": "websearch",
                    "query": query,
                    "results": merged,
                    "results_count": len(merged),
                    "topic_terms": topic_terms,
                    "topic_filter_applied": used_filtered,
                    "primary_engine": primary_payload.get("engine"),
                    "primary_tbm": primary_payload.get("tbm"),
                    "primary_results_count": len(primary_results),
                    "crosscheck_enabled": bool(is_news and settings.serpapi_news_crosscheck),
                    "crosscheck_engine": cross_payload.get("engine") if isinstance(cross_payload, dict) else None,
                    "crosscheck_tbm": cross_payload.get("tbm") if isinstance(cross_payload, dict) else None,
                    "crosscheck_results_count": len(cross_results),
                    "crosscheck_overlap_count": overlap_count,
                    "latency_ms": primary_payload.get("latency_ms"),
                    "serpapi_error": serp_error,
                    "search_information": search_info,
                    "raw_keys": sorted(list(primary_raw.keys())) if isinstance(primary_raw, dict) else [],
                    "api_key_source": api_key_source,
                }

            # 2) Summarize step: summarize dependency results if present.
            if tool == "ollama":
                dep_items = self._fetch_dep_items(payload.get("workflow_step_id"))
                ai = AIClient()
                if dep_items:
                    summary = await ai.generate_text(
                        "You are a news/research assistant.\n"
                        "Summarize the following web search results into a concise digest.\n"
                        "Rules:\n"
                        "- Use bullet points.\n"
                        "- Prefer factual statements grounded in the results.\n"
                        "- Include the source URL for each bullet.\n\n"
                        f"User request: {safe_prompt}\n\n"
                        f"Results (JSON):\n{json.dumps(dep_items, ensure_ascii=True)[:24000]}"
                    )
                else:
                    summary = await ai.generate_text("Generate a concise report summary for this request:\n" + safe_prompt)
                await asyncio.sleep(0.2)
                return {
                    "report_id": f"report-{payload['workflow_step_id']}",
                    "status": "generated",
                    "tool": "ollama",
                    "summary": summary,
                }

            # 3) Fallback (reddit/hackernews/x/etc): keep existing behavior.
            ai = AIClient()
            summary = await ai.generate_text("Generate a concise report summary for this request:\n" + safe_prompt)
            await asyncio.sleep(0.2)
            return {
                "report_id": f"report-{payload['workflow_step_id']}",
                "status": "generated",
                "tool": tool or None,
                "summary": summary,
            }

        if queue_name == "email-send":
            if payload.get("approve") is True:
                await asyncio.sleep(0.2)
                draft = payload.get("draft") or self._build_draft(payload)
                result = await self._send_gmail(payload, draft)
                result["draft"] = draft
                return result

            draft = self._build_draft(payload)
            return {"_step_status": "waiting_approval", "draft": draft}

        raise ValueError(f"Unsupported queue {queue_name}")

    def _normalize_websearch_query(self, text: str) -> str:
        q = (text or "").strip()
        if not q:
            return "latest news"

        # Remove email addresses and common "send/email it to" clauses to keep the query relevant.
        q = re.sub(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", "", q, flags=re.I)
        q = re.sub(r"\b(email|send)\b.*\bto\b.*$", "", q, flags=re.I)
        q = re.sub(r"\s+", " ", q).strip(" ,.-")
        q = re.sub(r"\b(and|to)$", "", q, flags=re.I).strip(" ,.-")

        # Keep queries reasonably short.
        return q[:200] if len(q) > 200 else q

    def _extract_topic_terms(self, safe_prompt: str) -> list[str]:
        text = (safe_prompt or "").lower()
        if not text:
            return []

        # Strip generic request words; keep subject terms.
        text = re.sub(r"[^a-z0-9\s-]", " ", text)
        words = [w for w in re.split(r"\s+", text) if w]

        stop = {
            "get",
            "latest",
            "today",
            "current",
            "breaking",
            "headlines",
            "headline",
            "news",
            "information",
            "info",
            "about",
            "on",
            "in",
            "and",
            "the",
            "a",
            "an",
            "to",
            "for",
            "of",
            "us",
            "usa",
            "america",
        }
        terms: list[str] = []
        for w in words:
            if w in stop:
                continue
            if len(w) < 4:
                continue
            terms.append(w)
        # De-dupe preserving order; cap to keep prompts small.
        out = list(dict.fromkeys(terms))
        return out[:6]

    def _filter_results_by_topic(self, results: list[dict], topic_terms: list[str]) -> list[dict]:
        if not topic_terms:
            return results
        filtered: list[dict] = []
        for r in results:
            if not isinstance(r, dict):
                continue
            hay = f"{r.get('title') or ''} {r.get('snippet') or ''}".lower()
            if any(t in hay for t in topic_terms):
                filtered.append(r)
        return filtered or results

    def _get_serpapi_key(self, workflow_id: str | None) -> tuple[str | None, str | None]:
        """Return (api_key, source) where source is 'integration' or 'env'."""
        # Prefer per-user integration if present.
        if workflow_id:
            db = db_manager.get_session()
            try:
                workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
                if workflow:
                    integration = (
                        db.query(Integration)
                        .filter(Integration.user_id == workflow.user_id, Integration.provider == "SERP API")
                        .order_by(Integration.updated_at.desc())
                        .first()
                    )
                    if integration:
                        enc = EncryptionService()
                        creds = self._decrypt_credentials(enc, integration)
                        api_key = (creds.get("api_key") or "").strip()
                        if api_key:
                            return api_key, "integration"
            finally:
                db.close()

        # Fall back to environment-level key via Settings.
        # SerpApiService will pick this up from settings.serpapi_api_key.
        return None, "env"

    def _build_draft(self, payload: dict) -> dict:
        prompt = payload.get("prompt") or ""
        to_email = self._extract_email(prompt) or payload.get("to") or "team@example.com"
        summary_text = self._fetch_dep_summary(payload.get("workflow_step_id"))
        subject, body = self._parse_subject_body(summary_text)
        subject = subject or "Workflow Report"
        body = body or "Draft email body goes here."

        return {
            "to": to_email,
            "subject": subject,
            "body": body,
            "status": "draft",
        }

    def _fetch_dep_items(self, step_id: str | None) -> list[dict]:
        """Collect search results from dependency chain, if any."""
        if not step_id:
            return []
        db = db_manager.get_session()
        try:
            step = db.query(WorkflowStep).filter(WorkflowStep.id == step_id).first()
            if not step or not step.depends_on_step_id:
                return []

            items: list[dict] = []
            seen: set[str] = set()
            current_id = step.depends_on_step_id
            while current_id and current_id not in seen:
                seen.add(current_id)
                dep = db.query(WorkflowStep).filter(WorkflowStep.id == current_id).first()
                if not dep:
                    break
                if dep.output_payload:
                    try:
                        parsed = json.loads(dep.output_payload)
                        if isinstance(parsed, dict):
                            results = parsed.get("results")
                            if isinstance(results, list):
                                for r in results:
                                    if isinstance(r, dict):
                                        items.append(r)
                    except Exception:
                        pass
                current_id = dep.depends_on_step_id

            # De-dupe by url if present.
            deduped: list[dict] = []
            seen_urls: set[str] = set()
            for item in items:
                url = str(item.get("url") or "")
                if url and url in seen_urls:
                    continue
                if url:
                    seen_urls.add(url)
                deduped.append(item)
            return deduped
        finally:
            db.close()

    def _fetch_dep_summary(self, step_id: str | None) -> str:
        if not step_id:
            return ""
        db = db_manager.get_session()
        try:
            step = db.query(WorkflowStep).filter(WorkflowStep.id == step_id).first()
            if not step or not step.depends_on_step_id:
                return ""
            dep = db.query(WorkflowStep).filter(WorkflowStep.id == step.depends_on_step_id).first()
            if not dep or not dep.output_payload:
                return ""
            try:
                parsed = json.loads(dep.output_payload)
                if isinstance(parsed, dict):
                    return str(parsed.get("summary") or parsed.get("report") or parsed)
                return str(parsed)
            except Exception:
                return dep.output_payload
        finally:
            db.close()

    def _parse_subject_body(self, text: str) -> tuple[str | None, str | None]:
        if not text:
            return None, None
        subject = None
        body = text.strip()
        match = re.search(r"^Subject:\s*(.+)$", text, flags=re.M)
        if match:
            subject = match.group(1).strip()
            body = re.sub(r"^Subject:\s*.+$", "", text, flags=re.M).strip()
        return subject, body

    def _extract_email(self, text: str) -> str | None:
        if not text:
            return None
        match = re.search(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", text, flags=re.I)
        return match.group(0) if match else None

    async def _send_gmail(self, payload: dict, draft: dict) -> dict:
        workflow_id = payload.get("workflow_id")
        if not workflow_id:
            raise ValueError("Missing workflow_id for Gmail send")

        db = db_manager.get_session()
        try:
            workflow = db.query(Workflow).filter(Workflow.id == workflow_id).first()
            if not workflow:
                raise ValueError("Workflow not found for Gmail send")

            integration = (
                db.query(Integration)
                .filter(Integration.user_id == workflow.user_id, Integration.provider == "Gmail")
                .order_by(Integration.updated_at.desc())
                .first()
            )
            if not integration:
                raise ValueError("No Gmail integration found for user")

            enc = EncryptionService()
            creds = self._decrypt_credentials(enc, integration)
            access_token = await self._get_access_token(db, integration, creds)

            message = EmailMessage()
            message["To"] = draft.get("to") or self._extract_email(payload.get("prompt") or "") or ""
            message["Subject"] = draft.get("subject") or "Workflow Report"
            message.set_content(draft.get("body") or "")
            raw = base64.urlsafe_b64encode(message.as_bytes()).decode()

            headers = {"Authorization": f"Bearer {access_token}"}
            async with httpx.AsyncClient(timeout=20) as client:
                resp = await client.post(
                    "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
                    headers=headers,
                    json={"raw": raw},
                )
                resp.raise_for_status()
                data = resp.json()

            return {
                "delivery": "sent",
                "provider": "gmail",
                "status": "ok",
                "message_id": data.get("id"),
                "thread_id": data.get("threadId"),
            }
        finally:
            db.close()

    def _decrypt_credentials(self, enc: EncryptionService, integration: Integration) -> dict:
        try:
            raw = enc.decrypt(integration.credentials_encrypted)
            parsed = json.loads(raw)
            if isinstance(parsed, dict):
                return parsed
        except Exception:
            pass
        return {"oauth_json": "", "api_key": "", "oauth_tokens": {}}

    async def _get_access_token(self, db, integration: Integration, creds: dict) -> str:
        tokens = creds.get("oauth_tokens") or {}
        access_token = tokens.get("access_token")
        expires_in = tokens.get("expires_in")
        created_at = tokens.get("created_at")
        if access_token and expires_in and created_at:
            if time.time() < (created_at + int(expires_in) - 60):
                return access_token

        refresh_token = tokens.get("refresh_token")
        oauth_json = creds.get("oauth_json") or ""
        if not refresh_token or not oauth_json:
            raise ValueError("Gmail OAuth tokens missing; connect the integration first")

        try:
            parsed = json.loads(oauth_json)
        except Exception:
            raise ValueError("Gmail OAuth JSON invalid")

        config = parsed.get("web") or parsed.get("installed") or {}
        client_id = config.get("client_id")
        client_secret = config.get("client_secret")
        token_uri = config.get("token_uri")
        if not client_id or not client_secret or not token_uri:
            raise ValueError("Gmail OAuth JSON missing required fields")

        data = {
            "client_id": client_id,
            "client_secret": client_secret,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token",
        }
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post(token_uri, data=data)
            resp.raise_for_status()
            payload = resp.json()

        tokens.update(
            {
                "access_token": payload.get("access_token"),
                "expires_in": payload.get("expires_in"),
                "scope": payload.get("scope") or tokens.get("scope"),
                "token_type": payload.get("token_type") or tokens.get("token_type"),
                "created_at": int(time.time()),
            }
        )
        creds["oauth_tokens"] = tokens
        integration.credentials_encrypted = EncryptionService().encrypt(json.dumps(creds))
        db.commit()

        if not tokens.get("access_token"):
            raise ValueError("Failed to refresh Gmail access token")
        return tokens["access_token"]


async def main() -> None:
    worker = EmailWorker(worker_name="worker-email", queues=["report-generation", "email-send"])
    await worker.run()


if __name__ == "__main__":
    asyncio.run(main())

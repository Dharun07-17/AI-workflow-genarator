import json
import re
from uuid import uuid4

from app.services.ai_client import AIClient

TOOL_LIST = """Available tools:
- reddit: fetches Reddit posts (ONLY when "reddit" or "r/something" mentioned)
- x: searches X/Twitter (ONLY when "twitter", "tweet", "x posts" mentioned)
- hackernews: searches Hacker News (ONLY when "hacker news", "hackernews", "tech news" mentioned)
- websearch: searches Google for any topic (use for general web searches, news, facts)
- csv: analyzes CSV files (ONLY when a .csv file path is mentioned)
- calendar: schedules meetings (ONLY when schedule/meeting/appointment mentioned)
- email: sends emails (ONLY when send/email explicitly mentioned)
- ollama: AI summarization and Q&A (always last before email)

Rules:
- Reply with ONLY a JSON array of tool names in order
- Use "websearch" for general questions, news, facts, current events
- Use "reddit" ONLY if reddit is mentioned
- Use "hackernews" ONLY if hacker news or tech news is mentioned
- ollama ALWAYS comes last (except email which comes after)
- DO NOT add tools not explicitly needed
- Examples:
  "Search Google for AI news" -> ["websearch", "ollama"]
  "What is quantum computing" -> ["websearch", "ollama"]
  "Latest news about Tesla" -> ["websearch", "ollama"]
  "give top 5 posts from r/cats" -> ["reddit", "ollama"]
  "summarize tech news" -> ["hackernews", "ollama"]
  "analyze ./data/sample.csv" -> ["csv", "ollama"]
  "schedule meeting tomorrow" -> ["calendar", "ollama"]
  "search web and email me results" -> ["websearch", "ollama", "email"]
- No explanation, just the JSON array."""

VALID_TOOLS = {
    "reddit",
    "x",
    "twitter",
    "hackernews",
    "hn",
    "websearch",
    "search",
    "google",
    "csv",
    "calendar",
    "schedule",
    "email",
    "ollama",
}

TOOL_STEP_MAP = {
    "csv": ("csv-analysis", "Analyze CSV"),
    "calendar": ("calendar-create", "Create Calendar Event"),
    "email": ("email-send", "Send Email"),
    "notifications": ("notifications", "Send Notification"),
    "websearch": ("report-generation", "Generate Report (websearch)"),
    "reddit": ("report-generation", "Generate Report (reddit)"),
    "hackernews": ("report-generation", "Generate Report (hackernews)"),
    "x": ("report-generation", "Generate Report (x)"),
    "ollama": ("report-generation", "Summarize Results"),
}


class FizzPlanningService:
    """Planner compatible with ai-workflow-generator tool selection logic."""

    async def create_plan(self, prompt: str) -> dict:
        intent = re.sub(r"\s+", " ", prompt).strip()[:160]
        if not intent:
            return {"intent_summary": "", "steps": []}

        try:
            tools = await self._plan_with_ai(prompt)
        except Exception:
            tools = self._keyword_fallback(prompt)

        steps = self._tools_to_steps(tools, prompt)
        return {"intent_summary": intent, "steps": steps}

    async def _plan_with_ai(self, prompt: str) -> list[str]:
        client = AIClient()
        ai_prompt = f"{TOOL_LIST}\n\nUser: \"{prompt}\"\n\nJSON array:"
        raw = await client.generate_text(ai_prompt)
        match = re.search(r"\[.*?\]", raw, flags=re.S)
        if not match:
            raise ValueError("No JSON array found in AI response")

        parsed = json.loads(match.group(0))
        if not isinstance(parsed, list) or not parsed:
            raise ValueError("Empty tool list")

        tools = []
        for item in parsed:
            tool = str(item).lower().strip()
            if tool not in VALID_TOOLS:
                continue
            if tool == "twitter":
                tool = "x"
            elif tool == "hn":
                tool = "hackernews"
            elif tool == "schedule":
                tool = "calendar"
            elif tool in {"search", "google"}:
                tool = "websearch"
            tools.append(tool)

        tools = list(dict.fromkeys(tools))

        # Enforce "mention-only" rules even if the AI planner returns extra tools.
        # This prevents drift when users ask for "news" but the plan pulls reddit/hn/x anyway.
        tools = self._enforce_tool_rules(tools, prompt)

        has_email = "email" in tools
        tools = [t for t in tools if t not in {"ollama", "email"}]
        tools.append("ollama")
        if has_email:
            tools.append("email")

        if not tools:
            raise ValueError("No valid tools after normalization")
        return tools

    def _enforce_tool_rules(self, tools: list[str], prompt: str) -> list[str]:
        lower = prompt.lower()
        has_email_address = bool(re.search(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", prompt, flags=re.I))

        allow_reddit = ("reddit" in lower) or bool(re.search(r"r\/[a-z]", lower))
        allow_hn = ("hacker news" in lower) or ("hackernews" in lower) or ("tech news" in lower)
        allow_x = ("twitter" in lower) or ("tweet" in lower) or ("x post" in lower) or ("x posts" in lower)

        # Email intent: broaden slightly beyond fallback rules to cover "send it to <email>".
        needs_email = (
            "send to " in lower
            or "send it to " in lower
            or "email to " in lower
            or "email it to " in lower
            or "email this to " in lower
            or "send via email" in lower
            or "email me" in lower
            or "send me" in lower
            or "notify" in lower
            # Common shorthand: "email <address>" or "send <address>".
            or (has_email_address and ("email" in lower or "send" in lower))
        )

        filtered: list[str] = []
        for t in tools:
            if t == "reddit" and not allow_reddit:
                continue
            if t == "hackernews" and not allow_hn:
                continue
            if t == "x" and not allow_x:
                continue
            if t == "email" and not needs_email:
                continue
            filtered.append(t)

        # If user clearly asks for news/current events and nothing else is selected,
        # ensure websearch is present.
        wants_fresh_info = bool(
            re.search(r"\b(latest|today|current|breaking|headlines|news)\b", lower)
        )
        if wants_fresh_info and "websearch" not in filtered and not any(t in {"reddit", "hackernews", "x"} for t in filtered):
            filtered.insert(0, "websearch")

        return list(dict.fromkeys(filtered))

    def _keyword_fallback(self, prompt: str) -> list[str]:
        lower = prompt.lower()
        has_email_address = bool(re.search(r"[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}", prompt, flags=re.I))
        tools: list[str] = []

        if ".csv" in lower and ("./" in lower or "data/" in lower):
            tools.append("csv")

        if (
            ("schedule" in lower or "meeting" in lower or "appointment" in lower)
            and "news" not in lower
        ):
            tools.append("calendar")

        if "hacker news" in lower or "hackernews" in lower or "tech news" in lower:
            tools.append("hackernews")

        if "reddit" in lower or re.search(r"r\/[a-z]", lower):
            tools.append("reddit")

        if "twitter" in lower or "tweet" in lower or "x post" in lower:
            tools.append("x")

        if (
            "search" in lower
            or "google" in lower
            or "look up" in lower
            or "find info" in lower
            or "what is" in lower
            or "who is" in lower
            or "how to" in lower
            or "latest news" in lower
            or "current" in lower
        ):
            if not any(t in {"reddit", "hackernews", "x"} for t in tools):
                tools.append("websearch")

        if "notify" in lower or "notification" in lower:
            tools.append("notifications")

        needs_email = (
            "send to " in lower
            or "email to " in lower
            or "email it to " in lower
            or "email this to " in lower
            or "send via email" in lower
            or "email me" in lower
            or "send me" in lower
            or "notify" in lower
            or (has_email_address and ("email" in lower or "send" in lower))
        )

        if not tools:
            tools.append("websearch")

        tools.append("ollama")
        if needs_email:
            tools.append("email")

        return tools

    def _tools_to_steps(self, tools: list[str], prompt: str) -> list[dict]:
        steps: list[dict] = []
        last_chain_step_id: str | None = None

        for tool in tools:
            step_type, name = TOOL_STEP_MAP.get(tool, ("report-generation", "Generate Report"))
            step_id = str(uuid4())
            step = {
                "id": step_id,
                "type": step_type,
                "name": name,
                "tool": tool,
                "input": prompt,
            }

            if step_type in {"csv-analysis", "report-generation"}:
                if last_chain_step_id:
                    step["depends_on_step_id"] = last_chain_step_id
                last_chain_step_id = step_id

            if step_type == "email-send" and last_chain_step_id:
                step["depends_on_step_id"] = last_chain_step_id

            steps.append(step)

        for idx, step in enumerate(steps, start=1):
            step["step_order"] = idx
            step.setdefault("depends_on_step_id", None)

        return steps

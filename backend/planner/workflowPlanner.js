const axios = require("axios");

const TOOL_LIST = `Available tools:
- reddit: searches Reddit for posts
- x: searches X/Twitter for posts
- hackernews: searches Hacker News for tech stories
- csv: analyzes CSV files (ONLY when a .csv file path is mentioned)
- calendar: schedules meetings (ONLY when schedule/meeting is mentioned)
- email: sends emails (ONLY when send/email is explicitly mentioned)
- ollama: uses local AI to answer, summarize, or analyze

Critical Rules:
- Reply with ONLY a JSON array of tool names in order
- ollama ALWAYS comes last before email
- Data tools (reddit, hackernews, csv) ALWAYS come before ollama
- ONLY use reddit if the word "reddit" is in the prompt
- ONLY use hackernews if "hacker news", "hackernews", or "tech news" is in the prompt
- ONLY use csv if a .csv file path is mentioned
- ONLY use calendar if schedule/meeting/appointment is mentioned
- ALWAYS include email at the end if send/email is mentioned
- Examples:
  "Summarize tech news and send to x@gmail.com" → ["hackernews", "ollama", "email"]
  "Search Reddit for AI and send to x@gmail.com" → ["reddit", "ollama", "email"]
  "Summarize tech news" → ["hackernews", "ollama"]
  "Search Reddit for AI" → ["reddit", "ollama"]
  "Analyze CSV at ./data/sample.csv" → ["csv", "ollama"]
  "Schedule meeting tomorrow" → ["calendar", "ollama"]
- No explanation, just the JSON array.`;

async function planWithOllama(prompt) {
  const response = await axios.post(
    "http://localhost:11434/api/generate",
    {
      model:  "llama2",
      prompt: `${TOOL_LIST}\n\nUser request: "${prompt}"\n\nJSON array:`,
      stream: false
    },
    { timeout: 60000 }
  );

  const raw = response.data?.response?.trim() || "";
  console.log("[Planner] Ollama raw response:", raw);

  const match = raw.match(/\[.*?\]/s);
  if (!match) throw new Error("No JSON array in planner response");

  const tools = JSON.parse(match[0]);
  if (!Array.isArray(tools) || tools.length === 0) throw new Error("Empty tools array");

  const validTools = ["reddit", "x", "twitter", "hackernews", "hn", "csv", "calendar", "schedule", "email", "ollama"];

  let steps = tools
    .map(t => String(t).toLowerCase().trim())
    .filter(t => validTools.includes(t))
    .map(t => {
      if (t === "twitter") return "x";
      if (t === "hn") return "hackernews";
      if (t === "schedule") return "calendar";
      return t;
    });

  // Remove duplicates
  steps = [...new Set(steps)];

  // Enforce: ollama must come before email and after data tools
  const hasEmail = steps.includes("email");
  steps = steps.filter(t => t !== "ollama" && t !== "email");
  steps.push("ollama");
  if (hasEmail) steps.push("email");

  const finalSteps = steps.map(tool => ({ tool, input: prompt }));
  if (finalSteps.length === 0) throw new Error("No valid tools after filtering");

  console.log("[Planner] Selected tools:", finalSteps.map(s => s.tool));
  return { steps: finalSteps };
}

function keywordFallback(prompt) {
  const lower = prompt.toLowerCase();
  const steps = [];

  // CSV - only if file path mentioned
  if (lower.includes(".csv") && (lower.includes("./") || lower.includes("data/"))) {
    steps.push({ tool: "csv", input: prompt });
  }

  // Calendar - only if scheduling mentioned AND not about news
  if (
    (lower.includes("schedule") || lower.includes("meeting") || lower.includes("appointment")) &&
    !lower.includes("news")
  ) {
    steps.push({ tool: "calendar", input: prompt });
  }

  // Hacker News - only if explicitly mentioned
  if (
    lower.includes("tech news")    ||
    lower.includes("hacker news")  ||
    lower.includes("hackernews")   ||
    lower.includes("hn ")
  ) {
    steps.push({ tool: "hackernews", input: prompt });
  }

  // Reddit - only if "reddit" is explicitly mentioned
  if (lower.includes("reddit")) {
    steps.push({ tool: "reddit", input: prompt });
  }

  // X/Twitter - only if explicitly mentioned
  if (lower.includes("tweet") || lower.includes("twitter") || lower.includes("x post")) {
    steps.push({ tool: "x", input: prompt });
  }

  // Email - only if explicitly mentioned with send
  const needsEmail =
    lower.includes("send to ")       ||
    lower.includes("email to ")      ||
    lower.includes("send via email") ||
    lower.includes("email me")       ||
    lower.includes("send me")        ||
    lower.includes("notify");

  // Ollama always before email
  steps.push({ tool: "ollama", input: prompt });
  if (needsEmail) {
    steps.push({ tool: "email", input: prompt });
  }

  console.log("[Planner] Keyword fallback tools:", steps.map(s => s.tool));
  return { steps };
}

async function planWorkflow(prompt) {
  if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
    return { steps: [] };
  }

  try {
    const result = await planWithOllama(prompt);
    return result;
  } catch (err) {
    console.warn("[Planner] Ollama planning failed, using keyword fallback. Reason:", err.message);
    return keywordFallback(prompt);
  }
}

module.exports = { planWorkflow };

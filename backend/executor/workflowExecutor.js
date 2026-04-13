const { runOllama }     = require("../tools/ollamaTool");
const { runReddit }     = require("../tools/redditTool");
const { runX }          = require("../tools/xTool");
const { runHackerNews } = require("../tools/hackerNewsTool");
const { runCSV }        = require("../tools/csvTool");
const { runCalendar }   = require("../tools/calendarTool");
const { runEmail }      = require("../tools/emailTool");

function withTimeout(promise, ms, toolName) {
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`${toolName} timed out after ${ms}ms`)), ms)
  );
  return Promise.race([promise, timeout]);
}

function buildOllamaPrompt(originalInput, context, contextTool) {
  if (!context) return originalInput;

  if (contextTool === "csv") {
    if (context.error) {
      return `The CSV file could not be loaded: ${context.error}. Please explain this error to the user.`;
    }

    const statsText = context.statistics
      ? Object.entries(context.statistics).map(([col, stats]) => {
          if (stats.min !== undefined) {
            return `- ${col}: min=${stats.min}, max=${stats.max}, avg=${stats.avg} (numeric)`;
          }
          return `- ${col}: ${stats.unique} unique values, sample: [${(stats.sample || []).join(", ")}] (text)`;
        }).join("\n")
      : "No statistics available";

    const sampleText = context.sample
      ? context.sample.map((row, i) =>
          `Row ${i+1}: ${Object.entries(row).map(([k,v]) => `${k}=${v}`).join(", ")}`
        ).join("\n")
      : "No sample data";

    return `You are a data analyst. Analyze this CSV data and identify the top trends, patterns, and insights.

CSV File Summary:
- Total Rows: ${context.rowCount}
- Columns: ${(context.columns || []).join(", ")}

Column Statistics:
${statsText}

Sample Data:
${sampleText}

Please provide:
1. Top 3-5 trends you see in this data
2. Key insights about each column
3. Any notable patterns or anomalies
4. A brief recommendation based on the data

Be specific and reference the actual numbers from the data.`;
  }

  if (Array.isArray(context)) {
    const contextStr = context.map((item, i) =>
      item.title
        ? `${i + 1}. ${item.title} — ${item.url || ""}`
        : `${i + 1}. ${item.text || JSON.stringify(item)}`
    ).join("\n");

    return `${originalInput}\n\nHere is the actual data retrieved:\n${contextStr}\n\nPlease summarize and analyze the above data specifically.`;
  }

  return `${originalInput}\n\nContext:\n${JSON.stringify(context, null, 2)}`;
}

async function executeWorkflow(plan) {
  const logs    = [];
  const results = [];
  let   context     = null;
  let   contextTool = null;
  let   ollamaOutput = null;   // ← Track Ollama output separately

  if (!plan || !Array.isArray(plan.steps)) {
    return {
      success: false,
      logs:    ["Invalid plan: no steps array found"],
      results: []
    };
  }

  for (const step of plan.steps) {
    let { tool, input } = step;
    logs.push(`Running step: ${tool} | Input: ${input}`);
    console.log(`[Executor] Running: ${tool}`);

    try {
      let output;

      switch (tool) {
        case "reddit": {
          output      = await withTimeout(runReddit(input), 10000, "reddit");
          context     = output;
          contextTool = "reddit";
          break;
        }
        case "x":
        case "twitter": {
          output      = await withTimeout(runX(input), 10000, "x");
          context     = output;
          contextTool = "x";
          break;
        }
        case "hackernews":
        case "hn": {
          output      = await withTimeout(runHackerNews(input), 10000, "hackernews");
          context     = output;
          contextTool = "hackernews";
          break;
        }
        case "csv": {
          output      = await withTimeout(runCSV(input), 10000, "csv");
          context     = output;
          contextTool = "csv";
          break;
        }
        case "calendar":
        case "schedule": {
          output      = await withTimeout(runCalendar(input), 5000, "calendar");
          context     = output;
          contextTool = "calendar";
          break;
        }
        case "ollama": {
          const ollamaPrompt = buildOllamaPrompt(input, context, contextTool);
          console.log(`[Executor] Ollama prompt type: ${contextTool || "direct"}`);
          output       = await withTimeout(runOllama(ollamaPrompt), 120000, "ollama");
          ollamaOutput = output;  // ← Save Ollama output for email
          break;
        }
        case "email": {
          // Use Ollama summary if available, otherwise use raw context
          const emailBody = ollamaOutput || context;
          console.log("[Executor] Email using:", ollamaOutput ? "Ollama summary" : "raw context");
          output = await withTimeout(
            runEmail({ body: input, context: emailBody }),
            5000,
            "email"
          );
          break;
        }
        default:
          output = `Unknown tool: ${tool}`;
      }

      console.log(`[Executor] Done: ${tool}`);
      logs.push(`Done: ${tool} -> ${JSON.stringify(output).slice(0, 120)}`);
      results.push({ tool, input, output });

    } catch (err) {
      console.error(`[Executor] Error in ${tool}:`, err.message);
      logs.push(`Error in step [${tool}]: ${err.message}`);
      results.push({ tool, input, output: null, error: err.message });
    }
  }

  console.log("[Executor] All steps complete");
  return { success: true, logs, results };
}

module.exports = { executeWorkflow };

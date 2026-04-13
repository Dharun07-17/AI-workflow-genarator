const express             = require("express");
const router              = express.Router();
const { planWorkflow }    = require("../planner/workflowPlanner");
const { executeWorkflow } = require("../executor/workflowExecutor");

router.post("/run", async (req, res) => {
  const { prompt } = req.body;

  if (!prompt || typeof prompt !== "string" || prompt.trim() === "") {
    return res.status(400).json({
      success: false,
      error: "Prompt is required and must be a non-empty string"
    });
  }

  try {
    console.log("[Route] Received prompt:", prompt);

    // Await the planner — this may take up to 60s while Ollama thinks
    const plan = await planWorkflow(prompt.trim());
    console.log("[Route] Plan resolved:", JSON.stringify(plan));

    if (!plan || !Array.isArray(plan.steps) || plan.steps.length === 0) {
      return res.status(500).json({
        success: false,
        error:   "Planner returned no steps"
      });
    }

    const execution = await executeWorkflow(plan);
    console.log("[Route] Execution complete. Steps:", execution.results.length);

    return res.json({
      success: true,
      prompt,
      plan,
      logs:    execution.logs,
      results: execution.results
    });

  } catch (err) {
    console.error("[Route] Fatal error:", err.message);
    return res.status(500).json({
      success: false,
      error:   err.message
    });
  }
});

module.exports = router;

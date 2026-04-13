const KNOWN_TOOLS = [
  'reddit.fetch_posts',
  'x.fetch_trends',
  'ollama.summarize',
  'ollama.analyze'
];

function validatePlan(plan) {
  const errors = [];

  if (!Array.isArray(plan)) {
    return { valid: false, errors: ['Plan must be an array of steps'] };
  }

  if (plan.length === 0) {
    return { valid: false, errors: ['Plan must contain at least one step'] };
  }

  plan.forEach((step, i) => {
    const stepNum = i + 1;

    // Check tool exists
    if (!step.tool) {
      errors.push(`Step ${stepNum}: missing required field "tool"`);
    } else if (!KNOWN_TOOLS.includes(step.tool)) {
      errors.push(
        `Step ${stepNum}: unknown tool "${step.tool}". Known: ${KNOWN_TOOLS.join(', ')}`
      );
    }

    // Check args type
    if (step.args !== undefined && typeof step.args !== 'object') {
      errors.push(`Step ${stepNum}: "args" must be an object`);
    }

    // Check input_from dependency
    if (step.args && step.args.input_from) {
      const precedingTools = plan.slice(0, i).map(s => s.tool);

      if (!precedingTools.includes(step.args.input_from)) {
        errors.push(
          `Step ${stepNum}: input_from references "${step.args.input_from}" which has not been executed yet`
        );
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

module.exports = { validatePlan };
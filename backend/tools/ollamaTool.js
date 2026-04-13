const axios = require('axios');

async function runOllama(prompt) {
  try {
    console.log('[Ollama] Sending request...');
    const response = await axios.post(
      'http://localhost:11434/api/generate',
      {
        model:  'llama2',
        prompt: prompt,
        stream: false
      },
      { timeout: 120000 }
    );

    console.log('[Ollama] Response received');
    return response.data && response.data.response
      ? response.data.response.trim()
      : 'No response from Ollama';

  } catch (err) {
    console.warn('[Ollama] Failed, using mock. Reason:', err.message);
    return `[MOCK] Ollama response for: "${prompt}"`;
  }
}

module.exports = { runOllama };

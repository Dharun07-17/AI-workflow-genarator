# Flowberry AI-Workflow automation

A full-stack app that converts natural language workflow descriptions into structured JSON execution plans and runs them step-by-step.

---

## 🚀 Quick Start

### Backend
```bash
cd ai-workflow-generator/backend
npm install
npm run dev

Frontend

cd ai-workflow-generator/frontend
npm install
npm run dev

Open: http://localhost:5173
```

---

📡 API

POST `/api/workflow`

Body:

```JSON
{
  "prompt": "Fetch posts from r/technology and summarize"
}
```

---

🛠️ Supported Tools

Tool	Description

`reddit.fetch_posts`	Fetch top posts from a subreddit
`x.fetch_trends`	Fetch trending topics from X
`ollama.summarize`	Summarize content using Ollama
`ollama.analyze`	Analyze and extract insights


> All tools include mock implementations that work without real API credentials.



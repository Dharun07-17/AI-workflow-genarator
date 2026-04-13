require('dotenv').config();

const express        = require('express');
const cors           = require('cors');
const workflowRoutes = require('./routes/workflowRoutes');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/workflow', workflowRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

app.listen(PORT, () => {
  console.log(`[server] running on http://localhost:${PORT}`);
  console.log(`[server] POST http://localhost:${PORT}/api/workflow/run`);
});

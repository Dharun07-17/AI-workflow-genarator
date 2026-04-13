const express        = require('express');
const cors           = require('cors');
const workflowRoutes = require('./routes/workflowRoutes');

const app  = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/workflow', workflowRoutes);

app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

app.use((err, req, res, next) => {
  console.error('[Server Error]', err.message);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});

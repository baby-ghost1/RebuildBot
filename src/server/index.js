import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import analyzeRepo from './analyzer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json());

// Serve the built frontend if it exists (production mode)
const distPath = path.join(__dirname, '..', '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Analyze a repo directory for Buildathon rebuild-readiness
app.post('/api/analyze', (req, res) => {
  try {
    const { repoPath } = req.body;
    const target = repoPath || path.join(__dirname, '..', '..');
    const report = analyzeRepo(target);
    res.json({ success: true, report });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Serve index.html for any other GET route (SPA fallback in production)
app.get('*', (req, res) => {
  const indexPath = path.join(distPath, 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.json({
      message: 'RebuildBot API is running. Start the Vite dev server on port 5173 for the UI.',
      endpoints: ['/api/health', '/api/analyze'],
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`RebuildBot API listening on port ${PORT}`);
});

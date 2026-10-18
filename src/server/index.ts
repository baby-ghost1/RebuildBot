import express from 'express';
import jwt from 'jsonwebtoken';

const app = express();
app.use(express.json());

// Mock API endpoint that simulates a build task
app.post('/api/build-task', (req, res) => {
  const { taskId, description } = req.body;
  
  // Simulate async build process
  setTimeout(() => {
    res.json({
      success: true,
      taskId,
      status: 'completed',
      message: `Task ${taskId} built successfully`
    });
  }, 500);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`RebuildBot API listening on port ${PORT}`);
});

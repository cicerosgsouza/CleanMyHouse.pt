import express from 'express';
import { createServer } from 'http';
import { existsSync } from 'fs';
import path from 'path';

const app = express();
const server = createServer(app);
const port = process.env.PORT || 5000;

// Set production environment
process.env.NODE_ENV = 'production';

// Basic middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Health check endpoints
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Clean My House - Production Server',
    timestamp: new Date().toISOString(),
    env: 'production'
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString()
  });
});

// Try to serve static files if build exists
const distPath = path.resolve('./dist/public');
if (existsSync(distPath)) {
  console.log('Serving static files from:', distPath);
  app.use(express.static(distPath));
  
  // SPA fallback
  app.get('*', (req, res) => {
    const indexPath = path.resolve(distPath, 'index.html');
    if (existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.json({ 
        status: 'ok', 
        message: 'Clean My House - Static files missing',
        timestamp: new Date().toISOString()
      });
    }
  });
} else {
  // Fallback when no build
  app.get('*', (req, res) => {
    res.json({ 
      status: 'ok', 
      message: 'Clean My House - Build in progress',
      timestamp: new Date().toISOString()
    });
  });
}

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    status: 'error', 
    message: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// Start server
server.listen(port, '0.0.0.0', () => {
  console.log(`Production server running on port ${port}`);
  console.log(`Health check available at: http://localhost:${port}/health`);
  
  // Try to start main application after server is stable
  setTimeout(async () => {
    try {
      if (existsSync('./dist/index.js')) {
        console.log('Loading main application...');
        await import('./dist/index.js');
      }
    } catch (error) {
      console.error('Main application failed to load:', error);
    }
  }, 2000);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});
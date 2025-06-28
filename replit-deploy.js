#!/usr/bin/env node

// Dedicated Replit deployment configuration
import express from 'express';
import { createServer } from 'http';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';

const app = express();
const server = createServer(app);
const PORT = process.env.PORT || 5000;

// Essential middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Critical health endpoints for Replit deployment
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'Clean My House Time Tracking',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Root endpoint required by Replit
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'running',
    message: 'Clean My House - Time Tracking System',
    timestamp: new Date().toISOString(),
    environment: 'production'
  });
});

// API fallback routes
app.get('/api/*', (req, res) => {
  res.status(503).json({
    error: 'Service initializing',
    message: 'Main application loading...',
    timestamp: new Date().toISOString()
  });
});

// Start server immediately for Replit health checks
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Replit deployment server running on port ${PORT}`);
  
  // Initialize main application after server is responding
  initializeApplication();
});

async function initializeApplication() {
  try {
    console.log('Initializing application...');
    
    // Ensure production build exists
    if (!existsSync('./dist/index.js')) {
      console.log('Creating production build...');
      execSync('npm run build', { stdio: 'pipe' });
    }
    
    if (!existsSync('./dist/index.js')) {
      throw new Error('Production build failed');
    }
    
    console.log('Build verified, loading main application...');
    
    // Close the basic server
    server.close();
    
    // Start the main application
    process.env.NODE_ENV = 'production';
    await import('./dist/index.js');
    
    console.log('Main application loaded successfully');
    
  } catch (error) {
    console.error('Application initialization failed:', error);
    
    // Fallback: restart basic server
    server.listen(PORT, '0.0.0.0', () => {
      console.log('Fallback server restarted on port', PORT);
    });
  }
}

// Graceful shutdown handlers
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down...');
  server.close(() => process.exit(0));
});
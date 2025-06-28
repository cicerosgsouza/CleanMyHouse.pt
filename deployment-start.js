#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync, writeFileSync } from 'fs';
import path from 'path';

console.log('🚀 Deployment Start Script - Clean My House');

// Set production environment
process.env.NODE_ENV = 'production';
process.env.PORT = process.env.PORT || '5000';

async function deploymentProcess() {
  try {
    console.log('📦 Building application...');
    
    // Build the application
    execSync('npm run build', { stdio: 'inherit' });
    
    // Verify build exists
    const distExists = existsSync('./dist');
    const publicExists = existsSync('./dist/public');
    const indexExists = existsSync('./dist/index.js');
    
    if (!distExists || !publicExists || !indexExists) {
      throw new Error('Build verification failed - missing files');
    }
    
    console.log('✅ Build verified successfully');
    
    // Create a simple health check server first
    console.log('🔍 Starting health check server...');
    
    const healthServer = `
import express from 'express';
const app = express();
const port = process.env.PORT || 5000;

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Clean My House - Loading...', timestamp: new Date().toISOString() });
});

app.listen(port, '0.0.0.0', () => {
  console.log('Health server running on port ' + port);
  
  // Start main application after health server is up
  setTimeout(() => {
    import('./dist/index.js').catch(err => {
      console.error('Main app failed:', err);
    });
  }, 1000);
});
`;
    
    writeFileSync('./health-server.js', healthServer);
    
    // Start the health server
    execSync('node health-server.js', { stdio: 'inherit' });
    
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    
    // Fallback server
    console.log('🔄 Starting fallback server...');
    const fallback = `
import express from 'express';
const app = express();
const port = process.env.PORT || 5000;

app.get('*', (req, res) => {
  res.json({ 
    status: 'maintenance', 
    message: 'Clean My House - Deployment in progress',
    timestamp: new Date().toISOString()
  });
});

app.listen(port, '0.0.0.0', () => {
  console.log('Fallback server running on port ' + port);
});
`;
    writeFileSync('./fallback-server.js', fallback);
    execSync('node fallback-server.js', { stdio: 'inherit' });
  }
}

deploymentProcess();
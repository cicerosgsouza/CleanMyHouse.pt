#!/usr/bin/env node

// Robust startup script for Replit deployment
import { spawn, execSync } from 'child_process';
import { existsSync } from 'fs';

console.log('Starting Clean My House application...');

// Set production environment
process.env.NODE_ENV = 'production';
const port = process.env.PORT || 5000;

try {
  // Ensure build exists
  if (!existsSync('./dist/index.js')) {
    console.log('Building application...');
    execSync('npm run build', { stdio: 'inherit' });
  }

  console.log('Starting server...');
  
  // Start the main application
  const serverProcess = spawn('node', ['dist/index.js'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: port
    }
  });

  // Handle process events
  serverProcess.on('close', (code) => {
    console.log(`Server process exited with code ${code}`);
    process.exit(code);
  });

  serverProcess.on('error', (error) => {
    console.error('Server error:', error);
    process.exit(1);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('Terminating server...');
    serverProcess.kill('SIGTERM');
  });

  process.on('SIGINT', () => {
    console.log('Interrupting server...');
    serverProcess.kill('SIGINT');
  });

} catch (error) {
  console.error('Startup failed:', error);
  process.exit(1);
}
#!/usr/bin/env node

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';

console.log('🚀 Starting production server...');

// Set environment variables
process.env.NODE_ENV = 'production';

// Check if build exists, if not create it
const distPath = path.resolve(process.cwd(), 'dist');
if (!existsSync(distPath)) {
  console.log('📦 Building application first...');
  
  const buildProcess = spawn('npm', ['run', 'build'], {
    stdio: 'inherit',
    shell: true
  });
  
  buildProcess.on('close', (code) => {
    if (code !== 0) {
      console.error('❌ Build failed');
      process.exit(1);
    }
    
    console.log('✅ Build completed, starting server...');
    startServer();
  });
} else {
  console.log('📁 Build exists, starting server...');
  startServer();
}

function startServer() {
  const serverProcess = spawn('node', ['dist/index.js'], {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'production',
      PORT: process.env.PORT || '5000'
    }
  });
  
  serverProcess.on('close', (code) => {
    console.log(`Server process exited with code ${code}`);
    process.exit(code);
  });
  
  serverProcess.on('error', (error) => {
    console.error('Server error:', error);
    process.exit(1);
  });
}
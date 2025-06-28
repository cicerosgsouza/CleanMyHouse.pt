#!/usr/bin/env node

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';

console.log('🚀 Starting deployment process...');

try {
  // Ensure we're in the right directory
  const packageJsonPath = path.resolve(process.cwd(), 'package.json');
  if (!existsSync(packageJsonPath)) {
    throw new Error('package.json not found in current directory');
  }

  console.log('📦 Building application...');
  execSync('npm run build', { stdio: 'inherit' });

  // Verify build outputs exist
  const distPath = path.resolve(process.cwd(), 'dist');
  const publicPath = path.resolve(distPath, 'public');
  const serverPath = path.resolve(distPath, 'index.js');

  if (!existsSync(distPath)) {
    throw new Error('Build failed: dist directory not created');
  }

  if (!existsSync(publicPath)) {
    throw new Error('Build failed: public directory not created');
  }

  if (!existsSync(serverPath)) {
    throw new Error('Build failed: server bundle not created');
  }

  console.log('✅ Build completed successfully');
  console.log('🎯 Starting production server...');

  // Set production environment and start server
  process.env.NODE_ENV = 'production';
  
  // Import and start the server
  const serverModule = await import('./dist/index.js');
  
} catch (error) {
  console.error('❌ Deployment failed:', error.message);
  process.exit(1);
}
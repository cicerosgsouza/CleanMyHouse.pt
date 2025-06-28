#!/bin/bash

echo "🚀 Clean My House - Deployment Script"

# Set environment
export NODE_ENV=production
export PORT=${PORT:-5000}

# Build application
echo "📦 Building application..."
npm run build

# Verify build
if [ ! -f "dist/index.js" ]; then
    echo "❌ Build failed - dist/index.js not found"
    exit 1
fi

if [ ! -d "dist/public" ]; then
    echo "❌ Build failed - dist/public not found"
    exit 1
fi

echo "✅ Build verified successfully"

# Start application
echo "🎯 Starting production server..."
exec node dist/index.js
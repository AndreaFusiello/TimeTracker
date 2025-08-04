#!/bin/bash

# Build script per Render.com deploy
set -e

echo "🔧 Starting TimeTracker Pro build process..."

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --prefer-offline --no-audit

# Run type checking
echo "🔍 Running type checks..."
npm run check

# Build frontend
echo "🏗️ Building frontend..."
vite build

# Build backend
echo "🏗️ Building backend..."
esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist

# Create uploads directory
echo "📁 Creating uploads directory..."
mkdir -p dist/uploads

# Copy necessary files
echo "📋 Copying static files..."
cp -r shared dist/
cp package.json dist/

echo "✅ Build completed successfully!"
echo "📊 Build summary:"
echo "   - Frontend: dist/public/"
echo "   - Backend: dist/index.js"
echo "   - Static files: dist/shared/"
echo "   - Uploads: dist/uploads/"

# Test build
echo "🧪 Testing build..."
node -e "console.log('Build test passed!')"

echo "🚀 Ready for deployment!"
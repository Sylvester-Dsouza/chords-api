#!/bin/bash

# Render build script for NestJS API with memory optimization
echo "🚀 Starting Render build process..."

# Set Node.js memory limits for build process
export NODE_OPTIONS="--max-old-space-size=400 --optimize-for-size"

# Set npm configuration for memory efficiency
echo "📦 Setting npm configuration..."
npm config set legacy-peer-deps true
npm config set fund false
npm config set audit false
npm config set maxsockets 1

# Clean install with memory optimization
echo "🧹 Installing dependencies with memory optimization..."
rm -rf node_modules package-lock.json
npm ci --legacy-peer-deps --no-fund --no-audit --prefer-offline

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Build the application with memory limits
echo "🏗️ Building NestJS application..."
NODE_OPTIONS="--max-old-space-size=400" npm run build

# Clean up unnecessary files to save space
echo "🧹 Cleaning up build artifacts..."
rm -rf node_modules/.cache
rm -rf .npm
find node_modules -name "*.md" -delete
find node_modules -name "*.txt" -delete

echo "✅ Build completed successfully!"

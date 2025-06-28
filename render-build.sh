#!/bin/bash

# Render build script for NestJS API
echo "🚀 Starting Render build process..."

# Set npm configuration
echo "📦 Setting npm configuration..."
npm config set legacy-peer-deps true
npm config set fund false
npm config set audit false

# Clean install with legacy peer deps
echo "🧹 Cleaning and installing dependencies..."
rm -rf node_modules package-lock.json
npm install --legacy-peer-deps --no-fund --no-audit

# Generate Prisma client
echo "🔧 Generating Prisma client..."
npx prisma generate

# Build the application
echo "🏗️ Building NestJS application..."
npm run build

echo "✅ Build completed successfully!"

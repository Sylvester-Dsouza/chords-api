#!/bin/bash

echo "🚀 Render Ping Service Deployment Helper"
echo "========================================"
echo ""

# Check if API_URL is provided
if [ -z "$1" ]; then
    echo "❌ Error: Please provide your main API URL"
    echo ""
    echo "Usage: ./deploy-ping-service.sh https://your-main-api.onrender.com"
    echo ""
    echo "Example: ./deploy-ping-service.sh https://chords-api.onrender.com"
    exit 1
fi

API_URL=$1

echo "📍 Main API URL: $API_URL"
echo ""

# Test the health endpoint
echo "🔍 Testing health endpoint..."
HEALTH_URL="${API_URL}/health/ping"

if curl -s --max-time 10 "$HEALTH_URL" > /dev/null; then
    echo "✅ Health endpoint is accessible: $HEALTH_URL"
else
    echo "⚠️  Warning: Could not reach health endpoint: $HEALTH_URL"
    echo "   Make sure your main API is running and accessible"
fi

echo ""
echo "📋 Next Steps:"
echo "1. Go to https://render.com and create a new Web Service"
echo "2. Connect this repository"
echo "3. Use these settings:"
echo "   - Service Name: chords-api-ping"
echo "   - Build Command: echo \"No build needed\""
echo "   - Start Command: node ping-service.js"
echo "4. Add Environment Variables:"
echo "   - API_URL: $API_URL"
echo "   - NODE_ENV: production"
echo "5. Deploy the service"
echo ""
echo "🎯 The ping service will keep your main API alive by pinging it every 13 minutes!"
echo ""

# Create a temporary render.yaml for the ping service
cat > ping-render-temp.yaml << EOF
services:
  - type: web
    name: chords-api-ping
    env: node
    runtime: node
    nodeVersion: 18.x
    region: singapore
    plan: free
    buildCommand: echo "No build needed for ping service"
    startCommand: node ping-service.js
    envVars:
      - key: API_URL
        value: $API_URL
      - key: NODE_ENV
        value: production
    autoDeploy: false
EOF

echo "📄 Created ping-render-temp.yaml with your API URL"
echo "   You can use this file to deploy via Render's Infrastructure as Code"
echo ""
echo "🔗 Useful Links:"
echo "   - Render Dashboard: https://dashboard.render.com"
echo "   - Main API Health: $HEALTH_URL"
echo "   - Documentation: ./PING_SERVICE_README.md"
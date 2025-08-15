#!/usr/bin/env node

const https = require('https');
const http = require('http');

// Configuration - Updated for correct endpoint
const API_URL = process.env.API_URL || 'https://your-render-app.onrender.com';
const PING_INTERVAL = 13 * 60 * 1000; // 13 minutes (safer than 14)
const HEALTH_ENDPOINT = '/health/ping'; // Use the simpler ping endpoint
const MAX_RETRIES = 3;
const RETRY_DELAY = 5000; // 5 seconds

// Enhanced HTTP/HTTPS request function with retry logic
function makeRequest(url, attempt = 1) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https://');
    const client = isHttps ? https : http;
    
    const request = client.get(url, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        resolve({
          statusCode: response.statusCode,
          data: data,
          attempt: attempt
        });
      });
    });
    
    request.on('error', (error) => {
      reject(new Error(`Request failed (attempt ${attempt}): ${error.message}`));
    });
    
    // Set timeout to 30 seconds
    request.setTimeout(30000, () => {
      request.destroy();
      reject(new Error(`Request timeout after 30s (attempt ${attempt})`));
    });
  });
}

// Ping with retry logic
async function pingWithRetry(url) {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await makeRequest(url, attempt);
      return response;
    } catch (error) {
      if (attempt === MAX_RETRIES) {
        throw error;
      }
      
      console.log(`⚠️  Attempt ${attempt} failed: ${error.message}. Retrying in ${RETRY_DELAY / 1000}s...`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
    }
  }
}

// Enhanced ping function
async function pingAPI() {
  const timestamp = new Date().toISOString();
  const pingUrl = `${API_URL}${HEALTH_ENDPOINT}`;
  
  try {
    console.log(`[${timestamp}] 🏓 Pinging API: ${pingUrl}`);
    
    const startTime = Date.now();
    const response = await pingWithRetry(pingUrl);
    const responseTime = Date.now() - startTime;
    
    if (response.statusCode === 200) {
      console.log(`[${timestamp}] ✅ API is alive! Status: ${response.statusCode}, Response time: ${responseTime}ms${response.attempt > 1 ? ` (attempt ${response.attempt})` : ''}`);
      
      // Try to parse response data for additional info
      try {
        const data = JSON.parse(response.data);
        if (data.uptime) {
          console.log(`[${timestamp}] ℹ️  Server uptime: ${Math.floor(data.uptime)}s`);
        }
      } catch (e) {
        // Not JSON or doesn't matter
      }
    } else {
      console.log(`[${timestamp}] ⚠️  API responded with status: ${response.statusCode}, Response time: ${responseTime}ms`);
    }
  } catch (error) {
    console.error(`[${timestamp}] ❌ Failed to ping API after ${MAX_RETRIES} attempts: ${error.message}`);
  }
}

// Calculate next ping time
function getNextPingTime() {
  const next = new Date(Date.now() + PING_INTERVAL);
  return next.toLocaleString();
}

// Start the ping service
function startPingService() {
  console.log('🚀 Starting Enhanced API Ping Service for Render Free Plan');
  console.log('=========================================================');
  console.log(`📍 Target URL: ${API_URL}${HEALTH_ENDPOINT}`);
  console.log(`⏰ Ping interval: ${PING_INTERVAL / 1000 / 60} minutes`);
  console.log(`🔄 Max retries: ${MAX_RETRIES}`);
  console.log(`⏱️  Retry delay: ${RETRY_DELAY / 1000} seconds`);
  console.log(`🕐 Next ping: ${getNextPingTime()}`);
  console.log('=========================================================\n');
  
  // Validate configuration
  if (API_URL === 'https://your-render-app.onrender.com') {
    console.error('❌ ERROR: Please set the API_URL environment variable to your actual Render app URL');
    console.error('   Example: export API_URL="https://your-app-name.onrender.com"');
    process.exit(1);
  }
  
  // Initial ping
  pingAPI();
  
  // Set up interval
  const intervalId = setInterval(() => {
    pingAPI();
    console.log(`ℹ️  Next ping scheduled for: ${getNextPingTime()}`);
  }, PING_INTERVAL);
  
  // Graceful shutdown handlers
  const shutdown = () => {
    console.log('\n🛑 Shutting down ping service...');
    clearInterval(intervalId);
    process.exit(0);
  };
  
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error(`💥 Uncaught exception: ${error.message}`);
    console.error(error.stack);
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    console.error(`💥 Unhandled rejection at: ${promise}, reason: ${reason}`);
  });
}

// Start the service
startPingService();
#!/usr/bin/env node

const https = require('https');
const http = require('http');

// Configuration
const API_URL = process.env.API_URL || 'https://your-render-app.onrender.com';
const PING_INTERVAL = 14 * 60 * 1000; // 14 minutes in milliseconds
const HEALTH_ENDPOINT = '/health';

// Simple HTTP/HTTPS request function
function makeRequest(url) {
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
          data: data
        });
      });
    });
    
    request.on('error', (error) => {
      reject(error);
    });
    
    // Set timeout to 30 seconds
    request.setTimeout(30000, () => {
      request.destroy();
      reject(new Error('Request timeout'));
    });
  });
}

// Ping function
async function pingAPI() {
  const timestamp = new Date().toISOString();
  const pingUrl = `${API_URL}${HEALTH_ENDPOINT}`;
  
  try {
    console.log(`[${timestamp}] Pinging API: ${pingUrl}`);
    
    const response = await makeRequest(pingUrl);
    
    if (response.statusCode === 200) {
      console.log(`[${timestamp}] ✅ API is alive! Status: ${response.statusCode}`);
    } else {
      console.log(`[${timestamp}] ⚠️  API responded with status: ${response.statusCode}`);
    }
  } catch (error) {
    console.error(`[${timestamp}] ❌ Failed to ping API:`, error.message);
  }
}

// Start the ping service
function startPingService() {
  console.log('🚀 Starting API Ping Service');
  console.log(`📍 Target URL: ${API_URL}${HEALTH_ENDPOINT}`);
  console.log(`⏰ Ping interval: ${PING_INTERVAL / 1000 / 60} minutes`);
  console.log('=====================================\n');
  
  // Initial ping
  pingAPI();
  
  // Set up interval
  const intervalId = setInterval(pingAPI, PING_INTERVAL);
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down ping service...');
    clearInterval(intervalId);
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down ping service...');
    clearInterval(intervalId);
    process.exit(0);
  });
}

// Start the service
startPingService();
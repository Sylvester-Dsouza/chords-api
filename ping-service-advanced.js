#!/usr/bin/env node

const https = require('https');
const http = require('http');

// Configuration from environment variables
const config = {
  apiUrl: process.env.API_URL || 'https://your-render-app.onrender.com',
  pingInterval: parseInt(process.env.PING_INTERVAL_MINUTES || '14') * 60 * 1000,
  healthEndpoint: process.env.HEALTH_ENDPOINT || '/health',
  timeout: parseInt(process.env.REQUEST_TIMEOUT || '30') * 1000,
  retryAttempts: parseInt(process.env.RETRY_ATTEMPTS || '3'),
  retryDelay: parseInt(process.env.RETRY_DELAY || '5') * 1000,
};

// Logging utility
const log = {
  info: (message) => console.log(`[${new Date().toISOString()}] ℹ️  ${message}`),
  success: (message) => console.log(`[${new Date().toISOString()}] ✅ ${message}`),
  warning: (message) => console.log(`[${new Date().toISOString()}] ⚠️  ${message}`),
  error: (message) => console.error(`[${new Date().toISOString()}] ❌ ${message}`),
};

// HTTP request with timeout and retry logic
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
    
    request.setTimeout(config.timeout, () => {
      request.destroy();
      reject(new Error(`Request timeout after ${config.timeout}ms (attempt ${attempt})`));
    });
  });
}

// Ping with retry logic
async function pingWithRetry(url) {
  for (let attempt = 1; attempt <= config.retryAttempts; attempt++) {
    try {
      const response = await makeRequest(url, attempt);
      return response;
    } catch (error) {
      if (attempt === config.retryAttempts) {
        throw error;
      }
      
      log.warning(`Attempt ${attempt} failed: ${error.message}. Retrying in ${config.retryDelay / 1000}s...`);
      await new Promise(resolve => setTimeout(resolve, config.retryDelay));
    }
  }
}

// Main ping function
async function pingAPI() {
  const pingUrl = `${config.apiUrl}${config.healthEndpoint}`;
  
  try {
    log.info(`Pinging API: ${pingUrl}`);
    
    const startTime = Date.now();
    const response = await pingWithRetry(pingUrl);
    const responseTime = Date.now() - startTime;
    
    if (response.statusCode === 200) {
      log.success(`API is alive! Status: ${response.statusCode}, Response time: ${responseTime}ms${response.attempt > 1 ? ` (attempt ${response.attempt})` : ''}`);
    } else {
      log.warning(`API responded with status: ${response.statusCode}, Response time: ${responseTime}ms`);
    }
    
    // Log response data if it's JSON and contains useful info
    try {
      const jsonData = JSON.parse(response.data);
      if (jsonData.status || jsonData.uptime || jsonData.memory) {
        log.info(`Health data: ${JSON.stringify(jsonData)}`);
      }
    } catch (e) {
      // Not JSON or doesn't matter
    }
    
  } catch (error) {
    log.error(`Failed to ping API after ${config.retryAttempts} attempts: ${error.message}`);
  }
}

// Calculate next ping time
function getNextPingTime() {
  const next = new Date(Date.now() + config.pingInterval);
  return next.toLocaleString();
}

// Start the ping service
function startPingService() {
  console.log('🚀 Starting Advanced API Ping Service');
  console.log('=====================================');
  console.log(`📍 Target URL: ${config.apiUrl}${config.healthEndpoint}`);
  console.log(`⏰ Ping interval: ${config.pingInterval / 1000 / 60} minutes`);
  console.log(`🔄 Retry attempts: ${config.retryAttempts}`);
  console.log(`⏱️  Request timeout: ${config.timeout / 1000} seconds`);
  console.log(`🕐 Next ping: ${getNextPingTime()}`);
  console.log('=====================================\n');
  
  // Initial ping
  pingAPI();
  
  // Set up interval
  const intervalId = setInterval(() => {
    pingAPI();
    log.info(`Next ping scheduled for: ${getNextPingTime()}`);
  }, config.pingInterval);
  
  // Graceful shutdown handlers
  const shutdown = () => {
    log.info('Shutting down ping service...');
    clearInterval(intervalId);
    process.exit(0);
  };
  
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    log.error(`Uncaught exception: ${error.message}`);
    log.error(error.stack);
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    log.error(`Unhandled rejection at: ${promise}, reason: ${reason}`);
  });
}

// Validate configuration
function validateConfig() {
  if (!config.apiUrl || config.apiUrl === 'https://your-render-app.onrender.com') {
    log.error('Please set the API_URL environment variable to your actual Render app URL');
    process.exit(1);
  }
  
  if (config.pingInterval < 60000) { // Less than 1 minute
    log.warning('Ping interval is less than 1 minute. This might be too frequent.');
  }
  
  if (config.pingInterval > 15 * 60 * 1000) { // More than 15 minutes
    log.warning('Ping interval is more than 15 minutes. Your app might still spin down.');
  }
}

// Main execution
if (require.main === module) {
  validateConfig();
  startPingService();
}

module.exports = { pingAPI, startPingService };
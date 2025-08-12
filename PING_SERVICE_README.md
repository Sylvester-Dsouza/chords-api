# API Ping Service

This service keeps your Render API alive by pinging it every 14 minutes to prevent it from spinning down on the free plan.

## Quick Start

### Option 1: Run locally (simplest)

1. Set your API URL:
```bash
export API_URL="https://your-actual-render-app.onrender.com"
```

2. Run the ping service:
```bash
npm run ping
```

### Option 2: Run with custom settings

```bash
# Set environment variables
export API_URL="https://your-actual-render-app.onrender.com"
export PING_INTERVAL_MINUTES=14
export RETRY_ATTEMPTS=3

# Run advanced ping service
node ping-service-advanced.js
```

### Option 3: Deploy as separate service on Render

1. Create a new Web Service on Render
2. Connect this repository
3. Set build command: `npm install`
4. Set start command: `node ping-service-advanced.js`
5. Add environment variables:
   - `API_URL`: Your main API URL
   - `PING_INTERVAL_MINUTES`: 14 (default)

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `API_URL` | Required | Your Render app URL |
| `PING_INTERVAL_MINUTES` | 14 | Minutes between pings |
| `HEALTH_ENDPOINT` | `/health` | Health check endpoint |
| `REQUEST_TIMEOUT` | 30 | Request timeout in seconds |
| `RETRY_ATTEMPTS` | 3 | Number of retry attempts |
| `RETRY_DELAY` | 5 | Delay between retries in seconds |

## Features

- ✅ Configurable ping intervals
- ✅ Retry logic with exponential backoff
- ✅ Health endpoint monitoring
- ✅ Detailed logging with timestamps
- ✅ Graceful shutdown handling
- ✅ Error handling and recovery
- ✅ Response time monitoring

## Logs

The service provides detailed logs:
- `ℹ️` Info messages
- `✅` Success messages  
- `⚠️` Warning messages
- `❌` Error messages

## Running in Production

For production use, consider:

1. **Process Manager**: Use PM2 or similar
```bash
npm install -g pm2
pm2 start ping-service-advanced.js --name "api-ping"
```

2. **Docker**: Create a lightweight container
3. **Cron Job**: Use system cron for simple scheduling
4. **Separate Render Service**: Deploy as its own service

## Troubleshooting

### Common Issues

1. **API_URL not set**: Make sure to set your actual Render app URL
2. **Connection timeouts**: Check if your API is accessible
3. **Too frequent pings**: Render might rate limit, adjust interval
4. **Memory usage**: The simple version uses minimal memory

### Testing

Test the ping service manually:
```bash
# Test single ping
curl https://your-render-app.onrender.com/health

# Test with the ping service
API_URL="https://your-render-app.onrender.com" node ping-service.js
```

## Cost Considerations

- Running locally: Free (uses your computer)
- Separate Render service: Uses another free tier slot
- Consider using a cheap VPS or serverless function for production
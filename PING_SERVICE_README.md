# 🏓 API Ping Service for Render Free Plan

This service keeps your Render API alive by pinging it every 13 minutes to prevent it from spinning down on the free plan (which happens after 15 minutes of inactivity).

## 🚀 Quick Setup

### Option 1: Deploy as Separate Render Service (Recommended)

1. **Create a new Web Service on Render**
   - Connect this same repository
   - Service name: `chords-api-ping`
   - Build command: `echo "No build needed"`
   - Start command: `node ping-service.js`

2. **Set Environment Variables**
   ```
   API_URL=https://your-main-api.onrender.com
   NODE_ENV=production
   ```

3. **Deploy** - The ping service will start automatically

### Option 2: Run Locally

```bash
# Set your API URL
export API_URL="https://your-render-app.onrender.com"

# Run the ping service
npm run ping
```

### Option 3: Use External Service

Deploy to Heroku, Railway, or any other platform that offers free tier.

## ⚙️ Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `API_URL` | **Required** | Your main Render API URL |
| `NODE_ENV` | development | Environment (production recommended) |

## 🎯 How It Works

- **Ping Interval**: 13 minutes (safer than 14)
- **Target Endpoint**: `/health/ping` (lightweight endpoint)
- **Retry Logic**: 3 attempts with 5-second delays
- **Timeout**: 30 seconds per request
- **Response Monitoring**: Logs response times and server uptime

## 📊 Features

- ✅ **Smart Retry Logic**: Handles temporary network issues
- ✅ **Response Time Monitoring**: Tracks API performance
- ✅ **Server Uptime Display**: Shows how long your API has been running
- ✅ **Error Recovery**: Continues running even after failures
- ✅ **Graceful Shutdown**: Proper cleanup on termination
- ✅ **Detailed Logging**: Comprehensive status information

## 📝 Sample Logs

```
🚀 Starting Enhanced API Ping Service for Render Free Plan
=========================================================
📍 Target URL: https://chords-api.onrender.com/health/ping
⏰ Ping interval: 13 minutes
🔄 Max retries: 3
⏱️  Retry delay: 5 seconds
🕐 Next ping: 1/15/2025, 2:30:00 PM
=========================================================

[2025-01-15T14:17:00.123Z] 🏓 Pinging API: https://chords-api.onrender.com/health/ping
[2025-01-15T14:17:00.456Z] ✅ API is alive! Status: 200, Response time: 333ms
[2025-01-15T14:17:00.456Z] ℹ️  Server uptime: 1847s
ℹ️  Next ping scheduled for: 1/15/2025, 2:30:00 PM
```

## 🔧 Troubleshooting

### Common Issues

1. **"API_URL not set" Error**
   ```bash
   # Make sure to set your actual Render app URL
   export API_URL="https://your-app-name.onrender.com"
   ```

2. **Connection Failures**
   - Check if your main API is running
   - Verify the URL is correct
   - Check Render service logs

3. **Ping Service Stops**
   - Check Render logs for the ping service
   - Ensure the ping service itself doesn't spin down
   - Consider using a paid plan for the ping service

### Testing Manually

```bash
# Test your health endpoint
curl https://your-render-app.onrender.com/health/ping

# Test with the ping service locally
API_URL="https://your-render-app.onrender.com" node ping-service.js
```

## 💡 Best Practices

1. **Use Separate Service**: Deploy ping service as its own Render service
2. **Monitor Both Services**: Keep an eye on both main API and ping service logs
3. **Set Correct URL**: Make sure API_URL points to your actual Render app
4. **Consider Alternatives**: For production, consider paid plans or external monitoring

## 🆓 Free Plan Strategy

- **Main API**: Your actual application (spins down after 15 min)
- **Ping Service**: Lightweight service that pings main API every 13 min
- **Result**: Main API stays alive 24/7 on free plan

## 📈 Monitoring

Check your Render dashboard to see:
- Main API uptime (should be 100% with ping service)
- Ping service logs and health
- Response times and performance

## 🚨 Important Notes

- The ping service itself needs to stay alive (consider using a different platform for it)
- Render free plan has 750 hours/month limit across all services
- Monitor your usage to avoid hitting limits
- Consider upgrading to paid plan for production apps
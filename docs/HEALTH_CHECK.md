# Health Check Endpoint Documentation

## Overview

The health check endpoint provides real-time status information about the API and its dependencies. This is useful for monitoring, alerting, and ensuring the system is functioning properly.

## Endpoints

### `GET /health`

Returns detailed health information about the API and its dependencies.

#### Response Format

```json
{
  "status": "ok",
  "info": {
    "database": {
      "status": "up",
      "responseTime": "3000ms"
    },
    "redis": {
      "status": "up",
      "message": "Redis is available"
    },
    "memory_heap": {
      "status": "up"
    },
    "disk": {
      "status": "up"
    }
  },
  "error": {},
  "details": {
    "database": {
      "status": "up",
      "responseTime": "3000ms"
    },
    "redis": {
      "status": "up",
      "message": "Redis is available"
    },
    "memory_heap": {
      "status": "up"
    },
    "disk": {
      "status": "up"
    }
  }
}
```

#### Status Codes

- `200 OK`: The service is healthy
- `503 Service Unavailable`: One or more dependencies are unhealthy

### `GET /health/ping`

Simple ping endpoint that returns a basic status response. Useful for lightweight health checks.

#### Response Format

```json
{
  "status": "ok",
  "timestamp": "2025-06-24T13:55:12.345Z",
  "uptime": 12345.67
}
```

## Configuration

The health check module is configured with the following thresholds:

- **Database Connection Timeout**: 3000ms
- **Memory Heap Threshold**: 300MB
- **Disk Usage Threshold**: 90%

## Integration with Monitoring Systems

The health check endpoint can be integrated with monitoring systems like:

- Prometheus
- Grafana
- AWS CloudWatch
- New Relic
- Datadog

Simply configure your monitoring system to periodically call the `/health` endpoint and alert on non-200 status codes or when specific health indicators report "down" status.

## Rate Limiting

Health check endpoints are excluded from the standard rate limiting rules to ensure they remain accessible during monitoring and troubleshooting.

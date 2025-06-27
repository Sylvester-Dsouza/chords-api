# Rate Limiting in Worship Paradise API

This document describes the rate limiting implementation in the Worship Paradise API.

## Overview

The API uses a tiered rate limiting approach based on user roles and subscription types. Rate limits are applied differently to different endpoints based on their resource intensity and sensitivity.

## Rate Limit Tiers

| Tier | Default Limit (requests/minute) | Block Duration | Description |
|------|--------------------------------|---------------|-------------|
| ANONYMOUS | 100 | 30 seconds | Unauthenticated users |
| FREE | 200 | 15 seconds | Authenticated users with free accounts |
| BASIC | 300 | 0 seconds | Users with basic/pro subscriptions |
| PREMIUM | 500 | 0 seconds | Users with premium subscriptions |
| ADMIN | 3000 | 0 seconds | Admin users |

## Endpoint Sensitivity

Endpoints have different sensitivity multipliers that affect how rate limits are applied:

| Endpoint Category | Multiplier | Examples |
|------------------|------------|----------|
| Public Content | 0.7 | `/api/songs`, `/api/artists`, `/api/collections` |
| Authentication | 0.3 | `/api/auth` |
| Comments | 0.5 | `/api/comments` |
| Admin | 0.2 | `/api/admin` |
| Analytics | 0.1 | `/api/admin/analytics` |
| Resource-Intensive | 1.2-1.5 | `/api/chord-diagrams`, `/api/search` |
| Mutations | 0.8-1.0 | `/api/ratings`, `/api/likes`, `/api/setlists` |
| Subscriptions | 0.4 | `/api/subscriptions`, `/api/transactions` |
| Health | 0.1 | `/api/health` |

## Configuration via Environment Variables

Rate limits can be configured using environment variables:

```
# Rate limit points (requests per minute)
RATE_LIMIT_ANONYMOUS=100
RATE_LIMIT_FREE=200
RATE_LIMIT_BASIC=300
RATE_LIMIT_PREMIUM=500
RATE_LIMIT_ADMIN=3000

# Block durations (seconds)
RATE_LIMIT_BLOCK_ANONYMOUS=30
RATE_LIMIT_BLOCK_FREE=15
RATE_LIMIT_BLOCK_BASIC=0
RATE_LIMIT_BLOCK_PREMIUM=0
RATE_LIMIT_BLOCK_ADMIN=0
```

## Response Headers

When rate limiting is applied, the following headers are included in API responses:

- `X-RateLimit-Limit`: Maximum number of requests allowed in the current time window
- `X-RateLimit-Remaining`: Number of requests remaining in the current time window
- `X-RateLimit-Reset`: Time (in seconds) until the rate limit window resets

## Rate Limit Exceeded Response

When a client exceeds the rate limit, they will receive a `429 Too Many Requests` response with the following body:

```json
{
  "statusCode": 429,
  "message": "Too many requests, please try again later.",
  "retryAfter": 60
}
```

## Special Cases

- Whitelisted IPs (development environments) bypass rate limiting
- Health check endpoints have very lenient rate limits
- Bot-like user agents have stricter rate limits

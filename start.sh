#!/bin/bash

# Run database migrations
npx prisma migrate deploy

# Start the application
node dist/main.js

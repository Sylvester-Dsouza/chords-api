#!/bin/bash

# Install dependencies
npm install --legacy-peer-deps

# Generate Prisma client
npx prisma generate

# Build the NestJS application
npx @nestjs/cli build

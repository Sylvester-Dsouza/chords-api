#!/bin/bash

# Fix Database Function Security Issues
# This script addresses Supabase linter warnings about mutable search_path

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 Database Function Security Fix${NC}"
echo -e "${BLUE}=================================${NC}"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: package.json not found${NC}"
    echo -e "${YELLOW}Please run this script from the API root directory${NC}"
    exit 1
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${YELLOW}⚠️  DATABASE_URL not found in environment${NC}"
    echo -e "${YELLOW}Loading from .env file...${NC}"
    
    if [ -f ".env" ]; then
        export $(cat .env | grep -v '^#' | xargs)
        echo -e "${GREEN}✓ Environment variables loaded from .env${NC}"
    else
        echo -e "${RED}❌ .env file not found${NC}"
        echo -e "${YELLOW}Please set DATABASE_URL environment variable${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}DATABASE_URL is set${NC}"

# Run the security fix
echo -e "${YELLOW}🔒 Applying database function security fixes...${NC}"

# Use Node.js to run the security fix script
if command -v node &> /dev/null; then
    echo -e "${GREEN}Using Node.js to execute security fixes${NC}"
    node scripts/fix-function-security.js
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Database function security fixes applied successfully${NC}"
        echo ""
        echo -e "${BLUE}📋 What was fixed:${NC}"
        echo -e "${GREEN}• Added SECURITY DEFINER to all trigger functions${NC}"
        echo -e "${GREEN}• Set explicit search_path = public${NC}"
        echo -e "${GREEN}• Prevented search_path injection vulnerabilities${NC}"
        echo -e "${GREEN}• Maintained function performance and behavior${NC}"
        echo ""
        echo -e "${YELLOW}💡 Next Steps:${NC}"
        echo -e "${YELLOW}1. Re-run Supabase linter to verify fixes${NC}"
        echo -e "${YELLOW}2. Test view tracking functionality${NC}"
        echo -e "${YELLOW}3. Monitor function performance${NC}"
    else
        echo -e "${RED}❌ Failed to apply security fixes${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ Node.js not found${NC}"
    echo -e "${YELLOW}Please install Node.js to run this script${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}🎉 Database function security optimization complete!${NC}"

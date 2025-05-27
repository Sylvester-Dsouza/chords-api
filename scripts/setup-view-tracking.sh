#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Setting up view tracking triggers...${NC}"

# Check if we're in the correct directory
if [ ! -f "package.json" ]; then
    echo -e "${RED}Error: This script must be run from the chords-api directory${NC}"
    exit 1
fi

# Check if the SQL file exists
if [ ! -f "scripts/create-view-tracking-triggers.sql" ]; then
    echo -e "${RED}Error: create-view-tracking-triggers.sql not found${NC}"
    exit 1
fi

# Load environment variables
if [ -f ".env" ]; then
    echo -e "${GREEN}Loading environment variables from .env${NC}"
    export $(cat .env | grep -v '^#' | xargs)
else
    echo -e "${YELLOW}Warning: .env file not found. Make sure DATABASE_URL is set.${NC}"
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo -e "${RED}Error: DATABASE_URL environment variable is not set${NC}"
    echo "Please set DATABASE_URL in your .env file or environment"
    exit 1
fi

echo -e "${GREEN}DATABASE_URL is set${NC}"

# Run the SQL script
echo -e "${YELLOW}Creating view tracking triggers...${NC}"

# Use psql to run the SQL script
if command -v psql &> /dev/null; then
    echo -e "${GREEN}Using psql to execute SQL script${NC}"
    psql "$DATABASE_URL" -f scripts/create-view-tracking-triggers.sql
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ View tracking triggers created successfully${NC}"
    else
        echo -e "${RED}✗ Failed to create view tracking triggers${NC}"
        exit 1
    fi
else
    echo -e "${YELLOW}psql not found. Using Prisma to execute SQL...${NC}"
    
    # Create a temporary Node.js script to execute the SQL
    cat > temp_execute_sql.js << 'EOF'
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function executeSqlFile() {
  try {
    console.log('Reading SQL file...');
    const sql = fs.readFileSync('scripts/create-view-tracking-triggers.sql', 'utf8');
    
    console.log('Executing SQL...');
    await prisma.$executeRawUnsafe(sql);
    
    console.log('✓ View tracking triggers created successfully');
  } catch (error) {
    console.error('✗ Failed to create view tracking triggers:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

executeSqlFile();
EOF

    # Run the temporary script
    node temp_execute_sql.js
    
    # Clean up
    rm temp_execute_sql.js
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ View tracking triggers created successfully${NC}"
    else
        echo -e "${RED}✗ Failed to create view tracking triggers${NC}"
        exit 1
    fi
fi

echo -e "${GREEN}View tracking setup complete!${NC}"
echo
echo -e "${YELLOW}What was created:${NC}"
echo "• Database triggers to automatically update view counts"
echo "• Functions for Song, Artist, and Collection view tracking"
echo "• Indexes for better performance"
echo "• Unique viewer tracking"
echo
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Test the view tracking by calling the analytics API"
echo "2. Check that view counts are being updated automatically"
echo "3. Monitor the analytics dashboard for view data"
echo
echo -e "${GREEN}View tracking is now fully functional!${NC}"

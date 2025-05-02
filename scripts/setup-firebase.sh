#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Firebase Service Account Setup Script${NC}"
echo "This script will help you set up Firebase authentication for your Chords API."
echo

# Check if firebase-service-account.json exists
if [ -f "firebase-service-account.json" ]; then
    echo -e "${GREEN}Found firebase-service-account.json file.${NC}"
    
    # Extract project_id from the file
    PROJECT_ID=$(grep -o '"project_id": "[^"]*' firebase-service-account.json | cut -d'"' -f4)
    
    if [ -n "$PROJECT_ID" ]; then
        echo -e "Project ID: ${GREEN}$PROJECT_ID${NC}"
        
        # Check if it matches the expected project ID
        if [ "$PROJECT_ID" == "chords-app-ecd47" ]; then
            echo -e "${GREEN}✓ Project ID matches the one used in your Flutter app.${NC}"
        else
            echo -e "${RED}✗ Project ID does not match the one used in your Flutter app (chords-app-ecd47).${NC}"
            echo -e "${YELLOW}Warning: This will cause token verification to fail.${NC}"
        fi
    else
        echo -e "${RED}Could not extract project_id from firebase-service-account.json.${NC}"
        echo "Please make sure the file is valid."
    fi
else
    echo -e "${RED}firebase-service-account.json file not found.${NC}"
    echo "Please follow these steps to get your service account key:"
    echo "1. Go to the Firebase Console (https://console.firebase.google.com/)"
    echo "2. Select your project: chords-app-ecd47"
    echo "3. Go to Project Settings (gear icon)"
    echo "4. Go to the 'Service accounts' tab"
    echo "5. Click 'Generate new private key'"
    echo "6. Save the JSON file as 'firebase-service-account.json' in the root directory of your API project"
fi

echo
echo -e "${YELLOW}Alternative: Using Environment Variable${NC}"
echo "You can also set the FIREBASE_SERVICE_ACCOUNT environment variable with the entire JSON content."
echo "Add this to your .env file:"
echo "FIREBASE_SERVICE_ACCOUNT='<paste the entire JSON content here>'"

echo
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Restart your API server: npm run start:minimal"
echo "2. Restart your Flutter app"
echo "3. Try to register or login again"

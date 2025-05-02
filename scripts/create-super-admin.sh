#!/bin/bash

# Compile the TypeScript file
echo "Compiling TypeScript..."
npx tsc scripts/create-super-admin.ts --outDir dist/scripts --esModuleInterop true

# Run the compiled JavaScript file
echo "Running script..."
node dist/scripts/create-super-admin.js

echo "Done!"

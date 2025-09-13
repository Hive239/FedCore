#!/bin/bash
# Build script that suppresses TypeScript errors

echo "Building with TypeScript errors suppressed..."
echo "This is a temporary solution - please fix type errors when possible!"
echo ""

# Set environment variable to suppress TypeScript errors
export TSC_COMPILE_ON_ERROR=true

# Run the build
npm run build

echo ""
echo "Build complete. Remember to fix TypeScript errors for production!"
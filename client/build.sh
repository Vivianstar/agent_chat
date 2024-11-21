#!/bin/bash
set -e  # Exit on error

# Build the React app
echo "Installing dependencies..."
npm install

echo "Building the application..."
npm run build

echo "Build complete!"
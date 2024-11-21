#!/bin/bash

# Set your Databricks workspace path
WORKSPACE_PATH="/Workspace/Users/wenwen.xie@databricks.com/agent_app"


# # Install dependencies and build if needed
# echo "Building client..."
cd client
npm install
npm run build
cd ..

# Create directories in workspace
echo "Creating directories..."
#databricks workspace mkdirs $WORKSPACE_PATH

# Upload with ignore patterns
echo "Uploading files..."
databricks workspace import-dir -e -o server $WORKSPACE_PATH/server
#databricks workspace import-dir -e -o notebooks $WORKSPACE_PATH/notebooks
databricks workspace import-dir -e -o client $WORKSPACE_PATH/client

echo "Deployment complete!"
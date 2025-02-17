# AI Chat Application

![Chat Interface](./client/public/chat-interface.png)
_AI Chat Interface with real-time responses_

## Overview

This app is a full-stack application featuring a chat interface powered by LLM, built with React and FastAPI.

### Key Features

- 🤖 AI-powered chat interface
- 🎨 Modern UI with Tailwind CSS
- 🔄 Real-time response handling
- 🌐 FastAPI backend with async support

## Prerequisites

- Python 3.8+
- Node.js 18.x+
- npm or yarn
- A Databricks workspace (for AI model serving)

## Environment Setup

1. Clone the repository:

```bash
git clone <repository-url>
```

2. Create and activate a Python virtual environment:

```bash
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
```

3. Install Python dependencies:

```bash
pip install -r requirements.txt
```

## Building the Frontend

1. Navigate to the client directory:

```bash
cd client
```

2. Install dependencies:

```bash
npm install
```

3. Build the production version:

```bash
npm run build
```

## Running the Application

1. For development with hot-reload:

```bash
# Terminal 1 - Frontend
cd client
npm start

# Terminal 2 - Backend
gunicorn server.app:app -w 2 --worker-class uvicorn.workers.UvicornWorker
```

2. For production:

```bash
gunicorn server.app:app -w 2 --worker-class uvicorn.workers.UvicornWorker
```

3. For Databricks Apps deployment:

   a. Install the Databricks CLI:

   ```bash
   brew install databricks
   ```

   b. Create the app in your workspace:

   ```bash
   databricks apps create chat-app
   ```

   c. Create an `app.yaml` file in the root directory:

   ```yaml
   command:
   - "gunicorn"
   - "server.app:app"
   - "-w"
   - "2"
   - "--worker-class"
   - "uvicorn.workers.UvicornWorker"

   env:
   - name: "SERVING_ENDPOINT_NAME"
       valueFrom: "agent_MODEL_NAME_FQN"
   ```

   The `app.yaml` configuration uses gunicorn as the WSGI server to run your FastAPI application.
   The environment section defines `SERVING_ENDPOINT_NAME` which is configured (`serving_endpoint`) through apps creation in Databricks, securly storing and accessing sensitive values.

   For detials on how to create an app in Databricks, please refer to the [Databricks Apps Documentation](https://docs.databricks.com/en/dev-tools/databricks-apps/configuration.html).

   d. Sync your local files to Databricks workspace:

   ```bash
   # Add node_modules/ and venv/ to .gitignore first if not already present
   databricks sync --watch . /Workspace/Users/<your-email>/chat-app
   ```

   e. Deploy the app:

   ```bash
   databricks apps deploy chat-app --source-code-path /Workspace/Users/<your-email>/chat-app
   ```

   The application will be available at your Databricks Apps URL:

   - Production URL: https://chat-app-[id].cloud.databricksapps.com

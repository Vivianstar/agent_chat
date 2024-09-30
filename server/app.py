import logging
from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel, ValidationError
import httpx
import os
from dotenv import load_dotenv
from typing import Optional, List, Dict, Any
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse, JSONResponse
import json

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

try:
    load_dotenv()
    LLM_ENDPOINT = os.getenv("AGENT_ENDPOINT")
    API_KEY = os.getenv("DATABRICKS_TOKEN")
    if not LLM_ENDPOINT or not API_KEY:
        raise ValueError("Missing required environment variables")
except Exception as e:
    logger.error(f"Error loading environment variables: {e}", exc_info=True)
    raise

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Model for the request body
class ChatRequest(BaseModel):
    message: str

# Simplified response model
class ChatResponse(BaseModel):
    content: str

# URL for the LLM agent model endpoint
LLM_ENDPOINT = os.getenv("AGENT_ENDPOINT")
API_KEY = os.getenv("DATABRICKS_TOKEN")

@app.get("/")
async def root():
    return {"message": "Welcome to the LLM Chat API"}

@app.options("/chat")
async def chat_options():
    return JSONResponse(content={}, status_code=200)

@app.post("/chat")
async def chat_with_llm(request: Request):
    body = await request.json()
    message = body.get("message")

    if not message:
        raise HTTPException(status_code=400, detail="Message is required")

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {API_KEY}"
    }
    logger.info(f"Received message: {message}")
    payload = {
        "messages": [{"role": "user", "content": message}],
        "stream": True
    }
    logger.info(f"Payload: {payload}")

    async def event_stream():
        async with httpx.AsyncClient() as client:
            try:
                logger.info(f"Sending request to LLM endpoint: {LLM_ENDPOINT}")
                response = await client.post(LLM_ENDPOINT, json=payload, headers=headers, timeout=60.0)
                response.raise_for_status()
                logger.info("Received response from LLM")
                data = response.json()
                logger.info(f"Received data: {data}")
                content = data[0]['choices'][0]['message']['content']
                yield f"data: {json.dumps({'content': content})}\n\n"
                yield "data: [DONE]\n\n"
            except httpx.ReadTimeout:
                logger.error("Read timeout occurred while streaming from LLM")
                yield f"data: {json.dumps({'error': 'Read timeout occurred'})}\n\n"
            except httpx.HTTPStatusError as e:
                logger.error(f"HTTP error occurred: {e}")
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
            except Exception as e:
                logger.error(f"An unexpected error occurred: {e}", exc_info=True)
                yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting the server...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
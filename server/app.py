import logging
from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel, ValidationError
import httpx
import os
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles


# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
logger.info("Logger initialized successfully!")

app = FastAPI()
ui_app = StaticFiles(directory="client/build", html=True)
api_app = FastAPI()

# PLEASE NOTE THE ORDER OF THE MOUNTS MATTERS
app.mount("/api", api_app)
app.mount("/", ui_app)

origins = [
    "http://localhost:3000",
]

# Make sure CORS is applied to both app and api_app
# This is only needed for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# URL for the LLM agent model endpoint
LLM_ENDPOINT = os.getenv("AGENT_ENDPOINT")
API_KEY = os.getenv("DATABRICKS_TOKEN")

# Model for the request body
class ChatRequest(BaseModel):
    message: str

# Simplified response model
class ChatResponse(BaseModel):
    content: str


@api_app.post("/chat", response_model=ChatResponse)
async def chat_with_llm(request: ChatRequest):
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {API_KEY}"
    }
    logger.info(f"Received message: {request.message}")
    payload = {
        "messages": [{"role": "user", "content": request.message}]
    }
    logger.info(f"Payload: {payload}")
    async with httpx.AsyncClient() as client:
        try:
            logger.info(f"Sending request to LLM endpoint: {LLM_ENDPOINT}")
            response = await client.post(LLM_ENDPOINT, json=payload, headers=headers, timeout=500.0)
            response.raise_for_status()
            logger.info("Received response from LLM")
            response_data = response.json()
            logger.info(f"Response data: {response_data}")
            try:
                # Extract content from the first choice's message
                content = response_data[0]['choices'][0]['message']['content']
                return ChatResponse(content=content)
            except (KeyError, IndexError, ValidationError) as e:
                logger.error(f"Failed to process response: {e}")
                raise HTTPException(status_code=500, detail="Invalid response from LLM endpoint")
        except httpx.HTTPStatusError as e:
            logger.error(f"HTTP error occurred: {e}")
            logger.error(f"Response content: {e.response.content}")
            raise HTTPException(status_code=e.response.status_code, detail=str(e))
        except Exception as e:
            logger.error(f"An unexpected error occurred: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=str(e))

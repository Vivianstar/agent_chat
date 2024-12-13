import logging
from typing import Annotated, Any
from fastapi import Depends, FastAPI
from pydantic import BaseModel, ValidationError
import os
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from databricks.sdk import WorkspaceClient
from databricks.sdk.service.serving import (
    ChatMessage,
    ChatMessageRole,
    QueryEndpointResponse,
)
from dotenv import load_dotenv
from pathlib import Path


# Set up logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)
logger.info("Logger initialized successfully!")

# configure databricks sdk logger
logging.getLogger("databricks.sdk").setLevel(logging.INFO)
# Check and log files in the current and parent directories
current_dir = Path.cwd()
parent_dir = current_dir.parent

logger.info(f"Current directory: {current_dir}")
logger.info(f"Files in the current directory: {list(current_dir.iterdir())}")
logger.info(f"Parent directory: {parent_dir}")
logger.info(f"Files in the parent directory: {list(parent_dir.iterdir())}")

load_dotenv()

ENDPOINT_NAME = "agents_wenwen_xie-manufacturing-tools_agent_demo"

if not ENDPOINT_NAME:
    logger.error("SERVING_ENDPOINT_NAME environment variable is not set")
    raise ValueError("SERVING_ENDPOINT_NAME environment variable is not set")

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


# client
def client():
    return WorkspaceClient()


# Model for the request body
class ChatRequest(BaseModel):
    message: str


# Simplified response model
class ChatResponse(BaseModel):
    content: str


@api_app.post("/chat", response_model=ChatResponse)
def chat_with_llm(
    request: ChatRequest, client: Annotated[WorkspaceClient, Depends(client)]
):
    response = client.serving_endpoints.query(
        ENDPOINT_NAME,
        messages=[ChatMessage(content=request.message, role=ChatMessageRole.USER)],
    )
    return ChatResponse(content=response.choices[0].message.content)
    
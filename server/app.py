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
logging.getLogger("databricks.sdk").setLevel(logging.DEBUG)


# Load environment variables from .env file
dotenv_file = Path(__file__).parent / ".env"
if dotenv_file.exists():
    logger.info("Loading environment variables from .env file")
    load_dotenv(dotenv_path=dotenv_file)

else:
    logger.info("No .env file found, skipping loading environment variables from it")


# verify that LLM_ENDPOINT is set
ENDPOINT_NAME = os.environ.get("SERVING_ENDPOINT_NAME")

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
    raw_response: list[dict[str, Any]] = client.api_client.do(
        "POST",
        f"/serving-endpoints/{ENDPOINT_NAME}/invocations",
        body={
            "messages": [
                ChatMessage(
                    content=request.message, role=ChatMessageRole.USER
                ).as_dict()
            ]
        },
    )
    response = [QueryEndpointResponse.from_dict(payload) for payload in raw_response]
    return ChatResponse(content=response[0].choices[0].message.content)

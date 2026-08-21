
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from .db import (
    clear_session,
    count_documents,
    create_session,
    get_session_messages,
    init_db,
    search_documents,
    store_message,
)
from .services import get_chat_response, sync_data


class ChatRequest(BaseModel):
    question: str = Field(
        ...,
        min_length=1,
        max_length=2000,
    )


class ChatResponse(BaseModel):
    answer: str
    session_id: str


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """
    Initialize the database and sync portfolio data
    when the application starts.
    """

    init_db()

    try:
        count = sync_data()
        print(f"Synced {count} documents on startup")

    except Exception as exc:
        # The API should still start even if GitHub is temporarily
        # unavailable or the resume is missing.
        print(f"Initial data sync failed: {exc}")

    yield


app = FastAPI(
    title="Anshul Portfolio Backend",
    description="Backend API for Anshul Kumar's AI-powered portfolio assistant.",
    version="1.0.0",
    lifespan=lifespan,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {
        "status": "ok",
    }


@app.get("/data/status")
async def data_status():
    """
    Return the number of documents currently stored
    in the portfolio knowledge base.
    """

    return {
        "documents_synced": count_documents(),
    }


@app.post("/sync")
async def trigger_sync():
    """
    Re-sync the resume and GitHub data.
    """

    try:
        count = sync_data()

    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        )

    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to sync portfolio data: {exc}",
        )

    return {
        "status": "synced",
        "documents_synced": count,
    }


@app.get("/session/new")
async def new_session():
    """
    Create a new chat session.
    """

    session_id = str(uuid.uuid4())

    create_session(session_id)

    return {
        "session_id": session_id,
    }


@app.post(
    "/chat/{session_id}",
    response_model=ChatResponse,
)
async def chat(
    session_id: str,
    request: ChatRequest,
):
    """
    Ask a question about Anshul's resume, experience,
    projects, skills, or GitHub profile.
    """

    create_session(session_id)

    messages = get_session_messages(session_id)

    documents = search_documents(
        request.question,
        limit=8,
    )

    try:
        answer = await get_chat_response(
            question=request.question,
            session_messages=messages,
            documents=documents,
        )

    except RuntimeError as exc:
        raise HTTPException(
            status_code=500,
            detail=str(exc),
        )

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate response: {exc}",
        )

    # Store the conversation only after the LLM
    # successfully generates the response.
    store_message(
        session_id=session_id,
        role="user",
        content=request.question,
    )

    store_message(
        session_id=session_id,
        role="assistant",
        content=answer,
    )

    return ChatResponse(
        answer=answer,
        session_id=session_id,
    )


@app.get("/chat/{session_id}/history")
async def chat_history(session_id: str):
    """
    Return the conversation history for a session.
    """

    return get_session_messages(session_id)


@app.delete("/chat/{session_id}")
async def clear_chat(session_id: str):
    """
    Clear all messages from a chat session.
    """

    clear_session(session_id)

    return {
        "status": "cleared",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
    )

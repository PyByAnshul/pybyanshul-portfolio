import os
from pathlib import Path
from typing import Any

from sqlalchemy import create_engine, delete, func, or_, select
from sqlalchemy.orm import Session as DBSession
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

from .models import Base, Document, Message, Session


BASE_DIR = Path(__file__).resolve().parent
DEFAULT_DB_PATH = BASE_DIR.parent / "portfoliopedia.db"

# Load the backend environment file before any configuration is read. Using an
# explicit path keeps this reliable when Uvicorn is started from another
# working directory.
load_dotenv(BASE_DIR.parent / ".env")

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    f"sqlite:///{DEFAULT_DB_PATH}",
)

connect_args = {}

if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}


engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True,
)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False,
)


def init_db() -> None:
    Base.metadata.create_all(bind=engine)


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


def store_document(
    source: str,
    title: str,
    content: str,
    metadata: str | None = None,
) -> int:
    with SessionLocal() as db:
        document = Document(
            source=source,
            title=title,
            content=content,
            metadata_json=metadata,
        )

        db.add(document)
        db.commit()
        db.refresh(document)

        return document.id


def search_documents(
    query: str,
    limit: int = 5,
) -> list[dict[str, Any]]:
    """
    Simple keyword-based retrieval.

    For a portfolio with a small amount of data, this is enough.
    We can replace this later with embeddings/vector search if needed.
    """

    words = [
        word.strip().lower()
        for word in query.split()
        if len(word.strip()) > 2
    ]

    if not words:
        return []


    conditions = []

    for word in words:
        pattern = f"%{word}%"

        conditions.append(
            or_(
                Document.title.ilike(pattern),
                Document.content.ilike(pattern),
            )
        )

    statement = (
        select(Document)
        .where(or_(*conditions))
        .limit(limit)
    )

    with SessionLocal() as db:
        documents = db.scalars(statement).all()

        return [
            {
                "id": document.id,
                "source": document.source,
                "title": document.title,
                "content": document.content,
                "metadata": document.metadata_json,
            }
            for document in documents
        ]


def count_documents() -> int:
    with SessionLocal() as db:
        return db.scalar(
            select(func.count(Document.id))
        ) or 0


def clear_all_documents() -> None:
    with SessionLocal() as db:
        db.execute(delete(Document))
        db.commit()


def create_session(session_id: str) -> None:
    with SessionLocal() as db:
        existing = db.get(Session, session_id)

        if existing is None:
            db.add(Session(id=session_id))
            db.commit()


def get_session_messages(
    session_id: str,
) -> list[dict[str, Any]]:
    statement = (
        select(Message)
        .where(Message.session_id == session_id)
        .order_by(Message.created_at.asc())
    )

    with SessionLocal() as db:
        messages = db.scalars(statement).all()

        return [
            {
                "role": message.role,
                "content": message.content,
            }
            for message in messages
        ]


def store_message(
    session_id: str,
    role: str,
    content: str,
) -> None:
    with SessionLocal() as db:
        message = Message(
            session_id=session_id,
            role=role,
            content=content,
        )

        db.add(message)
        db.commit()


def clear_session(session_id: str) -> None:
    with SessionLocal() as db:
        db.execute(
            delete(Message).where(
                Message.session_id == session_id
            )
        )

        db.commit()

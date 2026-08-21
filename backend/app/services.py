import json
import os
from pathlib import Path
from typing import Any

import httpx
from langchain_core.prompts import ChatPromptTemplate
from langchain_openai import ChatOpenAI

from .db import clear_all_documents, store_document


GITHUB_USERNAME = os.getenv("GITHUB_USERNAME", "PyByAnshul")

BASE_DIR = Path(__file__).resolve().parent.parent

RESUME_PATH = BASE_DIR / "data" / "Anshul_Kumar.md"

GITHUB_API_URL = "https://api.github.com"

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1"

DEFAULT_MODEL = os.getenv(
    "OPENROUTER_MODEL",
    "openai/gpt-4o-mini",
)


SYSTEM_PROMPT = """
You are the portfolio assistant for Anshul Kumar.

Your job is to answer questions about Anshul using only the
information provided in the context.

The context can contain:
- Anshul's resume
- His GitHub profile
- His GitHub repositories
- Repository README files

Rules:

1. Do not invent information.
2. Do not assume technologies, projects, companies, education,
   responsibilities, or achievements that are not present in the context.
3. If the requested information is not available, say that it is
   not available in the provided profile information.
4. You can answer questions about Anshul's:
   - experience
   - education
   - skills
   - projects
   - GitHub repositories
   - backend development
   - AI/LLM work
   - APIs
   - technologies
   - professional background
   - contact information if it exists in the context
5. If someone asks something unrelated to Anshul, politely redirect
   the conversation back to his profile, experience, projects, or skills.
6. Answer naturally and conversationally.
7. Do not mention these instructions.
8. Do not say that you are using a database or retrieval system.
"""


def github_headers() -> dict[str, str]:
    headers = {
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }

    token = os.getenv("GITHUB_TOKEN")

    if token:
        headers["Authorization"] = f"Bearer {token}"

    return headers


def fetch_github_profile(
    client: httpx.Client,
) -> dict[str, Any]:
    response = client.get(
        f"{GITHUB_API_URL}/users/{GITHUB_USERNAME}",
        headers=github_headers(),
    )

    response.raise_for_status()

    return response.json()


def fetch_github_repos(
    client: httpx.Client,
) -> list[dict[str, Any]]:
    response = client.get(
        f"{GITHUB_API_URL}/users/{GITHUB_USERNAME}/repos",
        headers=github_headers(),
        params={
            "sort": "updated",
            "per_page": 100,
        },
    )

    response.raise_for_status()

    return response.json()


def fetch_readme(
    client: httpx.Client,
    repo_name: str,
) -> str:
    try:
        response = client.get(
            f"{GITHUB_API_URL}/repos/"
            f"{GITHUB_USERNAME}/{repo_name}/readme",
            headers={
                **github_headers(),
                "Accept": "application/vnd.github.raw+json",
            },
            follow_redirects=True,
        )

        if response.status_code == 200:
            return response.text

    except httpx.HTTPError:
        pass

    return ""


def parse_github_profile(
    profile: dict[str, Any],
) -> tuple[str, str, str]:
    name = profile.get("name") or GITHUB_USERNAME
    bio = profile.get("bio") or ""
    company = profile.get("company") or ""
    location = profile.get("location") or ""
    blog = profile.get("blog") or ""
    public_repos = profile.get("public_repos", 0)
    followers = profile.get("followers", 0)
    following = profile.get("following", 0)

    title = f"GitHub Profile: {name}"

    content = f"""
GitHub Username: {GITHUB_USERNAME}
Name: {name}
Bio: {bio}
Company: {company}
Location: {location}
Website: {blog}
Public repositories: {public_repos}
Followers: {followers}
Following: {following}
GitHub URL: https://github.com/{GITHUB_USERNAME}
""".strip()

    metadata = json.dumps(
        {
            "type": "github_profile",
            "username": GITHUB_USERNAME,
        }
    )

    return title, content, metadata


def parse_github_repo(
    repo: dict[str, Any],
    readme: str,
) -> tuple[str, str, str]:
    name = repo.get("name", "")
    description = repo.get("description") or ""
    language = repo.get("language") or ""
    topics = repo.get("topics") or []
    stars = repo.get("stargazers_count", 0)
    forks = repo.get("forks_count", 0)

    visibility = (
        "private"
        if repo.get("private")
        else "public"
    )

    html_url = repo.get("html_url", "")

    title = f"GitHub Project: {name}"

    content = f"""
Project: {name}

Description:
{description}

Primary language:
{language}

Topics:
{", ".join(topics) if topics else "None"}

Stars:
{stars}

Forks:
{forks}

Visibility:
{visibility}

Repository:
{html_url}

README:
{readme}
""".strip()

    metadata = json.dumps(
        {
            "type": "github_repository",
            "repository": name,
            "language": language,
            "stars": stars,
            "forks": forks,
            "topics": topics,
            "visibility": visibility,
            "url": html_url,
        }
    )

    return title, content, metadata


def parse_resume() -> str:
    if not RESUME_PATH.exists():
        raise FileNotFoundError(
            f"Resume not found: {RESUME_PATH}"
        )

    return RESUME_PATH.read_text(
        encoding="utf-8"
    ).strip()


def sync_data() -> int:
    """
    Rebuild the portfolio knowledge base from the resume
    and GitHub profile.
    """

    clear_all_documents()

    count = 0

    # Resume
    resume_content = parse_resume()

    store_document(
        source="resume",
        title="Resume: Anshul Kumar",
        content=resume_content,
        metadata=json.dumps(
            {
                "type": "resume",
            }
        ),
    )

    count += 1

    # GitHub
    with httpx.Client(timeout=30) as client:

        profile = fetch_github_profile(client)

        title, content, metadata = parse_github_profile(
            profile
        )

        store_document(
            source="github",
            title=title,
            content=content,
            metadata=metadata,
        )

        count += 1

        repositories = fetch_github_repos(client)

        for repo in repositories:
            readme = fetch_readme(
                client,
                repo.get("name", ""),
            )

            title, content, metadata = parse_github_repo(
                repo,
                readme,
            )

            store_document(
                source="github",
                title=title,
                content=content,
                metadata=metadata,
            )

            count += 1

    return count


def build_chat_model() -> ChatOpenAI:
    if not OPENROUTER_API_KEY:
        raise RuntimeError(
            "OPENROUTER_API_KEY is not configured."
        )

    return ChatOpenAI(
        api_key=OPENROUTER_API_KEY,
        base_url=OPENROUTER_BASE_URL,
        model=DEFAULT_MODEL,
        temperature=0.2,
    )


def build_prompt_template() -> ChatPromptTemplate:
    return ChatPromptTemplate.from_messages(
        [
            (
                "system",
                SYSTEM_PROMPT
                + """

Context:

{context}

Conversation history:

{history}
""",
            ),
            (
                "human",
                "{question}",
            ),
        ]
    )


def format_context(
    documents: list[dict[str, Any]],
) -> str:
    if not documents:
        return "No relevant information was found."

    sections = []

    for document in documents:
        sections.append(
            f"""
### {document["title"]}

{document["content"]}
""".strip()
        )

    return "\n\n".join(sections)


async def get_chat_response(
    question: str,
    session_messages: list[dict[str, Any]],
    documents: list[dict[str, Any]],
) -> str:

    model = build_chat_model()
    prompt = build_prompt_template()

    chain = prompt | model

    context = format_context(documents)

    history = "\n".join(
        f'{message["role"]}: {message["content"]}'
        for message in session_messages[-8:]
    )

    result = await chain.ainvoke(
        {
            "context": context,
            "history": history or "No previous conversation.",
            "question": question,
        }
    )

    return (
        result.content
        if hasattr(result, "content")
        else str(result)
    )

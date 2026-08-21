import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

const SESSION_COOKIE = 'portfolio_session_id'
const BACKEND_URL = (process.env.PORTFOLIO_BACKEND_API_URL || process.env.NEXT_PUBLIC_CHAT_API_URL || 'http://localhost:8000').replace(/\/$/, '')

type BackendChatResponse = {
  answer?: unknown
}

type NewSessionResponse = {
  session_id?: unknown
}

function backendUrl(path: string) {
  return `${BACKEND_URL}${path}`
}

async function responseMessage(response: Response, fallback: string) {
  const payload = (await response.json().catch(() => ({}))) as { detail?: unknown; error?: unknown }

  if (typeof payload.detail === 'string') return payload.detail
  if (typeof payload.error === 'string') return payload.error
  return fallback
}

function withSessionCookie(response: NextResponse, sessionId: string | undefined, createdSession: boolean) {
  if (!createdSession || !sessionId) return response

  response.cookies.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  })

  return response
}

export async function POST(request: Request) {
  let body: { question?: unknown }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 })
  }

  if (typeof body.question !== 'string' || !body.question.trim()) {
    return NextResponse.json({ error: 'A question is required.' }, { status: 400 })
  }

  const cookieStore = await cookies()
  let sessionId = cookieStore.get(SESSION_COOKIE)?.value
  let createdSession = false

  try {
    if (!sessionId) {
      const sessionResponse = await fetch(backendUrl('/session/new'), {
        cache: 'no-store',
        signal: request.signal,
      })

      if (!sessionResponse.ok) {
        return NextResponse.json(
          { error: await responseMessage(sessionResponse, 'Unable to create a chat session.') },
          { status: sessionResponse.status }
        )
      }

      const session = (await sessionResponse.json()) as NewSessionResponse
      if (typeof session.session_id !== 'string' || !session.session_id) {
        return NextResponse.json({ error: 'Backend returned an invalid session ID.' }, { status: 502 })
      }

      sessionId = session.session_id
      createdSession = true
    }

    const chatResponse = await fetch(backendUrl(`/chat/${encodeURIComponent(sessionId)}`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: body.question.trim() }),
      cache: 'no-store',
      signal: request.signal,
    })

    if (!chatResponse.ok) {
      return withSessionCookie(
        NextResponse.json(
          { error: await responseMessage(chatResponse, 'Unable to get a chat response.') },
          { status: chatResponse.status }
        ),
        sessionId,
        createdSession
      )
    }

    const chat = (await chatResponse.json()) as BackendChatResponse
    if (typeof chat.answer !== 'string') {
      return withSessionCookie(
        NextResponse.json({ error: 'Backend returned an invalid chat response.' }, { status: 502 }),
        sessionId,
        createdSession
      )
    }

    return withSessionCookie(NextResponse.json({ answer: chat.answer }), sessionId, createdSession)
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return withSessionCookie(
        NextResponse.json({ error: 'Chat request was cancelled.' }, { status: 499 }),
        sessionId,
        createdSession
      )
    }

    return withSessionCookie(
      NextResponse.json({ error: 'Unable to reach the portfolio backend.' }, { status: 502 }),
      sessionId,
      createdSession
    )
  }
}

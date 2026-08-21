export interface ChatConfig {
  endpoint: string
}

export interface ChatCallbacks {
  onChunk: (chunk: string) => void
  onComplete: () => void
  onError: (error: Error) => void
}

export const defaultChatConfig: ChatConfig = {
  endpoint: '/api/chat',
}

type ChatResponse = {
  answer?: unknown
  error?: unknown
}

/**
 * Client for the portfolio chat route. The route creates a backend session when
 * needed and keeps its ID in an HttpOnly cookie for future chat requests.
 */
export class ChatService {
  private config: ChatConfig

  constructor(config: ChatConfig = defaultChatConfig) {
    this.config = config
  }

  /**
   * Sends a question to the Next.js chat route, which proxies the FastAPI backend.
   */
  streamMessage(
    question: string,
    callbacks: ChatCallbacks,
    options?: { signal?: AbortSignal }
  ): void {
    fetch(this.config.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
      signal: options?.signal,
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => ({}))) as ChatResponse

        if (!response.ok) {
          const message = typeof payload.error === 'string' ? payload.error : `HTTP ${response.status}`
          callbacks.onError(new Error(message))
          return
        }

        if (typeof payload.answer !== 'string') {
          callbacks.onError(new Error('Chat response did not include an answer.'))
          return
        }

        callbacks.onChunk(payload.answer)
        callbacks.onComplete()
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') return
        callbacks.onError(error instanceof Error ? error : new Error(String(error)))
      })
  }

  sendMessage(question: string, callbacks: ChatCallbacks): AbortController {
    const controller = new AbortController()
    this.streamMessage(question, callbacks, { signal: controller.signal })
    return controller
  }
}

// Default singleton instance
export const chatService = new ChatService(defaultChatConfig)

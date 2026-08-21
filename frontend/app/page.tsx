'use client'

import { useEffect, useRef, useState } from 'react'
import { Play, Send, Square } from 'lucide-react'
import { availableCommands, getGhostText, personalInfo, processCommand, type OutputLine } from '@/lib/portfolio-data'
import { ChatService } from '@/lib/chat-service'
import ClawdCharacter, { type Activity } from '@/components/ui/clawd-character'
import { useInteractionSounds } from '@/hooks/use-interaction-sounds'

type CommandEntry = { id: number; kind: 'command'; command: string; output: OutputLine[]; status: 'streaming' | 'complete' }
type ChatEntry = { id: number; kind: 'chat'; question: string; response: string; status: 'streaming' | 'complete' | 'error' }
type TranscriptEntry = CommandEntry | ChatEntry

const chatService = new ChatService()
const terminalCommands = new Set([...availableCommands, 'cat contact.txt'])
const RESPONSE_WORD_DELAY_MS = 90
const COMMAND_WORD_DELAY_MS = 90

function getCommandOutputSteps(lines: OutputLine[]) {
  const visibleLines: OutputLine[] = []
  const steps: Array<{ lines: OutputLine[]; playsSound: boolean }> = []

  for (const line of lines) {
    if (!line.text) {
      visibleLines.push(line)
      steps.push({ lines: [...visibleLines], playsSound: false })
      continue
    }

    const words = line.text.match(/\S+\s*/g) ?? [line.text]
    let visibleText = ''

    for (const word of words) {
      visibleText += word
      const visibleLine = { ...line, text: visibleText }
      if (visibleText === word) visibleLines.push(visibleLine)
      else visibleLines[visibleLines.length - 1] = visibleLine
      steps.push({ lines: [...visibleLines], playsSound: true })
    }
  }

  return steps
}

function OutputLines({ lines, onAction, streaming }: { lines: OutputLine[]; onAction: (command: string) => void; streaming: boolean }) {
  const colorMap: Record<NonNullable<OutputLine['color']>, string> = {
    green: 'var(--green)', orange: 'var(--orange)', muted: 'var(--muted)', faint: 'var(--faint)', default: 'var(--foreground)',
  }

  return lines.map((line, index) => (
    <p key={index} className={line.action ? 'clickable-line' : ''} style={{ color: line.color ? colorMap[line.color] : 'inherit' }} onClick={line.action ? () => onAction(line.action!) : undefined}>
      {line.text || ' '}
      {streaming && index === lines.length - 1 && <span className="stream-cursor" aria-label="command output streaming" />}
    </p>
  ))
}

function CommandInput({ value, disabled, onChange, onKeyDown }: {
  value: string; disabled: boolean; onChange: (value: string) => void; onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void
}) {
  const [ghostText, setGhostText] = useState('')
  const measureRef = useRef<HTMLSpanElement>(null)
  const [ghostOffset, setGhostOffset] = useState(0)

  useEffect(() => {
    const ghost = getGhostText(value)
    setGhostText(ghost)
    setGhostOffset(ghost && measureRef.current ? measureRef.current.offsetWidth : 0)
  }, [value])

  return <div className="command-input-wrapper">
    <span ref={measureRef} className="measure-text">{value}</span>
    {ghostText && <span className="ghost-text" style={{ left: ghostOffset }}>{ghostText}</span>}
    <input type="text" value={value} disabled={disabled} autoComplete="off" spellCheck={false} onChange={(event) => onChange(event.target.value)} onKeyDown={onKeyDown} placeholder={disabled ? 'Guide is responding…' : 'Type a command or ask about the work…'} aria-label="Command or question" />
  </div>
}

export default function Page() {
  const { playKeyboardSound } = useInteractionSounds()
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([])
  const [input, setInput] = useState('')
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [chatStreaming, setChatStreaming] = useState(false)
  const [commandStreaming, setCommandStreaming] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [activity, setActivity] = useState<Activity>('idle')
  const scrollRef = useRef<HTMLDivElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const activeChatEntryIdRef = useRef<number | null>(null)
  const responseQueueRef = useRef<string[]>([])
  const responseBufferRef = useRef('')
  const responseTimerRef = useRef<number | null>(null)
  const responseCompleteRef = useRef(false)
  const entryIdRef = useRef(0)
  const nextId = () => ++entryIdRef.current

  // Activity detection: typing → streaming (when response comes back) → error/idle
  useEffect(() => {
    let idleTimer: number | undefined
    if (hasError) {
      setActivity('error')
      idleTimer = window.setTimeout(() => { setHasError(false); setActivity('idle') }, 4000)
    } else if (chatStreaming || commandStreaming) {
      setActivity('streaming')
    } else if (input.length > 0) {
      setActivity('typing')
    } else {
      setActivity('idle')
    }
    return () => window.clearTimeout(idleTimer)
  }, [input, chatStreaming, commandStreaming, hasError])

  // Scroll detection
  useEffect(() => {
    const node = scrollRef.current
    if (!node) return
    let scrollTimer: number | undefined
    const onScroll = () => {
      if (chatStreaming || commandStreaming) return
      setActivity('scrolling')
      window.clearTimeout(scrollTimer)
      scrollTimer = window.setTimeout(() => {
        if (!chatStreaming && !commandStreaming) setActivity('idle')
      }, 1500)
    }
    node.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.clearTimeout(scrollTimer)
      node.removeEventListener('scroll', onScroll)
    }
  }, [scrollRef, chatStreaming, commandStreaming])

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [transcript])

  useEffect(() => {
    const timer = window.setTimeout(() => runInput('whoami'), 500)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function isTerminalCommand(text: string) {
    return terminalCommands.has(text.trim().toLowerCase())
  }

  function runCommand(command: string) {
    const normalized = command.trim().toLowerCase()
    if (normalized === 'clear') {
      setTranscript([])
    } else {
      const entryId = nextId()
      const output = processCommand(command)
      const outputSteps = getCommandOutputSteps(output)
      setTranscript((previous) => [...previous, { id: entryId, kind: 'command', command: command.trim(), output: [], status: 'streaming' }])
      setCommandStreaming(true)

      outputSteps.forEach((step, index) => {
        window.setTimeout(() => {
          setTranscript((previous) => previous.map((entry) =>
          entry.kind === 'command' && entry.id === entryId ? { ...entry, output: step.lines } : entry
          ))
          if (step.playsSound) playKeyboardSound()
        }, index * COMMAND_WORD_DELAY_MS)
      })

      window.setTimeout(() => {
        setTranscript((previous) => previous.map((entry) =>
          entry.kind === 'command' && entry.id === entryId ? { ...entry, status: 'complete' } : entry
        ))
        setCommandStreaming(false)
      }, outputSteps.length * COMMAND_WORD_DELAY_MS + 50)
    }
    setInput('')
    setHistoryIndex(-1)
  }

  function sendChatMessage(question: string) {
    const entryId = nextId()
    activeChatEntryIdRef.current = entryId
    setTranscript((previous) => [...previous, { id: entryId, kind: 'chat', question, response: '', status: 'streaming' }])
    setInput('')
    setHistoryIndex(-1)
    setChatStreaming(true)
    responseQueueRef.current = []
    responseBufferRef.current = ''
    responseCompleteRef.current = false

    const completeResponse = () => {
      setTranscript((previous) => previous.map((entry) => entry.kind === 'chat' && entry.id === entryId ? { ...entry, status: 'complete' } : entry))
      setChatStreaming(false)
      abortControllerRef.current = null
      activeChatEntryIdRef.current = null
    }

    const revealNextWord = () => {
      if (responseTimerRef.current !== null) return
      const word = responseQueueRef.current.shift()

      if (!word) {
        if (responseCompleteRef.current) completeResponse()
        return
      }

      setTranscript((previous) => previous.map((entry) => entry.kind === 'chat' && entry.id === entryId ? { ...entry, response: entry.response + word } : entry))
      playKeyboardSound()
      responseTimerRef.current = window.setTimeout(() => {
        responseTimerRef.current = null
        revealNextWord()
      }, RESPONSE_WORD_DELAY_MS)
    }

    abortControllerRef.current = chatService.sendMessage(question, {
      onChunk: (chunk) => {
        responseBufferRef.current += chunk
        const words = responseBufferRef.current.match(/\S+\s+/g) ?? []
        responseQueueRef.current.push(...words)
        responseBufferRef.current = responseBufferRef.current.slice(words.join('').length)
        revealNextWord()
      },
      onComplete: () => {
        if (responseBufferRef.current) responseQueueRef.current.push(responseBufferRef.current)
        responseBufferRef.current = ''
        responseCompleteRef.current = true
        revealNextWord()
      },
      onError: (error) => {
        if (responseTimerRef.current !== null) window.clearTimeout(responseTimerRef.current)
        responseTimerRef.current = null
        responseQueueRef.current = []
        setTranscript((previous) => previous.map((entry) => {
          if (entry.kind !== 'chat' || entry.id !== entryId) return entry
          return error.name === 'AbortError' ? { ...entry, status: 'complete' } : { ...entry, status: 'error', response: `Connection error: ${error.message}` }
        }))
        setChatStreaming(false)
        abortControllerRef.current = null
        activeChatEntryIdRef.current = null
      },
    })
  }

  function runInput(value: string) {
    const text = value.trim()
    if (!text || chatStreaming || commandStreaming) return
    if (isTerminalCommand(text)) runCommand(text)
    else sendChatMessage(text)
  }

  function stopStreaming() {
    abortControllerRef.current?.abort()
    if (responseTimerRef.current !== null) window.clearTimeout(responseTimerRef.current)
    responseTimerRef.current = null
    responseQueueRef.current = []
    responseBufferRef.current = ''
    const entryId = activeChatEntryIdRef.current
    if (entryId !== null) {
      setTranscript((previous) => previous.map((entry) =>
        entry.kind === 'chat' && entry.id === entryId ? { ...entry, status: 'complete' } : entry
      ))
    }
    setChatStreaming(false)
    abortControllerRef.current = null
    activeChatEntryIdRef.current = null
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') { event.preventDefault(); runInput(input); return }
    if (event.key === 'Tab' || event.key === 'ArrowRight') {
      const ghost = getGhostText(input)
      if (ghost) { event.preventDefault(); setInput(input + ghost) }
      return
    }
    const commands = transcript.filter((entry): entry is CommandEntry => entry.kind === 'command').map((entry) => entry.command)
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (historyIndex < commands.length - 1) { const next = historyIndex + 1; setHistoryIndex(next); setInput(commands[commands.length - 1 - next]) }
    } else if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (historyIndex > 0) { const next = historyIndex - 1; setHistoryIndex(next); setInput(commands[commands.length - 1 - next]) }
      else if (historyIndex === 0) { setHistoryIndex(-1); setInput('') }
    } else if (event.key === 'Escape') { setInput(''); setHistoryIndex(-1) }
  }

  const quickCommands = ['whoami', 'ls projects/', 'cat skills.md', 'cat experience.md', 'curl contact.txt']
  const quickPrompts = ['What kind of AI work do you do?', 'Tell me about your RAG projects.', 'What projects can I explore?']

  return <main className="terminal-app"><section className="terminal-main">
    <header className="terminal-header">
      <div className="brand-lockup"><span className="brand-mark">./</span>{personalInfo.handle}</div>
      <span className="header-version">portfolio v1.0</span>
      <a className="header-link" href="#contact">available for hire <span className="online-dot" /></a>
    </header>
    <div className="terminal-scroll" ref={scrollRef}>
      <div className="welcome-block">
        <ClawdCharacter activity={activity} />
        <div>
  <p className="eyebrow">hello, I'm Anshul</p>
  <h1>
    Backend Developer<br />
    <span>focused on AI & automation.</span>
  </h1>
  <p className="welcome-copy">
    Explore my projects, experience, and technical work.
  </p>
</div>
      </div>
      <section className="unified-terminal" aria-label="Portfolio terminal and guide">
        <div className="terminal-history">
          {transcript.map((entry) => entry.kind === 'command' ? (
            <div key={entry.id} className="history-entry"><div className="command-line"><span className="prompt-symbol">›</span><span className="command">{entry.command}</span></div><div className="output-block" aria-live="polite"><OutputLines lines={entry.output} onAction={runInput} streaming={entry.status === 'streaming'} /></div></div>
          ) : (
            <div key={entry.id} className="chat-exchange"><div className="command-line"><span className="prompt-symbol">›</span><span className="command chat-question">{entry.question}</span></div><div className="guide-response" aria-live="polite"><span className="message-label">guide</span><p>{entry.response || 'streaming'}{entry.status === 'streaming' && <span className="stream-cursor" aria-label="response streaming" />}</p></div></div>
          ))}
        </div>
        <div className="command-input-row unified-input-row"><span className="prompt-symbol">›</span><CommandInput value={input} disabled={chatStreaming || commandStreaming} onChange={setInput} onKeyDown={handleKeyDown} />
          {chatStreaming ? <button type="button" onClick={stopStreaming} aria-label="Stop response" className="stop-button"><Square size={12} /></button> : <button type="button" onClick={() => runInput(input)} aria-label="Run command or send question" disabled={!input.trim()}>{isTerminalCommand(input) ? <Play size={14} /> : <Send size={16} />}</button>}
        </div>
      </section>
      <div className="command-suggestions"><span className="suggestion-label">try a command</span>{quickCommands.map((command) => <button key={command} onClick={() => runInput(command)} type="button" disabled={chatStreaming || commandStreaming}>{command}</button>)}</div>
      {/* <div className="chat-prompts unified-prompts"><span className="suggestion-label">or ask</span>{quickPrompts.map((prompt) => <button key={prompt} type="button" onClick={() => runInput(prompt)} disabled={chatStreaming}>• {prompt.toLowerCase().replace(/[.?]/g, '')}</button>)}</div> */}
      {/* <div id="contact" className="contact-strip"><span className="prompt-symbol">›</span><span>open to interesting collaborations</span><a href={`mailto:${personalInfo.email}`}>say hello <span aria-hidden="true">↗</span></a></div> */}
    </div>
    <footer className="terminal-footer"><span>● system online</span><span>last updated 08.2026</span><span>built with curiosity</span></footer>
  </section></main>
}

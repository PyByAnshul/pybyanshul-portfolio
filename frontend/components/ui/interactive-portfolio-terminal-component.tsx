'use client'

import { useState, useRef, useEffect } from 'react'
import { processCommand, getGhostText, type OutputLine, personalInfo } from '@/lib/portfolio-data'

export default function InteractivePortfolioTerminal() {
  type HistoryEntry = {
    id: number
    command: string
    output: OutputLine[]
    status: 'streaming' | 'complete'
  }

  const colorMap: Record<NonNullable<OutputLine['color']>, string> = {
    green: '#9dcc83',
    orange: '#d87852',
    muted: '#969591',
    faint: '#5e5f5b',
    default: '#e5e4df',
  }

  const welcomeOutput: OutputLine[] = [
    { text: '[TERMINAL PORTFOLIO v1.0]', color: 'orange' },
    { text: '' },
    { text: 'pybyanshul@portfolio:~$ whoami', color: 'faint' },
    { text: `${personalInfo.name} (${personalInfo.handle}) — AI Engineer`, color: 'green' },
    { text: '' },
    { text: 'Type help for available commands. ↑/↓ for history • Tab to autocomplete' },
  ]

  const [history, setHistory] = useState<HistoryEntry[]>([
    { id: 0, command: '/welcome', output: welcomeOutput, status: 'complete' },
  ])
  const [currentCommand, setCurrentCommand] = useState('')
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [commandRunning, setCommandRunning] = useState(false)
  const [ghostText, setGhostText] = useState('')
  const [ghostOffset, setGhostOffset] = useState(0)

  const bottomRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const measureRef = useRef<HTMLSpanElement>(null)
  const commandIdRef = useRef(0)

  // Ghost text autocomplete
  useEffect(() => {
    const ghost = getGhostText(currentCommand)
    setGhostText(ghost)
    if (ghost && measureRef.current) {
      measureRef.current.textContent = currentCommand
      setGhostOffset(measureRef.current.offsetWidth)
    } else {
      setGhostOffset(0)
    }
  }, [currentCommand])

  // Click terminal to focus input
  useEffect(() => {
    const handleClick = () => inputRef.current?.focus()
    terminalRef.current?.addEventListener('click', handleClick)
    return () => terminalRef.current?.removeEventListener('click', handleClick)
  }, [])

  function handleCommand() {
    const cmd = currentCommand.trim()
    if (!cmd || commandRunning) return

    if (cmd === 'clear') {
      setHistory([])
      setCurrentCommand('')
      setHistoryIndex(-1)
      return
    }

    const output = processCommand(cmd)
    commandIdRef.current += 1
    const entryId = commandIdRef.current

    setHistory((prev) => [...prev, { id: entryId, command: cmd, output: [], status: 'streaming' }])
    setCurrentCommand('')
    setHistoryIndex(-1)
    setCommandRunning(true)

    // Stream lines progressively (typewriter effect)
    const DELAY = 25
    output.forEach((line, i) => {
      setTimeout(() => {
        setHistory((prev) =>
          prev.map((entry) =>
            entry.id === entryId
              ? { ...entry, output: [...entry.output, line] }
              : entry
          )
        )
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, DELAY * i)
    })

    setTimeout(() => {
      setHistory((prev) =>
        prev.map((entry) =>
          entry.id === entryId ? { ...entry, status: 'complete' } : entry
        )
      )
      setCommandRunning(false)
    }, DELAY * output.length + 50)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleCommand()
    } else if (e.key === 'Tab') {
      e.preventDefault()
      if (ghostText) setCurrentCommand(currentCommand + ghostText)
    } else if (e.key === 'ArrowRight') {
      if (ghostText) {
        e.preventDefault()
        setCurrentCommand(currentCommand + ghostText)
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const commands = history.map((h) => h.command).filter((c) => !c.startsWith('/'))
      if (historyIndex < commands.length - 1) {
        const next = historyIndex + 1
        setHistoryIndex(next)
        setCurrentCommand(commands[commands.length - 1 - next])
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (historyIndex > 0) {
        const prev = historyIndex - 1
        setHistoryIndex(prev)
        const commands = history.map((h) => h.command).filter((c) => !c.startsWith('/'))
        setCurrentCommand(prev === 0 ? '' : commands[commands.length - prev])
      } else if (historyIndex === 0) {
        setHistoryIndex(-1)
        setCurrentCommand('')
      }
    } else if (e.key === 'Escape') {
      setCurrentCommand('')
      setHistoryIndex(-1)
    }
  }

  function handleQuickCommand(cmd: string) {
    setCurrentCommand(cmd)
    setTimeout(() => handleCommand(), 10)
  }

  const quickCommands = ['help', 'whoami', 'ls projects/', 'cat skills.md', 'curl contact.txt']

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900 text-green-400 p-4 font-mono">
      <div className="w-full max-w-5xl bg-black rounded-lg overflow-hidden shadow-2xl border border-green-400">
        {/* Terminal Header */}
        <div className="flex items-center gap-2 p-3 bg-gray-800 text-xs text-gray-400">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 transition-colors cursor-pointer" />
            <div className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-400 transition-colors cursor-pointer" />
            <div className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-400 transition-colors cursor-pointer" />
          </div>
          <div className="flex-1 text-center font-semibold">
            pybyanshul@portfolio:~$ | Interactive Terminal Portfolio v1.0
          </div>
          <div className="text-xs">
            <span className="text-green-400">●</span>
            {' '}ONLINE
          </div>
        </div>

        {/* Terminal Output */}
        <div
          ref={terminalRef}
          className="h-[70vh] overflow-y-auto p-4 space-y-3 bg-black cursor-text"
        >
          {history.map((entry) => (
            <div key={entry.id} className="space-y-2">
              <div className="flex gap-2">
                <span className="text-cyan-400 font-semibold">pybyanshul@portfolio:~$</span>
                <span className="text-white">{entry.command}</span>
              </div>
              <div className="whitespace-pre-wrap text-gray-300 pl-6 leading-relaxed">
                {entry.output.map((line, i) => (
                  <p
                    key={i}
                    style={{
                      color: line.color ? colorMap[line.color] : 'inherit',
                    }}
                    className={line.action ? 'hover:text-cyan-300 cursor-pointer' : ''}
                  >
                    {line.text || ' '}
                  </p>
                ))}
                {entry.status === 'streaming' && (
                  <span className="text-green-400 animate-pulse">█</span>
                )}
              </div>
            </div>
          ))}

          {/* Current Command Input */}
          <div className="flex gap-2 items-center">
            <span className="text-cyan-400 font-semibold">pybyanshul@portfolio:~$</span>
            <div className="relative flex-1">
              <span ref={measureRef} className="invisible absolute font-mono text-base" />
              {ghostText && (
                <span
                  className="absolute text-gray-600 pointer-events-none"
                  style={{ left: `${ghostOffset}px` }}
                >
                  {ghostText}
                </span>
              )}
              <input
                ref={inputRef}
                type="text"
                value={currentCommand}
                onChange={(e) => setCurrentCommand(e.target.value)}
                onKeyDown={handleKeyDown}
                className="w-full bg-transparent outline-none text-white caret-green-400"
                autoFocus
                spellCheck="false"
                autoComplete="off"
                disabled={commandRunning}
              />
            </div>
            {commandRunning ? (
              <span className="text-green-400 animate-pulse">█</span>
            ) : (
              <span className="text-green-400">█</span>
            )}
          </div>

          {/* Quick Commands */}
          {!commandRunning && currentCommand === '' && (
            <div className="flex flex-wrap gap-2 pt-2">
              {quickCommands.map((cmd) => (
                <button
                  key={cmd}
                  type="button"
                  onClick={() => handleQuickCommand(cmd)}
                  className="px-3 py-1 text-xs border border-gray-700 rounded text-gray-400 hover:border-green-400 hover:text-green-400 transition-colors"
                >
                  {cmd}
                </button>
              ))}
            </div>
          )}

          {/* Auto-scroll anchor */}
          <div ref={bottomRef} />
        </div>

        {/* Terminal Footer */}
        <div className="bg-gray-800 px-4 py-2 text-xs text-gray-500 border-t border-gray-700">
          <div className="flex justify-between items-center">
            <span>help · ↑/↓ history · Tab autocomplete · clear to reset</span>
            <span>pybyanshul@proton.me</span>
          </div>
        </div>
      </div>
    </div>
  )
}

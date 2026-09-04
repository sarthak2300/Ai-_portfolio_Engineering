import { useEffect, useRef, useState } from 'react'
import MessageBubble from './components/MessageBubble.jsx'
import Waveform from './components/Waveform.jsx'
import JDMatchModal from './components/JDMatchModal.jsx'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000'

const SUGGESTIONS = [
  'Tell me about this candidate',
  'What are their strongest projects?',
  'What tech stack do they know?',
  'What was the hardest project they built?',
]

export default function App() {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [dark, setDark] = useState(true)
  const [showJD, setShowJD] = useState(false)
  const scrollRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    document.body.classList.toggle('light', !dark)
  }, [dark])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const send = async (text) => {
    const question = (text ?? input).trim()
    if (!question || streaming) return

    const nextMessages = [...messages, { role: 'user', content: question }]
    setMessages([...nextMessages, { role: 'assistant', content: '' }])
    setInput('')
    setStreaming(true)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'

    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages }),
      })

      if (!res.ok || !res.body) throw new Error('Backend request failed')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let assistantText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        const parts = buffer.split('\n\n')
        buffer = parts.pop()
        for (const part of parts) {
          if (!part.startsWith('data: ')) continue
          const payload = part.slice(6)
          if (payload === '[DONE]') continue
          const { content } = JSON.parse(payload)
          assistantText += content
          setMessages((prev) => {
            const copy = [...prev]
            copy[copy.length - 1] = { role: 'assistant', content: assistantText }
            return copy
          })
        }
      }
    } catch (err) {
      setMessages((prev) => {
        const copy = [...prev]
        copy[copy.length - 1] = {
          role: 'assistant',
          content: "Couldn't reach the backend. Make sure it's running and try again.",
        }
        return copy
      })
    } finally {
      setStreaming(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  const autoGrow = (e) => {
    setInput(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = `${Math.min(e.target.scrollHeight, 140)}px`
  }

  const clearChat = () => setMessages([])

  return (
    <div className="app-shell">
      <header className="header">
        <div className="header-top">
          <div className="header-title">
            ACCESS: <strong>SAR</strong> — AI REPRESENTATIVE
          </div>
          <div className="header-actions">
            <a className="icon-btn" href={`${API_BASE}/api/resume`} target="_blank" rel="noreferrer">
              resume ↓
            </a>
            <button className="icon-btn" onClick={() => setShowJD(true)}>JD match</button>
            <button className="icon-btn" onClick={() => setDark((d) => !d)}>
              {dark ? 'light' : 'dark'}
            </button>
            <button className="icon-btn" onClick={clearChat}>clear</button>
          </div>
        </div>
        <div className="name-line">
          Chat with Sar's AI
          <span>Answers are grounded only in the profile Sar provided — nothing invented.</span>
        </div>
        <Waveform active={streaming} />
      </header>

      <div className="chat-scroll" ref={scrollRef}>
        {messages.length === 0 && (
          <div className="empty-state">
            <span className="eyebrow">Session start</span>
            Ask anything a recruiter would ask — background, projects, skills,
            or whether this candidate fits a role you're hiring for.
            <div className="suggestions">
              {SUGGESTIONS.map((s) => (
                <button key={s} className="suggestion-chip" onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <MessageBubble
            key={i}
            role={m.role}
            content={m.content}
            streaming={streaming && i === messages.length - 1 && m.role === 'assistant'}
          />
        ))}
      </div>

      <div className="input-bar">
        <div className="input-row">
          <textarea
            ref={textareaRef}
            rows={1}
            placeholder="Ask about Sar's experience, projects, or skills…"
            value={input}
            onChange={autoGrow}
            onKeyDown={handleKeyDown}
          />
          <button className="send-btn" onClick={() => send()} disabled={!input.trim() || streaming}>
            ↑
          </button>
        </div>
        <div className="input-hint">
          <span>Enter to send · Shift+Enter for a new line</span>
          <span>Grounded in candidate-provided data only</span>
        </div>
      </div>

      {showJD && <JDMatchModal apiBase={API_BASE} onClose={() => setShowJD(false)} />}
    </div>
  )
}

import { useState } from 'react'

export default function MessageBubble({ role, content, streaming }) {
  const [copied, setCopied] = useState(false)
  const isUser = role === 'user'

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard unavailable — silently ignore */
    }
  }

  return (
    <div className={`msg-row ${isUser ? 'user' : 'assistant'}`}>
      <div className={`bubble ${isUser ? 'user' : 'assistant'}`}>
        {!isUser && (
          <div className="bubble-meta">
            <span>SAR · AI</span>
            {content && !streaming && (
              <button className="copy-btn" onClick={handleCopy}>
                {copied ? 'copied' : 'copy'}
              </button>
            )}
          </div>
        )}
        {content || (streaming && (
          <span className="typing-dots"><span /><span /><span /></span>
        ))}
        {streaming && content && <span className="cursor-blink" />}
      </div>
    </div>
  )
}

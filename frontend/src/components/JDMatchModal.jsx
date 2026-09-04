import { useState } from 'react'

export default function JDMatchModal({ apiBase, onClose }) {
  const [jd, setJd] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)

  const runMatch = async () => {
    if (!jd.trim() || loading) return
    setLoading(true)
    setResult('')

    try {
      const res = await fetch(`${apiBase}/api/jd-match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_description: jd }),
      })

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

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
          setResult((prev) => prev + content)
        }
      }
    } catch (err) {
      setResult('Something went wrong reaching the backend. Is it running?')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span>Job Description Match</span>
          <button className="icon-btn" onClick={onClose}>close</button>
        </div>
        <div className="modal-body">
          <textarea
            placeholder="Paste the job description here…"
            value={jd}
            onChange={(e) => setJd(e.target.value)}
          />
          {result && <div className="jd-result">{result}</div>}
        </div>
        <div className="modal-footer">
          <button className="btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={runMatch} disabled={loading || !jd.trim()}>
            {loading ? 'Analyzing…' : 'Check fit'}
          </button>
        </div>
      </div>
    </div>
  )
}

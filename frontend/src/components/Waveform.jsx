import { useEffect, useRef } from 'react'

// A small canvas-free SVG "oscilloscope" line that idles gently and spikes
// while the AI is actively streaming a response — a nod to the audio-signal
// classification work in the candidate's own project history.
export default function Waveform({ active }) {
  const pathRef = useRef(null)
  const frame = useRef(0)
  const raf = useRef(null)

  useEffect(() => {
    const width = 100
    const points = 48

    const render = () => {
      frame.current += active ? 0.35 : 0.06
      const amp = active ? 8 : 2.2
      let d = ''
      for (let i = 0; i <= points; i++) {
        const x = (i / points) * width
        const noise = active ? Math.sin(i * 1.7 + frame.current * 2.3) * 0.4 : 0
        const y = 13 + Math.sin(i * 0.9 + frame.current) * amp * (0.6 + noise)
        d += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`
      }
      if (pathRef.current) pathRef.current.setAttribute('d', d)
      raf.current = requestAnimationFrame(render)
    }

    render()
    return () => cancelAnimationFrame(raf.current)
  }, [active])

  return (
    <svg
      className={`waveform${active ? ' active' : ''}`}
      viewBox="0 0 100 26"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path ref={pathRef} />
    </svg>
  )
}

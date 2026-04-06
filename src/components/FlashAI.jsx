import { useState, useRef, useEffect } from 'react'
import styles from './FlashAI.module.css'

const QUICK = [
  { label: 'Mechanic', q: 'Find an available mechanic near me in Montreal.' },
  { label: 'FlashScore', q: 'What is my current FlashScore?' },
  { label: 'Promos', q: 'Which promotions are available this week?' },
  { label: 'Urgency', q: 'I have an urgent issue with my car. What should I do first?' },
]

export default function FlashAI({ portal = 'client', userName = 'User' }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Hello **${userName}**. I am **FlashAI**, your intelligent automotive assistant. I can help with providers, FlashScore, promotions, maintenance, and urgent actions in Montreal.`,
    },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const msgsRef = useRef(null)

  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight
  }, [messages, open])

  const systemPrompt = portal === 'client'
    ? `You are FlashAI, the automotive AI assistant for FlashMat.ca in Montreal. Reply in concise English, usually 3 to 4 sentences. Help users find providers, understand FlashScore, book services, review promotions, and manage vehicle maintenance.`
    : `You are FlashAI, the provider assistant for FlashMat.ca in Montreal. Reply in concise English, usually 3 to 4 sentences. Help shops manage bookings, improve revenue, review stats, and support customer operations.`

  async function send(userMsg) {
    if (!userMsg.trim() || loading) return
    const msg = userMsg.trim()
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: msg }])
    setLoading(true)

    const history = messages
      .filter((message) => message.role !== 'system')
      .map((message) => ({ role: message.role, content: message.content }))
    history.push({ role: 'user', content: msg })

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: systemPrompt,
          messages: history,
        }),
      })
      const data = await res.json()
      const reply = data.content?.[0]?.text || "Sorry, I couldn't answer that. Please try again."
      setMessages((prev) => [...prev, { role: 'assistant', content: reply }])
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'Connection is temporarily unavailable. Please try again in a moment.' }])
    } finally {
      setLoading(false)
    }
  }

  function renderContent(text) {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>')
  }

  return (
    <>
      <button className={styles.fab} onClick={() => setOpen((value) => !value)} title="FlashAI">
        <span>AI</span>
      </button>

      {open && (
        <div className={styles.panel}>
          <div className={styles.hd}>
            <div className={styles.avatar}>AI</div>
            <div>
              <div className={styles.name}>FlashAI</div>
              <div className={styles.status}>Online · FlashMat assistant</div>
            </div>
            <button className={styles.close} onClick={() => setOpen(false)}>×</button>
          </div>

          <div className={styles.quickRow}>
            {QUICK.map((quickItem) => (
              <button key={quickItem.label} className={styles.qbtn} onClick={() => send(quickItem.q)}>{quickItem.label}</button>
            ))}
          </div>

          <div className={styles.msgs} ref={msgsRef}>
            {messages.map((message, index) => (
              <div key={index} className={`${styles.msg} ${message.role === 'user' ? styles.user : styles.bot}`}>
                <span dangerouslySetInnerHTML={{ __html: renderContent(message.content) }} />
              </div>
            ))}
            {loading && (
              <div className={`${styles.msg} ${styles.bot}`} style={{ opacity: 0.6 }}>
                <span className="spinner" style={{ width: 14, height: 14 }} /> FlashAI is thinking...
              </div>
            )}
          </div>

          <div className={styles.inputRow}>
            <input
              className={styles.inp}
              placeholder="Example: find a car wash in Plateau..."
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && send(input)}
              disabled={loading}
            />
            <button className={styles.send} onClick={() => send(input)} disabled={loading || !input.trim()}>→</button>
          </div>
        </div>
      )}
    </>
  )
}

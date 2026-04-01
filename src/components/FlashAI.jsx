import { useState, useRef, useEffect } from 'react'
import styles from './FlashAI.module.css'

const QUICK = [
  { label: '🔧 Mécanicien', q: 'Trouver un mécanicien disponible près de moi à Montréal' },
  { label: '📊 FlashScore',  q: 'Quel est mon FlashScore actuel?' },
  { label: '🏷️ Promos',      q: 'Quelles promotions sont disponibles cette semaine?' },
  { label: '🚨 Urgence',     q: "J'ai un problème urgent avec ma voiture, que faire?" },
]

export default function FlashAI({ portal = 'client', userName = 'Utilisateur' }) {
  const [open, setOpen]       = useState(false)
  const [messages, setMessages] = useState([
    { role: 'assistant', content: `👋 Bonjour **${userName}**! Je suis **FlashAI**, votre assistant automobile intelligent.\n\nJe peux vous aider à trouver un garage, vérifier votre **FlashScore™**, consulter les promos, ou répondre à toute question sur votre véhicule à Montréal. 🔧` }
  ])
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const msgsRef               = useRef(null)

  useEffect(() => {
    if (msgsRef.current) msgsRef.current.scrollTop = msgsRef.current.scrollHeight
  }, [messages, open])

  const systemPrompt = portal === 'client'
    ? `Tu es FlashAI, l'assistant IA de FlashMat.ca — le hub automobile de Montréal. Tu parles en français, de façon concise et utile (3-4 phrases max par réponse). Tu aides les clients automobiles de Montréal à:
- Trouver des garages, lave-autos, services de pneus, remorquage
- Comprendre leur FlashScore™ (score de santé du véhicule)
- Réserver des services auto
- Consulter les promos disponibles
- Gérer l'entretien de leur véhicule

Données disponibles:
- Fournisseurs vedettes: Garage Los Santos (Méca, 4.8★, 0.8km), CS Lave Auto Décarie (Lave-auto, 4.8★, 1.2km), Dubé Pneu (Pneus, 4.3★, 2.1km), Remorquage Elite 24/7 (mobile), Speedy Glass (Vitres, 4.5★)
- Client: ${userName} — Honda Civic 2019 (AAB 1234, FlashScore 87%, vidange en retard 5 200km) + Toyota RAV4 2021 (ZZC 9876, FlashScore 96%)
- Promo active: 20% sur vidange chez Garage Los Santos, code OIL20 valide jusqu'au 5 avr.
- Rappel: Honda Civic 2019 — capteur ABS, vérification gratuite chez Honda

Réponds toujours en français. Utilise des emojis pertinents. Sois proactif et propose des actions concrètes.`
    : `Tu es FlashAI, l'assistant IA de FlashMat.ca pour les fournisseurs. Tu aides les garages et prestataires automobiles de Montréal à:
- Gérer leurs réservations et leur file d'attente
- Optimiser leurs revenus et promotions
- Gérer la relation client
- Comprendre leurs statistiques

Données: Fournisseur: ${userName}. File d'aujourd'hui: 5 clients. Revenu semaine: $5 470. Note: 4.9★. 2 baies libres sur 4.

Réponds toujours en français. Sois concis (3-4 phrases). Utilise des emojis. Propose des actions business concrètes.`

  async function send(userMsg) {
    if (!userMsg.trim() || loading) return
    const msg = userMsg.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setLoading(true)

    const history = messages
      .filter(m => m.role !== 'system')
      .map(m => ({ role: m.role, content: m.content }))
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
        })
      })
      const data = await res.json()
      const reply = data.content?.[0]?.text || "Désolé, je n'ai pas pu répondre. Réessayez!"
      setMessages(prev => [...prev, { role: 'assistant', content: reply }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Connexion temporairement indisponible. Réessayez dans un instant.' }])
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
      {/* FAB */}
      <button className={styles.fab} onClick={() => setOpen(o => !o)} title="FlashAI — Assistant IA">
        <span>⚡</span>
      </button>

      {/* PANEL */}
      {open && (
        <div className={styles.panel}>
          {/* HEADER */}
          <div className={styles.hd}>
            <div className={styles.avatar}>⚡</div>
            <div>
              <div className={styles.name}>FlashAI</div>
              <div className={styles.status}>En ligne · Propulsé par Claude</div>
            </div>
            <button className={styles.close} onClick={() => setOpen(false)}>✕</button>
          </div>

          {/* QUICK BUTTONS */}
          <div className={styles.quickRow}>
            {QUICK.map(q => (
              <button key={q.label} className={styles.qbtn} onClick={() => send(q.q)}>{q.label}</button>
            ))}
          </div>

          {/* MESSAGES */}
          <div className={styles.msgs} ref={msgsRef}>
            {messages.map((m, i) => (
              <div key={i} className={`${styles.msg} ${m.role === 'user' ? styles.user : styles.bot}`}>
                <span dangerouslySetInnerHTML={{ __html: renderContent(m.content) }} />
              </div>
            ))}
            {loading && (
              <div className={`${styles.msg} ${styles.bot}`} style={{ opacity: .6 }}>
                <span className="spinner" style={{ width: 14, height: 14 }} /> FlashAI réfléchit…
              </div>
            )}
          </div>

          {/* INPUT */}
          <div className={styles.inputRow}>
            <input
              className={styles.inp}
              placeholder="Ex: trouver un lave-auto au Plateau…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send(input)}
              disabled={loading}
            />
            <button className={styles.send} onClick={() => send(input)} disabled={loading || !input.trim()}>→</button>
          </div>
        </div>
      )}
    </>
  )
}

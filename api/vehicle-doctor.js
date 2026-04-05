const ALLOWED_SEARCH_CATEGORIES = new Set(['mechanic', 'tire', 'body', 'glass', 'tow', 'wash'])
const ALLOWED_CONFIDENCE = new Set(['Faible', 'Moyenne', 'Moyenne a elevee', 'Elevee'])

function parseAiJsonBlock(rawText) {
  const text = String(rawText || '').trim()
  if (!text) return null

  try {
    return JSON.parse(text)
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) return null
    try {
      return JSON.parse(match[0])
    } catch {
      return null
    }
  }
}

function normalizeAiDiagnosisResponse(response, fallbackDiagnosis) {
  if (!response || typeof response !== 'object' || !fallbackDiagnosis || typeof fallbackDiagnosis !== 'object') {
    return null
  }

  const probableIssue = String(response.probableIssue || '').trim()
  const summary = String(response.summary || '').trim()

  if (!probableIssue || !summary) {
    return null
  }

  const guidanceItems = Array.isArray(response.guidanceItems)
    ? response.guidanceItems.map((item) => String(item || '').trim()).filter(Boolean).slice(0, 5)
    : Array.isArray(fallbackDiagnosis.guidanceItems)
      ? fallbackDiagnosis.guidanceItems
      : []

  const confidence = String(response.confidence || fallbackDiagnosis.confidence || 'Moyenne').trim()
  const normalizedConfidence = ALLOWED_CONFIDENCE.has(confidence) ? confidence : (fallbackDiagnosis.confidence || 'Moyenne')

  const searchCat = ALLOWED_SEARCH_CATEGORIES.has(response.searchCat)
    ? response.searchCat
    : (fallbackDiagnosis.searchCat || 'mechanic')

  return {
    ...fallbackDiagnosis,
    type: response.type === 'maintenance' ? 'maintenance' : 'repair',
    probableIssue,
    confidence: normalizedConfidence,
    urgency: String(response.urgency || fallbackDiagnosis.urgency || 'A verifier').trim(),
    estimate: String(response.estimate || fallbackDiagnosis.estimate || 'Diagnostic cible').trim(),
    duration: String(response.duration || fallbackDiagnosis.duration || 'A confirmer').trim(),
    priceNote: String(response.priceNote || fallbackDiagnosis.priceNote || '').trim(),
    durationNote: String(response.durationNote || fallbackDiagnosis.durationNote || '').trim(),
    summary,
    guidanceTitle: String(response.guidanceTitle || fallbackDiagnosis.guidanceTitle || 'Points cles').trim(),
    guidanceItems,
    searchCat,
    matches: Array.isArray(fallbackDiagnosis.matches) ? fallbackDiagnosis.matches : [],
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(503).json({ error: 'AI service not configured' })
  }

  const { input, fallbackDiagnosis } = req.body || {}
  const symptomText = String(input || '').trim()

  if (!symptomText || symptomText.length < 18 || !fallbackDiagnosis || typeof fallbackDiagnosis !== 'object') {
    return res.status(400).json({ error: 'Invalid payload' })
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 700,
        system: `Tu es le moteur de diagnostic automobile de FlashMat. Reponds uniquement en JSON valide.
Le JSON doit contenir exactement ces champs:
type, probableIssue, confidence, urgency, estimate, duration, priceNote, durationNote, summary, guidanceTitle, guidanceItems, searchCat.
Contraintes:
- language: francais simple
- pas de markdown
- pas de texte hors JSON
- confidence doit etre: Faible, Moyenne, Moyenne a elevee, ou Elevee
- searchCat doit etre un de: mechanic, tire, body, glass, tow, wash
- guidanceItems doit etre un tableau de 3 a 5 phrases courtes
- si le cas est dangereux, dire clairement de ne pas conduire
- ne pas inventer un code OBD
- ne pas mentionner l IA, Anthropic, ChatGPT, Claude ou un modele
- parler comme un service FlashMat fiable pour une cliente qui ne connait pas bien l automobile
- ne pas promettre une certitude absolue`,
        messages: [
          {
            role: 'user',
            content: `Symptome client: ${symptomText}

Diagnostic prudent local actuel:
- probableIssue: ${fallbackDiagnosis.probableIssue}
- confidence: ${fallbackDiagnosis.confidence}
- urgency: ${fallbackDiagnosis.urgency}
- searchCat: ${fallbackDiagnosis.searchCat}

Affinez ce diagnostic de facon pratique et prudente.`,
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      return res.status(502).json({ error: 'Upstream AI error', details: errorText.slice(0, 400) })
    }

    const data = await response.json()
    const aiText = data?.content?.[0]?.text
    const normalized = normalizeAiDiagnosisResponse(parseAiJsonBlock(aiText), fallbackDiagnosis)

    if (!normalized) {
      return res.status(502).json({ error: 'Invalid AI response shape' })
    }

    return res.status(200).json({ diagnosis: normalized })
  } catch (error) {
    return res.status(502).json({
      error: 'AI request failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    })
  }
}

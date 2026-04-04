import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import styles from './VehicleDoctor.module.css'

const INPUT_MODES = [
  { id: 'text', label: 'Texte libre' },
  { id: 'photo', label: 'Photo du problème' },
  { id: 'audio', label: 'Note vocale' },
]

const QUICK_CASES = [
  'Ma voiture grince quand je freine',
  'Le moteur chauffe dans le trafic',
  'La batterie semble faible le matin',
  'J’ai un pneu qui perd de l’air',
]

const CASE_LIBRARY = [
  {
    id: 'oil-change',
    type: 'maintenance',
    symptoms: [
      { terms: ['vidange'], weight: 7 },
      { terms: ['huile'], weight: 5 },
      { terms: ['changement', 'huile'], weight: 6 },
      { terms: ['quand', 'vidange'], weight: 7 },
      { terms: ['quand', 'huile'], weight: 6 },
      { terms: ['entretien'], weight: 3 },
      { terms: ['rav4'], weight: 2 },
      { terms: ['2021'], weight: 1 },
    ],
    probableIssue: 'Conseil de vidange et d’entretien courant',
    confidence: 'Élevée',
    urgency: 'À planifier selon le kilométrage',
    estimate: 'En général tous les 8 000 à 10 000 km',
    duration: 'Environ tous les 6 à 12 mois',
    priceNote: 'Si vous faites surtout de la ville, du froid, de petits trajets ou beaucoup de trafic, faites-la plus tôt, souvent vers 5 000 à 8 000 km.',
    durationNote: 'Pour un RAV4 2021, vérifiez aussi le dernier entretien fait et l’indicateur de maintenance au tableau de bord.',
    searchCat: 'mechanic',
    summary: 'Pour une personne qui veut juste savoir quoi faire: une vidange sert à garder le moteur bien lubrifié. Si vous ne connaissez pas l’historique exact, le plus prudent est de vérifier la dernière vidange et de viser un entretien régulier plutôt que d’attendre un problème.',
    guidanceTitle: 'Ce que vous devez savoir',
    guidanceItems: [
      'Si la dernière vidange date de plus de 6 à 12 mois, il est raisonnable de la planifier.',
      'Si l’auto a roulé environ 8 000 à 10 000 km depuis la dernière vidange, il est souvent temps de la faire.',
      'Si vous faites surtout de courts trajets, du trafic ou l’hiver, faites-la plus tôt.',
      'Quand vous prenez rendez-vous, vous pouvez simplement demander: vidange d’huile + vérification de base.',
    ],
    matches: [
      { name: 'Garage Los Santos', rating: '4.8', distance: '0.8 km', eta: 'Aujourd’hui 14h30', price: 'Vidange dès $89', tags: ['Vidange', 'Inspection rapide', 'Disponible'] },
      { name: 'Garage Mécanique MK', rating: '4.9', distance: '1.8 km', eta: 'Aujourd’hui 16h00', price: 'Vidange dès $95', tags: ['Entretien', 'Avis élevés', 'Réservation express'] },
      { name: 'JA Automobile', rating: '4.8', distance: '3.2 km', eta: 'Demain 09h30', price: 'Vidange dès $85', tags: ['Entretien', 'Contrôle de base', 'Fiable'] },
    ],
  },
  {
    id: 'brakes',
    type: 'repair',
    symptoms: [
      { terms: ['frein'], weight: 4 },
      { terms: ['freine'], weight: 4 },
      { terms: ['freinage'], weight: 4 },
      { terms: ['plaquette'], weight: 5 },
      { terms: ['plaquettes'], weight: 5 },
      { terms: ['disque'], weight: 4 },
      { terms: ['grince'], weight: 3 },
      { terms: ['grincement'], weight: 3 },
      { terms: ['couine'], weight: 3 },
      { terms: ['pedale', 'vibre'], weight: 5 },
      { terms: ['bruit', 'frein'], weight: 5 },
      { terms: ['bruit metallique'], weight: 4 },
      { terms: ['brake'], weight: 4 },
    ],
    probableIssue: 'Plaquettes de frein usées',
    confidence: 'Élevée',
    urgency: 'À traiter rapidement',
    estimate: '$180 - $320',
    duration: '45 min - 1 h 30',
    priceNote: 'Inclut inspection et remplacement avant',
    durationNote: 'Selon l’état des disques',
    searchCat: 'mechanic',
    summary: 'Le symptôme ressemble à une usure avancée des plaquettes avant. Le système recommande une inspection le jour même pour éviter d’abîmer les disques.',
    matches: [
      { name: 'Garage Mécanique MK', rating: '4.9', distance: '1.8 km', eta: 'Aujourd’hui 13h20', price: '$210 estimé', tags: ['Freins', 'Inspection incluse', 'Disponible'] },
      { name: 'Garage Los Santos', rating: '4.8', distance: '0.8 km', eta: 'Aujourd’hui 15h10', price: '$195 estimé', tags: ['Freins', 'Pièces en stock', 'Très rapide'] },
      { name: 'JA Automobile', rating: '4.8', distance: '3.2 km', eta: 'Aujourd’hui 16h00', price: '$230 estimé', tags: ['Freins', 'Avis élevés', 'Paiement sur place'] },
    ],
  },
  {
    id: 'battery',
    type: 'repair',
    symptoms: [
      { terms: ['batterie'], weight: 5 },
      { terms: ['demarre pas'], weight: 6 },
      { terms: ['ne demarre pas'], weight: 6 },
      { terms: ['demarrage'], weight: 4 },
      { terms: ['booster'], weight: 5 },
      { terms: ['alternateur'], weight: 5 },
      { terms: ['courant'], weight: 3 },
      { terms: ['faible', 'batterie'], weight: 5 },
      { terms: ['le matin', 'demarre'], weight: 4 },
      { terms: ['starter'], weight: 4 },
      { terms: ['clique'], weight: 3 },
      { terms: ['clic'], weight: 3 },
    ],
    probableIssue: 'Batterie faible ou alternateur à vérifier',
    confidence: 'Moyenne à élevée',
    urgency: 'À planifier aujourd’hui',
    estimate: '$120 - $340',
    duration: '30 min - 1 h',
    priceNote: 'Test batterie + charge + remplacement si nécessaire',
    durationNote: 'Plus rapide si la batterie est disponible en stock',
    searchCat: 'mechanic',
    summary: 'Le démarrage difficile au froid ou après stationnement pointe vers une batterie fatiguée. Un test de charge et de système de démarrage est conseillé.',
    matches: [
      { name: 'Garage Los Santos', rating: '4.8', distance: '0.8 km', eta: 'Aujourd’hui 11h40', price: '$145 estimé', tags: ['Batterie', 'Test rapide', 'Disponible'] },
      { name: 'Garage Mécanique MK', rating: '4.9', distance: '1.8 km', eta: 'Aujourd’hui 14h00', price: '$160 estimé', tags: ['Électrique', 'Diagnostic', 'Réservation express'] },
      { name: 'Garage Communautaire Pointe', rating: '4.8', distance: '2.4 km', eta: 'Aujourd’hui 16h15', price: '$130 estimé', tags: ['Petit budget', 'Disponible', 'Client régulier'] },
    ],
  },
  {
    id: 'tires',
    type: 'repair',
    symptoms: [
      { terms: ['pneu'], weight: 4 },
      { terms: ['pneus'], weight: 4 },
      { terms: ['crevaison'], weight: 6 },
      { terms: ['air'], weight: 2 },
      { terms: ['pression'], weight: 4 },
      { terms: ['jante'], weight: 3 },
      { terms: ['perd', 'air'], weight: 6 },
      { terms: ['fuite', 'air'], weight: 6 },
      { terms: ['a plat'], weight: 6 },
      { terms: ['gonfler'], weight: 3 },
      { terms: ['valve'], weight: 4 },
    ],
    probableIssue: 'Fuite lente ou crevaison sur un pneu',
    confidence: 'Élevée',
    urgency: 'À faire avant un long trajet',
    estimate: '$35 - $180',
    duration: '20 min - 50 min',
    priceNote: 'Réparation simple ou remplacement selon l’usure',
    durationNote: 'Permutation possible en même temps',
    searchCat: 'tire',
    summary: 'Une perte d’air répétée indique souvent une crevaison lente ou une valve abîmée. Le système recommande un contrôle immédiat pour éviter l’éclatement.',
    matches: [
      { name: 'Dubé Pneu et Mécan.', rating: '4.3', distance: '2.1 km', eta: 'Aujourd’hui 12h15', price: '$49 estimé', tags: ['Pneus', 'Réparation rapide', 'Stock hiver'] },
      { name: 'Garage Los Santos', rating: '4.8', distance: '0.8 km', eta: 'Aujourd’hui 14h20', price: '$65 estimé', tags: ['Pneus', 'Inspection incluse', 'Disponible'] },
      { name: 'Garage Communautaire Pointe', rating: '4.8', distance: '2.4 km', eta: 'Aujourd’hui 17h00', price: '$55 estimé', tags: ['Petit budget', 'Disponible', 'Sans rendez-vous'] },
    ],
  },
  {
    id: 'overheat',
    type: 'repair',
    symptoms: [
      { terms: ['chauffe'], weight: 5 },
      { terms: ['temperature'], weight: 4 },
      { terms: ['surchauffe'], weight: 6 },
      { terms: ['radiateur'], weight: 5 },
      { terms: ['liquide'], weight: 2 },
      { terms: ['refroidissement'], weight: 5 },
      { terms: ['aiguille', 'monte'], weight: 6 },
      { terms: ['moteur', 'chauffe'], weight: 6 },
      { terms: ['ventilateur'], weight: 3 },
      { terms: ['thermostat'], weight: 3 },
    ],
    probableIssue: 'Surchauffe liée au liquide de refroidissement',
    confidence: 'Moyenne',
    urgency: 'Urgent si l’aiguille monte vite',
    estimate: '$95 - $420',
    duration: '45 min - 2 h',
    priceNote: 'Contrôle circuit, fuite, thermostat ou ventilateur',
    durationNote: 'Dépend de la pièce en cause',
    searchCat: 'mechanic',
    summary: 'Le moteur qui chauffe en circulation lente peut signaler un manque de liquide, un ventilateur défectueux ou un thermostat bloqué. Évite de rouler longtemps avant inspection.',
    matches: [
      { name: 'Garage Mécanique MK', rating: '4.9', distance: '1.8 km', eta: 'Aujourd’hui 13h45', price: '$120 estimé', tags: ['Refroidissement', 'Diagnostic', 'Disponible'] },
      { name: 'JA Automobile', rating: '4.8', distance: '3.2 km', eta: 'Aujourd’hui 15h30', price: '$140 estimé', tags: ['Moteur', 'Contrôle complet', 'Aujourd’hui'] },
      { name: 'Garage Los Santos', rating: '4.8', distance: '0.8 km', eta: 'Demain 09h00', price: '$110 estimé', tags: ['Diagnostic', 'Très proche', 'Fiable'] },
    ],
  },
]

const DEFAULT_CASE = {
  type: 'repair',
  probableIssue: 'Inspection mécanique générale recommandée',
  confidence: 'Moyenne',
  urgency: 'À planifier selon le symptôme',
  estimate: '$85 - $220',
  duration: '30 min - 1 h',
  priceNote: 'Diagnostic initial avant devis précis',
  durationNote: 'Le devis final dépendra du véhicule',
  searchCat: 'mechanic',
  summary: 'Le symptôme décrit n’est pas assez précis pour isoler une panne unique. FlashMat recommande un diagnostic rapide avec un garage disponible aujourd’hui.',
  matches: [
    { name: 'Garage Los Santos', rating: '4.8', distance: '0.8 km', eta: 'Aujourd’hui 13h50', price: '$95 estimé', tags: ['Diagnostic', 'Très proche', 'Disponible'] },
    { name: 'Garage Mécanique MK', rating: '4.9', distance: '1.8 km', eta: 'Aujourd’hui 15h00', price: '$110 estimé', tags: ['Diagnostic', 'Avis élevés', 'Réservation express'] },
    { name: 'Garage Communautaire Pointe', rating: '4.8', distance: '2.4 km', eta: 'Aujourd’hui 16h40', price: '$89 estimé', tags: ['Petit budget', 'Disponible', 'Montréal'] },
  ],
}

function detectCase(text) {
  const normalized = (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')

  const scoredCases = CASE_LIBRARY
    .map((candidate) => {
      const score = candidate.symptoms.reduce((total, symptom) => {
        const matched = symptom.terms.every((term) => normalized.includes(term))
        return matched ? total + symptom.weight : total
      }, 0)

      return { candidate, score }
    })
    .sort((left, right) => right.score - left.score)

  const [bestMatch, nextMatch] = scoredCases

  if (!bestMatch || bestMatch.score < 4) {
    return DEFAULT_CASE
  }

  if (nextMatch && bestMatch.score - nextMatch.score <= 1) {
    return {
      ...DEFAULT_CASE,
      probableIssue: 'Plusieurs causes possibles à vérifier',
      confidence: 'Faible à moyenne',
      urgency: 'Diagnostic conseillé avant réparation',
      summary: 'Les symptômes décrits pointent vers plusieurs pistes possibles. FlashMat recommande un diagnostic mécanique pour confirmer la vraie cause avant de réserver une réparation ciblée.',
    }
  }

  return bestMatch.candidate
}

export default function VehicleDoctor({ compact = false, userName }) {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const resultRef = useRef(null)
  const analyzeTimeoutRef = useRef(null)
  const highlightTimeoutRef = useRef(null)
  const [inputMode, setInputMode] = useState('text')
  const [draft, setDraft] = useState('')
  const [submitted, setSubmitted] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [hasFreshResult, setHasFreshResult] = useState(false)
  const [statusMessage, setStatusMessage] = useState('Décrivez le symptôme puis lancez le diagnostic.')

  const diagnosis = useMemo(() => (submitted ? detectCase(submitted) : null), [submitted])
  const ctaLabel = user && profile?.role === 'client' ? 'Réserver en 10 sec' : 'Se connecter et réserver'
  const effectiveSearchCat = diagnosis?.searchCat || 'mechanic'
  const resultEyebrowLabel = diagnosis?.type === 'maintenance'
    ? 'Conseil entretien FlashMat'
    : 'Diagnostic automatique FlashMat'

  useEffect(() => {
    return () => {
      window.clearTimeout(analyzeTimeoutRef.current)
      window.clearTimeout(highlightTimeoutRef.current)
    }
  }, [])

  function openMatchingSearch(category) {
    const target = `/app/client?pane=search&cat=${encodeURIComponent(category)}`
    if (user && profile?.role === 'client') {
      navigate(target)
      return
    }
    window.sessionStorage.setItem('flashmat-post-login-redirect', target)
    window.dispatchEvent(new CustomEvent('flashmat-login-modal-open'))
  }

  function analyze(nextDraft) {
    const value = (nextDraft || draft).trim()
    if (!value) {
      setStatusMessage('Décrivez un symptôme pour lancer le diagnostic.')
      return
    }

    window.clearTimeout(analyzeTimeoutRef.current)
    window.clearTimeout(highlightTimeoutRef.current)

    setDraft(value)
    setIsAnalyzing(true)
    setHasFreshResult(false)
    setStatusMessage('Analyse du symptôme en cours...')

    analyzeTimeoutRef.current = window.setTimeout(() => {
      setSubmitted(value)
      setIsAnalyzing(false)
      setHasFreshResult(true)
      setStatusMessage('Diagnostic prêt. Consultez le résultat et les garages suggérés.')
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })

      highlightTimeoutRef.current = window.setTimeout(() => {
        setHasFreshResult(false)
      }, 1800)
    }, 450)
  }

  const wrapperClass = compact ? `${styles.section} ${styles.sectionCompact}` : styles.section
  const shellClass = compact ? `${styles.shell} ${styles.shellCompact}` : styles.shell

  return (
    <section className={wrapperClass}>
      <div className={shellClass}>
        {compact ? (
          <div className={styles.compactHeader}>
            <div>
              <div className={styles.eyebrow}>FlashMat Diagnostic IA</div>
              <h2 className={styles.compactTitle}>Votre docteur pour voiture</h2>
              <p className={styles.compactSub}>
                Décrivez le symptôme, ajoutez bientôt une photo ou un audio, et FlashMat propose un problème probable,
                un prix estimé, une durée et les garages disponibles les plus pertinents.
              </p>
            </div>
            <div className={styles.confidence}>Bonjour {userName || 'client'}</div>
          </div>
        ) : null}

        <div className={styles.grid}>
          <div>
            {!compact ? (
              <>
                <div className={styles.eyebrow}>FlashMat Doctor</div>
                <h2 className={styles.title}>
                  Le docteur <span>pour voiture</span>
                </h2>
                <p className={styles.subtitle}>
                  Décrivez votre problème, envoyez bientôt une photo ou une note vocale, puis laissez FlashMat
                  estimer la panne, le prix, le temps de réparation et vous connecter au meilleur mécanicien dispo.
                </p>
              </>
            ) : null}

            <div className={styles.modeRow}>
              {INPUT_MODES.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  className={`${styles.modeBtn} ${inputMode === mode.id ? styles.modeBtnActive : ''}`}
                  onClick={() => setInputMode(mode.id)}
                >
                  {mode.label}
                </button>
              ))}
            </div>

            <div className={styles.inputCard}>
              <textarea
                className={styles.textarea}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Ex: ma voiture fait un bruit quand je freine, l’auto vibre et une lumière s’allume au tableau de bord."
              />
              <div className={styles.helper}>
                <span>
                  {inputMode === 'text' && 'Décrivez les bruits, vibrations, odeurs ou voyants.'}
                  {inputMode === 'photo' && 'Le mode photo peut déjà lancer le diagnostic après description du symptôme.'}
                  {inputMode === 'audio' && 'Le mode audio est prévu dans le flow: la note vocale alimentera le diagnostic.'}
                </span>
                <strong>Montréal · IA + estimation + matching</strong>
              </div>
            </div>

            <div className={styles.actions}>
              <button
                type="button"
                className={`${styles.primaryBtn} ${isAnalyzing ? styles.primaryBtnDisabled : ''}`}
                onClick={() => analyze()}
                disabled={isAnalyzing}
              >
                {isAnalyzing ? 'Analyse en cours...' : 'Lancer le diagnostic'}
              </button>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => openMatchingSearch(effectiveSearchCat)}
              >
                Voir les garages disponibles
              </button>
            </div>

            <div className={styles.chipRow}>
              {QUICK_CASES.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={styles.chip}
                  onClick={() => {
                    setDraft(item)
                    analyze(item)
                  }}
                >
                  {item}
                </button>
              ))}
            </div>

            <div className={styles.stats}>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Diagnostic auto</div>
                <div className={styles.statValue}>1 min</div>
                <div className={styles.statSub}>Résultat clair avant de réserver</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Prix en temps réel</div>
                <div className={styles.statValue}>{diagnosis?.estimate || '—'}</div>
                <div className={styles.statSub}>
                  {diagnosis?.type === 'maintenance'
                    ? 'Repère simple pour savoir quand planifier le service'
                    : diagnosis
                      ? 'Fourchette basée sur le problème probable'
                      : 'Lancez le diagnostic pour une estimation'}
                </div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Réservation rapide</div>
                <div className={styles.statValue}>{diagnosis ? '3 garages' : '—'}</div>
                <div className={styles.statSub}>
                  {diagnosis ? 'Proches, disponibles, déjà filtrés' : 'Des suggestions apparaîtront après analyse'}
                </div>
              </div>
            </div>
          </div>

          <div
            ref={resultRef}
            className={`${styles.result} ${hasFreshResult ? styles.resultHighlight : ''}`}
            tabIndex={-1}
          >
            <div className={styles.resultTop}>
              <div>
                <div className={styles.resultEyebrow}>{resultEyebrowLabel}</div>
                <h3 className={styles.resultTitle}>
                  {diagnosis ? diagnosis.probableIssue : 'Prêt à analyser votre véhicule'}
                </h3>
              </div>
              <div className={styles.confidence}>
                {diagnosis ? `Confiance ${diagnosis.confidence}` : 'Aucun diagnostic'}
              </div>
            </div>

            <div className={styles.statusRow}>
              <span className={`${styles.statusPill} ${isAnalyzing ? styles.statusPillBusy : styles.statusPillReady}`}>
                {isAnalyzing ? 'Analyse...' : 'Diagnostic prêt'}
              </span>
              <span className={styles.statusText}>{statusMessage}</span>
            </div>

            <p className={styles.summary}>
              {diagnosis
                ? diagnosis.summary
                : 'Décrivez un bruit, une vibration, un voyant ou un comportement étrange, puis cliquez sur le bouton pour obtenir une estimation.'}
            </p>

            {diagnosis ? (
              <div className={styles.badgeRow}>
                <span className={`${styles.badge} ${diagnosis.urgency.toLowerCase().includes('urgent') || diagnosis.urgency.toLowerCase().includes('rapidement') ? styles.badgeWarn : styles.badgeSafe}`}>
                  {diagnosis.urgency}
                </span>
                <span className={`${styles.badge} ${styles.badgeInfo}`}>Matching à Montréal</span>
              </div>
            ) : null}

            <div className={styles.metricGrid}>
              <div className={styles.metricCard}>
                <div className={styles.metricLabel}>{diagnosis?.type === 'maintenance' ? 'Quand le faire' : 'Prix estimé'}</div>
                <div className={styles.metricValue}>{diagnosis?.estimate || '—'}</div>
                <div className={styles.metricSub}>
                  {diagnosis?.priceNote || 'L’estimation apparaîtra après l’analyse'}
                </div>
              </div>
              <div className={styles.metricCard}>
                <div className={styles.metricLabel}>{diagnosis?.type === 'maintenance' ? 'Repère dans le temps' : 'Temps de réparation'}</div>
                <div className={styles.metricValue}>{diagnosis?.duration || '—'}</div>
                <div className={styles.metricSub}>
                  {diagnosis?.durationNote || 'La durée estimée apparaîtra après l’analyse'}
                </div>
              </div>
            </div>

            {diagnosis?.guidanceItems?.length ? (
              <div className={styles.guidanceCard}>
                <div className={styles.guidanceTitle}>{diagnosis.guidanceTitle || 'À retenir'}</div>
                <div className={styles.guidanceList}>
                  {diagnosis.guidanceItems.map((item) => (
                    <div key={item} className={styles.guidanceItem}>{item}</div>
                  ))}
                </div>
              </div>
            ) : null}

            <div className={styles.matchSection}>
              <div className={styles.matchHeader}>
                <h4 className={styles.matchTitle}>3 garages suggérés aujourd’hui</h4>
                <span className={styles.matchHint}>Proches + compatibles + dispo</span>
              </div>

              <div className={styles.matchList}>
                {diagnosis ? diagnosis.matches.map((match) => (
                  <div key={match.name} className={styles.matchCard}>
                    <div className={styles.matchTop}>
                      <div>
                        <div className={styles.matchName}>{match.name}</div>
                        <div className={styles.matchMeta}>
                          ⭐ {match.rating} · {match.distance} · {match.eta}
                        </div>
                      </div>
                      <div className={styles.matchPrice}>{match.price}</div>
                    </div>
                    <div className={styles.matchFoot}>
                      <div className={styles.matchTags}>
                        {match.tags.map((tag) => (
                          <span key={tag} className={styles.miniTag}>{tag}</span>
                        ))}
                      </div>
                      <button
                        type="button"
                        className={styles.reserveBtn}
                        onClick={() => openMatchingSearch(effectiveSearchCat)}
                      >
                        Réserver
                      </button>
                    </div>
                  </div>
                )) : (
                  <div className={styles.emptyState}>
                    Lancez un diagnostic pour voir les garages les plus pertinents.
                  </div>
                )}
              </div>
            </div>

            <div className={styles.ctaRow}>
              <button
                type="button"
                className={styles.ctaPrimary}
                onClick={() => openMatchingSearch(effectiveSearchCat)}
              >
                {ctaLabel}
              </button>
              <button
                type="button"
                className={styles.ctaGhost}
                onClick={() => navigate('/services')}
              >
                Explorer tous les services
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

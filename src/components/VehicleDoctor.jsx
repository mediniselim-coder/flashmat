import { useMemo, useState } from 'react'
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
    id: 'brakes',
    keywords: ['frein', 'freine', 'grince', 'plaquette', 'bruit metallique', 'brake'],
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
    keywords: ['batterie', 'demarre pas', 'demarrage', 'booster', 'alternateur', 'courant'],
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
    keywords: ['pneu', 'crevaison', 'air', 'pression', 'jante'],
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
    keywords: ['chauffe', 'temperature', 'surchauffe', 'radiateur', 'liquide'],
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

  const match = CASE_LIBRARY.find((candidate) =>
    candidate.keywords.some((keyword) => normalized.includes(keyword))
  )

  return match || DEFAULT_CASE
}

export default function VehicleDoctor({ compact = false, userName }) {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [inputMode, setInputMode] = useState('text')
  const [draft, setDraft] = useState('Ma voiture grince quand je freine et la pédale vibre un peu.')
  const [submitted, setSubmitted] = useState('Ma voiture grince quand je freine et la pédale vibre un peu.')

  const diagnosis = useMemo(() => detectCase(submitted), [submitted])
  const ctaLabel = user && profile?.role === 'client' ? 'Réserver en 10 sec' : 'Se connecter et réserver'

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
    if (!value) return
    setSubmitted(value)
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
              <button type="button" className={styles.primaryBtn} onClick={() => analyze()}>
                Lancer le diagnostic
              </button>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => openMatchingSearch(diagnosis.searchCat)}
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
                <div className={styles.statValue}>{diagnosis.estimate}</div>
                <div className={styles.statSub}>Fourchette basée sur le problème probable</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statLabel}>Réservation rapide</div>
                <div className={styles.statValue}>3 garages</div>
                <div className={styles.statSub}>Proches, disponibles, déjà filtrés</div>
              </div>
            </div>
          </div>

          <div className={styles.result}>
            <div className={styles.resultTop}>
              <div>
                <div className={styles.resultEyebrow}>Diagnostic automatique FlashMat</div>
                <h3 className={styles.resultTitle}>{diagnosis.probableIssue}</h3>
              </div>
              <div className={styles.confidence}>Confiance {diagnosis.confidence}</div>
            </div>

            <p className={styles.summary}>{diagnosis.summary}</p>

            <div className={styles.badgeRow}>
              <span className={`${styles.badge} ${diagnosis.urgency.toLowerCase().includes('urgent') || diagnosis.urgency.toLowerCase().includes('rapidement') ? styles.badgeWarn : styles.badgeSafe}`}>
                {diagnosis.urgency}
              </span>
              <span className={`${styles.badge} ${styles.badgeInfo}`}>Matching à Montréal</span>
            </div>

            <div className={styles.metricGrid}>
              <div className={styles.metricCard}>
                <div className={styles.metricLabel}>Prix estimé</div>
                <div className={styles.metricValue}>{diagnosis.estimate}</div>
                <div className={styles.metricSub}>{diagnosis.priceNote}</div>
              </div>
              <div className={styles.metricCard}>
                <div className={styles.metricLabel}>Temps de réparation</div>
                <div className={styles.metricValue}>{diagnosis.duration}</div>
                <div className={styles.metricSub}>{diagnosis.durationNote}</div>
              </div>
            </div>

            <div className={styles.matchSection}>
              <div className={styles.matchHeader}>
                <h4 className={styles.matchTitle}>3 garages suggérés aujourd’hui</h4>
                <span className={styles.matchHint}>Proches + compatibles + dispo</span>
              </div>

              <div className={styles.matchList}>
                {diagnosis.matches.map((match) => (
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
                        onClick={() => openMatchingSearch(diagnosis.searchCat)}
                      >
                        Réserver
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.ctaRow}>
              <button
                type="button"
                className={styles.ctaPrimary}
                onClick={() => openMatchingSearch(diagnosis.searchCat)}
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

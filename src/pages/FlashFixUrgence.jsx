import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { createFlashFixRequest } from '../lib/flashfix'
import { supabase } from '../lib/supabase'
import NavBar from '../components/NavBar'

const QUICK_CASES = [
  'Besoin d un mecanicien a domicile',
  'Lavage auto a domicile',
  'Batterie morte a domicile',
  'Pneu creve sur le bord de la route',
  'Voiture qui ne demarre plus',
  'Bruit suspect avant de reprendre la route',
  'Surchauffe moteur',
  'Portieres verrouillees avec cles dedans',
  'Besoin de remorquage rapide',
]

const FLASHFIX_CASES = [
  {
    id: 'mobile-mechanic',
    label: 'Besoin d un mecanicien a domicile',
    keywords: ['mecanicien', 'mecanique', 'diagnostic', 'inspection', 'reparation'],
    summary: 'Demande de mecanicien mobile pour verifier un probleme general ou effectuer une petite reparation sur place.',
    reassurance: 'Pratique si vous voulez une intervention mecanique rapide sans passer d abord au garage.',
    options: [
      { id: 'mechanic-home-diagnostic', title: 'Diagnostic mecanique a domicile', eta: '20-30 min', price: '60-95$', providerType: 'Mecano mobile', category: 'mechanic' },
      { id: 'mechanic-home-repair', title: 'Petite reparation sur place', eta: '25-40 min', price: '90$+', providerType: 'Mecano mobile', category: 'mechanic' },
    ],
  },
  {
    id: 'mobile-wash',
    label: 'Lavage auto a domicile',
    keywords: ['lavage', 'laver', 'wash', 'nettoyage', 'interieur', 'exterieur'],
    summary: 'Service mobile de lavage ou detailing leger directement a domicile ou au travail.',
    reassurance: 'Le bon choix si vous voulez un service propre, pratique et reserve via FlashMat.',
    options: [
      { id: 'wash-exterior', title: 'Lavage exterieur mobile', eta: '20-30 min', price: '35-55$', providerType: 'Lavage mobile', category: 'wash' },
      { id: 'wash-full', title: 'Lavage interieur + exterieur', eta: '35-60 min', price: '65-110$', providerType: 'Detailing mobile', category: 'wash' },
    ],
  },
  {
    id: 'battery-home',
    label: 'Batterie morte a domicile',
    keywords: ['batterie', 'booster', 'boost', 'courant', 'ne demarre pas', 'demarre plus'],
    summary: 'Intervention mobile pour booster, tester la batterie ou verifier l alimentation principale.',
    reassurance: 'Bon choix si la voiture reste immobile chez vous ou au stationnement et que vous voulez repartir vite.',
    options: [
      { id: 'battery-boost', title: 'Boost batterie mobile', eta: '15-25 min', price: '40-60$', providerType: 'Mecano mobile', category: 'mechanic' },
      { id: 'battery-diagnostic', title: 'Diagnostic batterie + boost', eta: '20-30 min', price: '55-75$', providerType: 'Mecano mobile', category: 'mechanic' },
    ],
  },
  {
    id: 'flat-tire',
    label: 'Pneu creve sur le bord de la route',
    keywords: ['pneu', 'creve', 'air', 'pression', 'jante'],
    summary: 'Aide rapide pour remise en route, changement de roue ou remorquage securitaire si necessaire.',
    reassurance: 'Le systeme priorise une solution simple si la situation est stable, sinon il oriente vers un remorquage.',
    options: [
      { id: 'tire-roadside', title: 'Aide pneu mobile', eta: '20-30 min', price: '50-80$', providerType: 'Service routier', category: 'tire' },
      { id: 'tire-tow', title: 'Remorquage vers garage partenaire', eta: '25-35 min', price: '79$+', providerType: 'Remorquage', category: 'tow' },
    ],
  },
  {
    id: 'no-start',
    label: 'Voiture qui ne demarre plus',
    keywords: ['ne demarre pas', 'demarre plus', 'starter', 'clic', 'batterie'],
    summary: 'Verification sur place pour distinguer batterie, alimentation, demarreur ou besoin de remorquage.',
    reassurance: 'Utile quand vous n etes pas sure de la cause et que vous voulez eviter de changer une piece au hasard.',
    options: [
      { id: 'nostart-diagnostic', title: 'Diagnostic demarrage sur place', eta: '20-30 min', price: '60-95$', providerType: 'Mecano mobile', category: 'mechanic' },
      { id: 'nostart-tow', title: 'Remorquage intelligent', eta: '25-40 min', price: '79$+', providerType: 'Remorquage', category: 'tow' },
    ],
  },
  {
    id: 'suspicious-noise',
    label: 'Bruit suspect avant de reprendre la route',
    keywords: ['bruit', 'suspect', 'claque', 'grince', 'frein', 'vibre', 'cogne'],
    summary: 'Inspection securite avant de reprendre la route, ou transport vers atelier si la conduite semble risquee.',
    reassurance: 'Le bon reflexe quand vous voulez savoir si vous pouvez repartir sans danger.',
    options: [
      { id: 'noise-check', title: 'Inspection securite rapide', eta: '20-30 min', price: '60-90$', providerType: 'Mecano mobile', category: 'mechanic' },
      { id: 'noise-tow', title: 'Transport securitaire vers atelier', eta: '25-40 min', price: '79$+', providerType: 'Remorquage', category: 'tow' },
    ],
  },
  {
    id: 'overheat',
    label: 'Surchauffe moteur',
    keywords: ['chauffe', 'temperature', 'surchauffe', 'radiateur', 'refroidissement', 'moteur chauffe'],
    summary: 'Intervention de securite si le moteur chauffe, avec verification du circuit de refroidissement ou remorquage.',
    reassurance: 'Important si vous voulez eviter d endommager le moteur en roulant davantage.',
    options: [
      { id: 'overheat-check', title: 'Inspection refroidissement sur place', eta: '20-30 min', price: '70-110$', providerType: 'Mecano mobile', category: 'mechanic' },
      { id: 'overheat-tow', title: 'Remorquage securitaire', eta: '25-40 min', price: '79$+', providerType: 'Remorquage', category: 'tow' },
    ],
  },
  {
    id: 'lockout',
    label: 'Portieres verrouillees avec cles dedans',
    keywords: ['cles', 'cle', 'verrouille', 'portiere', 'porte barree', 'enferme dehors'],
    summary: 'Assistance rapide pour deverrouiller le vehicule sans intervention mecanique lourde.',
    reassurance: 'Le service vise un acces rapide et propre quand le probleme est seulement l acces au vehicule.',
    options: [
      { id: 'lockout-unlock', title: 'Deverrouillage mobile', eta: '15-25 min', price: '45-70$', providerType: 'Assistance routiere', category: 'tow' },
    ],
  },
  {
    id: 'urgent-tow',
    label: 'Besoin de remorquage rapide',
    keywords: ['remorquage', 'remorquer', 'tow', 'transport garage'],
    summary: 'Prise en charge directe pour transporter le vehicule vers un garage partenaire ou un lieu securitaire.',
    reassurance: 'Le plus simple si vous savez deja que la voiture ne doit pas repartir sur place.',
    options: [
      { id: 'urgent-tow-dispatch', title: 'Remorquage prioritaire', eta: '20-35 min', price: '79$+', providerType: 'Remorquage', category: 'tow' },
    ],
  },
]

const FALLBACK_PROVIDERS = [
  { name: 'Garage Los Santos', type: 'mechanic', type_label: 'Mecanique', distance: '0.8 km', rating: '4.8', phone: '(514) 374-2829', address: 'Montreal', is_open: true },
  { name: 'Garage Mecanique MK', type: 'mechanic', type_label: 'Mecanique', distance: '1.8 km', rating: '4.9', phone: '(514) 555-0147', address: 'Montreal', is_open: true },
  { name: 'FlashWash Mobile', type: 'wash', type_label: 'Lavage auto', distance: '1.2 km', rating: '4.7', phone: '(514) 555-0162', address: 'Montreal', is_open: true },
  { name: 'Dubé Pneu et Mecan.', type: 'tire', type_label: 'Pneus', distance: '2.1 km', rating: '4.3', phone: '(514) 555-0133', address: 'Montreal', is_open: true },
  { name: 'FlashTow Montreal', type: 'tow', type_label: 'Remorquage', distance: '2.4 km', rating: '4.7', phone: '(514) 555-0121', address: 'Montreal', is_open: true },
]

function normalize(value) {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function resolveFlashFixCase(description, quickCase) {
  if (quickCase) {
    return FLASHFIX_CASES.find((item) => item.label === quickCase) || null
  }

  const normalized = normalize(description)
  if (!normalized.trim()) return null

  const scored = FLASHFIX_CASES
    .map((item) => ({
      item,
      score: item.keywords.reduce((total, keyword) => total + (normalized.includes(keyword) ? 1 : 0), 0),
    }))
    .sort((left, right) => right.score - left.score)

  return scored[0]?.score > 0 ? scored[0].item : null
}

function parseDistanceKm(value) {
  const normalized = String(value || '').replace(',', '.')
  const match = normalized.match(/(\d+(?:\.\d+)?)/)
  return match ? Number(match[1]) : 99
}

function slugifyProviderName(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

function inferArrivalWindow(distanceKm) {
  if (distanceKm <= 1) return '10-15 min'
  if (distanceKm <= 2.5) return '15-25 min'
  if (distanceKm <= 4) return '20-30 min'
  return '25-40 min'
}

function providerSupportsCategory(provider, category) {
  const type = normalize(provider.type || '')
  const typeLabel = normalize(provider.type_label || '')
  const serviceTerms = Array.isArray(provider.services)
    ? provider.services.map((service) => normalize(service))
    : []

  const pools = [type, typeLabel, ...serviceTerms]

  const categoryTerms = {
    mechanic: ['mecanique', 'mechanic', 'diagnostic', 'freins', 'vidange', 'suspension', 'climatisation'],
    wash: ['lave-auto', 'lavage', 'wash', 'detailing', 'nettoyage'],
    tow: ['remorquage', 'tow', 'depannage', 'assistance routiere'],
    tire: ['pneu', 'pneus', 'tire', 'alignement', 'balancement'],
  }

  const wantedTerms = categoryTerms[category] || [category]
  return pools.some((pool) => wantedTerms.some((term) => pool.includes(term)))
}

function buildProviderProfile(provider, option) {
  const distanceKm = parseDistanceKm(provider.distance)
  return {
    title: provider.type_label || option.providerType || 'Provider FlashFix',
    vehicle: option.providerType === 'Remorquage' ? 'Camion de service FlashFix' : 'Unite mobile FlashFix',
    rating: provider.rating || '4.8',
    phone: provider.phone || '(514) 555-0100',
    arrivalWindow: option.eta || inferArrivalWindow(distanceKm),
    distance: provider.distance || `${distanceKm} km`,
    address: provider.address || 'Montreal',
    providerId: provider.id || null,
    providerSlug: provider.slug || slugifyProviderName(provider.name),
  }
}

export default function FlashFixUrgence() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [quickCase, setQuickCase] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('Montreal')
  const [locationDetails, setLocationDetails] = useState('')
  const [selectedOptionId, setSelectedOptionId] = useState('')
  const [geoLabel, setGeoLabel] = useState('Recherche de votre position...')
  const [geoStatus, setGeoStatus] = useState('loading')
  const [providers, setProviders] = useState(FALLBACK_PROVIDERS)

  const resolvedCase = useMemo(() => resolveFlashFixCase(description, quickCase), [description, quickCase])
  const selectedOption = resolvedCase?.options.find((option) => option.id === selectedOptionId) || null
  const matchedProvider = useMemo(() => {
    if (!selectedOption) return null

    const openProviders = providers.filter((provider) => provider.is_open === true || provider.is_open === 'true')
    const categoryMatches = openProviders.filter((provider) => providerSupportsCategory(provider, selectedOption.category))
    const pool = categoryMatches.length > 0 ? categoryMatches : openProviders.length > 0 ? openProviders : providers

    if (pool.length === 0) return null

    return [...pool].sort((left, right) => parseDistanceKm(left.distance) - parseDistanceKm(right.distance))[0]
  }, [providers, selectedOption])

  useEffect(() => {
    async function fetchProviders() {
      const { data } = await supabase
        .from('providers_list')
        .select('*')
        .order('rating', { ascending: false })
        .limit(100)

      if (Array.isArray(data) && data.length > 0) {
        setProviders(data)
      }
    }

    fetchProviders()
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      setGeoStatus('unavailable')
      setGeoLabel('Localisation automatique non disponible')
      return
    }

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const autoLocation = `Position GPS (${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)})`
        setLocation(autoLocation)
        setGeoStatus('ready')
        setGeoLabel('Position GPS detectee automatiquement en arriere-plan')
      },
      () => {
        setGeoStatus('denied')
        setGeoLabel('Autorisez la localisation pour une position exacte, puis ajoutez un complement si besoin')
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 300000 },
    )
  }, [])

  function chooseQuickCase(label) {
    setQuickCase(label)
    setDescription(label)
    const matchedCase = FLASHFIX_CASES.find((item) => item.label === label)
    setSelectedOptionId(matchedCase?.options[0]?.id || '')
  }

  function selectOption(optionId) {
    setSelectedOptionId(optionId)
  }

  function launchFlashFixRequest() {
    if (!resolvedCase || !selectedOption) return

    const providerProfile = matchedProvider ? buildProviderProfile(matchedProvider, selectedOption) : null

    createFlashFixRequest({
      channel: 'flashfix',
      issueLabel: resolvedCase.label,
      description: description || resolvedCase.label,
      location: [location, locationDetails].filter(Boolean).join(' · ') || 'Position a confirmer',
      selectedOption,
      providerName: matchedProvider?.name || null,
      providerProfile,
      providerId: matchedProvider?.id || null,
      providerSlug: matchedProvider?.slug || slugifyProviderName(matchedProvider?.name),
      customerName: profile?.full_name || user?.email?.split('@')[0] || 'Client FlashMat',
    })

    if (user && profile?.role === 'client') {
      navigate('/app/client?pane=bookings')
      return
    }

    window.sessionStorage.setItem('flashmat-post-login-redirect', '/app/client?pane=bookings')
    navigate('/services?login=1')
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f7fb', fontFamily: 'var(--sans, sans-serif)' }}>
      <NavBar activePage="urgence" />

      <section style={{ background: 'linear-gradient(135deg, #7f1d1d 0%, #111827 100%)', color: '#fff', padding: '64px 24px 40px' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <div style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: '#fca5a5', marginBottom: 12, fontWeight: 700 }}>FlashFix Urgence</div>
          <h1 style={{ fontSize: 'clamp(34px, 6vw, 56px)', lineHeight: 1.02, margin: '0 0 14px', fontWeight: 800 }}>
            Une panne.
            <br />
            <span style={{ color: '#fecaca' }}>Une demande. Un mecano mobile.</span>
          </h1>
          <p style={{ maxWidth: 760, margin: 0, fontSize: 16, lineHeight: 1.75, color: '#e5e7eb' }}>
            FlashFix guide le client, propose le bon service, envoie la demande au provider, puis affiche le suivi dans l app.
          </p>
        </div>
      </section>

      <section style={{ maxWidth: 1180, margin: '-18px auto 0', padding: '0 24px 56px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 18 }}>
          {[
            ['1', 'Decrire', 'Le client explique le probleme ou clique sur un cas rapide.'],
            ['2', 'Choisir', 'FlashFix propose l intervention la plus logique.'],
            ['3', 'Envoyer', 'La demande part au provider avec les infos utiles.'],
            ['4', 'Suivre', 'Le client voit l etat de la mission dans l app.'],
          ].map(([step, title, text]) => (
            <div key={step} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 20, padding: 18, boxShadow: '0 10px 30px rgba(15, 23, 42, 0.05)' }}>
              <div style={{ width: 32, height: 32, borderRadius: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111827', color: '#fff', fontSize: 12, fontWeight: 800, marginBottom: 12 }}>{step}</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#111827', marginBottom: 6 }}>{title}</div>
              <div style={{ fontSize: 13, lineHeight: 1.7, color: '#6b7280' }}>{text}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18 }}>
          <div style={{ background: '#fff', borderRadius: 24, padding: 24, border: '1px solid #e5e7eb', boxShadow: '0 16px 42px rgba(15, 23, 42, 0.06)' }}>
            <div style={{ fontSize: 12, letterSpacing: 1.6, textTransform: 'uppercase', color: '#dc2626', marginBottom: 10, fontWeight: 700 }}>Etape 1 - Diagnostic rapide</div>
            <h2 style={{ fontSize: 30, lineHeight: 1.05, margin: '0 0 10px', color: '#111827', fontWeight: 800 }}>Que se passe-t-il avec la voiture ?</h2>
            <p style={{ color: '#6b7280', fontSize: 15, lineHeight: 1.75, margin: '0 0 18px' }}>
              FlashFix detecte la position du client en arriere-plan, confirme le bon service, puis envoie la demande au provider le plus adapte sans exposer son identite au client. Le flow couvre maintenant mecanicien, lavage et remorquage.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
              {QUICK_CASES.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => chooseQuickCase(item)}
                  style={{
                    borderRadius: 999,
                    padding: '10px 14px',
                    border: quickCase === item ? '2px solid #2563eb' : '1px solid #dbe2ea',
                    background: quickCase === item ? '#eff6ff' : '#fff',
                    color: '#111827',
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {item}
                </button>
              ))}
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Ex: la voiture ne demarre pas, je suis dans mon stationnement a Montreal"
                style={{ width: '100%', minHeight: 130, borderRadius: 18, border: '1px solid #dbe2ea', padding: 16, fontSize: 15, lineHeight: 1.6, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box', color: '#111827' }}
              />
              <input
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="Position GPS automatique"
                style={{ width: '100%', borderRadius: 16, border: '1px solid #dbe2ea', padding: 14, fontSize: 14, boxSizing: 'border-box', color: '#111827' }}
              />
              <input
                value={locationDetails}
                onChange={(event) => setLocationDetails(event.target.value)}
                placeholder="Complement precise: appartement, etage, stationnement, numero de borne..."
                style={{ width: '100%', borderRadius: 16, border: '1px solid #dbe2ea', padding: 14, fontSize: 14, boxSizing: 'border-box', color: '#111827' }}
              />
            </div>
            <div style={{ marginTop: 10, fontSize: 12, color: geoStatus === 'ready' ? '#059669' : '#64748b', lineHeight: 1.6 }}>
              {geoLabel}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginTop: 16 }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 18, padding: 14 }}>
                <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1.1, marginBottom: 6 }}>Mode</div>
                <div style={{ fontWeight: 800, color: '#111827' }}>GPS auto + precision client</div>
              </div>
              <div style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 18, padding: 14 }}>
                <div style={{ fontSize: 11, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1.1, marginBottom: 6 }}>Suite</div>
                <div style={{ fontWeight: 800, color: '#111827' }}>Dispatch FlashMat prive</div>
              </div>
            </div>
          </div>

          <div style={{ background: '#111827', color: '#fff', borderRadius: 24, padding: 24, boxShadow: '0 16px 42px rgba(15, 23, 42, 0.14)' }}>
            <div style={{ fontSize: 12, letterSpacing: 1.6, textTransform: 'uppercase', color: '#93c5fd', marginBottom: 10, fontWeight: 700 }}>Etape 2 - Service propose</div>
            {!resolvedCase ? (
              <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.09)', borderRadius: 20, padding: 20 }}>
                <h3 style={{ fontSize: 28, lineHeight: 1.05, margin: '0 0 10px', fontWeight: 800 }}>Pret a vous aider</h3>
                <p style={{ margin: 0, color: 'rgba(255,255,255,0.74)', lineHeight: 1.75, fontSize: 14 }}>
                  Decrivez le besoin ou choisissez un cas rapide. FlashFix affichera ensuite le bon service, le prix et le temps d arrivee.
                </p>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 14 }}>
                  <div>
                    <h3 style={{ fontSize: 30, lineHeight: 1.02, margin: '0 0 8px', fontWeight: 800 }}>{resolvedCase.label}</h3>
                    <p style={{ margin: 0, color: 'rgba(255,255,255,0.72)', lineHeight: 1.7, fontSize: 14 }}>{resolvedCase.summary}</p>
                  </div>
                  <span style={{ borderRadius: 999, padding: '8px 12px', background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.08)', fontSize: 12, whiteSpace: 'nowrap' }}>Mission FlashFix</span>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 18, padding: 16, marginBottom: 14 }}>
                  <div style={{ fontSize: 11, letterSpacing: 1.2, textTransform: 'uppercase', color: 'rgba(255,255,255,.55)', marginBottom: 8 }}>Reassurance client</div>
                  <div style={{ fontSize: 14, lineHeight: 1.7, color: '#f3f4f6' }}>{resolvedCase.reassurance}</div>
                </div>

                <div style={{ display: 'grid', gap: 10 }}>
                  {resolvedCase.options.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => selectOption(option.id)}
                      style={{
                        textAlign: 'left',
                        padding: 16,
                        borderRadius: 18,
                        border: selectedOptionId === option.id ? '2px solid #22c55e' : '1px solid rgba(255,255,255,0.12)',
                        background: selectedOptionId === option.id ? 'rgba(34,197,94,0.14)' : 'rgba(255,255,255,0.04)',
                        color: '#fff',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                        <div style={{ fontSize: 15, fontWeight: 800 }}>{option.title}</div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: '#86efac' }}>{option.price}</div>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        <span style={{ borderRadius: 999, padding: '6px 10px', background: 'rgba(59,130,246,0.16)', color: '#bfdbfe', fontSize: 12, fontWeight: 700 }}>ETA {option.eta}</span>
                        <span style={{ borderRadius: 999, padding: '6px 10px', background: 'rgba(255,255,255,0.08)', color: '#e5e7eb', fontSize: 12, fontWeight: 700 }}>{option.providerType}</span>
                      </div>
                    </button>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginTop: 14 }}>
                  <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: 14 }}>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,.58)', textTransform: 'uppercase', letterSpacing: 1.1, marginBottom: 6 }}>Adresse</div>
                    <div style={{ fontWeight: 700 }}>{geoStatus === 'ready' ? 'Position GPS confirmee' : 'Position en verification'}</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: 14 }}>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,.58)', textTransform: 'uppercase', letterSpacing: 1.1, marginBottom: 6 }}>Matching</div>
                    <div style={{ fontWeight: 700 }}>{matchedProvider ? 'Provider FlashMat trouve' : 'Recherche automatique'}</div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: 14 }}>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,.58)', textTransform: 'uppercase', letterSpacing: 1.1, marginBottom: 6 }}>Arrivee</div>
                    <div style={{ fontWeight: 700 }}>{matchedProvider ? (selectedOption?.eta || buildProviderProfile(matchedProvider, selectedOption).arrivalWindow) : 'A confirmer'}</div>
                  </div>
                </div>

                <div style={{ marginTop: 12, background: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: 14, border: '1px solid rgba(255,255,255,0.08)' }}>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,.58)', textTransform: 'uppercase', letterSpacing: 1.1, marginBottom: 6 }}>Confidentialite provider</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,.8)', lineHeight: 1.65 }}>
                    FlashMat garde l identite du provider en interne. Le client voit le service, le prix, l ETA et le suivi, mais pas les coordonnees du garage ou du mecanicien.
                  </div>
                </div>

                {locationDetails && (
                  <div style={{ marginTop: 12, background: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: 14, border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,.58)', textTransform: 'uppercase', letterSpacing: 1.1, marginBottom: 6 }}>Precision partagee au provider</div>
                    <div style={{ fontSize: 13, color: 'rgba(255,255,255,.8)', lineHeight: 1.65 }}>
                      {locationDetails}
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={launchFlashFixRequest}
                  disabled={!selectedOption}
                  style={{ marginTop: 16, width: '100%', padding: '15px 18px', borderRadius: 16, border: 'none', background: selectedOption ? 'linear-gradient(135deg,#ef4444,#dc2626)' : '#fca5a5', color: '#fff', fontSize: 15, fontWeight: 800, cursor: selectedOption ? 'pointer' : 'not-allowed', boxShadow: selectedOption ? '0 18px 34px rgba(239,68,68,0.24)' : 'none' }}
                >
                  Lancer la demande au provider
                </button>
              </>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginTop: 18 }}>
          {[
            ['Services FlashFix', 'Mecanicien mobile, lavage auto mobile, remorquage, batterie, pneu, surchauffe et autres demandes utiles.'],
            ['Client', 'Voit le service, le prix, le delai et le suivi, sans voir le provider reel.'],
            ['FlashMat', 'Fait le matching du provider en arriere-plan avec la bonne categorie de service.'],
          ].map(([title, text]) => (
            <div key={title} style={{ background: '#fff', borderRadius: 20, padding: 18, border: '1px solid #e5e7eb', boxShadow: '0 10px 28px rgba(15, 23, 42, 0.04)' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: '#111827', marginBottom: 8 }}>{title}</div>
              <div style={{ fontSize: 14, lineHeight: 1.7, color: '#6b7280' }}>{text}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

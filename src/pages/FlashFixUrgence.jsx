import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { createFlashFixRequest } from '../lib/flashfix'
import NavBar from '../components/NavBar'
import VehicleDoctor from '../components/VehicleDoctor'

const QUICK_CASES = [
  'Batterie morte a domicile',
  'Pneu creve sur le bord de la route',
  'Voiture qui ne demarre plus',
  'Bruit suspect avant de reprendre la route',
]

const FLASHFIX_CASES = [
  {
    id: 'battery-home',
    label: 'Batterie morte a domicile',
    keywords: ['batterie', 'booster', 'boost', 'courant', 'ne demarre pas', 'demarre plus'],
    summary: 'Le vehicule semble avoir besoin d un boost, d un test batterie ou d une verification de l alimentation principale.',
    options: [
      { id: 'battery-boost', title: 'Boost batterie mobile', eta: '15-25 min', price: '40-60$', providerType: 'Mecano mobile', category: 'mechanic' },
      { id: 'battery-diagnostic', title: 'Diagnostic batterie + boost', eta: '20-30 min', price: '55-75$', providerType: 'Mecano mobile', category: 'mechanic' },
    ],
  },
  {
    id: 'flat-tire',
    label: 'Pneu creve sur le bord de la route',
    keywords: ['pneu', 'creve', 'air', 'pression', 'jante'],
    summary: 'Une intervention rapide peut viser un changement de roue, une remise en route securitaire ou un remorquage si la situation est risquee.',
    options: [
      { id: 'tire-roadside', title: 'Aide pneu mobile', eta: '20-30 min', price: '50-80$', providerType: 'Service routier', category: 'tow' },
      { id: 'tire-tow', title: 'Remorquage vers garage partenaire', eta: '25-35 min', price: '79$+', providerType: 'Remorquage', category: 'tow' },
    ],
  },
  {
    id: 'no-start',
    label: 'Voiture qui ne demarre plus',
    keywords: ['ne demarre pas', 'demarre plus', 'starter', 'clic', 'batterie'],
    summary: 'Le systeme recommande une verification rapide pour distinguer batterie, alimentation, demarreur ou besoin de remorquage.',
    options: [
      { id: 'nostart-diagnostic', title: 'Diagnostic demarrage sur place', eta: '20-30 min', price: '60-95$', providerType: 'Mecano mobile', category: 'mechanic' },
      { id: 'nostart-tow', title: 'Remorquage intelligent', eta: '25-40 min', price: '79$+', providerType: 'Remorquage', category: 'tow' },
    ],
  },
  {
    id: 'suspicious-noise',
    label: 'Bruit suspect avant de reprendre la route',
    keywords: ['bruit', 'suspect', 'claque', 'grince', 'frein', 'vibre', 'cogne'],
    summary: 'Le probleme ne doit pas etre minimise. FlashFix peut proposer une inspection mobile ou une prise en charge vers un garage si la conduite semble risquee.',
    options: [
      { id: 'noise-check', title: 'Inspection securite rapide', eta: '20-30 min', price: '60-90$', providerType: 'Mecano mobile', category: 'mechanic' },
      { id: 'noise-tow', title: 'Transport securitaire vers atelier', eta: '25-40 min', price: '79$+', providerType: 'Remorquage', category: 'tow' },
    ],
  },
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

export default function FlashFixUrgence() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [quickCase, setQuickCase] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('Montréal')
  const [selectedOptionId, setSelectedOptionId] = useState('')

  const resolvedCase = useMemo(() => resolveFlashFixCase(description, quickCase), [description, quickCase])
  const selectedOption = resolvedCase?.options.find((option) => option.id === selectedOptionId) || null

  useEffect(() => {
    if (!resolvedCase) {
      setSelectedOptionId('')
      return
    }

    const currentExists = resolvedCase.options.some((option) => option.id === selectedOptionId)
    if (!currentExists) {
      setSelectedOptionId(resolvedCase.options[0]?.id || '')
    }
  }, [resolvedCase, selectedOptionId])

  function chooseQuickCase(label) {
    setQuickCase(label)
    setDescription(label)
    const matchedCase = FLASHFIX_CASES.find((item) => item.label === label)
    setSelectedOptionId(matchedCase?.options[0]?.id || '')
  }

  function launchFlashFixRequest() {
    if (!resolvedCase || !selectedOption) return

    createFlashFixRequest({
      channel: 'flashfix',
      issueLabel: resolvedCase.label,
      description: description || resolvedCase.label,
      location: location || 'Position a confirmer',
      selectedOption,
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
    <div style={{ minHeight: '100vh', background: 'var(--bg, #f8f8f6)', fontFamily: 'var(--sans, sans-serif)' }}>
      <NavBar activePage="urgence" />

      <section style={{ background: 'linear-gradient(135deg, #450a0a 0%, #7f1d1d 100%)', color: '#fff', padding: '64px 32px 48px', textAlign: 'center' }}>
        <div style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: '#fca5a5', marginBottom: 12, fontWeight: 700 }}>● FlashFix Urgence</div>
        <h1 style={{ fontSize: 44, fontWeight: 800, margin: '0 0 16px', lineHeight: 1.08 }}>
          Tu es en panne.
          <br />
          <span style={{ color: '#fca5a5' }}>Tu cliques. Quelqu un arrive.</span>
        </h1>
        <p style={{ color: '#fecaca', fontSize: 16, maxWidth: 760, margin: '0 auto', lineHeight: 1.75 }}>
          Le client passe par FlashFix, decrit le probleme ou choisit un cas rapide, recoit les bonnes options,
          lance la demande, puis suit l intervention dans l app pendant que le provider accepte ou refuse comme sur une plateforme temps reel.
        </p>
      </section>

      <section style={{ maxWidth: 1240, margin: '0 auto', padding: '32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 14, marginBottom: 20 }}>
          {[
            ['1', 'Diagnostic', 'Docteur Automobile comprend le besoin'],
            ['2', 'Choix', 'Le client voit le bon service et le prix'],
            ['3', 'Dispatch', 'Le provider recoit et accepte ou refuse'],
            ['4', 'Suivi', 'Le client suit l intervention dans l app'],
          ].map(([step, title, text]) => (
            <div key={step} style={{ background: '#fff', borderRadius: 18, padding: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #eee' }}>
              <div style={{ width: 30, height: 30, borderRadius: 999, background: '#111827', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, marginBottom: 10 }}>{step}</div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#111827', marginBottom: 6 }}>{title}</div>
              <div style={{ fontSize: 13, lineHeight: 1.7, color: '#6b7280' }}>{text}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.05fr .95fr', gap: 20 }}>
          <div style={{ background: '#fff', borderRadius: 22, padding: 22, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: '#dc2626', marginBottom: 10, fontWeight: 700 }}>Etape 1 - Docteur Automobile</div>
            <VehicleDoctor compact userName={profile?.full_name || 'client'} />
          </div>

          <div style={{ background: '#fff', borderRadius: 22, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: '#dc2626', marginBottom: 10, fontWeight: 700 }}>Etape 2 - Commande urgente</div>
            <h2 style={{ fontSize: 28, lineHeight: 1.15, margin: '0 0 10px', color: '#111827' }}>FlashFix - Besoin d aide maintenant</h2>
            <p style={{ color: '#6b7280', fontSize: 15, lineHeight: 1.7, margin: '0 0 16px' }}>
              Decris le probleme ou clique sur un cas rapide. FlashMat te propose ensuite les bonnes options, avec prix, ETA et type de provider.
            </p>

            <div style={{ display: 'grid', gap: 10, marginBottom: 18 }}>
              {QUICK_CASES.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => chooseQuickCase(item)}
                  style={{
                    textAlign: 'left',
                    padding: '14px 16px',
                    borderRadius: 14,
                    border: quickCase === item ? '2px solid #ef4444' : '1px solid #e5e7eb',
                    background: quickCase === item ? '#fef2f2' : '#fff',
                    color: '#111827',
                    fontSize: 14,
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
                style={{ width: '100%', minHeight: 110, borderRadius: 14, border: '1px solid #d1d5db', padding: 14, fontSize: 14, resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }}
              />
              <input
                value={location}
                onChange={(event) => setLocation(event.target.value)}
                placeholder="Position automatique ou adresse"
                style={{ width: '100%', borderRadius: 14, border: '1px solid #d1d5db', padding: 14, fontSize: 14, boxSizing: 'border-box' }}
              />
            </div>

            {resolvedCase ? (
              <div style={{ marginTop: 18 }}>
                <div style={{ fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: '#111827', marginBottom: 10, fontWeight: 700 }}>Infos utiles</div>
                <div style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 16, padding: 16, marginBottom: 14 }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#111827', marginBottom: 8 }}>{resolvedCase.label}</div>
                  <div style={{ fontSize: 14, lineHeight: 1.7, color: '#6b7280' }}>{resolvedCase.summary}</div>
                </div>
                <div style={{ background: 'linear-gradient(135deg, #111827 0%, #1d4ed8 100%)', borderRadius: 18, padding: 16, color: '#fff', marginBottom: 14 }}>
                  <div style={{ fontSize: 11, letterSpacing: 1.4, textTransform: 'uppercase', color: 'rgba(255,255,255,.72)', marginBottom: 8 }}>Apercu mission</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
                    <div style={{ background: 'rgba(255,255,255,.08)', borderRadius: 12, padding: 12 }}>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,.6)', marginBottom: 4 }}>Position</div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{location || 'Montreal'}</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,.08)', borderRadius: 12, padding: 12 }}>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,.6)', marginBottom: 4 }}>Dispatch</div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>Provider mobile notifie</div>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,.08)', borderRadius: 12, padding: 12 }}>
                      <div style={{ fontSize: 10, color: 'rgba(255,255,255,.6)', marginBottom: 4 }}>Suivi</div>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>Timeline dans l app</div>
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: '#111827', marginBottom: 10, fontWeight: 700 }}>Choisis une option</div>
                <div style={{ display: 'grid', gap: 10 }}>
                  {resolvedCase.options.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setSelectedOptionId(option.id)}
                      style={{
                        textAlign: 'left',
                        padding: 16,
                        borderRadius: 16,
                        border: selectedOptionId === option.id ? '2px solid #22c55e' : '1px solid #e5e7eb',
                        background: selectedOptionId === option.id ? '#f0fdf4' : '#fff',
                        cursor: 'pointer',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                        <div style={{ fontSize: 15, fontWeight: 800, color: '#111827' }}>{option.title}</div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: '#16a34a' }}>{option.price}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ background: '#eff6ff', color: '#1d4ed8', borderRadius: 999, padding: '6px 10px', fontSize: 12, fontWeight: 700 }}>ETA {option.eta}</span>
                        <span style={{ background: '#f3f4f6', color: '#374151', borderRadius: 999, padding: '6px 10px', fontSize: 12, fontWeight: 700 }}>{option.providerType}</span>
                      </div>
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={launchFlashFixRequest}
                  disabled={!selectedOption}
                  style={{ marginTop: 16, width: '100%', padding: '14px 18px', borderRadius: 14, border: 'none', background: selectedOption ? '#ef4444' : '#fca5a5', color: '#fff', fontSize: 14, fontWeight: 800, cursor: selectedOption ? 'pointer' : 'not-allowed' }}
                >
                  Lancer la demande au provider
                </button>
              </div>
            ) : (
              <div style={{ marginTop: 18, background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 14, padding: 16, color: '#9a3412', fontSize: 14, lineHeight: 1.7 }}>
                Decris le probleme ou choisis un cas rapide pour recevoir les options de service et lancer la demande.
              </div>
            )}
          </div>
        </div>
      </section>

      <section style={{ maxWidth: 1240, margin: '0 auto', padding: '0 32px 56px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 18 }}>
          {[
            ['Provider', 'Recoit une notification urgence avec type de panne, prix, distance et localisation client.'],
            ['Acceptation', 'Le provider accepte ou refuse la demande directement depuis l app, comme un dispatch instantane.'],
            ['Suivi client', 'Le client suit ensuite l etat: acceptee, en route, sur place, terminee.'],
            ['Tout dans l app', 'FlashMat devient le point central entre diagnostic, intervention et suivi.'],
          ].map(([title, text]) => (
            <div key={title} style={{ background: '#fff', borderRadius: 20, padding: 22, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#111827', marginBottom: 8 }}>{title}</div>
              <div style={{ fontSize: 14, lineHeight: 1.7, color: '#6b7280' }}>{text}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

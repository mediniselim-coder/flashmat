import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import NavBar from '../components/NavBar'

const EMERGENCY_STEPS = [
  {
    title: 'Expliquez le problème',
    text: 'Décrivez rapidement ce qui se passe: batterie morte, pneu crevé, voiture bloquée, bruit inquiétant ou panne soudaine.',
  },
  {
    title: 'On trouve le bon pro mobile',
    text: 'FlashMat priorise un mécano mobile ou un service routier disponible près de vous, selon le niveau d’urgence.',
  },
  {
    title: 'Intervention à votre adresse',
    text: 'Le professionnel vient à vous, comme une livraison Uber Eats, mais pour aider votre voiture sur place.',
  },
]

const QUICK_CASES = [
  'Batterie à booster à domicile',
  'Pneu crevé ou perte d’air soudaine',
  'Voiture qui ne démarre plus',
  'Frein ou direction qui semblent dangereux',
]

export default function FlashFixUrgence() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()

  function requestUrgence(categoryId = 'tow') {
    window.sessionStorage.setItem('flashmat-pending-service-search', JSON.stringify({
      pane: 'search',
      cat: categoryId,
    }))

    if (user && profile?.role === 'client') {
      navigate(`/app/client?pane=search&cat=${encodeURIComponent(categoryId)}`)
      return
    }

    navigate('/services?login=1')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg, #f8f8f6)', fontFamily: 'var(--sans, sans-serif)' }}>
      <NavBar activePage="urgence" />

      <div style={{ background: 'linear-gradient(135deg, #450a0a 0%, #7f1d1d 100%)', color: '#fff', padding: '64px 32px 48px', textAlign: 'center' }}>
        <div style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: '#fca5a5', marginBottom: 12, fontWeight: 700 }}>● FlashFix Urgence</div>
        <h1 style={{ fontSize: 42, fontWeight: 700, margin: '0 0 16px', lineHeight: 1.15 }}>
          Un mécano mobile<br />
          <span style={{ color: '#fca5a5' }}>vient à toi</span>
        </h1>
        <p style={{ color: '#fecaca', fontSize: 16, maxWidth: 720, margin: '0 auto 28px', lineHeight: 1.7 }}>
          Le bouton urgence FlashMat sert à demander une intervention rapide, à domicile ou sur la route.
          L’idée: une expérience simple, rapide et rassurante pour obtenir de l aide automobile sans vous déplacer.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => requestUrgence('tow')}
            style={{ padding: '13px 18px', borderRadius: 12, border: 'none', background: '#ef4444', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
          >
            Demander une urgence maintenant
          </button>
          <button
            type="button"
            onClick={() => requestUrgence('mechanic')}
            style={{ padding: '13px 18px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.24)', background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            Trouver un mécano mobile
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 20, maxWidth: 1200, margin: '0 auto', padding: '28px 32px 0' }}>
        {EMERGENCY_STEPS.map((item, index) => (
          <div key={item.title} style={{ background: '#fff', borderRadius: 18, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div style={{ width: 34, height: 34, borderRadius: 999, background: '#fee2e2', color: '#b91c1c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, marginBottom: 14 }}>
              {index + 1}
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 8 }}>{item.title}</div>
            <div style={{ fontSize: 14, lineHeight: 1.7, color: '#6b7280' }}>{item.text}</div>
          </div>
        ))}
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 32px 56px' }}>
        <div style={{ background: '#fff', borderRadius: 22, padding: 28, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: '#dc2626', marginBottom: 12, fontWeight: 700 }}>Interventions rapides</div>
          <h2 style={{ fontSize: 28, lineHeight: 1.2, margin: '0 0 10px', color: '#111827' }}>
            Pour les cas où vous avez besoin d’aide <span style={{ color: '#dc2626' }}>tout de suite</span>
          </h2>
          <p style={{ color: '#6b7280', fontSize: 15, lineHeight: 1.7, margin: '0 0 20px' }}>
            FlashFix Urgence est pensé pour les problèmes qui ne peuvent pas attendre un rendez-vous classique:
            panne soudaine, batterie, pneu, voiture immobilisée ou situation qui semble risquée à conduire.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 22 }}>
            {QUICK_CASES.map((item) => (
              <div key={item} style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 14, padding: 16, fontSize: 14, fontWeight: 600, color: '#991b1b' }}>
                {item}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => requestUrgence('tow')}
              style={{ padding: '12px 16px', borderRadius: 10, border: 'none', background: '#111827', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
            >
              Voir les pros disponibles
            </button>
            <button
              type="button"
              onClick={() => navigate('/doctor')}
              style={{ padding: '12px 16px', borderRadius: 10, border: '1px solid #d1d5db', background: '#fff', color: '#111827', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >
              Passer par le Docteur Automobile
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}


import { useNavigate } from 'react-router-dom'
import NavBar from '../components/NavBar'
import VehicleDoctor from '../components/VehicleDoctor'

const INFO_CARDS = [
  {
    title: 'Questions simples',
    text: 'Posez des questions comme quand faire une vidange, quoi vérifier avant un long trajet ou quel service demander au garage.',
  },
  {
    title: 'Problèmes concrets',
    text: 'Décrivez un bruit, une vibration, un voyant ou un souci après accident pour obtenir une première orientation claire.',
  },
  {
    title: 'Action facile',
    text: 'Le docteur vous aide ensuite à savoir quoi faire et vers quel type de professionnel vous diriger à Montréal.',
  },
]

export default function AutoDoctor() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg, #f8f8f6)', fontFamily: 'var(--sans, sans-serif)' }}>
      <NavBar activePage="doctor" />

      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#fff', padding: '64px 32px 48px', textAlign: 'center' }}>
        <div style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: '#22c55e', marginBottom: 12, fontWeight: 600 }}>● Docteur auto</div>
        <h1 style={{ fontSize: 42, fontWeight: 700, margin: '0 0 16px', lineHeight: 1.2 }}>
          Posez vos questions auto<br />
          <span style={{ color: '#22c55e' }}>simplement</span>
        </h1>
        <p style={{ color: '#94a3b8', fontSize: 16, maxWidth: 620, margin: '0 auto 28px' }}>
          Une page dédiée pour comprendre quoi faire avec votre voiture, même si vous ne connaissez rien en mécanique.
          Entretien, panne, bruit, accident, porte bloquée, batterie, pneus: commencez ici.
        </p>
        <button
          type="button"
          onClick={() => document.getElementById('doctor-tool')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
          style={{ padding: '12px 18px', borderRadius: 10, border: 'none', background: '#22c55e', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
        >
          Utiliser le docteur auto ↓
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: 24, padding: '24px 32px', background: '#fff', borderBottom: '1px solid #f0f0f0', flexWrap: 'wrap' }}>
        {INFO_CARDS.map((card) => (
          <div key={card.title} style={{ width: 280, maxWidth: '100%', background: '#fff', borderRadius: 16, padding: 22, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 8 }}>{card.title}</div>
            <div style={{ fontSize: 14, lineHeight: 1.7, color: '#6b7280' }}>{card.text}</div>
          </div>
        ))}
      </div>

      <div id="doctor-tool" style={{ maxWidth: 1240, margin: '0 auto', padding: '40px 32px 56px' }}>
        <VehicleDoctor />
      </div>

      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 32px 56px' }}>
        <div style={{ background: '#fff', borderRadius: 18, padding: 28, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: '#22c55e', marginBottom: 10, fontWeight: 700 }}>Exemples de questions</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
            {[
              'Quand faire la vidange de mon RAV4 2021 ?',
              'Ma voiture grince quand je freine, est-ce grave ?',
              'J’ai eu un accident, ma porte arrière ne s’ouvre pas, quoi faire ?',
              'Mon moteur chauffe dans le trafic, je fais quoi maintenant ?',
            ].map((item) => (
              <div key={item} style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 12, padding: 14, fontSize: 14, color: '#374151' }}>
                {item}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 20 }}>
            <button
              type="button"
              onClick={() => navigate('/services')}
              style={{ padding: '10px 16px', borderRadius: 10, border: '1px solid #d1d5db', background: '#fff', color: '#111827', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >
              Voir tous les services →
            </button>
          </div>
        </div>
      </div>

      <footer style={{ background: '#0f172a', color: '#94a3b8', padding: '32px', textAlign: 'center', fontSize: 13 }}>
        <img src="/logo.jpg" alt="FlashMat" style={{ height: 32, objectFit: 'contain', marginBottom: 16, filter: 'brightness(0) invert(1)' }} />
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap', marginBottom: 16 }}>
          {['À propos', 'Conditions', 'Confidentialité', 'info@flashmat.ca', '514-476-1708'].map((item) => (
            <span key={item} style={{ cursor: 'pointer' }}>{item}</span>
          ))}
        </div>
        <div style={{ fontSize: 11, color: '#475569' }}>© 2025 FlashMat.ca · Montréal, QC</div>
      </footer>
    </div>
  )
}

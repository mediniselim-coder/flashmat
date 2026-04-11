import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import NavBar from '../components/NavBar'
import VehicleDoctor from '../components/VehicleDoctor'
import SiteFooter from '../components/SiteFooter'

export default function AutoDoctor() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const canUseDoctor = user && profile?.role === 'client'

  function openLoginForDoctor() {
    window.sessionStorage.setItem('flashmat-post-login-redirect', '/doctor')
    window.dispatchEvent(new CustomEvent('flashmat-login-modal-open'))
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg, #f8f8f6)', fontFamily: 'var(--sans, sans-serif)' }}>
      <NavBar activePage="doctor" />

      <div id="doctor-tool" style={{ maxWidth: 1240, margin: '0 auto', padding: '32px 32px 56px' }}>
        {canUseDoctor ? (
          <VehicleDoctor />
        ) : (
          <div style={{ background: '#fff', borderRadius: 24, padding: 30, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #e5e7eb' }}>
            <div style={{ fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: '#22c55e', marginBottom: 10, fontWeight: 700 }}>Acces protege</div>
            <h2 style={{ fontSize: 32, lineHeight: 1.08, margin: '0 0 12px', color: '#111827' }}>Connectez votre profil client pour lancer un diagnostic</h2>
            <p style={{ fontSize: 15, lineHeight: 1.75, color: '#6b7280', margin: '0 0 18px', maxWidth: 760 }}>
              Le Docteur Automobile est lie au profil client pour conserver vos demandes, vos vehicules et vos futures reservations. La page reste visible publiquement, mais l analyse n est disponible qu apres connexion.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button type="button" onClick={openLoginForDoctor} style={{ padding: '12px 18px', borderRadius: 10, border: 'none', background: '#22c55e', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                Se connecter comme client
              </button>
              <button type="button" onClick={() => navigate('/services')} style={{ padding: '12px 18px', borderRadius: 10, border: '1px solid #d1d5db', background: '#fff', color: '#111827', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
                Voir les services
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 32px 56px' }}>
        <div style={{ background: '#fff', borderRadius: 18, padding: 28, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: '#22c55e', marginBottom: 10, fontWeight: 700 }}>Exemples de questions</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
            {[
              'Quand faire la vidange de mon RAV4 2021 ?',
              'Ma voiture grince quand je freine, est-ce grave ?',
              'J ai eu un accident, ma porte arriere ne s ouvre pas, quoi faire ?',
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
              Voir tous les services {'->'}
            </button>
          </div>
        </div>
      </div>

      <SiteFooter portal="public" />
    </div>
  )
}

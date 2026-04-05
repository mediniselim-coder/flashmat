import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import NavBar from '../components/NavBar'
import SiteFooter from '../components/SiteFooter'

const SERVICES = [
  { id: 'flashfix', name: 'FlashFix Urgence', icon: '🚨', desc: 'Un mécano mobile ou un service d urgence vient à vous rapidement, à domicile ou sur la route.', items: ['Mécano mobile', 'Batterie à booster', 'Pneu crevé', 'Intervention rapide'], count: 8 },
  { id: 'mechanic', name: 'Mécanique générale', icon: '🔧', desc: 'Vidange, freins, suspension, diagnostic — tout pour garder votre voiture en parfait état.', items: ['Vidange d\'huile & filtres', 'Freins & plaquettes', 'Suspension & direction', 'Diagnostic électronique'], count: 59 },
  { id: 'wash', name: 'Lave-auto', icon: '🚿', desc: 'Lavage extérieur, intérieur, détailing complet — redonnez à votre véhicule son éclat d\'origine.', items: ['Lavage extérieur complet', 'Nettoyage intérieur', 'Cire & protection', 'Détailing céramique'], count: 28 },
  { id: 'tire', name: 'Pneus & jantes', icon: '🔩', desc: 'Installation, équilibrage, permutation — pneus été, hiver et quatre saisons disponibles.', items: ['Installation pneus hiver/été', 'Équilibrage & géométrie', 'Permutation saisonnière', 'Réparation crevaison'], count: 19 },
  { id: 'body', name: 'Carrosserie', icon: '🎨', desc: 'Réparation de bosses, peinture, débosselage — votre carrosserie comme neuve.', items: ['Débosselage sans peinture', 'Peinture & retouche', 'Réparation pare-chocs', 'Remplacement pièces'], count: 15 },
  { id: 'glass', name: 'Vitres auto', icon: '🪟', desc: 'Remplacement et réparation de pare-brise, vitres latérales et lunettes arrière.', items: ['Remplacement pare-brise', 'Réparation fissures', 'Vitres latérales', 'Teintage de vitres'], count: 12 },
  { id: 'tuning', name: 'Performance', icon: '🏎️', desc: 'Reprogrammation moteur, échappement sport, modifications — libérez le potentiel de votre auto.', items: ['Reprogrammation ECU', 'Échappement sport', 'Suspension abaissée', 'Admission d\'air froid'], count: 10 },
  { id: 'parts', name: 'Pièces auto', icon: '⚙️', desc: 'Pièces neuves et d\'occasion, toutes marques — livraison rapide à Montréal.', items: ['Pièces OEM & aftermarket', 'Commande en ligne', 'Pièces d\'occasion', 'Accessoires & équipements'], count: 18 },
  { id: 'parking', name: 'Stationnement', icon: '🅿️', desc: 'Espaces sécurisés intérieurs et extérieurs, abonnements mensuels disponibles.', items: ['Stationnement intérieur', 'Abonnement mensuel', 'Surveillance 24/7', 'Borne de recharge VÉ'], count: 22 },
  { id: 'tow', name: 'Remorquage', icon: '🚛', desc: 'Service d\'urgence 24/7 — remorquage, dépannage, démarrage et assistance routière.', items: ['Remorquage 24/7', 'Démarrage à booster', 'Pneu crevé sur route', 'Transport longue distance'], count: 17 },
  { id: 'junk', name: 'Casses auto', icon: '♻️', desc: 'Récupération de véhicules, pièces usagées, recyclage — service écologique et rapide.', items: ['Achat véhicules accidentés', 'Pièces usagées certifiées', 'Recyclage écologique', 'Enlèvement gratuit'], count: 9 },
]

export default function Services() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, profile } = useAuth()
  const [search, setSearch] = useState(location.state?.cat || '')
  const [active, setActive] = useState(null)

  function openFlashFix() {
    if (user && profile?.role === 'client') { navigate('/urgence'); return }
    window.sessionStorage.setItem('flashmat-post-login-redirect', '/urgence')
    navigate('/urgence?login=1')
  }

  function goToFilteredSearch(categoryId) {
    navigate(`/services/providers?cat=${encodeURIComponent(categoryId)}`)
  }

  const filtered = SERVICES.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.desc.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font)' }}>

      <NavBar activePage="services" />

      {/* HERO */}
      <div style={{ background: 'linear-gradient(135deg, #0a1528 0%, #0f1e3d 60%, #1a3a8f 100%)', color: '#fff', padding: '64px 32px 48px', textAlign: 'center' }}>
        <div style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--blue)', marginBottom: 12, fontWeight: 600 }}>● Nos services</div>
        <h1 style={{ fontSize: 42, fontWeight: 700, margin: '0 0 16px', lineHeight: 1.2, fontFamily: 'var(--display)' }}>
          Tous les services auto<br />
          <span style={{ color: 'var(--blue)' }}>à Montréal</span>
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 16, maxWidth: 520, margin: '0 auto 32px' }}>
          Trouvez le bon professionnel pour chaque besoin de votre véhicule — 200+ fournisseurs vérifiés à Montréal.
        </p>
        <div style={{ maxWidth: 480, margin: '0 auto' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un service…"
            style={{ width: '100%', padding: '14px 20px', borderRadius: 12, border: 'none', fontSize: 15, outline: 'none', boxSizing: 'border-box', fontFamily: 'var(--font)' }}
          />
        </div>
      </div>

      {/* STATS */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 48, padding: '24px 32px', background: 'var(--bg2)', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
        {[['11', 'Types de services'], ['200+', 'Fournisseurs'], ['4.7★', 'Note moyenne'], ['24/7', 'Support urgences']].map(([v, l]) => (
          <div key={l} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--green)', fontFamily: 'var(--display)' }}>{v}</div>
            <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 2, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{l}</div>
          </div>
        ))}
      </div>

      {/* GRID */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '48px 64px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {filtered.map(s => (
            <div
              key={s.id}
              onClick={() => setActive(active === s.id ? null : s.id)}
              style={{
                background: 'var(--bg2)',
                borderRadius: 16,
                padding: 28,
                cursor: 'pointer',
                border: active === s.id ? '2px solid var(--green)' : '1.5px solid var(--border)',
                boxShadow: active === s.id ? 'var(--shadow-lg)' : 'var(--shadow)',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
                <div style={{ fontSize: 36, lineHeight: 1 }}>{s.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink)', marginBottom: 4, fontFamily: 'var(--display)' }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--blue)', fontWeight: 600, fontFamily: 'var(--mono)' }}>{s.count} fournisseurs</div>
                </div>
              </div>
              <p style={{ fontSize: 14, color: 'var(--ink2)', lineHeight: 1.6, margin: '0 0 16px' }}>{s.desc}</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {s.items.map(item => (
                  <li key={item} style={{ fontSize: 12, color: 'var(--ink2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: 'var(--blue)', fontSize: 10, fontWeight: 700 }}>✓</span> {item}
                  </li>
                ))}
              </ul>
              <button
                onClick={e => {
                  e.stopPropagation()
                  if (s.id === 'flashfix') { openFlashFix(); return }
                  goToFilteredSearch(s.id)
                }}
                style={{
                  width: '100%', padding: '10px', borderRadius: 8, border: 'none',
                  background: s.id === 'flashfix' ? 'var(--red)' : active === s.id ? 'var(--green)' : 'var(--green-bg)',
                  color: s.id === 'flashfix' || active === s.id ? '#fff' : 'var(--green)',
                  fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s',
                  fontFamily: 'var(--font)',
                }}
              >
                Trouver un fournisseur →
              </button>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--ink3)' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, fontFamily: 'var(--display)' }}>Aucun service trouvé</div>
            <div style={{ fontSize: 14 }}>Essayez un autre mot-clé</div>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <SiteFooter portal="public" />
      <footer style={{ display: 'none', background: '#0a1528', color: 'var(--ink3)', padding: '32px 64px', textAlign: 'center', fontSize: 13, borderTop: '1px solid var(--border)' }}>
        <img src="/logo.jpg" alt="FlashMat" style={{ height: 32, objectFit: 'contain', marginBottom: 16, filter: 'brightness(0) invert(1)' }} />
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap', marginBottom: 16 }}>
          {['À propos', 'Conditions', 'Confidentialité', 'info@flashmat.ca', '514-476-1708'].map(l => (
            <span key={l} style={{ cursor: 'pointer' }}>{l}</span>
          ))}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>© 2025 FlashMat.ca · Montréal, QC</div>
      </footer>
    </div>
  )
}

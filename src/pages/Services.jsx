import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import NavBar from '../components/NavBar'
import SiteFooter from '../components/SiteFooter'
import ServiceIcon from '../components/ServiceIcon'

const SERVICES = [
  { id: 'flashfix', name: 'FlashFix Urgence', icon: 'FF', desc: 'Un mecano mobile ou un service d urgence vient a vous rapidement, a domicile ou sur la route.', items: ['Mecano mobile', 'Batterie a booster', 'Pneu creve', 'Intervention rapide'], count: 8 },
  { id: 'mechanic', name: 'Mecanique generale', icon: 'ME', desc: 'Vidange, freins, suspension, diagnostic - tout pour garder votre voiture en parfait etat.', items: ['Vidange d huile et filtres', 'Freins et plaquettes', 'Suspension et direction', 'Diagnostic electronique'], count: 59 },
  { id: 'wash', name: 'Lave-auto', icon: 'LV', desc: 'Lavage exterieur, interieur, detailing complet - redonnez a votre vehicule son eclat d origine.', items: ['Lavage exterieur complet', 'Nettoyage interieur', 'Cire et protection', 'Detailing ceramique'], count: 28 },
  { id: 'tire', name: 'Pneus et jantes', icon: 'PN', desc: 'Installation, equilibrage, permutation - pneus ete, hiver et quatre saisons disponibles.', items: ['Installation pneus hiver/ete', 'Equilibrage et geometrie', 'Permutation saisonniere', 'Reparation crevaison'], count: 19 },
  { id: 'body', name: 'Carrosserie', icon: 'CR', desc: 'Reparation de bosses, peinture, debosselage - votre carrosserie comme neuve.', items: ['Debosselage sans peinture', 'Peinture et retouche', 'Reparation pare-chocs', 'Remplacement pieces'], count: 15 },
  { id: 'glass', name: 'Vitres auto', icon: 'VT', desc: 'Remplacement et reparation de pare-brise, vitres laterales et lunettes arriere.', items: ['Remplacement pare-brise', 'Reparation fissures', 'Vitres laterales', 'Teintage de vitres'], count: 12 },
  { id: 'tuning', name: 'Performance', icon: 'PR', desc: 'Reprogrammation moteur, echappement sport, modifications - liberez le potentiel de votre auto.', items: ['Reprogrammation ECU', 'Echappement sport', 'Suspension abaissee', 'Admission d air froid'], count: 10 },
  { id: 'parts', name: 'Pieces auto', icon: 'PC', desc: 'Pieces neuves et d occasion, toutes marques - livraison rapide a Montreal.', items: ['Pieces OEM et aftermarket', 'Commande en ligne', 'Pieces d occasion', 'Accessoires et equipements'], count: 18 },
  { id: 'parking', name: 'Stationnement', icon: 'PK', desc: 'Espaces securises interieurs et exterieurs, abonnements mensuels disponibles.', items: ['Stationnement interieur', 'Abonnement mensuel', 'Surveillance 24/7', 'Borne de recharge VE'], count: 22 },
  { id: 'tow', name: 'Remorquage', icon: 'RW', desc: 'Service d urgence 24/7 - remorquage, depannage, demarrage et assistance routiere.', items: ['Remorquage 24/7', 'Demarrage a booster', 'Pneu creve sur route', 'Transport longue distance'], count: 17 },
  { id: 'junk', name: 'Casses auto', icon: 'CA', desc: 'Recuperation de vehicules, pieces usagees, recyclage - service ecologique et rapide.', items: ['Achat vehicules accidentes', 'Pieces usagees certifiees', 'Recyclage ecologique', 'Enlevement gratuit'], count: 9 },
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
    navigate(`/providers?cat=${encodeURIComponent(categoryId)}`)
  }

  const filtered = SERVICES.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.desc.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', fontFamily: 'var(--font)' }}>

      <NavBar activePage="services" />

      {/* HERO */}
      <div style={{ background: 'linear-gradient(135deg, rgba(8,19,37,.92) 0%, rgba(16,37,73,.9) 52%, rgba(34,67,162,.88) 100%), url(/nav-services.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', color: '#fff', padding: '48px 32px 36px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,.14), transparent 68%)', top: -160, right: -90, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', width: 280, height: 280, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,159,216,.16), transparent 70%)', bottom: -120, left: -60, pointerEvents: 'none' }} />
        <div style={{ maxWidth: 1320, margin: '0 auto', display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(320px, .8fr)', gap: 28, alignItems: 'stretch' }}>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 999, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.10)', fontSize: 11, letterSpacing: 1.8, textTransform: 'uppercase', color: '#8fd0ff', marginBottom: 18, fontWeight: 700 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b9fd8', boxShadow: '0 0 0 6px rgba(59,159,216,.14)' }} />
              Nos services
            </div>
            <h1 style={{ fontSize: 'clamp(40px, 6vw, 64px)', fontWeight: 800, margin: '0 0 18px', lineHeight: 1.02, fontFamily: 'var(--display)', letterSpacing: '-1.8px', maxWidth: 700 }}>
              Tous les services auto
              <br />
              <span style={{ color: '#55b7ff' }}>au meme endroit</span>
            </h1>
            <p style={{ color: 'rgba(255,255,255,0.72)', fontSize: 17, maxWidth: 640, margin: '0 0 26px', lineHeight: 1.75 }}>
              Comparez mecanique, pneus, detailing, remorquage, carrosserie et FlashFix depuis un seul hub. FlashMat vous aide a trouver le bon service plus vite, avec des fournisseurs verifies a Montreal.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20 }}>
              <button
                type="button"
                onClick={() => {
                  const firstService = filtered[0]
                  if (!firstService) return
                  if (firstService.id === 'flashfix') { openFlashFix(); return }
                  goToFilteredSearch(firstService.id)
                }}
                style={{ padding: '13px 18px', borderRadius: 12, border: 'none', background: '#fff', color: '#133453', fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: 'var(--font)' }}
              >
                Explorer les services
              </button>
              <button
                type="button"
                onClick={openFlashFix}
                style={{ padding: '13px 18px', borderRadius: 12, border: '1px solid rgba(255,255,255,.16)', background: 'rgba(255,255,255,.08)', color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: 'var(--font)' }}
              >
                Ouvrir FlashFix Urgence
              </button>
            </div>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {['Mecanique', 'Pneus', 'Lavage', 'Carrosserie', 'Remorquage'].map((item) => (
                <span key={item} style={{ padding: '8px 12px', borderRadius: 999, background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.08)', fontSize: 12, color: 'rgba(255,255,255,.86)' }}>
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div style={{ position: 'relative', zIndex: 1, display: 'grid', gap: 14 }}>
            <div style={{ background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.10)', borderRadius: 24, padding: 18, backdropFilter: 'blur(10px)', boxShadow: '0 22px 50px rgba(6, 13, 28, 0.26)' }}>
              <div style={{ fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase', color: '#9bd5ff', marginBottom: 10, fontWeight: 700 }}>Recherche rapide</div>
              <div style={{ maxWidth: '100%' }}>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Rechercher un service..."
                  style={{ width: '100%', padding: '14px 18px', borderRadius: 14, border: '1px solid rgba(255,255,255,.1)', background: '#fff', fontSize: 15, outline: 'none', boxSizing: 'border-box', fontFamily: 'var(--font)' }}
                />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, marginTop: 14 }}>
                {[
                  ['11', 'Types de services'],
                  ['200+', 'Fournisseurs verifies'],
                  ['4.7', 'Note moyenne'],
                  ['24/7', 'Urgence FlashFix'],
                ].map(([value, label]) => (
                  <div key={label} style={{ background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 16, padding: '12px 14px' }}>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', fontFamily: 'var(--display)', marginBottom: 2 }}>{value}</div>
                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,.66)', letterSpacing: 1.1, textTransform: 'uppercase' }}>{label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: 'linear-gradient(135deg, rgba(255,255,255,.12), rgba(255,255,255,.04))', border: '1px solid rgba(255,255,255,.10)', borderRadius: 24, padding: 18, display: 'grid', gap: 10 }}>
              <div style={{ fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase', color: '#9bd5ff', fontWeight: 700 }}>En ce moment</div>
              <div style={{ fontFamily: 'var(--display)', fontSize: 26, fontWeight: 800, lineHeight: 1.05 }}>Le bon service avant le mauvais detour.</div>
              <div style={{ fontSize: 13, lineHeight: 1.7, color: 'rgba(255,255,255,.72)' }}>
                Besoin d un diagnostic, d un garage de confiance ou d une intervention urgente ? Commencez ici et passez au bon fournisseur en quelques clics.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* STATS */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 48, padding: '24px 32px', background: 'var(--bg2)', borderBottom: '1px solid var(--border)', flexWrap: 'wrap' }}>
        {[['11', 'Types de services'], ['200+', 'Fournisseurs'], ['4.7', 'Note moyenne'], ['24/7', 'Support urgences']].map(([v, l]) => (
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
                <ServiceIcon code={s.icon} size={58} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink)', marginBottom: 4, fontFamily: 'var(--display)' }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--blue)', fontWeight: 600, fontFamily: 'var(--mono)' }}>{s.count} fournisseurs</div>
                </div>
              </div>
              <p style={{ fontSize: 14, color: 'var(--ink2)', lineHeight: 1.6, margin: '0 0 16px' }}>{s.desc}</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {s.items.map(item => (
                  <li key={item} style={{ fontSize: 12, color: 'var(--ink2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: 'var(--blue)', fontSize: 10, fontWeight: 700 }}>+</span> {item}
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
                Trouver un fournisseur {'->'}
              </button>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--ink3)' }}>
            <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'center' }}><ServiceIcon code="ME" size={56} /></div>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8, fontFamily: 'var(--display)' }}>Aucun service trouve</div>
            <div style={{ fontSize: 14 }}>Essayez un autre mot-cle</div>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <SiteFooter portal="public" />
      <footer style={{ display: 'none', background: '#0a1528', color: 'var(--ink3)', padding: '32px 64px', textAlign: 'center', fontSize: 13, borderTop: '1px solid var(--border)' }}>
        <img src="/logo.jpg" alt="FlashMat" style={{ height: 32, objectFit: 'contain', marginBottom: 16, filter: 'brightness(0) invert(1)' }} />
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap', marginBottom: 16 }}>
          {['A propos', 'Conditions', 'Confidentialite', 'info@flashmat.ca', '514-476-1708'].map(l => (
            <span key={l} style={{ cursor: 'pointer' }}>{l}</span>
          ))}
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>&copy; 2025 FlashMat.ca · Montreal, QC</div>
      </footer>
    </div>
  )
}


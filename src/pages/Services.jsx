import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import NavBar from '../components/NavBar'

const SERVICES = [
  {
    id: 'mechanic',
    name: 'Mécanique générale',
    icon: '🔧',
    desc: 'Vidange, freins, suspension, diagnostic — tout pour garder votre voiture en parfait état.',
    items: ['Vidange d\'huile & filtres', 'Freins & plaquettes', 'Suspension & direction', 'Diagnostic électronique'],
    count: 59,
  },
  {
    id: 'wash',
    name: 'Lave-auto',
    icon: '🚿',
    desc: 'Lavage extérieur, intérieur, détailing complet — redonnez à votre véhicule son éclat d\'origine.',
    items: ['Lavage extérieur complet', 'Nettoyage intérieur', 'Cire & protection', 'Détailing céramique'],
    count: 28,
  },
  {
    id: 'tire',
    name: 'Pneus & jantes',
    icon: '🔩',
    desc: 'Installation, équilibrage, permutation — pneus été, hiver et quatre saisons disponibles.',
    items: ['Installation pneus hiver/été', 'Équilibrage & géométrie', 'Permutation saisonnière', 'Réparation crevaison'],
    count: 19,
  },
  {
    id: 'body',
    name: 'Carrosserie',
    icon: '🎨',
    desc: 'Réparation de bosses, peinture, débosselage — votre carrosserie comme neuve.',
    items: ['Débosselage sans peinture', 'Peinture & retouche', 'Réparation pare-chocs', 'Remplacement pièces'],
    count: 15,
  },
  {
    id: 'glass',
    name: 'Vitres auto',
    icon: '🪟',
    desc: 'Remplacement et réparation de pare-brise, vitres latérales et lunettes arrière.',
    items: ['Remplacement pare-brise', 'Réparation fissures', 'Vitres latérales', 'Teintage de vitres'],
    count: 12,
  },
  {
    id: 'tuning',
    name: 'Performance',
    icon: '🏎️',
    desc: 'Reprogrammation moteur, échappement sport, modifications — libérez le potentiel de votre auto.',
    items: ['Reprogrammation ECU', 'Échappement sport', 'Suspension abaissée', 'Admission d\'air froid'],
    count: 10,
  },
  {
    id: 'parts',
    name: 'Pièces auto',
    icon: '⚙️',
    desc: 'Pièces neuves et d\'occasion, toutes marques — livraison rapide à Montréal.',
    items: ['Pièces OEM & aftermarket', 'Commande en ligne', 'Pièces d\'occasion', 'Accessoires & équipements'],
    count: 18,
  },
  {
    id: 'parking',
    name: 'Stationnement',
    icon: '🅿️',
    desc: 'Espaces sécurisés intérieurs et extérieurs, abonnements mensuels disponibles.',
    items: ['Stationnement intérieur', 'Abonnement mensuel', 'Surveillance 24/7', 'Borne de recharge VÉ'],
    count: 22,
  },
  {
    id: 'tow',
    name: 'Remorquage',
    icon: '🚛',
    desc: 'Service d\'urgence 24/7 — remorquage, dépannage, démarrage et assistance routière.',
    items: ['Remorquage 24/7', 'Démarrage à booster', 'Pneu crevé sur route', 'Transport longue distance'],
    count: 17,
  },
  {
    id: 'junk',
    name: 'Casses auto',
    icon: '♻️',
    desc: 'Récupération de véhicules, pièces usagées, recyclage — service écologique et rapide.',
    items: ['Achat véhicules accidentés', 'Pièces usagées certifiées', 'Recyclage écologique', 'Enlèvement gratuit'],
    count: 9,
  },
]

export default function Services() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [active, setActive] = useState(null)

  function goToFilteredSearch(categoryId) {
    window.sessionStorage.setItem('flashmat-pending-service-search', JSON.stringify({
      pane: 'search',
      cat: categoryId,
    }))
    navigate(`/app/client?pane=search&cat=${encodeURIComponent(categoryId)}`)
  }

  const filtered = SERVICES.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.desc.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg, #f8f8f6)', fontFamily: 'var(--sans, sans-serif)' }}>

      {/* NAV réutilisable */}
      <NavBar activePage="services" />

      {/* HERO */}
      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#fff', padding: '64px 32px 48px', textAlign: 'center' }}>
        <div style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: '#22c55e', marginBottom: 12, fontWeight: 600 }}>● Nos services</div>
        <h1 style={{ fontSize: 42, fontWeight: 700, margin: '0 0 16px', lineHeight: 1.2 }}>
          Tous les services auto<br />
          <span style={{ color: '#22c55e' }}>à Montréal</span>
        </h1>
        <p style={{ color: '#94a3b8', fontSize: 16, maxWidth: 520, margin: '0 auto 32px' }}>
          Trouvez le bon professionnel pour chaque besoin de votre véhicule — 200+ fournisseurs vérifiés à Montréal.
        </p>
        <div style={{ maxWidth: 480, margin: '0 auto', position: 'relative' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un service…"
            style={{ width: '100%', padding: '14px 20px', borderRadius: 12, border: 'none', fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
          />
        </div>
      </div>

      {/* STATS */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 48, padding: '24px 32px', background: '#fff', borderBottom: '1px solid #f0f0f0', flexWrap: 'wrap' }}>
        {[['10', 'Types de services'], ['200+', 'Fournisseurs'], ['4.7★', 'Note moyenne'], ['24/7', 'Support urgences']].map(([v, l]) => (
          <div key={l} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a' }}>{v}</div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{l}</div>
          </div>
        ))}
      </div>

      {/* GRID */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '48px 32px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
          {filtered.map(s => (
            <div
              key={s.id}
              onClick={() => setActive(active === s.id ? null : s.id)}
              style={{
                background: '#fff',
                borderRadius: 16,
                padding: 28,
                cursor: 'pointer',
                border: active === s.id ? '2px solid #22c55e' : '2px solid transparent',
                boxShadow: active === s.id ? '0 8px 32px rgba(34,197,94,0.12)' : '0 2px 12px rgba(0,0,0,0.06)',
                transition: 'all 0.2s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
                <div style={{ fontSize: 36, lineHeight: 1 }}>{s.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 17, color: '#1a1a1a', marginBottom: 4 }}>{s.name}</div>
                  <div style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }}>{s.count} fournisseurs</div>
                </div>
              </div>
              <p style={{ fontSize: 14, color: '#666', lineHeight: 1.6, margin: '0 0 16px' }}>{s.desc}</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                {s.items.map(item => (
                  <li key={item} style={{ fontSize: 12, color: '#555', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: '#22c55e', fontSize: 10 }}>✓</span> {item}
                  </li>
                ))}
              </ul>
              <button
                onClick={e => {
                  e.stopPropagation()
                  goToFilteredSearch(s.id)
                }}
                style={{ width: '100%', padding: '10px', borderRadius: 8, border: 'none', background: active === s.id ? '#22c55e' : '#f0fdf4', color: active === s.id ? '#fff' : '#16a34a', fontWeight: 600, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s' }}
              >
                Trouver un fournisseur →
              </button>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#888' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
            <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Aucun service trouvé</div>
            <div style={{ fontSize: 14 }}>Essayez un autre mot-clé</div>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <footer style={{ background: '#0f172a', color: '#94a3b8', padding: '32px', textAlign: 'center', fontSize: 13 }}>
        <img src="/logo.jpg" alt="FlashMat" style={{ height: 32, objectFit: 'contain', marginBottom: 16, filter: 'brightness(0) invert(1)' }} />
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, flexWrap: 'wrap', marginBottom: 16 }}>
          {['À propos', 'Conditions', 'Confidentialité', 'info@flashmat.ca', '514-476-1708'].map(l => (
            <span key={l} style={{ cursor: 'pointer' }}>{l}</span>
          ))}
        </div>
        <div style={{ fontSize: 11, color: '#475569' }}>© 2025 FlashMat.ca · Montréal, QC</div>
      </footer>
    </div>
  )
}

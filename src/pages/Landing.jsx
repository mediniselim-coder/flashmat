import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './Landing.module.css'

const SERVICES = [
  { id: 'mechanic', name: 'Mécanique',    icon: '🔧', count: 59 },
  { id: 'wash',     name: 'Lave-auto',    icon: '🚿', count: 28 },
  { id: 'tire',     name: 'Pneus',        icon: '🔩', count: 19 },
  { id: 'body',     name: 'Carrosserie',  icon: '🎨', count: 15 },
  { id: 'glass',    name: 'Vitres auto',  icon: '🪟', count: 12 },
  { id: 'tuning',   name: 'Performance',  icon: '🏎️', count: 10 },
  { id: 'parts',    name: 'Pièces auto',  icon: '⚙️', count: 18 },
  { id: 'parking',  name: 'Stationnement',icon: '🅿️', count: 22 },
  { id: 'tow',      name: 'Remorquage',   icon: '🚛', count: 17 },
  { id: 'junk',     name: 'Casses auto',  icon: '♻️', count:  9 },
]

const TICKER = [
  'Garage Los Santos — 20% sur vidange ce mois',
  'Dubé Pneu — Pneus hiver dès $64.99/unité',
  'CS Lave Auto Décarie — Lavage complet $39 ce weekend',
  'JA Automobile — Freins $149, alignement offert',
  'Lave-Auto 365 — Abonnement mensuel illimité $59',
  'Speedy Glass — Répare le pare-brise sans franchise',
  "Remorquage Elite — Dès $79 n'importe où MTL",
]

const PROVIDERS = [
  { name: 'Garage Los Santos',     slug: 'garage-los-santos',        icon: '🔧', type: 'Mécanique',   rating: 4.8, reviews: 312, open: true,  dist: '0.8km' },
  { name: 'CS Lave Auto Décarie',  slug: 'cs-lave-auto-decarie',     icon: '🚿', type: 'Lave-auto',   rating: 4.8, reviews: 198, open: true,  dist: '1.2km' },
  { name: 'Dubé Pneu et Mécan.',   slug: 'dube-pneu-et-mecan',       icon: '🔩', type: 'Pneus',       rating: 4.3, reviews: 256, open: true,  dist: '2.1km' },
  { name: 'Garage Méca. MK',       slug: 'garage-meca-mk',           icon: '🔧', type: 'Mécanique',   rating: 4.9, reviews: 145, open: false, dist: '1.8km' },
  { name: 'Remorquage Elite 24/7', slug: 'remorquage-elite-24-7',    icon: '🚛', type: 'Remorquage',  rating: 4.6, reviews: 432, open: true,  dist: 'Mobile' },
  { name: 'Lave-Auto 365',         slug: 'lave-auto-365',            icon: '🚿', type: 'Lave-auto',   rating: 4.8, reviews: 210, open: true,  dist: '2.4km' },
  { name: 'JA Automobile',         slug: 'ja-automobile',            icon: '🔧', type: 'Mécanique',   rating: 4.8, reviews:  89, open: true,  dist: '3.2km' },
  { name: 'Speedy Glass Montréal', slug: 'speedy-glass-montreal',    icon: '🪟', type: 'Vitres auto', rating: 4.5, reviews: 521, open: true,  dist: '1.5km' },
]

const TABS = [
  { key: 'plaque',      label: '🔍 Par plaque QC',  ph: 'Ex: AAB 1234 — Honda Civic…' },
  { key: 'service',     label: '🔧 Par service',     ph: 'Ex: mécanique, lave-auto, pneus…' },
  { key: 'quartier',    label: '📍 Par quartier',    ph: 'Ex: Plateau, NDG, Rosemont, CDN…' },
  { key: 'fournisseur', label: '🏪 Fournisseur',     ph: 'Ex: Garage Los Santos, CS Lave Auto…' },
]

export default function Landing() {
  const navigate = useNavigate()
  const [tab, setTab]           = useState('plaque')
  const [query, setQuery]       = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [filterTerm, setFilterTerm] = useState('')

  const activeTab = TABS.find(t => t.key === tab)

  function handleSearch(e) {
    e.preventDefault()
    setFilterTerm(query.toLowerCase())
    setTimeout(() => document.getElementById('providers')?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  function quickSearch(term) {
    setFilterTerm(term.toLowerCase())
    setTimeout(() => document.getElementById('providers')?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  const filteredProviders = filterTerm
    ? PROVIDERS.filter(p => p.type.toLowerCase().includes(filterTerm) || p.name.toLowerCase().includes(filterTerm))
    : PROVIDERS

  return (
    <div className={styles.page}>
      <div className={styles.glow} />

      {/* NAV */}
      <nav className={styles.nav}>
        <div className={styles.logo} onClick={() => navigate('/')}>
          <img src="/logo.jpg" alt="FlashMat" style={{ height: 40, objectFit: 'contain' }} />
        </div>
        <div className={styles.navLinks}>
          <span onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}>Services</span>
          <span onClick={() => document.getElementById('providers')?.scrollIntoView({ behavior: 'smooth' })}>Fournisseurs</span>
          <span onClick={() => navigate('/app/marketplace')}>Marketplace</span>
          <span onClick={() => document.getElementById('portals')?.scrollIntoView({ behavior: 'smooth' })}>Rejoindre</span>
        </div>
        <div className={styles.navRight}>
          <button className="btn btn-outline" onClick={() => navigate('/auth?role=provider')}>Espace Fournisseur</button>
          <button className="btn btn-green" onClick={() => navigate('/auth')}>Connexion / S'inscrire</button>
        </div>
        <button className={styles.hamburger} onClick={() => setMenuOpen(true)}>☰</button>
      </nav>

      {/* MOBILE MENU */}
      {menuOpen && (
        <div className={styles.mobileMenuOverlay} onClick={() => setMenuOpen(false)}>
          <div className={styles.mobileMenu} onClick={e => e.stopPropagation()}>
            <img src="/logo.jpg" alt="FlashMat" style={{ height: 36, objectFit: 'contain', marginBottom: 8 }} />
            <button className="btn btn-green btn-lg" style={{ width: '100%' }} onClick={() => { navigate('/auth'); setMenuOpen(false) }}>🚗 Portail Client — Se connecter</button>
            <button className="btn btn-outline btn-lg" style={{ width: '100%' }} onClick={() => { navigate('/auth?role=provider'); setMenuOpen(false) }}>🏪 Portail Fournisseur</button>
            <button className={styles.mobileMenuItem} onClick={() => { document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' }); setMenuOpen(false) }}>🔧 Nos services</button>
            <button className={styles.mobileMenuItem} onClick={() => { document.getElementById('providers')?.scrollIntoView({ behavior: 'smooth' }); setMenuOpen(false) }}>⭐ Fournisseurs vedettes</button>
            <button className={styles.mobileMenuItem} onClick={() => { navigate('/app/marketplace'); setMenuOpen(false) }}>🛒 Marketplace</button>
            <button onClick={() => setMenuOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--ink3)', fontSize: 13, marginTop: 4, cursor: 'pointer' }}>Fermer ✕</button>
          </div>
        </div>
      )}

      {/* HERO */}
      <section className={styles.hero}>
        <div className={styles.heroBadge}>
          <span className={styles.badgeDot} />
          The MarketPlace for Auto Tech · Montréal · 200+ Fournisseurs
        </div>
        <h1 className={styles.h1}>
          Le Hub<br />
          <span className={styles.outline}>Auto</span> de<br />
          <span className={styles.accent}>Montréal</span>
        </h1>
        <p className={styles.sub}>
          Réservez, suivez, achetez — tout ce dont votre voiture a besoin à Montréal, en un seul endroit.
          Recherche par immatriculation, FlashScore™, alertes intelligentes.
        </p>
        <div className={styles.searchWrap}>
          <div className={styles.searchTabs}>
            {TABS.map(t => (
              <button key={t.key} className={`${styles.sTab} ${tab === t.key ? styles.sTabActive : ''}`} onClick={() => setTab(t.key)}>
                {t.label}
              </button>
            ))}
          </div>
          <form className={styles.searchBox} onSubmit={handleSearch}>
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder={activeTab.ph} className={styles.searchInput} />
            <button type="submit" className={styles.searchBtn}>Rechercher →</button>
          </form>
        </div>
        <div className={styles.chips}>
          {['🔧 Mécanique', '🚿 Lave-auto', '🔩 Pneus', '🚛 Remorquage 24/7', '🪟 Vitres', '🎨 Carrosserie', '♻️ Casse auto'].map(c => (
            <button key={c} className={styles.chip} onClick={() => quickSearch(c.split(' ').slice(1).join(' '))}>{c}</button>
          ))}
        </div>
      </section>

      {/* STATS BAND */}
      <div className={styles.statsBand}>
        {[['200+', 'Fournisseurs MTL'], ['14k', 'Clients actifs'], ['4.7★', 'Note moyenne'], ['10', 'Types de services'], ['24h', 'Support & urgences']].map(([v, l]) => (
          <div key={l} className={styles.sbi}>
            <div className={styles.sbiVal}>{v}</div>
            <div className={styles.sbiLabel}>{l}</div>
          </div>
        ))}
      </div>

      {/* TICKER */}
      <div className={styles.ticker}>
        <div className={styles.tickerTrack}>
          {[...TICKER, ...TICKER].map((t, i) => (
            <span key={i} className={styles.tickerItem}><strong className={styles.tickerSep}>⚡</strong> {t}</span>
          ))}
        </div>
      </div>

      {/* SERVICES */}
      <section className={styles.section} id="services">
        <div className={styles.eyebrow}>● Nos services</div>
        <h2 className={styles.sectionTitle}>Tout ce dont votre auto<br />a besoin à <span>Montréal</span></h2>
        <div className={styles.svcGrid}>
          {SERVICES.map(s => (
            <div key={s.id} className={styles.svcCard} onClick={() => quickSearch(s.name)}>
              <span className={styles.svcIcon}>{s.icon}</span>
              <div className={styles.svcName}>{s.name}</div>
              <div className={styles.svcCount}>{s.count} {s.id === 'parking' ? 'emplacements' : 'fournisseurs'}</div>
            </div>
          ))}
        </div>
      </section>

      {/* PROVIDERS */}
      <section className={styles.section} id="providers" style={{ paddingTop: 0 }}>
        <div className={styles.eyebrow}>● Fournisseurs vedettes</div>
        <h2 className={styles.sectionTitle}>Les meilleurs pros<br />de <span>Montréal</span></h2>
        {filterTerm && (
          <div style={{ textAlign: 'center', marginBottom: 12, fontSize: 13, color: 'var(--ink2)' }}>
            {filteredProviders.length} résultat{filteredProviders.length !== 1 ? 's' : ''} pour «&nbsp;{filterTerm}&nbsp;»
            <button onClick={() => setFilterTerm('')} style={{ marginLeft: 8, background: 'none', border: 'none', color: 'var(--green)', cursor: 'pointer', fontSize: 12 }}>✕ Effacer</button>
          </div>
        )}
        <div className={styles.provScroll}>
          {filteredProviders.map(p => (
            <div key={p.name} className={styles.provCard} onClick={() => navigate(`/provider/${p.slug}`)}>
              <div className={styles.provAvatar}>{p.icon}</div>
              <div className={styles.provName}>{p.name}</div>
              <div className={styles.provType}>{p.type}</div>
              <div className={styles.provRating}>
                <span style={{ color: 'var(--amber)' }}>{'★'.repeat(Math.round(p.rating))}</span> {p.rating} ({p.reviews})
              </div>
              <span className={`badge ${p.open ? 'badge-green' : 'badge-amber'}`}>{p.open ? '● Ouvert' : '● Fermé'}</span>
              <div style={{ fontSize: 10, color: 'var(--ink3)', fontFamily: 'var(--mono)', marginTop: 4 }}>{p.dist}</div>
            </div>
          ))}
        </div>
      </section>

      {/* PORTALS */}
      <section className={styles.section} id="portals" style={{ paddingTop: 0 }}>
        <div className={styles.eyebrow}>● Rejoindre FlashMat</div>
        <h2 className={styles.sectionTitle}>Choisissez<br />votre <span>rôle</span></h2>
        <div className={styles.portalsGrid}>
          <div className={`${styles.portalCard} ${styles.pcClient}`} onClick={() => navigate('/auth')}>
            <div className={styles.pcNum}>01</div>
            <div className={styles.pcTitle}>Portail Client</div>
            <div className={styles.pcDesc}>Trouvez, réservez et suivez tous vos services auto à Montréal depuis un seul tableau de bord.</div>
            <div className={styles.pcFeats}>
              {[['🔍','Recherche par immatriculation','Historique, rappels manufacturiers'],
                ['📊','FlashScore™','Score santé de votre véhicule en temps réel'],
                ['📅','Réservation instantanée','Agenda live de tous les fournisseurs'],
                ['⚡','Alertes intelligentes','Rappels proactifs, promos, urgences'],
                ['🛒','Marketplace','Achat/vente pièces entre Montréalais'],
              ].map(([ico, t, d]) => (
                <div key={t} className={styles.pcFeat}>
                  <span>{ico}</span>
                  <div><strong>{t}</strong><br /><small>{d}</small></div>
                </div>
              ))}
            </div>
            <button className="btn btn-green btn-lg" onClick={e => { e.stopPropagation(); navigate('/auth') }}>Commencer gratuitement →</button>
          </div>
          <div className={`${styles.portalCard} ${styles.pcProvider}`} onClick={() => navigate('/auth?role=provider')}>
            <div className={styles.pcNum}>02</div>
            <div className={styles.pcTitle}>Portail Fournisseur</div>
            <div className={styles.pcDesc}>Gérez votre atelier, attirez de nouveaux clients et augmentez vos revenus avec FlashMat.</div>
            <div className={styles.pcFeats}>
              {[['📈','Dashboard revenu','Chiffres en temps réel, cibles, tendances'],
                ['📅','Gestion réservations','Calendrier intelligent, file d\'attente'],
                ['📣','Promos ciblées','Offres à vos clients fidèles'],
                ['✅','Notifier les clients','Alerte quand la voiture est prête'],
                ['🏪','Profil public','Visibilité FlashMat + Google'],
              ].map(([ico, t, d]) => (
                <div key={t} className={styles.pcFeat}>
                  <span>{ico}</span>
                  <div><strong>{t}</strong><br /><small>{d}</small></div>
                </div>
              ))}
            </div>
            <button className="btn btn-outline btn-lg" style={{ color: 'var(--blue)', borderColor: 'var(--blue)' }} onClick={e => { e.stopPropagation(); navigate('/auth?role=provider') }}>Inscrire mon atelier →</button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className={styles.footer}>
        <img src="/logo.jpg" alt="FlashMat" style={{ height: 32, objectFit: 'contain' }} />
        <div className={styles.footerLinks}>
          {['À propos', 'Conditions', 'Confidentialité', 'info@flashmat.ca', '514-476-1708'].map(l => (
            <span key={l} className={styles.footerLink}>{l}</span>
          ))}
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink3)', fontFamily: 'var(--mono)' }}>© 2025 FlashMat.ca · Montréal, QC</div>
      </footer>
    </div>
  )
}

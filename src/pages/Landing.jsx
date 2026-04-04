import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import styles from './Landing.module.css'
import NavBar from '../components/NavBar'

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
  { key: 'service',     label: '🔧 Par service',    ph: 'Ex: mécanique, vidange, pneus, carrosserie…' },
  { key: 'quartier',   label: '📍 Par quartier',   ph: 'Ex: Plateau, NDG, Rosemont, Côte-des-Neiges…' },
  { key: 'fournisseur',label: '🏪 Fournisseur',    ph: 'Ex: Garage Los Santos, CS Lave Auto…' },
]

const RATING_FILTERS = [
  { key: 0,   label: 'Tous' },
  { key: 4.0, label: '⭐ 4.0+' },
  { key: 4.5, label: '⭐ 4.5+' },
  { key: 4.8, label: '⭐ 4.8+' },
]

export default function Landing() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [tab, setTab]           = useState('service')
  const [query, setQuery]       = useState('')
  const [filterTerm, setFilterTerm] = useState('')
  const [minRating, setMinRating] = useState(0)
  const [dbProviders, setDbProviders] = useState([])
  const [dbLoading, setDbLoading] = useState(false)

  const activeTab = TABS.find(t => t.key === tab)

  useEffect(() => {
    if (!filterTerm) { setDbProviders([]); return }
    setDbLoading(true)
    supabase
      .from('providers_list')
      .select('*')
      .or(`name.ilike.%${filterTerm}%,type_label.ilike.%${filterTerm}%`)
      .order('rating', { ascending: false })
      .limit(30)
      .then(({ data }) => { setDbProviders(data || []); setDbLoading(false) })
  }, [filterTerm])

  function handleSearch(e) {
    e.preventDefault()
    setFilterTerm(query.toLowerCase())
    setTimeout(() => document.getElementById('providers')?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  function slugify(name) {
    return (name || '').toLowerCase()
      .replace(/[àáâã]/g, 'a').replace(/[éèêë]/g, 'e')
      .replace(/[îï]/g, 'i').replace(/[ôö]/g, 'o')
      .replace(/[ùûü]/g, 'u').replace(/ç/g, 'c')
      .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim()
  }

  const displayProviders = (filterTerm ? dbProviders : PROVIDERS).filter(p => {
    if (minRating === 'open') return p.open === true || p.is_open === true || p.is_open === 'true'
    return (p.rating || 0) >= minRating
  })

  const scrollRef = useRef(null)
  function scrollProviders(dir) {
    scrollRef.current?.scrollBy({ left: dir * 320, behavior: 'smooth' })
  }

  function openVehicleHub() {
    if (user && profile?.role === 'client') {
      navigate('/app/client?pane=vehicles')
      return
    }
    if (user && profile?.role === 'provider') {
      navigate('/app/provider')
      return
    }
    window.sessionStorage.setItem('flashmat-post-login-redirect', '/app/client?pane=vehicles')
    navigate('/?login=1')
  }

  return (
    <div className={styles.page}>

      {/* NAV — composant réutilisable avec popup profil */}
      <NavBar activePage="home" />

      {/* HERO */}
      <section className={styles.hero}>
        <div className={styles.heroOrb1} />
        <div className={styles.heroOrb2} />
        <div className={styles.heroGrid} />
        <div className={styles.heroBadge}>
          <span className={styles.badgeDot} />
          The MarketPlace for Auto Tech · Montréal · 200+ Fournisseurs
        </div>
        <div className={styles.heroCarStage}>
          <div className={styles.heroCarGlow} />
          <div className={styles.heroCarArt} aria-hidden="true">
            <svg viewBox="0 0 860 290" className={styles.heroCarSvg}>
              <defs>
                <linearGradient id="carBody" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#7aa7ff" />
                  <stop offset="100%" stopColor="#20335f" />
                </linearGradient>
              </defs>
              <ellipse cx="430" cy="250" rx="335" ry="10" fill="rgba(37,99,235,.12)" />
              <path d="M102 205 L118 154 C126 129 141 113 171 105 L302 72 C336 49 389 34 465 34 C562 34 639 56 720 117 L770 133 C788 140 803 154 810 169 L821 205 L777 205 C776 166 746 137 706 137 C666 137 636 166 635 205 L302 205 C301 166 271 137 231 137 C191 137 160 166 159 205 Z" fill="url(#carBody)" />
              <path d="M307 80 C340 56 389 45 455 45 C535 45 603 60 671 111 L570 111 C550 84 525 70 487 66 L390 66 C359 66 337 71 307 80 Z" fill="#ffffff" />
              <path d="M375 69 H482 C513 72 533 84 551 111 H351 C358 86 366 75 375 69 Z" fill="#f8fbff" />
              <path d="M561 111 H673 C693 111 708 116 721 127 H579 C571 121 565 116 561 111 Z" fill="#eef5ff" />
              <path d="M178 121 C199 102 223 92 265 88 L236 127 Z" fill="#ffffff" />
              <circle cx="232" cy="203" r="47" fill="#273144" />
              <circle cx="232" cy="203" r="33" fill="none" stroke="#ffffff" strokeWidth="3" opacity=".95" />
              <circle cx="707" cy="203" r="47" fill="#273144" />
              <circle cx="707" cy="203" r="33" fill="none" stroke="#ffffff" strokeWidth="3" opacity=".95" />
              <circle cx="232" cy="203" r="6" fill="#dfe8ff" />
              <circle cx="707" cy="203" r="6" fill="#dfe8ff" />
              <g stroke="#ffffff" strokeWidth="2" opacity=".95">
                <path d="M232 170 V236" />
                <path d="M199 203 H265" />
                <path d="M209 181 L255 225" />
                <path d="M255 181 L209 225" />
                <path d="M707 170 V236" />
                <path d="M674 203 H740" />
                <path d="M684 181 L730 225" />
                <path d="M730 181 L684 225" />
              </g>
            </svg>
          </div>
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
        <button className={styles.vehicleAdder} onClick={openVehicleHub}>
          <span className={styles.vehicleAdderText}>Ajouter votre voiture...</span>
          <span className={styles.vehicleAdderPlus}>+</span>
        </button>
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
          {[['🔧 Mécanique','mechanic'],['🚿 Lave-auto','wash'],['🔩 Pneus','tire'],['🚛 Remorquage 24/7','tow'],['🪟 Vitres','glass'],['🎨 Carrosserie','body'],['♻️ Casse auto','junk']].map(([label, cat]) => (
            <button key={cat} className={styles.chip} onClick={() => navigate('/app/client', { state: { pane: 'search', searchCat: cat } })}>{label}</button>
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
            <div key={s.id} className={styles.svcCard} onClick={() => navigate('/services', { state: { cat: s.id } })}>
              <span className={styles.svcIcon}>{s.icon}</span>
              <div className={styles.svcName}>{s.name}</div>
              <div className={styles.svcCount}>{s.count} {s.id === 'parking' ? 'emplacements' : 'fournisseurs'}</div>
              <span className={styles.svcArrow}>→</span>
            </div>
          ))}
        </div>
      </section>

      {/* PROVIDERS */}
      <section className={styles.section} id="providers" style={{ paddingTop: 0 }}>
        <div className={styles.eyebrow}>● Fournisseurs vedettes</div>
        <h2 className={styles.sectionTitle}>Les meilleurs pros<br />de <span>Montréal</span></h2>
        <div className={styles.provFilters}>
          {RATING_FILTERS.map(f => (
            <button key={f.key} className={`${styles.filterBtn} ${minRating === f.key ? styles.filterBtnActive : ''}`} onClick={() => setMinRating(f.key)}>{f.label}</button>
          ))}
          <button className={`${styles.filterBtn} ${minRating === 'open' ? styles.filterBtnActive : ''}`} onClick={() => setMinRating(minRating === 'open' ? 0 : 'open')}>● Ouvert</button>
          {filterTerm && (
            <span style={{ fontSize: 12, color: 'var(--ink3)', marginLeft: 4 }}>
              {dbLoading ? 'Recherche…' : `${displayProviders.length} résultat${displayProviders.length !== 1 ? 's' : ''} pour «\u00a0${filterTerm}\u00a0»`}
              <button onClick={() => setFilterTerm('')} style={{ marginLeft: 8, background: 'none', border: 'none', color: 'var(--green)', cursor: 'pointer', fontSize: 12 }}>✕</button>
            </span>
          )}
        </div>
        <div style={{ position: 'relative' }}>
          <button onClick={() => scrollProviders(-1)} style={{ position: 'absolute', left: -16, top: '50%', transform: 'translateY(-50%)', zIndex: 2, background: '#fff', border: '1px solid var(--border)', borderRadius: '50%', width: 36, height: 36, fontSize: 16, cursor: 'pointer', boxShadow: 'var(--shadow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
          <button onClick={() => scrollProviders(1)} style={{ position: 'absolute', right: -16, top: '50%', transform: 'translateY(-50%)', zIndex: 2, background: '#fff', border: '1px solid var(--border)', borderRadius: '50%', width: 36, height: 36, fontSize: 16, cursor: 'pointer', boxShadow: 'var(--shadow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
          <div className={styles.provScroll} ref={scrollRef}>
            {dbLoading && filterTerm && (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink3)', fontFamily: 'var(--mono)', fontSize: 12 }}>Chargement…</div>
            )}
            {!dbLoading && displayProviders.map(p => {
              const isDb = !!p.type_label
              const slug = isDb ? slugify(p.name) : p.slug
              const icon = p.icon || '🔧'
              const type = isDb ? p.type_label : p.type
              const rating = p.rating || 0
              const reviews = p.reviews || 0
              const isOpen = isDb ? (p.is_open === true || p.is_open === 'true') : p.open
              return (
                <div key={p.id || p.name} className={styles.provCard} onClick={() => navigate(`/provider/${slug}${isDb ? `?n=${encodeURIComponent(p.name)}` : ''}`)}>
                  <div className={styles.provAvatar}>{icon}</div>
                  <div className={styles.provName}>{p.name}</div>
                  <div className={styles.provType}>{type}</div>
                  <div className={styles.provRating}>
                    <span style={{ color: 'var(--amber)' }}>{'★'.repeat(Math.round(rating))}</span> {rating} ({reviews})
                  </div>
                  <span className={`badge ${isOpen ? 'badge-green' : 'badge-amber'}`}>{isOpen ? '● Ouvert' : '● Fermé'}</span>
                  {!isDb && <div style={{ fontSize: 10, color: 'var(--ink3)', fontFamily: 'var(--mono)', marginTop: 4 }}>{p.dist}</div>}
                  {isDb && p.address && <div style={{ fontSize: 10, color: 'var(--ink3)', fontFamily: 'var(--mono)', marginTop: 4 }}>{p.address}</div>}
                </div>
              )
            })}
          </div>
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

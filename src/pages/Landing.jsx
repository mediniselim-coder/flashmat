import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import styles from './Landing.module.css'
import NavBar from '../components/NavBar'

const SERVICES = [
  { id: 'mechanic', name: 'MÃ©canique',    icon: 'ðŸ”§', count: 59 },
  { id: 'wash',     name: 'Lave-auto',    icon: 'ðŸš¿', count: 28 },
  { id: 'tire',     name: 'Pneus',        icon: 'ðŸ”©', count: 19 },
  { id: 'body',     name: 'Carrosserie',  icon: 'ðŸŽ¨', count: 15 },
  { id: 'glass',    name: 'Vitres auto',  icon: 'ðŸªŸ', count: 12 },
  { id: 'tuning',   name: 'Performance',  icon: 'ðŸŽï¸', count: 10 },
  { id: 'parts',    name: 'PiÃ¨ces auto',  icon: 'âš™ï¸', count: 18 },
  { id: 'parking',  name: 'Stationnement',icon: 'ðŸ…¿ï¸', count: 22 },
  { id: 'tow',      name: 'Remorquage',   icon: 'ðŸš›', count: 17 },
  { id: 'junk',     name: 'Casses auto',  icon: 'â™»ï¸', count:  9 },
]

const TICKER = [
  'Garage Los Santos â€” 20% sur vidange ce mois',
  'DubÃ© Pneu â€” Pneus hiver dÃ¨s $64.99/unitÃ©',
  'CS Lave Auto DÃ©carie â€” Lavage complet $39 ce weekend',
  'JA Automobile â€” Freins $149, alignement offert',
  'Lave-Auto 365 â€” Abonnement mensuel illimitÃ© $59',
  'Speedy Glass â€” RÃ©pare le pare-brise sans franchise',
  "Remorquage Elite â€” DÃ¨s $79 n'importe oÃ¹ MTL",
]

const PROVIDERS = [
  { name: 'Garage Los Santos',     slug: 'garage-los-santos',        icon: 'ðŸ”§', type: 'MÃ©canique',   rating: 4.8, reviews: 312, open: true,  dist: '0.8km' },
  { name: 'CS Lave Auto DÃ©carie',  slug: 'cs-lave-auto-decarie',     icon: 'ðŸš¿', type: 'Lave-auto',   rating: 4.8, reviews: 198, open: true,  dist: '1.2km' },
  { name: 'DubÃ© Pneu et MÃ©can.',   slug: 'dube-pneu-et-mecan',       icon: 'ðŸ”©', type: 'Pneus',       rating: 4.3, reviews: 256, open: true,  dist: '2.1km' },
  { name: 'Garage MÃ©ca. MK',       slug: 'garage-meca-mk',           icon: 'ðŸ”§', type: 'MÃ©canique',   rating: 4.9, reviews: 145, open: false, dist: '1.8km' },
  { name: 'Remorquage Elite 24/7', slug: 'remorquage-elite-24-7',    icon: 'ðŸš›', type: 'Remorquage',  rating: 4.6, reviews: 432, open: true,  dist: 'Mobile' },
  { name: 'Lave-Auto 365',         slug: 'lave-auto-365',            icon: 'ðŸš¿', type: 'Lave-auto',   rating: 4.8, reviews: 210, open: true,  dist: '2.4km' },
  { name: 'JA Automobile',         slug: 'ja-automobile',            icon: 'ðŸ”§', type: 'MÃ©canique',   rating: 4.8, reviews:  89, open: true,  dist: '3.2km' },
  { name: 'Speedy Glass MontrÃ©al', slug: 'speedy-glass-montreal',    icon: 'ðŸªŸ', type: 'Vitres auto', rating: 4.5, reviews: 521, open: true,  dist: '1.5km' },
]

const TABS = [
  { key: 'service',     label: 'ðŸ”§ Par service',    ph: 'Ex: mÃ©canique, vidange, pneus, carrosserieâ€¦' },
  { key: 'quartier',    label: 'ðŸ“ Par quartier',   ph: 'Ex: Plateau, NDG, Rosemont, CÃ´te-des-Neigesâ€¦' },
  { key: 'fournisseur', label: 'ðŸª Fournisseur',    ph: 'Ex: Garage Los Santos, CS Lave Autoâ€¦' },
]

const RATING_FILTERS = [
  { key: 0,   label: 'Tous' },
  { key: 4.0, label: 'â­ 4.0+' },
  { key: 4.5, label: 'â­ 4.5+' },
  { key: 4.8, label: 'â­ 4.8+' },
]

export default function Landing() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [tab, setTab] = useState('service')
  const [query, setQuery] = useState('')
  const [filterTerm, setFilterTerm] = useState('')
  const [minRating, setMinRating] = useState(0)
  const [dbProviders, setDbProviders] = useState([])
  const [dbLoading, setDbLoading] = useState(false)

  const activeTab = TABS.find(t => t.key === tab)
  const isClientLoggedIn = Boolean(user && profile?.role === 'client')
  const isProviderLoggedIn = Boolean(user && profile?.role === 'provider')

  function goToSearch({ q = '', selectedTab = 'service', cat = '' } = {}) {
    if (isClientLoggedIn) {
      const params = new URLSearchParams({ pane: 'search' })
      if (q) params.set('q', q)
      if (selectedTab) params.set('tab', selectedTab)
      if (cat) params.set('cat', cat)
      navigate(`/app/client?${params.toString()}`)
      return
    }

    if (isProviderLoggedIn) {
      navigate('/app/provider')
      return
    }

    navigate('/auth')
  }

  useEffect(() => {
    if (!filterTerm) {
      setDbProviders([])
      return
    }

    setDbLoading(true)
    supabase
      .from('providers_list')
      .select('*')
      .or(`name.ilike.%${filterTerm}%,type_label.ilike.%${filterTerm}%`)
      .order('rating', { ascending: false })
      .limit(30)
      .then(({ data }) => {
        setDbProviders(data || [])
        setDbLoading(false)
      })
  }, [filterTerm])

  function handleSearch(e) {
    e.preventDefault()
    const selectedService = SERVICES.find(service => service.name.toLowerCase() === query.trim().toLowerCase())

    if (isClientLoggedIn) {
      goToSearch({ q: query, selectedTab: tab, cat: selectedService?.id || '' })
      return
    }

    setFilterTerm(query.toLowerCase())
    setTimeout(() => document.getElementById('providers')?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  function quickSearch(term, cat = '') {
    if (isClientLoggedIn) {
      goToSearch({ q: term, selectedTab: 'service', cat })
      return
    }

    navigate('/services', { state: { cat } })
  }

  function slugify(name) {
    return (name || '').toLowerCase()
      .replace(/[Ã Ã¡Ã¢Ã£]/g, 'a').replace(/[Ã©Ã¨ÃªÃ«]/g, 'e')
      .replace(/[Ã®Ã¯]/g, 'i').replace(/[Ã´Ã¶]/g, 'o')
      .replace(/[Ã¹Ã»Ã¼]/g, 'u').replace(/Ã§/g, 'c')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  const displayProviders = (filterTerm ? dbProviders : PROVIDERS).filter(p => {
    if (minRating === 'open') return p.open === true || p.is_open === true || p.is_open === 'true'
    return (p.rating || 0) >= minRating
  })

  const scrollRef = useRef(null)
  function scrollProviders(dir) {
    scrollRef.current?.scrollBy({ left: dir * 320, behavior: 'smooth' })
  }

  return (
    <div className={styles.page}>
      <NavBar activePage="home" />

      <section className={styles.hero}>
        <div className={styles.heroOrb1} />
        <div className={styles.heroOrb2} />
        <div className={styles.heroGrid} />
        <div className={styles.heroBadge}>
          <span className={styles.badgeDot} />
          The MarketPlace for Auto Tech Â· MontrÃ©al Â· 200+ Fournisseurs
        </div>
        <h1 className={styles.h1}>
          Le Hub<br />
          <span className={styles.outline}>Auto</span> de<br />
          <span className={styles.accent}>MontrÃ©al</span>
        </h1>
        <p className={styles.sub}>
          RÃ©servez, suivez, achetez â€” tout ce dont votre voiture a besoin Ã  MontrÃ©al, en un seul endroit.
          Recherche par immatriculation, FlashScoreâ„¢, alertes intelligentes.
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
            <button type="submit" className={styles.searchBtn}>Rechercher â†’</button>
          </form>
        </div>
        <div className={styles.chips}>
          {[['ðŸ”§ MÃ©canique', 'mechanic'], ['ðŸš¿ Lave-auto', 'wash'], ['ðŸ”© Pneus', 'tire'], ['ðŸš› Remorquage 24/7', 'tow'], ['ðŸªŸ Vitres', 'glass'], ['ðŸŽ¨ Carrosserie', 'body'], ['â™»ï¸ Casse auto', 'junk']].map(([label, cat]) => (
            <button key={cat} className={styles.chip} onClick={() => quickSearch(label.split(' ').slice(1).join(' '), cat)}>
              {label}
            </button>
          ))}
        </div>
      </section>

      <div className={styles.statsBand}>
        {[['200+', 'Fournisseurs MTL'], ['14k', 'Clients actifs'], ['4.7â˜…', 'Note moyenne'], ['10', 'Types de services'], ['24h', 'Support & urgences']].map(([v, l]) => (
          <div key={l} className={styles.sbi}>
            <div className={styles.sbiVal}>{v}</div>
            <div className={styles.sbiLabel}>{l}</div>
          </div>
        ))}
      </div>

      <div className={styles.ticker}>
        <div className={styles.tickerTrack}>
          {[...TICKER, ...TICKER].map((t, i) => (
            <span key={i} className={styles.tickerItem}><strong className={styles.tickerSep}>âš¡</strong> {t}</span>
          ))}
        </div>
      </div>

      <section className={styles.section} id="services">
        <div className={styles.eyebrow}>â— Nos services</div>
        <h2 className={styles.sectionTitle}>Tout ce dont votre auto<br />a besoin Ã  <span>MontrÃ©al</span></h2>
        <div className={styles.svcGrid}>
          {SERVICES.map(s => (
            <div key={s.id} className={styles.svcCard} onClick={() => quickSearch(s.name, s.id)}>
              <span className={styles.svcIcon}>{s.icon}</span>
              <div className={styles.svcName}>{s.name}</div>
              <div className={styles.svcCount}>{s.count} {s.id === 'parking' ? 'emplacements' : 'fournisseurs'}</div>
              <span className={styles.svcArrow}>â†’</span>
            </div>
          ))}
        </div>
      </section>

      <section className={styles.section} id="providers" style={{ paddingTop: 0 }}>
        <div className={styles.eyebrow}>â— Fournisseurs vedettes</div>
        <h2 className={styles.sectionTitle}>Les meilleurs pros<br />de <span>MontrÃ©al</span></h2>
        <div className={styles.provFilters}>
          {RATING_FILTERS.map(f => (
            <button key={f.key} className={`${styles.filterBtn} ${minRating === f.key ? styles.filterBtnActive : ''}`} onClick={() => setMinRating(f.key)}>{f.label}</button>
          ))}
          <button className={`${styles.filterBtn} ${minRating === 'open' ? styles.filterBtnActive : ''}`} onClick={() => setMinRating(minRating === 'open' ? 0 : 'open')}>â— Ouvert</button>
          {filterTerm && (
            <span style={{ fontSize: 12, color: 'var(--ink3)', marginLeft: 4 }}>
              {dbLoading ? 'Rechercheâ€¦' : `${displayProviders.length} rÃ©sultat${displayProviders.length !== 1 ? 's' : ''} pour Â«\u00a0${filterTerm}\u00a0Â»`}
              <button onClick={() => setFilterTerm('')} style={{ marginLeft: 8, background: 'none', border: 'none', color: 'var(--green)', cursor: 'pointer', fontSize: 12 }}>âœ•</button>
            </span>
          )}
        </div>
        <div style={{ position: 'relative' }}>
          <button onClick={() => scrollProviders(-1)} style={{ position: 'absolute', left: -16, top: '50%', transform: 'translateY(-50%)', zIndex: 2, background: '#fff', border: '1px solid var(--border)', borderRadius: '50%', width: 36, height: 36, fontSize: 16, cursor: 'pointer', boxShadow: 'var(--shadow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>â€¹</button>
          <button onClick={() => scrollProviders(1)} style={{ position: 'absolute', right: -16, top: '50%', transform: 'translateY(-50%)', zIndex: 2, background: '#fff', border: '1px solid var(--border)', borderRadius: '50%', width: 36, height: 36, fontSize: 16, cursor: 'pointer', boxShadow: 'var(--shadow)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>â€º</button>
          <div className={styles.provScroll} ref={scrollRef}>
            {dbLoading && filterTerm && (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--ink3)', fontFamily: 'var(--mono)', fontSize: 12 }}>Chargementâ€¦</div>
            )}
            {!dbLoading && displayProviders.map(p => {
              const isDb = !!p.type_label
              const slug = isDb ? slugify(p.name) : p.slug
              const icon = p.icon || 'ðŸ”§'
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
                    <span style={{ color: 'var(--amber)' }}>{'â˜…'.repeat(Math.round(rating))}</span> {rating} ({reviews})
                  </div>
                  <span className={`badge ${isOpen ? 'badge-green' : 'badge-amber'}`}>{isOpen ? 'â— Ouvert' : 'â— FermÃ©'}</span>
                  {!isDb && <div style={{ fontSize: 10, color: 'var(--ink3)', fontFamily: 'var(--mono)', marginTop: 4 }}>{p.dist}</div>}
                  {isDb && p.address && <div style={{ fontSize: 10, color: 'var(--ink3)', fontFamily: 'var(--mono)', marginTop: 4 }}>{p.address}</div>}
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className={styles.section} id="portals" style={{ paddingTop: 0 }}>
        <div className={styles.eyebrow}>â— Rejoindre FlashMat</div>
        <h2 className={styles.sectionTitle}>Choisissez<br />votre <span>rÃ´le</span></h2>
        <div className={styles.portalsGrid}>
          {!isClientLoggedIn && (
            <div className={`${styles.portalCard} ${styles.pcClient}`} onClick={() => navigate('/auth')}>
              <div className={styles.pcNum}>01</div>
              <div className={styles.pcTitle}>Portail Client</div>
              <div className={styles.pcDesc}>Trouvez, rÃ©servez et suivez tous vos services auto Ã  MontrÃ©al depuis un seul tableau de bord.</div>
              <div className={styles.pcFeats}>
                {[['ðŸ”', 'Recherche par immatriculation', 'Historique, rappels manufacturiers'], ['ðŸ“Š', 'FlashScoreâ„¢', 'Score santÃ© de votre vÃ©hicule en temps rÃ©el'], ['ðŸ“…', 'RÃ©servation instantanÃ©e', 'Agenda live de tous les fournisseurs'], ['âš¡', 'Alertes intelligentes', 'Rappels proactifs, promos, urgences'], ['ðŸ›’', 'Marketplace', 'Achat/vente piÃ¨ces entre MontrÃ©alais']].map(([ico, t, d]) => (
                  <div key={t} className={styles.pcFeat}>
                    <span>{ico}</span>
                    <div><strong>{t}</strong><br /><small>{d}</small></div>
                  </div>
                ))}
              </div>
              <button className="btn btn-green btn-lg" onClick={e => { e.stopPropagation(); navigate('/auth') }}>Commencer gratuitement â†’</button>
            </div>
          )}
          <div className={`${styles.portalCard} ${styles.pcProvider}`} onClick={() => navigate('/auth?role=provider')}>
            <div className={styles.pcNum}>02</div>
            <div className={styles.pcTitle}>Portail Fournisseur</div>
            <div className={styles.pcDesc}>GÃ©rez votre atelier, attirez de nouveaux clients et augmentez vos revenus avec FlashMat.</div>
            <div className={styles.pcFeats}>
              {[['ðŸ“ˆ', 'Dashboard revenu', 'Chiffres en temps rÃ©el, cibles, tendances'], ['ðŸ“…', 'Gestion rÃ©servations', 'Calendrier intelligent, file d\'attente'], ['ðŸ“£', 'Promos ciblÃ©es', 'Offres Ã  vos clients fidÃ¨les'], ['âœ…', 'Notifier les clients', 'Alerte quand la voiture est prÃªte'], ['ðŸª', 'Profil public', 'VisibilitÃ© FlashMat + Google']].map(([ico, t, d]) => (
                <div key={t} className={styles.pcFeat}>
                  <span>{ico}</span>
                  <div><strong>{t}</strong><br /><small>{d}</small></div>
                </div>
              ))}
            </div>
            <button className="btn btn-outline btn-lg" style={{ color: 'var(--blue)', borderColor: 'var(--blue)' }} onClick={e => { e.stopPropagation(); navigate('/auth?role=provider') }}>Inscrire mon atelier â†’</button>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <img src="/logo.jpg" alt="FlashMat" style={{ height: 32, objectFit: 'contain' }} />
        <div className={styles.footerLinks}>
          {['Ã€ propos', 'Conditions', 'ConfidentialitÃ©', 'info@flashmat.ca', '514-476-1708'].map(l => (
            <span key={l} className={styles.footerLink}>{l}</span>
          ))}
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink3)', fontFamily: 'var(--mono)' }}>Â© 2025 FlashMat.ca Â· MontrÃ©al, QC</div>
      </footer>
    </div>
  )
}

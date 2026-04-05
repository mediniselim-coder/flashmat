import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { mergeProviderProfile } from '../lib/providerProfiles'
import styles from './Landing.module.css'
import NavBar from '../components/NavBar'
import SiteFooter from '../components/SiteFooter'

const SERVICES = [
  { id: 'flashfix',  name: 'FlashFix',     icon: '🚨', count: 8 },
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
  const [featuredProviders, setFeaturedProviders] = useState([])
  const [dbLoading, setDbLoading] = useState(false)

  const activeTab = TABS.find(t => t.key === tab)

  useEffect(() => {
    setDbLoading(true)
    supabase
      .from('providers')
      .select('*')
      .order('rating', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        setFeaturedProviders((data || []).map((provider) => mergeProviderProfile(provider)).filter((provider) => provider.publicReady))
        setDbLoading(false)
      })
  }, [])

  useEffect(() => {
    if (!filterTerm) { setDbProviders([]); return }
    setDbLoading(true)
    supabase
      .from('providers')
      .select('*')
      .order('rating', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        const normalized = filterTerm.toLowerCase()
        setDbProviders(
          (data || [])
            .map((provider) => mergeProviderProfile(provider))
            .filter((provider) =>
              provider.publicReady && (
                provider.name?.toLowerCase().includes(normalized)
                || provider.type_label?.toLowerCase().includes(normalized)
                || provider.address?.toLowerCase().includes(normalized)
                || provider.services?.some((service) => service.toLowerCase().includes(normalized))
              )
            ),
        )
        setDbLoading(false)
      })
  }, [filterTerm])

  function openDoctor() {
    if (user && profile?.role === 'client') {
      navigate('/doctor')
      return
    }
    window.sessionStorage.setItem('flashmat-post-login-redirect', '/doctor')
    navigate('/doctor?login=1')
  }

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

  const displayProviders = (filterTerm ? dbProviders : featuredProviders).filter(p => {
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

      {/* TICKER — une seule fois */}
      <div className={styles.ticker}>
        <div className={styles.tickerTrack}>
          {[...TICKER, ...TICKER].map((t, i) => (
            <span key={i} className={styles.tickerItem}><strong className={styles.tickerSep}>⚡</strong> {t}</span>
          ))}
        </div>
      </div>

      {/* HERO */}
      <section className={styles.hero}>
        <div className={styles.heroMedia} />
        <div className={styles.heroMediaOverlay} />
        <div className={styles.heroOrb1} />
        <div className={styles.heroOrb2} />
        <div className={styles.heroGrid} />
        <div className={styles.heroShell}>
          <div>
            <div className={styles.heroBadge}>
              <span className={styles.badgeDot} />
              The MarketPlace for Auto Tech · Montréal · 200+ Fournisseurs
            </div>
            <div className={styles.heroEyebrow}>FlashMat Application</div>
            <h1 className={styles.h1}>
              Tout l univers auto<br />
              de <span className={styles.accent}>Montréal</span>,<br />
              dans un seul hub.
            </h1>
            <p className={styles.sub}>
              Réservez un service, trouvez un provider fiable et déclenchez FlashFix en urgence sans quitter FlashMat.
            </p>
            <div className={styles.heroCtas}>
              <button
                type="button"
                className={styles.heroPrimaryCta}
                onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Explorer les services
              </button>
              <button
                type="button"
                className={styles.heroSecondaryCta}
                onClick={() => navigate('/urgence')}
              >
                FlashFix Urgence
              </button>
            </div>
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
                <button key={cat} className={styles.chip} onClick={() => navigate('/services', { state: { cat } })}>{label}</button>
              ))}
            </div>
          </div>
          <div className={styles.heroInsight}>
            <div className={styles.heroInsightTop}>
              <div>
                <div className={styles.heroInsightEyebrow}>Live sur FlashMat</div>
                <div className={styles.heroInsightTitle}>Trouver, diagnostiquer, réserver.</div>
              </div>
              <div className={styles.heroInsightBadge}>4.7★ moyenne</div>
            </div>
            <div className={styles.heroInsightGrid}>
              <div className={styles.heroInsightCard}>
                <div className={styles.heroInsightLabel}>Services</div>
                <div className={styles.heroInsightValue}>11</div>
                <div className={styles.heroInsightText}>catégories actives</div>
              </div>
              <div className={styles.heroInsightCard}>
                <div className={styles.heroInsightLabel}>Providers</div>
                <div className={styles.heroInsightValue}>200+</div>
                <div className={styles.heroInsightText}>vérifiés à Montréal</div>
              </div>
              <div className={`${styles.heroInsightCard} ${styles.heroInsightCardWide}`}>
                <div className={styles.heroInsightLabel}>Parcours recommandé</div>
                <div className={styles.heroInsightText}>Recherche par service → matching provider → réservation confirmée.</div>
              </div>
            </div>
          </div>
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

      {/* DOCTEUR AUTOMOBILE */}
      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <div className={styles.eyebrow}>● Docteur Automobile</div>
          <h2 className={styles.sectionTitle}>Des conseils auto clairs,<br />avec <span>connexion client</span></h2>
          <div style={{ background: '#fff', borderRadius: 28, border: '1px solid var(--border)', boxShadow: 'var(--shadow)', padding: '40px 44px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 32, alignItems: 'center' }}>
            <div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase', color: 'var(--blue)', marginBottom: 10 }}>
                Réservé aux clients connectés
              </div>
              <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 34, lineHeight: 1.05, color: 'var(--ink)' }}>
                Parlez au Docteur Automobile quand vous en avez vraiment besoin
              </div>
            </div>
            <div style={{ color: 'var(--ink2)', fontSize: 15, lineHeight: 1.8 }}>
              Posez vos questions d'entretien, de panne ou de réservation seulement une fois connecté. FlashMat peut alors lier le diagnostic à votre profil, vos véhicules et vos prochaines réservations.
              <div style={{ marginTop: 24, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-green btn-lg" onClick={openDoctor}>Ouvrir le Docteur Automobile</button>
                <button type="button" className="btn btn-outline btn-lg" onClick={() => navigate('/services')}>Voir les services</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section className={styles.section} id="services">
        <div className={styles.sectionInner}>
          <div className={styles.eyebrow}>● Nos services</div>
          <h2 className={styles.sectionTitle}>Tout ce dont votre auto<br />a besoin à <span>Montréal</span></h2>
          <div className={styles.svcGrid}>
            {SERVICES.map(s => (
              <div key={s.id} className={styles.svcCard} onClick={() => navigate(s.id === 'flashfix' ? '/urgence' : '/services', s.id === 'flashfix' ? undefined : { state: { cat: s.id } })}>
                <span className={styles.svcIcon}>{s.icon}</span>
                <div className={styles.svcName}>{s.name}</div>
                <div className={styles.svcCount}>{s.count} {s.id === 'parking' ? 'emplacements' : 'fournisseurs'}</div>
                <span className={styles.svcArrow}>→</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROVIDERS */}
      <section className={styles.section} id="providers">
        <div className={styles.sectionInner}>
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
              {dbLoading && (
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
        </div>
      </section>

      {/* PORTALS */}
      <section className={styles.section} id="portals">
        <div className={styles.sectionInner}>
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
        </div>
      </section>

      {/* FOOTER */}
      <SiteFooter portal="public" />
      {/* Legacy footer hidden after shared footer migration */}
      <footer className={styles.footer} style={{ display: 'none' }}>
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

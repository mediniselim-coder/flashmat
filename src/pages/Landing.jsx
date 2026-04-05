import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { mergeProviderProfile } from '../lib/providerProfiles'
import styles from './Landing.module.css'
import NavBar from '../components/NavBar'
import SiteFooter from '../components/SiteFooter'

const SERVICES = [
  { id: 'flashfix',  name: 'FlashFix',     icon: 'ðŸš¨', count: 8 },
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

const TABS = [
  { key: 'service',     label: 'ðŸ”§ Par service',    ph: 'Ex: mÃ©canique, vidange, pneus, carrosserieâ€¦' },
  { key: 'quartier',   label: 'ðŸ“ Par quartier',   ph: 'Ex: Plateau, NDG, Rosemont, CÃ´te-des-Neigesâ€¦' },
  { key: 'fournisseur',label: 'ðŸª Fournisseur',    ph: 'Ex: Garage Los Santos, CS Lave Autoâ€¦' },
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
    setFilterTerm(query.trim().toLowerCase())
  }

  function slugify(name) {
    return (name || '').toLowerCase()
      .replace(/[Ã Ã¡Ã¢Ã£]/g, 'a').replace(/[Ã©Ã¨ÃªÃ«]/g, 'e')
      .replace(/[Ã®Ã¯]/g, 'i').replace(/[Ã´Ã¶]/g, 'o')
      .replace(/[Ã¹Ã»Ã¼]/g, 'u').replace(/Ã§/g, 'c')
      .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim()
  }

  const displayProviders = (filterTerm ? dbProviders : featuredProviders).filter(p => {
    if (minRating === 'open') return p.open === true || p.is_open === true || p.is_open === 'true'
    return (p.rating || 0) >= minRating
  })

  const normalizedFilter = filterTerm.trim().toLowerCase()
  const providerSearchBase = normalizedFilter ? dbProviders : featuredProviders
  const heroProviderMatches = providerSearchBase
    .filter((provider) => {
      if (!normalizedFilter) return false
      const haystack = [
        provider.name,
        provider.type_label,
        provider.address,
        ...(provider.services || []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(normalizedFilter)
    })
    .slice(0, 4)

  const heroServiceMatches = SERVICES
    .filter((service) => normalizedFilter && service.name.toLowerCase().includes(normalizedFilter))
    .slice(0, 4)

  const heroQuickResults = (
    tab === 'service'
      ? [
          ...heroServiceMatches.map((service) => ({
            key: `service-${service.id}`,
            eyebrow: 'Service',
            title: service.name,
            meta: `${service.count}+ options disponibles`,
            action: () => navigate('/services', { state: { cat: service.id } }),
          })),
          ...heroProviderMatches.map((provider) => ({
            key: `provider-${provider.id || provider.name}`,
            eyebrow: 'Provider',
            title: provider.name,
            meta: provider.type_label || provider.address || 'Disponible sur FlashMat',
            action: () => navigate(`/provider/${provider.id || slugify(provider.name)}`),
          })),
        ]
      : heroProviderMatches.map((provider) => ({
          key: `provider-${provider.id || provider.name}`,
          eyebrow: tab === 'quartier' ? 'Quartier' : 'Provider',
          title: provider.name,
          meta: provider.address || provider.type_label || 'Disponible sur FlashMat',
          action: () => navigate(`/provider/${provider.id || slugify(provider.name)}`),
        }))
  ).slice(0, 4)

  const scrollRef = useRef(null)
  function scrollProviders(dir) {
    scrollRef.current?.scrollBy({ left: dir * 320, behavior: 'smooth' })
  }

  return (
    <div className={styles.page}>

      <NavBar activePage="home" />

      {/* TICKER â€” une seule fois */}
      <div className={styles.ticker}>
        <div className={styles.tickerTrack}>
          {[...TICKER, ...TICKER].map((t, i) => (
            <span key={i} className={styles.tickerItem}><strong className={styles.tickerSep}>âš¡</strong> {t}</span>
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
              The MarketPlace for Auto Tech Â· MontrÃ©al Â· 200+ Fournisseurs
            </div>
            <div className={styles.heroEyebrow}>FlashMat Application</div>
            <h1 className={styles.h1}>
              Tout l univers auto<br />
              de <span className={styles.accent}>Montreal</span>,
            </h1>
            <p className={styles.sub}>
              RÃ©servez un service, trouvez un provider fiable et dÃ©clenchez FlashFix en urgence sans quitter FlashMat.
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
                <input
                  value={query}
                  onChange={e => {
                    const value = e.target.value
                    setQuery(value)
                    setFilterTerm(value.trim().toLowerCase())
                  }}
                  placeholder={activeTab.ph}
                  className={styles.searchInput}
                />
                <button type="submit" className={styles.searchBtn}>Rechercher â†’</button>
              </form>
              {(dbLoading || normalizedFilter) && (
                <div className={styles.searchResults}>
                  <div className={styles.searchResultsHeader}>
                    <span>Recherche FlashMat</span>
                    {normalizedFilter ? <span>{heroQuickResults.length} rÃƒÂ©sultat{heroQuickResults.length > 1 ? 's' : ''}</span> : <span>Saisissez un terme</span>}
                  </div>
                  {dbLoading ? (
                    <div className={styles.searchResultEmpty}>Recherche en coursÃ¢â‚¬Â¦</div>
                  ) : heroQuickResults.length ? (
                    <div className={styles.searchResultsList}>
                      {heroQuickResults.map((result) => (
                        <button key={result.key} type="button" className={styles.searchResultItem} onClick={result.action}>
                          <span className={styles.searchResultEyebrow}>{result.eyebrow}</span>
                          <strong className={styles.searchResultTitle}>{result.title}</strong>
                          <span className={styles.searchResultMeta}>{result.meta}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.searchResultEmpty}>Aucun rÃƒÂ©sultat direct. Essayez un service, un provider ou un quartier.</div>
                  )}
                </div>
              )}
            </div>
            <div className={styles.chips}>
              {[['ðŸ”§ MÃ©canique','mechanic'],['ðŸš¿ Lave-auto','wash'],['ðŸ”© Pneus','tire'],['ðŸš› Remorquage 24/7','tow'],['ðŸªŸ Vitres','glass'],['ðŸŽ¨ Carrosserie','body'],['â™»ï¸ Casse auto','junk']].map(([label, cat]) => (
                <button key={cat} className={styles.chip} onClick={() => navigate('/services', { state: { cat } })}>{label}</button>
              ))}
            </div>
          </div>
          <div className={styles.heroInsight}>
            <div className={styles.heroInsightTop}>
              <div>
                <div className={styles.heroInsightEyebrow}>Live sur FlashMat</div>
                <div className={styles.heroInsightTitle}>Trouver, diagnostiquer, rÃ©server.</div>
              </div>
              <div className={styles.heroInsightBadge}>4.7â˜… moyenne</div>
            </div>
            <div className={styles.heroInsightGrid}>
              <div className={styles.heroInsightCard}>
                <div className={styles.heroInsightLabel}>Services</div>
                <div className={styles.heroInsightValue}>11</div>
                <div className={styles.heroInsightText}>catÃ©gories actives</div>
              </div>
              <div className={styles.heroInsightCard}>
                <div className={styles.heroInsightLabel}>Providers</div>
                <div className={styles.heroInsightValue}>200+</div>
                <div className={styles.heroInsightText}>vÃ©rifiÃ©s Ã  MontrÃ©al</div>
              </div>
              <div className={`${styles.heroInsightCard} ${styles.heroInsightCardWide}`}>
                <div className={styles.heroInsightLabel}>Parcours recommandÃ©</div>
                <div className={styles.heroInsightText}>Recherche par service â†’ matching provider â†’ rÃ©servation confirmÃ©e.</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS BAND */}
      <div className={styles.statsBand}>
        {[['200+', 'Fournisseurs MTL'], ['14k', 'Clients actifs'], ['4.7â˜…', 'Note moyenne'], ['10', 'Types de services'], ['24h', 'Support & urgences']].map(([v, l]) => (
          <div key={l} className={styles.sbi}>
            <div className={styles.sbiVal}>{v}</div>
            <div className={styles.sbiLabel}>{l}</div>
          </div>
        ))}
      </div>

      {/* DOCTEUR AUTOMOBILE */}
      <section className={styles.section}>
        <div className={styles.sectionInner}>
          <div className={styles.eyebrow}>â— Docteur Automobile</div>
          <h2 className={styles.sectionTitle}>Des conseils auto clairs,<br />avec <span>connexion client</span></h2>
          <div style={{ background: '#fff', borderRadius: 28, border: '1px solid var(--border)', boxShadow: 'var(--shadow)', padding: '40px 44px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 32, alignItems: 'center' }}>
            <div>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase', color: 'var(--blue)', marginBottom: 10 }}>
                RÃ©servÃ© aux clients connectÃ©s
              </div>
              <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 34, lineHeight: 1.05, color: 'var(--ink)' }}>
                Parlez au Docteur Automobile quand vous en avez vraiment besoin
              </div>
            </div>
            <div style={{ color: 'var(--ink2)', fontSize: 15, lineHeight: 1.8 }}>
              Posez vos questions d'entretien, de panne ou de rÃ©servation seulement une fois connectÃ©. FlashMat peut alors lier le diagnostic Ã  votre profil, vos vÃ©hicules et vos prochaines rÃ©servations.
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
          <div className={styles.eyebrow}>â— Nos services</div>
          <h2 className={styles.sectionTitle}>Tout ce dont votre auto<br />a besoin Ã  <span>MontrÃ©al</span></h2>
          <div className={styles.svcGrid}>
            {SERVICES.map(s => (
              <div key={s.id} className={styles.svcCard} onClick={() => navigate(s.id === 'flashfix' ? '/urgence' : '/services', s.id === 'flashfix' ? undefined : { state: { cat: s.id } })}>
                <span className={styles.svcIcon}>{s.icon}</span>
                <div className={styles.svcName}>{s.name}</div>
                <div className={styles.svcCount}>{s.count} {s.id === 'parking' ? 'emplacements' : 'fournisseurs'}</div>
                <span className={styles.svcArrow}>â†’</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROVIDERS */}
      <section className={styles.section} id="providers">
        <div className={styles.sectionInner}>
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
              {dbLoading && (
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
        </div>
      </section>

      {/* PORTALS */}
      <section className={styles.section} id="portals">
        <div className={styles.sectionInner}>
          <div className={styles.eyebrow}>â— Rejoindre FlashMat</div>
          <h2 className={styles.sectionTitle}>Choisissez<br />votre <span>rÃ´le</span></h2>
          <div className={styles.portalsGrid}>
            <div className={`${styles.portalCard} ${styles.pcClient}`} onClick={() => navigate('/auth')}>
              <div className={styles.pcNum}>01</div>
              <div className={styles.pcTitle}>Portail Client</div>
              <div className={styles.pcDesc}>Trouvez, rÃ©servez et suivez tous vos services auto Ã  MontrÃ©al depuis un seul tableau de bord.</div>
              <div className={styles.pcFeats}>
                {[['ðŸ”','Recherche par immatriculation','Historique, rappels manufacturiers'],
                  ['ðŸ“Š','FlashScoreâ„¢','Score santÃ© de votre vÃ©hicule en temps rÃ©el'],
                  ['ðŸ“…','RÃ©servation instantanÃ©e','Agenda live de tous les fournisseurs'],
                  ['âš¡','Alertes intelligentes','Rappels proactifs, promos, urgences'],
                  ['ðŸ›’','Marketplace','Achat/vente piÃ¨ces entre MontrÃ©alais'],
                ].map(([ico, t, d]) => (
                  <div key={t} className={styles.pcFeat}>
                    <span>{ico}</span>
                    <div><strong>{t}</strong><br /><small>{d}</small></div>
                  </div>
                ))}
              </div>
              <button className="btn btn-green btn-lg" onClick={e => { e.stopPropagation(); navigate('/auth') }}>Commencer gratuitement â†’</button>
            </div>
            <div className={`${styles.portalCard} ${styles.pcProvider}`} onClick={() => navigate('/auth?role=provider')}>
              <div className={styles.pcNum}>02</div>
              <div className={styles.pcTitle}>Portail Fournisseur</div>
              <div className={styles.pcDesc}>GÃ©rez votre atelier, attirez de nouveaux clients et augmentez vos revenus avec FlashMat.</div>
              <div className={styles.pcFeats}>
                {[['ðŸ“ˆ','Dashboard revenu','Chiffres en temps rÃ©el, cibles, tendances'],
                  ['ðŸ“…','Gestion rÃ©servations','Calendrier intelligent, file d\'attente'],
                  ['ðŸ“£','Promos ciblÃ©es','Offres Ã  vos clients fidÃ¨les'],
                  ['âœ…','Notifier les clients','Alerte quand la voiture est prÃªte'],
                  ['ðŸª','Profil public','VisibilitÃ© FlashMat + Google'],
                ].map(([ico, t, d]) => (
                  <div key={t} className={styles.pcFeat}>
                    <span>{ico}</span>
                    <div><strong>{t}</strong><br /><small>{d}</small></div>
                  </div>
                ))}
              </div>
              <button className="btn btn-outline btn-lg" style={{ color: 'var(--blue)', borderColor: 'var(--blue)' }} onClick={e => { e.stopPropagation(); navigate('/auth?role=provider') }}>Inscrire mon atelier â†’</button>
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
          {['Ã€ propos', 'Conditions', 'ConfidentialitÃ©', 'info@flashmat.ca', '514-476-1708'].map(l => (
            <span key={l} className={styles.footerLink}>{l}</span>
          ))}
        </div>
        <div style={{ fontSize: 11, color: 'var(--ink3)', fontFamily: 'var(--mono)' }}>Â© 2025 FlashMat.ca Â· MontrÃ©al, QC</div>
      </footer>
    </div>
  )
}


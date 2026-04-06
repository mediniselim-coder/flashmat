import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import LoginModal from './LoginModal'
import ClientProfileModal from './ClientProfileModal'

const PRIMARY_ITEMS = [
  {
    id: 'services',
    label: 'Services',
    shortLabel: 'Services',
    icon: ServicesIcon,
    title: 'Services FlashMat',
    subtitle: 'Prenez rendez-vous plus vite pour l entretien, les pneus, le lavage ou la carrosserie.',
    searchPlaceholder: 'Rechercher un service...',
    cta: 'Voir les services',
    accent: 'Services et entretien',
    image: '/nav-services.jpg',
    links: [
      { label: 'Mecanique generale', to: '/services' },
      { label: 'Pneus et alignement', to: '/services/providers?cat=tire' },
      { label: 'Carrosserie', to: '/services/providers?cat=body' },
      { label: 'Vitres et pare-brise', to: '/services/providers?cat=glass' },
      { label: 'Remorquage', to: '/services/providers?cat=tow' },
      { label: 'Parking', to: '/services/providers?cat=parking' },
    ],
  },
  {
    id: 'providers',
    label: 'Providers',
    shortLabel: 'Providers',
    icon: ProvidersIcon,
    title: 'Réseau de providers',
    subtitle: 'Accédez rapidement aux ateliers, garages et spécialistes disponibles sur FlashMat.',
    searchPlaceholder: 'Rechercher un garage ou un provider...',
    cta: 'Voir les providers',
    accent: 'Garages et ateliers',
    image: '/nav-providers.jpg',
    links: [
      { label: 'Tous les providers', to: '/services/providers' },
      { label: 'Garages vedettes', to: '/services/providers?cat=mechanic' },
      { label: 'Carrosserie', to: '/services/providers?cat=body' },
      { label: 'Lavage et detailing', to: '/services/providers?cat=wash' },
      { label: 'Marketplace fournisseur', to: '/marketplace' },
      { label: 'Devenir fournisseur', to: '/auth?role=provider' },
    ],
  },
  {
    id: 'doctor',
    label: 'Docteur Automobile',
    shortLabel: 'Docteur',
    icon: DoctorIcon,
    title: 'Docteur Automobile FlashMat',
    subtitle: 'Diagnostic auto, matching atelier et parcours plus rapide vers le bon service.',
    searchPlaceholder: 'Décrire un symptôme ou un code OBD...',
    cta: 'Ouvrir le docteur',
    accent: 'Diagnostic et matching',
    image: '/nav-doctor.jpg',
    links: [
      { label: 'Lancer un diagnostic', to: '/doctor' },
      { label: 'Cas urgents FlashFix', to: '/urgence' },
      { label: 'Garages disponibles', to: '/services/providers' },
      { label: 'Mon espace client', to: '/app/client' },
    ],
  },
  {
    id: 'marketplace',
    label: 'Marketplace',
    shortLabel: 'Marketplace',
    icon: MarketplaceIcon,
    title: 'Marketplace FlashMat',
    subtitle: 'Pièces, offres et circulation entre clients et fournisseurs dans le même univers.',
    searchPlaceholder: 'Rechercher une pièce ou une annonce...',
    cta: 'Ouvrir le marketplace',
    accent: 'Pièces et annonces',
    image: '/nav-marketplace.jpg',
    links: [
      { label: 'Toutes les annonces', to: '/marketplace' },
      { label: 'Marketplace client', to: '/app/marketplace' },
      { label: 'Publier plus tard', to: '/marketplace' },
      { label: 'Services liés', to: '/services' },
    ],
  },
]

const MENU_SECTIONS = [
  { label: 'Services', to: '/services' },
  { label: 'Providers', to: '/services/providers' },
  { label: 'Shop', to: '/marketplace' },
  { label: 'Community', to: '/' },
  { label: 'Pricing', to: '/services' },
  { label: 'Contact', to: '/' },
]

const SITE_SEARCH_ENTRIES = [
  { label: 'Accueil FlashMat', section: 'Accueil', to: '/', keywords: ['landing', 'hub auto', 'montreal', 'flashmat'] },
  { label: 'Services', section: 'Services', to: '/services', keywords: ['entretien', 'garage', 'auto', 'service'] },
  { label: 'Providers', section: 'Providers', to: '/services/providers', keywords: ['garage', 'atelier', 'mecanicien', 'specialiste'] },
  { label: 'Mecanique generale', section: 'Services', to: '/services', keywords: ['mecanique', 'reparation', 'moteur'] },
  { label: 'Pneus et alignement', section: 'Services', to: '/services/providers?cat=tire', keywords: ['pneus', 'alignement', 'roues'] },
  { label: 'Carrosserie', section: 'Services', to: '/services/providers?cat=body', keywords: ['carrosserie', 'bosses', 'peinture'] },
  { label: 'Vitres et pare-brise', section: 'Services', to: '/services/providers?cat=glass', keywords: ['pare-brise', 'vitres', 'glass'] },
  { label: 'Lavage et detailing', section: 'Services', to: '/services/providers?cat=wash', keywords: ['lavage', 'detailing', 'nettoyage'] },
  { label: 'Remorquage', section: 'Services', to: '/services/providers?cat=tow', keywords: ['remorquage', 'depannage', 'tow'] },
  { label: 'Parking', section: 'Services', to: '/services/providers?cat=parking', keywords: ['parking', 'stationnement'] },
  { label: 'Docteur Automobile', section: 'Diagnostic', to: '/doctor', keywords: ['diagnostic', 'obd', 'code', 'symptome', 'panne'] },
  { label: 'FlashFix Urgence', section: 'Urgence', to: '/urgence', keywords: ['urgence', 'panne', 'rapidement', 'flashfix'] },
  { label: 'Marketplace', section: 'Marketplace', to: '/marketplace', keywords: ['pieces', 'annonces', 'offres', 'shop'] },
  { label: 'Marketplace client', section: 'Marketplace', to: '/app/marketplace', keywords: ['client', 'annonces', 'pieces'] },
  { label: 'Connexion', section: 'Compte', to: '/auth', keywords: ['login', 'signup', 'compte', 'auth'] },
  { label: 'Espace client', section: 'Compte', to: '/app/client', keywords: ['client', 'dashboard', 'reservations', 'vehicules'] },
  { label: 'Espace fournisseur', section: 'Compte', to: '/app/provider', keywords: ['provider', 'fournisseur', 'atelier', 'dashboard'] },
]

export default function NavBar({ activePage }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, profile, signOut } = useAuth()
  const [loginOpen, setLoginOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [clientProfileModalOpen, setClientProfileModalOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [panelOpen, setPanelOpen] = useState(null)
  const [hoveredIcon, setHoveredIcon] = useState(null)
  const [viewportWidth, setViewportWidth] = useState(typeof window === 'undefined' ? 1440 : window.innerWidth)
  const rootRef = useRef(null)

  const isProvider = profile?.role === 'provider'
  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Mon compte'

  useEffect(() => {
    function handleClickOutside(event) {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setProfileOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    function handleLoginModalOpen() {
      setLoginOpen(true)
    }

    function handleLoginModalClose() {
      setLoginOpen(false)
    }

    window.addEventListener('flashmat-login-modal-open', handleLoginModalOpen)
    window.addEventListener('flashmat-login-modal-close', handleLoginModalClose)
    return () => {
      window.removeEventListener('flashmat-login-modal-open', handleLoginModalOpen)
      window.removeEventListener('flashmat-login-modal-close', handleLoginModalClose)
    }
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get('login') === '1' && !user) setLoginOpen(true)
  }, [location.search, user])

  useEffect(() => {
    function handleResize() {
      setViewportWidth(window.innerWidth)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  function closeFloatingUi() {
    setMenuOpen(false)
    setPanelOpen(null)
    setProfileOpen(false)
  }

  function navigateTo(path) {
    closeFloatingUi()
    navigate(path)
  }

  function toggleMenu() {
    setPanelOpen(null)
    setProfileOpen(false)
    setMenuOpen((current) => !current)
  }

  function togglePanel(id) {
    setMenuOpen(false)
    setProfileOpen(false)
    setPanelOpen((current) => (current === id ? null : id))
  }

  async function handleSignOut() {
    await signOut()
    setProfileOpen(false)
    navigate('/')
  }

  const profileItems = useMemo(() => {
    if (!user || !profile) return []

    if (isProvider) {
      return [
        { icon: <DashboardIcon />, label: 'Dashboard', action: () => navigateTo('/app/provider') },
        { icon: <ProvidersIcon />, label: 'Profil atelier', action: () => navigateTo('/app/provider') },
        { icon: <MarketplaceIcon />, label: 'Marketplace fournisseur', action: () => navigateTo('/app/provider') },
        { icon: <DoctorIcon />, label: 'Support FlashMat', action: () => setProfileOpen(false) },
      ]
      }
  
          return [
           { icon: <DashboardIcon />, label: 'Tableau de bord', action: () => navigateTo('/app/client/dashboard') },
           { icon: <CarIcon />, label: 'Mes vehicules', action: () => navigateTo('/app/client/vehicles') },
           { icon: <CalendarIcon />, label: 'Mes reservations', action: () => navigateTo('/app/client/bookings') },
           { icon: <MarketplaceIcon />, label: 'Marketplace', action: () => navigateTo('/app/marketplace') },
        ]
    }, [isProvider, navigate, profile, user])

  const siteSearchEntries = useMemo(() => {
    const dynamicEntries = PRIMARY_ITEMS.flatMap((item) =>
      item.links.map((link) => ({
        label: link.label,
        section: item.label,
        to: link.to,
        keywords: [item.label, item.title, item.accent],
      })),
    )

    const seen = new Set()
    return [...SITE_SEARCH_ENTRIES, ...dynamicEntries].filter((entry) => {
      const key = `${entry.label}-${entry.to}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [])

  const activePanel = PRIMARY_ITEMS.find((item) => item.id === panelOpen) || null
  const isCompact = viewportWidth < 1180
  const isMobile = viewportWidth < 860

  return (
    <>
      <div ref={rootRef} style={styles.root}>
        <nav style={{ ...styles.nav, padding: isCompact ? '0 14px' : '0 20px', gap: isCompact ? 14 : 24 }}>
          <div style={styles.leftGroup}>
            <button
              type="button"
              style={menuOpen ? styles.menuButtonActive : styles.menuButton}
              onMouseEnter={() => setHoveredIcon('menu')}
              onMouseLeave={() => setHoveredIcon(null)}
              onClick={toggleMenu}
              aria-label="Ouvrir le menu FlashMat"
            >
              <MenuIcon />
              <HoverLabel visible={hoveredIcon === 'menu'} label="Menu" />
            </button>

            <button type="button" style={styles.logoButton} onClick={() => navigateTo('/')}>
              <img src="/logo-dark.png" alt="FlashMat" style={{ height: isCompact ? 34 : 40, objectFit: 'contain' }} />
            </button>
          </div>

          <div style={{ ...styles.centerGroup, gap: isCompact ? 10 : 18 }}>
            {PRIMARY_ITEMS.map((item, index) => {
              if (isMobile && index > 2) return null
              const Icon = item.icon
              return (
                <AppIconButton
                  key={item.id}
                  item={item}
                  isActive={activePage === item.id || panelOpen === item.id}
                  hoveredIcon={hoveredIcon}
                  setHoveredIcon={setHoveredIcon}
                  onClick={() => togglePanel(item.id)}
                  icon={<Icon />}
                />
              )
            })}
          </div>

          <div style={styles.rightGroup}>
            <button type="button" onClick={() => navigateTo('/urgence')} style={activePage === 'urgence' ? { ...styles.urgentButtonActive, padding: isCompact ? '10px 14px' : '12px 16px' } : { ...styles.urgentButton, padding: isCompact ? '10px 14px' : '12px 16px' }}>
              {isMobile ? 'Urgence' : 'FlashFix Urgence'}
            </button>

            {user && profile ? (
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  style={profileOpen ? styles.accountButtonActive : styles.accountButton}
                  onClick={() => {
                    setMenuOpen(false)
                    setPanelOpen(null)
                    setProfileOpen((current) => !current)
                  }}
                >
                  <span style={styles.accountAvatar}>{displayName.slice(0, 1).toUpperCase()}</span>
                  {!isMobile && <span style={styles.accountText}>{displayName}</span>}
                </button>

                {profileOpen && (
                  <div style={styles.profilePopup}>
                    <div style={styles.profileHeader}>
                      <div style={styles.profileHeaderRow}>
                        <div>
                          <div style={styles.profileTitle}>{displayName}</div>
                          <div style={styles.profileSubtitle}>{isProvider ? 'Profil fournisseur' : 'Profil client'}</div>
                        </div>
                        {!isProvider && (
                          <button
                            type="button"
                            onClick={() => { setProfileOpen(false); setClientProfileModalOpen(true) }}
                            style={styles.profileSettingsButton}
                            aria-label="Edit profile"
                            title="Edit profile"
                          >
                            <SettingsIcon />
                          </button>
                        )}
                      </div>
                    </div>
                    <div style={{ padding: 10 }}>
                      {profileItems.map((item) => (
                        <PopupItem key={item.label} icon={item.icon} label={item.label} onClick={item.action} />
                      ))}
                      <PopupItem icon={<LogoutIcon />} label="Se deconnecter" onClick={handleSignOut} danger />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button type="button" onClick={() => setLoginOpen(true)} style={styles.authButton}>
                <UserIcon />
                <span>{isMobile ? 'Connexion' : 'Login / Sign Up'}</span>
              </button>
            )}
          </div>
        </nav>
      </div>

      {(menuOpen || activePanel) && <div style={styles.scrim} onClick={closeFloatingUi} />}

      {menuOpen && (
        <div style={{ ...styles.drawer, width: isMobile ? '100vw' : isCompact ? '340px' : '360px', borderRadius: '0', top: 0, height: '100vh', padding: isCompact ? '40px 18px 18px' : '48px 22px 20px' }}>
          <div style={styles.drawerHeader}>
            <img src="/logo.jpg" alt="FlashMat" style={{ height: isCompact ? 50 : 58, objectFit: 'contain' }} />
            <button type="button" style={styles.drawerClose} onClick={() => setMenuOpen(false)} aria-label="Fermer le menu">×</button>
          </div>
          <div style={styles.drawerIntro}>
            <div style={styles.drawerEyebrow}>Navigation FlashMat</div>
            <div style={{ ...styles.drawerTitle, fontSize: isCompact ? 18 : 22, maxWidth: 250 }}>Simple. Fast. FlashMat.</div>
            <div style={{ ...styles.drawerText, fontSize: isCompact ? 12.5 : 13, maxWidth: 270 }}>
              The essentials, presented with less noise and a cleaner rhythm.
            </div>
          </div>
          <div style={{ ...styles.drawerLinks, gap: isCompact ? 10 : 12 }}>
            {MENU_SECTIONS.map((item) => (
              <DrawerLink key={item.label} label={item.label} to={item.to} onNavigate={navigateTo} compact={isCompact} />
            ))}
          </div>
          <div style={styles.drawerFooter}>
            <div style={{ ...styles.drawerAccountCard, padding: isCompact ? 14 : 15 }}>
              <div style={styles.drawerAccountEyebrow}>{user ? 'Session active' : 'Compte FlashMat'}</div>
              <div style={{ ...styles.drawerAccountTitle, fontSize: isCompact ? 15 : 16 }}>
                {user ? displayName : 'Connectez-vous'}
              </div>
              <div style={{ ...styles.drawerAccountText, fontSize: isCompact ? 11.5 : 12 }}>
                {user ? `${getRoleLabel(profile?.role)} · montréal` : 'Client, fournisseur ou partenaire'}
              </div>
              {user ? (
                <div style={styles.drawerAccountActions}>
                  <button type="button" onClick={() => navigateTo(isProvider ? '/app/provider' : '/app/client')} style={styles.drawerPrimaryCta}>
                    Mon espace
                  </button>
                  <button type="button" onClick={handleSignOut} style={styles.drawerSecondaryCta}>
                    Se déconnecter
                  </button>
                </div>
              ) : (
                <div style={styles.drawerAccountActions}>
                  <button type="button" onClick={() => { setMenuOpen(false); setLoginOpen(true) }} style={styles.drawerLogin}>
                    <UserIcon />
                    <span>Login</span>
                  </button>
                  <button type="button" onClick={() => { setMenuOpen(false); setLoginOpen(true) }} style={styles.drawerSignup}>
                    Sign Up
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activePanel && (
        <div style={styles.panelWrap}>
          <AppPanel
            item={activePanel}
            onNavigate={navigateTo}
            onClose={() => setPanelOpen(null)}
            compact={isCompact}
            searchEntries={siteSearchEntries}
          />
        </div>
      )}

      {loginOpen && <LoginModal onClose={() => setLoginOpen(false)} />}
      {clientProfileModalOpen && !isProvider && <ClientProfileModal onClose={() => setClientProfileModalOpen(false)} />}
    </>
  )
}

function AppIconButton({ item, isActive, hoveredIcon, setHoveredIcon, onClick, icon }) {
  return (
    <button
      type="button"
      style={isActive ? styles.appIconActive : styles.appIcon}
      onMouseEnter={() => setHoveredIcon(item.id)}
      onMouseLeave={() => setHoveredIcon(null)}
      onClick={onClick}
      aria-label={item.label}
    >
      {icon}
      <HoverLabel visible={hoveredIcon === item.id} label={item.shortLabel} />
    </button>
  )
}

function getRoleLabel(role) {
  if (role === 'provider') return 'fournisseur'
  if (role === 'client') return 'client'
  return 'compte flashmat'
}

function DrawerLink({ label, to, onNavigate, compact }) {
  const [hover, setHover] = useState(false)

  return (
    <button
      type="button"
      onClick={() => onNavigate(to)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...styles.drawerLink,
        fontSize: compact ? 14 : 15,
        padding: compact ? '11px 14px' : '12px 14px',
        transform: hover ? 'translateY(-2px) scale(1.01)' : 'translateY(0) scale(1)',
        borderColor: hover ? 'rgba(59,159,216,0.34)' : 'rgba(26,58,143,0.08)',
        boxShadow: hover ? '0 18px 34px rgba(26,58,143,0.12)' : '0 8px 18px rgba(26,58,143,0.04)',
        color: hover ? '#0b2e4b' : '#17314a',
        background: hover ? 'linear-gradient(180deg, #ffffff 0%, #eef6ff 100%)' : 'linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)',
      }}
    >
      {label}
    </button>
  )
}

function HoverLabel({ visible, label }) {
  return (
    <span style={{ ...styles.hoverLabel, opacity: visible ? 1 : 0, transform: visible ? 'translate(-50%, 0)' : 'translate(-50%, 6px)' }}>
      {label}
    </span>
  )
}

function AppPanel({ item, onNavigate, onClose, compact = false, searchEntries = [] }) {
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)

  useEffect(() => {
    setQuery('')
  }, [item.id])

  const results = useMemo(() => {
    const normalized = deferredQuery.trim().toLowerCase()
    if (!normalized) return []

    return searchEntries
      .map((entry) => {
        const haystack = `${entry.label} ${entry.section} ${(entry.keywords || []).join(' ')}`.toLowerCase()
        if (!haystack.includes(normalized)) return null
        const startsWith = entry.label.toLowerCase().startsWith(normalized)
        const includesTitle = entry.label.toLowerCase().includes(normalized)
        return { ...entry, score: startsWith ? 3 : includesTitle ? 2 : 1 }
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
      .slice(0, 7)
  }, [deferredQuery, searchEntries])

  function submitSearch() {
    if (results[0]) {
      onNavigate(results[0].to)
      return
    }

    onNavigate(item.links[0]?.to || '/')
  }

  return (
    <div style={{ ...styles.panelCard, width: compact ? 'min(1180px, calc(100vw - 28px))' : 'min(1680px, calc(100vw - 48px))', padding: compact ? 30 : 38 }}>
      <div style={{ ...styles.panelGrid, gridTemplateColumns: compact ? '1fr .94fr' : '1.02fr 1fr', gap: compact ? 30 : 42 }}>
        <div style={{ padding: compact ? '10px 10px 8px' : '18px 16px 12px' }}>
          <div style={styles.panelEyebrow}>FlashMat Hub</div>
          <h2 style={{ ...styles.panelTitle, fontSize: compact ? 36 : 58, maxWidth: compact ? 470 : 620 }}>{item.title}</h2>
          <p style={{ ...styles.panelSubtitle, fontSize: compact ? 15 : 17, maxWidth: compact ? 500 : 620 }}>{item.subtitle}</p>
          <div style={{ ...styles.linkGrid, gap: compact ? 8 : 12 }}>
            {item.links.map((link) => (
              <PanelLinkButton key={link.label} label={link.label} onClick={() => onNavigate(link.to)} compact={compact} />
            ))}
          </div>
        </div>

        <div style={{ paddingTop: compact ? 10 : 12, paddingRight: compact ? 8 : 10 }}>
          <div style={{ position: 'relative', marginBottom: compact ? 22 : 28 }}>
            <div style={styles.searchShell}>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    submitSearch()
                  }
                }}
                placeholder={item.searchPlaceholder}
                style={{ ...styles.searchInput, height: compact ? 48 : 56, fontSize: compact ? 15 : 18 }}
              />
              <button type="button" style={styles.searchButton} onClick={submitSearch}>
                <SearchIcon />
              </button>
            </div>
            {query.trim() && (
              <div style={styles.searchResults}>
                {results.length ? (
                  results.map((result) => (
                    <SearchResultItem key={`${result.section}-${result.label}-${result.to}`} result={result} onClick={() => onNavigate(result.to)} />
                  ))
                ) : (
                  <div style={styles.searchEmpty}>Aucun resultat pour cette recherche.</div>
                )}
              </div>
            )}
          </div>
          <div style={{ ...styles.visualCard, minHeight: compact ? 250 : 292, backgroundImage: `linear-gradient(180deg, rgba(8, 34, 55, 0.08) 0%, rgba(8, 34, 55, 0.34) 100%), url(${item.image})` }}>
            <div style={styles.visualShade} />
            <div style={{ ...styles.visualText, minHeight: compact ? 250 : 292, padding: compact ? 24 : 30 }}>
              <div style={styles.visualBadge}>{item.accent}</div>
              <button type="button" style={{ ...styles.visualCta, padding: compact ? '12px 18px' : '14px 22px', fontSize: compact ? 14 : 15 }} onClick={() => onNavigate(item.links[0]?.to || '/')}>
                {item.cta}
                <MapPinIcon />
              </button>
            </div>
          </div>
        </div>
      </div>
      <button type="button" onClick={onClose} style={{ ...styles.panelClose, marginTop: compact ? 16 : 22, marginLeft: compact ? 10 : 16 }}>Fermer</button>
    </div>
  )
}

function PanelLinkButton({ label, onClick, compact }) {
  const [hover, setHover] = useState(false)

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...styles.panelLink,
        fontSize: compact ? 14 : 16,
        padding: compact ? '9px 14px' : '12px 16px',
        color: hover ? '#102f4b' : '#2b4663',
        background: hover ? 'linear-gradient(180deg, #ffffff 0%, #edf6ff 100%)' : 'transparent',
        borderColor: hover ? 'rgba(59,159,216,0.26)' : 'transparent',
        transform: hover ? 'translateY(-1px)' : 'translateY(0)',
        boxShadow: hover ? '0 14px 28px rgba(26,58,143,0.10)' : 'none',
      }}
    >
      <span>{label}</span>
      <span style={{ ...styles.panelLinkArrow, opacity: hover ? 1 : 0.44, transform: hover ? 'translateX(0)' : 'translateX(-2px)' }}>→</span>
    </button>
  )
}

function SearchResultItem({ result, onClick }) {
  const [hover, setHover] = useState(false)

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...styles.searchResultItem,
        background: hover ? '#f5faff' : 'transparent',
        borderColor: hover ? 'rgba(59,159,216,0.18)' : 'transparent',
      }}
    >
      <div>
        <div style={styles.searchResultTitle}>{result.label}</div>
        <div style={styles.searchResultMeta}>{result.section}</div>
      </div>
      <span style={{ ...styles.searchResultArrow, opacity: hover ? 1 : 0.55 }}>→</span>
    </button>
  )
}

function PopupItem({ icon, label, onClick, danger = false }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...styles.popupItem,
        color: danger ? '#ef4444' : '#dbe7f6',
        background: hover ? (danger ? 'rgba(239,68,68,0.12)' : 'rgba(255,255,255,0.06)') : 'transparent',
      }}
    >
      <span style={styles.popupIcon}>{icon}</span>
      <span>{label}</span>
    </button>
  )
}

function Svg({ children, style }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" style={style || styles.svg}>
      {children}
    </svg>
  )
}

function MenuIcon() { return <Svg><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></Svg> }
function ServicesIcon() { return <Svg><path d="M4 8h16" /><path d="M7 8V5" /><path d="M17 8V5" /><rect x="5" y="8" width="14" height="11" rx="2" /><path d="M9 12h6" /><path d="M9 15h4" /></Svg> }
function ProvidersIcon() { return <Svg><path d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" /><path d="M16 12a2.5 2.5 0 1 0 0-5" /><path d="M3.5 19a4.5 4.5 0 0 1 9 0" /><path d="M14 19a4 4 0 0 1 6 0" /></Svg> }
function DoctorIcon() { return <Svg><path d="M12 4v16" /><path d="M5 11h14" /><circle cx="12" cy="12" r="8" /></Svg> }
function MarketplaceIcon() { return <Svg><path d="M4 10h16" /><path d="M6 10V7l2-3h8l2 3v3" /><path d="M6 10v8h12v-8" /><path d="M10 14h4" /></Svg> }
function UserIcon() { return <Svg><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" /><path d="M5 20a7 7 0 0 1 14 0" /></Svg> }
function SettingsIcon() { return <Svg><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1 1 0 0 0 .2 1.1l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a2 2 0 1 1-4 0v-.2a1 1 0 0 0-.7-.9 1 1 0 0 0-1.1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a2 2 0 1 1 0-4h.2a1 1 0 0 0 .9-.7 1 1 0 0 0-.2-1.1l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a2 2 0 1 1 4 0v.2a1 1 0 0 0 .7.9 1 1 0 0 0 1.1-.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6H20a2 2 0 1 1 0 4h-.2a1 1 0 0 0-.9.7Z" /></Svg> }
function SearchIcon() { return <Svg><circle cx="11" cy="11" r="6" /><path d="m20 20-4.35-4.35" /></Svg> }
function MapPinIcon() { return <Svg style={{ width: 16, height: 16 }}><path d="M12 21s6-5.33 6-11a6 6 0 1 0-12 0c0 5.67 6 11 6 11Z" /><circle cx="12" cy="10" r="2.3" /></Svg> }
function DashboardIcon() { return <Svg><path d="M4 13h7V4H4v9Z" /><path d="M13 20h7v-7h-7v7Z" /><path d="M13 11h7V4h-7v7Z" /><path d="M4 20h7v-5H4v5Z" /></Svg> }
function CarIcon() { return <Svg><path d="M5 16h14" /><path d="m7 16 1-5h8l1 5" /><path d="M6 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" /><path d="M18 19a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" /><path d="m8 11 2-3h4l2 3" /></Svg> }
function CalendarIcon() { return <Svg><path d="M8 3v4" /><path d="M16 3v4" /><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M4 10h16" /></Svg> }
function LogoutIcon() { return <Svg><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></Svg> }

const styles = {
  root: { position: 'sticky', top: 0, zIndex: 120 },
  nav: {
    height: 72,
    display: 'grid',
    gridTemplateColumns: '1fr auto 1fr',
    alignItems: 'center',
    gap: 24,
    padding: '0 20px',
    background: 'linear-gradient(180deg, #07253d 0%, #082237 100%)',
    borderBottom: '1px solid rgba(120, 180, 220, 0.12)',
    boxShadow: '0 18px 38px rgba(4, 18, 32, 0.22)',
  },
  leftGroup: { display: 'flex', alignItems: 'center', gap: 14 },
  centerGroup: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18 },
  rightGroup: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10 },
  menuButton: {
    position: 'relative',
    width: 46,
    height: 46,
    borderRadius: 14,
    border: '1px solid rgba(142, 196, 234, 0.16)',
    background: 'rgba(255,255,255,0.04)',
    color: '#f5fbff',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuButtonActive: {
    position: 'relative',
    width: 46,
    height: 46,
    borderRadius: 14,
    border: '1px solid rgba(90,184,240,0.22)',
    background: 'rgba(90,184,240,0.12)',
    color: '#ffffff',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoButton: { display: 'inline-flex', alignItems: 'center', background: 'transparent', border: 'none', padding: 0 },
  appIcon: {
    position: 'relative',
    width: 48,
    height: 48,
    borderRadius: 14,
    border: '1px solid transparent',
    background: 'transparent',
    color: 'rgba(234, 244, 255, 0.8)',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appIconActive: {
    position: 'relative',
    width: 48,
    height: 48,
    borderRadius: 14,
    border: '1px solid rgba(90, 184, 240, 0.24)',
    background: 'rgba(90, 184, 240, 0.09)',
    color: '#ffffff',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hoverLabel: {
    position: 'absolute',
    left: '50%',
    top: 'calc(100% + 10px)',
    padding: '6px 10px',
    borderRadius: 999,
    background: '#f8fbff',
    color: '#082237',
    fontSize: 11,
    fontWeight: 700,
    whiteSpace: 'nowrap',
    pointerEvents: 'none',
    transition: 'all .16s ease',
    boxShadow: '0 16px 30px rgba(4,18,32,0.22)',
  },
  urgentButton: {
    border: 'none',
    borderRadius: 999,
    padding: '12px 16px',
    background: 'linear-gradient(135deg, #ff5f50 0%, #ef4444 100%)',
    color: '#fff',
    fontSize: 13,
    fontWeight: 800,
    boxShadow: '0 12px 26px rgba(239,68,68,0.3)',
  },
  urgentButtonActive: {
    border: 'none',
    borderRadius: 999,
    padding: '12px 16px',
    background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
    color: '#fff',
    fontSize: 13,
    fontWeight: 800,
  },
  loginLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    border: 'none',
    background: 'transparent',
    color: '#dbe7f6',
    fontSize: 14,
    fontWeight: 700,
  },
  signupButton: {
    border: 'none',
    borderRadius: 999,
    padding: '12px 22px',
    background: 'linear-gradient(135deg, #25b7ff 0%, #1097d8 100%)',
    color: '#fff',
    fontSize: 14,
    fontWeight: 800,
    boxShadow: '0 12px 26px rgba(16,151,216,0.28)',
  },
  authButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    border: '1px solid rgba(142,196,234,0.16)',
    borderRadius: 999,
    padding: '11px 16px',
    background: 'rgba(255,255,255,0.04)',
    color: '#ecf7ff',
    fontSize: 13,
    fontWeight: 700,
    whiteSpace: 'nowrap',
  },
  accountButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 10,
    border: '1px solid rgba(142,196,234,0.14)',
    borderRadius: 999,
    background: 'rgba(255,255,255,0.05)',
    color: '#ecf7ff',
    padding: '8px 10px 8px 8px',
  },
  accountButtonActive: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 10,
    border: '1px solid rgba(90,184,240,0.24)',
    borderRadius: 999,
    background: 'rgba(90,184,240,0.12)',
    color: '#ecf7ff',
    padding: '8px 10px 8px 8px',
  },
  accountAvatar: {
    width: 32, height: 32, borderRadius: '50%',
    background: 'linear-gradient(135deg, #1e40af 0%, #3b9fd8 100%)',
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', fontSize: 13, fontWeight: 800,
  },
  accountText: { maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13, fontWeight: 700 },
  scrim: { position: 'fixed', inset: 0, background: 'rgba(5,19,31,.26)', zIndex: 118 },
  drawer: {
    position: 'fixed',
    top: 0,
    left: 0,
    bottom: 0,
    width: 'min(420px, 92vw)',
    background: '#ffffff',
    borderRadius: '0',
    borderRight: '1px solid rgba(26,58,143,0.08)',
    boxShadow: '24px 0 70px rgba(4,18,32,0.22)',
    zIndex: 121,
    padding: '34px 22px 20px',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  drawerHeader: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 30 },
  drawerClose: {
    border: '1px solid rgba(26,58,143,0.1)',
    background: '#f4f8fd',
    color: '#47617b',
    fontWeight: 700,
    fontSize: 22,
    width: 42,
    height: 42,
    padding: 0,
    borderRadius: 999,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
  },
  drawerIntro: { marginBottom: 28 },
  drawerEyebrow: {
    fontSize: 10,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
    color: '#6f8ba7',
    fontWeight: 800,
    marginBottom: 8,
  },
  drawerTitle: {
    fontFamily: 'var(--display)',
    fontSize: 22,
    lineHeight: 1.08,
    color: '#17314a',
    marginBottom: 10,
    letterSpacing: '-0.04em',
  },
  drawerText: {
    color: '#617a92',
    fontSize: 13,
    lineHeight: 1.55,
    maxWidth: 270,
  },
  drawerLinks: { display: 'grid', gap: 10, marginTop: 14, justifyItems: 'center', alignContent: 'start', flex: 1 },
  drawerLink: {
    border: '1px solid rgba(26,58,143,0.08)',
    background: 'linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)',
    textAlign: 'left',
    color: '#17314a',
    fontSize: 15,
    fontWeight: 650,
    padding: '12px 14px',
    borderRadius: 16,
    boxShadow: '0 8px 18px rgba(26,58,143,0.04)',
    width: '100%',
    maxWidth: 296,
    transition: 'all .16s ease',
  },
  drawerFooter: { marginTop: 'auto', paddingTop: 18 },
  drawerAccountCard: {
    background: 'linear-gradient(135deg, #082237 0%, #103454 62%, #2f81be 100%)',
    color: '#fff',
    borderRadius: 18,
    padding: 15,
    boxShadow: '0 12px 24px rgba(8,34,55,0.16)',
    maxWidth: 296,
    margin: '0 auto',
  },
  drawerAccountEyebrow: {
    fontSize: 10,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    color: 'rgba(220,239,255,0.72)',
    fontWeight: 800,
    marginBottom: 8,
  },
  drawerAccountTitle: {
    fontFamily: 'var(--display)',
    fontSize: 18,
    lineHeight: 1.15,
    marginBottom: 8,
  },
  drawerAccountText: {
    color: 'rgba(236,247,255,0.8)',
    fontSize: 12.5,
    lineHeight: 1.55,
  },
  drawerAccountActions: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    marginTop: 14,
    flexWrap: 'nowrap',
    width: '100%',
  },
  drawerPrimaryCta: {
    flex: '1 1 0',
    minWidth: 0,
    border: 'none',
    borderRadius: 999,
    padding: '11px 14px',
    background: '#ffffff',
    color: '#103454',
    fontSize: 13,
    fontWeight: 800,
    whiteSpace: 'nowrap',
  },
  drawerSecondaryCta: {
    flex: '1 1 0',
    minWidth: 0,
    border: '1px solid rgba(255,255,255,0.22)',
    borderRadius: 999,
    padding: '11px 14px',
    background: 'transparent',
    color: '#fff',
    fontSize: 13,
    fontWeight: 700,
    whiteSpace: 'nowrap',
  },
  drawerLogin: {
    flex: 1,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 999,
    background: 'transparent',
    color: '#fff',
    fontWeight: 700,
    fontSize: 13,
    padding: '11px 14px',
    whiteSpace: 'nowrap',
  },
  drawerSignup: {
    flex: 1,
    border: 'none',
    borderRadius: 999,
    padding: '11px 14px',
    background: '#ffffff',
    color: '#082237',
    fontSize: 13,
    fontWeight: 800,
    whiteSpace: 'nowrap',
  },
  panelWrap: {
    position: 'fixed',
    top: 92,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'center',
    padding: '0 14px',
    zIndex: 121,
    pointerEvents: 'none',
  },
  panelCard: {
    width: 'min(1680px, calc(100vw - 48px))',
    background: '#f9fcff',
    borderRadius: 28,
    border: '1px solid rgba(26,58,143,0.08)',
    boxShadow: '0 28px 60px rgba(4,18,32,0.28)',
    padding: 38,
    pointerEvents: 'auto',
  },
  panelGrid: { display: 'grid', gridTemplateColumns: '1.05fr 1fr', gap: 42, alignItems: 'start' },
  panelEyebrow: { fontSize: 12, letterSpacing: 2.4, textTransform: 'uppercase', color: '#5a78a1', fontWeight: 800, marginBottom: 16 },
  panelTitle: { fontFamily: 'var(--display)', fontSize: 56, lineHeight: 1.02, letterSpacing: '-0.045em', color: '#1b2940', marginBottom: 20, maxWidth: 580 },
  panelSubtitle: { maxWidth: 640, color: '#5b6f86', fontSize: 18, lineHeight: 1.72, marginBottom: 34 },
  linkGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, columnGap: 34 },
  panelLink: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, border: '1px solid transparent', borderRadius: 16, background: 'transparent', color: '#2b4663', fontSize: 16, textAlign: 'left', padding: '12px 16px', fontWeight: 500, transition: 'all .16s ease' },
  panelLinkArrow: { color: '#3b84ba', fontSize: 15, transition: 'all .16s ease' },
  searchShell: {
    display: 'grid', gridTemplateColumns: '1fr 56px', borderRadius: 16, overflow: 'hidden',
    border: '1px solid rgba(26,58,143,0.14)', background: '#ffffff',
    boxShadow: '0 16px 32px rgba(26,58,143,0.08)', marginBottom: 20,
  },
  searchInput: { border: 'none', outline: 'none', padding: '0 18px', height: 56, fontSize: 18, color: '#21354d', background: 'transparent' },
  searchButton: { border: 'none', background: '#082237', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
  searchResults: { position: 'absolute', top: 'calc(100% + 10px)', left: 0, right: 0, background: '#ffffff', border: '1px solid rgba(26,58,143,0.1)', borderRadius: 18, boxShadow: '0 20px 42px rgba(4,18,32,0.12)', padding: 8, zIndex: 3 },
  searchResultItem: { width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, border: '1px solid transparent', borderRadius: 14, padding: '12px 14px', textAlign: 'left', transition: 'all .14s ease' },
  searchResultTitle: { color: '#17314a', fontSize: 14, fontWeight: 700, marginBottom: 3 },
  searchResultMeta: { color: '#6a8097', fontSize: 12, fontWeight: 600 },
  searchResultArrow: { color: '#3b84ba', fontSize: 15, fontWeight: 700 },
  searchEmpty: { padding: '14px 16px', color: '#6a8097', fontSize: 13, fontWeight: 600 },
  visualCard: { position: 'relative', minHeight: 290, borderRadius: 24, overflow: 'hidden', backgroundSize: 'cover', backgroundPosition: 'center' },
  visualShade: { position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(6,24,39,0.08) 0%, rgba(6,24,39,0.24) 36%, rgba(6,24,39,0.42) 100%)' },
  visualText: { position: 'relative', zIndex: 1, minHeight: 290, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 28 },
  visualBadge: { alignSelf: 'flex-start', padding: '8px 14px', borderRadius: 999, background: 'rgba(255,255,255,0.16)', color: '#fff', fontSize: 13, fontWeight: 700, backdropFilter: 'blur(8px)' },
  visualCta: { alignSelf: 'center', display: 'inline-flex', alignItems: 'center', gap: 10, border: 'none', borderRadius: 16, padding: '14px 22px', background: '#ffffff', color: '#17314a', fontSize: 15, fontWeight: 700, boxShadow: '0 12px 28px rgba(4,18,32,0.18)' },
  panelClose: { marginTop: 18, border: 'none', background: 'transparent', color: '#506a86', fontSize: 14, fontWeight: 700 },
  profilePopup: { position: 'absolute', right: 0, top: 56, width: 280, borderRadius: 18, overflow: 'hidden', background: '#0b2740', border: '1px solid rgba(120,180,220,0.12)', boxShadow: '0 24px 42px rgba(4,18,32,0.32)' },
  profileHeader: { padding: 18, borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(135deg, rgba(59,159,216,0.14), rgba(26,58,143,0.18))' },
  profileHeaderRow: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 },
  profileTitle: { color: '#fff', fontWeight: 800, fontSize: 16, marginBottom: 4 },
  profileSubtitle: { color: '#90b7d9', fontSize: 12, fontWeight: 700 },
  profileSettingsButton: {
    width: 34,
    height: 34,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    border: '1px solid rgba(255,255,255,0.14)',
    background: 'rgba(255,255,255,0.06)',
    color: '#dbe7f6',
    flexShrink: 0,
  },
  popupItem: { width: '100%', display: 'flex', alignItems: 'center', gap: 12, border: 'none', borderRadius: 12, padding: '12px 12px', textAlign: 'left', fontSize: 14, fontWeight: 600 },
  popupIcon: { width: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  svg: { width: 20, height: 20, display: 'block' },
}

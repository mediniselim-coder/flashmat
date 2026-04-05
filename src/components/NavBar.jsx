import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import LoginModal from './LoginModal'

const PRIMARY_ITEMS = [
  {
    id: 'services',
    label: 'Services',
    shortLabel: 'Services',
    icon: ServicesIcon,
    title: 'Services FlashMat',
    subtitle: 'Tous les services auto de votre plateforme dans un popup plus app et plus utile.',
    searchPlaceholder: 'Rechercher un service...',
    cta: 'Voir les services',
    accent: 'Services et entretien',
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

export default function NavBar({ activePage }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, profile, signOut } = useAuth()
  const [loginOpen, setLoginOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [panelOpen, setPanelOpen] = useState(null)
  const [hoveredIcon, setHoveredIcon] = useState(null)
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
      { icon: <DashboardIcon />, label: 'Tableau de bord', action: () => navigateTo('/app/client') },
      { icon: <CarIcon />, label: 'Mes vehicules', action: () => navigateTo('/app/client') },
      { icon: <CalendarIcon />, label: 'Mes reservations', action: () => navigateTo('/app/client') },
      { icon: <MarketplaceIcon />, label: 'Marketplace', action: () => navigateTo('/app/marketplace') },
    ]
  }, [isProvider, navigate, profile, user])

  const activePanel = PRIMARY_ITEMS.find((item) => item.id === panelOpen) || null

  return (
    <>
      <div ref={rootRef} style={styles.root}>
        <nav style={styles.nav}>
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
              <img src="/logo.jpg" alt="FlashMat" style={{ height: 40, objectFit: 'contain' }} />
            </button>
          </div>

          <div style={styles.centerGroup}>
            {PRIMARY_ITEMS.map((item) => {
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
            <button type="button" onClick={() => navigateTo('/urgence')} style={activePage === 'urgence' ? styles.urgentButtonActive : styles.urgentButton}>
              FlashFix Urgence
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
                  <span style={styles.accountText}>{displayName}</span>
                </button>

                {profileOpen && (
                  <div style={styles.profilePopup}>
                    <div style={styles.profileHeader}>
                      <div style={styles.profileTitle}>{displayName}</div>
                      <div style={styles.profileSubtitle}>{isProvider ? 'Profil fournisseur' : 'Profil client'}</div>
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
              <>
                <button type="button" onClick={() => setLoginOpen(true)} style={styles.loginLink}>
                  <UserIcon />
                  <span>Login</span>
                </button>
                <button type="button" onClick={() => setLoginOpen(true)} style={styles.signupButton}>
                  Sign Up
                </button>
              </>
            )}
          </div>
        </nav>
      </div>

      {(menuOpen || activePanel) && <div style={styles.scrim} onClick={closeFloatingUi} />}

      {menuOpen && (
        <div style={styles.drawer}>
          <div style={styles.drawerHeader}>
            <img src="/logo.jpg" alt="FlashMat" style={{ height: 62, objectFit: 'contain' }} />
            <button type="button" style={styles.drawerClose} onClick={() => setMenuOpen(false)}>Fermer</button>
          </div>
          <div style={styles.drawerLinks}>
            {MENU_SECTIONS.map((item) => (
              <button key={item.label} type="button" style={styles.drawerLink} onClick={() => navigateTo(item.to)}>
                {item.label}
              </button>
            ))}
          </div>
          {!user && (
            <div style={styles.drawerFooter}>
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
      )}

      {activePanel && (
        <div style={styles.panelWrap}>
          <AppPanel
            item={activePanel}
            onNavigate={navigateTo}
            onClose={() => setPanelOpen(null)}
          />
        </div>
      )}

      {loginOpen && <LoginModal onClose={() => setLoginOpen(false)} />}
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

function HoverLabel({ visible, label }) {
  return (
    <span style={{ ...styles.hoverLabel, opacity: visible ? 1 : 0, transform: visible ? 'translate(-50%, 0)' : 'translate(-50%, 6px)' }}>
      {label}
    </span>
  )
}

function AppPanel({ item, onNavigate, onClose }) {
  return (
    <div style={styles.panelCard}>
      <div style={styles.panelGrid}>
        <div>
          <div style={styles.panelEyebrow}>FlashMat Hub</div>
          <h2 style={styles.panelTitle}>{item.title}</h2>
          <p style={styles.panelSubtitle}>{item.subtitle}</p>
          <div style={styles.linkGrid}>
            {item.links.map((link) => (
              <button key={link.label} type="button" style={styles.panelLink} onClick={() => onNavigate(link.to)}>
                {link.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div style={styles.searchShell}>
            <input readOnly value="" placeholder={item.searchPlaceholder} style={styles.searchInput} />
            <button type="button" style={styles.searchButton} onClick={() => onNavigate(item.links[0]?.to || '/')}>
              <SearchIcon />
            </button>
          </div>
          <div style={styles.visualCard}>
            <div style={styles.visualGlow} />
            <div style={styles.visualText}>
              <div style={styles.visualBadge}>{item.accent}</div>
              <button type="button" style={styles.visualCta} onClick={() => onNavigate(item.links[0]?.to || '/')}>
                {item.cta}
                <MapPinIcon />
              </button>
            </div>
          </div>
        </div>
      </div>
      <button type="button" onClick={onClose} style={styles.panelClose}>Fermer</button>
    </div>
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
  rightGroup: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12 },
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
    top: 86,
    left: 22,
    width: 320,
    minHeight: 620,
    background: '#ffffff',
    borderRadius: 24,
    border: '1px solid rgba(26,58,143,0.08)',
    boxShadow: '0 32px 70px rgba(4,18,32,0.28)',
    zIndex: 121,
    padding: 28,
    display: 'flex',
    flexDirection: 'column',
  },
  drawerHeader: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 10, marginBottom: 36 },
  drawerClose: { border: 'none', background: 'transparent', color: '#47617b', fontWeight: 700, fontSize: 13, padding: 0 },
  drawerLinks: { display: 'grid', gap: 26, marginTop: 14 },
  drawerLink: { border: 'none', background: 'transparent', textAlign: 'left', color: '#17314a', fontSize: 18, fontWeight: 700, padding: 0 },
  drawerFooter: { marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14 },
  drawerLogin: { display: 'inline-flex', alignItems: 'center', gap: 8, border: 'none', background: 'transparent', color: '#17314a', fontWeight: 700, fontSize: 16 },
  drawerSignup: { border: 'none', borderRadius: 999, padding: '14px 28px', background: '#07253d', color: '#fff', fontSize: 16, fontWeight: 800 },
  panelWrap: {
    position: 'fixed',
    top: 92,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'center',
    padding: '0 24px',
    zIndex: 121,
    pointerEvents: 'none',
  },
  panelCard: {
    width: 'min(1680px, calc(100vw - 48px))',
    background: '#f9fcff',
    borderRadius: 28,
    border: '1px solid rgba(26,58,143,0.08)',
    boxShadow: '0 28px 60px rgba(4,18,32,0.28)',
    padding: 28,
    pointerEvents: 'auto',
  },
  panelGrid: { display: 'grid', gridTemplateColumns: '1.05fr 1fr', gap: 28, alignItems: 'start' },
  panelEyebrow: { fontSize: 12, letterSpacing: 2.4, textTransform: 'uppercase', color: '#5a78a1', fontWeight: 800, marginBottom: 12 },
  panelTitle: { fontFamily: 'var(--display)', fontSize: 56, lineHeight: 1.02, letterSpacing: '-0.04em', color: '#1b2940', marginBottom: 18, maxWidth: 580 },
  panelSubtitle: { maxWidth: 640, color: '#5b6f86', fontSize: 18, lineHeight: 1.7, marginBottom: 26 },
  linkGrid: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 },
  panelLink: { border: 'none', background: 'transparent', color: '#243b55', fontSize: 16, textAlign: 'left', padding: '10px 0' },
  searchShell: {
    display: 'grid', gridTemplateColumns: '1fr 56px', borderRadius: 16, overflow: 'hidden',
    border: '1px solid rgba(26,58,143,0.14)', background: '#ffffff',
    boxShadow: '0 16px 32px rgba(26,58,143,0.08)', marginBottom: 20,
  },
  searchInput: { border: 'none', outline: 'none', padding: '0 18px', height: 56, fontSize: 18, color: '#21354d', background: 'transparent' },
  searchButton: { border: 'none', background: '#082237', color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
  visualCard: { position: 'relative', minHeight: 290, borderRadius: 24, overflow: 'hidden', background: 'linear-gradient(135deg, #103454 0%, #1d537f 48%, #58afe4 100%)' },
  visualGlow: { position: 'absolute', inset: 0, background: 'radial-gradient(circle at top right, rgba(255,255,255,0.3), transparent 40%), radial-gradient(circle at bottom left, rgba(90,184,240,0.3), transparent 36%)' },
  visualText: { position: 'relative', zIndex: 1, minHeight: 290, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 28 },
  visualBadge: { alignSelf: 'flex-start', padding: '8px 14px', borderRadius: 999, background: 'rgba(255,255,255,0.16)', color: '#fff', fontSize: 13, fontWeight: 700 },
  visualCta: { alignSelf: 'center', display: 'inline-flex', alignItems: 'center', gap: 10, border: 'none', borderRadius: 16, padding: '14px 22px', background: '#ffffff', color: '#17314a', fontSize: 15, fontWeight: 700, boxShadow: '0 12px 28px rgba(4,18,32,0.18)' },
  panelClose: { marginTop: 18, border: 'none', background: 'transparent', color: '#506a86', fontSize: 14, fontWeight: 700 },
  profilePopup: { position: 'absolute', right: 0, top: 56, width: 280, borderRadius: 18, overflow: 'hidden', background: '#0b2740', border: '1px solid rgba(120,180,220,0.12)', boxShadow: '0 24px 42px rgba(4,18,32,0.32)' },
  profileHeader: { padding: 18, borderBottom: '1px solid rgba(255,255,255,0.08)', background: 'linear-gradient(135deg, rgba(59,159,216,0.14), rgba(26,58,143,0.18))' },
  profileTitle: { color: '#fff', fontWeight: 800, fontSize: 16, marginBottom: 4 },
  profileSubtitle: { color: '#90b7d9', fontSize: 12, fontWeight: 700 },
  popupItem: { width: '100%', display: 'flex', alignItems: 'center', gap: 12, border: 'none', borderRadius: 12, padding: '12px 12px', textAlign: 'left', fontSize: 14, fontWeight: 600 },
  popupIcon: { width: 18, height: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  svg: { width: 20, height: 20, display: 'block' },
}

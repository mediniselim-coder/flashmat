import { useState, useRef, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import LoginModal from './LoginModal'

export default function NavBar({ activePage }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, profile, signOut } = useAuth()
  const [popupOpen, setPopupOpen] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)
  const popupRef = useRef(null)

  // Ferme le popup profil si on clique ailleurs
  useEffect(() => {
    function handleClick(e) {
      if (popupRef.current && !popupRef.current.contains(e.target)) {
        setPopupOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
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
    if (params.get('login') === '1' && !user) {
      setLoginOpen(true)
    }
  }, [location.search, user])

  async function handleSignOut() {
    await signOut()
    setPopupOpen(false)
    navigate('/')
  }

  const isProvider = profile?.role === 'provider'
  const displayName = profile?.full_name || user?.email?.split('@')[0] || 'Mon compte'

  function openMarketplace() {
    if (!user || !profile) {
      setLoginOpen(true)
      return
    }

    if (profile.role === 'provider') {
      navigate('/app/provider')
      return
    }

    navigate('/app/marketplace')
  }

  const navLinkStyle = (page) => ({
    cursor: 'pointer', fontSize: 14, fontWeight: 500,
    color: activePage === page ? '#1a1a1a' : '#555',
    borderBottom: activePage === page ? '2px solid #22c55e' : '2px solid transparent',
    paddingBottom: 2, transition: 'color 0.2s',
  })

  return (
    <>
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 32px', height: 64, background: '#fff',
        borderBottom: '1px solid #eee', position: 'sticky', top: 0, zIndex: 100,
      }}>

        {/* LOGO */}
        <div style={{ cursor: 'pointer' }} onClick={() => navigate('/')}>
          <img src="/logo.jpg" alt="FlashMat" style={{ height: 40, objectFit: 'contain' }} />
        </div>

        {/* LIENS */}
        <div style={{ display: 'flex', gap: 32 }}>
          <span style={navLinkStyle('home')} onClick={() => navigate('/')}>Accueil</span>
          <span style={navLinkStyle('services')} onClick={() => navigate('/services')}>Services</span>
          <span style={navLinkStyle('marketplace')} onClick={openMarketplace}>Marketplace</span>
        </div>

        {/* DROITE */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {user && profile ? (
            /* CONNECTÉ — icône profil + popup */
            <div ref={popupRef} style={{ position: 'relative' }}>
              <div
                onClick={() => setPopupOpen(o => !o)}
                style={{
                  width: 40, height: 40, borderRadius: '50%',
                  background: isProvider ? '#eff6ff' : '#f0fdf4',
                  border: isProvider ? '2px solid #3b82f6' : '2px solid #22c55e',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', fontSize: 18, userSelect: 'none',
                  transition: 'transform 0.15s',
                  transform: popupOpen ? 'scale(1.08)' : 'scale(1)',
                }}
                title={displayName}
              >
                {isProvider ? '🏪' : '🚗'}
              </div>

              {/* POPUP PROFIL */}
              {popupOpen && (
                <div style={{
                  position: 'absolute', top: 52, right: 0,
                  background: '#fff', borderRadius: 16,
                  boxShadow: '0 8px 40px rgba(0,0,0,0.14)',
                  width: 240, zIndex: 200, overflow: 'hidden',
                  border: '1px solid #f0f0f0',
                  animation: 'fadeInDown 0.15s ease',
                }}>
                  {/* HEADER */}
                  <div style={{
                    padding: '18px 20px 14px',
                    borderBottom: '1px solid #f5f5f5',
                    background: isProvider ? '#f0f6ff' : '#f0fdf4',
                  }}>
                    <div style={{ fontWeight: 700, fontSize: 16, color: '#1a1a1a' }}>{displayName}</div>
                    <div style={{ fontSize: 12, color: isProvider ? '#3b82f6' : '#22c55e', fontWeight: 600, marginTop: 2 }}>
                      {isProvider ? 'Profil Fournisseur' : 'Profil Client'}
                    </div>
                  </div>

                  {/* LIENS CLIENT */}
                  {!isProvider && (
                    <div style={{ padding: '8px 0' }}>
                      {[
                        { icon: '📊', label: 'Tableau de bord', action: () => { navigate('/app/client'); setPopupOpen(false) } },
                        { icon: '🚗', label: 'Mes véhicules',   action: () => { navigate('/app/client'); setPopupOpen(false) } },
                        { icon: '📅', label: 'Mes réservations',action: () => { navigate('/app/client'); setPopupOpen(false) } },
                        { icon: '🛒', label: 'Marketplace',     action: () => { navigate('/app/marketplace'); setPopupOpen(false) } },
                        { icon: 'ℹ️', label: 'Aide & support',  action: () => setPopupOpen(false) },
                      ].map(item => (
                        <PopupItem key={item.label} icon={item.icon} label={item.label} onClick={item.action} />
                      ))}
                    </div>
                  )}

                  {/* LIENS FOURNISSEUR */}
                  {isProvider && (
                    <div style={{ padding: '8px 0' }}>
                      {[
                        { icon: '📈', label: 'Dashboard',             action: () => { navigate('/app/provider'); setPopupOpen(false) } },
                        { icon: '📋', label: 'Mes jobs',              action: () => { navigate('/app/provider'); setPopupOpen(false) } },
                        { icon: '🔧', label: 'Mes services',          action: () => { navigate('/app/provider'); setPopupOpen(false) } },
                        { icon: '👥', label: 'Clients',               action: () => { navigate('/app/provider'); setPopupOpen(false) } },
                        { icon: '💰', label: 'Mes promotions',        action: () => { navigate('/app/provider'); setPopupOpen(false) } },
                        { icon: '🏪', label: 'Vendre sur Marketplace',action: () => { navigate('/app/provider'); setPopupOpen(false) } },
                        { icon: '✏️', label: 'Modifier profil',       action: () => { navigate('/app/provider'); setPopupOpen(false) } },
                        { icon: 'ℹ️', label: 'Aide & support',        action: () => setPopupOpen(false) },
                      ].map(item => (
                        <PopupItem key={item.label} icon={item.icon} label={item.label} onClick={item.action} />
                      ))}
                    </div>
                  )}

                  {/* DÉCONNEXION */}
                  <div style={{ borderTop: '1px solid #f5f5f5', padding: '8px 0 4px' }}>
                    <PopupItem icon="🚪" label="Se déconnecter" onClick={handleSignOut} danger />
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* NON CONNECTÉ — boutons */
            <>
              <button
                onClick={() => setLoginOpen(true)}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500 }}
              >
                Espace Fournisseur
              </button>
              <button
                onClick={() => setLoginOpen(true)}
                style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#22c55e', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
              >
                Connexion
              </button>
            </>
          )}
        </div>

        <style>{`
          @keyframes fadeInDown {
            from { opacity: 0; transform: translateY(-8px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </nav>

      {/* POPUP LOGIN */}
      {loginOpen && <LoginModal onClose={() => setLoginOpen(false)} />}
    </>
  )
}

function PopupItem({ icon, label, onClick, danger }) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '9px 20px', cursor: 'pointer', fontSize: 14,
        color: danger ? '#ef4444' : '#1a1a1a',
        background: hover ? (danger ? '#fff5f5' : '#f9f9f9') : 'transparent',
        transition: 'background 0.15s',
      }}
    >
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span>{label}</span>
    </div>
  )
}

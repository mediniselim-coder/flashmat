import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { supabase } from '../lib/supabase'
import FlashAI from '../components/FlashAI'
import ProviderMap from '../components/ProviderMap'
import BookingModal from '../components/BookingModal'
import AddVehicleModal from '../components/AddVehicleModal'
import Marketplace from '../components/Marketplace'
import VehicleDoctor from '../components/VehicleDoctor'
import AppIcon from '../components/AppIcon'
import { FLASHFIX_UPDATED_EVENT, getFlashFixStageProgress, getFlashFixStatusMeta, readFlashFixRequests } from '../lib/flashfix'
import { createBooking, fetchClientBookings } from '../lib/bookings'
import { mergeProviderProfile } from '../lib/providerProfiles'
import styles from './AppShell.module.css'

const NAV = [
  { id: 'dashboard',     icon: 'TB', label: 'Dashboard' },
  { id: 'bookings',      icon: 'RS', label: 'Bookings', badge: true },
  { id: 'search',        icon: 'SV', label: 'Find a Service' },
  { id: 'vehicles',      icon: 'VH', label: 'My Vehicles' },
  { id: 'maintenance',   icon: 'EN', label: 'Maintenance' },
  { id: 'marketplace',   icon: 'MP', label: 'Marketplace' },
  { id: 'flashscore',    icon: 'FS', label: 'FlashScore' },
  { id: 'notifications', icon: 'AL', label: 'Alerts', badge: true },
]

const SEARCH_CATS = [
  ['all', 'All'],
  ['mechanic', 'Mechanics'],
  ['wash', 'Car Wash'],
  ['tire', 'Tires'],
  ['body', 'Bodywork'],
  ['glass', 'Glass'],
  ['tow', 'Towing'],
  ['parts', 'Parts'],
  ['parking', 'Parking'],
]

function readPendingServiceSearch() {
  try {
    const raw = window.sessionStorage.getItem('flashmat-pending-service-search')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.cat ? parsed : null
  } catch {
    return null
  }
}

function clearPendingServiceSearch() {
  window.sessionStorage.removeItem('flashmat-pending-service-search')
}

function formatFlashFixTime(value) {
  if (!value) return 'Now'
  try {
    return new Date(value).toLocaleString('fr-CA', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  } catch { return value }
}

function getTimelineLabel(step) {
  const labels = { pending: 'Requested', accepted: 'Accepted', en_route: 'On the way', onsite: 'On site', completed: 'Completed' }
  return labels[step] || step
}

function getClientSafeFlashFixEventLabel(eventLabel, status) {
  if (status === 'accepted') return 'A FlashFix provider accepted your request'
  if (status === 'en_route') return 'Your FlashFix provider is on the way'
  if (status === 'onsite') return 'Your FlashFix provider arrived on site'
  if (status === 'completed') return 'FlashFix service completed'
  if (status === 'refused') return 'The request is being reassigned'
  return eventLabel
}

export default function ClientApp() {
  const { profile, user, signOut } = useAuth()
  const [myVehicles, setMyVehicles] = useState([])
  const [notifications, setNotifications] = useState([])
  const [addVehicleModal, setAddVehicleModal] = useState(false)
  useEffect(() => { if (user?.id) { supabase.from('vehicles').select('*').eq('owner_id', user.id).then(({ data }) => setMyVehicles(data || [])) } }, [user])
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const routeParams = new URLSearchParams(location.search)
  const routePane = routeParams.get('pane')
  const routeCat = routeParams.get('cat')
  const pendingSearch = readPendingServiceSearch()
  const initialPane = routePane || pendingSearch?.pane || location.state?.pane || 'dashboard'
  const initialSearchCat = routeCat || pendingSearch?.cat || location.state?.searchCat || 'all'
  const [pane, setPane] = useState(initialPane)
  const [sidebarOpen, setSidebar] = useState(false)
  const [bookingModal, setBookingModal] = useState(false)
  const [selectedBookingProvider, setSelectedBookingProvider] = useState(null)
  const [providers, setProviders] = useState([])
  const [bookings, setBookings] = useState([])
  const [provLoading, setProvLoading] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [searchCat, setSearchCat] = useState(initialSearchCat)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [flashFixRequests, setFlashFixRequests] = useState([])

  const name = profile?.full_name || 'Alex'
  const activeFlashFixRequests = flashFixRequests.filter((r) => r.channel === 'flashfix' && r.status !== 'completed')
  const latestFlashFixEvents = flashFixRequests
    .filter((r) => r.channel === 'flashfix')
    .flatMap((r) => (r.events || []).map((e) => ({ ...e, requestId: r.id, issueLabel: r.issueLabel, status: r.status, providerName: r.providerName })))
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 6)

  useEffect(() => { fetchProviders() }, [])
  useEffect(() => { if (!user?.id) return; fetchMyBookings() }, [user?.id])

  useEffect(() => {
    async function fetchNotifications() {
      if (!user?.id) return
      try {
        const { data } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20)
        setNotifications(data || [])
      } catch { setNotifications([]) }
    }
    fetchNotifications()
  }, [user?.id])

  useEffect(() => {
    function syncFlashFixRequests() { setFlashFixRequests(readFlashFixRequests()) }
    syncFlashFixRequests()
    window.addEventListener('storage', syncFlashFixRequests)
    window.addEventListener(FLASHFIX_UPDATED_EVENT, syncFlashFixRequests)
    return () => { window.removeEventListener('storage', syncFlashFixRequests); window.removeEventListener(FLASHFIX_UPDATED_EVENT, syncFlashFixRequests) }
  }, [])

  useEffect(() => { if (location.pathname === '/app/marketplace') setPane('marketplace') }, [location.pathname])

  useEffect(() => {
    if (routePane) setPane(routePane)
    if (routeCat) { setSearchCat(routeCat); clearPendingServiceSearch(); return }
    if (location.pathname.startsWith('/app/client') && pendingSearch?.cat) {
      setPane(pendingSearch.pane || 'search'); setSearchCat(pendingSearch.cat); clearPendingServiceSearch()
    }
  }, [location.pathname, pendingSearch, routePane, routeCat])

  async function fetchProviders() {
    setProvLoading(true)
    const { data } = await supabase.from('providers').select('*').order('rating', { ascending: false }).limit(100)
    setProviders((data || []).map((p) => mergeProviderProfile(p)).filter((p) => p.publicReady))
    setProvLoading(false)
  }

  async function fetchMyBookings() {
    try { const b = await fetchClientBookings(user.id); setBookings(b) } catch { setBookings([]) }
  }

  const filtered = providers.filter(p => {
    const matchCat = searchCat === 'all' || p.serviceCategories?.includes(searchCat)
    const q = searchQ.toLowerCase()
    const matchQ = !q || p.name?.toLowerCase().includes(q) || p.type_label?.toLowerCase().includes(q) || p.address?.toLowerCase().includes(q) || p.services?.some((s) => s.toLowerCase().includes(q))
    return matchCat && matchQ
  })

  function go(id) { setPane(id); setSidebar(false) }
  function openBooking(provider = null) {
    if (!myVehicles.length) { toast('Add a vehicle first to book a service', 'error'); setAddVehicleModal(true); return }
    setSelectedBookingProvider(provider); setBookingModal(true)
  }
  function goHome() { setSidebar(false); navigate('/') }
  function goFromProfileMenu(id) { setProfileMenuOpen(false); go(id) }
  async function handleSignOut() { setProfileMenuOpen(false); await signOut(); navigate('/') }

  async function handleBookingConfirm(payload) {
    if (!user?.id) throw new Error('Client login required')
    const createdBooking = await createBooking({ clientId: user.id, providerId: payload.provider.id, vehicleId: payload.vehicle?.id, service: payload.service, serviceIcon: payload.serviceIcon, date: payload.date, timeSlot: payload.timeSlot, notes: payload.notes, price: payload.price })
    setBookings((current) => [createdBooking, ...current]); setSelectedBookingProvider(null); setPane('bookings'); toast('Booking confirmed', 'success')
  }

  const averageFlashScore = myVehicles.length ? Math.round(myVehicles.reduce((sum, v) => sum + Number(v.flash_score || 0), 0) / myVehicles.length) : 0
  const nextServiceLabel = myVehicles[0] ? 'Recommended soon' : 'Add a vehicle'
  const maintenanceItems = myVehicles.slice(0, 3).map((v, i) => ({ icon: ['VG', 'PN', 'BT'][i] || 'ME', title: i === 0 ? 'Oil change recommended' : i === 1 ? 'Tire inspection' : 'Battery test', meta: `${v.make} ${v.model} ${v.year}` }))
  const flashScoreCards = myVehicles.map((v) => {
    const score = Number(v.flash_score || 80)
    return { make: v.make, model: v.model, year: v.year, score, items: [['Engine', Math.min(99, score + 6), 'green'], ['Brakes', Math.min(98, score + 3), score >= 80 ? 'green' : 'amber'], ['Tires', Math.max(55, score - 4), score >= 75 ? 'blue' : 'amber'], ['Battery', Math.min(97, score + 2), 'blue'], ['Oil', Math.max(40, score - 8), score >= 85 ? 'green' : 'amber']] }
  })

  function slugify(name) {
    return name.toLowerCase().replace(/[àáâã]/g,'a').replace(/[éèêë]/g,'e').replace(/[îï]/g,'i').replace(/[ôö]/g,'o').replace(/[ùûü]/g,'u').replace(/ç/g,'c').replace(/[^a-z0-9\s-]/g,'').replace(/\s+/g,'-').replace(/-+/g,'-').trim()
  }

  return (
    <div className={styles.shell}>
      {sidebarOpen && <div className={styles.overlay} onClick={() => setSidebar(false)} />}
      {profileMenuOpen && <div className={styles.overlay} onClick={() => setProfileMenuOpen(false)} />}

      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sbHeader}>
          <div className={styles.sbLogo} onClick={goHome} style={{ cursor: 'pointer' }}>
            <img src="/logo-dark.png" alt="FlashMat" style={{ height: 36, objectFit: 'contain' }} />
          </div>
          <span className={`${styles.sbMode} ${styles.modeClient}`}>CLIENT</span>
        </div>
        <nav className={styles.sbNav}>
          <div className={styles.sbSection}>
            <div className={styles.sbLbl}>Core</div>
            {NAV.slice(0,4).map(n => (
              <button key={n.id} className={`${styles.navItem} ${pane===n.id?styles.navActive:''}`} onClick={() => go(n.id)}>
                <span className={styles.ni}><AppIcon code={n.icon} /></span>{n.label}
              </button>
            ))}
          </div>
          <div className={styles.sbSection}>
            <div className={styles.sbLbl}>Tools</div>
            {NAV.slice(4).map(n => (
              <button key={n.id} className={`${styles.navItem} ${pane===n.id?styles.navActive:''}`} onClick={() => go(n.id)}>
                <span className={styles.ni}><AppIcon code={n.icon} /></span>{n.label}
              </button>
            ))}
          </div>
        </nav>
        <div className={styles.sbBottom}>
          <div className={styles.profileMenuWrap}>
            {profileMenuOpen && (
              <div className={styles.profileMenu}>
                <div className={styles.profileMenuHeader}>
                  <div className={styles.profileMenuName}>{name}</div>
                  <div className={styles.profileMenuRole}>Client Profile</div>
                </div>
                <button className={styles.profileMenuItem} onClick={goHome}><span><AppIcon code="AC" /></span><span>Home</span></button>
                <button className={styles.profileMenuItem} onClick={() => goFromProfileMenu('dashboard')}><span><AppIcon code="TB" /></span><span>Dashboard</span></button>
                <button className={styles.profileMenuItem} onClick={() => goFromProfileMenu('vehicles')}><span><AppIcon code="VH" /></span><span>My Vehicles</span></button>
                <button className={styles.profileMenuItem} onClick={() => goFromProfileMenu('bookings')}><span><AppIcon code="RS" /></span><span>My Bookings</span></button>
                <button className={styles.profileMenuItem} onClick={() => goFromProfileMenu('marketplace')}><span><AppIcon code="MP" /></span><span>Marketplace</span></button>
                <button className={styles.profileMenuItem} onClick={() => setProfileMenuOpen(false)}><span><AppIcon code="AI" /></span><span>Help & Support</span></button>
                <div className={styles.profileMenuDivider} />
                <button className={`${styles.profileMenuItem} ${styles.profileMenuDanger}`} onClick={handleSignOut}><span><AppIcon code="SO" /></span><span>Sign Out</span></button>
              </div>
            )}
            <button type="button" className={styles.userChip} onClick={() => setProfileMenuOpen(open => !open)}>
              <div className={`${styles.avatar} ${styles.avatarGreen}`}>{name.slice(0,2).toUpperCase()}</div>
              <div><div className={styles.userName}>{name}</div><div className={styles.userRole}>client · montreal</div></div>
              <span style={{marginLeft:'auto',color:'var(--ink3)',fontSize:11}}>{profileMenuOpen ? '↓' : '←'}</span>
            </button>
          </div>
        </div>
      </aside>

      <div className={styles.main}>
        <div className={styles.mobileTopbar}>
          <button className={styles.menuBtn} onClick={() => setSidebar(true)}>☰</button>
          <img src="/logo-dark.png" alt="FlashMat" onClick={goHome} style={{ height: 28, objectFit: 'contain', cursor: 'pointer' }} />
          <button className="btn btn-green" style={{fontSize:11,padding:'7px 12px'}} onClick={() => openBooking()}>+ Book</button>
        </div>

        {pane === 'dashboard' && (
          <div>
            {/* HERO CAR BANNER */}
            <div style={{ position:'relative', height: myVehicles.length === 0 ? 340 : 220, overflow:'hidden', background:'linear-gradient(135deg, #0f1e3d 0%, #1a3a8f 60%, #2563eb 100%)' }}>
              <div style={{ position:'absolute', width:500, height:500, borderRadius:'50%', background:'radial-gradient(circle, rgba(59,159,216,.2), transparent 65%)', top:-100, right:-50, pointerEvents:'none' }} />
              <svg viewBox="0 0 1200 360" preserveAspectRatio="xMidYMax meet" style={{ position:'absolute', bottom:0, left:'50%', transform:'translateX(-50%)', width:'100%', maxWidth:860, pointerEvents:'none' }}>
                <defs>
                  <linearGradient id="carGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgba(255,255,255,0.08)"/>
                    <stop offset="50%" stopColor="rgba(255,255,255,0.18)"/>
                    <stop offset="100%" stopColor="rgba(255,255,255,0.06)"/>
                  </linearGradient>
                </defs>
                <path fill="url(#carGrad)" d="M 60,300 L 60,278 C 65,268 80,258 105,254 L 160,250 C 178,248 200,244 222,236 C 248,226 268,212 290,196 C 312,180 334,162 358,148 C 382,134 414,122 452,116 L 548,110 C 598,108 648,110 692,116 C 730,122 758,132 776,144 C 792,155 800,168 804,180 C 808,192 808,206 806,218 L 840,222 C 868,226 900,232 928,240 C 952,247 970,255 982,262 C 990,268 994,276 994,284 L 994,300 Z"/>
                <path fill="rgba(15,30,77,0.55)" d="M 358,148 C 382,134 414,122 452,116 L 510,112 L 500,136 C 468,140 438,148 412,160 C 390,170 372,184 360,196 Z"/>
                <path fill="rgba(15,30,77,0.45)" d="M 364,192 C 382,178 408,166 440,158 L 540,150 L 536,170 C 504,172 470,176 444,184 C 420,191 400,202 386,214 Z"/>
                <path fill="rgba(15,30,77,0.4)" d="M 544,150 L 596,146 C 622,145 648,148 666,154 C 676,158 682,164 682,172 L 680,186 C 660,184 632,180 604,178 L 540,174 Z"/>
                <circle cx="250" cy="300" r="78" fill="#0f1e3d"/>
                <circle cx="840" cy="300" r="86" fill="#0f1e3d"/>
                <circle cx="250" cy="300" r="74" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.25)" strokeWidth="3"/>
                <circle cx="250" cy="300" r="50" fill="rgba(255,255,255,0.07)"/>
                <circle cx="250" cy="300" r="18" fill="rgba(255,255,255,0.2)"/>
                {[0,60,120,180,240,300].map(a => (<line key={a} x1={250} y1={300} x2={250+48*Math.cos(a*Math.PI/180)} y2={300+48*Math.sin(a*Math.PI/180)} stroke="rgba(255,255,255,0.18)" strokeWidth="4"/>))}
                <circle cx="840" cy="300" r="82" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.25)" strokeWidth="3"/>
                <circle cx="840" cy="300" r="56" fill="rgba(255,255,255,0.07)"/>
                <circle cx="840" cy="300" r="20" fill="rgba(255,255,255,0.2)"/>
                {[0,60,120,180,240,300].map(a => (<line key={a} x1={840} y1={300} x2={840+54*Math.cos(a*Math.PI/180)} y2={300+54*Math.sin(a*Math.PI/180)} stroke="rgba(255,255,255,0.18)" strokeWidth="4"/>))}
                <rect x="988" y="172" width="42" height="6" rx="2" fill="rgba(255,255,255,0.18)"/>
                <rect x="1026" y="172" width="4" height="28" rx="2" fill="rgba(255,255,255,0.15)"/>
                <ellipse cx="80" cy="262" rx="16" ry="8" fill="rgba(255,255,255,0.35)"/>
                <rect x="988" y="252" width="6" height="28" rx="2" fill="rgba(59,159,216,0.7)"/>
                <line x1="60" y1="300" x2="994" y2="300" stroke="rgba(59,159,216,0.35)" strokeWidth="1"/>
                <ellipse cx="527" cy="308" rx="460" ry="10" fill="rgba(0,0,0,0.3)"/>
              </svg>
              <div style={{ position:'relative', zIndex:2, padding:'32px 28px 28px', height:'100%', display:'flex', flexDirection:'column', justifyContent: myVehicles.length === 0 ? 'space-between' : 'flex-end' }}>
                {myVehicles.length === 0 ? (
                  <>
                    <div>
                      <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'rgba(59,159,216,.9)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:10 }}>● FlashMat · Montreal</div>
                      <div style={{ fontFamily:'var(--display)', fontSize:28, fontWeight:800, color:'#fff', lineHeight:1.1, letterSpacing:'-.5px', marginBottom:8 }}>Welcome, {name}</div>
                      <div style={{ fontSize:14, color:'rgba(255,255,255,.6)', lineHeight:1.6, maxWidth:320 }}>Start by adding your vehicle to unlock your services, diagnosis, and bookings.</div>
                    </div>
                    <button className="btn btn-green btn-lg" style={{ alignSelf:'flex-start', fontSize:15, padding:'14px 28px' }} onClick={() => setAddVehicleModal(true)}>Add My Vehicle →</button>
                  </>
                ) : (
                  <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between' }}>
                    <div>
                      <div style={{ fontFamily:'var(--mono)', fontSize:10, color:'rgba(59,159,216,.9)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:6 }}>● My vehicles</div>
                      <div style={{ fontFamily:'var(--display)', fontSize:22, fontWeight:800, color:'#fff', letterSpacing:'-.5px' }}>{myVehicles[0].make} {myVehicles[0].model} {myVehicles[0].year}</div>
                      {myVehicles[0].plate && <div style={{ fontFamily:'var(--mono)', fontSize:11, color:'rgba(255,255,255,.5)', marginTop:4 }}>{myVehicles[0].plate}</div>}
                    </div>
                    <button className="btn" style={{ background:'rgba(255,255,255,.12)', border:'1px solid rgba(255,255,255,.2)', color:'#fff', fontSize:12 }} onClick={() => setAddVehicleModal(true)}>+ Add</button>
                  </div>
                )}
              </div>
            </div>

            <div className={styles.pad}>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:10, marginBottom:20 }}>
                {[
                  { icon:'RS', label:'Book', sub:'a service', action: () => openBooking(), color:'var(--green)' },
                  { icon:'SV', label:'Find', sub:'a provider', action: () => go('search'), color:'var(--blue)' },
                  { icon:'MP', label:'Marketplace', sub:'auto parts', action: () => go('marketplace'), color:'var(--amber)' },
                ].map(q => (
                  <button key={q.label} onClick={q.action}
                    style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12, padding:'14px 12px', cursor:'pointer', textAlign:'left', transition:'all .18s', boxShadow:'var(--shadow)' }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = q.color}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                    <div style={{ color:q.color, marginBottom:8, display:'inline-flex' }}><AppIcon code={q.icon} size={22} /></div>
                    <div style={{ fontWeight:700, fontSize:13, color:'var(--ink)' }}>{q.label}</div>
                    <div style={{ fontSize:11, color:'var(--ink3)' }}>{q.sub}</div>
                  </button>
                ))}
              </div>
              <div style={{ marginBottom: 20 }}><VehicleDoctor compact userName={name} /></div>
              <div className={styles.statsGrid}>
                <div className="stat-card sc-green"><div className="stat-lbl">Montreal Providers</div><div className="stat-val">{providers.length}</div><div className="stat-sub">available now</div></div>
                <div className="stat-card sc-blue"><div className="stat-lbl">FlashScore™</div><div className="stat-val">{myVehicles.length ? averageFlashScore : '—'}{myVehicles.length ? <span style={{fontSize:14}}>%</span> : null}</div><div className="stat-sub">{myVehicles[0] ? `${myVehicles[0].make} ${myVehicles[0].model}` : 'Add a vehicle'}</div></div>
                <div className="stat-card sc-amber"><div className="stat-lbl">Next Service</div><div className="stat-val">{myVehicles.length ? `${Math.max(3, 14 - myVehicles.length)}d` : '—'}</div><div className="stat-sub">{nextServiceLabel}</div></div>
                <div className="stat-card sc-purple"><div className="stat-lbl">My Vehicles</div><div className="stat-val">{myVehicles.length}</div><div className="stat-sub">{myVehicles.length === 0 ? 'No vehicles yet' : myVehicles.slice(0,2).map(v => v.model).join(' · ')}</div></div>
              </div>
            </div>
          </div>
        )}

        {pane === 'search' && (
          <div>
            <div className={styles.pageHdr}>
              <div>
                <div className={styles.pageTitle}>Find a Service</div>
                <div className={styles.pageSub}>{provLoading ? 'Loading...' : `${filtered.length} provider${filtered.length!==1?'s':''} found`}</div>
              </div>
            </div>
            <div className={styles.pad}>
              <div style={{display:'flex',gap:8,marginBottom:12}}>
                <input className="form-input" placeholder="Search for a service or neighborhood..." value={searchQ} onChange={e => setSearchQ(e.target.value)} style={{flex:1,fontSize:14}} />
                {searchQ && <button className="btn" onClick={() => setSearchQ('')}>✕</button>}
              </div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:16}}>
                {SEARCH_CATS.map(([c,l]) => (<button key={c} className={`btn ${searchCat===c?'btn-green':''}`} onClick={() => setSearchCat(c)}>{l}</button>))}
              </div>
              {!provLoading && filtered.length > 0 && <ProviderMap providers={filtered} onSelect={(p) => openBooking(p)} />}
              {provLoading ? (
                <div style={{textAlign:'center',padding:60}}><div className="spinner" style={{width:32,height:32,margin:'0 auto 12px'}}/><div style={{fontFamily:'var(--mono)',fontSize:11,color:'var(--ink3)'}}>Loading providers...</div></div>
              ) : (
                <div style={{display:'flex',flexDirection:'column',gap:10}}>
                  {filtered.map((p,i) => (
                    <div key={p.id||i} style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:10,padding:14,display:'flex',gap:12,alignItems:'flex-start',cursor:'pointer',boxShadow:'var(--shadow)'}} onClick={() => navigate(`/provider/${slugify(p.name)}`)}>
                      <div style={{width:48,height:48,borderRadius:10,background:'var(--bg3)',border:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,color:'var(--blue)'}}><AppIcon code={p.icon || 'ME'} size={22} /></div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontFamily:'var(--display)',fontWeight:700,fontSize:14,marginBottom:2}}>{p.name}</div>
                        <div style={{fontSize:11,color:'var(--ink2)',marginBottom:6}}>{p.type_label} · {p.address} · {p.rating} stars ({p.reviews} reviews) · {p.phone}</div>
                        <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>{(p.services||[]).slice(0,3).map(s => <span key={s} className="badge badge-gray">{s}</span>)}</div>
                      </div>
                      <div style={{display:'flex',flexDirection:'column',gap:6,alignItems:'flex-end',flexShrink:0}}>
                        <span style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--ink3)'}}>{p.distance}</span>
                        <span className={`badge ${p.is_open?'badge-green':'badge-amber'}`}>{p.is_open ? 'Open' : 'Closed'}</span>
                        <button className="btn btn-green" style={{fontSize:10,padding:'5px 12px'}} onClick={e=>{e.stopPropagation();openBooking(p)}}>Book</button>
                      </div>
                    </div>
                  ))}
                  {filtered.length===0 && (
                    <div style={{textAlign:'center',color:'var(--ink3)',padding:60}}>
                      <div style={{fontSize:40,marginBottom:12}}>🔍</div>
                      <div style={{fontFamily:'var(--display)',fontWeight:700,fontSize:16,marginBottom:6}}>No results</div>
                      <button className="btn" style={{marginTop:12}} onClick={() => {setSearchQ('');setSearchCat('all')}}>Reset</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {pane === 'vehicles' && (
          <div>
            <div className={styles.pageHdr}><div><div className={styles.pageTitle}>My Vehicles</div><div className={styles.pageSub}>Your saved vehicles</div></div><button className="btn btn-green" onClick={() => setAddVehicleModal(true)}>+ Add Vehicle</button></div>
            <div className={styles.pad}>
              <div className={styles.g2}>
                {myVehicles.length === 0 ? (
                  <div style={{textAlign:'center',padding:40,color:'var(--ink3)',gridColumn:'1/-1'}}>
                    <div style={{color:'var(--blue)',marginBottom:12,display:'flex',justifyContent:'center'}}><AppIcon code="VH" size={40} /></div>
                    <div style={{fontFamily:'var(--display)',fontWeight:700,fontSize:16,marginBottom:8}}>No vehicles yet</div>
                    <div style={{fontSize:13,marginBottom:16}}>Add your first vehicle to get started.</div>
                    <button className="btn btn-green btn-lg" onClick={() => setAddVehicleModal(true)}>+ Add Vehicle</button>
                  </div>
                ) : myVehicles.map(v => (
                  <div key={v.id} style={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:10,padding:16}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                      <div style={{fontFamily:'var(--display)',fontSize:18,fontWeight:800}}>{v.make} {v.model} {v.year}</div>
                      <span className="badge badge-green">My vehicle</span>
                    </div>
                    {v.plate && <div style={{fontFamily:'var(--mono)',fontSize:10,background:'var(--bg2)',border:'1px solid var(--border)',padding:'3px 8px',borderRadius:4,display:'inline-block',marginBottom:12}}>{v.plate}</div>}
                    {v.color && <div style={{fontSize:11,color:'var(--ink2)',marginBottom:8}}>Color: {v.color}</div>}
                    <div style={{marginBottom:8}}>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:3}}><span style={{color:'var(--ink2)'}}>FlashScore™</span><span style={{color:'var(--green)',fontFamily:'var(--mono)'}}>{v.flash_score}%</span></div>
                      <div className="prog-bar"><div className="prog-fill" style={{width:`${v.flash_score}%`,background:'var(--green)'}}/></div>
                    </div>
                    <button className="btn btn-green" style={{marginTop:8,width:'100%',justifyContent:'center'}} onClick={() => openBooking()}>Book a Service</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {pane === 'maintenance' && (
          <div>
            <div className={styles.pageHdr}><div><div className={styles.pageTitle}>Maintenance</div></div></div>
            <div className={styles.pad}>
              {myVehicles.length > 0 && (
                <div style={{background:'var(--red-bg)',border:'1px solid rgba(239,68,68,.25)',borderRadius:10,padding:14,marginBottom:12,display:'flex',gap:10,alignItems:'center'}}>
                  <span style={{color:'var(--red)',display:'inline-flex'}}><AppIcon code="VG" size={20} /></span>
                  <div style={{flex:1}}><div style={{fontWeight:700}}>Recommended maintenance — {myVehicles[0].make} {myVehicles[0].model}</div><div style={{fontSize:11,color:'var(--ink2)'}}>FlashMat suggests a preventive check this week.</div></div>
                  <button className="btn btn-green" onClick={() => openBooking()}>Book</button>
                </div>
              )}
              {(maintenanceItems.length > 0 ? maintenanceItems : [{icon:'ME',title:'Add a vehicle',meta:'To unlock maintenance reminders'}]).map(item => (
                <div key={item.title} style={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:10,padding:12,display:'flex',gap:10,marginBottom:8,alignItems:'center'}}>
                  <span style={{color:'var(--blue)',display:'inline-flex'}}><AppIcon code={item.icon} size={20} /></span>
                  <div style={{flex:1}}><div style={{fontWeight:600,fontSize:13}}>{item.title}</div><div style={{fontSize:11,color:'var(--ink2)'}}>{item.meta}</div></div>
                  <button className="btn" style={{fontSize:10}} onClick={() => myVehicles.length ? openBooking() : setAddVehicleModal(true)}>{myVehicles.length ? 'Book' : 'Add'}</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {pane === 'marketplace' && <Marketplace portal="client" openComposer={location.pathname === '/app/marketplace'} />}

        {pane === 'flashscore' && (
          <div>
            <div className={styles.pageHdr}><div><div className={styles.pageTitle}>FlashScore™</div></div></div>
            <div className={styles.pad}>
              <div className={styles.g2}>
                {(flashScoreCards.length > 0 ? flashScoreCards : [{make:'Add',model:'a vehicle',year:'',score:0,items:[]}]).map(v => (
                  <div key={`${v.make}-${v.model}-${v.year}`} className="panel">
                    <div className="panel-hd"><div className="panel-title">FS {v.make} {v.model} {v.year}</div><span className="badge badge-green">{v.score || '—'}{v.score ? '%' : ''}</span></div>
                    <div className="panel-body">
                      <div style={{width:80,height:80,borderRadius:'50%',border:'6px solid var(--green)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',background:'var(--green-bg)'}}>
                        <span style={{fontFamily:'var(--display)',fontSize:20,fontWeight:800,color:'var(--green)'}}>{v.score || '—'}</span>
                      </div>
                      {v.items.map(([l,val,c]) => (
                        <div key={l} style={{display:'flex',alignItems:'center',gap:8,marginBottom:8,fontSize:11}}>
                          <span style={{width:6,height:6,borderRadius:'50%',background:`var(--${c})`,flexShrink:0}}/>
                          <span style={{flex:1,color:'var(--ink2)'}}>{l}</span>
                          <span style={{fontFamily:'var(--mono)',fontSize:10}}>{val}%</span>
                          <div style={{width:60}}><div className="prog-bar"><div className="prog-fill" style={{width:`${val}%`,background:`var(--${c})`}}/></div></div>
                        </div>
                      ))}
                      {v.items.length === 0 && <div style={{textAlign:'center',fontSize:12,color:'var(--ink3)'}}>Add a vehicle to calculate your FlashScore.</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {pane === 'notifications' && (
          <div>
            <div className={styles.pageHdr}><div><div className={styles.pageTitle}>Alerts</div></div></div>
            <div className={styles.pad}>
              {latestFlashFixEvents.length > 0 && (
                <div className="panel" style={{ marginBottom: 14 }}>
                  {latestFlashFixEvents.map((event, index, arr) => {
                    const meta = getFlashFixStatusMeta(event.status)
                    return (
                      <div key={event.id} style={{display:'flex',gap:10,padding:'12px 14px',borderBottom:index<arr.length-1?'1px solid var(--border)':'none',alignItems:'flex-start'}}>
                        <div style={{width:34,height:34,borderRadius:8,background:'var(--red-bg)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0}}>🚨</div>
                        <div style={{flex:1}}>
                          <div style={{fontSize:12,fontWeight:600,marginBottom:2}}>{getClientSafeFlashFixEventLabel(event.label, event.status)}</div>
                          <div style={{fontSize:11,color:'var(--ink2)'}}>{event.issueLabel}</div>
                          <div style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--ink3)',marginTop:3}}>{formatFlashFixTime(event.at)}</div>
                        </div>
                        <span className={`badge ${meta.cls}`}>{meta.label}</span>
                      </div>
                    )
                  })}
                </div>
              )}
              <div className="panel">
                {notifications.map((n,i,arr) => (
                  <div key={i} style={{display:'flex',gap:10,padding:'12px 14px',borderBottom:i<arr.length-1?'1px solid var(--border)':'none',alignItems:'flex-start'}}>
                    <div style={{width:34,height:34,borderRadius:8,background:'var(--bg3)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,color:'var(--blue)'}}>{typeof n.icon === 'string' && n.icon.length <= 3 ? <AppIcon code={n.icon} size={16} /> : (n.icon || <AppIcon code="AL" size={16} />)}</div>
                    <div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,marginBottom:2}}>{n.title}</div><div style={{fontSize:11,color:'var(--ink2)'}}>{n.body}</div><div style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--ink3)',marginTop:3}}>{formatFlashFixTime(n.created_at)}</div></div>
                    <span className="badge badge-blue">{n.type || 'Info'}</span>
                  </div>
                ))}
                {notifications.length === 0 && latestFlashFixEvents.length === 0 && (
                  <div style={{padding:'16px 14px',fontSize:12,color:'var(--ink3)'}}>No alerts right now.</div>
                )}
              </div>
            </div>
          </div>
        )}

        {pane === 'bookings' && (
          <div>
            <div className={styles.pageHdr}><div><div className={styles.pageTitle}>My Bookings</div></div><button className="btn btn-green" onClick={() => openBooking()}>+ New</button></div>
            <div className={styles.pad}>
              {bookings.length > 0 && (
                <div style={{ display:'grid', gap:12, marginBottom:16 }}>
                  {bookings.map((booking) => (
                    <div key={booking.id} style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:14,padding:16,boxShadow:'var(--shadow)'}}>
                      <div style={{display:'flex',justifyContent:'space-between',gap:10,alignItems:'flex-start',marginBottom:10}}>
                        <div>
                          <div style={{fontFamily:'var(--display)',fontWeight:800,fontSize:16,color:'var(--ink)',marginBottom:4}}>{booking.service}</div>
                          <div style={{fontSize:12,color:'var(--ink2)'}}>{booking.providerName}</div>
                        </div>
                        <span className={`badge ${booking.statusClass}`}>{booking.statusLabel}</span>
                      </div>
                      <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                        <span className="badge badge-gray">{booking.vehicleLabel}</span>
                        <span className="badge badge-blue">{booking.datetimeLabel}</span>
                        <span className="badge badge-green">{booking.priceLabel}</span>
                      </div>
                      {booking.notes && <div style={{marginTop:10,fontSize:11,color:'var(--ink2)'}}>📝 {booking.notes}</div>}
                    </div>
                  ))}
                </div>
              )}
              {activeFlashFixRequests.length > 0 && (
                <div style={{background:'linear-gradient(135deg,#0f1e3d 0%, #1a3a8f 100%)',borderRadius:18,padding:18,marginBottom:16,color:'#fff',boxShadow:'var(--shadow)'}}>
                  <div style={{display:'flex',justifyContent:'space-between',gap:12,alignItems:'flex-start',marginBottom:12}}>
                    <div>
                      <div style={{fontSize:11,letterSpacing:1.4,textTransform:'uppercase',color:'rgba(255,255,255,.72)',marginBottom:6}}>Live FlashFix</div>
                      <div style={{fontFamily:'var(--display)',fontSize:22,fontWeight:800,lineHeight:1.1}}>{activeFlashFixRequests[0].issueLabel}</div>
                    </div>
                    <span className={`badge ${getFlashFixStatusMeta(activeFlashFixRequests[0].status).cls}`}>{getFlashFixStatusMeta(activeFlashFixRequests[0].status).label}</span>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(3, minmax(0,1fr))',gap:10}}>
                    {[['Provider', activeFlashFixRequests[0].status==='pending' ? 'Matching in progress' : 'Assigned by FlashMat'],['Option',activeFlashFixRequests[0].selectedOption?.title||'FlashFix'],['ETA',activeFlashFixRequests[0].selectedOption?.eta||'to be confirmed']].map(([label,val]) => (
                      <div key={label} style={{background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.08)',borderRadius:14,padding:12}}>
                        <div style={{fontSize:10,color:'rgba(255,255,255,.65)',marginBottom:4}}>{label}</div>
                        <div style={{fontWeight:700,fontSize:14}}>{val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {flashFixRequests.filter(r => r.channel==='flashfix').length > 0 && (
                <div style={{ display: 'grid', gap: 12, marginBottom: 18 }}>
                  {flashFixRequests.filter(r => r.channel==='flashfix').map((request) => {
                    const meta = getFlashFixStatusMeta(request.status)
                    const latestEvent = request.events?.[request.events.length - 1]
                    const timeline = getFlashFixStageProgress(request.status)
                    return (
                      <div key={request.id} style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:14,padding:16,boxShadow:'var(--shadow)'}}>
                        <div style={{display:'flex',justifyContent:'space-between',gap:10,alignItems:'flex-start',marginBottom:10}}>
                          <div>
                            <div style={{fontFamily:'var(--display)',fontWeight:800,fontSize:16,color:'var(--ink)',marginBottom:4}}>{request.issueLabel}</div>
                            <div style={{fontSize:12,color:'var(--ink2)',lineHeight:1.6}}>{request.description}</div>
                          </div>
                          <span className={`badge ${meta.cls}`}>{meta.label}</span>
                        </div>
                        <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:10}}>
                          <span className="badge badge-gray">{request.location||'Location to be confirmed'}</span>
                          <span className="badge badge-blue">{request.selectedOption?.title||'Option FlashFix'}</span>
                          <span className="badge badge-green">{request.selectedOption?.price||'Price to be confirmed'}</span>
                          <span className="badge badge-amber">ETA {request.selectedOption?.eta||'to be confirmed'}</span>
                        </div>
                        <div style={{display:'grid',gridTemplateColumns:'repeat(5, minmax(0,1fr))',gap:8,marginTop:12}}>
                          {timeline.map((item) => (
                            <div key={item.step} style={{textAlign:'center'}}>
                              <div style={{width:28,height:28,borderRadius:999,margin:'0 auto 6px',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,color:item.done?'#fff':'var(--ink3)',background:item.current?'var(--blue)':item.done?'var(--green)':'var(--bg3)',border:item.current?'none':'1px solid var(--border)'}}>
                                {item.done ? '•' : ''}
                              </div>
                              <div style={{fontSize:10,color:item.current?'var(--ink)':'var(--ink3)',fontWeight:item.current?700:500}}>{getTimelineLabel(item.step)}</div>
                            </div>
                          ))}
                        </div>
                        {latestEvent && (
                          <div style={{marginTop:10,paddingTop:10,borderTop:'1px solid var(--border)',fontSize:11,color:'var(--ink2)'}}>
                            Latest update: {getClientSafeFlashFixEventLabel(latestEvent.label, request.status)}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
              {flashFixRequests.length === 0 && bookings.length === 0 && (
                <div style={{textAlign:'center',padding:40,color:'var(--ink3)'}}>
                  <div style={{color:'var(--blue)',marginBottom:12,display:'flex',justifyContent:'center'}}><AppIcon code="RS" size={40} /></div>
                  <div style={{fontFamily:'var(--display)',fontWeight:700,fontSize:16,marginBottom:8}}>No bookings yet</div>
                  <button className="btn btn-green btn-lg" onClick={() => go('search')}>Find a provider →</button>
                </div>
              )}
            </div>
          </div>
        )}

        <nav className={styles.bottomNav}>
          {[['dashboard','TB','Home'],['bookings','RS','Bookings'],['search','SV','Services'],['vehicles','VH','Cars'],['notifications','AL','Alerts']].map(([id,icon,label]) => (
            <button key={id} className={`${styles.bnItem} ${pane===id?styles.bnActive:''}`} onClick={() => go(id)}>
              <span style={{display:'inline-flex'}}><AppIcon code={icon} size={18} /></span><span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {bookingModal && (
        <BookingModal providers={providers} vehicles={myVehicles} initialProvider={selectedBookingProvider}
          onClose={() => { setBookingModal(false); setSelectedBookingProvider(null) }}
          onConfirm={handleBookingConfirm}
        />
      )}
      <FlashAI portal="client" userName={name} />
      {addVehicleModal && <AddVehicleModal onClose={() => setAddVehicleModal(false)} onAdd={v => { setMyVehicles(prev => [v, ...prev]); setAddVehicleModal(false) }} />}
    </div>
  )
}


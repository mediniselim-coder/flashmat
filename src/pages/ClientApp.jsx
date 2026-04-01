import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import FlashAI from '../components/FlashAI'
import BookingModal from '../components/BookingModal'
import styles from './AppShell.module.css'

const NAV = [
  { id: 'dashboard',        icon: '⚡', label: 'Tableau de bord' },
  { id: 'bookings',         icon: '📅', label: 'Réservations',    badge: 3 },
  { id: 'search',           icon: '🗺️', label: 'Trouver un service' },
  { id: 'vehicles',         icon: '🚗', label: 'Mes véhicules' },
  { id: 'maintenance',      icon: '🔧', label: 'Entretien' },
  { id: 'marketplace',      icon: '🛒', label: 'Marketplace' },
  { id: 'flashscore',       icon: '📊', label: 'FlashScore™' },
  { id: 'notifications',    icon: '🔔', label: 'Alertes',         badge: 3 },
]

const BOOKINGS = [
  { service: 'Vidange + Filtre',  icon: '🔧', type: 'Mécanique',  provider: 'Garage Los Santos',      vehicle: 'Honda Civic', date: '1 avr. · 10h00',  price: '$89',  status: 'confirmed', statusLabel: 'Confirmé',   cls: 'badge-green' },
  { service: 'Lavage complet',    icon: '🚿', type: 'Lave-auto',  provider: 'CS Lave Auto Décarie',   vehicle: 'RAV4',        date: '4 avr. · 14h00',  price: '$55',  status: 'pending',   statusLabel: 'En attente', cls: 'badge-amber' },
  { service: 'Rotation pneus',    icon: '🔩', type: 'Pneus',      provider: 'Dubé Pneu MTL',          vehicle: 'Honda Civic', date: '10 avr. · 9h00',  price: '$45',  status: 'pending',   statusLabel: 'En attente', cls: 'badge-amber' },
  { service: 'Plaquettes frein',  icon: '🔧', type: 'Mécanique',  provider: 'Garage Los Santos',      vehicle: 'Honda Civic', date: '28 mars · 9h15',  price: '$220', status: 'done',      statusLabel: 'Complété',   cls: 'badge-gray'  },
  { service: 'Vidange huile',     icon: '🛢️', type: 'Mécanique',  provider: 'JA Automobile',          vehicle: 'RAV4',        date: '15 janv. · 10h00', price: '$75', status: 'done',      statusLabel: 'Complété',   cls: 'badge-gray'  },
]

const NOTIFICATIONS = [
  { icon: '✅', bg: 'var(--green-bg)',  title: '🎉 Votre voiture est prête!',             sub: 'Garage Los Santos — Honda Civic · Freins terminés',              time: "Aujourd'hui 14h04", badge: 'Nouveau', badgeCls: 'badge-green', read: false },
  { icon: '🏷️', bg: 'var(--green-bg)',  title: 'Promo: 20% sur vidange cette semaine!',   sub: 'Garage Los Santos — Code: OIL20 · Valide 1–5 avr.',              time: 'Hier 10h30',        badge: 'Nouveau', badgeCls: 'badge-green', read: false },
  { icon: '🚨', bg: 'var(--amber-bg)', title: 'Rappel manufacturier — Honda Civic 2019',  sub: 'Capteur ABS potentiellement défectueux — Vérification gratuite', time: 'Il y a 2 jours',    badge: 'Urgent',  badgeCls: 'badge-amber', read: false },
  { icon: '📦', bg: 'var(--blue-bg)',  title: 'Marketplace — Offre reçue sur vos pneus', sub: "Quelqu'un offre $85 pour vos pneus — répondez avant 3 jours",   time: 'Il y a 2 jours',    badge: null, badgeCls: '',             read: true  },
]

const PROVIDERS = [
  { name: 'Garage Los Santos',      icon: '🔧', type: 'mechanic', typeLabel: 'Mécanique',   addr: '7999 14e Avenue, Montréal',      rating: 4.8, reviews: 312, open: true,  phone: '(514) 374-2829', dist: '0.8km', services: ['Vidange','Freins','Pneus','Alignement'] },
  { name: 'CS Lave Auto Décarie',   icon: '🚿', type: 'wash',     typeLabel: 'Lave-auto',   addr: '5960 Bd Décarie, Montréal',      rating: 4.8, reviews: 198, open: true,  phone: '(514) 739-2267', dist: '1.2km', services: ['Lavage complet','Détail','Cire','Express'] },
  { name: 'Dubé Pneu et Mécan.',    icon: '🔩', type: 'tire',     typeLabel: 'Pneus',       addr: '9785 Bd Saint-Michel, Montréal', rating: 4.3, reviews: 256, open: true,  phone: '(514) 384-2801', dist: '2.1km', services: ['Pneus hiver','Pneus été','Rotation'] },
  { name: 'JA Automobile',          icon: '🔧', type: 'mechanic', typeLabel: 'Mécanique',   addr: '8024 Av. Léonard-De Vinci, MTL', rating: 4.8, reviews:  89, open: true,  phone: '(514) 352-2929', dist: '3.2km', services: ['Diagnostic','Moteur','Freins'] },
  { name: 'Garage Méca. MK',        icon: '🔧', type: 'mechanic', typeLabel: 'Mécanique',   addr: '6965 Rue de la Roche, Montréal', rating: 4.9, reviews: 145, open: false, phone: '(514) 521-0001', dist: '1.8km', services: ['Vidange','Freins','Suspension'] },
  { name: 'Remorquage Elite 24/7',  icon: '🚛', type: 'tow',      typeLabel: 'Remorquage',  addr: 'Montréal, QC (mobile)',          rating: 4.6, reviews: 432, open: true,  phone: '(514) 812-4567', dist: 'Mobile', services: ['Remorquage','Dépannage','Boost'] },
  { name: 'Lave-Auto 365',          icon: '🚿', type: 'wash',     typeLabel: 'Lave-auto',   addr: '4775 Rue Jean-Talon O, MTL',     rating: 4.8, reviews: 210, open: true,  phone: '(514) 737-0365', dist: '2.4km', services: ['Lavage','Abonnement mensuel'] },
  { name: 'Speedy Glass Montréal',  icon: '🪟', type: 'glass',    typeLabel: 'Vitres auto', addr: 'Plusieurs succursales MTL',      rating: 4.5, reviews: 521, open: true,  phone: '1-800-682-6399', dist: '1.5km', services: ['Pare-brise','Vitres latérales'] },
]

const MKT = [
  { name: 'Pneus hiver Michelin X-Ice 205/55R16 x4', price: 240, cat: 'tire',   icon: '🔩', cond: 'Bon état', city: 'Montréal', detail: '2 saisons · 6/32 tread' },
  { name: 'Kit phares LED H7 6000K',                  price:  85, cat: 'acc',    icon: '💡', cond: 'Neuf',     city: 'Laval',    detail: "Jamais installé · Boîte d'origine" },
  { name: 'Jantes alliage 17" OEM Honda x4',          price: 380, cat: 'wheel',  icon: '🛞', cond: 'Bon état', city: 'Longueuil', detail: '3 saisons · Fit Civic/Accord' },
  { name: 'Plaquettes frein Bosch QuietCast avant',   price:  55, cat: 'brake',  icon: '🔧', cond: 'Neuf',     city: 'Montréal', detail: 'Honda Civic 2015-2021' },
  { name: 'Huile Mobil 1 5W30 Full Synthetic — 5L',   price:  32, cat: 'engine', icon: '🛢️', cond: 'Neuf',     city: 'Montréal', detail: 'Scellé · Exp. 2027' },
  { name: 'Pneus été Bridgestone 225/45R17 x4',       price: 320, cat: 'tire',   icon: '🔩', cond: 'Bon état', city: 'Montréal', detail: '1 saison · 7/32 tread · BMW 3 série' },
]

export default function ClientApp() {
  const { profile, signOut } = useAuth()
  const { toast }            = useToast()
  const navigate             = useNavigate()

  const [pane, setPane]           = useState('dashboard')
  const [sidebarOpen, setSidebar] = useState(false)
  const [bookingModal, setBookingModal] = useState(false)
  const [bookings, setBookings]   = useState(BOOKINGS)
  const [searchQ, setSearchQ]     = useState('')
  const [searchCat, setSearchCat] = useState('all')
  const [bkFilter, setBkFilter]   = useState('all')

  const name = profile?.full_name || 'Alex'
  const activeCount = bookings.filter(b => b.status !== 'done').length
  const unreadCount = NOTIFICATIONS.filter(n => !n.read).length

  function go(id) { setPane(id); setSidebar(false) }

  function addBooking(bk) {
    setBookings(prev => [bk, ...prev])
    toast('✅ Réservation confirmée! Vous recevrez un email sous peu.', 'success')
  }

  const filteredProviders = PROVIDERS.filter(p => {
    const matchCat = searchCat === 'all' || p.type === searchCat
    const q = searchQ.toLowerCase()
    const matchQ = !q || p.name.toLowerCase().includes(q) || p.typeLabel.toLowerCase().includes(q) || p.addr.toLowerCase().includes(q) || p.services.some(s => s.toLowerCase().includes(q))
    return matchCat && matchQ
  })

  const filteredBookings = bkFilter === 'all' ? bookings : bookings.filter(b =>
    bkFilter === 'done' ? b.status === 'done' : b.status === bkFilter
  )

  return (
    <div className={styles.shell}>
      {/* SIDEBAR OVERLAY */}
      {sidebarOpen && <div className={styles.overlay} onClick={() => setSidebar(false)} />}

      {/* SIDEBAR */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sbHeader}>
          <div className={styles.sbLogo}>
            <div className={styles.sbHex}>FM</div>
            <div className={styles.sbLogoText}>Flash<span>Mat</span></div>
          </div>
          <span className={`${styles.sbMode} ${styles.modeClient}`}>CLIENT</span>
        </div>

        <nav className={styles.sbNav}>
          <div className={styles.sbSection}>
            <div className={styles.sbLbl}>Principal</div>
            {NAV.slice(0, 4).map(n => (
              <button key={n.id} className={`${styles.navItem} ${pane === n.id ? styles.navActive : ''}`} onClick={() => go(n.id)}>
                <span className={styles.ni}>{n.icon}</span>
                {n.label}
                {n.badge && <span className={styles.nBadge}>{n.id === 'bookings' ? activeCount : n.badge}</span>}
              </button>
            ))}
          </div>
          <div className={styles.sbSection}>
            <div className={styles.sbLbl}>Fonctionnalités</div>
            {NAV.slice(4).map(n => (
              <button key={n.id} className={`${styles.navItem} ${pane === n.id ? styles.navActive : ''}`} onClick={() => go(n.id)}>
                <span className={styles.ni}>{n.icon}</span>
                {n.label}
                {n.badge && <span className={`${styles.nBadge} ${styles.nBadgeBlue}`}>{unreadCount}</span>}
              </button>
            ))}
          </div>
        </nav>

        <div className={styles.sbBottom}>
          <div className={styles.userChip} onClick={() => { signOut(); navigate('/') }}>
            <div className={`${styles.avatar} ${styles.avatarGreen}`}>{name.slice(0,2).toUpperCase()}</div>
            <div>
              <div className={styles.userName}>{name}</div>
              <div className={styles.userRole}>client · montréal</div>
            </div>
            <span style={{ marginLeft: 'auto', color: 'var(--ink3)', fontSize: 11 }}>←</span>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <div className={styles.main}>
        {/* MOBILE TOPBAR */}
        <div className={styles.mobileTopbar}>
          <button className={styles.menuBtn} onClick={() => setSidebar(true)}>☰</button>
          <div className={styles.sbLogoText} style={{ fontSize: 17 }}>Flash<span style={{ color: 'var(--green)' }}>Mat</span></div>
          <button className="btn btn-green" style={{ fontSize: 11, padding: '7px 12px' }} onClick={() => setBookingModal(true)}>+ Réserver</button>
        </div>

        {/* ── DASHBOARD ── */}
        {pane === 'dashboard' && (
          <div>
            <div className={styles.pageHdr}>
              <div>
                <div className={styles.pageTitle}>Bonjour, {name} 👋</div>
                <div className={styles.pageSub}>Vidange en retard sur votre Honda Civic</div>
              </div>
              <button className="btn btn-green" onClick={() => setBookingModal(true)}>+ Réserver un service</button>
            </div>
            <div className={styles.pad}>
              <div className={styles.urgency} onClick={() => go('maintenance')}>
                <span style={{ fontSize: 20 }}>⚠️</span>
                <div>
                  <div style={{ fontFamily: 'var(--display)', fontWeight: 700, color: 'var(--blue)', fontSize: 13 }}>Vidange d'huile en retard — Honda Civic</div>
                  <div style={{ fontSize: 11, color: 'var(--ink2)' }}>5 200 km dépassés · Réservez avant d'endommager le moteur</div>
                </div>
                <button className="btn btn-green" style={{ flexShrink: 0, fontSize: 11 }} onClick={e => { e.stopPropagation(); setBookingModal(true) }}>Réserver →</button>
              </div>

              <div className={styles.statsGrid}>
                <div className="stat-card sc-green"><div className="stat-lbl">Réservations</div><div className="stat-val">{activeCount}</div><div className="stat-sub">actives</div></div>
                <div className="stat-card sc-blue"><div className="stat-lbl">FlashScore™</div><div className="stat-val">87<span style={{ fontSize: 14 }}>%</span></div><div className="stat-sub">Honda Civic · Bon état</div></div>
                <div className="stat-card sc-amber"><div className="stat-lbl">Prochain service</div><div className="stat-val">7j</div><div className="stat-sub">Vidange — 6 avr.</div></div>
                <div className="stat-card sc-purple"><div className="stat-lbl">Véhicules</div><div className="stat-val">2</div><div className="stat-sub">Civic · RAV4</div></div>
              </div>

              <div className={styles.g2}>
                <div className="panel">
                  <div className="panel-hd"><div className="panel-title">📅 Prochains RDV</div><button className="btn" onClick={() => go('bookings')}>Voir tout</button></div>
                  <div style={{ padding: '8px' }}>
                    {bookings.filter(b => b.status !== 'done').slice(0,2).map((b, i) => (
                      <div key={i} className={styles.bkCard}>
                        <div className={styles.bkIcon}>{b.icon}</div>
                        <div>
                          <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 13 }}>{b.service}</div>
                          <div style={{ fontSize: 11, color: 'var(--ink2)' }}>{b.provider} · {b.date}</div>
                          <div style={{ marginTop: 4, display: 'flex', gap: 4 }}><span className={`badge ${b.cls}`}>{b.statusLabel}</span><span className="badge badge-gray">{b.vehicle}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="panel">
                  <div className="panel-hd"><div className="panel-title">🔔 Alertes récentes</div></div>
                  {NOTIFICATIONS.slice(0,3).map((n, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--border)', alignItems: 'flex-start' }}>
                      <div style={{ width: 30, height: 30, borderRadius: 7, background: n.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>{n.icon}</div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600 }}>{n.title}</div>
                        <div style={{ fontSize: 10, color: 'var(--ink3)', fontFamily: 'var(--mono)', marginTop: 2 }}>{n.time}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── BOOKINGS ── */}
        {pane === 'bookings' && (
          <div>
            <div className={styles.pageHdr}>
              <div><div className={styles.pageTitle}>Mes réservations</div><div className={styles.pageSub}>{activeCount} actives</div></div>
              <button className="btn btn-green" onClick={() => setBookingModal(true)}>+ Nouvelle réservation</button>
            </div>
            <div className={styles.pad}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                {[['all','Toutes'],['confirmed','Confirmées'],['pending','En attente'],['done','Complétées']].map(([f,l]) => (
                  <button key={f} className={`btn ${bkFilter===f?'btn-green':''}`} onClick={() => setBkFilter(f)}>{l}</button>
                ))}
              </div>
              <div className="panel" style={{ overflowX: 'auto' }}>
                <table>
                  <thead><tr><th>Service</th><th>Fournisseur</th><th>Véhicule</th><th>Date</th><th>Prix</th><th>Statut</th><th></th></tr></thead>
                  <tbody>
                    {filteredBookings.map((b, i) => (
                      <tr key={i} style={{ opacity: b.status === 'done' ? .55 : 1 }}>
                        <td><div style={{ fontWeight: 600 }}>{b.service}</div><div style={{ fontSize: 10, color: 'var(--ink3)' }}>{b.icon} {b.type}</div></td>
                        <td style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{b.provider}</td>
                        <td><span className="badge badge-gray">{b.vehicle}</span></td>
                        <td style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{b.date}</td>
                        <td style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--green)' }}>{b.price}</td>
                        <td><span className={`badge ${b.cls}`}>{b.statusLabel}</span></td>
                        <td>
                          {b.status !== 'done'
                            ? <button className="btn btn-red" style={{ fontSize: 10 }} onClick={() => { setBookings(prev => prev.filter((_, j) => j !== i)); toast('Réservation annulée') }}>Annuler</button>
                            : <button className="btn" style={{ fontSize: 10 }} onClick={() => toast('Évaluation envoyée ⭐', 'success')}>Évaluer</button>
                          }
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── SEARCH ── */}
        {pane === 'search' && (
          <div>
            <div className={styles.pageHdr}><div><div className={styles.pageTitle}>Trouver un service</div><div className={styles.pageSub}>{filteredProviders.length} fournisseurs trouvés</div></div></div>
            <div className={styles.pad}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                <input className="form-input" placeholder="🔍  Service, quartier, fournisseur…" value={searchQ} onChange={e => setSearchQ(e.target.value)} style={{ flex: 1 }} />
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                {[['all','Tous'],['mechanic','🔧 Mécanique'],['wash','🚿 Lave-auto'],['tire','🔩 Pneus'],['body','🎨 Carrosserie'],['glass','🪟 Vitres'],['tow','🚛 Remorquage']].map(([c,l]) => (
                  <button key={c} className={`btn ${searchCat===c?'btn-green':''}`} onClick={() => setSearchCat(c)}>{l}</button>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {filteredProviders.map((p, i) => (
                  <div key={i} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, display: 'flex', gap: 12, alignItems: 'flex-start', cursor: 'pointer', transition: 'all .2s', boxShadow: 'var(--shadow)' }}
                    onClick={() => setBookingModal(true)}>
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: 'var(--bg3)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>{p.icon}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink2)', marginBottom: 6 }}>{p.typeLabel} · {p.addr} · ⭐{p.rating} ({p.reviews} avis) · {p.phone}</div>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>{p.services.slice(0,3).map(s => <span key={s} className="badge badge-gray">{s}</span>)}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 5, alignItems: 'flex-end', flexShrink: 0 }}>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink3)' }}>{p.dist}</span>
                      <span className={`badge ${p.open ? 'badge-green' : 'badge-amber'}`}>{p.open ? 'Ouvert' : 'Fermé'}</span>
                      <button className="btn btn-green" style={{ fontSize: 10, padding: '4px 10px' }} onClick={e => { e.stopPropagation(); setBookingModal(true) }}>Réserver</button>
                    </div>
                  </div>
                ))}
                {filteredProviders.length === 0 && <div style={{ textAlign: 'center', color: 'var(--ink3)', padding: 40 }}>Aucun résultat pour votre recherche.</div>}
              </div>
            </div>
          </div>
        )}

        {/* ── VEHICLES ── */}
        {pane === 'vehicles' && (
          <div>
            <div className={styles.pageHdr}><div><div className={styles.pageTitle}>Mes véhicules</div><div className={styles.pageSub}>2 véhicules</div></div><button className="btn btn-green" onClick={() => toast('Fonctionnalité en cours de développement 🚗')}>+ Ajouter</button></div>
            <div className={styles.pad}>
              <div className={styles.g2}>
                {[
                  { make: 'Honda Civic', year: 2019, model: 'Berline · 1.5T · Blanc nacré', plate: 'AAB 1234', badge: 'Principal', badgeCls: 'badge-green', score: 87, oil: 22, brakes: 90, battery: 91 },
                  { make: 'Toyota RAV4', year: 2021, model: 'VUS · 2.5 Hybride · Gris métallique', plate: 'ZZC 9876', badge: 'Secondaire', badgeCls: 'badge-blue', score: 96, oil: 65, brakes: 95, battery: 99 },
                ].map(v => (
                  <div key={v.make} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                      <div><div style={{ fontFamily: 'var(--display)', fontSize: 18, fontWeight: 800 }}>{v.make}</div><div style={{ fontSize: 11, color: 'var(--ink2)' }}>{v.year} · {v.model}</div></div>
                      <span className={`badge ${v.badgeCls}`}>{v.badge}</span>
                    </div>
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 10, background: 'var(--bg2)', border: '1px solid var(--border)', padding: '3px 8px', borderRadius: 4, display: 'inline-block', marginBottom: 12 }}>{v.plate}</div>
                    {[['FlashScore™', v.score, 'var(--green)'],['Durée vie huile', v.oil, v.oil < 30 ? 'var(--amber)' : 'var(--green)'],['Plaquettes frein', v.brakes, 'var(--green)'],['Batterie', v.battery, 'var(--blue)']].map(([l, val, color]) => (
                      <div key={l} style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}><span style={{ color: 'var(--ink2)' }}>{l}</span><span style={{ color, fontFamily: 'var(--mono)' }}>{val}%</span></div>
                        <div className="prog-bar"><div className="prog-fill" style={{ width: `${val}%`, background: color }} /></div>
                      </div>
                    ))}
                    <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
                      <button className="btn" onClick={() => go('maintenance')}>Entretien</button>
                      <button className="btn btn-green" onClick={() => setBookingModal(true)}>Réserver</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── MAINTENANCE ── */}
        {pane === 'maintenance' && (
          <div>
            <div className={styles.pageHdr}><div><div className={styles.pageTitle}>Planificateur d'entretien</div><div className={styles.pageSub}>Suivi préventif et correctif</div></div></div>
            <div className={styles.pad}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.7px', color: 'var(--red)', marginBottom: 8 }}>⚠ En retard / Urgent</div>
              {[{ icon: '🛢️', title: 'Vidange d\'huile + Filtre', meta: 'Honda Civic · 5 200 km de retard', cls: 'badge-red', label: 'En retard' }].map(item => (
                <div key={item.title} style={{ background: 'var(--bg3)', border: '1px solid rgba(239,68,68,.25)', borderRadius: 10, padding: 12, display: 'flex', gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 7, background: 'var(--red-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>{item.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 13 }}>{item.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink2)' }}>{item.meta}</div>
                    <div style={{ marginTop: 6, display: 'flex', gap: 6 }}><span className={`badge ${item.cls}`}>{item.label}</span><button className="btn btn-green" style={{ fontSize: 10, padding: '3px 9px' }} onClick={() => setBookingModal(true)}>Réserver</button></div>
                  </div>
                </div>
              ))}
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.7px', color: 'var(--amber)', margin: '14px 0 8px' }}>⏱ À venir (30 jours)</div>
              {[{icon:'🔩',title:'Rotation des pneus',meta:'Honda Civic · Due le 10 avr.'},{icon:'🧊',title:'Vidange liquide refroid.',meta:'Toyota RAV4 · Due le 22 avr.'},{icon:'🔋',title:'Test batterie hiver',meta:'Honda Civic · Recommandé avant mai'}].map(item => (
                <div key={item.title} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: 12, display: 'flex', gap: 10, marginBottom: 8, alignItems: 'center' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 7, background: 'var(--bg2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>{item.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 13 }}>{item.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--ink2)' }}>{item.meta}</div>
                  </div>
                  <button className="btn" style={{ fontSize: 10 }} onClick={() => setBookingModal(true)}>Réserver</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── MARKETPLACE ── */}
        {pane === 'marketplace' && (
          <div>
            <div className={styles.pageHdr}><div><div className={styles.pageTitle}>Marketplace</div><div className={styles.pageSub}>Achat/vente pièces entre Montréalais</div></div><button className="btn btn-green" onClick={() => toast('Annonce publiée! 📦', 'success')}>+ Publier une annonce</button></div>
            <div className={styles.pad}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                {MKT.map((item, i) => (
                  <div key={i} style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', cursor: 'pointer', transition: 'all .2s', boxShadow: 'var(--shadow)' }}
                    onClick={() => toast(`Ouverture: ${item.name} 📦`)}>
                    <div style={{ height: 90, background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, borderBottom: '1px solid var(--border)', position: 'relative' }}>
                      {item.icon}
                      <div style={{ position: 'absolute', top: 6, right: 6 }}><span className={`badge ${item.cond==='Neuf'?'badge-blue':'badge-green'}`}>{item.cond}</span></div>
                    </div>
                    <div style={{ padding: 10 }}>
                      <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 12, marginBottom: 3 }}>{item.name}</div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 14, color: 'var(--green)', marginBottom: 3 }}>${item.price}</div>
                      <div style={{ fontSize: 10, color: 'var(--ink3)' }}>{item.city} · {item.detail}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── FLASHSCORE ── */}
        {pane === 'flashscore' && (
          <div>
            <div className={styles.pageHdr}><div><div className={styles.pageTitle}>FlashScore™</div><div className={styles.pageSub}>Score de santé de vos véhicules</div></div></div>
            <div className={styles.pad}>
              <div className={styles.g2}>
                {[{make:'Honda Civic',year:2019,score:87,items:[['Moteur',92,'green'],['Freins',90,'green'],['Pneus',78,'blue'],['Batterie',91,'blue'],['Huile',22,'amber'],['Suspension',88,'green']]},
                  {make:'Toyota RAV4',year:2021,score:96,items:[['Moteur',99,'green'],['Freins',95,'green'],['Pneus',90,'green'],['Batterie hybride',99,'blue'],['Huile',65,'green'],['Suspension',94,'green']]}
                ].map(v => (
                  <div key={v.make} className="panel">
                    <div className="panel-hd"><div className="panel-title">📊 {v.make} {v.year}</div><span className="badge badge-green">FlashScore™ {v.score}%</span></div>
                    <div className="panel-body">
                      <div style={{ width: 90, height: 90, borderRadius: '50%', border: `6px solid var(--green)`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', background: 'var(--green-bg)' }}>
                        <div style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 800, color: 'var(--green)' }}>{v.score}</div>
                      </div>
                      {v.items.map(([l, val, c]) => (
                        <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 11 }}>
                          <span style={{ width: 6, height: 6, borderRadius: '50%', background: `var(--${c})`, flexShrink: 0 }} />
                          <span style={{ flex: 1, color: 'var(--ink2)' }}>{l}</span>
                          <span style={{ fontFamily: 'var(--mono)', fontSize: 10 }}>{val}%</span>
                          <div style={{ width: 60 }}><div className="prog-bar"><div className="prog-fill" style={{ width: `${val}%`, background: `var(--${c})` }} /></div></div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── NOTIFICATIONS ── */}
        {pane === 'notifications' && (
          <div>
            <div className={styles.pageHdr}><div><div className={styles.pageTitle}>Alertes</div><div className={styles.pageSub}>{unreadCount} non lues</div></div><button className="btn" onClick={() => toast('Toutes marquées comme lues ✓')}>Tout marquer lu</button></div>
            <div className={styles.pad}>
              <div className="panel">
                {NOTIFICATIONS.map((n, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 14px', borderBottom: i < NOTIFICATIONS.length-1 ? '1px solid var(--border)' : 'none', alignItems: 'flex-start', background: n.read ? 'transparent' : 'rgba(22,199,132,.02)' }}>
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: n.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>{n.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 2 }}>{n.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--ink2)' }}>{n.sub}</div>
                      <div style={{ fontFamily: 'var(--mono)', fontSize: 9, color: 'var(--ink3)', marginTop: 3 }}>{n.time}</div>
                    </div>
                    {n.badge && <span className={`badge ${n.badgeCls}`} style={{ flexShrink: 0 }}>{n.badge}</span>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MOBILE BOTTOM NAV */}
        <nav className={styles.bottomNav}>
          {[['dashboard','⚡','Accueil'],['bookings','📅','Résa'],['search','🗺️','Services'],['vehicles','🚗','Autos'],['notifications','🔔','Alertes']].map(([id, icon, label]) => (
            <button key={id} className={`${styles.bnItem} ${pane===id?styles.bnActive:''}`} onClick={() => go(id)}>
              <span style={{ fontSize: 18 }}>{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* MODALS & FLOATING */}
      {bookingModal && <BookingModal providers={PROVIDERS} onClose={() => setBookingModal(false)} onConfirm={addBooking} />}
      <FlashAI portal="client" userName={name} />
    </div>
  )
}

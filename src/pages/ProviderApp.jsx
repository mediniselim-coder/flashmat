import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import FlashAI from '../components/FlashAI'
import Marketplace from '../components/Marketplace'
import styles from './AppShell.module.css'

const NAV = [
  { id: 'p-dashboard',   icon: '⚡', label: 'Tableau de bord' },
  { id: 'p-tasks',       icon: '✅', label: 'Tâches du jour',  badge: 5 },
  { id: 'p-bookings',    icon: '📅', label: 'Réservations',    badge: 8 },
  { id: 'p-schedule',    icon: '🗓️', label: 'Calendrier' },
  { id: 'p-clients',     icon: '👥', label: 'Clients' },
  { id: 'p-marketplace', icon: '🛒', label: 'Marketplace' },
  { id: 'p-promos',      icon: '📣', label: 'Promotions' },
  { id: 'p-profile',     icon: '🏪', label: 'Profil atelier' },
]

const QUEUE = [
  { time: '09h00', client: 'Alex M.',    service: 'Plaquettes freins', cls: 'badge-green', label: 'Terminé',   done: true  },
  { time: '10h30', client: 'Sarah K.',   service: 'Vidange',           cls: 'badge-amber', label: 'En cours',  done: false },
  { time: '11h00', client: 'Marc D.',    service: 'Rotation pneus',    cls: 'badge-amber', label: 'En cours',  done: false },
  { time: '13h00', client: 'Julie T.',   service: 'Alignement',        cls: 'badge-blue',  label: 'Planifié',  done: false },
  { time: '14h30', client: 'Patrick R.', service: 'Recharge AC',       cls: 'badge-blue',  label: 'Planifié',  done: false },
]

const CLIENTS = [
  { name: 'Alex Martin',      email: 'alex@email.com',     vehicles: ['Civic','RAV4'], last: '28 mars', total: '$1 240', status: 'VIP',     cls: 'badge-purple' },
  { name: 'Sarah Kowalski',   email: 'sarah@email.com',    vehicles: ['Honda Fit'],   last: "Auj.",    total: '$380',   status: 'Actif',   cls: 'badge-green'  },
  { name: 'Marc Dupont',      email: 'marc@email.com',     vehicles: ['BMW 320i'],    last: "Auj.",    total: '$620',   status: 'Actif',   cls: 'badge-green'  },
  { name: 'Julie Tremblay',   email: 'julie@email.com',    vehicles: ['Mazda CX-5'], last: '15 mars', total: '$450',   status: 'Actif',   cls: 'badge-green'  },
  { name: 'Patrick Roy',      email: 'patrick@email.com',  vehicles: ['Ford F-150'], last: '5 mars',  total: '$185',   status: 'Nouveau', cls: 'badge-blue'   },
  { name: 'Marie Côté',       email: 'marie@email.com',    vehicles: ['Corolla'],    last: '20 fév.', total: '$320',   status: 'Actif',   cls: 'badge-green'  },
]

const PROVIDER_BOOKINGS = [
  { client: 'Alex Martin',  service: 'Vidange + Filtre',  vehicle: 'Honda Civic', datetime: '1 avr. · 10h00', price: '$89',  status: 'confirmed', label: 'Confirmé',  cls: 'badge-green' },
  { client: 'Sarah K.',     service: 'Vidange',           vehicle: 'Honda Fit',   datetime: "Auj. · 10h30",   price: '$75',  status: 'progress',  label: 'En cours',  cls: 'badge-amber' },
  { client: 'Marc Dupont',  service: 'Rotation pneus',   vehicle: 'BMW 320i',    datetime: "Auj. · 11h00",   price: '$65',  status: 'progress',  label: 'En cours',  cls: 'badge-amber' },
  { client: 'Julie T.',     service: 'Alignement roues', vehicle: 'Mazda CX-5',  datetime: "Auj. · 13h00",   price: '$95',  status: 'scheduled', label: 'Planifié',  cls: 'badge-blue'  },
  { client: 'Patrick R.',   service: 'Recharge AC',      vehicle: 'Ford F-150',  datetime: "Auj. · 14h30",   price: '$120', status: 'scheduled', label: 'Planifié',  cls: 'badge-blue'  },
]

export default function ProviderApp() {
  const { profile, signOut } = useAuth()
  const { toast }            = useToast()
  const navigate             = useNavigate()

  const [pane, setPane]         = useState('p-dashboard')
  const [sidebarOpen, setSidebar] = useState(false)
  const [tasks, setTasks]       = useState([
    { title: 'Vidange — Sarah K. (Honda Fit)',        meta: '🔧 Mécanique · Baie 2', time: '10h30', done: false },
    { title: 'Rotation + équilibrage — Marc D. (BMW)', meta: '🔩 Pneus · Baie 1',     time: '11h00', done: false },
    { title: 'Commander liquide de frein — stock bas', meta: '📦 Inventaire',           time: 'Avant 15h', done: false },
    { title: 'Plaquettes — Alex M. (Honda Civic)',    meta: '✅ Complété',              time: '09h00', done: true  },
    { title: 'Ouverture + inspection matinale',        meta: '✅ Fait à 8h05',          time: '08h00', done: true  },
  ])
  const [promoSvc, setPromoSvc] = useState('Vidange')
  const [promoVal, setPromoVal] = useState('20%')
  const [clientQ, setClientQ]   = useState('')

  const name = profile?.full_name || 'Garage Los Santos'
  function go(id) { setPane(id); setSidebar(false) }

  const filteredClients = CLIENTS.filter(c => !clientQ || c.name.toLowerCase().includes(clientQ.toLowerCase()))

  return (
    <div className={styles.shell}>
      {sidebarOpen && <div className={styles.overlay} onClick={() => setSidebar(false)} />}

      {/* SIDEBAR */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sbHeader}>
          <div className={styles.sbLogo}>
            <div className={styles.sbHex}>FM</div>
            <div className={styles.sbLogoText}>Flash<span style={{color:'var(--green)'}}>Mat</span></div>
          </div>
          <span className={`${styles.sbMode} ${styles.modeProvider}`}>FOURNISSEUR</span>
        </div>
        <nav className={styles.sbNav}>
          <div className={styles.sbSection}>
            <div className={styles.sbLbl}>Opérations</div>
            {NAV.slice(0,4).map(n => (
              <button key={n.id} className={`${styles.navItem} ${pane===n.id?styles.navActive:''}`} onClick={() => go(n.id)}>
                <span className={styles.ni}>{n.icon}</span>{n.label}
                {n.badge && <span className={styles.nBadge}>{n.badge}</span>}
              </button>
            ))}
          </div>
          <div className={styles.sbSection}>
            <div className={styles.sbLbl}>Affaires</div>
            {NAV.slice(4).map(n => (
              <button key={n.id} className={`${styles.navItem} ${pane===n.id?styles.navActive:''}`} onClick={() => go(n.id)}>
                <span className={styles.ni}>{n.icon}</span>{n.label}
              </button>
            ))}
          </div>
        </nav>
        <div className={styles.sbBottom}>
          <div className={styles.userChip}>
            <div className={`${styles.avatar} ${styles.avatarBlue}`}>GL</div>
            <div><div className={styles.userName}>{name}</div><div className={styles.userRole}>fournisseur · montréal</div></div>
            <span style={{ marginLeft: 'auto', color: 'var(--ink3)', fontSize: 11 }}>←</span>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <div className={styles.main}>
        <div className={styles.mobileTopbar}>
          <button className={styles.menuBtn} onClick={() => setSidebar(true)}>☰</button>
          <div className={styles.sbLogoText} style={{fontSize:17}}>Flash<span style={{color:'var(--green)'}}>Mat</span> <span style={{fontSize:10,color:'var(--blue)',fontFamily:'var(--mono)'}}>FOURNISSEUR</span></div>
          <button className="btn btn-blue" style={{fontSize:11,padding:'7px 12px'}} onClick={() => toast('Nouvelle réservation ajoutée 📅','success')}>+ RDV</button>
        </div>

        {/* ── DASHBOARD ── */}
        {pane === 'p-dashboard' && (
          <div>
            <div className={styles.pageHdr}>
              <div><div className={styles.pageTitle}>Bonjour 👋</div><div className={styles.pageSub}>Mardi 1 avr. · 5 clients aujourd'hui</div></div>
              <button className="btn btn-green" onClick={() => toast('Client notifié: Voiture prête ✅','success')}>✅ Notifier client</button>
            </div>
            <div className={styles.pad}>
              <div className={styles.statsGrid}>
                <div className="stat-card sc-green"><div className="stat-lbl">Revenu aujourd'hui</div><div className="stat-val">$<span style={{fontSize:22}}>449</span></div><div className="stat-sub">3 services complétés</div></div>
                <div className="stat-card sc-blue"><div className="stat-lbl">RDV ce mois</div><div className="stat-val">47</div><div className="stat-sub">+12% vs mois dernier</div></div>
                <div className="stat-card sc-amber"><div className="stat-lbl">En attente</div><div className="stat-val">3</div><div className="stat-sub">file d'attente</div></div>
                <div className="stat-card sc-purple"><div className="stat-lbl">Note moyenne</div><div className="stat-val">4.9</div><div className="stat-sub">⭐ 145 avis</div></div>
              </div>

              <div className={styles.g2}>
                <div className="panel">
                  <div className="panel-hd"><div className="panel-title">📋 File d'attente aujourd'hui</div></div>
                  <div style={{overflowX:'auto'}}>
                    <table>
                      <thead><tr><th>Heure</th><th>Client</th><th>Service</th><th>Statut</th><th></th></tr></thead>
                      <tbody>
                        {QUEUE.map((q,i) => (
                          <tr key={i}>
                            <td style={{fontFamily:'var(--mono)',color:'var(--blue)',fontSize:11}}>{q.time}</td>
                            <td style={{fontWeight:600}}>{q.client}</td>
                            <td>{q.service}</td>
                            <td><span className={`badge ${q.cls}`}>{q.label}</span></td>
                            <td><button className={`btn ${q.done?'btn-green':''}`} style={{fontSize:10,opacity:q.label==='Planifié'?.4:1}} disabled={q.label==='Planifié'} onClick={() => toast(`${q.client} notifié: Voiture prête ✅`,'success')}>Notifier</button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div>
                  <div className="panel">
                    <div className="panel-hd"><div className="panel-title">📊 Revenu semaine</div></div>
                    <div className="panel-body">
                      {[['Lun',1220,68],['Mar',1850,100],['Mer',1420,78],['Jeu',980,53],['Ven',0,0]].map(([d,v,p]) => (
                        <div key={d} style={{marginBottom:8}}>
                          <div style={{display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:3}}>
                            <span style={{color:'var(--ink2)'}}>{d}</span>
                            <span style={{color:v?'var(--green)':'var(--ink3)',fontFamily:'var(--mono)'}}>{v?'$'+v.toLocaleString():'—'}</span>
                          </div>
                          <div className="prog-bar"><div className="prog-fill" style={{width:`${p}%`,background:p===100?'var(--green)':p>70?'var(--blue)':p>40?'var(--amber)':'var(--bg3)'}}/></div>
                        </div>
                      ))}
                      <div style={{marginTop:12,paddingTop:12,borderTop:'1px solid var(--border)',display:'flex',justifyContent:'space-between'}}>
                        <span style={{fontSize:11,color:'var(--ink2)'}}>Total semaine</span>
                        <span style={{fontFamily:'var(--display)',fontSize:16,fontWeight:800,color:'var(--green)'}}>$5 470</span>
                      </div>
                    </div>
                  </div>
                  <div className="panel">
                    <div className="panel-hd"><div className="panel-title">🏗️ Baies de travail</div></div>
                    {[{n:1,who:'Marc D. — Rotation · ETA 12h30',cls:'badge-amber',dot:'var(--amber)'},{n:2,who:'Sarah K. — Vidange · ETA 11h45',cls:'badge-amber',dot:'var(--amber)'},{n:3,who:'Disponible',cls:'badge-green',dot:'var(--green)'},{n:4,who:'Disponible',cls:'badge-green',dot:'var(--green)'}].map(b => (
                      <div key={b.n} style={{display:'flex',alignItems:'center',gap:9,padding:'11px 14px',borderBottom:'1px solid var(--border)'}}>
                        <div style={{width:8,height:8,borderRadius:'50%',background:b.dot,flexShrink:0}}/>
                        <div style={{flex:1}}><div style={{fontWeight:600,fontSize:12}}>Baie {b.n}</div><div style={{fontSize:10,color:'var(--ink2)'}}>{b.who}</div></div>
                        <span className={`badge ${b.cls}`}>{b.cls.includes('amber')?'Occupée':'Libre'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TASKS ── */}
        {pane === 'p-tasks' && (
          <div>
            <div className={styles.pageHdr}><div><div className={styles.pageTitle}>Tâches du jour</div><div className={styles.pageSub}>{tasks.filter(t=>!t.done).length} en cours</div></div><button className="btn btn-green" onClick={() => { setTasks(t => [{title:'Nouvelle tâche',meta:'📋 Général',time:'Maintenant',done:false},...t]); toast('Tâche ajoutée ✅','success') }}>+ Ajouter</button></div>
            <div className={styles.pad}>
              {tasks.map((t,i) => (
                <div key={i} style={{display:'flex',gap:9,alignItems:'flex-start',padding:9,background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:7,marginBottom:6,opacity:t.done?.55:1}}>
                  <div style={{width:16,height:16,borderRadius:4,border:`2px solid ${t.done?'var(--green)':'var(--ink3)'}`,background:t.done?'var(--green)':'transparent',flexShrink:0,marginTop:1,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',fontSize:9,color:'#fff'}}
                    onClick={() => setTasks(prev => prev.map((x,j) => j===i?{...x,done:!x.done}:x))}>
                    {t.done?'✓':''}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:12,fontWeight:600,marginBottom:1,textDecoration:t.done?'line-through':'none',color:t.done?'var(--ink3)':'var(--ink)'}}>{t.title}</div>
                    <div style={{fontSize:10,color:'var(--ink3)'}}>{t.meta}</div>
                  </div>
                  <div style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--ink3)',whiteSpace:'nowrap'}}>{t.time}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── BOOKINGS ── */}
        {pane === 'p-bookings' && (
          <div>
            <div className={styles.pageHdr}><div><div className={styles.pageTitle}>Réservations</div><div className={styles.pageSub}>{PROVIDER_BOOKINGS.length} aujourd'hui</div></div></div>
            <div className={styles.pad}>
              <div className="panel" style={{overflowX:'auto'}}>
                <table>
                  <thead><tr><th>Client</th><th>Service</th><th>Véhicule</th><th>Date & Heure</th><th>Prix</th><th>Statut</th><th></th></tr></thead>
                  <tbody>
                    {PROVIDER_BOOKINGS.map((b,i) => (
                      <tr key={i}>
                        <td><strong>{b.client}</strong></td>
                        <td>{b.service}</td>
                        <td style={{fontFamily:'var(--mono)',fontSize:11}}>{b.vehicle}</td>
                        <td style={{fontFamily:'var(--mono)',fontSize:11}}>{b.datetime}</td>
                        <td style={{fontFamily:'var(--mono)',fontSize:12,color:'var(--green)'}}>{b.price}</td>
                        <td><span className={`badge ${b.cls}`}>{b.label}</span></td>
                        <td style={{display:'flex',gap:4}}>
                          <button className="btn btn-green" style={{fontSize:10,opacity:b.status==='scheduled'?.4:1}} disabled={b.status==='scheduled'} onClick={() => toast(`${b.client} notifié: Voiture prête ✅`,'success')}>✅ Prêt</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── CLIENTS ── */}
        {pane === 'p-clients' && (
          <div>
            <div className={styles.pageHdr}><div><div className={styles.pageTitle}>Clients</div><div className={styles.pageSub}>{CLIENTS.length} clients</div></div></div>
            <div className={styles.pad}>
              <input className="form-input" placeholder="🔍  Rechercher un client…" value={clientQ} onChange={e => setClientQ(e.target.value)} style={{marginBottom:14}} />
              <div className="panel" style={{overflowX:'auto'}}>
                <table>
                  <thead><tr><th>Nom</th><th>Véhicules</th><th>Dernière visite</th><th>Total</th><th>Statut</th><th></th></tr></thead>
                  <tbody>
                    {filteredClients.map((c,i) => (
                      <tr key={i}>
                        <td><strong>{c.name}</strong><br/><span style={{fontSize:9,color:'var(--ink3)'}}>{c.email}</span></td>
                        <td>{c.vehicles.map(v => <span key={v} className="badge badge-gray" style={{marginRight:3}}>{v}</span>)}</td>
                        <td style={{fontFamily:'var(--mono)',fontSize:11}}>{c.last}</td>
                        <td style={{fontFamily:'var(--mono)',fontSize:12,color:'var(--green)'}}>{c.total}</td>
                        <td><span className={`badge ${c.cls}`}>{c.status}</span></td>
                        <td><button className="btn" style={{fontSize:10}} onClick={() => toast(`Alerte envoyée à ${c.name} 📱`,'success')}>Alerter</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ── PROMOS ── */}
        {pane === 'p-promos' && (
          <div>
            <div className={styles.pageHdr}><div><div className={styles.pageTitle}>Promotions</div><div className={styles.pageSub}>Gérez vos offres clients</div></div></div>
            <div className={styles.pad}>
              <div className={styles.g2}>
                <div>
                  {[{pct:'20%',title:"SUR Vidange d'huile",desc:'Valide 1–5 avr. · Code: OIL20 · Envoyé à 47 clients',status:'Active',cls:'badge-green',stats:'32 vues · 8 résa'},
                    {pct:'$10',title:'SUR Lavage complet',desc:'Valide 1–15 avr. · Tous nouveaux clients',status:'Planifiée',cls:'badge-blue',stats:'Débute 1 avr.'}].map((p,i) => (
                    <div key={i} style={{background:'linear-gradient(135deg,var(--green-bg),var(--blue-bg))',border:'1px solid var(--border)',borderRadius:10,padding:16,marginBottom:10,position:'relative',overflow:'hidden'}}>
                      <div style={{fontFamily:'var(--display)',fontSize:40,fontWeight:800,color:'var(--green)',lineHeight:1,marginBottom:4}}>{p.pct}</div>
                      <div style={{fontFamily:'var(--display)',fontWeight:700,fontSize:14,marginBottom:4}}>{p.title}</div>
                      <div style={{fontSize:11,color:'var(--ink2)',lineHeight:1.5}}>{p.desc}</div>
                      <div style={{marginTop:9,display:'flex',gap:5}}><span className={`badge ${p.cls}`}>{p.status}</span><span className="badge badge-gray">{p.stats}</span></div>
                    </div>
                  ))}
                </div>
                <div className="panel">
                  <div className="panel-hd"><div className="panel-title">📣 Nouvelle promo</div></div>
                  <div className="panel-body">
                    <div className="form-group"><label className="form-label">Service</label><input className="form-input" value={promoSvc} onChange={e => setPromoSvc(e.target.value)} /></div>
                    <div className="form-group"><label className="form-label">Réduction</label><input className="form-input" value={promoVal} onChange={e => setPromoVal(e.target.value)} placeholder="Ex: 20% ou $15"/></div>
                    <div className="form-group"><label className="form-label">Date de fin</label><input className="form-input" type="date" /></div>
                    <div className="form-group"><label className="form-label">Message</label><input className="form-input" placeholder="Message personnalisé…"/></div>
                    <button className="btn btn-green" style={{width:'100%',justifyContent:'center'}} onClick={() => toast(`Promo ${promoVal} sur ${promoSvc} envoyée à 47 clients! 🚀`,'success')}>
                      Envoyer la promo →
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── MARKETPLACE ── */}
        {pane === 'p-marketplace' && <Marketplace portal="provider" />}

        {/* ── PROFILE ── */}
        {pane === 'p-profile' && (
          <div>
            <div className={styles.pageHdr}><div><div className={styles.pageTitle}>Profil atelier</div><div className={styles.pageSub}>Votre page publique FlashMat</div></div><button className="btn btn-green" onClick={() => toast('Profil sauvegardé ✅','success')}>Sauvegarder</button></div>
            <div className={styles.pad}>
              <div className={styles.g2}>
                <div>
                  <div className="panel">
                    <div className="panel-hd"><div className="panel-title">🏪 Informations</div></div>
                    <div className="panel-body">
                      <div className="form-group"><label className="form-label">Nom de l'atelier</label><input className="form-input" defaultValue="Garage Los Santos" /></div>
                      <div className="form-group"><label className="form-label">Adresse</label><input className="form-input" defaultValue="7999 14e Avenue, Montréal, QC" /></div>
                      <div className="form-group"><label className="form-label">Téléphone</label><input className="form-input" defaultValue="(514) 374-2829" /></div>
                      <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" defaultValue="losssantos@email.com" /></div>
                      <div className="form-group"><label className="form-label">Description</label><textarea className="form-input" rows={3} defaultValue="Mécaniciens certifiés ASE. Spécialistes toutes marques. Devis gratuit." style={{resize:'vertical'}} /></div>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="panel">
                    <div className="panel-hd"><div className="panel-title">⏰ Horaires</div></div>
                    <div className="panel-body">
                      {[['Lundi – Vendredi','07:30','17:30'],['Samedi','09:00','16:00'],['Dimanche',null,null]].map(([d,o,f]) => (
                        <div key={d} style={{display:'grid',gridTemplateColumns:'110px 1fr 1fr',gap:8,alignItems:'center',marginBottom:8}}>
                          <span style={{fontSize:11,color:'var(--ink2)'}}>{d}</span>
                          {o ? <><input className="form-input" defaultValue={o} type="time" /><input className="form-input" defaultValue={f} type="time" /></> : <><input className="form-input" placeholder="Fermé" disabled style={{opacity:.4}} /><input className="form-input" placeholder="Fermé" disabled style={{opacity:.4}} /></>}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="panel">
                    <div className="panel-hd"><div className="panel-title">⚙️ Services offerts</div></div>
                    <div className="panel-body">
                      {[['🔧','Mécanique auto',true],['🔩','Pneus',true],['🚿','Lave-auto',false],['🎨','Carrosserie',false],['🪟','Vitres auto',false]].map(([ico,name,on]) => (
                        <div key={name} style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                          <div style={{display:'flex',alignItems:'center',gap:8}}><span>{ico}</span><span style={{fontSize:12,fontWeight:500}}>{name}</span></div>
                          <div style={{width:36,height:19,borderRadius:9,background:on?'var(--green)':'var(--bg3)',border:`1px solid ${on?'var(--green)':'var(--border)'}`,cursor:'pointer',display:'flex',alignItems:'center',padding:2,justifyContent:on?'flex-end':'flex-start'}}
                            onClick={e => { e.currentTarget.style.background = on?'var(--bg3)':'var(--green)'; toast('Service mis à jour ✅') }}>
                            <div style={{width:14,height:14,background:'#fff',borderRadius:'50%'}} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MOBILE BOTTOM NAV */}
        <nav className={styles.bottomNav}>
          {[['p-dashboard','⚡','Accueil'],['p-tasks','✅','Tâches'],['p-bookings','📅','Résa'],['p-clients','👥','Clients'],['p-promos','📣','Promos']].map(([id,icon,label]) => (
            <button key={id} className={`${styles.bnItem} ${pane===id?styles.bnActive:''}`} onClick={() => go(id)}>
              <span style={{fontSize:18}}>{icon}</span><span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      <FlashAI portal="provider" userName={name} />
    </div>
  )
}

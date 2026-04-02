import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { supabase } from '../lib/supabase'
import FlashAI from '../components/FlashAI'
import BookingModal from '../components/BookingModal'
import styles from './AppShell.module.css'

const NAV = [
  { id: 'dashboard',     icon: '⚡', label: 'Tableau de bord' },
  { id: 'bookings',      icon: '📅', label: 'Réservations', badge: true },
  { id: 'search',        icon: '🗺️', label: 'Trouver un service' },
  { id: 'vehicles',      icon: '🚗', label: 'Mes véhicules' },
  { id: 'maintenance',   icon: '🔧', label: 'Entretien' },
  { id: 'marketplace',   icon: '🛒', label: 'Marketplace' },
  { id: 'flashscore',    icon: '📊', label: 'FlashScore™' },
  { id: 'notifications', icon: '🔔', label: 'Alertes', badge: true },
]

const SEARCH_CATS = [
  ['all','Tous'],['mechanic','🔧 Mécanique'],['wash','🚿 Lave-auto'],
  ['tire','🔩 Pneus'],['body','🎨 Carrosserie'],['glass','🪟 Vitres'],
  ['tow','🚛 Remorquage'],['parts','⚙️ Pièces'],['parking','🅿️ Parking'],
]

export default function ClientApp() {
  const { profile, signOut } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [pane, setPane] = useState('dashboard')
  const [sidebarOpen, setSidebar] = useState(false)
  const [bookingModal, setBookingModal] = useState(false)
  const [providers, setProviders] = useState([])
  const [provLoading, setProvLoading] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [searchCat, setSearchCat] = useState('all')

  const name = profile?.full_name || 'Alex'

  useEffect(() => { fetchProviders() }, [])

  async function fetchProviders() {
    setProvLoading(true)
    const { data } = await supabase
      .from('providers_list')
      .select('*')
      .order('rating', { ascending: false })
      .limit(100)
    setProviders(data || [])
    setProvLoading(false)
  }

  const filtered = providers.filter(p => {
    const matchCat = searchCat === 'all' || p.type === searchCat
    const q = searchQ.toLowerCase()
    const matchQ = !q || p.name?.toLowerCase().includes(q) ||
      p.type_label?.toLowerCase().includes(q) ||
      p.address?.toLowerCase().includes(q)
    return matchCat && matchQ
  })

  function go(id) { setPane(id); setSidebar(false) }
return (
    <div className={styles.shell}>
      {sidebarOpen && <div className={styles.overlay} onClick={() => setSidebar(false)} />}

      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sbHeader}>
          <div className={styles.sbLogo}>
            <div className={styles.sbHex}>FM</div>
            <div className={styles.sbLogoText}>Flash<span style={{color:'var(--green)'}}>Mat</span></div>
          </div>
          <span className={`${styles.sbMode} ${styles.modeClient}`}>CLIENT</span>
        </div>
        <nav className={styles.sbNav}>
          <div className={styles.sbSection}>
            <div className={styles.sbLbl}>Principal</div>
            {NAV.slice(0,4).map(n => (
              <button key={n.id} className={`${styles.navItem} ${pane===n.id?styles.navActive:''}`} onClick={() => go(n.id)}>
                <span className={styles.ni}>{n.icon}</span>{n.label}
              </button>
            ))}
          </div>
          <div className={styles.sbSection}>
            <div className={styles.sbLbl}>Fonctionnalités</div>
            {NAV.slice(4).map(n => (
              <button key={n.id} className={`${styles.navItem} ${pane===n.id?styles.navActive:''}`} onClick={() => go(n.id)}>
                <span className={styles.ni}>{n.icon}</span>{n.label}
              </button>
            ))}
          </div>
        </nav>
        <div className={styles.sbBottom}>
          <div className={styles.userChip} onClick={() => { signOut(); navigate('/') }}>
            <div className={`${styles.avatar} ${styles.avatarGreen}`}>{name.slice(0,2).toUpperCase()}</div>
            <div><div className={styles.userName}>{name}</div><div className={styles.userRole}>client · montréal</div></div>
            <span style={{marginLeft:'auto',color:'var(--ink3)',fontSize:11}}>←</span>
          </div>
        </div>
      </aside>

      <div className={styles.main}>
        <div className={styles.mobileTopbar}>
          <button className={styles.menuBtn} onClick={() => setSidebar(true)}>☰</button>
          <div style={{fontFamily:'var(--display)',fontWeight:800,fontSize:17}}>Flash<span style={{color:'var(--green)'}}>Mat</span></div>
          <button className="btn btn-green" style={{fontSize:11,padding:'7px 12px'}} onClick={() => setBookingModal(true)}>+ Réserver</button>
        </div>

        {pane === 'dashboard' && (
          <div>
            <div className={styles.pageHdr}>
              <div><div className={styles.pageTitle}>Bonjour, {name} 👋</div><div className={styles.pageSub}>Bienvenue sur FlashMat</div></div>
              <button className="btn btn-green" onClick={() => setBookingModal(true)}>+ Réserver un service</button>
            </div>
            <div className={styles.pad}>
              <div className={styles.statsGrid}>
                <div className="stat-card sc-green"><div className="stat-lbl">Fournisseurs MTL</div><div className="stat-val">{providers.length}</div><div className="stat-sub">disponibles</div></div>
                <div className="stat-card sc-blue"><div className="stat-lbl">FlashScore™</div><div className="stat-val">87<span style={{fontSize:14}}>%</span></div><div className="stat-sub">Honda Civic</div></div>
                <div className="stat-card sc-amber"><div className="stat-lbl">Prochain service</div><div className="stat-val">7j</div><div className="stat-sub">Vidange — 6 avr.</div></div>
                <div className="stat-card sc-purple"><div className="stat-lbl">Véhicules</div><div className="stat-val">2</div><div className="stat-sub">Civic · RAV4</div></div>
              </div>
              <div style={{textAlign:'center',marginTop:20}}>
                <button className="btn btn-green btn-lg" onClick={() => go('search')}>🗺️ Trouver un fournisseur →</button>
              </div>
            </div>
          </div>
        )}

        {pane === 'search' && (
          <div>
            <div className={styles.pageHdr}>
              <div>
                <div className={styles.pageTitle}>Trouver un service</div>
                <div className={styles.pageSub}>
                  {provLoading ? 'Chargement…' : `${filtered.length} fournisseur${filtered.length!==1?'s':''} trouvé${filtered.length!==1?'s':''}`}
                </div>
              </div>
            </div>
           <div className={styles.pad}>
              <div style={{display:'flex',gap:8,marginBottom:12}}>
                <input className="form-input" placeholder="🔍  Rechercher un service, quartier…" value={searchQ} onChange={e => setSearchQ(e.target.value)} style={{flex:1,fontSize:14}} />
                {searchQ && <button className="btn" onClick={() => setSearchQ('')}>✕</button>}
              </div>
              <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:16}}>
                {SEARCH_CATS.map(([c,l]) => (
                  <button key={c} className={`btn ${searchCat===c?'btn-green':''}`} onClick={() => setSearchCat(c)}>{l}</button>
                ))}
              </div>
              {!provLoading && filtered.length > 0 && (
                <ProviderMap providers={filtered} onSelect={() => setBookingModal(true)} />
              )}
              {provLoading ? (
                <div style={{textAlign:'center',padding:60}}>
                  <div className="spinner" style={{width:32,height:32,margin:'0 auto 12px'}}/>
                  <div style={{fontFamily:'var(--mono)',fontSize:11,color:'var(--ink3)'}}>Chargement des fournisseurs…</div>
                </div>
              ) : (
                <div style={{display:'flex',flexDirection:'column',gap:10}}>
                  {filtered.map((p,i) => (
                    <div key={p.id||i} style={{background:'var(--bg2)',border:'1px solid var(--border)',borderRadius:10,padding:14,display:'flex',gap:12,alignItems:'flex-start',cursor:'pointer',boxShadow:'var(--shadow)'}}
                      onClick={() => setBookingModal(true)}>
                      <div style={{width:48,height:48,borderRadius:10,background:'var(--bg3)',border:'1px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>{p.icon||'🔧'}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontFamily:'var(--display)',fontWeight:700,fontSize:14,marginBottom:2}}>{p.name}</div>
                        <div style={{fontSize:11,color:'var(--ink2)',marginBottom:6}}>{p.type_label} · {p.address} · ⭐{p.rating} ({p.reviews} avis) · {p.phone}</div>
                        <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>{(p.services||[]).slice(0,3).map(s => <span key={s} className="badge badge-gray">{s}</span>)}</div>
                      </div>
                      <div style={{display:'flex',flexDirection:'column',gap:6,alignItems:'flex-end',flexShrink:0}}>
                        <span style={{fontFamily:'var(--mono)',fontSize:10,color:'var(--ink3)'}}>{p.distance}</span>
                        <span className={`badge ${p.is_open?'badge-green':'badge-amber'}`}>{p.is_open?'● Ouvert':'● Fermé'}</span>
                        <button className="btn btn-green" style={{fontSize:10,padding:'5px 12px'}} onClick={e=>{e.stopPropagation();setBookingModal(true)}}>Réserver</button>
                      </div>
                    </div>
                  ))}
                  {filtered.length===0 && (
                    <div style={{textAlign:'center',color:'var(--ink3)',padding:60}}>
                      <div style={{fontSize:40,marginBottom:12}}>🔍</div>
                      <div style={{fontFamily:'var(--display)',fontWeight:700,fontSize:16,marginBottom:6}}>Aucun résultat</div>
                      <button className="btn" style={{marginTop:12}} onClick={() => {setSearchQ('');setSearchCat('all')}}>Réinitialiser</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {pane === 'vehicles' && (
          <div>
            <div className={styles.pageHdr}><div><div className={styles.pageTitle}>Mes véhicules</div></div></div>
            <div className={styles.pad}>
              <div className={styles.g2}>
                {[{make:'Honda Civic',year:2019,plate:'AAB 1234',badge:'Principal',badgeCls:'badge-green',score:87,oil:22,brakes:90,battery:91},
                  {make:'Toyota RAV4',year:2021,plate:'ZZC 9876',badge:'Secondaire',badgeCls:'badge-blue',score:96,oil:65,brakes:95,battery:99}].map(v => (
                  <div key={v.make} style={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:10,padding:16}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                      <div style={{fontFamily:'var(--display)',fontSize:18,fontWeight:800}}>{v.make} {v.year}</div>
                      <span className={`badge ${v.badgeCls}`}>{v.badge}</span>
                    </div>
                    <div style={{fontFamily:'var(--mono)',fontSize:10,background:'var(--bg2)',border:'1px solid var(--border)',padding:'3px 8px',borderRadius:4,display:'inline-block',marginBottom:12}}>{v.plate}</div>
                    {[['FlashScore™',v.score,'green'],['Huile',v.oil,'amber'],['Freins',v.brakes,'green'],['Batterie',v.battery,'blue']].map(([l,val,c]) => (
                      <div key={l} style={{marginBottom:8}}>
                        <div style={{display:'flex',justifyContent:'space-between',fontSize:11,marginBottom:3}}><span style={{color:'var(--ink2)'}}>{l}</span><span style={{color:`var(--${c})`,fontFamily:'var(--mono)'}}>{val}%</span></div>
                        <div className="prog-bar"><div className="prog-fill" style={{width:`${val}%`,background:`var(--${c})`}}/></div>
                      </div>
                    ))}
                    <button className="btn btn-green" style={{marginTop:8,width:'100%',justifyContent:'center'}} onClick={() => setBookingModal(true)}>Réserver un service</button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {pane === 'maintenance' && (
          <div>
            <div className={styles.pageHdr}><div><div className={styles.pageTitle}>Entretien</div></div></div>
            <div className={styles.pad}>
              <div style={{background:'var(--red-bg)',border:'1px solid rgba(239,68,68,.25)',borderRadius:10,padding:14,marginBottom:12,display:'flex',gap:10,alignItems:'center'}}>
                <span style={{fontSize:20}}>🛢️</span>
                <div style={{flex:1}}><div style={{fontWeight:700}}>Vidange en retard — Honda Civic</div><div style={{fontSize:11,color:'var(--ink2)'}}>5 200 km de dépassement</div></div>
                <button className="btn btn-green" onClick={() => setBookingModal(true)}>Réserver</button>
              </div>
              {[{icon:'🔩',title:'Rotation des pneus',meta:'Honda Civic · 10 avr.'},{icon:'🧊',title:'Liquide refroidissement',meta:'RAV4 · 22 avr.'},{icon:'🔋',title:'Test batterie',meta:'Honda Civic · Avant mai'}].map(item => (
                <div key={item.title} style={{background:'var(--bg3)',border:'1px solid var(--border)',borderRadius:10,padding:12,display:'flex',gap:10,marginBottom:8,alignItems:'center'}}>
                  <span style={{fontSize:20}}>{item.icon}</span>
                  <div style={{flex:1}}><div style={{fontWeight:600,fontSize:13}}>{item.title}</div><div style={{fontSize:11,color:'var(--ink2)'}}>{item.meta}</div></div>
                  <button className="btn" style={{fontSize:10}} onClick={() => setBookingModal(true)}>Réserver</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {pane === 'marketplace' && (
          <div>
            <div className={styles.pageHdr}><div><div className={styles.pageTitle}>Marketplace</div></div><button className="btn btn-green" onClick={() => toast('Bientôt disponible! 📦','success')}>+ Publier</button></div>
            <div className={styles.pad}>
              <div style={{textAlign:'center',padding:60,color:'var(--ink3)'}}>
                <div style={{fontSize:40,marginBottom:12}}>🛒</div>
                <div style={{fontFamily:'var(--display)',fontWeight:700,fontSize:18,marginBottom:8}}>Marketplace bientôt disponible</div>
                <div style={{fontSize:13}}>Achat et vente de pièces entre Montréalais</div>
              </div>
            </div>
          </div>
        )}

        {pane === 'flashscore' && (
          <div>
            <div className={styles.pageHdr}><div><div className={styles.pageTitle}>FlashScore™</div></div></div>
            <div className={styles.pad}>
              <div className={styles.g2}>
                {[{make:'Honda Civic',year:2019,score:87,items:[['Moteur',92,'green'],['Freins',90,'green'],['Pneus',78,'blue'],['Batterie',91,'blue'],['Huile',22,'amber']]},
                  {make:'Toyota RAV4',year:2021,score:96,items:[['Moteur',99,'green'],['Freins',95,'green'],['Pneus',90,'green'],['Batterie',99,'blue'],['Huile',65,'green']]}].map(v => (
                  <div key={v.make} className="panel">
                    <div className="panel-hd"><div className="panel-title">📊 {v.make} {v.year}</div><span className="badge badge-green">{v.score}%</span></div>
                    <div className="panel-body">
                      <div style={{width:80,height:80,borderRadius:'50%',border:'6px solid var(--green)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',background:'var(--green-bg)'}}>
                        <span style={{fontFamily:'var(--display)',fontSize:20,fontWeight:800,color:'var(--green)'}}>{v.score}</span>
                      </div>
                      {v.items.map(([l,val,c]) => (
                        <div key={l} style={{display:'flex',alignItems:'center',gap:8,marginBottom:8,fontSize:11}}>
                          <span style={{width:6,height:6,borderRadius:'50%',background:`var(--${c})`,flexShrink:0}}/>
                          <span style={{flex:1,color:'var(--ink2)'}}>{l}</span>
                          <span style={{fontFamily:'var(--mono)',fontSize:10}}>{val}%</span>
                          <div style={{width:60}}><div className="prog-bar"><div className="prog-fill" style={{width:`${val}%`,background:`var(--${c})`}}/></div></div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {pane === 'notifications' && (
          <div>
            <div className={styles.pageHdr}><div><div className={styles.pageTitle}>Alertes</div></div></div>
            <div className={styles.pad}>
              <div className="panel">
                {[{icon:'✅',bg:'var(--green-bg)',title:'Votre voiture est prête!',sub:'Garage Los Santos — Honda Civic',time:"Aujourd'hui 14h04",badge:'Nouveau',badgeCls:'badge-green'},
                  {icon:'🏷️',bg:'var(--green-bg)',title:'Promo: 20% sur vidange!',sub:'Code OIL20 · Valide 1–5 avr.',time:'Hier 10h30',badge:'Nouveau',badgeCls:'badge-green'},
                  {icon:'🚨',bg:'var(--amber-bg)',title:'Rappel manufacturier Honda Civic',sub:'Capteur ABS · Vérification gratuite',time:'Il y a 2 jours',badge:'Urgent',badgeCls:'badge-amber'}].map((n,i,arr) => (
                  <div key={i} style={{display:'flex',gap:10,padding:'12px 14px',borderBottom:i<arr.length-1?'1px solid var(--border)':'none',alignItems:'flex-start'}}>
                    <div style={{width:34,height:34,borderRadius:8,background:n.bg,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0}}>{n.icon}</div>
                    <div style={{flex:1}}><div style={{fontSize:12,fontWeight:600,marginBottom:2}}>{n.title}</div><div style={{fontSize:11,color:'var(--ink2)'}}>{n.sub}</div><div style={{fontFamily:'var(--mono)',fontSize:9,color:'var(--ink3)',marginTop:3}}>{n.time}</div></div>
                    <span className={`badge ${n.badgeCls}`}>{n.badge}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {pane === 'bookings' && (
          <div>
            <div className={styles.pageHdr}><div><div className={styles.pageTitle}>Mes réservations</div></div><button className="btn btn-green" onClick={() => setBookingModal(true)}>+ Nouvelle</button></div>
            <div className={styles.pad}>
              <div style={{textAlign:'center',padding:40,color:'var(--ink3)'}}>
                <div style={{fontSize:40,marginBottom:12}}>📅</div>
                <div style={{fontFamily:'var(--display)',fontWeight:700,fontSize:16,marginBottom:8}}>Aucune réservation pour l'instant</div>
                <button className="btn btn-green btn-lg" onClick={() => go('search')}>Trouver un fournisseur →</button>
              </div>
            </div>
          </div>
        )}

        <nav className={styles.bottomNav}>
          {[['dashboard','⚡','Accueil'],['bookings','📅','Résa'],['search','🗺️','Services'],['vehicles','🚗','Autos'],['notifications','🔔','Alertes']].map(([id,icon,label]) => (
            <button key={id} className={`${styles.bnItem} ${pane===id?styles.bnActive:''}`} onClick={() => go(id)}>
              <span style={{fontSize:18}}>{icon}</span><span>{label}</span>
            </button>
          ))}
        </nav>
      </div>

      {bookingModal && <BookingModal providers={filtered} onClose={() => setBookingModal(false)} onConfirm={() => { setBookingModal(false); toast('✅ Réservation confirmée!','success') }} />}
      <FlashAI portal="client" userName={name} />
    </div>
  )
}

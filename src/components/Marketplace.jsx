import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import NewListingModal from './NewListingModal'
import { normalizeMarketplaceListing } from '../lib/marketplace'

const CATS = ['Tous','Pièces moteur','Pneus & Jantes','Carrosserie','Freins & Suspension','Accessoires','Audio & Tech','Outils','Autres']
const SORTS = [['recent','Plus récents'],['price_asc','Prix ↑'],['price_desc','Prix ↓']]

function timeAgo(ts) {
  const diff = (Date.now() - new Date(ts)) / 1000
  if (diff < 3600)  return `${Math.floor(diff/60)}min`
  if (diff < 86400) return `${Math.floor(diff/3600)}h`
  return `${Math.floor(diff/86400)}j`
}

export default function Marketplace({ portal = 'client', openComposer = false }) {
  const { user, profile } = useAuth()
  const [listings, setListings]     = useState([])
  const [loading, setLoading]       = useState(true)
  const [cat, setCat]               = useState('Tous')
  const [sort, setSort]             = useState('recent')
  const [search, setSearch]         = useState('')
  const [showModal, setShowModal]   = useState(false)
  const [myOnly, setMyOnly]         = useState(false)
  const [expanded, setExpanded]     = useState(null)

  useEffect(() => { fetchListings() }, [])

  useEffect(() => {
    setShowModal(Boolean(openComposer && user && profile))
  }, [openComposer, profile, user])

  function openComposerModal() {
    if (!user || !profile) {
      window.sessionStorage.setItem('flashmat-post-login-redirect', '/app/marketplace')
      window.dispatchEvent(new CustomEvent('flashmat-login-modal-open'))
      return
    }

    setShowModal(true)
  }

  async function fetchListings() {
    setLoading(true)
    const { data } = await supabase.from('marketplace')
      .select('*').eq('is_active', true).order('created_at', { ascending: false })
    setListings((data || []).map(normalizeMarketplaceListing))
    setLoading(false)
  }

  async function deleteListing(id) {
    await supabase.from('marketplace').update({ is_active: false }).eq('id', id)
    setListings(l => l.filter(x => x.id !== id))
  }

  const filtered = listings
    .filter(l => cat === 'Tous' || l.category === cat)
    .filter(l => !myOnly || l.seller_id === user?.id)
    .filter(l => !search || l.title.toLowerCase().includes(search.toLowerCase()) || l.description?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sort === 'price_asc')  return (a.price||0) - (b.price||0)
      if (sort === 'price_desc') return (b.price||0) - (a.price||0)
      return new Date(b.created_at) - new Date(a.created_at)
    })

  return (
    <div>
      {/* HEADER */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'20px 24px 0', flexWrap:'wrap', gap:10 }}>
        <div>
          <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:22, letterSpacing:'-.5px' }}>Marketplace</div>
          <div style={{ fontSize:12, color:'var(--ink3)', marginTop:2 }}>
            {loading ? '…' : `${filtered.length} annonce${filtered.length!==1?'s':''} disponible${filtered.length!==1?'s':''}`}
          </div>
        </div>
        <button className="btn btn-green" onClick={openComposerModal}>+ Publier une annonce</button>
      </div>

      {/* SEARCH + SORT */}
      <div style={{ padding:'16px 24px 0', display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
        <input className="form-input" placeholder="🔍  Rechercher une annonce…" value={search} onChange={e => setSearch(e.target.value)}
          style={{ flex:1, minWidth:200, fontSize:13 }} />
        <select className="form-select" value={sort} onChange={e => setSort(e.target.value)} style={{ width:150, fontSize:13 }}>
          {SORTS.map(([k,l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        {user && (
          <button className={`btn ${myOnly?'btn-green':''}`} onClick={() => setMyOnly(m => !m)} style={{ fontSize:12, whiteSpace:'nowrap' }}>
            Mes annonces
          </button>
        )}
      </div>

      {/* CATEGORY PILLS */}
      <div style={{ padding:'12px 24px 0', display:'flex', gap:6, overflowX:'auto', scrollbarWidth:'none' }}>
        {CATS.map(c => (
          <button key={c} onClick={() => setCat(c)}
            style={{ flexShrink:0, background: cat===c?'var(--green)':'var(--bg3)', color: cat===c?'#fff':'var(--ink2)', border:`1px solid ${cat===c?'var(--green)':'var(--border)'}`, borderRadius:20, padding:'6px 14px', fontSize:12, fontWeight:600, cursor:'pointer', transition:'all .15s', whiteSpace:'nowrap' }}>
            {c}
          </button>
        ))}
      </div>

      {/* LISTINGS GRID */}
      <div style={{ padding:'16px 24px 24px' }}>
        {loading ? (
          <div style={{ textAlign:'center', padding:60 }}>
            <div className="spinner" style={{ width:32, height:32, margin:'0 auto 12px' }} />
            <div style={{ fontSize:12, color:'var(--ink3)', fontFamily:'var(--mono)' }}>Chargement des annonces…</div>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign:'center', padding:60, color:'var(--ink3)' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>📦</div>
            <div style={{ fontFamily:'var(--display)', fontWeight:700, fontSize:17, marginBottom:8 }}>
              {search || cat !== 'Tous' ? 'Aucun résultat' : 'Aucune annonce pour l\'instant'}
            </div>
            <div style={{ fontSize:13, marginBottom:20 }}>Soyez le premier à publier!</div>
            <button className="btn btn-green btn-lg" onClick={openComposerModal}>+ Publier une annonce</button>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:14 }}>
            {filtered.map(l => (
              <div key={l.id}
                style={{ background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:14, overflow:'hidden', transition:'all .2s', boxShadow:'var(--shadow)' }}
                onMouseEnter={e => e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,.1)'}
                onMouseLeave={e => e.currentTarget.style.boxShadow='var(--shadow)'}>

                {/* CARD PHOTO or ICON HEADER */}
                {l.image_url ? (
                  <div style={{ height:160, overflow:'hidden', borderBottom:'1px solid var(--border)', position:'relative' }}>
                    <img src={l.image_url} alt={l.title} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                    <div style={{ position:'absolute', top:8, left:8, display:'flex', gap:4 }}>
                      <span className="badge badge-gray" style={{ backdropFilter:'blur(6px)', background:'rgba(0,0,0,.45)', color:'#fff', border:'none' }}>{l.category}</span>
                      <span className="badge" style={{ backdropFilter:'blur(6px)', background:'rgba(37,99,235,.7)', color:'#fff', border:'none' }}>{l.condition}</span>
                    </div>
                  </div>
                ) : (
                  <div style={{ background:'linear-gradient(135deg, var(--bg3), var(--bg2))', padding:'20px 16px 16px', borderBottom:'1px solid var(--border)', display:'flex', gap:12, alignItems:'flex-start' }}>
                    <div style={{ width:52, height:52, borderRadius:12, background:'var(--bg2)', border:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:26, flexShrink:0 }}>{l.icon}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontWeight:700, fontSize:14, lineHeight:1.3, marginBottom:4 }}>{l.title}</div>
                      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                        <span className="badge badge-gray">{l.category}</span>
                        <span className="badge" style={{ background:'rgba(37,99,235,.1)', color:'var(--blue)', border:'1px solid rgba(37,99,235,.2)' }}>{l.condition}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* CARD BODY */}
                <div style={{ padding:'14px 16px' }}>
                  {l.image_url && (
                    <div style={{ fontWeight:700, fontSize:14, lineHeight:1.3, marginBottom:8 }}>{l.title}</div>
                  )}
                  {l.description && (
                    <div style={{ fontSize:12, color:'var(--ink2)', marginBottom:10, lineHeight:1.5 }}>
                      {expanded === l.id ? l.description : l.description.slice(0, 80) + (l.description.length > 80 ? '…' : '')}
                      {l.description.length > 80 && (
                        <button onClick={() => setExpanded(expanded === l.id ? null : l.id)}
                          style={{ background:'none', border:'none', color:'var(--green)', fontSize:11, cursor:'pointer', marginLeft:4 }}>
                          {expanded === l.id ? 'Réduire' : 'Voir plus'}
                        </button>
                      )}
                    </div>
                  )}

                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                    <div style={{ fontFamily:'var(--display)', fontWeight:800, fontSize:22, color:'var(--green)', letterSpacing:'-.5px' }}>
                      {l.price != null ? `$${Number(l.price).toFixed(0)}` : 'Prix à discuter'}
                    </div>
                    <div style={{ fontSize:11, color:'var(--ink3)', fontFamily:'var(--mono)' }}>
                      il y a {timeAgo(l.created_at)}
                    </div>
                  </div>

                  <div style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 12px', background:'var(--bg3)', borderRadius:8, marginBottom:10 }}>
                    <div style={{ width:28, height:28, borderRadius:'50%', background: l.seller_type==='provider'?'var(--blue-bg)':'var(--green-bg)', border:`1px solid ${l.seller_type==='provider'?'rgba(37,99,235,.2)':'rgba(22,199,132,.2)'}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, flexShrink:0 }}>
                      {l.seller_type === 'provider' ? '🏪' : '👤'}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{l.seller_name}</div>
                      <div style={{ fontSize:10, color:'var(--ink3)', fontFamily:'var(--mono)' }}>{l.seller_type === 'provider' ? 'Fournisseur' : 'Client'}</div>
                    </div>
                  </div>

                  <div style={{ display:'flex', gap:6 }}>
                    {l.phone ? (
                      <a href={`tel:${l.phone}`} className="btn btn-green" style={{ flex:1, textAlign:'center', fontSize:12, textDecoration:'none', display:'flex', alignItems:'center', justifyContent:'center', gap:4 }}>
                        📞 {l.phone}
                      </a>
                    ) : (
                      <div className="btn" style={{ flex:1, textAlign:'center', fontSize:12, color:'var(--ink3)', cursor:'default' }}>Contacter le vendeur</div>
                    )}
                    {l.seller_id === user?.id && (
                      <button className="btn" style={{ color:'var(--red)', borderColor:'rgba(239,68,68,.3)', fontSize:12, padding:'0 12px' }}
                        onClick={() => { if (confirm('Supprimer cette annonce?')) deleteListing(l.id) }}>
                        🗑
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && user && profile && (
        <NewListingModal
          onClose={() => setShowModal(false)}
          onCreated={listing => { setListings(prev => [listing, ...prev]); setShowModal(false) }}
        />
      )}
    </div>
  )
}

import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const CATEGORIES = ['Pièces moteur','Pneus & Jantes','Carrosserie','Freins & Suspension','Accessoires','Audio & Tech','Outils','Autres']
const CONDITIONS = ['Neuf','Très bon état','Bon état','Acceptable']
const ICONS = ['🔧','🔩','🚗','🏎️','⚙️','🛞','🪟','🎨','🔋','📦','🛠️','💡','🎵','🛡️']

export default function NewListingModal({ onClose, onCreated }) {
  const { user, profile } = useAuth()
  const fileRef = useRef()
  const [form, setForm] = useState({
    title: '', description: '', price: '', category: 'Pièces moteur',
    condition: 'Bon état', icon: '🔧', phone: '',
  })
  const [photos, setPhotos]     = useState([])   // { file, preview }[]
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function handleFiles(e) {
    const files = Array.from(e.target.files).slice(0, 4 - photos.length)
    const newPhotos = files.map(file => ({ file, preview: URL.createObjectURL(file) }))
    setPhotos(prev => [...prev, ...newPhotos].slice(0, 4))
  }

  function removePhoto(idx) {
    setPhotos(prev => prev.filter((_, i) => i !== idx))
  }

  async function uploadPhoto(file) {
    const ext  = file.name.split('.').pop()
    const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { error } = await supabase.storage.from('marketplace').upload(path, file, { upsert: false })
    if (error) throw error
    const { data } = supabase.storage.from('marketplace').getPublicUrl(path)
    return data.publicUrl
  }

  async function submit(e) {
    e.preventDefault()
    if (!user || !profile) {
      setError('Connexion requise pour publier une annonce.')
      return
    }
    if (!form.title.trim() || !form.price) { setError('Titre et prix requis.'); return }
    setLoading(true); setError('')
    try {
      // Upload all photos
      const urls = await Promise.all(photos.map(p => uploadPhoto(p.file)))
      const { data, error: err } = await supabase.from('marketplace_listings').insert({
        seller_id:   user.id,
        seller_name: profile?.full_name || 'Vendeur',
        seller_type: profile?.role || 'client',
        title:       form.title.trim(),
        description: form.description.trim(),
        price:       parseFloat(form.price),
        category:    form.category,
        condition:   form.condition,
        icon:        form.icon,
        phone:       form.phone.trim(),
        image_url:   urls[0] || null,
      }).select().single()
      if (err) throw err
      onCreated({ ...data, _extra_images: urls.slice(1) })
    } catch (err) {
      setError('Erreur: ' + err.message)
    }
    setLoading(false)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 540, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <div className="modal-title" style={{ marginBottom:0 }}>🛒 Publier une annonce</div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'var(--ink3)' }}>✕</button>
        </div>

        <form onSubmit={submit}>
          {/* PHOTO UPLOAD */}
          <div className="form-group">
            <label className="form-label">Photos <span style={{ color:'var(--ink3)', fontWeight:400 }}>(max 4)</span></label>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
              {photos.map((p, i) => (
                <div key={i} style={{ position:'relative', width:80, height:80, borderRadius:10, overflow:'hidden', border:'1px solid var(--border)', flexShrink:0 }}>
                  <img src={p.preview} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  <button type="button" onClick={() => removePhoto(i)}
                    style={{ position:'absolute', top:3, right:3, background:'rgba(0,0,0,.6)', border:'none', borderRadius:'50%', width:20, height:20, color:'#fff', fontSize:11, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', lineHeight:1 }}>
                    ✕
                  </button>
                  {i === 0 && <div style={{ position:'absolute', bottom:0, left:0, right:0, background:'rgba(22,199,132,.8)', fontSize:9, color:'#fff', textAlign:'center', padding:'2px 0', fontFamily:'var(--mono)' }}>PRINCIPALE</div>}
                </div>
              ))}
              {photos.length < 4 && (
                <button type="button" onClick={() => fileRef.current.click()}
                  style={{ width:80, height:80, borderRadius:10, border:'2px dashed var(--border)', background:'var(--bg3)', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:4, color:'var(--ink3)', transition:'all .15s', flexShrink:0 }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor='var(--green)'; e.currentTarget.style.color='var(--green)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--ink3)' }}>
                  <span style={{ fontSize:22 }}>📷</span>
                  <span style={{ fontSize:10, fontFamily:'var(--mono)' }}>Ajouter</span>
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" multiple style={{ display:'none' }} onChange={handleFiles} />
            </div>
            {photos.length === 0 && (
              <div style={{ fontSize:11, color:'var(--ink3)', marginTop:6 }}>JPG, PNG, WebP · La 1ère photo sera la photo principale</div>
            )}
          </div>

          {/* ICON (shown only if no photo) */}
          {photos.length === 0 && (
            <div className="form-group">
              <label className="form-label">Icône (si pas de photo)</label>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {ICONS.map(ico => (
                  <button key={ico} type="button" onClick={() => set('icon', ico)}
                    style={{ width:38, height:38, fontSize:19, border:`2px solid ${form.icon===ico?'var(--green)':'var(--border)'}`, borderRadius:8, background: form.icon===ico?'var(--green-bg)':'var(--bg3)', cursor:'pointer', transition:'all .15s' }}>
                    {ico}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Titre de l'annonce *</label>
            <input className="form-input" placeholder="Ex: Pneus Michelin 205/55R16 — lot de 4" value={form.title} onChange={e => set('title', e.target.value)} required />
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div className="form-group">
              <label className="form-label">Catégorie</label>
              <select className="form-select" value={form.category} onChange={e => set('category', e.target.value)}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">État</label>
              <select className="form-select" value={form.condition} onChange={e => set('condition', e.target.value)}>
                {CONDITIONS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div className="form-group">
              <label className="form-label">Prix ($) *</label>
              <input className="form-input" type="number" min="0" step="0.01" placeholder="Ex: 150" value={form.price} onChange={e => set('price', e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Téléphone contact</label>
              <input className="form-input" placeholder="514-xxx-xxxx" value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-input" rows={3} placeholder="Décrivez votre article, état, raison de vente…" value={form.description} onChange={e => set('description', e.target.value)} style={{ resize:'vertical' }} />
          </div>

          {error && <div style={{ color:'var(--red)', fontSize:12, marginBottom:12 }}>{error}</div>}

          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn btn-green btn-lg" disabled={loading}>
              {loading
                ? <><span className="spinner" style={{ width:16, height:16 }} /> Upload en cours…</>
                : '📢 Publier l\'annonce'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

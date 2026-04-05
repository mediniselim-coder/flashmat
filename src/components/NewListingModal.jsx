import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { normalizeMarketplaceListing, serializeMarketplaceDescription } from '../lib/marketplace'

const CATEGORIES = ['Pieces moteur','Pneus et jantes','Carrosserie','Freins et suspension','Accessoires','Audio et tech','Outils','Autres']
const CONDITIONS = ['Neuf','Tres bon etat','Bon etat','Acceptable']
const ICONS = ['ME','PN','VH','PR','PC','RW','VT','CR','BT','MP','TL','EL','AD','SH']

export default function NewListingModal({ onClose, onCreated }) {
  const { user, profile } = useAuth()
  const fileRef = useRef()
  const [form, setForm] = useState({
    title: '', description: '', price: '', category: 'Pieces moteur',
    condition: 'Bon etat', icon: 'ME', phone: '',
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

  function fileToDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = () => reject(new Error('Impossible de lire le fichier'))
      reader.readAsDataURL(file)
    })
  }

  function loadImageElement(src) {
    return new Promise((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error('Impossible de charger l image'))
      image.src = src
    })
  }

  async function optimizePhoto(file) {
    const rawDataUrl = await fileToDataUrl(file)
    const image = await loadImageElement(rawDataUrl)
    const ratio = Math.min(1200 / image.width, 900 / image.height, 1)
    const width = Math.max(1, Math.round(image.width * ratio))
    const height = Math.max(1, Math.round(image.height * ratio))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')

    if (!context) throw new Error('Impossible de preparer l image')

    context.drawImage(image, 0, 0, width, height)
    return canvas.toDataURL('image/jpeg', 0.8)
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
      const optimizedPhotos = await Promise.all(photos.map(p => optimizePhoto(p.file)))
      const { data, error: err } = await supabase.from('marketplace').insert({
        seller_id:   user.id,
        title:       form.title.trim(),
        description: serializeMarketplaceDescription(form.description.trim(), {
          condition: form.condition,
          icon: form.icon,
          phone: form.phone.trim(),
          imageUrl: optimizedPhotos[0] || '',
          sellerName: profile?.full_name || 'Vendeur',
          sellerType: profile?.role || 'client',
          city: 'Montreal',
        }),
        price:       parseFloat(form.price),
        category:    form.category,
      }).select().single()
      if (err) throw err
      onCreated(normalizeMarketplaceListing(data))
    } catch (err) {
      setError('Erreur: ' + err.message)
    }
    setLoading(false)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 540, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <div className="modal-title" style={{ marginBottom:0 }}>Publier une annonce</div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'var(--ink3)' }}>x</button>
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
                    x
                  </button>
                  {i === 0 && <div style={{ position:'absolute', bottom:0, left:0, right:0, background:'rgba(22,199,132,.8)', fontSize:9, color:'#fff', textAlign:'center', padding:'2px 0', fontFamily:'var(--mono)' }}>PRINCIPALE</div>}
                </div>
              ))}
              {photos.length < 4 && (
                <button type="button" onClick={() => fileRef.current.click()}
                  style={{ width:80, height:80, borderRadius:10, border:'2px dashed var(--border)', background:'var(--bg3)', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:4, color:'var(--ink3)', transition:'all .15s', flexShrink:0 }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor='var(--green)'; e.currentTarget.style.color='var(--green)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--ink3)' }}>
                  <span style={{ fontSize:22 }}>PH</span>
                  <span style={{ fontSize:10, fontFamily:'var(--mono)' }}>Ajouter</span>
                </button>
              )}
              <input ref={fileRef} type="file" accept="image/*" multiple style={{ display:'none' }} onChange={handleFiles} />
            </div>
            {photos.length === 0 && (
              <div style={{ fontSize:11, color:'var(--ink3)', marginTop:6 }}>JPG, PNG, WebP Â· La 1Ã¨re photo sera la photo principale</div>
            )}
          </div>

          {/* ICON (shown only if no photo) */}
          {photos.length === 0 && (
            <div className="form-group">
              <label className="form-label">IcÃ´ne (si pas de photo)</label>
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
            <input className="form-input" placeholder="Ex: Pneus Michelin 205/55R16 â€” lot de 4" value={form.title} onChange={e => set('title', e.target.value)} required />
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div className="form-group">
              <label className="form-label">CatÃ©gorie</label>
              <select className="form-select" value={form.category} onChange={e => set('category', e.target.value)}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Ã‰tat</label>
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
              <label className="form-label">TÃ©lÃ©phone contact</label>
              <input className="form-input" placeholder="514-xxx-xxxx" value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-input" rows={3} placeholder="DÃ©crivez votre article, Ã©tat, raison de venteâ€¦" value={form.description} onChange={e => set('description', e.target.value)} style={{ resize:'vertical' }} />
          </div>

          {error && <div style={{ color:'var(--red)', fontSize:12, marginBottom:12 }}>{error}</div>}

          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose}>Annuler</button>
            <button type="submit" className="btn btn-green btn-lg" disabled={loading}>
              {loading
                ? <><span className="spinner" style={{ width:16, height:16 }} /> Upload en cours...</>
                : 'Publier l annonce'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

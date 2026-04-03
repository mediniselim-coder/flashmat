import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const CATEGORIES = ['Pièces moteur','Pneus & Jantes','Carrosserie','Freins & Suspension','Accessoires','Audio & Tech','Outils','Autres']
const CONDITIONS = ['Neuf','Très bon état','Bon état','Acceptable']
const ICONS = ['🔧','🔩','🚗','🏎️','⚙️','🛞','🪟','🎨','🔋','📦','🛠️','💡','🎵','🛡️']

export default function NewListingModal({ onClose, onCreated }) {
  const { user, profile } = useAuth()
  const [form, setForm] = useState({
    title: '', description: '', price: '', category: 'Pièces moteur',
    condition: 'Bon état', icon: '🔧', phone: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function submit(e) {
    e.preventDefault()
    if (!form.title.trim() || !form.price) { setError('Titre et prix requis.'); return }
    setLoading(true); setError('')
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
    }).select().single()
    setLoading(false)
    if (err) { setError('Erreur: ' + err.message); return }
    onCreated(data)
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 520 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <div className="modal-title" style={{ marginBottom:0 }}>🛒 Publier une annonce</div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:20, cursor:'pointer', color:'var(--ink3)' }}>✕</button>
        </div>

        <form onSubmit={submit}>
          {/* ICON PICKER */}
          <div className="form-group">
            <label className="form-label">Icône</label>
            <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
              {ICONS.map(ico => (
                <button key={ico} type="button" onClick={() => set('icon', ico)}
                  style={{ width:40, height:40, fontSize:20, border:`2px solid ${form.icon===ico?'var(--green)':'var(--border)'}`, borderRadius:8, background: form.icon===ico?'var(--green-bg)':'var(--bg3)', cursor:'pointer', transition:'all .15s' }}>
                  {ico}
                </button>
              ))}
            </div>
          </div>

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
              {loading ? <span className="spinner" style={{ width:16, height:16 }} /> : '📢 Publier l\'annonce'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

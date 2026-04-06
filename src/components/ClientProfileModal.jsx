import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'

export default function ClientProfileModal({ onClose }) {
  const { user, profile, updateProfile } = useAuth()
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setForm({
      full_name: profile?.full_name || '',
      email: profile?.email || user?.email || '',
      phone: profile?.phone || '',
      address: profile?.address || '',
      city: profile?.city || 'Montreal',
    })
  }, [profile, user?.email])

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!form.full_name.trim() || !form.email.trim()) {
      setError('Name and email are required.')
      return
    }

    setError('')
    setLoading(true)

    try {
      await updateProfile({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
      })
      onClose()
    } catch (submitError) {
      setError(submitError.message || 'Unable to update your profile.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 620, maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div className="modal-title" style={{ marginBottom: 0 }}>Edit client profile</div>
            <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 4 }}>
              Keep your contact details current across FlashMat.
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--ink3)' }}>X</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="form-group">
              <label className="form-label">Full name</label>
              <input className="form-input" value={form.full_name} onChange={(event) => setField('full_name', event.target.value)} placeholder="Your full name" />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={form.email} onChange={(event) => setField('email', event.target.value)} placeholder="you@email.com" />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="form-group">
              <label className="form-label">Phone number</label>
              <input className="form-input" value={form.phone} onChange={(event) => setField('phone', event.target.value)} placeholder="514-555-0000" />
            </div>
            <div className="form-group">
              <label className="form-label">City</label>
              <input className="form-input" value={form.city} onChange={(event) => setField('city', event.target.value)} placeholder="Montreal" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Address</label>
            <input className="form-input" value={form.address} onChange={(event) => setField('address', event.target.value)} placeholder="Street address, apartment, suite..." />
          </div>

          {error && <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 12 }}>{error}</div>}

          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-green btn-lg" disabled={loading}>
              {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : 'Save profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

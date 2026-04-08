import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { loadGoogleMapsApi } from '../lib/googleMaps'

const GOOGLE_PLACES_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Unable to read the image file'))
    reader.readAsDataURL(file)
  })
}

function readPlacePart(components, type, useShort = false) {
  const component = components.find((item) => item.types?.includes(type))
  if (!component) return ''
  return useShort ? component.short_name || component.long_name || '' : component.long_name || component.short_name || ''
}

function formatStreetAddress(components) {
  const streetNumber = readPlacePart(components, 'street_number')
  const route = readPlacePart(components, 'route')
  const subpremise = readPlacePart(components, 'subpremise')

  const base = [streetNumber, route].filter(Boolean).join(' ').trim()
  if (subpremise && base) return `${base}, ${subpremise}`
  return subpremise || base
}

export default function ClientProfileModal({ onClose }) {
  const { user, profile, updateProfile, deleteAccount } = useAuth()
  const fileRef = useRef(null)
  const addressInputRef = useRef(null)
  const autocompleteRef = useRef(null)
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    province: '',
    postal_code: '',
    avatar_url: '',
  })
  const [loading, setLoading] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState('')

  useEffect(() => {
    setForm({
      full_name: profile?.full_name || '',
      email: profile?.email || user?.email || '',
      phone: profile?.phone || '',
      address: profile?.address || '',
      city: profile?.city || 'Montreal',
      province: profile?.province || 'QC',
      postal_code: profile?.postal_code || '',
      avatar_url: profile?.avatar_url || '',
    })
  }, [profile, user?.email])

  useEffect(() => {
    let cancelled = false
    let listener = null

    async function connectGoogleAutocomplete() {
      if (!addressInputRef.current || autocompleteRef.current) return

      try {
        const google = await loadGoogleMapsApi(['places'])
        if (cancelled || !addressInputRef.current) return

        const autocomplete = new google.maps.places.Autocomplete(addressInputRef.current, {
          types: ['address'],
          fields: ['address_components', 'formatted_address'],
          componentRestrictions: { country: ['ca', 'us'] },
        })

        autocompleteRef.current = autocomplete
        listener = autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace()
          const components = place?.address_components || []
          const streetAddress = formatStreetAddress(components) || place?.formatted_address || ''
          const city = readPlacePart(components, 'locality')
            || readPlacePart(components, 'postal_town')
            || readPlacePart(components, 'sublocality')
          const province = readPlacePart(components, 'administrative_area_level_1', true)
          const postalCode = readPlacePart(components, 'postal_code')

          setForm((current) => ({
            ...current,
            address: streetAddress || current.address,
            city: city || current.city,
            province: province || current.province,
            postal_code: postalCode || current.postal_code,
          }))
        })
      } catch {
        // Keep normal browser autofill behavior when Google Places is unavailable.
      }
    }

    connectGoogleAutocomplete()

    return () => {
      cancelled = true
      if (listener?.remove) listener.remove()
      autocompleteRef.current = null
    }
  }, [])

  function setField(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  async function handleAvatarChange(event) {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setError('Choose a valid image file for the profile picture.')
      return
    }

    setError('')

    try {
      const dataUrl = await fileToDataUrl(file)
      setField('avatar_url', dataUrl)
    } catch (uploadError) {
      setError(uploadError.message || 'Unable to prepare the profile image.')
    }
  }

  function removeAvatar() {
    setField('avatar_url', '')
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (
      !form.full_name.trim() ||
      !form.email.trim() ||
      !form.phone.trim() ||
      !form.address.trim() ||
      !form.city.trim() ||
      !form.province.trim() ||
      !form.postal_code.trim()
    ) {
      setError('Complete the required account fields before saving.')
      return
    }

    setError('')
    setLoading(true)

    try {
      await updateProfile({
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        province: form.province.trim(),
        postal_code: form.postal_code.trim().toUpperCase(),
        avatar_url: form.avatar_url || '',
      })
      onClose()
    } catch (submitError) {
      setError(submitError.message || 'Unable to update your profile.')
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteAccount() {
    if (confirmDelete.trim().toUpperCase() !== 'DELETE') {
      setError('Type DELETE to confirm account deletion.')
      return
    }

    setError('')
    setDeleting(true)

    try {
      await deleteAccount()
      onClose()
      window.location.href = '/'
    } catch (deleteError) {
      setError(deleteError.message || 'Unable to delete your account.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 620, maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div className="modal-title" style={{ marginBottom: 0 }}>Edit client profile</div>
            <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 4 }}>
              Keep the essential account details up to date across FlashMat.
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--ink3)' }}>X</button>
        </div>

        <form onSubmit={handleSubmit} autoComplete="on">
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 14, alignItems: 'center', marginBottom: 10 }}>
            <div style={{ width: 120, height: 120, borderRadius: 22, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {form.avatar_url ? (
                <img src={form.avatar_url} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ fontFamily: 'var(--display)', fontSize: 34, fontWeight: 800, color: 'var(--blue)' }}>
                  {(form.full_name || 'FM').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <div style={{ fontFamily: 'var(--display)', fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>Profile picture</div>
              <div style={{ fontSize: 12, color: 'var(--ink2)', lineHeight: 1.7, marginBottom: 12 }}>
                Add a profile image so your account is easier to recognize across bookings and services.
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
                <button type="button" className="btn" onClick={() => fileRef.current?.click()}>Upload photo</button>
                {form.avatar_url && <button type="button" className="btn" onClick={removeAvatar}>Remove photo</button>}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="form-group">
              <label className="form-label">Full name</label>
              <input className="form-input" autoComplete="name" value={form.full_name} onChange={(event) => setField('full_name', event.target.value)} placeholder="Your full name" />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" autoComplete="email" value={form.email} readOnly aria-readonly="true" placeholder="you@email.com" style={{ background: 'var(--bg3)', color: 'var(--ink2)', cursor: 'not-allowed' }} />
              <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 6 }}>Email is locked and stays tied to the account you signed in with.</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="form-group">
              <label className="form-label">Phone number</label>
              <input className="form-input" autoComplete="tel" inputMode="tel" value={form.phone} onChange={(event) => setField('phone', event.target.value)} placeholder="514-555-0000" />
            </div>
            <div className="form-group">
              <label className="form-label">City</label>
              <input className="form-input" autoComplete="address-level2" value={form.city} onChange={(event) => setField('city', event.target.value)} placeholder="Montreal" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Street address</label>
            <input ref={addressInputRef} className="form-input" autoComplete="street-address" value={form.address} onChange={(event) => setField('address', event.target.value)} placeholder="Street address, apartment, suite..." />
            <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 6 }}>
              {GOOGLE_PLACES_KEY
                ? 'Address suggestions are powered by Google Places.'
                : 'Google Places autocomplete is ready, but it needs a VITE_GOOGLE_MAPS_API_KEY to activate.'}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="form-group">
              <label className="form-label">Province / State</label>
              <input className="form-input" autoComplete="address-level1" value={form.province} onChange={(event) => setField('province', event.target.value)} placeholder="QC" />
            </div>
            <div className="form-group">
              <label className="form-label">Postal code</label>
              <input className="form-input" autoComplete="postal-code" value={form.postal_code} onChange={(event) => setField('postal_code', event.target.value)} placeholder="H2X 1Y4" />
            </div>
          </div>

          {error && <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 12 }}>{error}</div>}

          <div style={{ marginTop: 18, background: 'rgba(239, 68, 68, 0.06)', border: '1px solid rgba(239, 68, 68, 0.18)', borderRadius: 16, padding: '14px 16px', marginBottom: 14 }}>
            <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 16, color: 'var(--ink)', marginBottom: 6 }}>
              Delete account
            </div>
            <div style={{ fontSize: 12, color: 'var(--ink2)', lineHeight: 1.7, marginBottom: 10 }}>
              This permanently removes your FlashMat account and signs you out. Type <strong>DELETE</strong> to confirm.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center' }}>
              <input
                className="form-input"
                value={confirmDelete}
                onChange={(event) => setConfirmDelete(event.target.value)}
                placeholder="Type DELETE"
                disabled={deleting}
              />
              <button
                type="button"
                className="btn"
                onClick={handleDeleteAccount}
                disabled={deleting}
                style={{
                  color: '#fff',
                  background: 'var(--red)',
                  borderColor: 'rgba(239, 68, 68, 0.4)',
                  minWidth: 136,
                  justifyContent: 'center',
                }}
              >
                {deleting ? <span className="spinner" style={{ width: 16, height: 16 }} /> : 'Delete account'}
              </button>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-green btn-lg" disabled={loading || deleting}>
              {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : 'Save profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

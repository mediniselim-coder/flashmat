import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { loadGoogleMapsApi } from '../lib/googleMaps'
import {
  DEFAULT_PROVIDER_HOURS,
  PROVIDER_SERVICE_OPTIONS,
  inferTypeMeta,
  mergeProviderProfile,
  saveProviderOverride,
  serializeProviderDescription,
  hoursToDisplayMap,
} from '../lib/providerProfiles'
import { supabase } from '../lib/supabase'

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

function emptyStaffMember() {
  return {
    id: crypto.randomUUID(),
    name: '',
    role: '',
    photo_url: '',
  }
}

export default function ProviderProfileModal({ onClose, onSaved }) {
  const { user, profile, updateProfile } = useAuth()
  const logoRef = useRef(null)
  const addressInputRef = useRef(null)
  const autocompleteRef = useRef(null)
  const staffFileRefs = useRef({})
  const [form, setForm] = useState({
    shop_name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    province: '',
    postal_code: '',
    logo_url: '',
    description: '',
    services: [],
    staffMembers: [],
    coverPhoto: '',
    galleryPhotos: [],
    editableHours: DEFAULT_PROVIDER_HOURS,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadProviderState() {
      if (!user?.id) return

      const { data } = await supabase
        .from('providers')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()

      if (cancelled) return

      const merged = mergeProviderProfile({
        ...(data || {}),
        id: user.id,
        name: data?.shop_name || profile?.full_name || user?.email?.split('@')[0] || '',
        providerEmail: profile?.email || user?.email || '',
      })

      setForm({
        shop_name: merged.name || profile?.full_name || '',
        email: profile?.email || user?.email || '',
        phone: merged.phone || profile?.phone || '',
        address: merged.address || profile?.address || '',
        city: profile?.city || 'Montreal',
        province: profile?.province || 'QC',
        postal_code: profile?.postal_code || '',
        logo_url: merged.logoImageUrl || profile?.avatar_url || '',
        description: merged.description || '',
        services: merged.services || [],
        staffMembers: Array.isArray(merged.staffMembers) && merged.staffMembers.length > 0 ? merged.staffMembers : [emptyStaffMember()],
        coverPhoto: merged.coverPhoto || '',
        galleryPhotos: merged.galleryPhotos || [],
        editableHours: merged.editableHours || DEFAULT_PROVIDER_HOURS,
      })
    }

    loadProviderState()
    return () => {
      cancelled = true
    }
  }, [profile?.address, profile?.avatar_url, profile?.city, profile?.email, profile?.full_name, profile?.phone, profile?.postal_code, profile?.province, user?.email, user?.id])

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
        // Fall back to regular browser autofill.
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

  function toggleService(serviceLabel) {
    setForm((current) => {
      const exists = current.services.includes(serviceLabel)
      return {
        ...current,
        services: exists
          ? current.services.filter((service) => service !== serviceLabel)
          : [...current.services, serviceLabel],
      }
    })
  }

  function updateStaffMember(id, key, value) {
    setForm((current) => ({
      ...current,
      staffMembers: current.staffMembers.map((member) => (member.id === id ? { ...member, [key]: value } : member)),
    }))
  }

  function addStaffMember() {
    setForm((current) => ({
      ...current,
      staffMembers: [...current.staffMembers, emptyStaffMember()],
    }))
  }

  function removeStaffMember(id) {
    setForm((current) => ({
      ...current,
      staffMembers: current.staffMembers.filter((member) => member.id !== id),
    }))
  }

  async function handleLogoChange(event) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Choose a valid image file for the provider logo.')
      return
    }

    setError('')
    try {
      const dataUrl = await fileToDataUrl(file)
      setField('logo_url', dataUrl)
    } catch (uploadError) {
      setError(uploadError.message || 'Unable to prepare the logo.')
    }
  }

  function removeLogo() {
    setField('logo_url', '')
    if (logoRef.current) logoRef.current.value = ''
  }

  async function handleStaffPhotoChange(memberId, event) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Choose a valid image file for the staff member.')
      return
    }

    setError('')
    try {
      const dataUrl = await fileToDataUrl(file)
      updateStaffMember(memberId, 'photo_url', dataUrl)
    } catch (uploadError) {
      setError(uploadError.message || 'Unable to prepare the staff image.')
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (
      !form.shop_name.trim()
      || !form.phone.trim()
      || !form.address.trim()
      || !form.city.trim()
      || !form.province.trim()
      || !form.postal_code.trim()
      || !form.description.trim()
      || form.services.length === 0
    ) {
      setError('Complete the provider account details before saving.')
      return
    }

    setError('')
    setLoading(true)

    try {
      await updateProfile({
        full_name: form.shop_name.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        province: form.province.trim(),
        postal_code: form.postal_code.trim().toUpperCase(),
        avatar_url: form.logo_url || '',
      })

      const staffMembers = form.staffMembers
        .map((member) => ({
          ...member,
          name: String(member.name || '').trim(),
          role: String(member.role || '').trim(),
          photo_url: member.photo_url || '',
        }))
        .filter((member) => member.name || member.role || member.photo_url)

      const typeMeta = inferTypeMeta(form.services)
      const publicHours = hoursToDisplayMap(form.editableHours)
      const meta = {
        editableHours: form.editableHours,
        hours: publicHours,
        coverPhoto: form.coverPhoto,
        galleryPhotos: form.galleryPhotos,
        logoImageUrl: form.logo_url || '',
        staffMembers,
      }

      const providerRecord = {
        id: user.id,
        shop_name: form.shop_name.trim(),
        address: form.address.trim(),
        phone: form.phone.trim(),
        description: serializeProviderDescription(form.description.trim(), meta),
        services: form.services,
        rating: 0,
        reviews: 0,
        is_open: true,
        ...typeMeta,
      }

      const { error: providerError } = await supabase
        .from('providers')
        .upsert(providerRecord, { onConflict: 'id' })

      if (providerError) throw providerError

      const overridePayload = {
        name: form.shop_name.trim(),
        address: form.address.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        description: form.description.trim(),
        services: form.services,
        editableHours: form.editableHours,
        hours: publicHours,
        coverPhoto: form.coverPhoto,
        galleryPhotos: form.galleryPhotos,
        logoImageUrl: form.logo_url || '',
        staffMembers,
        ...typeMeta,
      }

      saveProviderOverride({ id: user.id, email: form.email.trim(), name: form.shop_name.trim() }, overridePayload)
      window.dispatchEvent(new CustomEvent('flashmat-provider-profile-updated'))
      onSaved?.()
      onClose()
    } catch (submitError) {
      setError(submitError.message || 'Unable to save the provider profile.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 760, maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div className="modal-title" style={{ marginBottom: 0 }}>Edit provider profile</div>
            <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 4 }}>
              Manage the public FlashMat profile clients see before they book.
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--ink3)' }}>X</button>
        </div>

        <form onSubmit={handleSubmit} autoComplete="on">
          <div style={{ display: 'grid', gridTemplateColumns: '128px 1fr', gap: 14, alignItems: 'center', marginBottom: 12 }}>
            <div style={{ width: 128, height: 128, borderRadius: 24, overflow: 'hidden', border: '1px solid var(--border)', background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {form.logo_url ? (
                <img src={form.logo_url} alt="Provider logo" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ fontFamily: 'var(--display)', fontSize: 34, fontWeight: 800, color: 'var(--blue)' }}>
                  {(form.shop_name || 'FM').split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <div style={{ fontFamily: 'var(--display)', fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>Provider logo</div>
              <div style={{ fontSize: 12, color: 'var(--ink2)', lineHeight: 1.7, marginBottom: 12 }}>
                Use a recognizable logo for the provider card, header chip, and public FlashMat profile.
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input ref={logoRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleLogoChange} />
                <button type="button" className="btn" onClick={() => logoRef.current?.click()}>Upload logo</button>
                {form.logo_url && <button type="button" className="btn" onClick={removeLogo}>Remove logo</button>}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="form-group">
              <label className="form-label">Provider name</label>
              <input className="form-input" value={form.shop_name} onChange={(event) => setField('shop_name', event.target.value)} placeholder="Garage, shop, or studio name" />
            </div>
            <div className="form-group">
              <label className="form-label">Email</label>
              <input className="form-input" type="email" value={form.email} readOnly aria-readonly="true" style={{ background: 'var(--bg3)', color: 'var(--ink2)', cursor: 'not-allowed' }} />
              <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 6 }}>Email is locked to the provider account you signed in with.</div>
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
            <input ref={addressInputRef} className="form-input" autoComplete="street-address" value={form.address} onChange={(event) => setField('address', event.target.value)} placeholder="Street address, unit, suite..." />
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

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea
              className="form-input"
              rows={4}
              value={form.description}
              onChange={(event) => setField('description', event.target.value)}
              placeholder="Describe the shop, specialties, response time, and what makes the provider trustworthy."
              style={{ resize: 'vertical' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Services offered</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
              {PROVIDER_SERVICE_OPTIONS.map((service) => (
                <button
                  key={service.id}
                  type="button"
                  onClick={() => toggleService(service.label)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    textAlign: 'left',
                    border: `1px solid ${form.services.includes(service.label) ? 'var(--green)' : 'var(--border)'}`,
                    background: form.services.includes(service.label) ? 'var(--green-bg)' : 'var(--bg3)',
                    borderRadius: 10,
                    padding: '10px 12px',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 600,
                  }}
                >
                  <span>{service.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 10 }}>
              <label className="form-label" style={{ marginBottom: 0 }}>Staff members</label>
              <button type="button" className="btn" onClick={addStaffMember}>Add staff member</button>
            </div>

            <div style={{ display: 'grid', gap: 12 }}>
              {form.staffMembers.map((member) => (
                <div key={member.id} style={{ border: '1px solid var(--border)', borderRadius: 14, padding: 12, background: 'var(--bg3)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '88px minmax(0,1fr) auto', gap: 12, alignItems: 'center' }}>
                    <div style={{ width: 88, height: 88, borderRadius: 18, overflow: 'hidden', border: '1px solid var(--border)', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {member.photo_url ? (
                        <img src={member.photo_url} alt={member.name || 'Staff'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 800, color: 'var(--blue)' }}>
                          {(member.name || 'S').slice(0, 1).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <input className="form-input" value={member.name} onChange={(event) => updateStaffMember(member.id, 'name', event.target.value)} placeholder="Staff name" />
                      <input className="form-input" value={member.role} onChange={(event) => updateStaffMember(member.id, 'role', event.target.value)} placeholder="Role or specialty" />
                    </div>
                    <div style={{ display: 'grid', gap: 8 }}>
                      <input
                        ref={(node) => { if (node) staffFileRefs.current[member.id] = node }}
                        type="file"
                        accept="image/*"
                        style={{ display: 'none' }}
                        onChange={(event) => { void handleStaffPhotoChange(member.id, event) }}
                      />
                      <button type="button" className="btn" onClick={() => staffFileRefs.current[member.id]?.click()}>Photo</button>
                      <button type="button" className="btn" onClick={() => removeStaffMember(member.id)}>Remove</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error && <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 12 }}>{error}</div>}

          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-green btn-lg" disabled={loading}>
              {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : 'Save provider profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

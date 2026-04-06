import { useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { normalizeMarketplaceListing, serializeMarketplaceDescription } from '../lib/marketplace'

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Unable to read the file'))
    reader.readAsDataURL(file)
  })
}

function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Unable to load the image'))
    image.src = src
  })
}

async function optimizePhoto(file) {
  const rawDataUrl = await fileToDataUrl(file)
  const image = await loadImageElement(rawDataUrl)
  const ratio = Math.min(1400 / image.width, 1000 / image.height, 1)
  const width = Math.max(1, Math.round(image.width * ratio))
  const height = Math.max(1, Math.round(image.height * ratio))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')

  if (!context) throw new Error('Unable to prepare the image')

  context.drawImage(image, 0, 0, width, height)
  return canvas.toDataURL('image/jpeg', 0.82)
}

export default function SellVehicleModal({ vehicle, existingListing = null, onClose, onCreated, onRemoved }) {
  const { user, profile } = useAuth()
  const fileRef = useRef(null)
  const [price, setPrice] = useState(existingListing?.price ? String(existingListing.price) : '')
  const [phone, setPhone] = useState(existingListing?.phone || '')
  const [description, setDescription] = useState(existingListing?.description || '')
  const [coverPhoto, setCoverPhoto] = useState(existingListing?.image_url || vehicle?.image_url || vehicle?.photo_url || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const isEditing = Boolean(existingListing?.id)
  const title = useMemo(() => `${vehicle?.make || ''} ${vehicle?.model || ''} ${vehicle?.year || ''}`.trim(), [vehicle])

  function handleFiles(event) {
    const file = event.target.files?.[0]
    if (!file) return

    const preview = URL.createObjectURL(file)
    setCoverPhoto(preview)
  }

  async function handleSubmit(event) {
    event.preventDefault()

    if (!user || !profile || !vehicle?.id) {
      setError('You need to sign in to publish a vehicle listing.')
      return
    }

    if (!price) {
      setError('Price is required.')
      return
    }

    setError('')
    setLoading(true)

    try {
      let finalImageUrl = coverPhoto || vehicle.image_url || vehicle.photo_url || ''
      if (typeof finalImageUrl === 'string' && finalImageUrl.startsWith('blob:') && fileRef.current?.files?.[0]) {
        finalImageUrl = await optimizePhoto(fileRef.current.files[0])
      }

      const vehicleSnapshot = {
        id: vehicle.id,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        vin: vehicle.vin || vehicle.serial_number || '',
        plate: vehicle.plate || '',
        color: vehicle.color || '',
        mileage: vehicle.mileage ?? null,
        imageUrl: finalImageUrl || vehicle.image_url || vehicle.photo_url || '',
        flashScore: vehicle.flash_score || null,
      }

      const payload = {
        seller_id: user.id,
        title,
        description: serializeMarketplaceDescription(description.trim(), {
          condition: 'Vehicle for sale',
          icon: 'VH',
          phone: phone.trim(),
          imageUrl: vehicleSnapshot.imageUrl,
          sellerName: profile?.full_name || 'Vehicle owner',
          sellerType: 'client',
          city: 'Montreal',
          listingType: 'vehicle',
          audience: 'all',
          vehicleId: vehicle.id,
          vehiclePublicPath: `/marketplace/vehicles/${existingListing?.id || '__PENDING__'}`,
          vehicleSnapshot,
        }),
        price: parseFloat(price),
        category: 'Vehicle Marketplace',
        is_active: true,
      }

      let listingResult

      if (isEditing) {
        listingResult = await supabase
          .from('marketplace')
          .update(payload)
          .eq('id', existingListing.id)
          .eq('seller_id', user.id)
          .select()
          .single()
      } else {
        listingResult = await supabase
          .from('marketplace')
          .insert(payload)
          .select()
          .single()
      }

      if (listingResult.error) throw listingResult.error

      const listingId = listingResult.data.id
      const descriptionWithPath = serializeMarketplaceDescription(description.trim(), {
        condition: 'Vehicle for sale',
        icon: 'VH',
        phone: phone.trim(),
        imageUrl: vehicleSnapshot.imageUrl,
        sellerName: profile?.full_name || 'Vehicle owner',
        sellerType: 'client',
        city: 'Montreal',
        listingType: 'vehicle',
        audience: 'all',
        vehicleId: vehicle.id,
        vehiclePublicPath: `/marketplace/vehicles/${listingId}`,
        vehicleSnapshot,
      })

      const { data: finalData, error: finalError } = await supabase
        .from('marketplace')
        .update({ description: descriptionWithPath })
        .eq('id', listingId)
        .select()
        .single()

      if (finalError) throw finalError

      onCreated(normalizeMarketplaceListing(finalData))
      onClose()
    } catch (submitError) {
      setError(submitError.message || 'Unable to publish the vehicle listing.')
    } finally {
      setLoading(false)
    }
  }

  async function handleRemoveListing() {
    if (!existingListing?.id || !user?.id) return
    if (!window.confirm(`Remove ${title} from the marketplace and keep it in your garage?`)) return

    setLoading(true)
    setError('')

    try {
      const { error: removeError } = await supabase
        .from('marketplace')
        .update({ is_active: false })
        .eq('id', existingListing.id)
        .eq('seller_id', user.id)

      if (removeError) throw removeError
      onRemoved(existingListing.id)
      onClose()
    } catch (submitError) {
      setError(submitError.message || 'Unable to remove the vehicle listing.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 620, maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div className="modal-title" style={{ marginBottom: 0 }}>{isEditing ? 'Update vehicle listing' : 'Sell this vehicle'}</div>
            <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 4 }}>
              The public listing stays tied to the FlashMat vehicle profile for this car.
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--ink3)' }}>X</button>
        </div>

        <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 16, padding: 14, display: 'flex', gap: 12, alignItems: 'center', marginBottom: 18 }}>
          <img src={coverPhoto || '/vehicle-fallback.svg'} alt={title} style={{ width: 96, height: 72, objectFit: 'cover', borderRadius: 12, border: '1px solid var(--border)' }} />
          <div>
            <div style={{ fontFamily: 'var(--display)', fontSize: 20, fontWeight: 800, color: 'var(--ink)' }}>{title}</div>
            <div style={{ fontSize: 12, color: 'var(--ink2)', marginTop: 4 }}>
              {vehicle?.mileage ? `${Number(vehicle.mileage).toLocaleString()} km` : 'Mileage not set'} {vehicle?.plate ? `· ${vehicle.plate}` : ''}
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Cover photo</label>
            <input ref={fileRef} className="form-input" type="file" accept="image/*" onChange={handleFiles} />
            <div style={{ marginTop: 8, fontSize: 11, color: 'var(--ink3)' }}>
              If you do not choose a new image, FlashMat will use the vehicle photo from your garage.
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div className="form-group">
              <label className="form-label">Price ($)</label>
              <input className="form-input" type="number" min="0" step="0.01" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="Example: 84900" />
            </div>
            <div className="form-group">
              <label className="form-label">Contact phone</label>
              <input className="form-input" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="514-xxx-xxxx" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Vehicle story</label>
            <textarea className="form-input" rows={4} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe the condition, maintenance history, upgrades, and reason for selling..." style={{ resize: 'vertical' }} />
          </div>

          {error && <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 12 }}>{error}</div>}

          <div className="modal-actions" style={{ justifyContent: 'space-between' }}>
            <div>
              {isEditing ? (
                <button type="button" className="btn" style={{ color: 'var(--red)', borderColor: 'rgba(239,68,68,.18)' }} onClick={handleRemoveListing} disabled={loading}>
                  Remove from marketplace
                </button>
              ) : null}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button type="button" className="btn" onClick={onClose}>Cancel</button>
              <button type="submit" className="btn btn-green btn-lg" disabled={loading}>
                {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : (isEditing ? 'Update listing' : 'Publish listing')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

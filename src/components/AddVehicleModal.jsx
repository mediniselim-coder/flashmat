import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const VEHICLE_EXTRAS_STORAGE_KEY = 'flashmat-vehicle-extras'

function getVehicleExtrasStorageKey(userId) {
  return `${VEHICLE_EXTRAS_STORAGE_KEY}:${userId || 'anonymous'}`
}

function readVehicleExtras(userId) {
  try {
    return JSON.parse(window.localStorage.getItem(getVehicleExtrasStorageKey(userId)) || '{}')
  } catch {
    return {}
  }
}

function saveVehicleExtras(userId, vehicleId, extras) {
  if (!vehicleId) return
  const current = readVehicleExtras(userId)
  current[vehicleId] = {
    ...(current[vehicleId] || {}),
    ...extras,
  }
  window.localStorage.setItem(getVehicleExtrasStorageKey(userId), JSON.stringify(current))
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Unable to read the image file'))
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

async function optimizeVehiclePhoto(file) {
  const rawDataUrl = await fileToDataUrl(file)
  const image = await loadImageElement(rawDataUrl)
  const ratio = Math.min(1280 / image.width, 960 / image.height, 1)
  const width = Math.max(1, Math.round(image.width * ratio))
  const height = Math.max(1, Math.round(image.height * ratio))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')

  if (!context) throw new Error('Unable to prepare the vehicle image')

  context.drawImage(image, 0, 0, width, height)
  return canvas.toDataURL('image/jpeg', 0.82)
}

export default function AddVehicleModal({ onClose, onAdd }) {
  const { user } = useAuth()
  const fileRef = useRef(null)
  const [makes, setMakes] = useState([])
  const [models, setModels] = useState([])
  const [years, setYears] = useState([])
  const [manualMode, setManualMode] = useState(false)
  const [selectedMake, setSelectedMake] = useState('')
  const [selectedModel, setSelectedModel] = useState('')
  const [selectedYear, setSelectedYear] = useState('')
  const [selectedTrim, setSelectedTrim] = useState('')
  const [plate, setPlate] = useState('')
  const [color, setColor] = useState('')
  const [vin, setVin] = useState('')
  const [mileage, setMileage] = useState('')
  const [vehiclePhoto, setVehiclePhoto] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { fetchMakes() }, [])

  async function fetchMakes() {
    try {
      const { data, error: rpcError } = await supabase.rpc('get_distinct_makes')
      if (rpcError) throw rpcError
      setMakes(data?.map((entry) => entry.make).filter(Boolean) || [])
    } catch {
      setManualMode(true)
      setMakes([])
    }
  }

  async function fetchModels(make) {
    setSelectedMake(make)
    setSelectedModel('')
    setSelectedYear('')
    setSelectedTrim('')
    try {
      const { data, error: fetchError } = await supabase
        .from('vehicles_catalog')
        .select('model')
        .eq('make', make)
        .order('model')
        .limit(500)

      if (fetchError) throw fetchError
      setModels([...new Set(data?.map((entry) => entry.model).filter(Boolean))])
    } catch {
      setManualMode(true)
      setModels([])
    }
  }

  async function fetchYears(model) {
    setSelectedModel(model)
    setSelectedYear('')
    setSelectedTrim('')
    try {
      const { data, error: fetchError } = await supabase
        .from('vehicles_catalog')
        .select('year, body_type, engine, trim')
        .eq('make', selectedMake)
        .eq('model', model)
        .order('year', { ascending: false })
        .order('trim')
        .limit(500)

      if (fetchError) throw fetchError
      setYears(data || [])
    } catch {
      setManualMode(true)
      setYears([])
    }
  }

  function handlePhotoChange(event) {
    const file = event.target.files?.[0]
    if (!file) return
    setVehiclePhoto({
      file,
      preview: URL.createObjectURL(file),
    })
  }

  function removePhoto() {
    if (vehiclePhoto?.preview) URL.revokeObjectURL(vehiclePhoto.preview)
    setVehiclePhoto(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleSubmit() {
    if (!user?.id) {
      setError('You need to sign in to save a vehicle.')
      return
    }

    if (!selectedMake || !selectedModel || !selectedYear) {
      setError('Choose the brand, model, and year first.')
      return
    }

    setError('')
    setLoading(true)

    try {
      const optimizedPhoto = vehiclePhoto?.file ? await optimizeVehiclePhoto(vehiclePhoto.file) : ''
      const normalizedMileage = mileage ? String(mileage).replace(/[^\d]/g, '') : ''
      const baseVehicle = {
        owner_id: user.id,
        make: selectedMake.trim(),
        model: selectedModel.trim(),
        year: parseInt(selectedYear, 10),
        plate: plate.trim().toUpperCase(),
        color: color.trim(),
        flash_score: Math.floor(Math.random() * 20) + 80,
      }

      const extendedVehicle = {
        ...baseVehicle,
        vin: vin.trim().toUpperCase(),
        serial_number: vin.trim().toUpperCase(),
        mileage: normalizedMileage ? Number(normalizedMileage) : null,
        image_url: optimizedPhoto,
        photo_url: optimizedPhoto,
      }

      let insertResult = await supabase
        .from('vehicles')
        .insert(extendedVehicle)
        .select()
        .single()

      if (insertResult.error) {
        insertResult = await supabase
          .from('vehicles')
          .insert(baseVehicle)
          .select()
          .single()
      }

      setLoading(false)

      if (insertResult.error) {
        setError(insertResult.error.message || 'Unable to save the vehicle.')
        return
      }

      const savedVehicle = {
        ...(insertResult.data || baseVehicle),
        vin: vin.trim().toUpperCase(),
        serial_number: vin.trim().toUpperCase(),
        mileage: normalizedMileage ? Number(normalizedMileage) : null,
        image_url: optimizedPhoto,
        photo_url: optimizedPhoto,
      }

      saveVehicleExtras(user.id, savedVehicle.id, {
        vin: savedVehicle.vin,
        serial_number: savedVehicle.serial_number,
        mileage: savedVehicle.mileage,
        image_url: savedVehicle.image_url,
        photo_url: savedVehicle.photo_url,
      })

      onAdd(savedVehicle)
      onClose()
    } catch (submitError) {
      setLoading(false)
      setError(submitError.message || 'Unable to save the vehicle.')
    }
  }

  return (
    <div className="modal-overlay" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 640, maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div className="modal-title" style={{ marginBottom: 0 }}>Add a vehicle</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--ink3)' }}>X</button>
        </div>

        {!manualMode ? (
          <div className="form-group">
            <label className="form-label">Brand</label>
            <select className="form-select" value={selectedMake} onChange={(event) => fetchModels(event.target.value)}>
              <option value="">Choose a brand...</option>
              {makes.map((make) => <option key={make} value={make}>{make}</option>)}
            </select>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div className="form-group">
              <label className="form-label">Brand</label>
              <input className="form-input" value={selectedMake} onChange={(event) => setSelectedMake(event.target.value)} placeholder="Example: Toyota" />
            </div>
            <div className="form-group">
              <label className="form-label">Model</label>
              <input className="form-input" value={selectedModel} onChange={(event) => setSelectedModel(event.target.value)} placeholder="Example: RAV4" />
            </div>
            <div className="form-group">
              <label className="form-label">Year</label>
              <input className="form-input" type="number" min="1950" max="2100" value={selectedYear} onChange={(event) => setSelectedYear(event.target.value)} placeholder="2021" />
            </div>
          </div>
        )}

        {!manualMode && models.length > 0 && (
          <div className="form-group">
            <label className="form-label">Model</label>
            <select className="form-select" value={selectedModel} onChange={(event) => fetchYears(event.target.value)}>
              <option value="">Choose a model...</option>
              {models.map((model) => <option key={model} value={model}>{model}</option>)}
            </select>
          </div>
        )}

        {!manualMode && years.length > 0 && (
          <div className="form-group">
            <label className="form-label">Year and trim</label>
            <select className="form-select" value={selectedYear} onChange={(event) => {
              const nextYear = event.target.value
              setSelectedYear(nextYear)
              const selectedEntry = years.find((entry) => String(entry.year) === String(nextYear))
              setSelectedTrim(selectedEntry?.trim || '')
            }}>
              <option value="">Choose a year...</option>
              {years.map((entry, index) => (
                <option key={`${entry.year}-${entry.trim || index}`} value={entry.year}>
                  {entry.year}{entry.trim ? ` - ${entry.trim}` : ''}{entry.body_type ? ` - ${entry.body_type}` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {manualMode && (
          <div style={{ fontSize: 11, color: 'var(--ink3)', marginBottom: 12 }}>
            The detailed catalog is not available right now. You can still save your vehicle manually.
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Vehicle photo</label>
          <input ref={fileRef} className="form-input" type="file" accept="image/*" onChange={handlePhotoChange} />
          {vehiclePhoto?.preview ? (
            <div style={{ marginTop: 10, position: 'relative' }}>
              <img src={vehiclePhoto.preview} alt="Vehicle preview" style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 14, border: '1px solid var(--border)' }} />
              <button type="button" className="btn" style={{ position: 'absolute', right: 10, bottom: 10, fontSize: 11, padding: '6px 10px' }} onClick={removePhoto}>Remove photo</button>
            </div>
          ) : (
            <div style={{ marginTop: 8, fontSize: 11, color: 'var(--ink3)' }}>
              Add a clear photo of the vehicle if you want it to appear in your garage.
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="form-group">
            <label className="form-label">Serial number / VIN</label>
            <input className="form-input" placeholder="Example: 1HGCM82633A004352" value={vin} onChange={(event) => setVin(event.target.value.toUpperCase())} style={{ fontFamily: 'var(--mono)' }} />
          </div>
          <div className="form-group">
            <label className="form-label">Mileage</label>
            <input className="form-input" type="number" min="0" placeholder="Example: 84250" value={mileage} onChange={(event) => setMileage(event.target.value)} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="form-group">
            <label className="form-label">Plate (optional)</label>
            <input className="form-input" placeholder="Example: AAB 1234" value={plate} onChange={(event) => setPlate(event.target.value.toUpperCase())} style={{ fontFamily: 'var(--mono)', letterSpacing: 2 }} />
          </div>
          <div className="form-group">
            <label className="form-label">Color (optional)</label>
            <input className="form-input" placeholder="Example: Pearl white" value={color} onChange={(event) => setColor(event.target.value)} />
          </div>
        </div>

        {selectedTrim ? (
          <div style={{ marginBottom: 12, fontSize: 11, color: 'var(--ink3)' }}>
            Selected trim: {selectedTrim}
          </div>
        ) : null}

        {error && <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 12 }}>{error}</div>}

        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-green btn-lg" onClick={handleSubmit} disabled={!selectedMake || !selectedModel || !selectedYear || loading}>
            {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : 'Add vehicle'}
          </button>
        </div>
      </div>
    </div>
  )
}

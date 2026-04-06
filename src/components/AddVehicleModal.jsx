import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const VEHICLE_EXTRAS_STORAGE_KEY = 'flashmat-vehicle-extras'
const VEHICLE_RECORDS_STORAGE_KEY = 'flashmat-vehicle-records'
const DEFAULT_COLOR = '#315AA9'

function getVehicleExtrasStorageKey(userId) {
  return `${VEHICLE_EXTRAS_STORAGE_KEY}:${userId || 'anonymous'}`
}

function getVehicleRecordsStorageKey(userId) {
  return `${VEHICLE_RECORDS_STORAGE_KEY}:${userId || 'anonymous'}`
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

function readVehicleRecords(userId) {
  try {
    return JSON.parse(window.localStorage.getItem(getVehicleRecordsStorageKey(userId)) || '{}')
  } catch {
    return {}
  }
}

function saveVehicleRecord(userId, vehicle) {
  if (!userId || !vehicle?.id) return
  const current = readVehicleRecords(userId)
  current[vehicle.id] = vehicle
  window.localStorage.setItem(getVehicleRecordsStorageKey(userId), JSON.stringify(current))
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

function normalizeColorValue(value) {
  const candidate = String(value || '').trim()
  return /^#[0-9a-fA-F]{6}$/.test(candidate) ? candidate.toUpperCase() : DEFAULT_COLOR
}

function isBlobPreview(value) {
  return typeof value === 'string' && value.startsWith('blob:')
}

async function persistVehicleFields(vehicleId, fields) {
  if (!vehicleId) return {}

  const persistedFields = {}
  const entries = Object.entries(fields).filter(([, value]) => value !== undefined)

  await Promise.all(entries.map(async ([field, value]) => {
    const { error } = await supabase
      .from('vehicles')
      .update({ [field]: value })
      .eq('id', vehicleId)

    if (!error) {
      persistedFields[field] = value
    }
  }))

  return persistedFields
}

async function findVehicleByVin(vin) {
  if (!vin) return null

  try {
    const byVin = await supabase
      .from('vehicles')
      .select('*')
      .eq('vin', vin)
      .limit(1)
      .maybeSingle()

    if (byVin.data) return byVin.data
  } catch {}

  try {
    const bySerial = await supabase
      .from('vehicles')
      .select('*')
      .eq('serial_number', vin)
      .limit(1)
      .maybeSingle()

    if (bySerial.data) return bySerial.data
  } catch {}

  return null
}

export default function AddVehicleModal({
  onClose,
  onAdd,
  onSave,
  vehicle = null,
  mode = 'create',
}) {
  const { user } = useAuth()
  const fileRef = useRef(null)
  const isEditMode = mode === 'edit'
  const [makes, setMakes] = useState([])
  const [models, setModels] = useState([])
  const [years, setYears] = useState([])
  const [manualMode, setManualMode] = useState(false)
  const [selectedMake, setSelectedMake] = useState('')
  const [selectedModel, setSelectedModel] = useState('')
  const [selectedYear, setSelectedYear] = useState('')
  const [selectedTrim, setSelectedTrim] = useState('')
  const [plate, setPlate] = useState('')
  const [color, setColor] = useState(DEFAULT_COLOR)
  const [vin, setVin] = useState('')
  const [mileage, setMileage] = useState('')
  const [vehiclePhoto, setVehiclePhoto] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!isEditMode) fetchMakes()
  }, [isEditMode])

  useEffect(() => {
    if (!vehicle) return

    setSelectedMake(vehicle.make || '')
    setSelectedModel(vehicle.model || '')
    setSelectedYear(vehicle.year ? String(vehicle.year) : '')
    setSelectedTrim(vehicle.trim || '')
    setPlate(vehicle.plate || '')
    setColor(normalizeColorValue(vehicle.color))
    setVin(vehicle.vin || vehicle.serial_number || '')
    setMileage(vehicle.mileage ? String(vehicle.mileage) : '')
    setManualMode(false)

    const persistedPhoto = vehicle.image_url || vehicle.photo_url || ''
    setVehiclePhoto(persistedPhoto ? { file: null, preview: persistedPhoto } : null)
  }, [vehicle])

  useEffect(() => () => {
    if (vehiclePhoto?.preview && isBlobPreview(vehiclePhoto.preview)) {
      URL.revokeObjectURL(vehiclePhoto.preview)
    }
  }, [vehiclePhoto])

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

    if (vehiclePhoto?.preview && isBlobPreview(vehiclePhoto.preview)) {
      URL.revokeObjectURL(vehiclePhoto.preview)
    }

    setVehiclePhoto({
      file,
      preview: URL.createObjectURL(file),
    })
  }

  function removePhoto() {
    if (vehiclePhoto?.preview && isBlobPreview(vehiclePhoto.preview)) {
      URL.revokeObjectURL(vehiclePhoto.preview)
    }
    setVehiclePhoto(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleCreateSubmit() {
    if (!selectedMake || !selectedModel || !selectedYear) {
      setError('Choose the brand, model, and year first.')
      return
    }

    const normalizedVin = vin.trim().toUpperCase()
    const normalizedMileage = mileage ? String(mileage).replace(/[^\d]/g, '') : ''
    const normalizedColor = normalizeColorValue(color)
    const optimizedPhoto = vehiclePhoto?.file ? await optimizeVehiclePhoto(vehiclePhoto.file) : (vehiclePhoto?.preview || '')

    if (normalizedVin) {
      const matchedVehicle = await findVehicleByVin(normalizedVin)

      if (matchedVehicle && matchedVehicle.owner_id && String(matchedVehicle.owner_id) !== String(user.id)) {
        throw new Error('This VIN is already linked to another profile.')
      }

      if (matchedVehicle) {
        const persistedFields = await persistVehicleFields(matchedVehicle.id, {
          owner_id: user.id,
          plate: plate.trim().toUpperCase(),
          color: normalizedColor,
          mileage: normalizedMileage ? Number(normalizedMileage) : null,
          vin: matchedVehicle.vin || normalizedVin,
          serial_number: matchedVehicle.serial_number || normalizedVin,
          image_url: optimizedPhoto || matchedVehicle.image_url || matchedVehicle.photo_url || '',
          photo_url: optimizedPhoto || matchedVehicle.photo_url || matchedVehicle.image_url || '',
        })

        const savedVehicle = {
          ...matchedVehicle,
          ...persistedFields,
          owner_id: user.id,
          make: matchedVehicle.make || selectedMake.trim(),
          model: matchedVehicle.model || selectedModel.trim(),
          year: matchedVehicle.year || parseInt(selectedYear, 10),
          plate: persistedFields.plate ?? plate.trim().toUpperCase(),
          color: persistedFields.color ?? normalizedColor,
          vin: matchedVehicle.vin || matchedVehicle.serial_number || normalizedVin,
          serial_number: matchedVehicle.serial_number || matchedVehicle.vin || normalizedVin,
          mileage: persistedFields.mileage ?? (normalizedMileage ? Number(normalizedMileage) : null),
          image_url: persistedFields.image_url ?? optimizedPhoto,
          photo_url: persistedFields.photo_url ?? optimizedPhoto,
          flash_score: matchedVehicle.flash_score || Math.floor(Math.random() * 20) + 80,
        }

        saveVehicleExtras(user.id, savedVehicle.id, {
          vin: savedVehicle.vin,
          serial_number: savedVehicle.serial_number,
          mileage: savedVehicle.mileage,
          image_url: savedVehicle.image_url,
          photo_url: savedVehicle.photo_url,
          color: savedVehicle.color,
          plate: savedVehicle.plate,
        })
        saveVehicleRecord(user.id, savedVehicle)

        onAdd(savedVehicle)
        onClose()
        return
      }
    }

    const baseVehicle = {
      owner_id: user.id,
      make: selectedMake.trim(),
      model: selectedModel.trim(),
      year: parseInt(selectedYear, 10),
      plate: plate.trim().toUpperCase(),
      color: normalizedColor,
      flash_score: Math.floor(Math.random() * 20) + 80,
    }

    const extendedVehicle = {
      ...baseVehicle,
      vin: normalizedVin,
      serial_number: normalizedVin,
      mileage: normalizedMileage ? Number(normalizedMileage) : null,
      image_url: optimizedPhoto,
      photo_url: optimizedPhoto,
    }

    let insertResult = await supabase
      .from('vehicles')
      .insert(extendedVehicle)
      .select()
      .single()

    let persistedFields = {}

    if (insertResult.error) {
      insertResult = await supabase
        .from('vehicles')
        .insert(baseVehicle)
        .select()
        .single()

      if (!insertResult.error && insertResult.data?.id) {
        persistedFields = await persistVehicleFields(insertResult.data.id, extendedVehicle)
      }
    }

    if (insertResult.error) {
      throw new Error(insertResult.error.message || 'Unable to save the vehicle.')
    }

    const savedVehicle = {
      ...(insertResult.data || baseVehicle),
      vin: persistedFields.vin ?? normalizedVin,
      serial_number: persistedFields.serial_number ?? normalizedVin,
      mileage: persistedFields.mileage ?? (normalizedMileage ? Number(normalizedMileage) : null),
      image_url: persistedFields.image_url ?? optimizedPhoto,
      photo_url: persistedFields.photo_url ?? optimizedPhoto,
      color: persistedFields.color ?? normalizedColor,
      plate: persistedFields.plate ?? plate.trim().toUpperCase(),
    }

    saveVehicleExtras(user.id, savedVehicle.id, {
      vin: savedVehicle.vin,
      serial_number: savedVehicle.serial_number,
      mileage: savedVehicle.mileage,
      image_url: savedVehicle.image_url,
      photo_url: savedVehicle.photo_url,
      color: savedVehicle.color,
      plate: savedVehicle.plate,
    })
    saveVehicleRecord(user.id, savedVehicle)

    onAdd(savedVehicle)
    onClose()
  }

  async function handleEditSubmit() {
    if (!vehicle?.id) {
      throw new Error('Vehicle not found.')
    }

    const normalizedMileage = mileage ? String(mileage).replace(/[^\d]/g, '') : ''
    const normalizedColor = normalizeColorValue(color)
    const optimizedPhoto = vehiclePhoto?.file ? await optimizeVehiclePhoto(vehiclePhoto.file) : (vehiclePhoto?.preview || '')

    const persistedFields = await persistVehicleFields(vehicle.id, {
      owner_id: user.id,
      plate: plate.trim().toUpperCase(),
      color: normalizedColor,
      mileage: normalizedMileage ? Number(normalizedMileage) : null,
      image_url: optimizedPhoto,
      photo_url: optimizedPhoto,
    })

    const updatedVehicle = {
      ...vehicle,
      ...persistedFields,
      owner_id: user.id,
      plate: persistedFields.plate ?? plate.trim().toUpperCase(),
      color: persistedFields.color ?? normalizedColor,
      mileage: persistedFields.mileage ?? (normalizedMileage ? Number(normalizedMileage) : null),
      image_url: persistedFields.image_url ?? optimizedPhoto,
      photo_url: persistedFields.photo_url ?? optimizedPhoto,
    }

    saveVehicleExtras(user.id, updatedVehicle.id, {
      vin: updatedVehicle.vin,
      serial_number: updatedVehicle.serial_number,
      mileage: updatedVehicle.mileage,
      image_url: updatedVehicle.image_url,
      photo_url: updatedVehicle.photo_url,
      color: updatedVehicle.color,
      plate: updatedVehicle.plate,
    })
    saveVehicleRecord(user.id, updatedVehicle)

    onSave(updatedVehicle)
    onClose()
  }

  async function handleSubmit() {
    if (!user?.id) {
      setError('You need to sign in to save a vehicle.')
      return
    }

    setError('')
    setLoading(true)

    try {
      if (isEditMode) {
        await handleEditSubmit()
      } else {
        await handleCreateSubmit()
      }
    } catch (submitError) {
      setError(submitError.message || 'Unable to save the vehicle.')
    } finally {
      setLoading(false)
    }
  }

  const vehiclePreview = vehiclePhoto?.preview || ''
  const modalTitle = isEditMode ? 'Edit vehicle profile' : 'Add a vehicle'
  const submitLabel = loading ? null : (isEditMode ? 'Save changes' : 'Add vehicle')

  return (
    <div className="modal-overlay" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 680, maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div className="modal-title" style={{ marginBottom: 0 }}>{modalTitle}</div>
            <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 4 }}>
              FlashMat keeps the vehicle identity by VIN, brand, model, and year.
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--ink3)' }}>X</button>
        </div>

        {isEditMode ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10, marginBottom: 16 }}>
            {[
              ['Brand', selectedMake || 'Not set'],
              ['Model', selectedModel || 'Not set'],
              ['Year', selectedYear || 'Not set'],
              ['VIN', vin || 'Not added yet'],
            ].map(([label, value]) => (
              <div key={label} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 14, padding: '12px 14px' }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>
                  {label}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)', fontFamily: label === 'VIN' ? 'var(--mono)' : undefined, wordBreak: 'break-word' }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        ) : !manualMode ? (
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

        {!isEditMode && !manualMode && models.length > 0 && (
          <div className="form-group">
            <label className="form-label">Model</label>
            <select className="form-select" value={selectedModel} onChange={(event) => fetchYears(event.target.value)}>
              <option value="">Choose a model...</option>
              {models.map((model) => <option key={model} value={model}>{model}</option>)}
            </select>
          </div>
        )}

        {!isEditMode && !manualMode && years.length > 0 && (
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

        {!isEditMode && manualMode && (
          <div style={{ fontSize: 11, color: 'var(--ink3)', marginBottom: 12 }}>
            The detailed catalog is not available right now. You can still save your vehicle manually.
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Vehicle photo</label>
          <input ref={fileRef} className="form-input" type="file" accept="image/*" onChange={handlePhotoChange} />
          {vehiclePreview ? (
            <div style={{ marginTop: 10, position: 'relative' }}>
              <img src={vehiclePreview} alt="Vehicle preview" style={{ width: '100%', height: 180, objectFit: 'cover', borderRadius: 14, border: '1px solid var(--border)' }} />
              <button type="button" className="btn" style={{ position: 'absolute', right: 10, bottom: 10, fontSize: 11, padding: '6px 10px' }} onClick={removePhoto}>Remove photo</button>
            </div>
          ) : (
            <div style={{ marginTop: 8, fontSize: 11, color: 'var(--ink3)' }}>
              Add a clear photo of the vehicle if you want it to appear in your garage.
            </div>
          )}
        </div>

        {!isEditMode && (
          <div className="form-group">
            <label className="form-label">Serial number / VIN</label>
            <input className="form-input" placeholder="Example: 1HGCM82633A004352" value={vin} onChange={(event) => setVin(event.target.value.toUpperCase())} style={{ fontFamily: 'var(--mono)' }} />
            <div style={{ marginTop: 8, fontSize: 11, color: 'var(--ink3)' }}>
              If this VIN already exists in FlashMat, the platform will reconnect the same vehicle record to your profile.
            </div>
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="form-group">
            <label className="form-label">Plate / registration</label>
            <input className="form-input" placeholder="Example: AAB 1234" value={plate} onChange={(event) => setPlate(event.target.value.toUpperCase())} style={{ fontFamily: 'var(--mono)', letterSpacing: 2 }} />
          </div>
          <div className="form-group">
            <label className="form-label">Mileage</label>
            <input className="form-input" type="number" min="0" placeholder="Example: 84250" value={mileage} onChange={(event) => setMileage(event.target.value)} />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Vehicle color</label>
          <div style={{ display: 'grid', gridTemplateColumns: '78px 1fr', gap: 10, alignItems: 'center' }}>
            <input
              className="form-input"
              type="color"
              value={normalizeColorValue(color)}
              onChange={(event) => setColor(event.target.value.toUpperCase())}
              style={{ padding: 6, minHeight: 48, cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 48, border: '1px solid var(--border)', borderRadius: 12, padding: '0 14px', background: 'var(--bg2)' }}>
              <span style={{ width: 18, height: 18, borderRadius: 999, background: normalizeColorValue(color), border: '1px solid rgba(15, 30, 61, 0.12)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.28)' }} />
              <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--ink2)' }}>{normalizeColorValue(color)}</span>
            </div>
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
          <button
            className="btn btn-green btn-lg"
            onClick={handleSubmit}
            disabled={loading || (!isEditMode && (!selectedMake || !selectedModel || !selectedYear))}
          >
            {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : submitLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function AddVehicleModal({ onClose, onAdd }) {
  const { user } = useAuth()
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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { fetchMakes() }, [])

  async function fetchMakes() {
    try {
      const { data, error: rpcError } = await supabase.rpc('get_distinct_makes')
      if (rpcError) throw rpcError
      setMakes(data?.map(d => d.make).filter(Boolean) || [])
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
      const { data, error } = await supabase
        .from('vehicles_catalog')
        .select('model')
        .eq('make', make)
        .order('model')
        .limit(500)

      if (error) throw error
      const unique = [...new Set(data?.map(d => d.model))]
      setModels(unique)
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
      const { data, error } = await supabase
        .from('vehicles_catalog')
        .select('year, body_type, engine, trim')
        .eq('make', selectedMake)
        .eq('model', model)
        .order('year', { ascending: false })
        .order('trim')
        .limit(500)

      if (error) throw error
      setYears(data || [])
    } catch {
      setManualMode(true)
      setYears([])
    }
  }

  async function handleSubmit() {
    if (!user?.id) {
      setError('You need to sign in to save a vehicle.')
      return
    }

    if (!selectedMake || !selectedModel || !selectedYear) {
      setError('Choisissez la marque, le modele et l annee.')
      return
    }

    setError('')
    setLoading(true)
    const vehicle = {
      owner_id: user.id,
      make: selectedMake,
      model: selectedModel,
      year: parseInt(selectedYear),
      plate: plate.toUpperCase(),
      color,
      flash_score: Math.floor(Math.random() * 20) + 80
    }
    const { data, error: insertError } = await supabase
      .from('vehicles')
      .insert(vehicle)
      .select()
      .single()
    setLoading(false)
    if (insertError) {
      setError(insertError.message || 'Unable to save the vehicle.')
      return
    }

    onAdd(data || vehicle)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div className="modal-title" style={{ marginBottom: 0 }}>Add a vehicle</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--ink3)' }}>X</button>
        </div>

        {!manualMode ? (
          <div className="form-group">
            <label className="form-label">Marque</label>
            <select className="form-select" value={selectedMake} onChange={e => fetchModels(e.target.value)}>
              <option value="">Choisir une marque...</option>
              {makes.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
            <div className="form-group">
              <label className="form-label">Marque</label>
              <input className="form-input" value={selectedMake} onChange={e => setSelectedMake(e.target.value)} placeholder="Ex: Toyota" />
            </div>
            <div className="form-group">
              <label className="form-label">Modele</label>
              <input className="form-input" value={selectedModel} onChange={e => setSelectedModel(e.target.value)} placeholder="Ex: RAV4" />
            </div>
            <div className="form-group">
              <label className="form-label">Annee</label>
              <input className="form-input" type="number" min="1950" max="2100" value={selectedYear} onChange={e => setSelectedYear(e.target.value)} placeholder="2021" />
            </div>
          </div>
        )}

        {!manualMode && models.length > 0 && (
          <div className="form-group">
            <label className="form-label">Modele</label>
            <select className="form-select" value={selectedModel} onChange={e => fetchYears(e.target.value)}>
              <option value="">Choisir un modele...</option>
              {models.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        )}

        {!manualMode && years.length > 0 && (
          <div className="form-group">
            <label className="form-label">Annee et version</label>
            <select className="form-select" value={selectedYear} onChange={e => setSelectedYear(e.target.value)}>
              <option value="">Choisir une annee...</option>
              {years.map((y, i) => (
                <option key={i} value={y.year}>
                  {y.year}{y.trim ? ` - ${y.trim}` : ''} - {y.body_type}
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="form-group">
            <label className="form-label">Plaque QC (optionnel)</label>
            <input className="form-input" placeholder="Ex: AAB 1234" value={plate} onChange={e => setPlate(e.target.value.toUpperCase())} style={{ fontFamily: 'var(--mono)', letterSpacing: 2 }} />
          </div>
          <div className="form-group">
            <label className="form-label">Couleur (optionnel)</label>
            <input className="form-input" placeholder="Ex: Blanc nacre" value={color} onChange={e => setColor(e.target.value)} />
          </div>
        </div>

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

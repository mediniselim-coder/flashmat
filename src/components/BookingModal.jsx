import { useState } from 'react'
import { useToast } from '../hooks/useToast'

const SERVICES = [
  { id: 'oil', label: '🔧 Vidange + Filtre', price: '$75-$95' },
  { id: 'brakes', label: '🔧 Freins / Plaquettes', price: '$150-$250' },
  { id: 'tires', label: '🔩 Rotation des pneus', price: '$45-$65' },
  { id: 'wash', label: '🚿 Lavage complet', price: '$35-$55' },
  { id: 'align', label: '🎯 Alignement roues', price: '$80-$120' },
  { id: 'ac', label: '❄️ Recharge climatisation', price: '$100-$150' },
  { id: 'inspect', label: '📋 Inspection SAAQ', price: '$39-$60' },
  { id: 'tow', label: '🚛 Remorquage', price: '$79+' },
  { id: 'glass', label: '🪟 Remplacement pare-brise', price: 'Selon assurance' },
]

function formatVehicleLabel(vehicle) {
  if (!vehicle) return 'Vehicule a confirmer'
  return `${vehicle.make} ${vehicle.model} ${vehicle.year}${vehicle.plate ? ` - ${vehicle.plate}` : ''}`
}

export default function BookingModal({
  providers,
  vehicles = [],
  initialProvider = null,
  initialService = null,
  onClose,
  onConfirm,
}) {
  const { toast } = useToast()
  const initialStep = initialService ? (initialProvider ? 3 : 2) : 1
  const [step, setStep] = useState(initialStep)
  const [service, setService] = useState(initialService || null)
  const [provider, setProvider] = useState(initialProvider || null)
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id ? String(vehicles[0].id) : '')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('10h00')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const openProviders = providers.filter((entry) => entry.is_open === true || entry.is_open === 'true')
  const selectedVehicle = vehicles.find((entry) => String(entry.id) === vehicleId) || vehicles[0] || null

  async function confirm() {
    setLoading(true)

    try {
      await onConfirm({
        service: service.label,
        serviceIcon: service.label.split(' ')[0],
        provider,
        vehicle: selectedVehicle,
        date,
        timeSlot: time,
        notes,
        price: service.price,
      })
      setLoading(false)
      onClose()
    } catch (error) {
      setLoading(false)
      toast(error.message || 'Impossible de confirmer la reservation', 'error')
    }
  }

  const steps = ['Service', 'Fournisseur', 'Date & Heure', 'Confirmer']

  return (
    <div className="modal-overlay" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 520 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div className="modal-title" style={{ marginBottom: 0 }}>📅 Reserver un service</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--ink3)' }}>✕</button>
        </div>

        <div style={{ display: 'flex', gap: 0, marginBottom: 24, background: 'var(--bg3)', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
          {steps.map((label, index) => (
            <div
              key={label}
              style={{
                flex: 1,
                padding: '8px 4px',
                textAlign: 'center',
                fontSize: 10,
                fontFamily: 'var(--mono)',
                textTransform: 'uppercase',
                letterSpacing: '.4px',
                background: step === index + 1 ? 'var(--green)' : step > index + 1 ? 'rgba(22,199,132,.15)' : 'transparent',
                color: step === index + 1 ? '#fff' : step > index + 1 ? 'var(--green)' : 'var(--ink3)',
                fontWeight: step === index + 1 ? 700 : 400,
              }}
            >
              {step > index + 1 ? '✓ ' : ''}{label}
            </div>
          ))}
        </div>

        {step === 1 && (
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.7px', color: 'var(--ink3)', marginBottom: 12 }}>Choisissez un service</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 340, overflowY: 'auto' }}>
              {SERVICES.map((entry) => (
                <div
                  key={entry.id}
                  onClick={() => setService(entry)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: 9,
                    cursor: 'pointer',
                    border: `1.5px solid ${service?.id === entry.id ? 'var(--green)' : 'var(--border)'}`,
                    background: service?.id === entry.id ? 'var(--green-bg)' : 'var(--bg3)',
                  }}
                >
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{entry.label}</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--green)' }}>{entry.price}</span>
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={onClose}>Annuler</button>
              <button className="btn btn-green" disabled={!service} onClick={() => setStep(2)}>Suivant →</button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.7px', color: 'var(--ink3)', marginBottom: 12 }}>Choisissez un fournisseur</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 340, overflowY: 'auto' }}>
              {openProviders.map((entry) => (
                <div
                  key={entry.id || entry.name}
                  onClick={() => setProvider(entry)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 14px',
                    borderRadius: 9,
                    cursor: 'pointer',
                    border: `1.5px solid ${provider?.id === entry.id || provider?.name === entry.name ? 'var(--green)' : 'var(--border)'}`,
                    background: provider?.id === entry.id || provider?.name === entry.name ? 'var(--green-bg)' : 'var(--bg3)',
                  }}
                >
                  <div style={{ width: 38, height: 38, borderRadius: 9, background: 'var(--bg2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{entry.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{entry.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--ink2)' }}>{entry.type_label} · {entry.distance || 'Montreal'} · ⭐{entry.rating}</div>
                  </div>
                  <span className="badge badge-green">Ouvert</span>
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setStep(1)}>← Retour</button>
              <button className="btn btn-green" disabled={!provider} onClick={() => setStep(3)}>Suivant →</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.7px', color: 'var(--ink3)', marginBottom: 16 }}>Date, heure et vehicule</div>
            <div className="form-group">
              <label className="form-label">Vehicule</label>
              <select className="form-select" value={vehicleId} onChange={(event) => setVehicleId(event.target.value)}>
                {vehicles.map((entry) => (
                  <option key={entry.id} value={entry.id}>{formatVehicleLabel(entry)}</option>
                ))}
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input className="form-input" type="date" value={date} onChange={(event) => setDate(event.target.value)} min={new Date().toISOString().split('T')[0]} />
              </div>
              <div className="form-group">
                <label className="form-label">Heure</label>
                <select className="form-select" value={time} onChange={(event) => setTime(event.target.value)}>
                  {['08h00', '09h00', '10h00', '11h00', '13h00', '14h00', '15h00', '16h00'].map((slot) => <option key={slot}>{slot}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Notes (optionnel)</label>
              <input className="form-input" placeholder="Decrivez votre probleme ou demande..." value={notes} onChange={(event) => setNotes(event.target.value)} />
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setStep(2)}>← Retour</button>
              <button className="btn btn-green" onClick={() => setStep(4)} disabled={!selectedVehicle}>Suivant →</button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <div style={{ background: 'var(--green-bg)', border: '1px solid rgba(22,199,132,.2)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.7px', color: 'var(--green)', marginBottom: 12 }}>Recapitulatif de la reservation</div>
              {[
                ['Service', service?.label],
                ['Fournisseur', provider?.name],
                ['Adresse', provider?.address],
                ['Vehicule', formatVehicleLabel(selectedVehicle)],
                ['Date & Heure', `${date || 'A confirmer'} · ${time}`],
                ['Prix estime', service?.price],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, gap: 12 }}>
                  <span style={{ color: 'var(--ink2)' }}>{label}</span>
                  <span style={{ fontWeight: 600, textAlign: 'right' }}>{value}</span>
                </div>
              ))}
              {notes && <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(22,199,132,.2)', fontSize: 12, color: 'var(--ink2)' }}>📝 {notes}</div>}
            </div>
            <p style={{ fontSize: 12, color: 'var(--ink3)', marginBottom: 16 }}>La reservation sera enregistree dans FlashMat et visible des deux cotes, client et provider.</p>
            <div className="modal-actions">
              <button className="btn" onClick={() => setStep(3)}>← Retour</button>
              <button className="btn btn-green btn-lg" onClick={confirm} disabled={loading || !selectedVehicle || !provider || !service}>
                {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : '✅ Confirmer la reservation'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

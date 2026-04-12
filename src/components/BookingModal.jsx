import { useMemo, useState } from 'react'
import { useToast } from '../hooks/useToast'
import { PROVIDER_SERVICE_OPTIONS } from '../lib/providerProfiles'

const SERVICE_PRICES = {
  'mechanic-general': '$80-$150',
  'oil-change': '$75-$95',
  brakes: '$150-$250',
  suspension: '$120-$300',
  diagnostic: '$60-$120',
  ac: '$100-$150',
  tires: '$45-$65',
  alignment: '$80-$120',
  balancing: '$45-$80',
  'flat-repair': '$25-$50',
  wash: '$35-$55',
  detailing: '$120-$280',
  ceramic: '$300-$800',
  body: '$200+',
  paint: '$300+',
  dent: '$80-$250',
  glass: '$80-$200',
  windshield: '$200-$500',
  towing: '$79+',
  roadside: '$59+',
  battery: '$39-$79',
  lockout: '$49-$99',
  parts: 'Selon piece',
  parking: 'Selon abonnement',
  performance: '$150+',
}

const GENERIC_SERVICES = [
  { id: 'oil', icon: 'ME', label: 'Oil Change + Filter', price: '$75-$95' },
  { id: 'brakes', icon: 'ME', label: 'Brakes / Pads', price: '$150-$250' },
  { id: 'tires', icon: 'PN', label: 'Tire Rotation', price: '$45-$65' },
  { id: 'wash', icon: 'LV', label: 'Full Wash', price: '$35-$55' },
  { id: 'align', icon: 'PN', label: 'Wheel Alignment', price: '$80-$120' },
  { id: 'ac', icon: 'ME', label: 'A/C Recharge', price: '$100-$150' },
  { id: 'inspect', icon: 'TB', label: 'Safety Inspection', price: '$39-$60' },
  { id: 'tow', icon: 'RW', label: 'Towing', price: '$79+' },
  { id: 'glass', icon: 'VT', label: 'Windshield Replacement', price: 'Insurance dependent' },
]

function formatVehicleLabel(vehicle) {
  if (!vehicle) return 'Vehicle to be confirmed'
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
  const initialStep = initialService ? 2 : 1
  const [step, setStep] = useState(initialStep)
  const [service, setService] = useState(initialService || null)
  const [provider, setProvider] = useState(initialProvider || null)
  const [vehicleId, setVehicleId] = useState(vehicles[0]?.id ? String(vehicles[0].id) : '')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('10:00')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const openProviders = providers.filter((entry) => entry.is_open === true || entry.is_open === 'true')
  const selectedVehicle = vehicles.find((entry) => String(entry.id) === vehicleId) || vehicles[0] || null
  const activeProvider = provider || initialProvider

  const displayServices = useMemo(() => {
    const providerServices = activeProvider?.services
    if (providerServices?.length > 0) {
      return providerServices.map((label) => {
        const opt = PROVIDER_SERVICE_OPTIONS.find(
          (option) => option.label.toLowerCase() === String(label).toLowerCase(),
        )

        return opt
          ? { id: opt.id, label: opt.label, icon: opt.icon, price: SERVICE_PRICES[opt.id] || 'Price to confirm' }
          : { id: label, label: String(label), icon: 'SV', price: 'Price to confirm' }
      })
    }

    return GENERIC_SERVICES
  }, [activeProvider])

  async function confirm() {
    setLoading(true)

    try {
      await onConfirm({
        service: service.label,
        serviceIcon: service.icon,
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
      toast(error.message || 'Unable to confirm the booking', 'error')
    }
  }

  const steps = ['Service', 'Date & Time', 'Confirm']

  return (
    <div className="modal-overlay" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 520 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div className="modal-title" style={{ marginBottom: 0 }}>Book a Service</div>
            {activeProvider ? (
              <div style={{ marginTop: 6, fontSize: 12, color: 'var(--ink2)', fontWeight: 600 }}>
                Booking with <span style={{ color: 'var(--green)', fontWeight: 800 }}>{activeProvider.name}</span>
              </div>
            ) : null}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--ink3)' }}>x</button>
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
              {step > index + 1 ? 'Done ' : ''}
              {label}
            </div>
          ))}
        </div>

        {step === 1 ? (
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.7px', color: 'var(--ink3)', marginBottom: 12 }}>Choose a service</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 340, overflowY: 'auto' }}>
              {displayServices.map((entry) => (
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
              <button className="btn" onClick={onClose}>Cancel</button>
              <button className="btn btn-green" disabled={!service} onClick={() => setStep(2)}>Next -&gt;</button>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.7px', color: 'var(--ink3)', marginBottom: 16 }}>Date, time, and vehicle</div>
            {vehicles.length === 0 ? (
              <div style={{ background: 'var(--amber-bg)', border: '1px solid rgba(245,158,11,.25)', borderRadius: 12, padding: '12px 14px', fontSize: 12, color: 'var(--ink2)', marginBottom: 14 }}>
                Add a vehicle in your client profile before confirming a booking.
              </div>
            ) : null}
            <div className="form-group">
              <label className="form-label">Vehicle</label>
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
                <label className="form-label">Time</label>
                <select className="form-select" value={time} onChange={(event) => setTime(event.target.value)}>
                  {['08:00', '09:00', '10:00', '11:00', '13:00', '14:00', '15:00', '16:00'].map((slot) => <option key={slot}>{slot}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Notes (optional)</label>
              <input className="form-input" placeholder="Describe your issue or request..." value={notes} onChange={(event) => setNotes(event.target.value)} />
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setStep(1)}>&lt;- Back</button>
              <button className="btn btn-green" onClick={() => setStep(3)} disabled={!selectedVehicle}>Next -&gt;</button>
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div>
            {!initialProvider ? (
              <div className="form-group" style={{ marginBottom: 18 }}>
                <label className="form-label">Provider</label>
                <select
                  className="form-select"
                  value={provider?.id || provider?.name || ''}
                  onChange={(event) => {
                    const nextProvider = openProviders.find((entry) => String(entry.id || entry.name) === String(event.target.value)) || null
                    setProvider(nextProvider)
                  }}
                >
                  <option value="">Choose a provider</option>
                  {openProviders.map((entry) => (
                    <option key={entry.id || entry.name} value={entry.id || entry.name}>
                      {entry.name} - {entry.type_label} - {entry.distance || 'Montreal'}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}

            <div style={{ background: 'var(--green-bg)', border: '1px solid rgba(22,199,132,.2)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.7px', color: 'var(--green)', marginBottom: 12 }}>Booking summary</div>
              {[
                ['Service', service?.label],
                ['Provider', provider?.name || initialProvider?.name],
                ['Address', provider?.address || initialProvider?.address],
                ['Vehicle', formatVehicleLabel(selectedVehicle)],
                ['Date & Time', `${date || 'To be confirmed'} · ${time}`],
                ['Estimated Price', service?.price],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, gap: 12 }}>
                  <span style={{ color: 'var(--ink2)' }}>{label}</span>
                  <span style={{ fontWeight: 600, textAlign: 'right' }}>{value}</span>
                </div>
              ))}
              {notes ? (
                <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(22,199,132,.2)', fontSize: 12, color: 'var(--ink2)' }}>{notes}</div>
              ) : null}
            </div>
            <p style={{ fontSize: 12, color: 'var(--ink3)', marginBottom: 16 }}>The booking request will be saved in FlashMat. The provider must confirm it before the reservation becomes active.</p>
            <div className="modal-actions">
              <button className="btn" onClick={() => setStep(2)}>&lt;- Back</button>
              <button className="btn btn-green btn-lg" onClick={confirm} disabled={loading || !selectedVehicle || !provider || !service}>
                {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : 'Send Request'}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}

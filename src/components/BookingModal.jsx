import { useState } from 'react'
import { useToast } from '../hooks/useToast'

const SERVICES = [
  { id: 'oil',      label: '🔧 Vidange + Filtre',      price: '$75–$95' },
  { id: 'brakes',   label: '🔧 Freins / Plaquettes',   price: '$150–$250' },
  { id: 'tires',    label: '🔩 Rotation des pneus',    price: '$45–$65' },
  { id: 'wash',     label: '🚿 Lavage complet',         price: '$35–$55' },
  { id: 'align',    label: '🎯 Alignement roues',       price: '$80–$120' },
  { id: 'ac',       label: '❄️  Recharge climatisation', price: '$100–$150' },
  { id: 'inspect',  label: '📋 Inspection SAAQ',        price: '$39–$60' },
  { id: 'tow',      label: '🚛 Remorquage',             price: '$79+' },
  { id: 'glass',    label: '🪟 Remplacement pare-brise', price: 'Selon assurance' },
]

export default function BookingModal({ providers, onClose, onConfirm }) {
  const { toast } = useToast()
  const [step, setStep]       = useState(1) // 1=service, 2=provider, 3=datetime, 4=confirm
  const [service, setService] = useState(null)
  const [provider, setProvider] = useState(null)
  const [vehicle, setVehicle] = useState('Honda Civic 2019 — AAB 1234')
  const [date, setDate]       = useState('')
  const [time, setTime]       = useState('10h00')
  const [notes, setNotes]     = useState('')
  const [loading, setLoading] = useState(false)

  const openProviders = providers.filter(p => p.is_open === true || p.is_open === 'true')

  function confirm() {
    setLoading(true)
    setTimeout(() => {
      onConfirm({
        service:     service.label,
        icon:        service.label.split(' ')[0],
        type:        'Service',
        provider:    provider.name,
        vehicle:     vehicle.split(' — ')[0].split(' ').slice(0,2).join(' '),
        date:        `${date || 'À venir'} · ${time}`,
        price:       service.price,
        status:      'confirmed',
        statusLabel: 'Confirmé',
        cls:         'badge-green',
      })
      setLoading(false)
      onClose()
    }, 800)
  }

  const steps = ['Service', 'Fournisseur', 'Date & Heure', 'Confirmer']

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 520 }}>
        {/* HEADER */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div className="modal-title" style={{ marginBottom: 0 }}>📅 Réserver un service</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--ink3)' }}>✕</button>
        </div>

        {/* STEP INDICATOR */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 24, background: 'var(--bg3)', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
          {steps.map((s, i) => (
            <div key={s} style={{
              flex: 1, padding: '8px 4px', textAlign: 'center',
              fontSize: 10, fontFamily: 'var(--mono)', textTransform: 'uppercase', letterSpacing: '.4px',
              background: step === i+1 ? 'var(--green)' : step > i+1 ? 'rgba(22,199,132,.15)' : 'transparent',
              color: step === i+1 ? '#fff' : step > i+1 ? 'var(--green)' : 'var(--ink3)',
              fontWeight: step === i+1 ? 700 : 400,
              transition: 'all .2s',
            }}>
              {step > i+1 ? '✓ ' : ''}{s}
            </div>
          ))}
        </div>

        {/* STEP 1 — SERVICE */}
        {step === 1 && (
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.7px', color: 'var(--ink3)', marginBottom: 12 }}>Choisissez un service</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 340, overflowY: 'auto' }}>
              {SERVICES.map(s => (
                <div key={s.id}
                  onClick={() => setService(s)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '12px 14px', borderRadius: 9, cursor: 'pointer',
                    border: `1.5px solid ${service?.id === s.id ? 'var(--green)' : 'var(--border)'}`,
                    background: service?.id === s.id ? 'var(--green-bg)' : 'var(--bg3)',
                    transition: 'all .15s',
                  }}>
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{s.label}</span>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--green)' }}>{s.price}</span>
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={onClose}>Annuler</button>
              <button className="btn btn-green" disabled={!service} onClick={() => setStep(2)}>Suivant →</button>
            </div>
          </div>
        )}

        {/* STEP 2 — PROVIDER */}
        {step === 2 && (
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.7px', color: 'var(--ink3)', marginBottom: 12 }}>Choisissez un fournisseur</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 340, overflowY: 'auto' }}>
              {openProviders.map(p => (
                <div key={p.name}
                  onClick={() => setProvider(p)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px',
                    borderRadius: 9, cursor: 'pointer',
                    border: `1.5px solid ${provider?.name === p.name ? 'var(--green)' : 'var(--border)'}`,
                    background: provider?.name === p.name ? 'var(--green-bg)' : 'var(--bg3)',
                    transition: 'all .15s',
                  }}>
                  <div style={{ width: 38, height: 38, borderRadius: 9, background: 'var(--bg2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{p.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{p.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--ink2)' }}>{p.type_label} · {p.distance || 'MTL'} · ⭐{p.rating}</div>
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

        {/* STEP 3 — DATE */}
        {step === 3 && (
          <div>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.7px', color: 'var(--ink3)', marginBottom: 16 }}>Date, heure & véhicule</div>
            <div className="form-group">
              <label className="form-label">Véhicule</label>
              <select className="form-select" value={vehicle} onChange={e => setVehicle(e.target.value)}>
                <option>Honda Civic 2019 — AAB 1234</option>
                <option>Toyota RAV4 2021 — ZZC 9876</option>
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input className="form-input" type="date" value={date} onChange={e => setDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
              </div>
              <div className="form-group">
                <label className="form-label">Heure</label>
                <select className="form-select" value={time} onChange={e => setTime(e.target.value)}>
                  {['08h00','09h00','10h00','11h00','13h00','14h00','15h00','16h00'].map(h => <option key={h}>{h}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Notes (optionnel)</label>
              <input className="form-input" placeholder="Décrivez votre problème ou demande…" value={notes} onChange={e => setNotes(e.target.value)} />
            </div>
            <div className="modal-actions">
              <button className="btn" onClick={() => setStep(2)}>← Retour</button>
              <button className="btn btn-green" onClick={() => setStep(4)}>Suivant →</button>
            </div>
          </div>
        )}

        {/* STEP 4 — CONFIRM */}
        {step === 4 && (
          <div>
            <div style={{ background: 'var(--green-bg)', border: '1px solid rgba(22,199,132,.2)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
              <div style={{ fontFamily: 'var(--mono)', fontSize: 9, textTransform: 'uppercase', letterSpacing: '.7px', color: 'var(--green)', marginBottom: 12 }}>Récapitulatif de la réservation</div>
              {[
                ['Service',      service?.label],
                ['Fournisseur',  provider?.name],
                ['Adresse',      provider?.address],
                ['Véhicule',     vehicle],
                ['Date & Heure', `${date || 'À confirmer'} · ${time}`],
                ['Prix estimé',  service?.price],
              ].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                  <span style={{ color: 'var(--ink2)' }}>{l}</span>
                  <span style={{ fontWeight: 600 }}>{v}</span>
                </div>
              ))}
              {notes && <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(22,199,132,.2)', fontSize: 12, color: 'var(--ink2)' }}>📝 {notes}</div>}
            </div>
            <p style={{ fontSize: 12, color: 'var(--ink3)', marginBottom: 16 }}>Une confirmation par email sera envoyée. Le fournisseur peut vous contacter pour confirmer.</p>
            <div className="modal-actions">
              <button className="btn" onClick={() => setStep(3)}>← Retour</button>
              <button className="btn btn-green btn-lg" onClick={confirm} disabled={loading}>
                {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : '✅ Confirmer la réservation'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

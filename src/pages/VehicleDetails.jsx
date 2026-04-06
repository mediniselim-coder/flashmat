import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { fetchClientBookings } from '../lib/bookings'
import NavBar from '../components/NavBar'
import SiteFooter from '../components/SiteFooter'
import AppIcon from '../components/AppIcon'

const VEHICLE_EXTRAS_STORAGE_KEY = 'flashmat-vehicle-extras'

function getVehicleExtrasStorageKey(userId) {
  return `${VEHICLE_EXTRAS_STORAGE_KEY}:${userId || 'anonymous'}`
}

function readVehicleExtrasMap(userId) {
  try {
    return JSON.parse(window.localStorage.getItem(getVehicleExtrasStorageKey(userId)) || '{}')
  } catch {
    return {}
  }
}

function mergeVehicleExtras(vehicle, userId) {
  const extrasMap = readVehicleExtrasMap(userId)
  const extras = extrasMap[vehicle?.id] || {}

  return {
    ...vehicle,
    vin: vehicle?.vin || vehicle?.serial_number || extras.vin || extras.serial_number || '',
    serial_number: vehicle?.serial_number || vehicle?.vin || extras.serial_number || extras.vin || '',
    mileage: vehicle?.mileage ?? extras.mileage ?? '',
    image_url: vehicle?.image_url || vehicle?.photo_url || extras.image_url || extras.photo_url || '',
    photo_url: vehicle?.photo_url || vehicle?.image_url || extras.photo_url || extras.image_url || '',
  }
}

function formatDateLabel(value) {
  if (!value) return 'Not scheduled yet'
  try {
    return new Date(value).toLocaleString('en-CA', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  } catch {
    return value
  }
}

export default function VehicleDetails() {
  const navigate = useNavigate()
  const { vehicleId } = useParams()
  const { user } = useAuth()
  const [vehicle, setVehicle] = useState(null)
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadVehiclePage() {
      if (!user?.id || !vehicleId) {
        setVehicle(null)
        setBookings([])
        setLoading(false)
        return
      }

      setLoading(true)
      try {
        const [{ data }, bookingRows] = await Promise.all([
          supabase
            .from('vehicles')
            .select('*')
            .eq('owner_id', user.id)
            .eq('id', vehicleId)
            .maybeSingle(),
          fetchClientBookings(user.id),
        ])

        const nextVehicle = data && String(data.owner_id || '') === String(user.id) ? mergeVehicleExtras(data, user.id) : null
        setVehicle(nextVehicle)
        setBookings((bookingRows || []).filter((booking) => String(booking.vehicle_id || booking.vehicle?.id || '') === String(vehicleId)))
      } catch {
        setVehicle(null)
        setBookings([])
      } finally {
        setLoading(false)
      }
    }

    loadVehiclePage()
  }, [user?.id, vehicleId])

  const summary = useMemo(() => {
    if (!vehicle) return null

    return {
      totalServices: bookings.length,
      lastService: bookings[0]?.datetimeLabel || 'Not yet',
      totalSpent: bookings.reduce((sum, booking) => {
        const amount = Number(String(booking.priceLabel || '').replace(/[^0-9.]/g, ''))
        return sum + (Number.isFinite(amount) ? amount : 0)
      }, 0),
    }
  }, [bookings, vehicle])

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <NavBar />

      <main style={{ flex: 1 }}>
        <section style={{ background: 'linear-gradient(135deg, #081f31 0%, #0f1e3d 58%, #2563eb 100%)', color: '#fff' }}>
          <div style={{ maxWidth: 1440, margin: '0 auto', padding: '36px 28px 42px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', color: 'rgba(143, 217, 255, 0.88)', marginBottom: 10 }}>
                  Client vehicle page
                </div>
                <h1 style={{ margin: 0, fontFamily: 'var(--display)', fontSize: 44, lineHeight: 1.02, letterSpacing: '-0.05em' }}>
                  {loading ? 'Loading vehicle...' : vehicle ? `${vehicle.make} ${vehicle.model} ${vehicle.year}` : 'Vehicle not found'}
                </h1>
                <p style={{ margin: '12px 0 0', maxWidth: 620, color: 'rgba(255,255,255,0.72)', fontSize: 15, lineHeight: 1.7 }}>
                  Vehicle details, service history, and the key information saved from your FlashMat dashboard.
                </p>
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button type="button" className="btn" onClick={() => navigate('/app/client/vehicles')} style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.14)' }}>
                  Back to My Vehicles
                </button>
                {vehicle ? (
                  <button type="button" className="btn btn-green" onClick={() => navigate('/app/client/bookings')}>
                    View bookings
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        <section style={{ maxWidth: 1440, margin: '0 auto', padding: '26px 28px 60px' }}>
          {loading ? (
            <div className="panel" style={{ padding: 28, textAlign: 'center', color: 'var(--ink3)' }}>Loading vehicle details...</div>
          ) : !vehicle ? (
            <div className="panel" style={{ padding: 32, textAlign: 'center' }}>
              <div style={{ color: 'var(--blue)', marginBottom: 12, display: 'flex', justifyContent: 'center' }}><AppIcon code="VH" size={34} /></div>
              <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 22, color: 'var(--ink)', marginBottom: 10 }}>Vehicle not found</div>
              <div style={{ color: 'var(--ink2)', fontSize: 14, marginBottom: 18 }}>This vehicle may have been removed, or it may not belong to your account.</div>
              <button type="button" className="btn btn-green" onClick={() => navigate('/app/client/vehicles')}>Return to My Vehicles</button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.02fr) minmax(320px, 0.98fr)', gap: 18, alignItems: 'start' }}>
              <div style={{ display: 'grid', gap: 18 }}>
                <div className="panel">
                  <div className="panel-body" style={{ padding: 18 }}>
                    <img
                      src={vehicle.image_url || '/vehicle-fallback.svg'}
                      alt={`${vehicle.make} ${vehicle.model}`}
                      style={{ width: '100%', height: 320, objectFit: 'cover', borderRadius: 18, border: '1px solid var(--border)', background: 'linear-gradient(135deg, #102746 0%, #2c7ac8 100%)', marginBottom: 18 }}
                    />

                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 14, flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontFamily: 'var(--display)', fontSize: 34, lineHeight: 1.02, fontWeight: 800, color: 'var(--ink)' }}>
                          {vehicle.make} {vehicle.model}
                        </div>
                        <div style={{ color: 'var(--ink2)', fontSize: 14, marginTop: 6 }}>
                          Year {vehicle.year} {vehicle.plate ? `· ${vehicle.plate}` : ''}
                        </div>
                      </div>
                      <span className="badge badge-green">My vehicle</span>
                    </div>

                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                      {vehicle.color ? <span className="badge badge-blue">{vehicle.color}</span> : null}
                      {vehicle.mileage ? <span className="badge badge-amber">{Number(vehicle.mileage).toLocaleString()} km</span> : null}
                      <span className="badge badge-green">FlashScore {vehicle.flash_score}%</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                      {[
                        ['Brand', vehicle.make || '—'],
                        ['Model year', vehicle.year || '—'],
                        ['VIN', vehicle.vin || 'Not added yet'],
                        ['Created', formatDateLabel(vehicle.created_at)],
                      ].map(([label, value]) => (
                        <div key={label} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 14, padding: '12px 14px' }}>
                          <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink3)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>
                            {label}
                          </div>
                          <div style={{ color: 'var(--ink)', fontSize: 14, fontWeight: 700, fontFamily: label === 'VIN' ? 'var(--mono)' : undefined, wordBreak: 'break-word' }}>
                            {value}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gap: 18 }}>
                <div className="panel">
                  <div className="panel-hd">
                    <div className="panel-title">Service History</div>
                    <span className="badge badge-blue">{summary.totalServices} record{summary.totalServices !== 1 ? 's' : ''}</span>
                  </div>
                  <div className="panel-body" style={{ padding: 0 }}>
                    {bookings.length > 0 ? (
                      bookings.map((booking, index) => (
                        <div key={booking.id} style={{ display: 'flex', gap: 12, padding: '14px 16px', borderBottom: index < bookings.length - 1 ? '1px solid var(--border)' : 'none' }}>
                          <div style={{ width: 38, height: 38, borderRadius: 12, background: 'var(--bg3)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--blue)', flexShrink: 0 }}>
                            <AppIcon code={booking.service_icon || 'RS'} size={18} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start', marginBottom: 4, flexWrap: 'wrap' }}>
                              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--ink)' }}>{booking.service}</div>
                              <span className={`badge ${booking.statusClass}`}>{booking.statusLabel}</span>
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--ink2)', marginBottom: 6 }}>{booking.providerName}</div>
                            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                              <span className="badge badge-gray">{booking.datetimeLabel}</span>
                              <span className="badge badge-blue">{booking.priceLabel}</span>
                            </div>
                            {booking.notes ? <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 8, lineHeight: 1.6 }}>{booking.notes}</div> : null}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: '28px 18px', textAlign: 'center', color: 'var(--ink3)' }}>
                        <div style={{ color: 'var(--blue)', marginBottom: 12, display: 'flex', justifyContent: 'center' }}><AppIcon code="RS" size={30} /></div>
                        <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 18, color: 'var(--ink)', marginBottom: 8 }}>No services yet</div>
                        <div style={{ fontSize: 13, lineHeight: 1.7 }}>Bookings and completed services for this vehicle will appear here once activity starts.</div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-hd"><div className="panel-title">Vehicle Summary</div></div>
                  <div className="panel-body">
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
                      <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, padding: 12 }}>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, textTransform: 'uppercase', color: 'var(--ink3)', marginBottom: 6 }}>Total services</div>
                        <div style={{ fontFamily: 'var(--display)', fontSize: 24, fontWeight: 800, color: 'var(--ink)' }}>{summary.totalServices}</div>
                      </div>
                      <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, padding: 12 }}>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, textTransform: 'uppercase', color: 'var(--ink3)', marginBottom: 6 }}>Last service</div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--ink)' }}>{summary.lastService}</div>
                      </div>
                      <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, padding: 12 }}>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, textTransform: 'uppercase', color: 'var(--ink3)', marginBottom: 6 }}>Total spent</div>
                        <div style={{ fontFamily: 'var(--display)', fontSize: 24, fontWeight: 800, color: 'var(--green)' }}>${summary.totalSpent || 0}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      <SiteFooter portal="client" />
    </div>
  )
}

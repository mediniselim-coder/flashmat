import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import BookingModal from '../components/BookingModal'
import SiteFooter from '../components/SiteFooter'
import { createBooking } from '../lib/bookings'
import { mergeProviderProfile, normalizeProviderRecord } from '../lib/providerProfiles'
import { geocodeAddress, hasValidCoords } from '../lib/googleMaps'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const DAYS_FR = { Mon: 'Lundi', Tue: 'Mardi', Wed: 'Mercredi', Thu: 'Jeudi', Fri: 'Vendredi', Sat: 'Samedi', Sun: 'Dimanche' }

export default function ProviderProfile() {
  const { slug } = useParams()
  const [searchParams] = useSearchParams()
  const navigate  = useNavigate()
  const { user, profile } = useAuth()
  const { toast } = useToast()
  const [provider, setProvider] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [bookingOpen, setBookingOpen] = useState(false)
  const [userVehicles, setUserVehicles] = useState([])
  const canBook = user && profile?.role === 'client'

  function normalizeDbProvider(data, slug) {
    return mergeProviderProfile({
      ...normalizeProviderRecord(data),
      slug,
      logo: data.logo || data.icon || '🔧',
      hours: data.hours || { Mon:'08:00-17:00',Tue:'08:00-17:00',Wed:'08:00-17:00',Thu:'08:00-17:00',Fri:'08:00-17:00',Sat:'Ferme',Sun:'Ferme' },
      team: [],
      reviews_list: [],
      gallery: [],
      highlights: data.services || [],
      providerEmail: data.providerEmail || data.email,
    })
  }

  function slugifyProviderName(name) {
    return String(name || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()
  }

  useEffect(() => {

    supabase.from('providers').select('*').order('rating', { ascending: false }).limit(200).then(({ data }) => {
      const exactName = searchParams.get('n')
      const match = (data || []).find((entry) => {
        const providerName = entry.shop_name || entry.name
        if (exactName) return providerName === exactName
        return slugifyProviderName(providerName) === slug
      })
      if (match) setProvider(normalizeDbProvider(match, slug))
      setLoading(false)
    })
  }, [searchParams, slug])

  useEffect(() => {
    let cancelled = false

    async function ensureProviderCoords() {
      if (!provider?.address || hasValidCoords(provider?.coords)) return

      try {
        const coords = await geocodeAddress(provider.address)
        if (!cancelled && hasValidCoords(coords)) {
          setProvider((current) => (current ? { ...current, coords } : current))
        }
      } catch {
        // Keep the profile usable even if geocoding is unavailable.
      }
    }

    ensureProviderCoords()

    return () => {
      cancelled = true
    }
  }, [provider?.address, provider?.coords])

  useEffect(() => {
    function syncProviderProfile() {
      setProvider((current) => current ? mergeProviderProfile(current) : current)
    }

    window.addEventListener('flashmat-provider-profile-updated', syncProviderProfile)
    window.addEventListener('storage', syncProviderProfile)
    return () => {
      window.removeEventListener('flashmat-provider-profile-updated', syncProviderProfile)
      window.removeEventListener('storage', syncProviderProfile)
    }
  }, [])

  useEffect(() => {
    if (canBook && searchParams.get('book') === '1') {
      setBookingOpen(true)
    }
  }, [canBook, searchParams])

  useEffect(() => {
    async function loadVehicles() {
      if (!canBook || !user?.id) return
      const { data } = await supabase
        .from('vehicles')
        .select('*')
        .eq('owner_id', user.id)
        .order('created_at', { ascending: false })
      setUserVehicles(data || [])
    }

    loadVehicles()
  }, [canBook, user?.id])

  function requestBookingAccess() {
    if (canBook) {
      setBookingOpen(true)
      return
    }

    const exactName = searchParams.get('n')
    const query = exactName ? `?n=${encodeURIComponent(exactName)}&book=1` : '?book=1'
    window.sessionStorage.setItem('flashmat-post-login-redirect', `/provider/${slug}${query}`)
    navigate('/?login=1')
  }

  async function handleBookingConfirm(payload) {
    if (!provider?.id) {
      throw new Error('Provider introuvable pour cette reservation')
    }

    await createBooking({
      clientId: user.id,
      providerId: provider.id,
      vehicleId: payload.vehicle?.id,
      service: payload.service,
      serviceIcon: payload.serviceIcon,
      date: payload.date,
      timeSlot: payload.timeSlot,
      notes: payload.notes,
      price: payload.price,
    })

    toast('Reservation confirmee', 'success')
    navigate('/app/client?pane=bookings')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div className="spinner" style={{ width: 36, height: 36 }} />
    </div>
  )

  if (!provider) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 48 }}>🔍</div>
      <div style={{ fontFamily: 'var(--display)', fontSize: 24, fontWeight: 800 }}>Fournisseur introuvable</div>
      <button className="btn btn-green" onClick={() => navigate('/')}>Retour à l'accueil</button>
    </div>
  )

  const providerCoords = hasValidCoords(provider.coords) ? provider.coords : [45.5017, -73.5673]

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>

      {/* TOP NAV */}
      <nav style={{ background: 'rgba(255,255,255,.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 100 }}>
        <img src="/logo.jpg" alt="FlashMat" style={{ height: 32, objectFit: 'contain', cursor: 'pointer' }} onClick={() => navigate('/')} />
        <div style={{ flex: 1 }} />
        <button className="btn" onClick={() => navigate('/')}>← Retour</button>
        <button className="btn btn-green" onClick={requestBookingAccess}>📅 Réserver</button>
      </nav>

      {/* COVER HEADER */}
      <div style={{ background: provider.coverPhoto ? `center / cover no-repeat url(${provider.coverPhoto})` : 'linear-gradient(135deg, #1a3a8f 0%, #2952cc 50%, #4db8e8 100%)', padding: '60px 24px 40px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.35)' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ width: 90, height: 90, borderRadius: 16, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, margin: '0 auto 16px', boxShadow: '0 4px 20px rgba(0,0,0,.3)' }}>
            {provider.logo}
          </div>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: 32, fontWeight: 800, color: '#fff', marginBottom: 8 }}>{provider.name}</h1>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, flexWrap: 'wrap', fontSize: 13, color: 'rgba(255,255,255,.85)', marginBottom: 12 }}>
            <span>📍 {provider.address}</span>
            <span>📞 {provider.phone}</span>
            {provider.website && <span>🌐 {provider.website}</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'var(--display)', fontSize: 20, fontWeight: 800, color: '#fff' }}>{provider.rating}</span>
            <span style={{ color: '#f59e0b', fontSize: 18 }}>{'★'.repeat(Math.round(provider.rating))}</span>
            <span style={{ color: 'rgba(255,255,255,.7)', fontSize: 13 }}>({provider.reviews} avis)</span>
          </div>
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div style={{ background: '#fff', borderBottom: '1px solid var(--border)', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <a href={`tel:${provider.phone}`} className="btn btn-outline">📞 Appeler</a>
        <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(provider.address)}`} target="_blank" rel="noreferrer" className="btn btn-outline">📍 Directions</a>
        <button className="btn btn-green" onClick={requestBookingAccess}>📅 Prendre un rendez-vous</button>
      </div>

      {/* MAIN CONTENT */}
      <div className="providerLayout">

        {/* LEFT COLUMN */}
        <div>
          {/* DESCRIPTION */}
          <div className="panel">
            <div className="panel-hd"><div className="panel-title">🏪 À propos</div></div>
            <div className="panel-body">
              <p style={{ fontSize: 14, color: 'var(--ink2)', lineHeight: 1.7 }}>{provider.description}</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
                {provider.highlights?.map(h => <span key={h} className="badge badge-blue">✓ {h}</span>)}
              </div>
            </div>
          </div>

          {/* TEAM */}
          {provider.team?.length > 0 && (
            <div className="panel">
              <div className="panel-hd"><div className="panel-title">👥 Notre équipe</div></div>
              <div className="panel-body">
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  {provider.team.map((m, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'var(--bg3)', borderRadius: 10, padding: 14, minWidth: 220 }}>
                      <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--green-bg)', border: '2px solid var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>👤</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{m.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink3)', marginBottom: 4 }}>{m.role}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink2)' }}>📞 {m.phone}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* HOURS */}
          <div className="panel">
            <div className="panel-hd"><div className="panel-title">🕐 Horaires d'ouverture</div></div>
            <div className="panel-body">
              <div style={{ display: 'grid', gap: 0 }}>
                {Object.entries(provider.hours || {}).map(([day, hours]) => (
                  <div
                    key={day}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'minmax(120px, 1fr) auto',
                      alignItems: 'center',
                      gap: 16,
                      padding: '10px 0',
                      borderBottom: '1px solid var(--border)',
                      fontSize: 13,
                    }}
                  >
                    <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{DAYS_FR[day] || day}</span>
                    <span
                      style={{
                        color: String(hours).toLowerCase().includes('ferme') ? 'var(--red)' : 'var(--green)',
                        fontFamily: 'var(--mono)',
                        fontSize: 12,
                        justifySelf: 'end',
                        textAlign: 'right',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {hours}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SERVICES */}
          <div className="panel">
            <div className="panel-hd"><div className="panel-title">⚙️ Services offerts</div></div>
            <div className="panel-body">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(provider.services || []).map(s => (
                  <div key={s} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all .15s' }}
                    onClick={requestBookingAccess}>
                    🔧 {s}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* GALLERY */}
          {(provider.galleryPhotos?.length > 0 || provider.gallery?.length > 0) && (
            <div className="panel">
              <div className="panel-hd"><div className="panel-title">📸 Galerie</div></div>
              <div className="panel-body">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {(provider.galleryPhotos?.length > 0 ? provider.galleryPhotos : provider.gallery).map((img, i) => (
                    typeof img === 'string' && (img.startsWith('data:image') || img.startsWith('http')) ? (
                      <img key={i} src={img} alt={`Photo atelier ${i + 1}`} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 10, border: '1px solid var(--border)' }} />
                    ) : (
                      <div key={i} style={{ aspectRatio: '1', background: 'linear-gradient(135deg, var(--green-bg), var(--blue-bg))', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, border: '1px solid var(--border)' }}>
                        {img}
                      </div>
                    )
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* REVIEWS */}
          {provider.reviews_list?.length > 0 && (
            <div className="panel">
              <div className="panel-hd">
                <div className="panel-title">⭐ Avis clients</div>
                <span className="badge badge-green">{provider.rating} ★ · {provider.reviews} avis</span>
              </div>
              <div>
                {provider.reviews_list.map((r, i) => (
                  <div key={i} style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--green-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>👤</div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: 13 }}>{r.user}</span>
                        <span style={{ color: '#f59e0b' }}>{'★'.repeat(r.rating)}</span>
                        <span style={{ fontSize: 11, color: 'var(--ink3)', fontFamily: 'var(--mono)' }}>{r.date}</span>
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--ink2)' }}>{r.comment}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div>
          {/* MAP */}
          <div className="panel">
            <div className="panel-hd"><div className="panel-title">📍 Localisation</div></div>
            <div style={{ height: 220, borderRadius: '0 0 10px 10px', overflow: 'hidden' }}>
              <MapContainer center={providerCoords} zoom={15} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
                <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={providerCoords}>
                  <Popup>{provider.name}<br />{provider.address}</Popup>
                </Marker>
              </MapContainer>
            </div>
            <div style={{ padding: 12 }}>
              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(provider.address)}`} target="_blank" rel="noreferrer" className="btn btn-green" style={{ width: '100%', justifyContent: 'center' }}>
                📍 Obtenir les directions
              </a>
            </div>
          </div>

          {/* QUICK BOOKING */}
          <div className="panel">
            <div className="panel-hd"><div className="panel-title">📅 Réservation rapide</div></div>
            <div className="panel-body">
              <p style={{ fontSize: 13, color: 'var(--ink2)', marginBottom: 16 }}>Prenez rendez-vous en ligne en moins de 2 minutes!</p>
              <button className="btn btn-green" style={{ width: '100%', justifyContent: 'center', padding: '12px' }} onClick={requestBookingAccess}>
                Prendre un rendez-vous →
              </button>
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                <a href={`tel:${provider.phone}`} style={{ fontSize: 12, color: 'var(--green)', fontFamily: 'var(--mono)' }}>{provider.phone}</a>
              </div>
            </div>
          </div>

          {/* CONTACT */}
          <div className="panel">
            <div className="panel-hd"><div className="panel-title">📬 Contact</div></div>
            <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 13 }}>
                <span>📞</span><a href={`tel:${provider.phone}`} style={{ color: 'var(--green)' }}>{provider.phone}</a>
              </div>
              {provider.email && <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 13 }}>
                <span>📧</span><a href={`mailto:${provider.email}`} style={{ color: 'var(--green)' }}>{provider.email}</a>
              </div>}
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 13 }}>
                <span>📍</span><span style={{ color: 'var(--ink2)' }}>{provider.address}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {bookingOpen && canBook && (
        <BookingModal
          providers={[provider]}
          vehicles={userVehicles}
          initialProvider={provider}
          onClose={() => setBookingOpen(false)}
          onConfirm={handleBookingConfirm}
        />
      )}

      {/* FOOTER */}
      <SiteFooter portal="public" />
      <footer style={{ display: 'none', background: '#fff', borderTop: '1px solid var(--border)', padding: '24px', textAlign: 'center', marginTop: 40 }}>
        <img src="/logo.jpg" alt="FlashMat" style={{ height: 28, objectFit: 'contain', marginBottom: 8 }} />
        <div style={{ fontSize: 12, color: 'var(--ink3)' }}>© 2025 FlashMat.ca · The MarketPlace for Auto Tech</div>
      </footer>
    </div>
  )
}


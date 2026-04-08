import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import BookingModal from '../components/BookingModal'
import NavBar from '../components/NavBar'
import SiteFooter from '../components/SiteFooter'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { createBooking } from '../lib/bookings'
import { geocodeAddress, hasValidCoords } from '../lib/googleMaps'
import { mergeProviderProfile, normalizeProviderRecord } from '../lib/providerProfiles'
import { fetchProviderReviews, upsertProviderReview } from '../lib/providerReviews'
import { supabase } from '../lib/supabase'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const DAYS = {
  Mon: 'Monday',
  Tue: 'Tuesday',
  Wed: 'Wednesday',
  Thu: 'Thursday',
  Fri: 'Friday',
  Sat: 'Saturday',
  Sun: 'Sunday',
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

function normalizeDbProvider(data, slug) {
  return mergeProviderProfile({
    ...normalizeProviderRecord(data),
    slug,
    logo: data.logo || data.icon || 'SV',
    hours: data.hours || {
      Mon: '08:00-17:00',
      Tue: '08:00-17:00',
      Wed: '08:00-17:00',
      Thu: '08:00-17:00',
      Fri: '08:00-17:00',
      Sat: 'Closed',
      Sun: 'Closed',
    },
    team: data.team || [],
    gallery: data.gallery || [],
    highlights: data.highlights || data.services || [],
    providerEmail: data.providerEmail || data.email,
  })
}

function renderStars(rating) {
  const whole = Math.max(1, Math.round(Number(rating || 0)))
  return '★'.repeat(whole)
}

export default function ProviderProfile() {
  const { slug } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const { toast } = useToast()

  const [provider, setProvider] = useState(null)
  const [loading, setLoading] = useState(true)
  const [bookingOpen, setBookingOpen] = useState(false)
  const [userVehicles, setUserVehicles] = useState([])
  const [reviews, setReviews] = useState([])
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewSaving, setReviewSaving] = useState(false)

  const canBook = user && profile?.role === 'client'

  useEffect(() => {
    let cancelled = false

    async function loadProvider() {
      setLoading(true)

      const { data } = await supabase
        .from('providers')
        .select('*')
        .order('rating', { ascending: false })
        .limit(200)

      const exactName = searchParams.get('n')
      const match = (data || []).find((entry) => {
        const providerName = entry.shop_name || entry.name
        if (exactName) return providerName === exactName
        return slugifyProviderName(providerName) === slug
      })

      if (!cancelled) {
        setProvider(match ? normalizeDbProvider(match, slug) : null)
        setLoading(false)
      }
    }

    loadProvider()
    return () => {
      cancelled = true
    }
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
        // Keep the page usable if geocoding is unavailable.
      }
    }

    ensureProviderCoords()
    return () => {
      cancelled = true
    }
  }, [provider?.address, provider?.coords])

  useEffect(() => {
    let cancelled = false

    async function loadReviews() {
      if (!provider?.id) return

      try {
        const loadedReviews = await fetchProviderReviews(provider.id)
        if (!cancelled) setReviews(loadedReviews)
      } catch {
        if (!cancelled) setReviews([])
      }
    }

    loadReviews()
    return () => {
      cancelled = true
    }
  }, [provider?.id])

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

  useEffect(() => {
    if (!user?.id) return
    const existingReview = reviews.find((entry) => entry.client_id === user.id)
    if (existingReview) {
      setReviewRating(existingReview.rating || 5)
      setReviewComment(existingReview.comment || '')
    }
  }, [reviews, user?.id])

  useEffect(() => {
    function syncProviderProfile() {
      setProvider((current) => (current ? mergeProviderProfile(current) : current))
    }

    window.addEventListener('flashmat-provider-profile-updated', syncProviderProfile)
    window.addEventListener('storage', syncProviderProfile)
    return () => {
      window.removeEventListener('flashmat-provider-profile-updated', syncProviderProfile)
      window.removeEventListener('storage', syncProviderProfile)
    }
  }, [])

  async function refreshProviderAggregate() {
    if (!provider?.id) return

    const { data } = await supabase.from('providers').select('*').eq('id', provider.id).single()
    if (data) {
      setProvider(normalizeDbProvider(data, slug))
    }
  }

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
    if (!provider?.id) throw new Error('Provider not found for this booking')

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

    toast('Booking confirmed', 'success')
    navigate('/app/client/bookings')
  }

  async function handleReviewSubmit() {
    if (!user?.id || !provider?.id || profile?.role !== 'client') {
      toast('Only client accounts can leave reviews.', 'error')
      return
    }

    if (!String(reviewComment || '').trim()) {
      toast('Please write a short review before saving.', 'error')
      return
    }

    try {
      setReviewSaving(true)

      const savedReview = await upsertProviderReview({
        providerId: provider.id,
        clientId: user.id,
        clientName: profile?.full_name || user.email?.split('@')[0] || 'FlashMat client',
        clientAvatarUrl: profile?.avatar_url || '',
        rating: reviewRating,
        comment: reviewComment,
      })

      setReviews((current) => {
        const next = current.filter((entry) => entry.client_id !== user.id)
        return [savedReview, ...next]
      })

      await refreshProviderAggregate()
      toast('Your review has been saved.', 'success')
    } catch (error) {
      toast(error?.message || 'Unable to save your review right now.', 'error')
    } finally {
      setReviewSaving(false)
    }
  }

  const providerCoords = useMemo(
    () => (hasValidCoords(provider?.coords) ? provider.coords : [45.5017, -73.5673]),
    [provider?.coords],
  )

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div className="spinner" style={{ width: 36, height: 36 }} />
      </div>
    )
  }

  if (!provider) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', flexDirection: 'column', gap: 16 }}>
        <div style={{ fontFamily: 'var(--display)', fontSize: 24, fontWeight: 800 }}>Provider not found</div>
        <button className="btn btn-green" onClick={() => navigate('/providers')}>Back to providers</button>
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <NavBar activePage="providers" />

      <div style={{ background: provider.coverPhoto ? `center / cover no-repeat url(${provider.coverPhoto})` : 'linear-gradient(135deg, #133f73 0%, #275ab0 52%, #5db6e5 100%)', padding: '70px 24px 44px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(8,19,32,.38)' }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 980, margin: '0 auto' }}>
          <div style={{ width: 96, height: 96, borderRadius: 20, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, margin: '0 auto 18px', boxShadow: '0 10px 28px rgba(0,0,0,.22)' }}>
            {provider.logoImageUrl ? (
              <img src={provider.logoImageUrl} alt={provider.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 20 }} />
            ) : (
              provider.logo
            )}
          </div>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: 38, fontWeight: 800, color: '#fff', marginBottom: 10, letterSpacing: '-0.04em' }}>{provider.name}</h1>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 18, flexWrap: 'wrap', fontSize: 13, color: 'rgba(255,255,255,.86)', marginBottom: 14 }}>
            <span>{provider.address}</span>
            <span>{provider.phone}</span>
            {provider.website && <span>{provider.website}</span>}
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderRadius: '999px', background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.16)' }}>
            <span style={{ fontFamily: 'var(--display)', fontSize: 20, fontWeight: 800, color: '#fff' }}>{Number(provider.rating || 0).toFixed(1)}</span>
            <span style={{ color: '#ffd36a', fontSize: 16 }}>{renderStars(provider.rating)}</span>
            <span style={{ color: 'rgba(255,255,255,.76)', fontSize: 12 }}>{provider.reviews || 0} reviews</span>
          </div>
        </div>
      </div>

      <div style={{ background: '#fff', borderBottom: '1px solid var(--border)', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
        <a href={`tel:${provider.phone}`} className="btn btn-outline">Call</a>
        <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(provider.address)}`} target="_blank" rel="noreferrer" className="btn btn-outline">Directions</a>
        <button className="btn btn-green" onClick={requestBookingAccess}>Book an appointment</button>
      </div>

      <div className="providerLayout">
        <div>
          <div className="panel">
            <div className="panel-hd"><div className="panel-title">About</div></div>
            <div className="panel-body">
              <p style={{ fontSize: 14, color: 'var(--ink2)', lineHeight: 1.72 }}>{provider.description}</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
                {provider.highlights?.map((item) => <span key={item} className="badge badge-blue">{item}</span>)}
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-hd"><div className="panel-title">Hours</div></div>
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
                    <span style={{ fontWeight: 600, color: 'var(--ink)' }}>{DAYS[day] || day}</span>
                    <span style={{ color: String(hours).toLowerCase().includes('closed') ? 'var(--red)' : 'var(--green)', fontFamily: 'var(--mono)', fontSize: 12, justifySelf: 'end', textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {hours}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-hd"><div className="panel-title">Services</div></div>
            <div className="panel-body">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(provider.services || []).map((service) => (
                  <button
                    key={service}
                    type="button"
                    onClick={requestBookingAccess}
                    style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all .15s' }}
                  >
                    {service}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {provider.staffMembers?.length > 0 && (
            <div className="panel">
              <div className="panel-hd"><div className="panel-title">Team</div></div>
              <div className="panel-body">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
                  {provider.staffMembers.map((member) => (
                    <div key={member.id || `${member.name}-${member.role}`} style={{ border: '1px solid var(--border)', borderRadius: 14, background: 'var(--bg3)', padding: 14 }}>
                      <div style={{ width: 68, height: 68, borderRadius: 18, overflow: 'hidden', marginBottom: 12, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {member.photo_url ? (
                          <img src={member.photo_url} alt={member.name || 'Staff member'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 22, color: 'var(--blue)' }}>
                            {String(member.name || 'S').slice(0, 1).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 16, color: 'var(--ink)' }}>{member.name || 'FlashMat staff'}</div>
                      <div style={{ marginTop: 4, fontSize: 12, color: 'var(--ink2)', lineHeight: 1.6 }}>{member.role || 'Team member'}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {(provider.galleryPhotos?.length > 0 || provider.gallery?.length > 0) && (
            <div className="panel">
              <div className="panel-hd"><div className="panel-title">Gallery</div></div>
              <div className="panel-body">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {(provider.galleryPhotos?.length > 0 ? provider.galleryPhotos : provider.gallery).map((img, index) => (
                    typeof img === 'string' && (img.startsWith('data:image') || img.startsWith('http')) ? (
                      <img key={index} src={img} alt={`Provider photo ${index + 1}`} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 10, border: '1px solid var(--border)' }} />
                    ) : (
                      <div key={index} style={{ aspectRatio: '1', background: 'linear-gradient(135deg, var(--green-bg), var(--blue-bg))', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, border: '1px solid var(--border)' }}>
                        {img}
                      </div>
                    )
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="panel">
            <div className="panel-hd">
              <div className="panel-title">Reviews</div>
              <span className="badge badge-green">{Number(provider.rating || 0).toFixed(1)} stars · {provider.reviews || 0} reviews</span>
            </div>
            <div className="panel-body" style={{ display: 'grid', gap: 16 }}>
              {profile?.role === 'client' && (
                <div style={{ border: '1px solid var(--border)', borderRadius: 14, padding: 16, background: 'var(--bg3)' }}>
                  <div style={{ fontFamily: 'var(--display)', fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Leave a review</div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                    {[1, 2, 3, 4, 5].map((value) => (
                      <button key={value} type="button" className={`btn ${reviewRating === value ? 'btn-green' : ''}`} onClick={() => setReviewRating(value)}>
                        {value} star{value > 1 ? 's' : ''}
                      </button>
                    ))}
                  </div>
                  <textarea
                    className="form-input"
                    value={reviewComment}
                    onChange={(event) => setReviewComment(event.target.value)}
                    placeholder="Share a quick review about the service quality, communication, or turnaround."
                    style={{ width: '100%', minHeight: 110, resize: 'vertical', paddingTop: 12 }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 12, flexWrap: 'wrap' }}>
                    <div style={{ fontSize: 12, color: 'var(--ink3)' }}>Reviews influence provider ranking and rating filters across FlashMat.</div>
                    <button type="button" className="btn btn-green" onClick={handleReviewSubmit} disabled={reviewSaving}>
                      {reviewSaving ? 'Saving...' : 'Save review'}
                    </button>
                  </div>
                </div>
              )}

              {!user && (
                <div style={{ fontSize: 13, color: 'var(--ink3)' }}>
                  Sign in with a client account to leave a review.
                </div>
              )}

              {user && profile?.role !== 'client' && (
                <div style={{ fontSize: 13, color: 'var(--ink3)' }}>
                  Reviews can only be submitted by logged-in client accounts.
                </div>
              )}

              {reviews.length > 0 ? (
                <div>
                  {reviews.map((review) => (
                    <div key={review.id} style={{ padding: '14px 0', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12 }}>
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--green-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0, overflow: 'hidden' }}>
                        {review.avatar_url ? (
                          <img src={review.avatar_url} alt={review.user} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          review.user.slice(0, 1).toUpperCase()
                        )}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: 13 }}>{review.user}</span>
                          <span style={{ color: '#f59e0b' }}>{renderStars(review.rating)}</span>
                          <span style={{ fontSize: 11, color: 'var(--ink3)', fontFamily: 'var(--mono)' }}>{review.date}</span>
                        </div>
                        <p style={{ fontSize: 13, color: 'var(--ink2)', lineHeight: 1.6 }}>{review.comment}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 13, color: 'var(--ink3)' }}>No reviews yet. Be the first client to share how this provider performed.</div>
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="panel">
            <div className="panel-hd"><div className="panel-title">Location</div></div>
            <div style={{ height: 240, borderRadius: '0 0 10px 10px', overflow: 'hidden' }}>
              <MapContainer center={providerCoords} zoom={15} style={{ height: '100%', width: '100%' }} scrollWheelZoom>
                <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={providerCoords}>
                  <Popup>{provider.name}<br />{provider.address}</Popup>
                </Marker>
              </MapContainer>
            </div>
            <div style={{ padding: 12 }}>
              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(provider.address)}`} target="_blank" rel="noreferrer" className="btn btn-green" style={{ width: '100%', justifyContent: 'center' }}>
                Open directions
              </a>
            </div>
          </div>

          <div className="panel">
            <div className="panel-hd"><div className="panel-title">Quick booking</div></div>
            <div className="panel-body">
              <p style={{ fontSize: 13, color: 'var(--ink2)', marginBottom: 16 }}>Book online in under two minutes.</p>
              <button className="btn btn-green" style={{ width: '100%', justifyContent: 'center', padding: '12px' }} onClick={requestBookingAccess}>
                Book appointment
              </button>
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                <a href={`tel:${provider.phone}`} style={{ fontSize: 12, color: 'var(--green)', fontFamily: 'var(--mono)' }}>{provider.phone}</a>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-hd"><div className="panel-title">Contact</div></div>
            <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 13 }}><a href={`tel:${provider.phone}`} style={{ color: 'var(--green)' }}>{provider.phone}</a></div>
              {provider.email && <div style={{ fontSize: 13 }}><a href={`mailto:${provider.email}`} style={{ color: 'var(--green)' }}>{provider.email}</a></div>}
              <div style={{ fontSize: 13, color: 'var(--ink2)' }}>{provider.address}</div>
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

      <SiteFooter portal="public" />
    </div>
  )
}

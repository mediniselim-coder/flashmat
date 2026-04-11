import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import BookingModal from '../components/BookingModal'
import NavBar from '../components/NavBar'
import ServiceIcon from '../components/ServiceIcon'
import SiteFooter from '../components/SiteFooter'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { createBooking } from '../lib/bookings'
import { geocodeAddress, hasValidCoords } from '../lib/googleMaps'
import { createOrGetThread } from '../lib/inbox'
import { normalizeMarketplaceListing } from '../lib/marketplace'
import { mergeProviderProfile, normalizeProviderRecord } from '../lib/providerProfiles'
import { fetchProviderReviews, upsertProviderReview } from '../lib/providerReviews'
import { supabase } from '../lib/supabase'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const DAYS = { Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' }
const DOT = '\u00B7'

function slugifyProviderName(name) {
  return String(name || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim()
}

function normalizeDbProvider(data, slug) {
  return mergeProviderProfile({
    ...normalizeProviderRecord(data),
    slug,
    logo: data.logo || data.icon || 'SV',
    hours: data.hours || { Mon: '08:00-17:00', Tue: '08:00-17:00', Wed: '08:00-17:00', Thu: '08:00-17:00', Fri: '08:00-17:00', Sat: 'Closed', Sun: 'Closed' },
    team: data.team || [],
    gallery: data.gallery || [],
    highlights: data.highlights || data.services || [],
    providerEmail: data.providerEmail || data.email,
  })
}

function renderStarsSafe(rating) {
  return '\u2605'.repeat(Math.max(1, Math.round(Number(rating || 0))))
}

const renderStars = (rating) => '★'.repeat(Math.max(1, Math.round(Number(rating || 0))))
const formatPrice = (value) => (value == null || Number.isNaN(Number(value)) ? 'Price on request' : `$${Number(value).toFixed(0)}`)

function InfoCard({ title, children, style }) {
  return (
    <div className="panel" style={{ borderRadius: 20, overflow: 'hidden', ...style }}>
      <div className="panel-body" style={{ padding: 24 }}>{children}</div>
    </div>
  )
}

function SectionHeading({ title, subtitle, action }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
      <div>
        <div style={{ fontFamily: 'var(--display)', fontSize: 30, lineHeight: 1, letterSpacing: '-0.045em', color: 'var(--ink)', marginBottom: 8 }}>{title}</div>
        {subtitle ? <div style={{ fontSize: 13, color: 'var(--ink2)' }}>{subtitle}</div> : null}
      </div>
      {action || null}
    </div>
  )
}

function ProviderMapViewportSync({ center, zoom = 15 }) {
  const map = useMap()

  useEffect(() => {
    if (!Array.isArray(center) || center.length !== 2) return
    if (!Number.isFinite(center[0]) || !Number.isFinite(center[1])) return
    map.setView(center, zoom, { animate: false })
  }, [center, map, zoom])

  return null
}

export default function ProviderProfile() {
  const { slug } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const { toast } = useToast()
  const [provider, setProvider] = useState(null)
  const [loading, setLoading] = useState(true)
  const [bookingOpen, setBookingOpen] = useState(false)
  const [userVehicles, setUserVehicles] = useState([])
  const [reviews, setReviews] = useState([])
  const [providerProducts, setProviderProducts] = useState([])
  const [reviewRating, setReviewRating] = useState(5)
  const [reviewComment, setReviewComment] = useState('')
  const [reviewSaving, setReviewSaving] = useState(false)
  const [messageOpening, setMessageOpening] = useState(false)
  const autoMessageStartedRef = useRef(false)
  const expertiseCarouselRef = useRef(null)
  const canBook = user && profile?.role === 'client'
  const canMessage = user && profile?.role === 'client'

  function buildIntentQuery(flag) {
    const params = new URLSearchParams()
    const exactName = searchParams.get('n')
    if (exactName) params.set('n', exactName)
    params.set(flag, '1')
    return `?${params.toString()}`
  }

  function requestBookingAccess() {
    if (user) return setBookingOpen(true)
    window.sessionStorage.setItem('flashmat-post-login-redirect', `/provider/${slug}${buildIntentQuery('book')}`)
    navigate('/?login=1')
  }

  async function requestMessagingAccess({ silent = false } = {}) {
    if (!provider?.id) {
      if (!silent) toast('This provider is not ready for messaging yet.', 'error')
      return
    }

    if (!user) {
      window.sessionStorage.setItem('flashmat-post-login-redirect', `/provider/${slug}${buildIntentQuery('message')}`)
      navigate('/?login=1')
      return
    }

    if (profile?.role !== 'client') {
      if (!silent) toast('Only client accounts can message providers.', 'error')
      return
    }

    try {
      setMessageOpening(true)
      const thread = await createOrGetThread({
        clientId: user.id,
        providerId: provider.id,
        creatorId: user.id,
      })
      navigate(`/messages?thread=${thread.id}`)
    } catch (error) {
      if (!silent) toast(error?.message || 'Unable to open the conversation right now.', 'error')
    } finally {
      setMessageOpening(false)
    }
  }

  useEffect(() => {
    let cancelled = false
    async function loadProvider() {
      setLoading(true)
      const { data } = await supabase.from('providers').select('*').order('rating', { ascending: false }).limit(200)
      const exactName = searchParams.get('n')
      const match = (data || []).find((entry) => {
        const providerName = entry.shop_name || entry.name
        return exactName ? providerName === exactName : slugifyProviderName(providerName) === slug
      })
      if (!cancelled) {
        setProvider(match ? normalizeDbProvider(match, slug) : null)
        setLoading(false)
      }
    }
    loadProvider()
    return () => { cancelled = true }
  }, [searchParams, slug])

  useEffect(() => {
    let cancelled = false
    async function ensureCoords() {
      if (!provider?.address || hasValidCoords(provider?.coords)) return
      try {
        const coords = await geocodeAddress(provider.address)
        if (!cancelled && hasValidCoords(coords)) setProvider((current) => (current ? { ...current, coords } : current))
      } catch {}
    }
    ensureCoords()
    return () => { cancelled = true }
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
    return () => { cancelled = true }
  }, [provider?.id])

  useEffect(() => {
    let cancelled = false
    async function loadProducts() {
      if (!provider?.id) return
      try {
        const { data } = await supabase.from('marketplace').select('*').eq('is_active', true).eq('seller_type', 'provider').eq('seller_id', provider.id).order('created_at', { ascending: false }).limit(4)
        if (!cancelled) setProviderProducts((data || []).map(normalizeMarketplaceListing))
      } catch {
        if (!cancelled) setProviderProducts([])
      }
    }
    loadProducts()
    return () => { cancelled = true }
  }, [provider?.id])

  useEffect(() => {
    if (canBook && searchParams.get('book') === '1') setBookingOpen(true)
  }, [canBook, searchParams])

  useEffect(() => {
    if (searchParams.get('message') !== '1') {
      autoMessageStartedRef.current = false
      return
    }
    if (!canMessage || !provider?.id || autoMessageStartedRef.current) return

    autoMessageStartedRef.current = true
    const nextParams = new URLSearchParams(searchParams)
    nextParams.delete('message')
    setSearchParams(nextParams, { replace: true })
    requestMessagingAccess({ silent: true })
  }, [canMessage, provider?.id, searchParams, setSearchParams])

  useEffect(() => {
    async function loadVehicles() {
      if (!canBook || !user?.id) return
      const { data } = await supabase.from('vehicles').select('*').eq('owner_id', user.id).order('created_at', { ascending: false })
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
    if (data) setProvider(normalizeDbProvider(data, slug))
  }

  async function handleBookingConfirm(payload) {
    if (!provider?.id) throw new Error('Provider not found for this booking')
    await createBooking({ clientId: user.id, providerId: provider.id, vehicleId: payload.vehicle?.id, service: payload.service, serviceIcon: payload.serviceIcon, date: payload.date, timeSlot: payload.timeSlot, notes: payload.notes, price: payload.price })
    toast('Booking confirmed', 'success')
    navigate('/app/client/bookings')
  }

  async function handleReviewSubmit() {
    if (!user?.id || !provider?.id || profile?.role !== 'client') return toast('Only client accounts can leave reviews.', 'error')
    if (!String(reviewComment || '').trim()) return toast('Please write a short review before saving.', 'error')
    try {
      setReviewSaving(true)
      const savedReview = await upsertProviderReview({ providerId: provider.id, clientId: user.id, clientName: profile?.full_name || user.email?.split('@')[0] || 'FlashMat client', clientAvatarUrl: profile?.avatar_url || '', rating: reviewRating, comment: reviewComment })
      setReviews((current) => [savedReview, ...current.filter((entry) => entry.client_id !== user.id)])
      await refreshProviderAggregate()
      toast('Your review has been saved.', 'success')
    } catch (error) {
      toast(error?.message || 'Unable to save your review right now.', 'error')
    } finally {
      setReviewSaving(false)
    }
  }

  const providerCoords = useMemo(() => (hasValidCoords(provider?.coords) ? provider.coords : [45.5017, -73.5673]), [provider?.coords])
  const galleryImages = provider?.galleryPhotos?.length > 0 ? provider.galleryPhotos : (provider?.gallery || [])
  const spotlightReview = reviews[0] || null
  const expertiseServices = (provider?.services || []).filter(Boolean)

  function scrollExpertise(direction) {
    if (!expertiseCarouselRef.current) return
    const scrollAmount = Math.max(280, Math.round(expertiseCarouselRef.current.clientWidth * 0.72))
    expertiseCarouselRef.current.scrollBy({ left: direction * scrollAmount, behavior: 'smooth' })
  }

  if (loading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}><div className="spinner" style={{ width: 36, height: 36 }} /></div>
  if (!provider) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', flexDirection: 'column', gap: 16 }}><div style={{ fontFamily: 'var(--display)', fontSize: 24, fontWeight: 800 }}>Provider not found</div><button className="btn btn-green" onClick={() => navigate('/providers')}>Back to providers</button></div>

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <NavBar activePage="providers" />
      <style>{`
        @media (max-width: 900px) {
          .provider-profile-page {
            padding-left: 14px !important;
            padding-right: 14px !important;
          }
          .provider-profile-hero {
            min-height: 0 !important;
            border-radius: 24px !important;
          }
          .provider-profile-hero-inner {
            min-height: 0 !important;
            padding: 24px 18px 20px !important;
          }
          .provider-profile-logo {
            width: 78px !important;
            height: 78px !important;
            border-radius: 20px !important;
          }
          .provider-profile-heading {
            font-size: 36px !important;
            line-height: 0.98 !important;
          }
          .provider-profile-meta {
            gap: 8px !important;
          }
          .provider-profile-stats {
            width: 100% !important;
            justify-content: center !important;
          }
          .provider-profile-stats > div {
            min-width: calc(50% - 8px) !important;
            flex: 1 1 140px !important;
          }
          .provider-profile-actions {
            padding-left: 2px !important;
            padding-right: 2px !important;
          }
          .provider-profile-actions-main,
          .provider-profile-actions-secondary {
            width: 100% !important;
          }
          .provider-profile-actions-main > * {
            flex: 1 1 180px !important;
            justify-content: center !important;
          }
          .providerLayout {
            grid-template-columns: minmax(0, 1fr) !important;
            padding-top: 22px !important;
          }
          .provider-profile-team-card {
            grid-template-columns: 1fr !important;
            text-align: center !important;
            justify-items: center !important;
          }
          .provider-profile-team-card .provider-profile-team-meta {
            justify-content: center !important;
          }
          .provider-profile-dual-cards,
          .provider-profile-gallery {
            grid-template-columns: 1fr !important;
          }
          .provider-profile-gallery-main {
            min-height: 280px !important;
          }
          .provider-profile-reviews-header {
            align-items: flex-start !important;
          }
        }

        @media (max-width: 640px) {
          .provider-profile-page {
            margin-top: 12px !important;
          }
          .provider-profile-hero {
            border-radius: 22px !important;
          }
          .provider-profile-hero-inner {
            padding: 22px 16px 18px !important;
          }
          .provider-profile-heading {
            font-size: 30px !important;
          }
          .provider-profile-meta {
            flex-direction: column !important;
          }
          .provider-profile-meta .provider-profile-meta-dot {
            display: none !important;
          }
          .provider-profile-stats {
            display: grid !important;
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          }
          .provider-profile-stats > div:last-child {
            grid-column: 1 / -1 !important;
          }
          .provider-profile-actions-main {
            display: grid !important;
            grid-template-columns: 1fr !important;
          }
          .provider-profile-expertise-actions {
            width: 100% !important;
            justify-content: space-between !important;
          }
          .provider-profile-expertise-actions .btn {
            flex: 1 1 auto !important;
            justify-content: center !important;
          }
          .provider-profile-expertise-card {
            min-height: 166px !important;
          }
          .provider-profile-map {
            height: 220px !important;
          }
          .provider-profile-reviews-header > div:last-child {
            width: 100% !important;
            justify-content: center !important;
          }
        }
      `}</style>
      <div className="provider-profile-page" style={{ maxWidth: 1360, margin: '18px auto 0', padding: '0 20px' }}>
        <section className="provider-profile-hero" style={{ position: 'relative', overflow: 'hidden', borderRadius: 28, border: '1px solid rgba(184, 203, 229, .65)', background: provider.coverPhoto ? `center / cover no-repeat url(${provider.coverPhoto})` : 'linear-gradient(135deg, #0d2336 0%, #173b5f 44%, #2f7de1 100%)', minHeight: 308, boxShadow: '0 24px 60px rgba(15, 30, 61, 0.14)' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(7,24,42,.14) 0%, rgba(7,24,42,.42) 45%, rgba(7,24,42,.8) 100%)' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 50% 18%, rgba(255,255,255,.16), transparent 34%)' }} />
          <div className="provider-profile-hero-inner" style={{ position: 'relative', zIndex: 1, minHeight: 308, display: 'grid', alignItems: 'end', justifyItems: 'center', padding: '28px 34px 24px' }}>
            <div style={{ width: '100%', display: 'grid', justifyItems: 'center', textAlign: 'center', maxWidth: 960 }}>
              <div className="provider-profile-logo" style={{ width: 96, height: 96, borderRadius: 24, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 18px 34px rgba(0,0,0,.24)', overflow: 'hidden', margin: '0 auto 16px' }}>
                {provider.logoImageUrl ? <img src={provider.logoImageUrl} alt={provider.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 34, color: '#143252' }}>{provider.logo}</div>}
              </div>
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 11px', borderRadius: 999, background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.14)', color: '#dbe7f6', fontSize: 11, fontWeight: 700, marginBottom: 12 }}>Provider profile</div>
                <h1 className="provider-profile-heading" style={{ fontFamily: 'var(--display)', fontSize: 52, lineHeight: 0.94, fontWeight: 800, color: '#fff', letterSpacing: '-0.06em', marginBottom: 12 }}>{provider.name}</h1>
                <div className="provider-profile-meta" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
                  <span style={{ color: '#dbe7f6', fontSize: 13, fontWeight: 600 }}>{provider.address}</span>
                  <span className="provider-profile-meta-dot" style={{ color: 'rgba(255,255,255,.42)' }}>{DOT}</span>
                  <a href={`tel:${provider.phone}`} style={{ color: '#dbe7f6', fontSize: 13, fontWeight: 600 }}>{provider.phone}</a>
                  {provider.website ? <><span className="provider-profile-meta-dot" style={{ color: 'rgba(255,255,255,.42)' }}>{DOT}</span><a href={provider.website.startsWith('http') ? provider.website : `https://${provider.website}`} target="_blank" rel="noreferrer" style={{ color: '#dbe7f6', fontSize: 13, fontWeight: 600 }}>{provider.website.replace(/^https?:\/\//, '')}</a></> : null}
                </div>
                <div className="provider-profile-stats" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
                  {[
                    { label: 'Rating', value: Number(provider.rating || 0).toFixed(1) },
                    { label: 'Reviews', value: String(provider.reviews || 0) },
                    { label: 'Services', value: String(provider.services?.length || 0) },
                  ].map((item) => <div key={item.label} style={{ minWidth: 116, borderRadius: 16, padding: '12px 14px', background: 'rgba(255,255,255,.1)', border: '1px solid rgba(255,255,255,.12)' }}><div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.11em', textTransform: 'uppercase', color: 'rgba(219,231,246,.78)', marginBottom: 5 }}>{item.label}</div><div style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 800, color: '#fff' }}>{item.value}</div></div>)}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="provider-profile-actions" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap', padding: '18px 10px 0' }}>
          <div className="provider-profile-actions-main" style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <a href={`tel:${provider.phone}`} className="btn btn-outline">Call</a>
            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(provider.address)}`} target="_blank" rel="noreferrer" className="btn btn-outline">Get direction</a>
            <button className="btn btn-outline" onClick={() => requestMessagingAccess()} disabled={messageOpening} style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M8 10h8M8 14h5m6 4-3.8-2.1a2 2 0 0 0-.97-.24H8a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v6a4 4 0 0 1-1 2.65Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>{messageOpening ? 'Opening...' : 'Message'}</span>
            </button>
            <button className="btn btn-green" onClick={requestBookingAccess}>Take an appointment</button>
          </div>
          <div className="provider-profile-actions-secondary" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{(provider.highlights || provider.services || []).slice(0, 6).map((item) => <span key={item} className="badge badge-blue">{item}</span>)}</div>
        </section>

        <div className="providerLayout" style={{ maxWidth: 'none', padding: '28px 4px 44px', gridTemplateColumns: 'minmax(0,1.46fr) minmax(320px,.72fr)' }}>
          <div style={{ display: 'grid', gap: 24 }}>
            {provider.staffMembers?.length > 0 ? (
              <InfoCard>
                <SectionHeading title="Team spotlight" subtitle="Meet the people clients see when they book through this provider." />
                <div style={{ display: 'grid', gap: 14 }}>
                  {provider.staffMembers.slice(0, 2).map((member) => (
                    <div className="provider-profile-team-card" key={member.id || `${member.name}-${member.role}`} style={{ display: 'grid', gridTemplateColumns: '98px minmax(0, 1fr)', gap: 18, alignItems: 'center', padding: 16, borderRadius: 18, border: '1px solid var(--border)', background: 'linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)' }}>
                      <div style={{ width: 98, height: 98, borderRadius: 22, overflow: 'hidden', background: '#f1f6fd' }}>
                        {member.photo_url ? <img src={member.photo_url} alt={member.name || 'Staff member'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--display)', fontSize: 36, fontWeight: 800, color: 'var(--blue)' }}>{String(member.name || 'S').slice(0, 1).toUpperCase()}</div>}
                      </div>
                      <div>
                        <div style={{ fontFamily: 'var(--display)', fontSize: 28, lineHeight: 1.04, letterSpacing: '-0.04em', color: 'var(--ink)', marginBottom: 6 }}>{member.name || 'FlashMat staff'}</div>
                        <div style={{ fontSize: 14, color: 'var(--ink2)', marginBottom: 10 }}>{member.role || 'Team member'}</div>
                        <div className="provider-profile-team-meta" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: 13, color: 'var(--ink2)' }}>
                          <span>{provider.address}</span>
                          {member.phone || provider.phone ? <span>{member.phone || provider.phone}</span> : null}
                          {member.email ? <span>{member.email}</span> : null}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </InfoCard>
            ) : (
              <InfoCard>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: '.16em', textTransform: 'uppercase', color: 'var(--ink3)', marginBottom: 12 }}>Provider overview</div>
                <div style={{ fontFamily: 'var(--display)', fontSize: 34, lineHeight: 1.02, letterSpacing: '-0.05em', color: 'var(--ink)', marginBottom: 14 }}>Built for appointments, repairs, and repeat trust.</div>
                <p style={{ fontSize: 15, color: 'var(--ink2)', lineHeight: 1.8 }}>{provider.description}</p>
              </InfoCard>
            )}

            <div className="provider-profile-dual-cards" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
              <InfoCard>
                <div style={{ fontFamily: 'var(--display)', fontSize: 24, fontWeight: 800, color: 'var(--ink)', marginBottom: 8 }}>Working hours</div>
                <div style={{ fontSize: 13, color: 'var(--ink2)', marginBottom: 10 }}>Open hours published by the provider on FlashMat.</div>
                <div style={{ display: 'grid' }}>{Object.entries(provider.hours || {}).map(([day, hours]) => <div key={day} style={{ display: 'grid', gridTemplateColumns: 'minmax(120px,1fr) auto', gap: 16, padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}><span style={{ fontWeight: 700, color: 'var(--ink)' }}>{DAYS[day] || day}</span><span style={{ color: String(hours).toLowerCase().includes('closed') ? 'var(--red)' : 'var(--green)', fontFamily: 'var(--mono)', fontSize: 12 }}>{hours}</span></div>)}</div>
              </InfoCard>
              <InfoCard style={{ background: 'linear-gradient(135deg, rgba(14,40,66,.96) 0%, rgba(47,125,225,.84) 100%)' }}>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(219,231,246,.7)', marginBottom: 10 }}>FlashMat expertise</div>
                <div style={{ fontFamily: 'var(--display)', fontSize: 28, lineHeight: 1.04, letterSpacing: '-0.04em', marginBottom: 12, color: '#fff' }}>{provider.name} at a glance.</div>
                <div style={{ fontSize: 14, lineHeight: 1.7, color: 'rgba(255,255,255,.84)', marginBottom: 20 }}>Use the service cards below to jump directly into the appointments this provider handles most often.</div>
                <button className="btn" style={{ background: '#fff', color: '#143252', borderColor: 'transparent', justifyContent: 'center' }} onClick={requestBookingAccess}>Book with FlashMat</button>
              </InfoCard>
            </div>

            <InfoCard>
              <SectionHeading
                title={`Expertise of ${provider.name}`}
                subtitle="Explore the specialties clients most often book with this provider."
                action={
                  <div className="provider-profile-expertise-actions" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    {expertiseServices.length > 1 ? (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => scrollExpertise(-1)}
                          aria-label="Previous expertise card"
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 999,
                            border: '1px solid var(--border)',
                            background: '#fff',
                            color: 'var(--ink)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 18,
                            cursor: 'pointer',
                          }}
                        >
                          ←
                        </button>
                        <button
                          type="button"
                          onClick={() => scrollExpertise(1)}
                          aria-label="Next expertise card"
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: 999,
                            border: '1px solid var(--border)',
                            background: '#fff',
                            color: 'var(--ink)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 18,
                            cursor: 'pointer',
                          }}
                        >
                          →
                        </button>
                      </div>
                    ) : null}
                    <button className="btn btn-outline" onClick={requestBookingAccess}>Request service</button>
                  </div>
                }
              />
              <div
                ref={expertiseCarouselRef}
                style={{
                  display: 'grid',
                  gridAutoFlow: 'column',
                  gridAutoColumns: 'minmax(240px, 280px)',
                  gap: 14,
                  overflowX: 'auto',
                  scrollSnapType: 'x mandatory',
                  paddingBottom: 6,
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                }}
              >
                {expertiseServices.map((service, index) => (
                  <button
                    key={service}
                    type="button"
                    onClick={requestBookingAccess}
                    className="provider-profile-expertise-card"
                    style={{
                      textAlign: 'left',
                      border: '1px solid var(--border)',
                      background: index === 0 ? 'linear-gradient(135deg, rgba(14,40,66,.96) 0%, rgba(47,125,225,.74) 100%)' : 'linear-gradient(180deg, #f8fbff 0%, #eef4fd 100%)',
                      color: index === 0 ? '#fff' : 'var(--ink)',
                      borderRadius: 22,
                      padding: 18,
                      minHeight: 188,
                      display: 'grid',
                      alignContent: 'space-between',
                      gap: 24,
                      scrollSnapAlign: 'start',
                      boxShadow: index === 0 ? '0 20px 34px rgba(20,50,82,.18)' : 'none',
                    }}
                  >
                    <div style={{ transform: 'scale(.9)', transformOrigin: 'top left' }}>
                      <ServiceIcon code={provider.icon || 'ME'} size={64} />
                    </div>
                    <div>
                      <div style={{ fontFamily: 'var(--display)', fontSize: 25, lineHeight: 1.04, letterSpacing: '-0.04em', marginBottom: 10 }}>{service}</div>
                      <div style={{ fontSize: 13, lineHeight: 1.7, color: index === 0 ? 'rgba(255,255,255,.78)' : 'var(--ink2)' }}>Book this service directly from the provider profile.</div>
                    </div>
                  </button>
                ))}
              </div>
            </InfoCard>

            {galleryImages.length > 0 ? <InfoCard><SectionHeading title="Business highlights" subtitle="A visual snapshot of the workspace, results, and services shown by this provider." /><div className="provider-profile-gallery" style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.05fr) minmax(0,.95fr)', gap: 16 }}><div className="provider-profile-gallery-main" style={{ borderRadius: 22, overflow: 'hidden', minHeight: 420, border: '1px solid var(--border)', background: 'var(--bg3)' }}>{typeof galleryImages[0] === 'string' && (galleryImages[0].startsWith('data:image') || galleryImages[0].startsWith('http')) ? <img src={galleryImages[0]} alt={`${provider.name} highlight`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, var(--green-bg), var(--blue-bg))', fontSize: 42 }}>{galleryImages[0]}</div>}</div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 16 }}>{galleryImages.slice(1, 5).map((img, index) => <div key={`gallery-${index}`} style={{ borderRadius: 18, overflow: 'hidden', aspectRatio: '1 / 1', border: '1px solid var(--border)', background: 'var(--bg3)' }}>{typeof img === 'string' && (img.startsWith('data:image') || img.startsWith('http')) ? <img src={img} alt={`${provider.name} gallery ${index + 2}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, var(--green-bg), var(--blue-bg))', fontSize: 26 }}>{img}</div>}</div>)}</div></div></InfoCard> : null}

            {providerProducts.length > 0 ? <InfoCard><SectionHeading title="Provider products" subtitle="Items currently published by this provider through FlashMat Marketplace." /><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>{providerProducts.map((item) => <div key={item.id} style={{ display: 'grid', gap: 12 }}><div style={{ borderRadius: 18, overflow: 'hidden', aspectRatio: '1 / .92', border: '1px solid var(--border)', background: 'var(--bg3)' }}>{item.image_url ? <img src={item.image_url} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ServiceIcon code={item.icon || 'PC'} size={86} /></div>}</div><div><div style={{ fontFamily: 'var(--display)', fontSize: 17, lineHeight: 1.2, color: 'var(--ink)', marginBottom: 6 }}>{item.title}</div><div style={{ fontSize: 11, color: 'var(--ink3)', marginBottom: 8 }}>{item.category}</div><div style={{ fontFamily: 'var(--display)', fontSize: 18, fontWeight: 800, color: 'var(--blue)', marginBottom: 10 }}>{formatPrice(item.price)}</div><button type="button" className="btn btn-green" onClick={() => navigate('/marketplace')}>View item</button></div></div>)}</div></InfoCard> : null}

            <InfoCard>
              <div className="provider-profile-reviews-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
                <div><div style={{ fontFamily: 'var(--display)', fontSize: 30, lineHeight: 1, letterSpacing: '-0.045em', color: 'var(--ink)', marginBottom: 8 }}>Reviews</div><div style={{ fontSize: 13, color: 'var(--ink2)' }}>{provider.reviews || 0} reviews on this provider profile.</div></div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 999, background: 'var(--bg3)', border: '1px solid var(--border)' }}><span style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 800, color: 'var(--ink)' }}>{Number(provider.rating || 0).toFixed(1)}</span><span style={{ color: '#f59e0b', fontSize: 16 }}>{renderStarsSafe(provider.rating)}</span></div>
              </div>
              {profile?.role === 'client' ? <div style={{ border: '1px solid var(--border)', borderRadius: 16, padding: 18, background: 'linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)', marginBottom: 18 }}><div style={{ fontFamily: 'var(--display)', fontSize: 22, fontWeight: 800, marginBottom: 10 }}>Write a review</div><div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>{[1, 2, 3, 4, 5].map((value) => <button key={value} type="button" className={`btn ${reviewRating === value ? 'btn-green' : ''}`} onClick={() => setReviewRating(value)}>{value} star{value > 1 ? 's' : ''}</button>)}</div><textarea className="form-input" value={reviewComment} onChange={(event) => setReviewComment(event.target.value)} placeholder="Share how the provider handled the service, communication, timing, or quality." style={{ width: '100%', minHeight: 120, resize: 'vertical', paddingTop: 12 }} /><div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 12, flexWrap: 'wrap' }}><div style={{ fontSize: 12, color: 'var(--ink3)' }}>Only logged-in client accounts can publish reviews on provider pages.</div><button type="button" className="btn btn-green" onClick={handleReviewSubmit} disabled={reviewSaving}>{reviewSaving ? 'Saving...' : 'Save review'}</button></div></div> : null}
              {!user ? <div style={{ fontSize: 13, color: 'var(--ink3)', marginBottom: 12 }}>Sign in with a client account to leave a review.</div> : null}
              {user && profile?.role !== 'client' ? <div style={{ fontSize: 13, color: 'var(--ink3)', marginBottom: 12 }}>Reviews can only be submitted by logged-in client accounts.</div> : null}
              <div style={{ display: 'grid', gap: 18 }}>{reviews.length > 0 ? reviews.map((review) => <article key={review.id} style={{ display: 'grid', gridTemplateColumns: '54px minmax(0, 1fr)', gap: 14, paddingBottom: 18, borderBottom: '1px solid var(--border)' }}><div style={{ width: 54, height: 54, borderRadius: '50%', background: 'var(--green-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, overflow: 'hidden' }}>{review.avatar_url ? <img src={review.avatar_url} alt={review.user} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : review.user.slice(0, 1).toUpperCase()}</div><div><div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}><span style={{ fontFamily: 'var(--display)', fontSize: 20, fontWeight: 800, color: 'var(--ink)' }}>{review.user}</span><span style={{ color: '#f59e0b' }}>{renderStarsSafe(review.rating)}</span><span style={{ fontSize: 11, color: 'var(--ink3)', fontFamily: 'var(--mono)' }}>{review.date}</span></div><p style={{ fontSize: 14, color: 'var(--ink2)', lineHeight: 1.8 }}>{review.comment}</p></div></article>) : <div style={{ fontSize: 13, color: 'var(--ink3)' }}>No reviews yet. Be the first client to share how this provider performed.</div>}</div>
            </InfoCard>
          </div>

          <aside style={{ display: 'grid', gap: 20, alignContent: 'start' }}>
            <InfoCard style={{ padding: 0 }}>
              <div className="provider-profile-map" style={{ height: 240, overflow: 'hidden', margin: '-24px -24px 18px', borderBottom: '1px solid var(--border)', position: 'relative', zIndex: 0 }}>
                <MapContainer center={providerCoords} zoom={15} style={{ height: '100%', width: '100%', zIndex: 0 }} scrollWheelZoom>
                  <ProviderMapViewportSync center={providerCoords} zoom={15} />
                  <TileLayer attribution="&copy; OpenStreetMap &copy; CARTO" url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" />
                  <Marker position={providerCoords}><Popup>{provider.name}<br />{provider.address}</Popup></Marker>
                </MapContainer>
              </div>
              <div style={{ fontFamily: 'var(--display)', fontSize: 26, fontWeight: 800, color: 'var(--ink)', marginBottom: 8 }}>Provider location</div>
              <div style={{ display: 'grid', gridTemplateColumns: '42px minmax(0, 1fr)', gap: 12, alignItems: 'start', padding: '12px 14px', borderRadius: 16, border: '1px solid var(--border)', background: 'linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)', marginBottom: 14 }}>
                <div style={{ width: 42, height: 42, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(47,125,225,.1)', color: 'var(--blue)' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 21s6-5.6 6-11a6 6 0 1 0-12 0c0 5.4 6 11 6 11Z" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="12" cy="10" r="2.3" fill="currentColor" />
                  </svg>
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.14em', textTransform: 'uppercase', color: 'var(--ink3)', marginBottom: 5 }}>Address</div>
                  <div style={{ fontSize: 13, color: 'var(--ink2)', lineHeight: 1.7 }}>{provider.address}</div>
                </div>
              </div>
              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(provider.address)}`} target="_blank" rel="noreferrer" className="btn btn-green" style={{ width: '100%', justifyContent: 'center' }}>Get direction</a>
            </InfoCard>

            {spotlightReview ? <InfoCard><div style={{ fontFamily: 'var(--display)', fontSize: 26, fontWeight: 800, color: 'var(--ink)', marginBottom: 14, textAlign: 'center' }}>Review spotlight</div><div style={{ width: 78, height: 78, borderRadius: '50%', margin: '0 auto 12px', background: 'var(--bg3)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>{spotlightReview.avatar_url ? <img src={spotlightReview.avatar_url} alt={spotlightReview.user} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontFamily: 'var(--display)', fontSize: 28, fontWeight: 800, color: 'var(--blue)' }}>{spotlightReview.user.slice(0, 1).toUpperCase()}</span>}</div><div style={{ color: '#f59e0b', fontSize: 18, marginBottom: 8, textAlign: 'center' }}>{renderStarsSafe(spotlightReview.rating)}</div><div style={{ fontSize: 14, color: 'var(--ink2)', lineHeight: 1.7, textAlign: 'center' }}>{spotlightReview.comment}</div><div style={{ marginTop: 10, fontSize: 12, color: 'var(--ink3)', textAlign: 'center' }}>{spotlightReview.user} {DOT} {spotlightReview.date}</div></InfoCard> : null}

            <InfoCard><div style={{ fontFamily: 'var(--display)', fontSize: 26, fontWeight: 800, color: 'var(--ink)', marginBottom: 10 }}>Contact</div><a href={`tel:${provider.phone}`} style={{ color: 'var(--green)', fontSize: 14, display: 'block', marginBottom: 6 }}>{provider.phone}</a>{provider.email ? <a href={`mailto:${provider.email}`} style={{ color: 'var(--green)', fontSize: 14, display: 'block', marginBottom: 8 }}>{provider.email}</a> : null}<div style={{ color: 'var(--ink2)', fontSize: 13, lineHeight: 1.7, marginBottom: 12 }}>{provider.address}</div><div style={{ display: 'grid', gap: 10 }}><button className="btn btn-outline" style={{ width: '100%', justifyContent: 'center', display: 'inline-flex', alignItems: 'center', gap: 8 }} onClick={() => requestMessagingAccess()} disabled={messageOpening}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M8 10h8M8 14h5m6 4-3.8-2.1a2 2 0 0 0-.97-.24H8a4 4 0 0 1-4-4V8a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v6a4 4 0 0 1-1 2.65Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg><span>{messageOpening ? 'Opening...' : 'Message on FlashMat'}</span></button><button className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }} onClick={requestBookingAccess}>Book through FlashMat</button></div></InfoCard>
          </aside>
        </div>
      </div>

      {bookingOpen && user ? <BookingModal providers={[provider]} vehicles={userVehicles} initialProvider={provider} onClose={() => setBookingOpen(false)} onConfirm={handleBookingConfirm} /> : null}
      <SiteFooter portal="public" />
    </div>
  )
}


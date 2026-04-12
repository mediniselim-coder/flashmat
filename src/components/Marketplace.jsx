import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import NewListingModal from './NewListingModal'
import { getMarketplaceListingPath, normalizeMarketplaceListing } from '../lib/marketplace'
import { addCartItem } from '../lib/cart'
import { isAdminRole, isProviderRole } from '../lib/roles'
import ServiceIcon from './ServiceIcon'

const SECTIONS = [
  {
    id: 'shop',
    label: 'FlashMat Shop',
    title: 'FlashMat Shop',
    description: 'Stock-based items published by FlashMat Admins and FlashMat Providers.',
    cta: 'Publish FlashMat Shop item',
    empty: 'No FlashMat Shop items yet',
  },
  {
    id: 'pickup',
    label: 'Pick up',
    title: 'Pick up',
    description: 'Peer-to-peer items that clients and providers sell directly for local pickup.',
    cta: 'Publish pick up item',
    empty: 'No pick up items yet',
  },
  {
    id: 'parts',
    label: 'Auto Parts Pro',
    title: 'Provider-only parts exchange',
    description: 'Auto parts sellers publish inventory for FlashMat providers and workshops.',
    cta: 'Publish auto parts',
    empty: 'No auto parts listings yet',
  },
  {
    id: 'vehicle',
    label: 'Vehicle Marketplace',
    title: 'Buy and sell vehicles',
    description: 'Public vehicle listings connected to FlashMat vehicle profiles.',
    cta: 'Sell a vehicle from your dashboard',
    empty: 'No vehicles listed yet',
  },
]

const SORTS = [['recent', 'Newest'], ['price_asc', 'Price ↑'], ['price_desc', 'Price ↓']]

function timeAgo(ts) {
  const diff = (Date.now() - new Date(ts)) / 1000
  if (!Number.isFinite(diff)) return 'recently'
  if (diff < 3600) return `${Math.max(1, Math.floor(diff / 60))} min ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`
  return `${Math.floor(diff / 86400)} d ago`
}

function getSectionMeta(sectionId) {
  return SECTIONS.find((section) => section.id === sectionId) || SECTIONS[0]
}

function matchesSection(listing, sectionId) {
  return (listing.listing_type || 'shop') === sectionId
}

function canPublishSection(sectionId, profileRole) {
  if (sectionId === 'parts') return isProviderRole(profileRole)
  if (sectionId === 'shop') return isProviderRole(profileRole) || isAdminRole(profileRole)
  if (sectionId === 'pickup') return Boolean(profileRole)
  return sectionId !== 'vehicle'
}

export default function Marketplace({ portal = 'client', openComposer = false, forcedSection = null }) {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const { toast } = useToast()
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [section, setSection] = useState(forcedSection || 'shop')
  const [sort, setSort] = useState('recent')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [myOnly, setMyOnly] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const isProvider = isProviderRole(profile?.role)
  const availableSections = useMemo(
    () => SECTIONS.filter((item) => item.id !== 'parts' || isProvider),
    [isProvider],
  )

  useEffect(() => { fetchListings() }, [])
  useEffect(() => {
    if (!forcedSection) return
    if (forcedSection === 'parts' && !isProvider) {
      setSection('shop')
      return
    }
    setSection(forcedSection)
  }, [forcedSection, isProvider])
  useEffect(() => {
    if (!openComposer) {
      setShowModal(false)
    }
  }, [openComposer])
  useEffect(() => {
    if (section === 'parts' && !isProvider) {
      setSection('shop')
    }
  }, [isProvider, section])

  async function fetchListings() {
    setLoading(true)
    const { data } = await supabase.from('marketplace').select('*').eq('is_active', true).order('created_at', { ascending: false })
    setListings((data || []).map(normalizeMarketplaceListing))
    setLoading(false)
  }

  async function deleteListing(id) {
    await supabase.from('marketplace').update({ is_active: false }).eq('id', id)
    setListings((current) => current.filter((item) => item.id !== id))
  }

  function handleAddToCart(listing) {
    if (!user) {
      window.sessionStorage.setItem('flashmat-post-login-redirect', '/marketplace')
      window.dispatchEvent(new CustomEvent('flashmat-login-modal-open'))
      return
    }

    addCartItem(user.id, {
      id: listing.id,
      listing_id: listing.id,
      title: listing.title,
      price: listing.price,
      quantity: 1,
      image_url: listing.image_url,
      seller_name: listing.seller_name,
      route: getMarketplaceListingPath(listing),
      category: listing.category,
      listing_type: listing.listing_type,
    })
    toast(`${listing.title} added to cart.`, 'success')
  }

  function openListing(listing) {
    navigate(getMarketplaceListingPath(listing))
  }

  function stopCardNavigation(event) {
    event.stopPropagation()
  }

  function openComposerModal() {
    if (section === 'vehicle') {
      navigate('/app/client/vehicles')
      return
    }

    if (!user || !profile) {
      window.sessionStorage.setItem('flashmat-post-login-redirect', '/marketplace')
      window.dispatchEvent(new CustomEvent('flashmat-login-modal-open'))
      return
    }

    if (!canPublishSection(section, profile?.role)) {
      return
    }

    setShowModal(true)
  }

  const currentSection = availableSections.find((item) => item.id === section) || availableSections[0] || SECTIONS[0]
  const visibleListings = useMemo(() => listings
    .filter((listing) => matchesSection(listing, section))
    .filter((listing) => !myOnly || listing.seller_id === user?.id)
    .filter((listing) => {
      if (!search) return true
      const q = search.toLowerCase()
      return (
        listing.title?.toLowerCase().includes(q) ||
        listing.description?.toLowerCase().includes(q) ||
        listing.category?.toLowerCase().includes(q) ||
        listing.vehicle_snapshot?.make?.toLowerCase().includes(q) ||
        listing.vehicle_snapshot?.model?.toLowerCase().includes(q)
      )
    })
    .sort((a, b) => {
      if (sort === 'price_asc') return (a.price || 0) - (b.price || 0)
      if (sort === 'price_desc') return (b.price || 0) - (a.price || 0)
      return new Date(b.created_at) - new Date(a.created_at)
    }), [listings, myOnly, search, section, sort, user?.id])

  const publishDisabled = section === 'vehicle' || !canPublishSection(section, profile?.role)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px 0', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 24, letterSpacing: '-.5px' }}>{currentSection.title}</div>
          <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 4 }}>
            {loading ? 'Loading listings...' : `${visibleListings.length} listing${visibleListings.length !== 1 ? 's' : ''} visible`}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {user ? (
            <button className={`btn ${myOnly ? 'btn-green' : ''}`} onClick={() => setMyOnly((current) => !current)} style={{ fontSize: 12 }}>
              My listings
            </button>
          ) : null}
          <button className={`btn ${publishDisabled ? '' : 'btn-green'}`} onClick={openComposerModal} style={{ fontSize: 12 }}>
            {currentSection.cta}
          </button>
        </div>
      </div>

      <div style={{ padding: '14px 24px 0', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {availableSections.map((item) => (
          <button
            key={item.id}
            onClick={() => setSection(item.id)}
            style={{
              background: section === item.id ? 'var(--green)' : 'var(--bg3)',
              color: section === item.id ? '#fff' : 'var(--ink2)',
              border: `1px solid ${section === item.id ? 'var(--green)' : 'var(--border)'}`,
              borderRadius: 999,
              padding: '8px 14px',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '10px 24px 0', color: 'var(--ink2)', fontSize: 13, lineHeight: 1.7 }}>
        {currentSection.description}
        {section === 'parts' ? (
          <span style={{ display: 'block', color: 'var(--ink3)', marginTop: 4 }}>
            Auto parts listings are published by providers and intended for provider accounts.
          </span>
        ) : null}
        {section === 'vehicle' ? (
          <span style={{ display: 'block', color: 'var(--ink3)', marginTop: 4 }}>
            Vehicles are listed from the owner dashboard, and each sale listing links to a public FlashMat vehicle profile.
          </span>
        ) : null}
        {section === 'shop' ? (
          <span style={{ display: 'block', color: 'var(--ink3)', marginTop: 4 }}>
            FlashMat Shop is reserved for stocked items published by FlashMat Admins and FlashMat Providers.
          </span>
        ) : null}
        {section === 'pickup' ? (
          <span style={{ display: 'block', color: 'var(--ink3)', marginTop: 4 }}>
            Pick up listings are sold directly between clients and providers. These items are not added to cart and buyers contact the seller to arrange pickup.
          </span>
        ) : null}
      </div>

      <div style={{ padding: '16px 24px 0', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          className="form-input"
          placeholder={section === 'vehicle' ? 'Search a vehicle listing...' : 'Search a listing...'}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          style={{ flex: 1, minWidth: 220, fontSize: 13 }}
        />
        <select className="form-select" value={sort} onChange={(event) => setSort(event.target.value)} style={{ width: 150, fontSize: 13 }}>
          {SORTS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>

      <div style={{ padding: '16px 24px 24px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 12px' }} />
            <div style={{ fontSize: 12, color: 'var(--ink3)', fontFamily: 'var(--mono)' }}>Loading listings...</div>
          </div>
        ) : visibleListings.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: 'var(--ink3)' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}><ServiceIcon code={section === 'vehicle' ? 'VH' : section === 'parts' ? 'PC' : section === 'pickup' ? 'PK' : 'SH'} size={40} /></div>
            <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>
              {search ? 'No matching listings' : currentSection.empty}
            </div>
            <div style={{ fontSize: 13, marginBottom: 20 }}>
              {section === 'vehicle' ? 'Sell a vehicle from the client dashboard to publish it here.' : 'Be the first to publish in this section.'}
            </div>
            <button className="btn btn-green btn-lg" onClick={openComposerModal}>{currentSection.cta}</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
            {visibleListings.map((listing) => {
              const vehicle = listing.vehicle_snapshot
              const cardImage = listing.image_url || vehicle?.imageUrl || ''
              return (
                <div
                  key={listing.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openListing(listing)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      openListing(listing)
                    }
                  }}
                  style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden', boxShadow: 'var(--shadow)', display: 'flex', flexDirection: 'column', cursor: 'pointer' }}
                >
                  <div style={{ height: 180, overflow: 'hidden', borderBottom: '1px solid var(--border)', position: 'relative', background: 'linear-gradient(135deg, #102746 0%, #2c7ac8 100%)' }}>
                    {cardImage ? (
                      <img src={cardImage} alt={listing.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ServiceIcon code={listing.listing_type === 'vehicle' ? 'VH' : listing.icon || 'MP'} size={84} />
                      </div>
                    )}
                    <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <span className="badge badge-gray" style={{ background: 'rgba(4,18,32,.56)', color: '#fff', border: 'none' }}>{listing.category}</span>
                      {listing.audience === 'providers' ? <span className="badge badge-blue" style={{ border: 'none' }}>Providers only</span> : null}
                    </div>
                  </div>

                  <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 16, color: 'var(--ink)', lineHeight: 1.25 }}>{listing.title}</div>
                      {vehicle ? (
                        <div style={{ fontSize: 12, color: 'var(--ink2)', marginTop: 6 }}>
                          {vehicle.mileage ? `${Number(vehicle.mileage).toLocaleString()} km` : 'Mileage not shared'} {vehicle.color ? `· ${vehicle.color}` : ''}
                        </div>
                      ) : null}
                    </div>

                    {listing.description ? (
                      <div style={{ fontSize: 12, color: 'var(--ink2)', lineHeight: 1.6 }}>
                        {expanded === listing.id ? listing.description : `${listing.description.slice(0, 96)}${listing.description.length > 96 ? '…' : ''}`}
                        {listing.description.length > 96 ? (
                          <button
                            onClick={(event) => {
                              stopCardNavigation(event)
                              setExpanded(expanded === listing.id ? null : listing.id)
                            }}
                            style={{ background: 'none', border: 'none', color: 'var(--green)', fontSize: 11, cursor: 'pointer', marginLeft: 4 }}
                          >
                            {expanded === listing.id ? 'Show less' : 'Read more'}
                          </button>
                        ) : null}
                      </div>
                    ) : null}

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 24, color: 'var(--green)' }}>
                        {listing.price != null ? `$${Number(listing.price).toFixed(0)}` : 'Price on request'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--ink3)', fontFamily: 'var(--mono)' }}>{timeAgo(listing.created_at)}</div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'var(--bg3)', borderRadius: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: listing.seller_type === 'provider' ? 'var(--blue-bg)' : 'var(--green-bg)', border: `1px solid ${listing.seller_type === 'provider' ? 'rgba(37,99,235,.2)' : 'rgba(22,199,132,.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <ServiceIcon code={listing.seller_type === 'provider' ? 'SV' : 'VH'} size={18} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{listing.seller_name}</div>
                        <div style={{ fontSize: 10, color: 'var(--ink3)', fontFamily: 'var(--mono)' }}>{listing.seller_label}</div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                      <button className="btn btn-green" style={{ flex: 1, justifyContent: 'center' }} onClick={(event) => {
                        stopCardNavigation(event)
                        openListing(listing)
                      }}>
                        {listing.listing_type === 'vehicle' ? 'View vehicle' : 'View item'}
                      </button>

                      {listing.listing_type === 'shop' && listing.seller_id !== user?.id ? (
                        <button className="btn" style={{ justifyContent: 'center' }} onClick={(event) => {
                          stopCardNavigation(event)
                          handleAddToCart(listing)
                        }}>
                          Add to cart
                        </button>
                      ) : null}

                      {listing.listing_type === 'pickup' && listing.seller_id !== user?.id ? (
                        listing.phone ? (
                          <a href={`tel:${listing.phone}`} className="btn" style={{ justifyContent: 'center', textDecoration: 'none', display: 'flex' }} onClick={stopCardNavigation}>
                            Call seller
                          </a>
                        ) : (
                          <button className="btn" style={{ justifyContent: 'center' }} onClick={(event) => {
                            stopCardNavigation(event)
                            openListing(listing)
                          }}>
                            Pickup details
                          </button>
                        )
                      ) : null}

                      {listing.seller_id === user?.id ? (
                        <button className="btn" style={{ color: 'var(--red)', borderColor: 'rgba(239,68,68,.22)' }} onClick={(event) => {
                          stopCardNavigation(event)
                          if (window.confirm('Remove this listing?')) deleteListing(listing.id)
                        }}>
                          Remove
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {showModal && user && profile && (
        <NewListingModal
          listingType={section}
          onClose={() => setShowModal(false)}
          onCreated={(listing) => { setListings((current) => [listing, ...current]); setShowModal(false) }}
        />
      )}
    </div>
  )
}

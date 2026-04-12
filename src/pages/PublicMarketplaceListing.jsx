import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import NavBar from '../components/NavBar'
import SiteFooter from '../components/SiteFooter'
import ServiceIcon from '../components/ServiceIcon'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { addCartItem } from '../lib/cart'
import { normalizeMarketplaceListing } from '../lib/marketplace'
import { supabase } from '../lib/supabase'

function timeAgo(ts) {
  const diff = (Date.now() - new Date(ts)) / 1000
  if (!Number.isFinite(diff)) return 'recently'
  if (diff < 3600) return `${Math.max(1, Math.floor(diff / 60))} min ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`
  return `${Math.floor(diff / 86400)} d ago`
}

export default function PublicMarketplaceListing() {
  const { listingId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()
  const [listing, setListing] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadListing() {
      setLoading(true)
      const { data } = await supabase
        .from('marketplace')
        .select('*')
        .eq('id', listingId)
        .eq('is_active', true)
        .maybeSingle()

      if (cancelled) return
      const normalized = data ? normalizeMarketplaceListing(data) : null
      setListing(normalized?.listing_type === 'vehicle' ? null : normalized)
      setLoading(false)
    }

    loadListing()
    return () => { cancelled = true }
  }, [listingId])

  const detailPairs = listing ? [
    ['Category', listing.category || 'Not shared'],
    ['Condition', listing.condition || 'Not shared'],
    ['Audience', listing.audience === 'providers' ? 'Providers only' : 'Public listing'],
    ['Seller type', listing.seller_label || 'Seller'],
    ['Listing flow', listing.listing_type === 'pickup' ? 'Call seller and pick up locally' : listing.listing_type === 'shop' ? 'Stock item with cart checkout' : 'Direct listing'],
    ['City', listing.city || 'Montreal'],
    ['Published', timeAgo(listing.created_at)],
  ] : []

  function handleAddToCart() {
    if (!listing) return
    if (!user) {
      window.sessionStorage.setItem('flashmat-post-login-redirect', `/marketplace/listings/${listing.id}`)
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
      route: `/marketplace/listings/${listing.id}`,
      category: listing.category,
      listing_type: listing.listing_type,
    })
    toast(`${listing.title} added to cart.`, 'success')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <NavBar activePage="marketplace" />

      <main style={{ flex: 1 }}>
        <section style={{ background: 'linear-gradient(135deg, #081f31 0%, #0f1e3d 58%, #2563eb 100%)', color: '#fff' }}>
          <div style={{ maxWidth: 1440, margin: '0 auto', padding: '40px 28px 44px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase', color: 'rgba(143, 217, 255, 0.88)', marginBottom: 10 }}>
                  FlashMat marketplace listing
                </div>
                <h1 style={{ margin: 0, fontFamily: 'var(--display)', fontSize: 44, lineHeight: 1.02, letterSpacing: '-0.05em' }}>
                  {loading ? 'Loading listing...' : listing?.title || 'Listing not found'}
                </h1>
                <p style={{ margin: '12px 0 0', maxWidth: 680, color: 'rgba(255,255,255,0.72)', fontSize: 15, lineHeight: 1.7 }}>
                  Review the complete listing details, seller info, and contact options before you reach out through FlashMat Marketplace.
                </p>
              </div>
              <button type="button" className="btn" onClick={() => navigate('/marketplace')} style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.14)' }}>
                Back to marketplace
              </button>
            </div>
          </div>
        </section>

        <section style={{ maxWidth: 1440, margin: '0 auto', padding: '28px 28px 64px' }}>
          {loading ? (
            <div className="panel" style={{ padding: 28, textAlign: 'center', color: 'var(--ink3)' }}>Loading listing...</div>
          ) : !listing ? (
            <div className="panel" style={{ padding: 30, textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 22, color: 'var(--ink)', marginBottom: 10 }}>Listing not found</div>
              <div style={{ color: 'var(--ink2)', fontSize: 14 }}>This item may have been removed from the marketplace.</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.04fr) minmax(320px, 0.96fr)', gap: 18, alignItems: 'start' }}>
              <div className="panel">
                <div className="panel-body" style={{ padding: 18 }}>
                  <div style={{ height: 420, borderRadius: 18, border: '1px solid var(--border)', background: 'linear-gradient(135deg, #102746 0%, #2c7ac8 100%)', overflow: 'hidden', marginBottom: 18 }}>
                    {listing.image_url ? (
                      <img src={listing.image_url} alt={listing.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center' }}>
                        <ServiceIcon code={listing.icon || 'MP'} size={96} />
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 16 }}>
                    <div>
                      <div style={{ fontFamily: 'var(--display)', fontSize: 36, lineHeight: 1.02, fontWeight: 800, color: 'var(--ink)' }}>
                        {listing.title}
                      </div>
                      <div style={{ color: 'var(--ink2)', fontSize: 14, marginTop: 6 }}>
                        {listing.category} {listing.city ? `· ${listing.city}` : ''}
                      </div>
                    </div>
                    <div style={{ fontFamily: 'var(--display)', fontSize: 34, fontWeight: 800, color: 'var(--green)' }}>
                      {listing.price != null ? `$${Number(listing.price).toFixed(0)}` : 'Price on request'}
                    </div>
                  </div>

                  <div style={{ fontSize: 15, color: 'var(--ink2)', lineHeight: 1.85 }}>
                    {listing.description || 'The seller has not added more details yet.'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gap: 18 }}>
                <div className="panel">
                  <div className="panel-hd"><div className="panel-title">Listing details</div></div>
                  <div className="panel-body" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                    {detailPairs.map(([label, value]) => (
                      <div key={label} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 14, padding: '12px 14px' }}>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink3)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
                        <div style={{ color: 'var(--ink)', fontSize: 14, fontWeight: 700 }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-hd"><div className="panel-title">Seller</div></div>
                  <div className="panel-body">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                      <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, #0e2b4a 0%, #2f7de1 100%)', display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 800 }}>
                        {String(listing.seller_name || 'S').slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)' }}>{listing.seller_name}</div>
                        <div style={{ fontSize: 12, color: 'var(--ink2)' }}>{listing.seller_label}</div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gap: 10 }}>
                      {listing.listing_type === 'shop' ? (
                        <button type="button" className="btn btn-green" onClick={handleAddToCart} style={{ width: '100%', justifyContent: 'center' }}>
                          Add to cart
                        </button>
                      ) : null}

                      {listing.listing_type === 'pickup' ? (
                        <div style={{ fontSize: 12, color: 'var(--ink2)', lineHeight: 1.6, padding: '2px 2px 4px' }}>
                          This is a pick up item. Call the seller to confirm availability and arrange where to collect it.
                        </div>
                      ) : null}

                      {listing.phone ? (
                        <a href={`tel:${listing.phone}`} className="btn" style={{ width: '100%', justifyContent: 'center', textDecoration: 'none', display: 'flex' }}>
                          {listing.listing_type === 'pickup' ? 'Call seller for pickup' : 'Call seller'}
                        </a>
                      ) : (
                        <div className="btn" style={{ width: '100%', justifyContent: 'center', color: 'var(--ink3)', cursor: 'default' }}>Seller contact unavailable</div>
                      )}

                      <button type="button" className="btn" onClick={() => navigate('/marketplace')} style={{ width: '100%', justifyContent: 'center' }}>
                        Browse more listings
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      <SiteFooter portal="public" />
    </div>
  )
}

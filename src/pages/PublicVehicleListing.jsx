import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { normalizeMarketplaceListing } from '../lib/marketplace'
import NavBar from '../components/NavBar'
import SiteFooter from '../components/SiteFooter'

export default function PublicVehicleListing() {
  const { listingId } = useParams()
  const navigate = useNavigate()
  const [listing, setListing] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadListing() {
      setLoading(true)
      const { data } = await supabase
        .from('marketplace')
        .select('*')
        .eq('id', listingId)
        .eq('is_active', true)
        .maybeSingle()

      setListing(data ? normalizeMarketplaceListing(data) : null)
      setLoading(false)
    }

    loadListing()
  }, [listingId])

  const vehicle = listing?.vehicle_snapshot

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <NavBar activePage="marketplace" />

      <main style={{ flex: 1 }}>
        <section style={{ background: 'linear-gradient(135deg, #081f31 0%, #0f1e3d 58%, #2563eb 100%)', color: '#fff' }}>
          <div style={{ maxWidth: 1440, margin: '0 auto', padding: '40px 28px 44px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase', color: 'rgba(143, 217, 255, 0.88)', marginBottom: 10 }}>
                  FlashMat vehicle marketplace
                </div>
                <h1 style={{ margin: 0, fontFamily: 'var(--display)', fontSize: 44, lineHeight: 1.02, letterSpacing: '-0.05em' }}>
                  {loading ? 'Loading vehicle...' : listing?.title || 'Vehicle listing not found'}
                </h1>
                <p style={{ margin: '12px 0 0', maxWidth: 680, color: 'rgba(255,255,255,0.72)', fontSize: 15, lineHeight: 1.7 }}>
                  Public FlashMat vehicle profile for a listed vehicle. Buyers can review the saved vehicle details before contacting the seller.
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
          ) : !listing || !vehicle ? (
            <div className="panel" style={{ padding: 30, textAlign: 'center' }}>
              <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 22, color: 'var(--ink)', marginBottom: 10 }}>Vehicle listing not found</div>
              <div style={{ color: 'var(--ink2)', fontSize: 14 }}>This listing may have been removed from the marketplace.</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.04fr) minmax(320px, 0.96fr)', gap: 18, alignItems: 'start' }}>
              <div className="panel">
                <div className="panel-body" style={{ padding: 18 }}>
                  <img
                    src={listing.image_url || vehicle.imageUrl || '/vehicle-fallback.svg'}
                    alt={listing.title}
                    style={{ width: '100%', height: 360, objectFit: 'cover', borderRadius: 18, border: '1px solid var(--border)', background: 'linear-gradient(135deg, #102746 0%, #2c7ac8 100%)', marginBottom: 18 }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 16 }}>
                    <div>
                      <div style={{ fontFamily: 'var(--display)', fontSize: 36, lineHeight: 1.02, fontWeight: 800, color: 'var(--ink)' }}>
                        {listing.title}
                      </div>
                      <div style={{ color: 'var(--ink2)', fontSize: 14, marginTop: 6 }}>
                        {vehicle.plate ? `Plate ${vehicle.plate}` : 'Private plate'} {vehicle.color ? `· ${vehicle.color}` : ''}
                      </div>
                    </div>
                    <div style={{ fontFamily: 'var(--display)', fontSize: 34, fontWeight: 800, color: 'var(--green)' }}>
                      ${Number(listing.price || 0).toFixed(0)}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                    {[
                      ['Brand', vehicle.make || 'Not shared'],
                      ['Model', vehicle.model || 'Not shared'],
                      ['Year', vehicle.year || 'Not shared'],
                      ['Mileage', vehicle.mileage ? `${Number(vehicle.mileage).toLocaleString()} km` : 'Not shared'],
                      ['Color', vehicle.color || 'Not shared'],
                      ['FlashScore', vehicle.flashScore ? `${vehicle.flashScore}%` : 'Not shared'],
                    ].map(([label, value]) => (
                      <div key={label} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 14, padding: '12px 14px' }}>
                        <div style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink3)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
                        <div style={{ color: 'var(--ink)', fontSize: 14, fontWeight: 700 }}>{value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gap: 18 }}>
                <div className="panel">
                  <div className="panel-hd"><div className="panel-title">Seller</div></div>
                  <div className="panel-body">
                    <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--ink)', marginBottom: 6 }}>{listing.seller_name}</div>
                    <div style={{ fontSize: 12, color: 'var(--ink2)', marginBottom: 14 }}>{listing.city}</div>
                    {listing.phone ? (
                      <a href={`tel:${listing.phone}`} className="btn btn-green" style={{ width: '100%', justifyContent: 'center', textDecoration: 'none', display: 'flex' }}>
                        Call seller
                      </a>
                    ) : (
                      <div className="btn" style={{ width: '100%', justifyContent: 'center', color: 'var(--ink3)', cursor: 'default' }}>Seller contact unavailable</div>
                    )}
                  </div>
                </div>

                <div className="panel">
                  <div className="panel-hd"><div className="panel-title">Vehicle notes</div></div>
                  <div className="panel-body">
                    <div style={{ fontSize: 14, color: 'var(--ink2)', lineHeight: 1.8 }}>
                      {listing.description || 'The seller has not added more notes yet.'}
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

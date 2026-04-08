import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import NavBar from '../components/NavBar'
import ProviderMap from '../components/ProviderMap'
import SiteFooter from '../components/SiteFooter'
import { supabase } from '../lib/supabase'
import { mergeProviderProfile } from '../lib/providerProfiles'
import styles from './AppShell.module.css'

const SEARCH_CATS = [
  ['all', 'All'],
  ['mechanic', 'Mechanics'],
  ['wash', 'Car Wash'],
  ['tire', 'Tires'],
  ['body', 'Bodywork'],
  ['glass', 'Glass'],
  ['tow', 'Towing'],
  ['parts', 'Parts'],
  ['parking', 'Parking'],
]

function slugify(name) {
  return String(name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

export default function ServiceProviders() {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useMemo(() => new URLSearchParams(location.search), [location.search])
  const [providers, setProviders] = useState([])
  const [provLoading, setProvLoading] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [searchCat, setSearchCat] = useState(params.get('cat') || 'all')

  useEffect(() => {
    setSearchCat(params.get('cat') || 'all')
  }, [params])

  useEffect(() => {
    async function fetchProviders() {
      setProvLoading(true)
      const { data } = await supabase
        .from('providers')
        .select('*')
        .order('rating', { ascending: false })
        .limit(100)

      setProviders((data || []).map((provider) => mergeProviderProfile(provider)).filter((provider) => provider.publicReady))
      setProvLoading(false)
    }

    fetchProviders()
  }, [])

  function openProviderProfile(provider, shouldBook = false) {
    const providerName = encodeURIComponent(provider.name)
    const bookingQuery = shouldBook ? '&book=1' : ''
    navigate(`/provider/${slugify(provider.name)}?n=${providerName}${bookingQuery}`)
  }

  const filtered = providers.filter((provider) => {
    const matchCat = searchCat === 'all' || provider.serviceCategories?.includes(searchCat)
    const q = searchQ.toLowerCase()
    const matchQ = !q
      || provider.name?.toLowerCase().includes(q)
      || provider.type_label?.toLowerCase().includes(q)
      || provider.address?.toLowerCase().includes(q)
      || provider.services?.some((service) => service.toLowerCase().includes(q))

    return matchCat && matchQ
  })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg, #f8f8f6)', fontFamily: 'var(--sans, sans-serif)' }}>
      <NavBar activePage="services" />

      <div className={styles.pageHdr} style={{ paddingTop: 28 }}>
        <div>
          <div className={styles.pageTitle}>Find a provider</div>
          <div className={styles.pageSub}>
            {provLoading ? 'Loading providers…' : `${filtered.length} result${filtered.length !== 1 ? 's' : ''} available`}
          </div>
        </div>
      </div>

      <div className={styles.pad}>
        <div className={styles.providerExplorer}>
          <div className={styles.providerSidebar}>
            <div className={styles.providerSidebarCard}>
              <div className={styles.providerSidebarSection}>
                <div className={styles.providerSidebarEyebrow}>Provider finder</div>
                <div className={styles.providerSidebarTitle}>Search near you</div>
                <div className={styles.providerSidebarSub}>
                  Search by service or neighborhood, then use the map to zoom in on the providers that fit your need.
                </div>
              </div>

              <div className={styles.providerSidebarSection}>
                <div className={styles.providerSearchBar}>
                  <input
                    className="form-input"
                    placeholder="Search for a service or neighborhood..."
                    value={searchQ}
                    onChange={(event) => setSearchQ(event.target.value)}
                    style={{ flex: 1, fontSize: 14 }}
                  />
                  {searchQ && <button className="btn" onClick={() => setSearchQ('')}>Clear</button>}
                </div>
              </div>

              <div className={styles.providerSidebarSection}>
                <div className={styles.providerSidebarEyebrow}>Categories</div>
                <div className={styles.providerTags}>
                  {SEARCH_CATS.map(([category, label]) => (
                    <button key={category} className={`btn ${searchCat === category ? 'btn-green' : ''}`} onClick={() => setSearchCat(category)}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.providerSidebarSection} style={{ paddingBottom: 12 }}>
                {!provLoading && filtered.length > 0 ? (
                  <ProviderMap providers={filtered} onSelect={(provider) => openProviderProfile(provider, true)} scrollWheelZoom />
                ) : (
                  <div style={{ height: 380, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink3)', fontSize: 12 }}>
                    {provLoading ? 'Loading map…' : 'No providers match these filters yet.'}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className={styles.providerResultsCard}>
            <div className={styles.providerResultsHeader}>
              <div>
                <div className={styles.providerResultsTitle}>Available providers</div>
                <div className={styles.providerResultsSub}>
                  Compare providers on the right while the map and filters stay available on the left.
                </div>
              </div>
            </div>

            {provLoading ? (
              <div style={{ textAlign: 'center', padding: 60 }}>
                <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 12px' }} />
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink3)' }}>Loading providers…</div>
              </div>
            ) : (
              <div className={styles.providerList}>
                {filtered.map((provider, index) => (
                  <div
                    key={provider.id || index}
                    className={styles.providerCard}
                    onClick={() => openProviderProfile(provider)}
                  >
                    <div className={styles.providerCardIcon}>
                      {provider.icon || '🔧'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className={styles.providerCardTitle}>{provider.name}</div>
                      <div className={styles.providerCardMeta}>
                        {provider.type_label} · {provider.address} · ★{provider.rating} ({provider.reviews} reviews) · {provider.phone}
                      </div>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {(provider.services || []).slice(0, 4).map((service) => (
                          <span key={service} className="badge badge-gray">{service}</span>
                        ))}
                      </div>
                    </div>
                    <div className={styles.providerCardActions}>
                      <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink3)' }}>{provider.distance || 'Montreal'}</span>
                      <span className={`badge ${provider.is_open ? 'badge-green' : 'badge-amber'}`}>{provider.is_open ? '● Open' : '● Closed'}</span>
                      <button
                        className="btn btn-green"
                        style={{ fontSize: 10, padding: '5px 12px' }}
                        onClick={(event) => {
                          event.stopPropagation()
                          openProviderProfile(provider, true)
                        }}
                      >
                        Book
                      </button>
                    </div>
                  </div>
                ))}

                {filtered.length === 0 && (
                  <div style={{ textAlign: 'center', color: 'var(--ink3)', padding: 60 }}>
                    <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
                    <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 16, marginBottom: 6 }}>No providers found</div>
                    <button className="btn" style={{ marginTop: 12 }} onClick={() => { setSearchQ(''); setSearchCat('all') }}>Reset filters</button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <SiteFooter portal="public" />
    </div>
  )
}

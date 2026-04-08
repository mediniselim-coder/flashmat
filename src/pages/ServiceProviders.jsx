import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import AppIcon from '../components/AppIcon'
import NavBar from '../components/NavBar'
import ProviderMap from '../components/ProviderMap'
import { supabase } from '../lib/supabase'
import { mergeProviderProfile } from '../lib/providerProfiles'
import styles from './AppShell.module.css'

const SEARCH_CATS = [
  ['all', 'All', 'TB'],
  ['mechanic', 'Mechanics', 'ME'],
  ['wash', 'Car Wash', 'LV'],
  ['tire', 'Tires', 'PN'],
  ['body', 'Bodywork', 'CR'],
  ['glass', 'Glass', 'VT'],
  ['tow', 'Towing', 'RW'],
  ['parts', 'Parts', 'PC'],
  ['parking', 'Parking', 'PK'],
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

function getProviderIconCode(provider) {
  const categories = provider.serviceCategories || []
  const typeLabel = String(provider.type_label || '').toLowerCase()

  if (categories.includes('mechanic') || typeLabel.includes('mechanic')) return 'ME'
  if (categories.includes('wash') || typeLabel.includes('wash') || typeLabel.includes('detailing')) return 'LV'
  if (categories.includes('tire') || typeLabel.includes('tire')) return 'PN'
  if (categories.includes('body') || typeLabel.includes('body') || typeLabel.includes('collision')) return 'CR'
  if (categories.includes('glass') || typeLabel.includes('glass') || typeLabel.includes('windshield')) return 'VT'
  if (categories.includes('tow') || typeLabel.includes('tow')) return 'RW'
  if (categories.includes('parts') || typeLabel.includes('part')) return 'PC'
  if (categories.includes('parking') || typeLabel.includes('parking')) return 'PK'

  return 'SV'
}

function getProviderDistance(index, provider) {
  if (provider.distance) return provider.distance
  const base = 1.4 + index * 1.3
  return `${base.toFixed(1)} km`
}

export default function ServiceProviders() {
  const navigate = useNavigate()
  const location = useLocation()
  const params = useMemo(() => new URLSearchParams(location.search), [location.search])
  const [providers, setProviders] = useState([])
  const [provLoading, setProvLoading] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [searchCat, setSearchCat] = useState(params.get('cat') || 'all')
  const [sortBy, setSortBy] = useState('recommended')

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

  const filtered = useMemo(() => {
    const visible = providers.filter((provider) => {
      const matchCat = searchCat === 'all' || provider.serviceCategories?.includes(searchCat)
      const q = searchQ.toLowerCase()
      const matchQ = !q
        || provider.name?.toLowerCase().includes(q)
        || provider.type_label?.toLowerCase().includes(q)
        || provider.address?.toLowerCase().includes(q)
        || provider.services?.some((service) => service.toLowerCase().includes(q))

      return matchCat && matchQ
    })

    return [...visible].sort((left, right) => {
      if (sortBy === 'rating') return (right.rating || 0) - (left.rating || 0)
      if (sortBy === 'name') return String(left.name || '').localeCompare(String(right.name || ''))
      return (right.rating || 0) - (left.rating || 0)
    })
  }, [providers, searchCat, searchQ, sortBy])

  return (
    <div style={{ height: '100vh', background: 'var(--bg, #f8f8f6)', fontFamily: 'var(--sans, sans-serif)', overflow: 'hidden' }}>
      <NavBar activePage="services" />

      <div className={styles.pad} style={{ padding: '18px 22px 20px', height: 'calc(100vh - 74px)', overflow: 'hidden' }}>
        <div className={styles.providerExplorerModern}>
          <div className={styles.providerFinderColumn}>
            <div className={styles.providerSearchHero}>
              <div className={styles.providerSidebarTitle}>Find a provider</div>
              <div className={styles.providerSidebarSub}>
                Search mechanics, car wash, parts, or a neighborhood, then compare the best local providers before you book.
              </div>

              <div className={styles.providerHeroSearchBar}>
                <span className={styles.providerHeroSearchIcon}>
                  <AppIcon code="SV" size={18} />
                </span>
                <input
                  className={`form-input ${styles.providerHeroInput}`}
                  placeholder="Search mechanics, car wash, or location..."
                  value={searchQ}
                  onChange={(event) => setSearchQ(event.target.value)}
                />
                {searchQ && (
                  <button className="btn" onClick={() => setSearchQ('')}>
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className={styles.providerFinderBody}>
              <aside className={styles.providerFilterRail}>
                <div className={styles.providerFilterTitle}>
                  <AppIcon code="TB" size={16} />
                  <span>Filters</span>
                </div>

                <div className={styles.providerFilterList}>
                  {SEARCH_CATS.filter(([category]) => category !== 'all').map(([category, label, icon]) => (
                    <button
                      key={category}
                      className={`${styles.providerFilterItem} ${searchCat === category ? styles.providerFilterItemActive : ''}`}
                      onClick={() => setSearchCat(category)}
                    >
                      <span className={styles.providerFilterItemIcon}>
                        <AppIcon code={icon} size={16} />
                      </span>
                      <span>{label}</span>
                    </button>
                  ))}
                </div>

                <button
                  className={`${styles.providerFilterItem} ${searchCat === 'all' ? styles.providerFilterItemActive : ''}`}
                  onClick={() => setSearchCat('all')}
                >
                  <span className={styles.providerFilterItemIcon}>
                    <AppIcon code="TB" size={16} />
                  </span>
                  <span>All services</span>
                </button>
              </aside>

              <section className={styles.providerListingPane}>
                <div className={styles.providerResultsHeaderModern}>
                  <div>
                    <div className={styles.providerResultsTitleModern}>
                      Showing {provLoading ? 'providers...' : `${filtered.length} provider${filtered.length !== 1 ? 's' : ''}`}
                    </div>
                    <div className={styles.providerResultsSubModern}>
                      Refine by category, compare ratings, then open a profile or book directly.
                    </div>
                  </div>

                  <label className={styles.providerSort}>
                    <span>Sort</span>
                    <select
                      className={styles.providerSortSelect}
                      value={sortBy}
                      onChange={(event) => setSortBy(event.target.value)}
                    >
                      <option value="recommended">Recommended</option>
                      <option value="rating">Top rated</option>
                      <option value="name">Name</option>
                    </select>
                  </label>
                </div>

                {provLoading ? (
                  <div style={{ textAlign: 'center', padding: 60 }}>
                    <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 12px' }} />
                    <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink3)' }}>Loading providers...</div>
                  </div>
                ) : (
                  <div className={styles.providerListModern}>
                    {filtered.map((provider, index) => (
                      <div
                        key={provider.id || index}
                        className={styles.providerCardModern}
                        onClick={() => openProviderProfile(provider)}
                      >
                        {index === 0 && sortBy === 'recommended' ? (
                          <div className={styles.providerRecommendedBadge}>Recommended</div>
                        ) : null}

                        <div className={styles.providerCardTop}>
                          <div className={styles.providerCardIdentity}>
                            <div className={styles.providerCardIconModern}>
                              <AppIcon code={getProviderIconCode(provider)} size={28} />
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div className={styles.providerCardTitleModern}>{provider.name}</div>
                              <div className={styles.providerCardTypePill}>{provider.type_label}</div>
                            </div>
                          </div>
                          <div className={styles.providerCardLocation}>{provider.distance || 'Montreal'}</div>
                        </div>

                        <div className={styles.providerCardRatingRow}>
                          <span className={styles.providerStars}>★★★★★</span>
                          <span>{getProviderDistance(index, provider)}</span>
                          <span>•</span>
                          <span>{provider.address}</span>
                        </div>

                        <div className={styles.providerCardServices}>
                          {(provider.services || []).slice(0, 4).map((service) => (
                            <span key={service} className={styles.providerServicePill}>{service}</span>
                          ))}
                        </div>

                        <div className={styles.providerCardFooter}>
                          <div className={styles.providerCardContact}>
                            <AppIcon code="CT" size={15} />
                            <span>{provider.phone || 'Phone available on profile'}</span>
                          </div>

                          <div className={styles.providerCardButtons}>
                            <button
                              className="btn"
                              onClick={(event) => {
                                event.stopPropagation()
                                openProviderProfile(provider, false)
                              }}
                            >
                              View
                            </button>
                            <button
                              className="btn btn-green"
                              onClick={(event) => {
                                event.stopPropagation()
                                openProviderProfile(provider, true)
                              }}
                            >
                              Book
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {filtered.length === 0 && (
                      <div className={styles.providerEmptyState}>
                        <div className={styles.providerEmptyIcon}>
                          <AppIcon code="SV" size={26} />
                        </div>
                        <div className={styles.providerEmptyTitle}>No providers found</div>
                        <div className={styles.providerEmptyText}>
                          Try another neighborhood, service type, or reset the current filters.
                        </div>
                        <button className="btn" style={{ marginTop: 12 }} onClick={() => { setSearchQ(''); setSearchCat('all') }}>
                          Reset filters
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </section>
            </div>
          </div>

          <div className={styles.providerMapColumnModern}>
            <div className={styles.providerMapCardModern}>
              {!provLoading && filtered.length > 0 ? (
                <ProviderMap
                  providers={filtered}
                  onSelect={(provider) => openProviderProfile(provider, true)}
                  scrollWheelZoom
                  height="100%"
                />
              ) : (
                <div className={styles.providerMapEmpty}>
                  {provLoading ? 'Loading map...' : 'No providers match these filters yet.'}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

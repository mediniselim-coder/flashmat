import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import NavBar from '../components/NavBar'
import SiteFooter from '../components/SiteFooter'
import { useAuth } from '../hooks/useAuth'
import { getMarketplaceListingPath, normalizeMarketplaceListing } from '../lib/marketplace'
import { getRoleLabel } from '../lib/roles'
import { fetchProviders } from '../lib/providerProfiles'
import { supabase } from '../lib/supabase'

const LEFT_SHORTCUTS = [
  { label: 'Services', to: '/services' },
  { label: 'Providers', to: '/providers' },
  { label: 'Marketplace', to: '/marketplace' },
  { label: 'FlashFix Urgence', to: '/urgence' },
  { label: 'Docteur Automobile', to: '/doctor' },
]

const FEED_FILTERS = [
  ['all', 'Tout'],
  ['vehicle', 'Vehicules'],
  ['parts', 'Pieces'],
  ['shop', 'Shop'],
]

function timeAgo(ts) {
  const diff = (Date.now() - new Date(ts)) / 1000
  if (!Number.isFinite(diff)) return 'recent'
  if (diff < 3600) return `${Math.max(1, Math.floor(diff / 60))} min`
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`
  return `${Math.floor(diff / 86400)} j`
}

function getFeedMeta(listing) {
  if (listing.listing_type === 'vehicle') {
    const vehicle = listing.vehicle_snapshot || {}
    const label = [vehicle.make, vehicle.model, vehicle.year].filter(Boolean).join(' ') || listing.title
    return {
      badge: 'Vehicule a vendre',
      title: label,
      body: listing.description || 'Nouveau vehicule visible dans la communaute FlashMat.',
      cta: 'Voir le vehicule',
      route: listing.vehicle_public_path || '/marketplace',
    }
  }

  if (listing.listing_type === 'parts') {
    return {
      badge: 'Pieces et inventaire',
      title: listing.title,
      body: listing.description || 'Nouvelle piece ou offre publiee dans le reseau FlashMat.',
      cta: 'Voir l annonce',
      route: getMarketplaceListingPath(listing),
    }
  }

  return {
    badge: 'Shop update',
    title: listing.title,
    body: listing.description || 'Nouvel item ou accessoire partage dans FlashMat Marketplace.',
    cta: 'Voir l annonce',
    route: getMarketplaceListingPath(listing),
  }
}

function getAvatarLabel(value) {
  return String(value || 'F').slice(0, 1).toUpperCase()
}

export default function Community() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [feedListings, setFeedListings] = useState([])
  const [providers, setProviders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function loadCommunity() {
      setLoading(true)
      try {
        const [{ data: marketplaceData }, providerData] = await Promise.all([
          supabase.from('marketplace').select('*').eq('is_active', true).order('created_at', { ascending: false }).limit(16),
          fetchProviders(),
        ])

        if (cancelled) return
        setFeedListings((marketplaceData || []).map(normalizeMarketplaceListing))
        setProviders((providerData || []).slice(0, 6))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadCommunity()
    return () => { cancelled = true }
  }, [])

  const filteredFeed = useMemo(() => {
    const query = String(search || '').trim().toLowerCase()
    return feedListings.filter((item) => {
      const matchesFilter = filter === 'all' || item.listing_type === filter
      if (!matchesFilter) return false
      if (!query) return true
      const haystack = [
        item.title,
        item.description,
        item.category,
        item.city,
        item.seller_name,
        item.vehicle_snapshot?.make,
        item.vehicle_snapshot?.model,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      return haystack.includes(query)
    })
  }, [feedListings, filter, search])

  const topProviders = providers.slice(0, 4)
  const highlightedListings = feedListings.slice(0, 3)
  const viewerName = profile?.full_name || user?.email?.split('@')[0] || 'FlashMat'

  return (
    <div style={styles.page}>
      <NavBar activePage="community" />

      <style>{`
        @media (max-width: 1180px) {
          .community-shell {
            grid-template-columns: 250px minmax(0, 1fr) !important;
          }
          .community-right {
            display: none !important;
          }
        }

        @media (max-width: 860px) {
          .community-shell {
            grid-template-columns: minmax(0, 1fr) !important;
            padding-left: 14px !important;
            padding-right: 14px !important;
          }
          .community-left {
            display: none !important;
          }
          .community-main {
            max-width: 100% !important;
          }
          .community-composer-row {
            flex-direction: column !important;
            align-items: stretch !important;
          }
        }

        @media (max-width: 640px) {
          .community-shell {
            padding-top: 16px !important;
          }
          .community-feed-card {
            border-radius: 18px !important;
          }
          .community-feed-media {
            height: 220px !important;
          }
          .community-hero-title {
            font-size: 30px !important;
          }
          .community-actions {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <main className="community-shell" style={styles.shell}>
        <aside className="community-left" style={styles.leftRail}>
          <div style={styles.leftCard}>
            <div style={styles.userRow}>
              <div style={styles.userAvatar}>
                {profile?.avatar_url ? <img src={profile.avatar_url} alt={viewerName} style={styles.userAvatarImage} /> : getAvatarLabel(viewerName)}
              </div>
              <div>
                <div style={styles.userName}>{viewerName}</div>
                <div style={styles.userRole}>{getRoleLabel(profile?.role)} · montreal</div>
              </div>
            </div>
            <div style={styles.shortcutStack}>
              {LEFT_SHORTCUTS.map((item) => (
                <button key={item.label} type="button" style={styles.shortcutButton} onClick={() => navigate(item.to)}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div style={styles.leftCard}>
            <div style={styles.railTitle}>A suivre</div>
            <div style={styles.railText}>
              Toute nouvelle annonce visible sur FlashMat peut remonter ici: vehicules en vente, pieces, nouveaux items shop et activite providers.
            </div>
          </div>
        </aside>

        <section className="community-main" style={styles.mainColumn}>
          <div style={styles.composerCard}>
            <div style={styles.communityTopBar}>
              <div style={styles.communitySearchBar}>
                <span style={styles.communitySearchIcon}>⌕</span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Rechercher une annonce, un vehicule, une piece ou un provider..."
                  style={styles.communitySearchInput}
                />
              </div>
              <div style={styles.communityTagRow}>
                {FEED_FILTERS.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFilter(value)}
                    style={filter === value ? styles.filterButtonActive : styles.filterButton}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {loading ? (
            <div style={styles.loadingCard}>
              <div className="spinner" style={{ width: 30, height: 30, margin: '0 auto 12px' }} />
              <div style={styles.loadingText}>Chargement du fil communautaire...</div>
            </div>
          ) : filteredFeed.length === 0 ? (
            <div style={styles.loadingCard}>
              <div style={styles.loadingTitle}>Aucune publication pour ce filtre.</div>
              <div style={styles.loadingText}>Le feed se remplit automatiquement avec les nouvelles annonces FlashMat.</div>
            </div>
          ) : (
            <div style={styles.feedStack}>
              {filteredFeed.map((listing) => {
                const meta = getFeedMeta(listing)
                return (
                  <article key={listing.id} className="community-feed-card" style={styles.feedCard}>
                    <div style={styles.feedHeader}>
                      <div style={styles.feedIdentity}>
                        <div style={styles.feedAvatar}>
                          {listing.image_url ? <img src={listing.image_url} alt={listing.seller_name} style={styles.userAvatarImage} /> : getAvatarLabel(listing.seller_name)}
                        </div>
                        <div>
                          <div style={styles.feedAuthor}>{listing.seller_name}</div>
                          <div style={styles.feedMeta}>{meta.badge} · {listing.city} · {timeAgo(listing.created_at)}</div>
                        </div>
                      </div>
                      <span style={styles.feedCategory}>{listing.category}</span>
                    </div>

                    <div style={styles.feedBody}>
                      <h2 style={styles.feedTitle}>{meta.title}</h2>
                      <p style={styles.feedText}>{meta.body}</p>
                    </div>

                    {(listing.image_url || listing.vehicle_snapshot?.imageUrl) ? (
                      <div className="community-feed-media" style={styles.feedMediaWrap}>
                        <img
                          src={listing.image_url || listing.vehicle_snapshot?.imageUrl}
                          alt={meta.title}
                          style={styles.feedMedia}
                        />
                      </div>
                    ) : null}

                    <div style={styles.feedFooter}>
                      <div style={styles.feedPrice}>
                        {listing.price != null ? `$${Number(listing.price).toFixed(0)}` : 'Prix sur demande'}
                      </div>
                      <button type="button" style={styles.feedCta} onClick={() => navigate(meta.route)}>
                        {meta.cta}
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>
          )}
        </section>

        <aside className="community-right" style={styles.rightRail}>
          <div style={styles.rightCard}>
            <div style={styles.railTitle}>Providers a surveiller</div>
            <div style={styles.providerStack}>
              {topProviders.map((provider) => (
                <button key={provider.id} type="button" style={styles.providerRow} onClick={() => navigate(`/provider/${provider.slug || ''}${provider.name ? `?n=${encodeURIComponent(provider.name)}` : ''}`)}>
                  <div style={styles.providerAvatar}>
                    {provider.logoImageUrl ? <img src={provider.logoImageUrl} alt={provider.name} style={styles.userAvatarImage} /> : getAvatarLabel(provider.name)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={styles.providerName}>{provider.name}</div>
                    <div style={styles.providerMeta}>{provider.type_label || 'Provider'} · {Number(provider.rating || 0).toFixed(1)}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div style={styles.rightCard}>
            <div style={styles.railTitle}>Tendance FlashMat</div>
            <div style={styles.trendStack}>
              {highlightedListings.map((listing) => (
                <div key={listing.id} style={styles.trendItem}>
                  <div style={styles.trendTitle}>{listing.title}</div>
                  <div style={styles.trendMeta}>{listing.category} · {timeAgo(listing.created_at)}</div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </main>

      <SiteFooter portal="public" />
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #edf4fb 0%, #f5f9ff 45%, #eef4fb 100%)',
    fontFamily: 'var(--font)',
    color: 'var(--ink)',
  },
  shell: {
    width: '100%',
    maxWidth: 'none',
    margin: 0,
    padding: '24px 24px 0',
    display: 'grid',
    gridTemplateColumns: 'minmax(230px, 290px) minmax(640px, 760px) minmax(250px, 320px)',
    justifyContent: 'space-between',
    gap: 24,
    alignItems: 'start',
  },
  leftRail: {
    position: 'sticky',
    top: 86,
    display: 'grid',
    gap: 14,
  },
  mainColumn: {
    maxWidth: 760,
    width: '100%',
    margin: '0 auto',
  },
  rightRail: {
    position: 'sticky',
    top: 86,
    display: 'grid',
    gap: 14,
  },
  leftCard: {
    background: 'rgba(255,255,255,.92)',
    border: '1px solid rgba(120,171,218,0.16)',
    borderRadius: 22,
    boxShadow: '0 16px 36px rgba(19,54,92,0.06)',
    padding: 16,
  },
  rightCard: {
    background: 'rgba(255,255,255,.92)',
    border: '1px solid rgba(120,171,218,0.16)',
    borderRadius: 22,
    boxShadow: '0 16px 36px rgba(19,54,92,0.06)',
    padding: 18,
  },
  userRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  userAvatar: {
    width: 44,
    height: 44,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #0e2b4a 0%, #2f7de1 100%)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--display)',
    fontWeight: 800,
    overflow: 'hidden',
    flexShrink: 0,
  },
  userAvatarImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  userName: {
    fontFamily: 'var(--display)',
    fontSize: 18,
    fontWeight: 800,
    letterSpacing: '-0.04em',
    color: '#102743',
  },
  userRole: {
    fontSize: 11,
    color: 'var(--ink3)',
    fontFamily: 'var(--mono)',
  },
  shortcutStack: {
    display: 'grid',
    gap: 6,
  },
  shortcutButton: {
    border: 'none',
    background: 'transparent',
    textAlign: 'left',
    padding: '10px 12px',
    borderRadius: 12,
    color: '#17314a',
    fontSize: 14,
    fontWeight: 700,
  },
  railTitle: {
    fontFamily: 'var(--display)',
    fontSize: 20,
    fontWeight: 800,
    letterSpacing: '-0.04em',
    color: '#11253e',
    marginBottom: 10,
  },
  railText: {
    margin: 0,
    fontSize: 13,
    lineHeight: 1.75,
    color: 'var(--ink2)',
  },
  composerCard: {
    background: 'rgba(255,255,255,.94)',
    border: '1px solid rgba(120,171,218,0.16)',
    borderRadius: 22,
    boxShadow: '0 16px 34px rgba(19,54,92,0.05)',
    padding: 16,
    marginBottom: 14,
  },
  communityTopBar: {
    display: 'grid',
    gap: 12,
  },
  communitySearchBar: {
    display: 'grid',
    gridTemplateColumns: '18px minmax(0, 1fr)',
    gap: 10,
    alignItems: 'center',
    minHeight: 48,
    borderRadius: 999,
    background: '#f1f6fd',
    border: '1px solid rgba(120,171,218,0.16)',
    padding: '0 16px',
  },
  communitySearchIcon: {
    fontSize: 16,
    color: '#7d93ab',
  },
  communitySearchInput: {
    width: '100%',
    border: 'none',
    outline: 'none',
    background: 'transparent',
    color: '#17314a',
    fontSize: 14,
    fontWeight: 600,
    fontFamily: 'var(--font)',
  },
  communityTagRow: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap',
  },
  filterButton: {
    border: '1px solid rgba(120,171,218,0.16)',
    background: 'rgba(255,255,255,.9)',
    color: '#42607d',
    borderRadius: 999,
    padding: '9px 14px',
    fontSize: 12,
    fontWeight: 700,
  },
  filterButtonActive: {
    border: '1px solid transparent',
    background: 'linear-gradient(135deg, #0e2b4a 0%, #154779 100%)',
    color: '#fff',
    borderRadius: 999,
    padding: '9px 14px',
    fontSize: 12,
    fontWeight: 800,
  },
  loadingCard: {
    background: 'rgba(255,255,255,.92)',
    border: '1px solid rgba(120,171,218,0.16)',
    borderRadius: 22,
    boxShadow: '0 16px 34px rgba(19,54,92,0.05)',
    padding: '48px 24px',
    textAlign: 'center',
  },
  loadingTitle: {
    fontFamily: 'var(--display)',
    fontSize: 24,
    fontWeight: 800,
    letterSpacing: '-0.04em',
    color: '#102743',
    marginBottom: 8,
  },
  loadingText: {
    fontSize: 13,
    color: 'var(--ink3)',
  },
  feedStack: {
    display: 'grid',
    gap: 14,
  },
  feedCard: {
    background: 'rgba(255,255,255,.95)',
    border: '1px solid rgba(120,171,218,0.16)',
    borderRadius: 22,
    boxShadow: '0 16px 34px rgba(19,54,92,0.05)',
    overflow: 'hidden',
  },
  feedHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '18px 18px 0',
    flexWrap: 'wrap',
  },
  feedIdentity: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  feedAvatar: {
    width: 46,
    height: 46,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #0e2b4a 0%, #2f7de1 100%)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--display)',
    fontWeight: 800,
    overflow: 'hidden',
    flexShrink: 0,
  },
  feedAuthor: {
    fontSize: 15,
    fontWeight: 800,
    color: '#102743',
  },
  feedMeta: {
    fontSize: 11,
    color: 'var(--ink3)',
    fontFamily: 'var(--mono)',
  },
  feedCategory: {
    padding: '7px 10px',
    borderRadius: 999,
    background: 'rgba(59,159,216,0.08)',
    color: '#1d6da1',
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: '.1em',
    textTransform: 'uppercase',
  },
  feedBody: {
    padding: '16px 18px 14px',
  },
  feedTitle: {
    margin: '0 0 8px',
    fontFamily: 'var(--display)',
    fontSize: 30,
    lineHeight: 1.02,
    letterSpacing: '-0.05em',
    color: '#102743',
  },
  feedText: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.75,
    color: 'var(--ink2)',
  },
  feedMediaWrap: {
    height: 340,
    background: '#dbe7f6',
    overflow: 'hidden',
  },
  feedMedia: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'block',
  },
  feedFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '16px 18px 18px',
    flexWrap: 'wrap',
  },
  feedPrice: {
    fontFamily: 'var(--display)',
    fontSize: 30,
    fontWeight: 800,
    letterSpacing: '-0.05em',
    color: 'var(--green)',
  },
  feedCta: {
    border: 'none',
    borderRadius: 999,
    padding: '12px 16px',
    background: 'linear-gradient(135deg, #0e2b4a 0%, #154779 100%)',
    color: '#fff',
    fontSize: 13,
    fontWeight: 800,
  },
  providerStack: {
    display: 'grid',
    gap: 10,
  },
  providerRow: {
    display: 'grid',
    gridTemplateColumns: '42px minmax(0, 1fr)',
    gap: 10,
    alignItems: 'center',
    width: '100%',
    border: '1px solid rgba(120,171,218,0.14)',
    background: '#fff',
    borderRadius: 16,
    padding: 10,
    textAlign: 'left',
  },
  providerAvatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    background: 'linear-gradient(135deg, #0e2b4a 0%, #2f7de1 100%)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: 800,
    overflow: 'hidden',
  },
  providerName: {
    fontSize: 14,
    fontWeight: 800,
    color: '#102743',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  providerMeta: {
    fontSize: 11,
    color: 'var(--ink3)',
    fontFamily: 'var(--mono)',
  },
  trendStack: {
    display: 'grid',
    gap: 10,
  },
  trendItem: {
    padding: '10px 0',
    borderBottom: '1px solid rgba(120,171,218,0.12)',
  },
  trendTitle: {
    fontSize: 14,
    fontWeight: 800,
    color: '#102743',
    marginBottom: 4,
  },
  trendMeta: {
    fontSize: 11,
    color: 'var(--ink3)',
    fontFamily: 'var(--mono)',
  },
}

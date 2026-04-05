import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import NavBar from '../components/NavBar'
import ProviderMap from '../components/ProviderMap'
import SiteFooter from '../components/SiteFooter'
import { supabase } from '../lib/supabase'
import { mergeProviderProfile } from '../lib/providerProfiles'
import styles from './AppShell.module.css'

const SEARCH_CATS = [
  ['all', 'Tous'],
  ['mechanic', '🔧 Mécanique'],
  ['wash', '🚿 Lave-auto'],
  ['tire', '🔩 Pneus'],
  ['body', '🎨 Carrosserie'],
  ['glass', '🪟 Vitres'],
  ['tow', '🚛 Remorquage'],
  ['parts', '⚙️ Pièces'],
  ['parking', '🅿️ Parking'],
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
          <div className={styles.pageTitle}>Trouver un service</div>
          <div className={styles.pageSub}>
            {provLoading ? 'Chargement…' : `${filtered.length} fournisseur${filtered.length !== 1 ? 's' : ''} trouvé${filtered.length !== 1 ? 's' : ''}`}
          </div>
        </div>
      </div>

      <div className={styles.pad}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            className="form-input"
            placeholder="🔍  Rechercher un service, quartier…"
            value={searchQ}
            onChange={(event) => setSearchQ(event.target.value)}
            style={{ flex: 1, fontSize: 14 }}
          />
          {searchQ && <button className="btn" onClick={() => setSearchQ('')}>✕</button>}
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          {SEARCH_CATS.map(([category, label]) => (
            <button key={category} className={`btn ${searchCat === category ? 'btn-green' : ''}`} onClick={() => setSearchCat(category)}>
              {label}
            </button>
          ))}
        </div>

        {!provLoading && filtered.length > 0 && (
          <ProviderMap providers={filtered} onSelect={(provider) => openProviderProfile(provider, true)} />
        )}

        {provLoading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <div className="spinner" style={{ width: 32, height: 32, margin: '0 auto 12px' }} />
            <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink3)' }}>Chargement des fournisseurs…</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map((provider, index) => (
              <div
                key={provider.id || index}
                style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, display: 'flex', gap: 12, alignItems: 'flex-start', cursor: 'pointer', boxShadow: 'var(--shadow)' }}
                onClick={() => openProviderProfile(provider)}
              >
                <div style={{ width: 48, height: 48, borderRadius: 10, background: 'var(--bg3)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>
                  {provider.icon || '🔧'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{provider.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink2)', marginBottom: 6 }}>
                    {provider.type_label} · {provider.address} · ⭐{provider.rating} ({provider.reviews} avis) · {provider.phone}
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {(provider.services || []).slice(0, 4).map((service) => <span key={service} className="badge badge-gray">{service}</span>)}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end', flexShrink: 0 }}>
                  <span style={{ fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--ink3)' }}>{provider.distance}</span>
                  <span className={`badge ${provider.is_open ? 'badge-green' : 'badge-amber'}`}>{provider.is_open ? '● Ouvert' : '● Fermé'}</span>
                  <button
                    className="btn btn-green"
                    style={{ fontSize: 10, padding: '5px 12px' }}
                    onClick={(event) => {
                      event.stopPropagation()
                      openProviderProfile(provider, true)
                    }}
                  >
                    Réserver
                  </button>
                </div>
              </div>
            ))}

            {filtered.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--ink3)', padding: 60 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
                <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 16, marginBottom: 6 }}>Aucun résultat</div>
                <button className="btn" style={{ marginTop: 12 }} onClick={() => { setSearchQ(''); setSearchCat('all') }}>Réinitialiser</button>
              </div>
            )}
          </div>
        )}
      </div>

      <SiteFooter portal="public" />
    </div>
  )
}

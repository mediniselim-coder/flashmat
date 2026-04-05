import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import NavBar from '../components/NavBar'
import { supabase } from '../lib/supabase'

const CATEGORY_LABELS = {
  all: 'Tous les fournisseurs',
  mechanic: 'Mecanique generale',
  wash: 'Lavage auto',
  tire: 'Pneus et jantes',
  body: 'Carrosserie',
  glass: 'Vitres auto',
  tow: 'Remorquage',
  parts: 'Pieces auto',
  parking: 'Stationnement',
  junk: 'Casses auto',
  tuning: 'Performance',
}

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
  const initialCat = params.get('cat') || 'all'
  const [category, setCategory] = useState(initialCat)
  const [providers, setProviders] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')

  useEffect(() => {
    setCategory(initialCat)
  }, [initialCat])

  useEffect(() => {
    async function fetchProviders() {
      setLoading(true)
      const { data } = await supabase
        .from('providers_list')
        .select('*')
        .order('rating', { ascending: false })
        .limit(100)

      setProviders(Array.isArray(data) ? data : [])
      setLoading(false)
    }

    fetchProviders()
  }, [])

  const filtered = providers.filter((provider) => {
    const matchesCategory = category === 'all' || provider.type === category
    const haystack = `${provider.name || ''} ${provider.type_label || ''} ${provider.address || ''}`.toLowerCase()
    const matchesQuery = !query.trim() || haystack.includes(query.toLowerCase())
    return matchesCategory && matchesQuery
  })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg, #f8f8f6)', fontFamily: 'var(--sans, sans-serif)' }}>
      <NavBar activePage="services" />

      <section style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#fff', padding: '64px 32px 44px' }}>
        <div style={{ maxWidth: 1220, margin: '0 auto' }}>
          <div style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: '#22c55e', marginBottom: 12, fontWeight: 700 }}>Fournisseurs FlashMat</div>
          <h1 style={{ fontSize: 42, lineHeight: 1.1, margin: '0 0 12px', fontWeight: 800 }}>
            Voir les providers
            <br />
            avant de reserver
          </h1>
          <p style={{ color: '#cbd5e1', fontSize: 16, lineHeight: 1.75, margin: 0, maxWidth: 760 }}>
            Comparez les ateliers et services disponibles librement. La connexion est demandee seulement quand vous cliquez sur reserver chez un provider.
          </p>
        </div>
      </section>

      <section style={{ maxWidth: 1220, margin: '0 auto', padding: '24px 32px 56px' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setCategory(key)}
              style={{
                padding: '10px 14px',
                borderRadius: 999,
                border: category === key ? '2px solid #22c55e' : '1px solid #dbe2ea',
                background: category === key ? '#f0fdf4' : '#fff',
                color: '#111827',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 700,
              }}
            >
              {label}
            </button>
          ))}
        </div>

        <div style={{ marginBottom: 20 }}>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher un provider, un quartier ou un service..."
            style={{ width: '100%', padding: '14px 18px', borderRadius: 14, border: '1px solid #dbe2ea', boxSizing: 'border-box', fontSize: 14 }}
          />
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>Chargement des providers...</div>
        ) : filtered.length === 0 ? (
          <div style={{ background: '#fff', borderRadius: 20, padding: 28, border: '1px solid #e5e7eb', textAlign: 'center', color: '#64748b' }}>
            Aucun provider trouve pour ce filtre.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: 18 }}>
            {filtered.map((provider) => {
              const slug = slugify(provider.name)
              return (
                <div key={provider.id || provider.name} style={{ background: '#fff', borderRadius: 20, padding: 22, border: '1px solid #e5e7eb', boxShadow: '0 10px 26px rgba(15,23,42,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
                    <div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: '#111827', marginBottom: 4 }}>{provider.name}</div>
                      <div style={{ fontSize: 13, color: '#22c55e', fontWeight: 700 }}>{provider.type_label || 'Service auto'}</div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#111827' }}>{provider.rating || '4.7'} ★</div>
                  </div>

                  <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.7, marginBottom: 14 }}>
                    {provider.address || 'Montreal'}
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                    <span style={{ borderRadius: 999, padding: '6px 10px', background: '#eff6ff', color: '#2563eb', fontSize: 12, fontWeight: 700 }}>
                      {provider.is_open === true || provider.is_open === 'true' ? 'Ouvert' : 'Horaire a verifier'}
                    </span>
                    <span style={{ borderRadius: 999, padding: '6px 10px', background: '#f8fafc', color: '#475569', fontSize: 12, fontWeight: 700 }}>
                      {provider.phone || 'Contact disponible'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => navigate(`/provider/${slug}?n=${encodeURIComponent(provider.name)}`)}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: 'none', background: '#22c55e', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}
                  >
                    Voir le profil →
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}

import { useEffect, useMemo, useRef, useState } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import L from 'leaflet'
import 'leaflet.markercluster'
import { geocodeAddress, hasValidCoords } from '../lib/googleMaps'

const DEFAULT_CENTER = [45.5017, -73.5673]

function hashString(value) {
  return String(value || '').split('').reduce((accumulator, char) => {
    return ((accumulator << 5) - accumulator + char.charCodeAt(0)) | 0
  }, 0)
}

function buildApproximateCoords(provider) {
  const hash = Math.abs(hashString(`${provider?.name || ''}|${provider?.address || ''}`))
  const latOffset = ((hash % 1000) / 1000 - 0.5) * 0.12
  const lngOffset = ((((hash / 1000) | 0) % 1000) / 1000 - 0.5) * 0.18
  return [
    Number((DEFAULT_CENTER[0] + latOffset).toFixed(6)),
    Number((DEFAULT_CENTER[1] + lngOffset).toFixed(6)),
  ]
}

function getProviderIconCode(provider) {
  const categories = provider.serviceCategories || []
  const typeLabel = String(provider.type_label || '').toLowerCase()

  if (categories.includes('mechanic') || typeLabel.includes('mechanic')) return 'mechanic'
  if (categories.includes('wash') || typeLabel.includes('wash') || typeLabel.includes('detailing')) return 'wash'
  if (categories.includes('tire') || typeLabel.includes('tire')) return 'tire'
  if (categories.includes('body') || typeLabel.includes('body') || typeLabel.includes('collision')) return 'body'
  if (categories.includes('glass') || typeLabel.includes('glass') || typeLabel.includes('windshield')) return 'glass'
  if (categories.includes('tow') || typeLabel.includes('tow')) return 'tow'
  if (categories.includes('parts') || typeLabel.includes('part')) return 'parts'
  if (categories.includes('parking') || typeLabel.includes('parking')) return 'parking'

  return 'service'
}

function ProviderGlyph({ code, size = 18, color = '#f8fbff' }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: '1.9',
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  }

  switch (code) {
    case 'mechanic':
      return (
        <svg {...common}>
          <path d="m14.5 6.5 3 3" />
          <path d="m5 19 6.5-6.5" />
          <path d="m3.5 14.5 6 6" />
          <path d="M13 4l7 7" />
        </svg>
      )
    case 'wash':
      return (
        <svg {...common}>
          <path d="M7 15a3 3 0 1 0 0 6" />
          <path d="M17 15a3 3 0 1 0 0 6" />
          <path d="M5 15h14" />
          <path d="m7 15 1.5-4h7L17 15" />
          <path d="M8 8c0-1.2.9-2.5 1.6-3.3.2-.2.6-.2.8 0C11.1 5.5 12 6.8 12 8" />
          <path d="M14 7c0-.9.7-1.9 1.2-2.5.2-.2.5-.2.7 0 .5.6 1.1 1.6 1.1 2.5" />
        </svg>
      )
    case 'tire':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="7" />
          <circle cx="12" cy="12" r="2.2" />
          <path d="M12 5v2.2" />
          <path d="M19 12h-2.2" />
          <path d="M12 19v-2.2" />
          <path d="M5 12h2.2" />
        </svg>
      )
    case 'body':
      return (
        <svg {...common}>
          <path d="M4 15.5h16" />
          <path d="m6 15.5 1.4-4h9.2L18 15.5" />
          <path d="M6 18a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
          <path d="M18 18a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z" />
          <path d="m9 11.5 1.6-2.5h2.8l1.6 2.5" />
        </svg>
      )
    case 'glass':
      return (
        <svg {...common}>
          <path d="M6 7h12l-1.2 10H7.2L6 7Z" />
          <path d="M8.5 4.5h7" />
          <path d="M9.5 11.5h5" />
        </svg>
      )
    case 'tow':
      return (
        <svg {...common}>
          <path d="M4 16h8" />
          <path d="m12 16 4-6h3" />
          <path d="M18 10v6" />
          <circle cx="7" cy="18" r="2" />
          <circle cx="18" cy="18" r="2" />
        </svg>
      )
    case 'parts':
      return (
        <svg {...common}>
          <path d="M12 3v5" />
          <path d="M12 16v5" />
          <path d="m4.2 7.3 4.3 2.5" />
          <path d="m15.5 14.2 4.3 2.5" />
          <path d="m4.2 16.7 4.3-2.5" />
          <path d="m15.5 9.8 4.3-2.5" />
          <circle cx="12" cy="12" r="3.2" />
        </svg>
      )
    case 'parking':
      return (
        <svg {...common}>
          <path d="M8 20V4h5.5a3.5 3.5 0 1 1 0 7H8" />
        </svg>
      )
    default:
      return (
        <svg {...common}>
          <path d="M12 4v16" />
          <path d="M5 11h14" />
          <circle cx="12" cy="12" r="8" />
        </svg>
      )
  }
}

function createMarkerIcon(provider) {
  const logoImageUrl = provider.logoImageUrl || provider.logo_url || provider.avatar_url || ''
  const iconMarkup = renderToStaticMarkup(<ProviderGlyph code={getProviderIconCode(provider)} size={18} />)
  const fallbackMarkup = `
    <div style="
      width:30px;
      height:30px;
      border-radius:50%;
      background:linear-gradient(135deg,#143252 0%,#2f72df 100%);
      display:flex;
      align-items:center;
      justify-content:center;
      box-shadow:inset 0 0 0 1px rgba(255,255,255,.14);
    ">${iconMarkup}</div>
  `

  const imageMarkup = logoImageUrl
    ? `<img src="${logoImageUrl}" alt="${String(provider.name || 'Provider').replace(/"/g, '&quot;')}" style="width:30px;height:30px;border-radius:50%;object-fit:cover;display:block;" />`
    : fallbackMarkup

  return L.divIcon({
    className: 'flashmat-provider-pin',
    html: `
      <div style="position:relative;width:42px;height:52px;display:flex;align-items:flex-start;justify-content:center;">
        <div style="
          width:38px;
          height:38px;
          border-radius:18px;
          background:#ffffff;
          border:1px solid rgba(20,50,82,.12);
          box-shadow:0 16px 28px rgba(14,40,66,.18);
          display:flex;
          align-items:center;
          justify-content:center;
          padding:4px;
        ">
          ${imageMarkup}
        </div>
        <div style="
          position:absolute;
          bottom:4px;
          width:14px;
          height:14px;
          background:#ffffff;
          border-left:1px solid rgba(20,50,82,.12);
          border-bottom:1px solid rgba(20,50,82,.12);
          transform:rotate(-45deg);
          border-bottom-left-radius:4px;
          box-shadow:4px 8px 12px rgba(14,40,66,.1);
        "></div>
      </div>
    `,
    iconSize: [42, 52],
    iconAnchor: [21, 48],
    popupAnchor: [0, -40],
  })
}

function getProviderKey(provider) {
  return String(provider?.id || provider?.name || '')
}

function MapViewportUpdater({ coordsList }) {
  const map = useMap()

  useEffect(() => {
    if (!coordsList.length) {
      map.setView(DEFAULT_CENTER, 11)
      return
    }

    if (coordsList.length === 1) {
      map.setView(coordsList[0], 14)
      return
    }

    const bounds = L.latLngBounds(coordsList)
    map.fitBounds(bounds, { padding: [42, 42] })
  }, [coordsList, map])

  return null
}

function VisibleProvidersTracker({ providers, onVisibleProvidersChange }) {
  const map = useMap()
  const onVisibleProvidersChangeRef = useRef(onVisibleProvidersChange)
  const lastVisibleKeysRef = useRef('')

  useEffect(() => {
    onVisibleProvidersChangeRef.current = onVisibleProvidersChange
  }, [onVisibleProvidersChange])

  useEffect(() => {
    if (!onVisibleProvidersChangeRef.current) return undefined

    function updateVisibleProviders() {
      const bounds = map.getBounds()
      const visibleProviders = providers.filter((provider) => {
        if (!Array.isArray(provider?.mapCoords) || provider.mapCoords.length !== 2) return false
        return bounds.contains(provider.mapCoords)
      })
      const nextVisibleKeys = visibleProviders.map((provider) => getProviderKey(provider)).join('|')
      if (nextVisibleKeys === lastVisibleKeysRef.current) return
      lastVisibleKeysRef.current = nextVisibleKeys
      onVisibleProvidersChangeRef.current?.(visibleProviders)
    }

    updateVisibleProviders()
    map.on('moveend zoomend', updateVisibleProviders)

    return () => {
      map.off('moveend zoomend', updateVisibleProviders)
    }
  }, [map, onVisibleProvidersChange, providers])

  return null
}

function ProviderPopupCard({ provider }) {
  const logoImageUrl = provider.logoImageUrl || provider.logo_url || provider.avatar_url || ''

  return (
    <div style={{ minWidth: 248, maxWidth: 272 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '46px minmax(0, 1fr)', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <div style={{ width: 46, height: 46, borderRadius: 16, overflow: 'hidden', background: '#edf5ff', border: '1px solid rgba(20,50,82,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {logoImageUrl ? (
            <img src={logoImageUrl} alt={provider.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: 34, height: 34, borderRadius: 14, background: 'linear-gradient(135deg, #143252 0%, #2f72df 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ProviderGlyph code={getProviderIconCode(provider)} size={18} />
            </div>
          )}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--display)', fontSize: 19, lineHeight: 1.02, letterSpacing: '-0.03em', fontWeight: 800, color: '#10253d', marginBottom: 4 }}>{provider.name}</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 999, background: 'rgba(59,159,216,0.08)', color: '#3b84ba', fontSize: 11, fontWeight: 700 }}>
            {provider.type_label || 'Provider'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 999, background: '#f6f9fd', color: '#47617b', fontSize: 11, fontWeight: 700 }}>
          <span style={{ color: '#f59e0b' }}>{'\u2605'}</span>
          <span>{Number(provider.rating || 0).toFixed(1)}</span>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 999, background: '#f6f9fd', color: '#47617b', fontSize: 11, fontWeight: 700 }}>
          {provider.reviews || 0} reviews
        </div>
      </div>

      <div style={{ fontSize: 12, lineHeight: 1.65, color: '#5b6f86', marginBottom: 4 }}>{provider.address}</div>
      <div style={{ fontSize: 12, lineHeight: 1.65, color: '#5b6f86', marginBottom: 14 }}>{provider.phone || 'Phone available on profile'}</div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.2fr)', gap: 10 }}>
        <button
          type="button"
          className="flashmat-popup-visit"
          data-provider-id={provider.id || provider.name}
          style={{
            width: '100%',
            border: '1px solid rgba(20,50,82,.12)',
            borderRadius: 12,
            padding: '11px 14px',
            background: '#f7fbff',
            color: '#143252',
            fontSize: 12,
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          Visit profile
        </button>
        <button
          type="button"
          className="flashmat-popup-cta"
          data-provider-id={provider.id || provider.name}
          style={{
            width: '100%',
            border: 'none',
            borderRadius: 12,
            padding: '11px 14px',
            background: 'linear-gradient(135deg, #143252 0%, #2b5fd7 100%)',
            color: '#fff',
            fontSize: 12,
            fontWeight: 800,
            boxShadow: '0 12px 24px rgba(20,50,82,.18)',
            cursor: 'pointer',
          }}
        >
          Book with FlashMat
        </button>
      </div>
    </div>
  )
}

function ClusteredProviderMarkers({ providers, selectedProviderId, onSelect, onBook, onVisitProfile }) {
  const map = useMap()
  const clusterGroupRef = useRef(null)
  const markersRef = useRef(new Map())
  const onSelectRef = useRef(onSelect)
  const onBookRef = useRef(onBook)
  const onVisitProfileRef = useRef(onVisitProfile)

  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

  useEffect(() => {
    onBookRef.current = onBook
  }, [onBook])

  useEffect(() => {
    onVisitProfileRef.current = onVisitProfile
  }, [onVisitProfile])

  useEffect(() => {
    const clusterGroup = L.markerClusterGroup({
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      zoomToBoundsOnClick: true,
      removeOutsideVisibleBounds: true,
      maxClusterRadius: 46,
      iconCreateFunction(cluster) {
        const count = cluster.getChildCount()
        return L.divIcon({
          className: 'flashmat-provider-cluster',
          html: `
            <div style="
              width:50px;
              height:50px;
              border-radius:25px;
              background:radial-gradient(circle at 30% 30%, rgba(111,190,255,.96), rgba(37,99,235,.95) 58%, rgba(20,50,82,.98) 100%);
              box-shadow:0 20px 34px rgba(20,50,82,.22), inset 0 0 0 1px rgba(255,255,255,.24);
              color:#ffffff;
              display:flex;
              align-items:center;
              justify-content:center;
              font-family:var(--display);
              font-size:16px;
              font-weight:800;
              letter-spacing:-0.03em;
            ">${count}</div>
          `,
          iconSize: [50, 50],
          iconAnchor: [25, 25],
        })
      },
    })

    clusterGroupRef.current = clusterGroup
    markersRef.current = new Map()

    providers.forEach((provider) => {
      const marker = L.marker(provider.mapCoords, { icon: createMarkerIcon(provider) })
      const popupMarkup = renderToStaticMarkup(<ProviderPopupCard provider={provider} />)

      marker.bindPopup(popupMarkup, {
        closeButton: true,
        minWidth: 260,
        maxWidth: 292,
      })

      marker.on('click', () => onSelectRef.current?.(provider))

      marker.on('popupopen', (event) => {
        const popupElement = event.popup?.getElement()
        const button = popupElement?.querySelector('.flashmat-popup-cta')
        const visitButton = popupElement?.querySelector('.flashmat-popup-visit')

        if (button) {
          const handleClick = () => onBookRef.current?.(provider)
          button.addEventListener('click', handleClick, { once: true })
        }

        if (visitButton) {
          const handleVisit = () => onVisitProfileRef.current?.(provider)
          visitButton.addEventListener('click', handleVisit, { once: true })
        }
      })

      markersRef.current.set(getProviderKey(provider), marker)
      clusterGroup.addLayer(marker)
    })

    map.addLayer(clusterGroup)

    return () => {
      map.removeLayer(clusterGroup)
      clusterGroup.clearLayers()
      clusterGroupRef.current = null
      markersRef.current = new Map()
    }
  }, [map, providers])

  useEffect(() => {
    if (!selectedProviderId) return

    const marker = markersRef.current.get(String(selectedProviderId))
    const clusterGroup = clusterGroupRef.current
    if (!marker || !clusterGroup) return

    clusterGroup.zoomToShowLayer(marker, () => {
      const latLng = marker.getLatLng()
      map.flyTo(latLng, Math.max(map.getZoom(), 14), { duration: 0.35 })
      marker.openPopup()
    })
  }, [map, selectedProviderId])

  return null
}

export default function ProviderMap({
  providers,
  selectedProviderId,
  onSelect,
  onBook,
  onVisitProfile,
  onVisibleProvidersChange,
  scrollWheelZoom = true,
  height = 380,
}) {
  const [providersWithCoords, setProvidersWithCoords] = useState([])
  const [mapMode, setMapMode] = useState('map')
  const coordsCacheRef = useRef(new Map())

  useEffect(() => {
    let cancelled = false

    async function resolveProviderCoords() {
      const nextProviders = await Promise.all(
        (providers || []).map(async (provider) => {
          const providerKey = getProviderKey(provider)

          if (hasValidCoords(provider?.coords)) {
            const resolvedCoords = provider.coords.map(Number)
            coordsCacheRef.current.set(providerKey, resolvedCoords)
            return { ...provider, mapCoords: resolvedCoords }
          }

          const cachedCoords = coordsCacheRef.current.get(providerKey)
          if (hasValidCoords(cachedCoords)) {
            return { ...provider, mapCoords: cachedCoords }
          }

          try {
            const geocoded = await geocodeAddress(provider?.address)
            const resolvedCoords = hasValidCoords(geocoded) ? geocoded : buildApproximateCoords(provider)
            coordsCacheRef.current.set(providerKey, resolvedCoords)
            return { ...provider, mapCoords: resolvedCoords }
          } catch {
            const fallbackCoords = buildApproximateCoords(provider)
            coordsCacheRef.current.set(providerKey, fallbackCoords)
            return { ...provider, mapCoords: fallbackCoords }
          }
        }),
      )

      if (!cancelled) {
        setProvidersWithCoords(nextProviders.filter((provider) => hasValidCoords(provider.mapCoords)))
      }
    }

    resolveProviderCoords()

    return () => {
      cancelled = true
    }
  }, [providers])

  const coordsList = useMemo(
    () => providersWithCoords.map((provider) => provider.mapCoords),
    [providersWithCoords],
  )

  const mapCenter = coordsList[0] || DEFAULT_CENTER
  const tileConfig = mapMode === 'satellite'
    ? {
        attribution: '&copy; Esri, Maxar, Earthstar Geographics',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      }
    : {
        attribution: '&copy; OpenStreetMap &copy; CARTO',
        url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      }

  return (
    <div
      className="flashmat-provider-map"
      style={{
        height,
        borderRadius: 20,
        overflow: 'hidden',
        border: '1px solid rgba(184, 203, 229, .68)',
        marginBottom: 16,
        position: 'relative',
        zIndex: 0,
        isolation: 'isolate',
        boxShadow: '0 22px 44px rgba(15, 30, 61, 0.10)',
        background: '#d9e7f4',
      }}
    >
      <style>{`
        .flashmat-provider-map .leaflet-container {
          z-index: 0 !important;
          background: #d9e7f4;
          font-family: var(--font, Inter, sans-serif);
        }
        .flashmat-provider-map .leaflet-pane { z-index: 1 !important; }
        .flashmat-provider-map .leaflet-top,
        .flashmat-provider-map .leaflet-bottom,
        .flashmat-provider-map .leaflet-control,
        .flashmat-provider-map .leaflet-popup { z-index: 2 !important; }
        .flashmat-provider-map .leaflet-control-zoom {
          border: 1px solid rgba(20,50,82,.12) !important;
          border-radius: 16px !important;
          overflow: hidden;
          box-shadow: 0 16px 32px rgba(15,30,61,.12);
        }
        .flashmat-provider-map .leaflet-control-zoom a {
          width: 38px;
          height: 38px;
          line-height: 36px;
          background: rgba(255,255,255,.94);
          color: #10253d;
          border-bottom: 1px solid rgba(20,50,82,.08);
        }
        .flashmat-provider-map .leaflet-control-zoom a:last-child {
          border-bottom: none;
        }
        .flashmat-provider-map .flashmat-map-mode-toggle {
          position: absolute;
          top: 14px;
          right: 14px;
          z-index: 3;
          display: inline-flex;
          gap: 6px;
          padding: 6px;
          border-radius: 16px;
          background: rgba(255,255,255,.92);
          border: 1px solid rgba(20,50,82,.10);
          box-shadow: 0 16px 32px rgba(15,30,61,.12);
          backdrop-filter: blur(10px);
        }
        .flashmat-provider-map .flashmat-map-mode-toggle button {
          border: none;
          border-radius: 11px;
          padding: 9px 12px;
          background: transparent;
          color: #5f738a;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: .02em;
          cursor: pointer;
          transition: background .18s ease, color .18s ease, box-shadow .18s ease;
        }
        .flashmat-provider-map .flashmat-map-mode-toggle button.active {
          background: linear-gradient(135deg, #143252 0%, #2f72df 100%);
          color: #fff;
          box-shadow: 0 10px 18px rgba(20,50,82,.18);
        }
        .flashmat-provider-map .leaflet-popup-content-wrapper {
          border-radius: 22px;
          padding: 0;
          box-shadow: 0 24px 48px rgba(15,30,61,.18);
          border: 1px solid rgba(184, 203, 229, .68);
        }
        .flashmat-provider-map .leaflet-popup-content {
          margin: 0;
          padding: 16px;
        }
        .flashmat-provider-map .leaflet-popup-tip {
          box-shadow: none;
          background: #fff;
          border-right: 1px solid rgba(184, 203, 229, .68);
          border-bottom: 1px solid rgba(184, 203, 229, .68);
        }
        .flashmat-provider-map .leaflet-popup-close-button {
          color: #6a8097 !important;
          top: 10px !important;
          right: 10px !important;
        }
        .flashmat-provider-map .leaflet-marker-icon.flashmat-provider-cluster {
          background: transparent;
          border: none;
        }
      `}</style>
      <div className="flashmat-map-mode-toggle" aria-label="Map display mode">
        <button type="button" className={mapMode === 'map' ? 'active' : ''} onClick={() => setMapMode('map')}>Map</button>
        <button type="button" className={mapMode === 'satellite' ? 'active' : ''} onClick={() => setMapMode('satellite')}>Satellite</button>
      </div>
      <MapContainer center={mapCenter} zoom={12} style={{ height: '100%', width: '100%', position: 'relative', zIndex: 0 }} scrollWheelZoom={scrollWheelZoom}>
        <TileLayer attribution={tileConfig.attribution} url={tileConfig.url} />
        <MapViewportUpdater coordsList={coordsList} />
        <VisibleProvidersTracker
          providers={providersWithCoords}
          onVisibleProvidersChange={onVisibleProvidersChange}
        />
        <ClusteredProviderMarkers
          providers={providersWithCoords}
          selectedProviderId={selectedProviderId}
          onSelect={onSelect}
          onBook={onBook}
          onVisitProfile={onVisitProfile}
        />
      </MapContainer>
    </div>
  )
}

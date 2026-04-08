import { useEffect, useMemo, useRef, useState } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { geocodeAddress, hasValidCoords, loadGoogleMapsApi } from '../lib/googleMaps'

const DEFAULT_CENTER = [45.5017, -73.5673]

const GOOGLE_INTERFACE_MAP_STYLE = [
  { featureType: 'all', elementType: 'labels.text.fill', stylers: [{ color: '#878787' }] },
  { featureType: 'all', elementType: 'labels.text.stroke', stylers: [{ visibility: 'on' }, { color: '#ffffff' }, { weight: 1 }] },
  { featureType: 'administrative', elementType: 'geometry.fill', stylers: [{ color: '#fefefe' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#d6d6d6' }, { weight: 1 }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#f5f2ea' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#dff3e4' }] },
  { featureType: 'poi.park', elementType: 'geometry.fill', stylers: [{ color: '#cfead6' }] },
  { featureType: 'road.highway', elementType: 'geometry.fill', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#d8d1c5' }] },
  { featureType: 'road.arterial', elementType: 'geometry.fill', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.arterial', elementType: 'geometry.stroke', stylers: [{ color: '#e6e0d6' }] },
  { featureType: 'road.local', elementType: 'geometry.fill', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road.local', elementType: 'geometry.stroke', stylers: [{ color: '#f1ece4' }] },
  { featureType: 'transit.line', elementType: 'geometry', stylers: [{ color: '#bcd9f5' }] },
  { featureType: 'water', elementType: 'geometry.fill', stylers: [{ color: '#cce7f6' }] },
]

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

function createLeafletMarkerIcon(provider) {
  const logoImageUrl = provider.logoImageUrl || provider.logo_url || provider.avatar_url || ''
  const iconMarkup = renderToStaticMarkup(<ProviderGlyph code={getProviderIconCode(provider)} size={18} />)
  const fallbackMarkup = `
    <div style="
      width:30px;
      height:30px;
      border-radius:50%;
      background:linear-gradient(135deg,#143252 0%,#3b9fd8 100%);
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

function createGoogleFallbackMarker(provider) {
  const glyph = encodeURIComponent(renderToStaticMarkup(<ProviderGlyph code={getProviderIconCode(provider)} size={18} />))

  return `data:image/svg+xml;charset=UTF-8,
    <svg xmlns='http://www.w3.org/2000/svg' width='52' height='68' viewBox='0 0 52 68'>
      <defs>
        <linearGradient id='flashmatMarker' x1='0%' y1='0%' x2='100%' y2='100%'>
          <stop offset='0%' stop-color='%23143252'/>
          <stop offset='100%' stop-color='%233b9fd8'/>
        </linearGradient>
        <filter id='shadow' x='-50%' y='-50%' width='200%' height='200%'>
          <feDropShadow dx='0' dy='10' stdDeviation='7' flood-color='%23122845' flood-opacity='0.22'/>
        </filter>
      </defs>
      <g filter='url(%23shadow)'>
        <path d='M26 5c-10.493 0-19 8.507-19 19 0 15.062 19 38 19 38s19-22.938 19-38c0-10.493-8.507-19-19-19Z' fill='url(%23flashmatMarker)'/>
        <circle cx='26' cy='24' r='13' fill='white' fill-opacity='0.18'/>
        <foreignObject x='17' y='15' width='18' height='18'>${glyph}</foreignObject>
      </g>
    </svg>`.replace(/\n\s+/g, '')
}

function createPopupMarkup(provider, actionId) {
  const logoImageUrl = provider.logoImageUrl || provider.logo_url || provider.avatar_url || ''

  return renderToStaticMarkup(
    <div style={{ minWidth: 248, maxWidth: 272 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '46px minmax(0, 1fr)', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <div style={{ width: 46, height: 46, borderRadius: 16, overflow: 'hidden', background: '#edf5ff', border: '1px solid rgba(20,50,82,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {logoImageUrl ? (
            <img src={logoImageUrl} alt={provider.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: 34, height: 34, borderRadius: 14, background: 'linear-gradient(135deg, #143252 0%, #3b9fd8 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ProviderGlyph code={getProviderIconCode(provider)} size={18} />
            </div>
          )}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--display)', fontSize: 19, lineHeight: 1.02, letterSpacing: '-0.03em', fontWeight: 800, color: '#10253d', marginBottom: 4 }}>
            {provider.name}
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 999, background: 'rgba(59,159,216,0.08)', color: '#3b84ba', fontSize: 11, fontWeight: 700 }}>
            {provider.type_label || 'Provider'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 999, background: '#f6f9fd', color: '#47617b', fontSize: 11, fontWeight: 700 }}>
          <span style={{ color: '#f59e0b' }}>★</span>
          <span>{Number(provider.rating || 0).toFixed(1)}</span>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 999, background: '#f6f9fd', color: '#47617b', fontSize: 11, fontWeight: 700 }}>
          {provider.reviews || 0} reviews
        </div>
      </div>

      <div style={{ fontSize: 12, lineHeight: 1.65, color: '#5b6f86', marginBottom: 4 }}>{provider.address}</div>
      <div style={{ fontSize: 12, lineHeight: 1.65, color: '#5b6f86', marginBottom: 14 }}>{provider.phone || 'Phone available on profile'}</div>

      <button
        id={actionId}
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
    </div>,
  )
}

function ProviderPopupCard({ provider, onSelect }) {
  const logoImageUrl = provider.logoImageUrl || provider.logo_url || provider.avatar_url || ''

  return (
    <div style={{ minWidth: 248, maxWidth: 272 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '46px minmax(0, 1fr)', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <div style={{ width: 46, height: 46, borderRadius: 16, overflow: 'hidden', background: '#edf5ff', border: '1px solid rgba(20,50,82,.08)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {logoImageUrl ? (
            <img src={logoImageUrl} alt={provider.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: 34, height: 34, borderRadius: 14, background: 'linear-gradient(135deg, #143252 0%, #3b9fd8 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ProviderGlyph code={getProviderIconCode(provider)} size={18} />
            </div>
          )}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--display)', fontSize: 19, lineHeight: 1.02, letterSpacing: '-0.03em', fontWeight: 800, color: '#10253d', marginBottom: 4 }}>
            {provider.name}
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 8px', borderRadius: 999, background: 'rgba(59,159,216,0.08)', color: '#3b84ba', fontSize: 11, fontWeight: 700 }}>
            {provider.type_label || 'Provider'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 999, background: '#f6f9fd', color: '#47617b', fontSize: 11, fontWeight: 700 }}>
          <span style={{ color: '#f59e0b' }}>★</span>
          <span>{Number(provider.rating || 0).toFixed(1)}</span>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 999, background: '#f6f9fd', color: '#47617b', fontSize: 11, fontWeight: 700 }}>
          {provider.reviews || 0} reviews
        </div>
      </div>

      <div style={{ fontSize: 12, lineHeight: 1.65, color: '#5b6f86', marginBottom: 4 }}>{provider.address}</div>
      <div style={{ fontSize: 12, lineHeight: 1.65, color: '#5b6f86', marginBottom: 14 }}>{provider.phone || 'Phone available on profile'}</div>

      <button
        onClick={() => onSelect?.(provider)}
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
  )
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

function LeafletProviderMap({ providersWithCoords, onSelect, scrollWheelZoom, height }) {
  const coordsList = useMemo(
    () => providersWithCoords.map((provider) => provider.mapCoords),
    [providersWithCoords],
  )

  const mapCenter = coordsList[0] || DEFAULT_CENTER

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
        background: '#dfeaf6',
      }}
    >
      <style>{`
        .flashmat-provider-map .leaflet-container {
          z-index: 0 !important;
          background: #dfeaf6;
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
      `}</style>
      <MapContainer center={mapCenter} zoom={12} style={{ height: '100%', width: '100%', position: 'relative', zIndex: 0 }} scrollWheelZoom={scrollWheelZoom}>
        <TileLayer attribution="&copy; OpenStreetMap &copy; CARTO" url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
        <MapViewportUpdater coordsList={coordsList} />
        {providersWithCoords.map((provider) => (
          <Marker key={provider.id || provider.name} position={provider.mapCoords} icon={createLeafletMarkerIcon(provider)}>
            <Popup>
              <ProviderPopupCard provider={provider} onSelect={onSelect} />
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}

function GoogleProviderMap({ providersWithCoords, onSelect, scrollWheelZoom, height, onFallback }) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const googleRef = useRef(null)
  const markersRef = useRef([])
  const infoWindowRef = useRef(null)

  useEffect(() => {
    let cancelled = false

    loadGoogleMapsApi()
      .then((google) => {
        if (cancelled || !containerRef.current) return

        googleRef.current = google
        mapRef.current = new google.maps.Map(containerRef.current, {
          center: { lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1] },
          zoom: 12,
          disableDefaultUI: true,
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          gestureHandling: scrollWheelZoom ? 'greedy' : 'cooperative',
          clickableIcons: false,
          backgroundColor: '#f5f2ea',
          styles: GOOGLE_INTERFACE_MAP_STYLE,
        })

        infoWindowRef.current = new google.maps.InfoWindow({
          maxWidth: 286,
        })
      })
      .catch(() => {
        if (!cancelled) {
          onFallback?.()
        }
      })

    return () => {
      cancelled = true
    }
  }, [onFallback, scrollWheelZoom])

  useEffect(() => {
    const google = googleRef.current
    const map = mapRef.current
    if (!google || !map) return

    markersRef.current.forEach((marker) => {
      google.maps.event.clearInstanceListeners(marker)
      marker.setMap(null)
    })
    markersRef.current = []

    if (!providersWithCoords.length) {
      map.setCenter({ lat: DEFAULT_CENTER[0], lng: DEFAULT_CENTER[1] })
      map.setZoom(11)
      return
    }

    const bounds = new google.maps.LatLngBounds()

    providersWithCoords.forEach((provider, index) => {
      const position = {
        lat: Number(provider.mapCoords[0]),
        lng: Number(provider.mapCoords[1]),
      }

      bounds.extend(position)

      const marker = new google.maps.Marker({
        map,
        position,
        title: provider.name,
        zIndex: 100 + index,
        icon: {
          url: createGoogleFallbackMarker(provider),
          scaledSize: new google.maps.Size(42, 54),
          anchor: new google.maps.Point(21, 46),
        },
      })

      marker.addListener('click', () => {
        const actionId = `flashmat-map-action-${provider.id || hashString(provider.name)}`
        infoWindowRef.current?.setContent(createPopupMarkup(provider, actionId))
        infoWindowRef.current?.open({ map, anchor: marker })

        google.maps.event.addListenerOnce(infoWindowRef.current, 'domready', () => {
          const actionButton = document.getElementById(actionId)
          if (actionButton) {
            actionButton.addEventListener('click', () => onSelect?.(provider), { once: true })
          }
        })
      })

      markersRef.current.push(marker)
    })

    if (providersWithCoords.length === 1) {
      map.setCenter(bounds.getCenter())
      map.setZoom(14)
      return
    }

    map.fitBounds(bounds, 60)
  }, [onSelect, providersWithCoords])

  return (
    <div
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
        background: '#f5f2ea',
      }}
    >
      <style>{`
        .flashmat-google-provider-map button[title="Zoom in"],
        .flashmat-google-provider-map button[title="Zoom out"] {
          background: rgba(255,255,255,.94) !important;
          border-radius: 14px !important;
          box-shadow: 0 16px 32px rgba(15,30,61,.12) !important;
        }
      `}</style>
      <div
        ref={containerRef}
        className="flashmat-google-provider-map"
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  )
}

export default function ProviderMap({ providers, onSelect, scrollWheelZoom = true, height = 380 }) {
  const [providersWithCoords, setProvidersWithCoords] = useState([])
  const [forceLeafletFallback, setForceLeafletFallback] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function resolveProviderCoords() {
      const nextProviders = await Promise.all(
        (providers || []).map(async (provider) => {
          if (hasValidCoords(provider?.coords)) {
            return { ...provider, mapCoords: provider.coords.map(Number) }
          }

          try {
            const geocoded = await geocodeAddress(provider?.address)
            return { ...provider, mapCoords: hasValidCoords(geocoded) ? geocoded : buildApproximateCoords(provider) }
          } catch {
            return { ...provider, mapCoords: buildApproximateCoords(provider) }
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

  const useGoogleMap = Boolean(import.meta.env.VITE_GOOGLE_MAPS_API_KEY) && !forceLeafletFallback

  if (useGoogleMap) {
    return (
      <GoogleProviderMap
        providersWithCoords={providersWithCoords}
        onSelect={onSelect}
        scrollWheelZoom={scrollWheelZoom}
        height={height}
        onFallback={() => setForceLeafletFallback(true)}
      />
    )
  }

  return (
    <LeafletProviderMap
      providersWithCoords={providersWithCoords}
      onSelect={onSelect}
      scrollWheelZoom={scrollWheelZoom}
      height={height}
    />
  )
}

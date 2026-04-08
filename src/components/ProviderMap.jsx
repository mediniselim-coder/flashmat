import { useEffect, useMemo, useState } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { geocodeAddress, hasValidCoords } from '../lib/googleMaps'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

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
    map.fitBounds(bounds, { padding: [36, 36] })
  }, [coordsList, map])

  return null
}

export default function ProviderMap({ providers, onSelect }) {
  const [providersWithCoords, setProvidersWithCoords] = useState([])

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

  const coordsList = useMemo(
    () => providersWithCoords.map((provider) => provider.mapCoords),
    [providersWithCoords],
  )

  const mapCenter = coordsList[0] || DEFAULT_CENTER

  return (
    <div
      className="flashmat-provider-map"
      style={{
        height: 380,
        borderRadius: 12,
        overflow: 'hidden',
        border: '1px solid var(--border)',
        marginBottom: 16,
        position: 'relative',
        zIndex: 0,
        isolation: 'isolate',
      }}
    >
      <style>{`
        .flashmat-provider-map .leaflet-container { z-index: 0 !important; }
        .flashmat-provider-map .leaflet-pane { z-index: 1 !important; }
        .flashmat-provider-map .leaflet-top,
        .flashmat-provider-map .leaflet-bottom,
        .flashmat-provider-map .leaflet-control,
        .flashmat-provider-map .leaflet-popup { z-index: 2 !important; }
      `}</style>
      <MapContainer center={mapCenter} zoom={12} style={{ height: '100%', width: '100%', position: 'relative', zIndex: 0 }} scrollWheelZoom={false}>
        <TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapViewportUpdater coordsList={coordsList} />
        {providersWithCoords.map((provider) => (
          <Marker key={provider.id || provider.name} position={provider.mapCoords}>
            <Popup>
              <div style={{ minWidth: 180 }}>
                <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{provider.name}</div>
                <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>{provider.type_label} - {provider.rating} stars</div>
                <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>{provider.address}</div>
                <div style={{ fontSize: 11, color: '#666', marginBottom: 6 }}>{provider.phone}</div>
                <button
                  onClick={() => onSelect && onSelect(provider)}
                  style={{
                    background: '#16c784',
                    border: 'none',
                    color: '#fff',
                    padding: '5px 12px',
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: 11,
                    fontWeight: 600,
                    width: '100%',
                  }}
                >
                  Book now
                </button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}

import { useEffect } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const TYPE_COLORS = {
  mechanic: '#16c784',
  wash:     '#3b82f6',
  tire:     '#f59e0b',
  body:     '#8b5cf6',
  glass:    '#06b6d4',
  tow:      '#ef4444',
  parts:    '#f97316',
  parking:  '#6b7280',
  tuning:   '#ec4899',
  junk:     '#84cc16',
}

const PROVIDER_COORDS = {
  'Garage Los Santos':        [45.5579, -73.5949],
  'CS Lave Auto Décarie':     [45.4736, -73.6317],
  'Dubé Pneu et Mécan.':      [45.5523, -73.6012],
  'JA Automobile':            [45.5801, -73.5456],
  'Garage Méca. MK':          [45.5234, -73.5789],
  'Remorquage Elite 24/7':    [45.5088, -73.5540],
  'Lave-Auto 365':            [45.4951, -73.6234],
  'Speedy Glass Montréal':    [45.5012, -73.5678],
  'Service Mécanique Plateau':[45.5217, -73.5812],
  'Garage Sylvain Joubert':   [45.5634, -73.5523],
  'Mécanique Hochelaga':      [45.5456, -73.5234],
  'Auto Médic':               [45.5312, -73.5901],
  'Garage NDG Auto':          [45.4823, -73.6123],
  'Mécanique Villeray':       [45.5489, -73.6234],
  'Atelier Mécanique Rosemont':[45.5378, -73.5834],
  'Auto Spa Montreal':        [45.4712, -73.5923],
  'Splash Car Wash':          [45.5623, -73.6345],
  'OK Pneu Montréal':         [45.5534, -73.5412],
  'Pneus Dufour':             [45.5123, -73.6012],
  'Kal Tire Montréal':        [45.5678, -73.5234],
  'AutoFax Inc.':             [45.4634, -73.5678],
  'Carrosserie Prestige MTL': [45.5445, -73.5234],
  'Auto Glass MTL':           [45.4589, -73.5834],
  'Remorquage Ménard':        [45.5234, -73.5456],
  'CAA Québec Dépannage':     [45.5088, -73.5540],
  'Performance MTL':          [45.5534, -73.6123],
  'NAPA Auto Parts Montréal': [45.5312, -73.5678],
  'Casse Auto Montréal':      [45.5823, -73.5234],
}

export default function ProviderMap({ providers, onSelect }) {
  return (
    <div style={{ height: 380, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', marginBottom: 16 }}>
      <MapContainer
        center={[45.5088, -73.5540]}
        zoom={12}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {providers.map((p, i) => {
          const coords = PROVIDER_COORDS[p.name] || [45.5088 + (Math.random()-0.5)*0.1, -73.5540 + (Math.random()-0.5)*0.1]
          const color = TYPE_COLORS[p.type] || '#16c784'
          const icon = L.divIcon({
            html: `<div style="background:${color};width:28px;height:28px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;">
              <span style="transform:rotate(45deg);font-size:12px">${p.icon||'🔧'}</span>
            </div>`,
            className: '',
            iconSize: [28, 28],
            iconAnchor: [14, 28],
          })
          return (
            <Marker key={i} position={coords} icon={icon}>
              <Popup>
                <div style={{ minWidth: 160 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>{p.type_label} · ⭐{p.rating}</div>
                  <div style={{ fontSize: 11, color: '#666', marginBottom: 6 }}>{p.phone}</div>
                  <button
                    onClick={() => onSelect && onSelect(p)}
                    style={{ background: '#16c784', border: 'none', color: '#fff', padding: '5px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600, width: '100%' }}
                  >
                    Réserver →
                  </button>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>
    </div>
  )
}
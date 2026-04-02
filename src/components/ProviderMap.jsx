import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const COORDS = {
  'Garage Los Santos': [45.5579, -73.5949],
  'CS Lave Auto Decarie': [45.4736, -73.6317],
  'Dube Pneu et Mecan.': [45.5523, -73.6012],
  'JA Automobile': [45.5801, -73.5456],
  'Garage Meca. MK': [45.5234, -73.5789],
  'Remorquage Elite 24/7': [45.5088, -73.5540],
  'Lave-Auto 365': [45.4951, -73.6234],
  'Speedy Glass Montreal': [45.5012, -73.5678],
}

export default function ProviderMap({ providers, onSelect }) {
  return (
    <div style={{ height: 380, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border)', marginBottom: 16 }}>
      <MapContainer center={[45.5088, -73.5540]} zoom={12} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {providers.map((p, i) => {
          const coords = COORDS[p.name] || [45.5088 + (Math.random()-0.5)*0.08, -73.5540 + (Math.random()-0.5)*0.08]
          return (
            <Marker key={i} position={coords}>
              <Popup>
                <div style={{ minWidth: 160 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: '#666', marginBottom: 4 }}>{p.type_label} - {p.rating} etoiles</div>
                  <div style={{ fontSize: 11, color: '#666', marginBottom: 6 }}>{p.phone}</div>
                  <button onClick={() => onSelect && onSelect(p)} style={{ background: '#16c784', border: 'none', color: '#fff', padding: '5px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 600, width: '100%' }}>
                    Reserver
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
```

5. **Commit changes** → **Commit changes**

Ensuite dans PowerShell :
```
git pull
```
```
npm run dev

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
})

const DEMO_PROVIDERS = {
  'garage-los-santos': {
    name: 'Garage Los Santos', slug: 'garage-los-santos',
    cover: null, logo: '🔧', type: 'Mécanique', rating: 4.8, reviews: 312,
    address: '7999 14e Avenue, Montréal, QC', phone: '(514) 374-2829',
    website: null, email: 'losantos@email.com',
    description: 'Mécaniciens certifiés ASE. Spécialistes toutes marques. Devis gratuit. Garage familial au service de Montréal depuis plus de 15 ans.',
    services: ['Vidange','Freins','Pneus','Alignement','Suspension','Diagnostic','Climatisation'],
    hours: { Mon: '08:00-17:00', Tue: '08:00-17:00', Wed: '08:00-17:00', Thu: '08:00-17:00', Fri: '08:00-17:00', Sat: 'Fermé', Sun: 'Fermé' },
    coords: [45.5579, -73.5949],
    team: [{ name: 'Carlos V.', role: 'Mécanicien senior', phone: '514-555-0101' }],
    reviews_list: [{ user: 'Alex M.', rating: 5, comment: 'Excellent service, rapide et honnête!', date: 'Mars 2025' }, { user: 'Sarah K.', rating: 5, comment: 'Je recommande vraiment ce garage.', date: 'Fév. 2025' }],
    gallery: ['🔧','🚗','⚙️','🏎️'],
    highlights: ['Certifié ASE','Devis gratuit','Garantie 12 mois','Toutes marques'],
  },
  'cs-lave-auto-decarie': {
    name: 'CS Lave Auto Décarie', slug: 'cs-lave-auto-decarie',
    cover: null, logo: '🚿', type: 'Lave-auto', rating: 4.8, reviews: 198,
    address: '5960 Bd Décarie, Montréal, QC', phone: '(514) 739-2267',
    website: null, email: 'cslave@email.com',
    description: 'Lavage à la main professionnel. Service rapide et soigné. Détailing complet disponible.',
    services: ['Lavage complet','Détail intérieur','Cire','Express','Polissage'],
    hours: { Mon: '08:00-18:00', Tue: '08:00-18:00', Wed: '08:00-18:00', Thu: '08:00-18:00', Fri: '08:00-18:00', Sat: '09:00-17:00', Sun: 'Fermé' },
    coords: [45.4736, -73.6317],
    team: [{ name: 'Mohammed A.', role: 'Directeur', phone: '514-555-0202' }],
    reviews_list: [{ user: 'Julie T.', rating: 5, comment: 'Meilleur lave-auto de Montréal!', date: 'Avr. 2025' }],
    gallery: ['🚿','✨','🚗','💧'],
    highlights: ['Lavage à la main','Produits premium','Service rapide','Intérieur/extérieur'],
  },
  'dube-pneu-et-mecan': {
    name: 'Dubé Pneu et Mécan.', slug: 'dube-pneu-et-mecan',
    cover: null, logo: '🔩', type: 'Pneus', rating: 4.3, reviews: 256,
    address: '3325 Rue Jarry E, Montréal, QC', phone: '(514) 727-1234',
    website: null, email: 'dube@email.com',
    description: 'Spécialistes des pneus et de la mécanique générale. Meilleur prix garanti sur les pneus hiver et été. Service rapide sans rendez-vous.',
    services: ['Pneus hiver','Pneus été','Alignement','Balancement','Vidange','Freins'],
    hours: { Mon: '07:30-17:30', Tue: '07:30-17:30', Wed: '07:30-17:30', Thu: '07:30-17:30', Fri: '07:30-17:30', Sat: '08:00-16:00', Sun: 'Fermé' },
    coords: [45.5663, -73.6018],
    team: [{ name: 'Jean-Pierre D.', role: 'Propriétaire', phone: '514-727-1234' }],
    reviews_list: [{ user: 'Martin L.', rating: 4, comment: 'Bon prix, service efficace.', date: 'Mars 2025' }, { user: 'Pierre B.', rating: 5, comment: 'Pneus installés en 45 minutes!', date: 'Fév. 2025' }],
    gallery: ['🔩','🚗','🏎️','⚙️'],
    highlights: ['Meilleur prix garanti','Sans rendez-vous','Pneus hiver/été','Alignement précis'],
  },
  'garage-meca-mk': {
    name: 'Garage Méca. MK', slug: 'garage-meca-mk',
    cover: null, logo: '🔧', type: 'Mécanique', rating: 4.9, reviews: 145,
    address: '8245 Rue Hochelaga, Montréal, QC', phone: '(514) 255-8877',
    website: null, email: 'mecamk@email.com',
    description: 'Garage de quartier reconnu pour son honnêteté et la qualité de ses réparations. Spécialistes Honda, Toyota et Hyundai. Note parfaite sur Google.',
    services: ['Vidange','Freins','Suspension','Diagnostic','Embrayage','Courroie distribution'],
    hours: { Mon: '08:00-18:00', Tue: '08:00-18:00', Wed: '08:00-18:00', Thu: '08:00-18:00', Fri: '08:00-18:00', Sat: '08:00-14:00', Sun: 'Fermé' },
    coords: [45.5523, -73.5401],
    team: [{ name: 'Mehdi K.', role: 'Mécanicien propriétaire', phone: '514-255-8877' }],
    reviews_list: [{ user: 'Claudine R.', rating: 5, comment: 'Le meilleur garage de Montréal, honnête et professionnel!', date: 'Avr. 2025' }, { user: 'François T.', rating: 5, comment: 'Je ne vais nulle part ailleurs.', date: 'Mars 2025' }],
    gallery: ['🔧','⚙️','🚗','🏎️'],
    highlights: ['Note 4.9/5','Honnêteté garantie','Spécialiste Honda/Toyota','Devis gratuit'],
  },
  'remorquage-elite-24-7': {
    name: 'Remorquage Elite 24/7', slug: 'remorquage-elite-24-7',
    cover: null, logo: '🚛', type: 'Remorquage', rating: 4.6, reviews: 432,
    address: 'Service mobile — Montréal et environs', phone: '(514) 476-1708',
    website: null, email: 'elite@email.com',
    description: 'Remorquage rapide 24h/7j partout à Montréal et environs. Temps de réponse moyen: 25 minutes. Paiement par carte accepté. Véhicules lourds bienvenus.',
    services: ['Remorquage','Dépannage','Boost de batterie','Déverrouillage','Pneu crevé','Livraison carburant'],
    hours: { Mon: '00:00-24:00', Tue: '00:00-24:00', Wed: '00:00-24:00', Thu: '00:00-24:00', Fri: '00:00-24:00', Sat: '00:00-24:00', Sun: '00:00-24:00' },
    coords: [45.5088, -73.5540],
    team: [{ name: 'David E.', role: 'Dispatcher', phone: '514-476-1708' }],
    reviews_list: [{ user: 'Isabelle M.', rating: 5, comment: 'Arrivés en 20 minutes, super pro!', date: 'Avr. 2025' }, { user: 'Robert G.', rating: 4, comment: 'Rapide et courtois, bon prix.', date: 'Mars 2025' }],
    gallery: ['🚛','🚗','⚡','🔧'],
    highlights: ['Disponible 24/7','Temps de réponse 25 min','Toute île de Montréal','Paiement carte'],
  },
  'lave-auto-365': {
    name: 'Lave-Auto 365', slug: 'lave-auto-365',
    cover: null, logo: '🚿', type: 'Lave-auto', rating: 4.8, reviews: 210,
    address: '4455 Rue Saint-Denis, Montréal, QC', phone: '(514) 843-3650',
    website: null, email: 'laveauto365@email.com',
    description: 'Lavage automatique et à la main disponible tous les jours de l\'année. Abonnement mensuel illimité à $59. Produits écologiques utilisés.',
    services: ['Lavage express','Lavage complet','Détail intérieur','Abonnement mensuel','Cire','Polissage'],
    hours: { Mon: '07:00-21:00', Tue: '07:00-21:00', Wed: '07:00-21:00', Thu: '07:00-21:00', Fri: '07:00-21:00', Sat: '07:00-20:00', Sun: '08:00-18:00' },
    coords: [45.5231, -73.5777],
    team: [{ name: 'Karim A.', role: 'Gérant', phone: '514-843-3650' }],
    reviews_list: [{ user: 'Sophie L.', rating: 5, comment: 'Abonnement mensuel imbattable! Ma voiture est toujours propre.', date: 'Avr. 2025' }, { user: 'Marc D.', rating: 5, comment: 'Ouvert 365 jours par an, super pratique!', date: 'Mars 2025' }],
    gallery: ['🚿','💧','✨','🚗'],
    highlights: ['Ouvert 365 jours','Abonnement $59/mois','Produits écologiques','Express 15 min'],
  },
  'ja-automobile': {
    name: 'JA Automobile', slug: 'ja-automobile',
    cover: null, logo: '🔧', type: 'Mécanique', rating: 4.8, reviews: 89,
    address: '2185 Bd Rosemont, Montréal, QC', phone: '(514) 722-5544',
    website: null, email: 'jauto@email.com',
    description: 'Spécialistes en freins, alignement et mécanique générale. Freins à partir de $149 avec alignement offert. Équipe jeune et dynamique, diagnostic électronique de pointe.',
    services: ['Freins','Alignement','Vidange','Diagnostic électronique','Suspension','Climatisation'],
    hours: { Mon: '08:00-17:30', Tue: '08:00-17:30', Wed: '08:00-17:30', Thu: '08:00-17:30', Fri: '08:00-17:00', Sat: '08:00-13:00', Sun: 'Fermé' },
    coords: [45.5448, -73.5839],
    team: [{ name: 'Jonathan A.', role: 'Mécanicien propriétaire', phone: '514-722-5544' }],
    reviews_list: [{ user: 'Annie B.', rating: 5, comment: 'Freins faits en 1h, alignement offert. Parfait!', date: 'Avr. 2025' }, { user: 'Kevin T.', rating: 5, comment: 'Prix honnête, travail impeccable.', date: 'Mars 2025' }],
    gallery: ['🔧','⚙️','🚗','🏎️'],
    highlights: ['Freins dès $149','Alignement offert','Diagnostic électronique','Garantie pièces et main-d\'oeuvre'],
  },
  'speedy-glass-montreal': {
    name: 'Speedy Glass Montréal', slug: 'speedy-glass-montreal',
    cover: null, logo: '🪟', type: 'Vitres auto', rating: 4.5, reviews: 521,
    address: '7000 Bd Décarie, Montréal, QC', phone: '(514) 731-5555',
    website: null, email: 'speedyglass@email.com',
    description: 'Réparation et remplacement de pare-brise depuis 1947. Travail direct avec votre assurance, sans franchise dans la plupart des cas. Calibration ADAS disponible.',
    services: ['Réparation pare-brise','Remplacement vitres','Calibration ADAS','Vitre teintée','Dégivrage','Assurance directe'],
    hours: { Mon: '08:00-17:00', Tue: '08:00-17:00', Wed: '08:00-17:00', Thu: '08:00-17:00', Fri: '08:00-17:00', Sat: '08:00-14:00', Sun: 'Fermé' },
    coords: [45.4822, -73.6284],
    team: [{ name: 'Steve R.', role: 'Technicien vitres', phone: '514-731-5555' }],
    reviews_list: [{ user: 'Lucie F.', rating: 5, comment: 'Pare-brise remplacé sans franchise, super rapide!', date: 'Avr. 2025' }, { user: 'Thomas M.', rating: 4, comment: 'Bon service, assurance gérée directement.', date: 'Mars 2025' }],
    gallery: ['🪟','🚗','✨','⚙️'],
    highlights: ['Sans franchise assurance','Calibration ADAS','Depuis 1947','Service mobile disponible'],
  },
}

const DAYS_FR = { Mon: 'Lundi', Tue: 'Mardi', Wed: 'Mercredi', Thu: 'Jeudi', Fri: 'Vendredi', Sat: 'Samedi', Sun: 'Dimanche' }

export default function ProviderProfile() {
  const { slug } = useParams()
  const navigate  = useNavigate()
  const [provider, setProvider] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [bookingOpen, setBookingOpen] = useState(false)
  const [bookingSuccess, setBookingSuccess] = useState(false)

  useEffect(() => {
    const demo = DEMO_PROVIDERS[slug]
    if (demo) { setProvider(demo); setLoading(false) }
    else {
      // Try to find in providers_list using first keyword from slug
      const keyword = slug.split('-').filter(s => s.length > 2)[0] || slug.split('-')[0]
      supabase.from('providers_list').select('*').ilike('name', `%${keyword}%`).limit(1)
        .then(({ data }) => {
          if (data?.[0]) setProvider({ ...data[0], slug, coords: [45.5088, -73.5540], hours: { Mon:'08:00-17:00',Tue:'08:00-17:00',Wed:'08:00-17:00',Thu:'08:00-17:00',Fri:'08:00-17:00',Sat:'Fermé',Sun:'Fermé' }, team: [], reviews_list: [], gallery: [], highlights: data[0].services || [] })
          setLoading(false)
        })
    }
  }, [slug])

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div className="spinner" style={{ width: 36, height: 36 }} />
    </div>
  )

  if (!provider) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', flexDirection: 'column', gap: 16 }}>
      <div style={{ fontSize: 48 }}>🔍</div>
      <div style={{ fontFamily: 'var(--display)', fontSize: 24, fontWeight: 800 }}>Fournisseur introuvable</div>
      <button className="btn btn-green" onClick={() => navigate('/')}>Retour à l'accueil</button>
    </div>
  )

  return (
    <div style={{ background: 'var(--bg)', minHeight: '100vh' }}>

      {/* TOP NAV */}
      <nav style={{ background: 'rgba(255,255,255,.95)', backdropFilter: 'blur(12px)', borderBottom: '1px solid var(--border)', padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 100 }}>
        <img src="/logo.jpg" alt="FlashMat" style={{ height: 32, objectFit: 'contain', cursor: 'pointer' }} onClick={() => navigate('/')} />
        <div style={{ flex: 1 }} />
        <button className="btn" onClick={() => navigate('/')}>← Retour</button>
        <button className="btn btn-green" onClick={() => setBookingOpen(true)}>📅 Réserver</button>
      </nav>

      {/* COVER HEADER */}
      <div style={{ background: 'linear-gradient(135deg, #1a3a8f 0%, #2952cc 50%, #4db8e8 100%)', padding: '60px 24px 40px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.35)' }} />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ width: 90, height: 90, borderRadius: 16, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, margin: '0 auto 16px', boxShadow: '0 4px 20px rgba(0,0,0,.3)' }}>
            {provider.logo}
          </div>
          <h1 style={{ fontFamily: 'var(--display)', fontSize: 32, fontWeight: 800, color: '#fff', marginBottom: 8 }}>{provider.name}</h1>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, flexWrap: 'wrap', fontSize: 13, color: 'rgba(255,255,255,.85)', marginBottom: 12 }}>
            <span>📍 {provider.address}</span>
            <span>📞 {provider.phone}</span>
            {provider.website && <span>🌐 {provider.website}</span>}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span style={{ fontFamily: 'var(--display)', fontSize: 20, fontWeight: 800, color: '#fff' }}>{provider.rating}</span>
            <span style={{ color: '#f59e0b', fontSize: 18 }}>{'★'.repeat(Math.round(provider.rating))}</span>
            <span style={{ color: 'rgba(255,255,255,.7)', fontSize: 13 }}>({provider.reviews} avis)</span>
          </div>
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div style={{ background: '#fff', borderBottom: '1px solid var(--border)', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <a href={`tel:${provider.phone}`} className="btn btn-outline">📞 Appeler</a>
        <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(provider.address)}`} target="_blank" rel="noreferrer" className="btn btn-outline">📍 Directions</a>
        <button className="btn btn-green" onClick={() => setBookingOpen(true)}>📅 Prendre un rendez-vous</button>
      </div>

      {/* MAIN CONTENT */}
      <div className="providerLayout">

        {/* LEFT COLUMN */}
        <div>
          {/* DESCRIPTION */}
          <div className="panel">
            <div className="panel-hd"><div className="panel-title">🏪 À propos</div></div>
            <div className="panel-body">
              <p style={{ fontSize: 14, color: 'var(--ink2)', lineHeight: 1.7 }}>{provider.description}</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
                {provider.highlights?.map(h => <span key={h} className="badge badge-blue">✓ {h}</span>)}
              </div>
            </div>
          </div>

          {/* TEAM */}
          {provider.team?.length > 0 && (
            <div className="panel">
              <div className="panel-hd"><div className="panel-title">👥 Notre équipe</div></div>
              <div className="panel-body">
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                  {provider.team.map((m, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'var(--bg3)', borderRadius: 10, padding: 14, minWidth: 220 }}>
                      <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--green-bg)', border: '2px solid var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>👤</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{m.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink3)', marginBottom: 4 }}>{m.role}</div>
                        <div style={{ fontSize: 11, color: 'var(--ink2)' }}>📞 {m.phone}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* HOURS */}
          <div className="panel">
            <div className="panel-hd"><div className="panel-title">🕐 Horaires d'ouverture</div></div>
            <div className="panel-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0' }}>
                {Object.entries(provider.hours || {}).map(([day, hours]) => (
                  <div key={day} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 13 }}>
                    <span style={{ fontWeight: 600 }}>{DAYS_FR[day] || day}</span>
                    <span style={{ color: hours === 'Fermé' ? 'var(--red)' : 'var(--green)', fontFamily: 'var(--mono)', fontSize: 12 }}>{hours}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SERVICES */}
          <div className="panel">
            <div className="panel-hd"><div className="panel-title">⚙️ Services offerts</div></div>
            <div className="panel-body">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(provider.services || []).map(s => (
                  <div key={s} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'all .15s' }}
                    onClick={() => setBookingOpen(true)}>
                    🔧 {s}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* GALLERY */}
          {provider.gallery?.length > 0 && (
            <div className="panel">
              <div className="panel-hd"><div className="panel-title">📸 Galerie</div></div>
              <div className="panel-body">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                  {provider.gallery.map((img, i) => (
                    <div key={i} style={{ aspectRatio: '1', background: 'linear-gradient(135deg, var(--green-bg), var(--blue-bg))', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, border: '1px solid var(--border)' }}>
                      {img}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* REVIEWS */}
          {provider.reviews_list?.length > 0 && (
            <div className="panel">
              <div className="panel-hd">
                <div className="panel-title">⭐ Avis clients</div>
                <span className="badge badge-green">{provider.rating} ★ · {provider.reviews} avis</span>
              </div>
              <div>
                {provider.reviews_list.map((r, i) => (
                  <div key={i} style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--green-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>👤</div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, fontSize: 13 }}>{r.user}</span>
                        <span style={{ color: '#f59e0b' }}>{'★'.repeat(r.rating)}</span>
                        <span style={{ fontSize: 11, color: 'var(--ink3)', fontFamily: 'var(--mono)' }}>{r.date}</span>
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--ink2)' }}>{r.comment}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN */}
        <div>
          {/* MAP */}
          <div className="panel">
            <div className="panel-hd"><div className="panel-title">📍 Localisation</div></div>
            <div style={{ height: 220, borderRadius: '0 0 10px 10px', overflow: 'hidden' }}>
              <MapContainer center={provider.coords} zoom={15} style={{ height: '100%', width: '100%' }} scrollWheelZoom={false}>
                <TileLayer attribution='&copy; OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                <Marker position={provider.coords}>
                  <Popup>{provider.name}<br />{provider.address}</Popup>
                </Marker>
              </MapContainer>
            </div>
            <div style={{ padding: 12 }}>
              <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(provider.address)}`} target="_blank" rel="noreferrer" className="btn btn-green" style={{ width: '100%', justifyContent: 'center' }}>
                📍 Obtenir les directions
              </a>
            </div>
          </div>

          {/* QUICK BOOKING */}
          <div className="panel">
            <div className="panel-hd"><div className="panel-title">📅 Réservation rapide</div></div>
            <div className="panel-body">
              <p style={{ fontSize: 13, color: 'var(--ink2)', marginBottom: 16 }}>Prenez rendez-vous en ligne en moins de 2 minutes!</p>
              <button className="btn btn-green" style={{ width: '100%', justifyContent: 'center', padding: '12px' }} onClick={() => setBookingOpen(true)}>
                Prendre un rendez-vous →
              </button>
              <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                <a href={`tel:${provider.phone}`} style={{ fontSize: 12, color: 'var(--green)', fontFamily: 'var(--mono)' }}>{provider.phone}</a>
              </div>
            </div>
          </div>

          {/* CONTACT */}
          <div className="panel">
            <div className="panel-hd"><div className="panel-title">📬 Contact</div></div>
            <div className="panel-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 13 }}>
                <span>📞</span><a href={`tel:${provider.phone}`} style={{ color: 'var(--green)' }}>{provider.phone}</a>
              </div>
              {provider.email && <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 13 }}>
                <span>📧</span><a href={`mailto:${provider.email}`} style={{ color: 'var(--green)' }}>{provider.email}</a>
              </div>}
              <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 13 }}>
                <span>📍</span><span style={{ color: 'var(--ink2)' }}>{provider.address}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BOOKING MODAL */}
      {bookingOpen && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setBookingOpen(false)}>
          <div className="modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
              <div className="modal-title" style={{ marginBottom: 0 }}>📅 Réserver chez {provider.name}</div>
              <button onClick={() => setBookingOpen(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--ink3)' }}>✕</button>
            </div>
            <div className="form-group">
              <label className="form-label">Service</label>
              <select className="form-select">
                {(provider.services || []).map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Votre nom</label>
              <input className="form-input" placeholder="Ex: Alex Martin" />
            </div>
            <div className="form-group">
              <label className="form-label">Téléphone</label>
              <input className="form-input" placeholder="Ex: 514-555-1234" />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div className="form-group">
                <label className="form-label">Date</label>
                <input className="form-input" type="date" />
              </div>
              <div className="form-group">
                <label className="form-label">Heure</label>
                <select className="form-select">
                  {['08:00','09:00','10:00','11:00','13:00','14:00','15:00','16:00'].map(h => <option key={h}>{h}</option>)}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <input className="form-input" placeholder="Décrivez votre problème…" />
            </div>
            {bookingSuccess && (
              <div style={{ background: 'var(--green-bg)', border: '1px solid var(--green)', borderRadius: 10, padding: '14px 16px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10, color: 'var(--green)', fontWeight: 600, fontSize: 14 }}>
                ✅ Réservation envoyée! Vous serez contacté sous peu.
              </div>
            )}
            <div className="modal-actions">
              <button className="btn" onClick={() => setBookingOpen(false)}>Annuler</button>
              <button className="btn btn-green btn-lg" disabled={bookingSuccess} onClick={() => { setBookingSuccess(true); setTimeout(() => { setBookingOpen(false); setBookingSuccess(false) }, 2500) }}>Confirmer →</button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer style={{ background: '#fff', borderTop: '1px solid var(--border)', padding: '24px', textAlign: 'center', marginTop: 40 }}>
        <img src="/logo.jpg" alt="FlashMat" style={{ height: 28, objectFit: 'contain', marginBottom: 8 }} />
        <div style={{ fontSize: 12, color: 'var(--ink3)' }}>© 2025 FlashMat.ca · The MarketPlace for Auto Tech</div>
      </footer>
    </div>
  )
}
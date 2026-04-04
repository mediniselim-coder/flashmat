import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import NavBar from '../components/NavBar'

const USER_FLOW = [
  {
    step: '1',
    title: 'Le client clique',
    text: 'Un bouton urgence visible dans FlashMat pour demander de l aide immédiatement.',
    detail: 'CTA: FlashFix - Besoin d aide maintenant',
  },
  {
    step: '2',
    title: 'Description rapide',
    text: 'Le client choisit batterie morte, pneu creve, voiture ne demarre pas, bruit suspect, ou envoie une photo ou un audio.',
    detail: 'Objectif: zero friction',
  },
  {
    step: '3',
    title: 'Geolocalisation',
    text: 'Position automatique ou saisie manuelle pour envoyer le bon mecanicien au bon endroit.',
    detail: 'Route, parking, maison',
  },
  {
    step: '4',
    title: 'Prix instantane',
    text: 'Le client voit une fourchette claire avant de confirmer.',
    detail: 'Ex: boost batterie 40-60$, pneu 50-80$',
  },
  {
    step: '5',
    title: 'Matching instantane',
    text: 'FlashMat affiche les mecaniciens disponibles proches avec ETA, note et prix.',
    detail: 'Comme un dispatch intelligent',
  },
  {
    step: '6',
    title: 'Confirmation',
    text: 'Paiement integre et suivi en temps reel jusqu a l arrivee du mecanicien.',
    detail: 'Experience simple et rassurante',
  },
]

const PROVIDER_FLOW = [
  'Notification urgence avec type de panne et localisation client',
  'Le mecanicien voit prix, distance et niveau d urgence',
  'Il accepte ou refuse la mission en quelques secondes',
  'Intervention rapide sur place puis paiement automatique via FlashMat',
]

const SERVICE_BLOCKS = [
  {
    title: 'Intervention rapide',
    tone: '#991b1b',
    bg: '#fef2f2',
    items: ['Boost batterie', 'Pneu creve', 'Deverrouillage voiture', 'Petite reparation sur place'],
  },
  {
    title: 'Remorquage intelligent',
    tone: '#92400e',
    bg: '#fffbeb',
    items: ['Si le probleme est grave', 'Redirection garage partenaire', 'Continuer vers reparation complete', 'Support coordonne'],
  },
  {
    title: 'Special Montreal',
    tone: '#1d4ed8',
    bg: '#eff6ff',
    items: ['Batterie morte en hiver', 'Voiture bloquee dans la neige', 'Demarrage difficile', 'Intervention locale rapide'],
  },
]

const VALUE_PROPS = [
  { title: 'Rapide', text: 'Intervention ciblee en 15 a 30 min quand c est possible.' },
  { title: 'Prix clair', text: 'Le client voit une estimation avant confirmation.' },
  { title: 'Confiance', text: 'Le matching s appuie sur la note et le profil FlashMat.' },
  { title: 'Tout-en-un', text: 'Diagnostic, intervention urgente, puis reparation complete si necessaire.' },
]

const BUSINESS_MODEL = [
  'Commission FlashMat sur chaque mission',
  'Frais urgence additionnel',
  'Abonnement premium pour clients frequents',
]

const MVP_STEPS = [
  'Formulaire ou demande simplifiee',
  'Liste de mecaniciens partenaires',
  'Dispatch manuel au debut',
  'Paiement Stripe',
]

const VISION_ITEMS = [
  'IA pour predire la meilleure intervention',
  'Flotte de mecaniciens FlashMat',
  'Partenariats avec assureurs et assistance routiere',
]

const SAMPLE_CASES = [
  'Batterie morte a domicile',
  'Pneu creve sur le bord de la route',
  'Voiture qui ne demarre plus',
  'Bruit suspect avant de reprendre la route',
]

export default function FlashFixUrgence() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()

  function routeToUrgence(categoryId = 'tow') {
    window.sessionStorage.setItem('flashmat-pending-service-search', JSON.stringify({
      pane: 'search',
      cat: categoryId,
    }))

    if (user && profile?.role === 'client') {
      navigate(`/app/client?pane=search&cat=${encodeURIComponent(categoryId)}`)
      return
    }

    navigate('/services?login=1')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg, #f8f8f6)', fontFamily: 'var(--sans, sans-serif)' }}>
      <NavBar activePage="urgence" />

      <section style={{ background: 'linear-gradient(135deg, #450a0a 0%, #7f1d1d 100%)', color: '#fff', padding: '64px 32px 52px', textAlign: 'center' }}>
        <div style={{ fontSize: 12, letterSpacing: 2, textTransform: 'uppercase', color: '#fca5a5', marginBottom: 12, fontWeight: 700 }}>● FlashFix Urgence</div>
        <h1 style={{ fontSize: 46, fontWeight: 800, margin: '0 0 16px', lineHeight: 1.08 }}>
          L Uber des reparations
          <br />
          <span style={{ color: '#fca5a5' }}>auto d urgence</span>
        </h1>
        <p style={{ color: '#fecaca', fontSize: 16, maxWidth: 760, margin: '0 auto 28px', lineHeight: 1.75 }}>
          Un bouton urgence dans FlashMat. Le client clique, explique le probleme, partage sa position,
          voit le prix, puis un mecanicien mobile ou un service routier vient directement a lui.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
          <button
            type="button"
            onClick={() => routeToUrgence('tow')}
            style={{ padding: '13px 18px', borderRadius: 12, border: 'none', background: '#ef4444', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}
          >
            FlashFix - Besoin d aide maintenant
          </button>
          <button
            type="button"
            onClick={() => routeToUrgence('mechanic')}
            style={{ padding: '13px 18px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.24)', background: 'rgba(255,255,255,0.08)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
          >
            Trouver un mecano mobile
          </button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }}>
          {SAMPLE_CASES.map((item) => (
            <span key={item} style={{ border: '1px solid rgba(255,255,255,0.18)', background: 'rgba(255,255,255,0.08)', color: '#fff', borderRadius: 999, padding: '8px 12px', fontSize: 12, fontWeight: 600 }}>
              {item}
            </span>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: 1240, margin: '0 auto', padding: '32px 32px 0' }}>
        <div style={{ background: '#fff', borderRadius: 22, padding: 28, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: '#dc2626', marginBottom: 12, fontWeight: 700 }}>Concept simple</div>
          <h2 style={{ fontSize: 30, lineHeight: 1.15, margin: '0 0 10px', color: '#111827' }}>
            Tu es en panne.
            <br />
            <span style={{ color: '#dc2626' }}>Tu cliques. Quelqu un arrive.</span>
          </h2>
          <p style={{ color: '#6b7280', fontSize: 15, lineHeight: 1.75, margin: 0 }}>
            FlashFix transforme l urgence auto en parcours ultra simple: demande, matching, intervention,
            paiement et suivi dans le meme univers FlashMat.
          </p>
        </div>
      </section>

      <section style={{ maxWidth: 1240, margin: '0 auto', padding: '28px 32px 0' }}>
        <div style={{ marginBottom: 16, fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: '#dc2626', fontWeight: 700 }}>Parcours utilisateur</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 18 }}>
          {USER_FLOW.map((item) => (
            <div key={item.step} style={{ background: '#fff', borderRadius: 20, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <div style={{ width: 36, height: 36, borderRadius: 999, background: '#fee2e2', color: '#b91c1c', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, marginBottom: 14 }}>
                {item.step}
              </div>
              <div style={{ fontSize: 17, fontWeight: 700, color: '#111827', marginBottom: 8 }}>{item.title}</div>
              <div style={{ fontSize: 14, lineHeight: 1.7, color: '#6b7280', marginBottom: 10 }}>{item.text}</div>
              <div style={{ fontSize: 12, color: '#991b1b', fontWeight: 700 }}>{item.detail}</div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: 1240, margin: '0 auto', padding: '28px 32px 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.15fr .85fr', gap: 20 }}>
          <div style={{ background: '#fff', borderRadius: 22, padding: 28, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: '#111827', marginBottom: 12, fontWeight: 700 }}>Cote mecanicien</div>
            <h3 style={{ fontSize: 28, lineHeight: 1.15, margin: '0 0 12px', color: '#111827' }}>
              Une app partenaire simple
            </h3>
            <p style={{ color: '#6b7280', fontSize: 15, lineHeight: 1.75, margin: '0 0 18px' }}>
              Le provider recoit une notif urgence, voit la distance, le prix, la localisation et le type de panne,
              puis accepte ou refuse la mission.
            </p>
            <div style={{ display: 'grid', gap: 10 }}>
              {PROVIDER_FLOW.map((item) => (
                <div key={item} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 14, padding: 14 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 999, background: '#111827', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                    ✓
                  </div>
                  <div style={{ fontSize: 14, lineHeight: 1.7, color: '#374151' }}>{item}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ background: '#111827', borderRadius: 22, padding: 28, color: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: '#fca5a5', marginBottom: 12, fontWeight: 700 }}>Prix instantane</div>
            <div style={{ display: 'grid', gap: 12 }}>
              {[
                ['Boost batterie', '40-60$'],
                ['Changement pneu', '50-80$'],
                ['Deverrouillage voiture', '45-70$'],
                ['Diagnostic rapide sur place', '60-95$'],
              ].map(([label, price]) => (
                <div key={label} style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 16, padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 14, fontWeight: 700 }}>{label}</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: '#fca5a5' }}>{price}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 16, fontSize: 13, lineHeight: 1.7, color: '#cbd5e1' }}>
              Transparence directe pour rassurer le client avant confirmation.
            </div>
          </div>
        </div>
      </section>

      <section style={{ maxWidth: 1240, margin: '0 auto', padding: '28px 32px 0' }}>
        <div style={{ marginBottom: 16, fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: '#dc2626', fontWeight: 700 }}>Services FlashFix</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
          {SERVICE_BLOCKS.map((block) => (
            <div key={block.title} style={{ background: block.bg, borderRadius: 20, padding: 24, border: '1px solid rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: block.tone, marginBottom: 12 }}>{block.title}</div>
              <div style={{ display: 'grid', gap: 8 }}>
                {block.items.map((item) => (
                  <div key={item} style={{ fontSize: 14, lineHeight: 1.7, color: '#374151' }}>
                    • {item}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ maxWidth: 1240, margin: '0 auto', padding: '28px 32px 0' }}>
        <div style={{ background: '#fff', borderRadius: 22, padding: 28, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: '#dc2626', marginBottom: 12, fontWeight: 700 }}>Ce qui rend FlashFix unique</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            {VALUE_PROPS.map((item) => (
              <div key={item.title} style={{ background: '#f8fafc', border: '1px solid #e5e7eb', borderRadius: 16, padding: 18 }}>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#111827', marginBottom: 8 }}>{item.title}</div>
                <div style={{ fontSize: 14, lineHeight: 1.7, color: '#6b7280' }}>{item.text}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section style={{ maxWidth: 1240, margin: '0 auto', padding: '28px 32px 56px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
          <div style={{ background: '#fff', borderRadius: 22, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: '#111827', marginBottom: 12, fontWeight: 700 }}>Business model</div>
            <div style={{ display: 'grid', gap: 8 }}>
              {BUSINESS_MODEL.map((item) => (
                <div key={item} style={{ fontSize: 14, lineHeight: 1.7, color: '#374151' }}>• {item}</div>
              ))}
            </div>
          </div>

          <div style={{ background: '#fff', borderRadius: 22, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: '#111827', marginBottom: 12, fontWeight: 700 }}>MVP simple</div>
            <div style={{ display: 'grid', gap: 8 }}>
              {MVP_STEPS.map((item, index) => (
                <div key={item} style={{ fontSize: 14, lineHeight: 1.7, color: '#374151' }}>{index + 1}. {item}</div>
              ))}
            </div>
          </div>

          <div style={{ background: '#fff', borderRadius: 22, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: '#111827', marginBottom: 12, fontWeight: 700 }}>Vision avancee</div>
            <div style={{ display: 'grid', gap: 8 }}>
              {VISION_ITEMS.map((item) => (
                <div key={item} style={{ fontSize: 14, lineHeight: 1.7, color: '#374151' }}>• {item}</div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ background: '#111827', borderRadius: 22, padding: 28, color: '#fff', marginTop: 20 }}>
          <div style={{ fontSize: 12, letterSpacing: 1.5, textTransform: 'uppercase', color: '#fca5a5', marginBottom: 10, fontWeight: 700 }}>Resume ultra clair</div>
          <h3 style={{ fontSize: 30, lineHeight: 1.15, margin: '0 0 12px' }}>
            FlashFix =
            <br />
            <span style={{ color: '#fca5a5' }}>Tu es en panne - tu cliques - quelqu un arrive.</span>
          </h3>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 18 }}>
            <button
              type="button"
              onClick={() => routeToUrgence('tow')}
              style={{ padding: '12px 16px', borderRadius: 10, border: 'none', background: '#ef4444', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}
            >
              Lancer FlashFix maintenant
            </button>
            <button
              type="button"
              onClick={() => navigate('/doctor')}
              style={{ padding: '12px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.16)', background: 'rgba(255,255,255,0.06)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}
            >
              Passer par le Docteur Automobile
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

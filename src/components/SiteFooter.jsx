import { useNavigate } from 'react-router-dom'

const BASE_COLUMNS = [
  {
    title: 'Explorer',
    links: [
      { label: 'Accueil', to: '/' },
      { label: 'Services', to: '/services' },
      { label: 'Providers', to: '/services/providers' },
      { label: 'Marketplace', to: '/marketplace' },
    ],
  },
  {
    title: 'Solutions',
    links: [
      { label: 'Docteur Automobile', to: '/doctor' },
      { label: 'FlashFix Urgence', to: '/urgence' },
      { label: 'Trouver un atelier', to: '/services/providers' },
      { label: 'Profil fournisseur', to: '/auth?role=provider' },
    ],
  },
  {
    title: 'Ressources',
    links: [
      { label: 'Pieces et annonces', to: '/marketplace' },
      { label: 'Entretien auto', to: '/services' },
      { label: 'Reservation client', to: '/app/client' },
      { label: 'Dashboard fournisseur', to: '/app/provider' },
    ],
  },
]

const LEGAL_LINKS = [
  'Confidentialite',
  'Conditions',
  'Accessibilite',
  'Contact',
]

export default function SiteFooter({ portal = 'public' }) {
  const navigate = useNavigate()

  const portalCard = getPortalCard(portal)
  const columns = [
    ...BASE_COLUMNS,
    {
      title: portalCard.title,
      links: portalCard.links,
    },
  ]

  function openLogin() {
    window.dispatchEvent(new CustomEvent('flashmat-login-modal-open'))
  }

  function handleLinkClick(link) {
    if (link.action === 'login') {
      openLogin()
      return
    }

    if (link.to) {
      navigate(link.to)
    }
  }

  return (
    <footer style={styles.footer}>
      <div style={styles.shell}>
        <div style={styles.topRow}>
          <div style={styles.brandBlock}>
            <img src="/logo-dark.png" alt="FlashMat" style={styles.logo} />
            <div style={styles.brandText}>
              FlashMat rassemble services, providers, diagnostic et marketplace auto dans une experience plus claire pour Montreal.
            </div>
            <div style={styles.metaRow}>
              <span style={styles.metaPill}>Montreal</span>
              <span style={styles.metaPill}>Auto Tech</span>
              <span style={styles.metaPill}>FlashFix 24/7</span>
            </div>
          </div>

          <div style={styles.helpCard}>
            <div style={styles.helpEyebrow}>Besoin d aide</div>
            <div style={styles.helpTitle}>Parlez rapidement au bon service FlashMat.</div>
            <div style={styles.helpText}>Connexion client, espace fournisseur ou urgence routiere: on vous dirige au bon endroit sans friction.</div>
            <div style={styles.helpActions}>
              <button type="button" style={styles.primaryButton} onClick={() => navigate('/urgence')}>FlashFix Urgence</button>
              <button type="button" style={styles.secondaryButton} onClick={openLogin}>Connexion</button>
            </div>
          </div>
        </div>

        <div style={styles.grid}>
          {columns.map((column) => (
            <div key={column.title}>
              <div style={styles.columnTitle}>{column.title}</div>
              <div style={styles.linkStack}>
                {column.links.map((link) => (
                  <button key={link.label} type="button" style={styles.linkButton} onClick={() => handleLinkClick(link)}>
                    {link.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div style={styles.bottomBar}>
          <div style={styles.bottomLeft}>
            <span>© 2026 FlashMat.ca</span>
            <span>514-476-1708</span>
            <span>info@flashmat.ca</span>
          </div>
          <div style={styles.bottomRight}>
            {LEGAL_LINKS.map((item) => (
              <button key={item} type="button" style={styles.legalButton}>
                {item}
              </button>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}

function getPortalCard(portal) {
  if (portal === 'client') {
    return {
      title: 'Espace client',
      links: [
        { label: 'Tableau de bord', to: '/app/client' },
        { label: 'Reservations', to: '/app/client?pane=bookings' },
        { label: 'Mes vehicules', to: '/app/client?pane=vehicles' },
        { label: 'Trouver un service', to: '/app/client?pane=search' },
      ],
    }
  }

  if (portal === 'provider') {
    return {
      title: 'Espace fournisseur',
      links: [
        { label: 'Dashboard atelier', to: '/app/provider' },
        { label: 'Reservations', to: '/app/provider?pane=p-bookings' },
        { label: 'Profil atelier', to: '/app/provider?pane=p-profile' },
        { label: 'Marketplace fournisseur', to: '/app/provider?pane=p-marketplace' },
      ],
    }
  }

  return {
    title: 'Compte FlashMat',
    links: [
      { label: 'Connexion client', action: 'login' },
      { label: 'Devenir fournisseur', to: '/auth?role=provider' },
      { label: 'Espace client', to: '/app/client' },
      { label: 'Espace fournisseur', to: '/app/provider' },
    ],
  }
}

const styles = {
  footer: {
    background: 'linear-gradient(180deg, #061826 0%, #081f31 100%)',
    color: '#d9e7f3',
    borderTop: '1px solid rgba(120,180,220,0.12)',
    marginTop: 'auto',
  },
  shell: {
    maxWidth: 1440,
    margin: '0 auto',
    padding: '44px 28px 20px',
  },
  topRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 28,
    alignItems: 'stretch',
    marginBottom: 34,
  },
  brandBlock: {
    padding: '6px 4px',
  },
  logo: {
    height: 42,
    objectFit: 'contain',
    marginBottom: 18,
  },
  brandText: {
    maxWidth: 580,
    color: 'rgba(217,231,243,0.72)',
    fontSize: 15,
    lineHeight: 1.8,
    marginBottom: 18,
  },
  metaRow: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
  },
  metaPill: {
    padding: '8px 12px',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: '.08em',
    textTransform: 'uppercase',
    color: '#9ed8ff',
    background: 'rgba(59,159,216,0.08)',
    border: '1px solid rgba(59,159,216,0.14)',
  },
  helpCard: {
    background: 'linear-gradient(135deg, rgba(10,39,65,0.92) 0%, rgba(23,76,122,0.92) 100%)',
    border: '1px solid rgba(120,180,220,0.14)',
    borderRadius: 24,
    padding: '24px 24px 22px',
    boxShadow: '0 18px 42px rgba(4,18,32,0.22)',
  },
  helpEyebrow: {
    fontSize: 11,
    letterSpacing: '.14em',
    textTransform: 'uppercase',
    fontWeight: 800,
    color: '#8fd9ff',
    marginBottom: 10,
  },
  helpTitle: {
    fontFamily: 'var(--display)',
    fontSize: 26,
    lineHeight: 1.08,
    color: '#ffffff',
    marginBottom: 12,
    letterSpacing: '-0.04em',
  },
  helpText: {
    color: 'rgba(230,242,252,0.74)',
    fontSize: 14,
    lineHeight: 1.7,
    marginBottom: 18,
  },
  helpActions: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
  },
  primaryButton: {
    border: 'none',
    borderRadius: 999,
    padding: '12px 16px',
    background: 'linear-gradient(135deg, #ff5f50 0%, #ef4444 100%)',
    color: '#fff',
    fontSize: 13,
    fontWeight: 800,
  },
  secondaryButton: {
    border: '1px solid rgba(255,255,255,0.18)',
    borderRadius: 999,
    padding: '12px 16px',
    background: 'rgba(255,255,255,0.06)',
    color: '#fff',
    fontSize: 13,
    fontWeight: 700,
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
    gap: 28,
    padding: '10px 0 28px',
  },
  columnTitle: {
    fontSize: 14,
    fontWeight: 800,
    color: '#ffffff',
    marginBottom: 14,
  },
  linkStack: {
    display: 'grid',
    gap: 10,
  },
  linkButton: {
    border: 'none',
    background: 'transparent',
    color: 'rgba(217,231,243,0.74)',
    fontSize: 14,
    textAlign: 'left',
    padding: 0,
  },
  bottomBar: {
    borderTop: '1px solid rgba(120,180,220,0.12)',
    paddingTop: 16,
    display: 'flex',
    justifyContent: 'space-between',
    gap: 18,
    flexWrap: 'wrap',
  },
  bottomLeft: {
    display: 'flex',
    gap: 16,
    flexWrap: 'wrap',
    color: 'rgba(217,231,243,0.56)',
    fontSize: 12,
  },
  bottomRight: {
    display: 'flex',
    gap: 14,
    flexWrap: 'wrap',
  },
  legalButton: {
    border: 'none',
    background: 'transparent',
    color: 'rgba(217,231,243,0.56)',
    fontSize: 12,
    padding: 0,
  },
}

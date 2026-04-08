import { useNavigate } from 'react-router-dom'
import NavBar from '../components/NavBar'
import SiteFooter from '../components/SiteFooter'

const COMMUNITY_PILLARS = [
  {
    title: 'Provider stories',
    text: 'See how Montreal shops use FlashMat to earn recurring bookings, build trust, and publish a stronger public profile.',
  },
  {
    title: 'Client guidance',
    text: 'Learn how to book the right service, compare shops, prepare for appointments, and maintain your vehicle with more confidence.',
  },
  {
    title: 'Local network',
    text: 'Stay connected to events, featured providers, product highlights, and the people building the FlashMat auto community.',
  },
]

const COMMUNITY_STREAM = [
  {
    label: 'Featured provider',
    title: 'Montreal shops building better public profiles',
    text: 'Best practices for staff presentation, reviews, services, and trust signals that help clients choose faster.',
  },
  {
    label: 'Client education',
    title: 'What to prepare before booking a service',
    text: 'Mileage, VIN, symptoms, vehicle photos, and clear expectations all help the right provider respond more accurately.',
  },
  {
    label: 'Marketplace culture',
    title: 'How FlashMat connects services, parts, and vehicle sales',
    text: 'The ecosystem works best when shops, drivers, and listings feel connected rather than scattered across disconnected pages.',
  },
]

export default function Community() {
  const navigate = useNavigate()

  return (
    <div style={styles.page}>
      <NavBar activePage="community" />

      <main style={styles.main}>
        <section style={styles.hero}>
          <div style={styles.heroCopy}>
            <div style={styles.eyebrow}>FlashMat Community</div>
            <h1 style={styles.title}>The community around auto care in Montreal.</h1>
            <p style={styles.subtitle}>
              Stories, guides, provider spotlights, and practical knowledge to make FlashMat feel more human, more useful, and more connected.
            </p>
            <div style={styles.heroActions}>
              <button type="button" style={styles.primaryButton} onClick={() => navigate('/providers')}>
                Explore providers
              </button>
              <button type="button" style={styles.secondaryButton} onClick={() => navigate('/services')}>
                Browse services
              </button>
            </div>
          </div>

          <div style={styles.heroPanel}>
            <div style={styles.heroPanelTop}>
              <span style={styles.heroBadge}>Live on FlashMat</span>
              <span style={styles.heroMiniStat}>Montreal · Auto Tech</span>
            </div>
            <div style={styles.heroStats}>
              <article style={styles.statCard}>
                <strong style={styles.statValue}>200+</strong>
                <span style={styles.statLabel}>providers visible across the platform</span>
              </article>
              <article style={styles.statCard}>
                <strong style={styles.statValue}>3</strong>
                <span style={styles.statLabel}>core marketplace pillars: services, parts, vehicles</span>
              </article>
            </div>
            <div style={styles.heroPanelFoot}>
              Community helps FlashMat feel less transactional and more trustworthy across clients and providers.
            </div>
          </div>
        </section>

        <section style={styles.section}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionEyebrow}>What lives here</div>
            <h2 style={styles.sectionTitle}>A clearer community layer for the platform.</h2>
          </div>
          <div style={styles.pillarGrid}>
            {COMMUNITY_PILLARS.map((item) => (
              <article key={item.title} style={styles.pillarCard}>
                <h3 style={styles.pillarTitle}>{item.title}</h3>
                <p style={styles.pillarText}>{item.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section style={styles.streamSection}>
          <div style={styles.sectionHeader}>
            <div style={styles.sectionEyebrow}>Editorial stream</div>
            <h2 style={styles.sectionTitle}>Designed to grow into stories, updates, and education.</h2>
          </div>
          <div style={styles.streamGrid}>
            {COMMUNITY_STREAM.map((item) => (
              <article key={item.title} style={styles.streamCard}>
                <div style={styles.streamLabel}>{item.label}</div>
                <h3 style={styles.streamTitle}>{item.title}</h3>
                <p style={styles.streamText}>{item.text}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter portal="public" />
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(180deg, #edf4fb 0%, #f7fbff 42%, #ffffff 100%)',
    fontFamily: 'var(--font)',
    color: 'var(--ink)',
  },
  main: {
    maxWidth: 1440,
    margin: '0 auto',
    padding: '28px 20px 0',
  },
  hero: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.15fr) minmax(320px, 0.85fr)',
    gap: 22,
    alignItems: 'stretch',
    marginBottom: 24,
  },
  heroCopy: {
    background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(245,250,255,0.98) 100%)',
    border: '1px solid rgba(120,171,218,0.22)',
    borderRadius: 28,
    padding: '34px 34px 30px',
    boxShadow: '0 20px 50px rgba(19,54,92,0.08)',
  },
  eyebrow: {
    fontSize: 12,
    letterSpacing: '.18em',
    textTransform: 'uppercase',
    color: 'var(--blue)',
    fontWeight: 800,
    marginBottom: 14,
  },
  title: {
    margin: '0 0 16px',
    fontFamily: 'var(--display)',
    fontSize: 'clamp(2.5rem, 4vw, 4.2rem)',
    lineHeight: 0.98,
    letterSpacing: '-0.06em',
    color: '#11253e',
  },
  subtitle: {
    margin: '0 0 22px',
    maxWidth: 720,
    fontSize: 17,
    lineHeight: 1.7,
    color: 'var(--ink2)',
  },
  heroActions: {
    display: 'flex',
    gap: 12,
    flexWrap: 'wrap',
  },
  primaryButton: {
    border: 'none',
    borderRadius: 999,
    padding: '13px 18px',
    background: 'linear-gradient(135deg, #0e2b4a 0%, #154779 100%)',
    color: '#fff',
    fontWeight: 800,
    fontSize: 14,
    cursor: 'pointer',
  },
  secondaryButton: {
    border: '1px solid rgba(16,71,121,0.16)',
    borderRadius: 999,
    padding: '13px 18px',
    background: 'rgba(255,255,255,0.92)',
    color: '#154779',
    fontWeight: 800,
    fontSize: 14,
    cursor: 'pointer',
  },
  heroPanel: {
    borderRadius: 28,
    padding: 22,
    background: 'linear-gradient(145deg, rgba(8,28,49,0.96) 0%, rgba(18,71,121,0.92) 100%)',
    color: '#eaf5ff',
    boxShadow: '0 24px 54px rgba(10,28,45,0.18)',
    border: '1px solid rgba(120,180,220,0.16)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    minHeight: 280,
  },
  heroPanelTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
    marginBottom: 18,
  },
  heroBadge: {
    padding: '8px 12px',
    borderRadius: 999,
    background: 'rgba(255,255,255,0.1)',
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: '.12em',
    textTransform: 'uppercase',
  },
  heroMiniStat: {
    fontSize: 12,
    color: 'rgba(234,245,255,0.72)',
    fontWeight: 700,
  },
  heroStats: {
    display: 'grid',
    gap: 12,
  },
  statCard: {
    background: 'rgba(255,255,255,0.06)',
    borderRadius: 22,
    border: '1px solid rgba(255,255,255,0.08)',
    padding: '16px 18px',
    display: 'grid',
    gap: 6,
  },
  statValue: {
    fontFamily: 'var(--display)',
    fontSize: 34,
    lineHeight: 1,
    letterSpacing: '-0.05em',
  },
  statLabel: {
    fontSize: 13,
    lineHeight: 1.6,
    color: 'rgba(234,245,255,0.78)',
  },
  heroPanelFoot: {
    marginTop: 18,
    paddingTop: 16,
    borderTop: '1px solid rgba(255,255,255,0.08)',
    fontSize: 13,
    lineHeight: 1.7,
    color: 'rgba(234,245,255,0.72)',
  },
  section: {
    marginBottom: 24,
    background: 'rgba(255,255,255,0.92)',
    borderRadius: 28,
    border: '1px solid rgba(120,171,218,0.16)',
    boxShadow: '0 16px 40px rgba(19,54,92,0.06)',
    padding: '28px 28px 30px',
  },
  streamSection: {
    marginBottom: 12,
    background: 'rgba(255,255,255,0.92)',
    borderRadius: 28,
    border: '1px solid rgba(120,171,218,0.16)',
    boxShadow: '0 16px 40px rgba(19,54,92,0.06)',
    padding: '28px 28px 30px',
  },
  sectionHeader: {
    marginBottom: 20,
  },
  sectionEyebrow: {
    fontSize: 11,
    letterSpacing: '.16em',
    textTransform: 'uppercase',
    color: 'var(--blue)',
    fontWeight: 800,
    marginBottom: 8,
  },
  sectionTitle: {
    margin: 0,
    fontFamily: 'var(--display)',
    fontSize: 30,
    lineHeight: 1.02,
    letterSpacing: '-0.05em',
    color: '#102743',
  },
  pillarGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: 16,
  },
  pillarCard: {
    borderRadius: 22,
    padding: '20px 20px 18px',
    background: 'linear-gradient(180deg, #f6fbff 0%, #edf6ff 100%)',
    border: '1px solid rgba(120,171,218,0.16)',
  },
  pillarTitle: {
    margin: '0 0 10px',
    fontFamily: 'var(--display)',
    fontSize: 24,
    lineHeight: 1.06,
    letterSpacing: '-0.05em',
    color: '#123052',
  },
  pillarText: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.75,
    color: 'var(--ink2)',
  },
  streamGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 16,
  },
  streamCard: {
    borderRadius: 24,
    padding: '22px 22px 20px',
    background: '#ffffff',
    border: '1px solid rgba(120,171,218,0.16)',
    boxShadow: '0 12px 28px rgba(19,54,92,0.06)',
  },
  streamLabel: {
    display: 'inline-flex',
    padding: '7px 11px',
    borderRadius: 999,
    marginBottom: 12,
    background: 'rgba(59,159,216,0.08)',
    color: '#1d6da1',
    fontSize: 11,
    letterSpacing: '.12em',
    textTransform: 'uppercase',
    fontWeight: 800,
  },
  streamTitle: {
    margin: '0 0 10px',
    fontFamily: 'var(--display)',
    fontSize: 25,
    lineHeight: 1.08,
    letterSpacing: '-0.05em',
    color: '#132c48',
  },
  streamText: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.75,
    color: 'var(--ink2)',
  },
}

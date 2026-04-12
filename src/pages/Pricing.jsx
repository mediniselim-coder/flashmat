import { useNavigate } from 'react-router-dom'
import NavBar from '../components/NavBar'
import SiteFooter from '../components/SiteFooter'

const PLANS = [
  {
    name: 'Client',
    price: 'Free',
    description: 'Ideal for drivers who want to book, track vehicles, and compare trusted providers with a smoother experience.',
    features: ['Vehicle garage', 'Bookings and service history', 'Public marketplace access', 'FlashFix request flow'],
    cta: 'Start as a client',
    to: '/auth',
    accent: 'linear-gradient(135deg, #f7fbff 0%, #eef6ff 100%)',
  },
  {
    name: 'Provider Starter',
    price: '$49',
    period: '/month',
    description: 'For providers who want a public profile, staff presentation, service selection, and marketplace visibility.',
    features: ['Provider profile', 'My Services setup', 'Public reviews', 'Staff member presentation'],
    cta: 'Become a provider',
    to: '/auth?role=provider',
    featured: true,
    accent: 'linear-gradient(145deg, rgba(8,28,49,0.98) 0%, rgba(18,71,121,0.95) 100%)',
  },
  {
    name: 'Provider Growth',
    price: '$129',
    period: '/month',
    description: 'For providers who want more reach, more operational structure, and stronger conversion across FlashMat.',
    features: ['Promotions tools', 'Priority marketplace placement', 'Advanced pricing visibility', 'Operational dashboard flows'],
    cta: 'Talk to FlashMat',
    to: '/providers',
    accent: 'linear-gradient(135deg, #f7fbff 0%, #eef6ff 100%)',
  },
]

const FAQS = [
  {
    question: 'Do clients need to pay to use FlashMat?',
    answer: 'No. Clients can create an account, add vehicles, compare providers, and book services without a subscription.',
  },
  {
    question: 'Can a provider choose only specific services?',
    answer: 'Yes. Providers select their main business types first, then activate only the compatible sub-services they truly offer.',
  },
  {
    question: 'Does pricing affect FlashFix?',
    answer: 'FlashFix remains an urgency-focused flow. Response speed and service availability still depend on provider coverage and schedules.',
  },
]

export default function Pricing() {
  const navigate = useNavigate()

  return (
    <div style={styles.page}>
      <NavBar activePage="pricing" />

      <main style={styles.main}>
        <section style={styles.hero}>
          <div style={styles.heroCopy}>
            <div style={styles.eyebrow}>FlashMat Pricing</div>
            <h1 style={styles.title}>Choose the plan that fits your role.</h1>
            <p style={styles.subtitle}>
              Clean pricing built around bookings, provider visibility, and the FlashMat marketplace.
            </p>
          </div>
          <div style={styles.heroToggle}>
            <button type="button" style={styles.toggleActive}>Particuliers</button>
            <button type="button" style={styles.toggleIdle}>Business</button>
          </div>
        </section>

        <section style={styles.planGrid}>
          {PLANS.map((plan) => {
            const featured = Boolean(plan.featured)
            return (
              <article
                key={plan.name}
                style={{
                  ...styles.planCard,
                  border: featured ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(255,255,255,0.08)',
                  boxShadow: featured ? '0 24px 60px rgba(0,0,0,0.4)' : '0 18px 40px rgba(0,0,0,0.3)',
                }}
              >
                {featured ? <div style={styles.featuredTag}>Recommended</div> : null}
                <div style={styles.planName}>{plan.name}</div>
                <div style={styles.planPriceRow}>
                  <span style={styles.planPrice}>{plan.price}</span>
                  {plan.period ? <span style={styles.planPeriod}>{plan.period}</span> : null}
                </div>
                <p style={styles.planDescription}>{plan.description}</p>
                <ul style={styles.featureList}>
                  {plan.features.map((feature) => (
                    <li key={feature} style={styles.featureItem}>
                      {feature}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  style={featured ? styles.primaryFeaturedButton : styles.primaryButton}
                  onClick={() => navigate(plan.to)}
                >
                  {plan.cta}
                </button>
              </article>
            )
          })}
        </section>

        <section style={styles.faqSection}>
          <div style={styles.sectionEyebrow}>Pricing FAQ</div>
          <div style={styles.faqGrid}>
            {FAQS.map((item) => (
              <article key={item.question} style={styles.faqCard}>
                <h3 style={styles.faqQuestion}>{item.question}</h3>
                <p style={styles.faqAnswer}>{item.answer}</p>
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
    background: 'linear-gradient(180deg, #eef5fb 0%, #f7fbff 45%, #ffffff 100%)',
    fontFamily: 'var(--font)',
    color: 'var(--ink)',
  },
  main: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '40px 20px 0',
  },
  hero: {
    display: 'grid',
    justifyItems: 'center',
    textAlign: 'center',
    gap: 16,
    marginBottom: 32,
  },
  heroCopy: {
    maxWidth: 680,
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
    margin: '0 0 14px',
    fontFamily: 'var(--display)',
    fontSize: 'clamp(2.2rem, 4vw, 3.4rem)',
    lineHeight: 1.1,
    letterSpacing: '-0.04em',
  },
  subtitle: {
    margin: 0,
    fontSize: 16,
    lineHeight: 1.7,
    color: 'var(--ink2)',
  },
  heroToggle: {
    display: 'inline-flex',
    gap: 6,
    padding: 6,
    background: 'rgba(8,34,55,0.08)',
    borderRadius: 999,
    border: '1px solid rgba(120,171,218,0.18)',
  },
  toggleActive: {
    border: 'none',
    borderRadius: 999,
    padding: '8px 16px',
    background: '#0f1f3a',
    color: '#fff',
    fontWeight: 700,
    fontSize: 12,
    cursor: 'pointer',
  },
  toggleIdle: {
    border: 'none',
    borderRadius: 999,
    padding: '8px 16px',
    background: 'transparent',
    color: 'var(--ink2)',
    fontWeight: 700,
    fontSize: 12,
    cursor: 'pointer',
  },
  planGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 16,
    marginBottom: 28,
  },
  planCard: {
    borderRadius: 20,
    padding: '22px 22px 20px',
    display: 'flex',
    flexDirection: 'column',
    background: 'rgba(255,255,255,0.94)',
  },
  featuredTag: {
    alignSelf: 'flex-start',
    padding: '6px 10px',
    borderRadius: 999,
    marginBottom: 14,
    background: 'rgba(37,99,235,0.12)',
    color: '#1d4ed8',
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: '.12em',
    textTransform: 'uppercase',
  },
  planName: {
    fontFamily: 'var(--display)',
    fontSize: 24,
    lineHeight: 1,
    letterSpacing: '-0.05em',
    marginBottom: 10,
  },
  planPriceRow: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 12,
  },
  planPrice: {
    fontFamily: 'var(--display)',
    fontSize: 36,
    lineHeight: 1,
    letterSpacing: '-0.06em',
  },
  planPeriod: {
    fontSize: 13,
    color: 'var(--ink3)',
    marginBottom: 5,
  },
  planDescription: {
    margin: '0 0 14px',
    fontSize: 14,
    lineHeight: 1.75,
    color: 'var(--ink2)',
  },
  featureList: {
    listStyle: 'none',
    padding: 0,
    margin: '0 0 18px',
    display: 'grid',
    gap: 8,
    flex: 1,
  },
  featureItem: {
    padding: '10px 12px',
    borderRadius: 12,
    background: 'rgba(8,34,55,0.04)',
    border: '1px solid rgba(120,171,218,0.16)',
    fontSize: 13,
    lineHeight: 1.55,
    color: 'var(--ink2)',
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
    alignSelf: 'flex-start',
  },
  primaryFeaturedButton: {
    border: 'none',
    borderRadius: 999,
    padding: '13px 18px',
    background: '#0f1f3a',
    color: '#fff',
    fontWeight: 800,
    fontSize: 14,
    cursor: 'pointer',
    alignSelf: 'flex-start',
  },
  faqSection: {
    borderRadius: 18,
    border: '1px solid rgba(120,171,218,0.16)',
    background: 'rgba(255,255,255,0.94)',
    padding: '20px 20px 22px',
    marginBottom: 32,
  },
  sectionEyebrow: {
    fontSize: 10,
    letterSpacing: '.16em',
    textTransform: 'uppercase',
    color: 'var(--blue)',
    fontWeight: 800,
    marginBottom: 8,
  },
  faqGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: 12,
  },
  faqCard: {
    borderRadius: 14,
    padding: '16px',
    background: 'rgba(8,34,55,0.04)',
    border: '1px solid rgba(120,171,218,0.16)',
  },
  faqQuestion: {
    margin: '0 0 10px',
    fontFamily: 'var(--display)',
    fontSize: 18,
    lineHeight: 1.08,
    letterSpacing: '-0.05em',
    color: '#123052',
  },
  faqAnswer: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.75,
    color: 'var(--ink2)',
  },
}

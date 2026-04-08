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
            <h1 style={styles.title}>Simple pricing for clients and providers.</h1>
            <p style={styles.subtitle}>
              Clear value, no confusing stack of tools, and a structure that supports bookings, provider visibility, and future growth.
            </p>
          </div>
          <div style={styles.heroAside}>
            <div style={styles.asideStat}>
              <strong style={styles.asideValue}>3</strong>
              <span style={styles.asideLabel}>pricing tracks designed around the platform</span>
            </div>
            <div style={styles.asideStat}>
              <strong style={styles.asideValue}>200+</strong>
              <span style={styles.asideLabel}>providers already visible across Montreal</span>
            </div>
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
                  background: plan.accent,
                  color: featured ? '#eef8ff' : 'var(--ink)',
                  border: featured ? '1px solid rgba(120,180,220,0.18)' : '1px solid rgba(120,171,218,0.16)',
                  boxShadow: featured ? '0 28px 60px rgba(10,28,45,0.18)' : '0 18px 42px rgba(19,54,92,0.08)',
                }}
              >
                {featured ? <div style={styles.featuredTag}>Recommended</div> : null}
                <div style={styles.planName}>{plan.name}</div>
                <div style={styles.planPriceRow}>
                  <span style={styles.planPrice}>{plan.price}</span>
                  {plan.period ? <span style={featured ? styles.planPeriodFeatured : styles.planPeriod}>{plan.period}</span> : null}
                </div>
                <p style={featured ? styles.planDescriptionFeatured : styles.planDescription}>{plan.description}</p>
                <ul style={styles.featureList}>
                  {plan.features.map((feature) => (
                    <li key={feature} style={featured ? styles.featureItemFeatured : styles.featureItem}>
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
          <h2 style={styles.sectionTitle}>Built to stay readable as FlashMat grows.</h2>
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
    background: 'linear-gradient(180deg, #eef5fb 0%, #f8fbff 40%, #ffffff 100%)',
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
    gridTemplateColumns: 'minmax(0, 1.1fr) minmax(280px, 0.7fr)',
    gap: 22,
    alignItems: 'stretch',
    marginBottom: 24,
  },
  heroCopy: {
    background: 'linear-gradient(180deg, rgba(255,255,255,0.98) 0%, rgba(246,250,255,0.98) 100%)',
    borderRadius: 28,
    padding: '34px 34px 30px',
    border: '1px solid rgba(120,171,218,0.18)',
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
    margin: '0 0 14px',
    fontFamily: 'var(--display)',
    fontSize: 'clamp(2.4rem, 4vw, 4rem)',
    lineHeight: 1,
    letterSpacing: '-0.06em',
    color: '#11253e',
  },
  subtitle: {
    margin: 0,
    maxWidth: 760,
    fontSize: 17,
    lineHeight: 1.7,
    color: 'var(--ink2)',
  },
  heroAside: {
    borderRadius: 28,
    padding: 22,
    background: 'linear-gradient(145deg, rgba(8,28,49,0.96) 0%, rgba(18,71,121,0.9) 100%)',
    color: '#eaf5ff',
    display: 'grid',
    gap: 14,
    border: '1px solid rgba(120,180,220,0.16)',
    boxShadow: '0 24px 54px rgba(10,28,45,0.16)',
  },
  asideStat: {
    borderRadius: 22,
    padding: '18px 18px 16px',
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.08)',
    display: 'grid',
    gap: 6,
  },
  asideValue: {
    fontFamily: 'var(--display)',
    fontSize: 34,
    lineHeight: 1,
    letterSpacing: '-0.05em',
  },
  asideLabel: {
    fontSize: 13,
    lineHeight: 1.6,
    color: 'rgba(234,245,255,0.76)',
  },
  planGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
    gap: 18,
    marginBottom: 24,
  },
  planCard: {
    borderRadius: 28,
    padding: '24px 24px 22px',
    display: 'flex',
    flexDirection: 'column',
  },
  featuredTag: {
    alignSelf: 'flex-start',
    padding: '7px 11px',
    borderRadius: 999,
    marginBottom: 14,
    background: 'rgba(255,255,255,0.12)',
    color: '#bde9ff',
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: '.12em',
    textTransform: 'uppercase',
  },
  planName: {
    fontFamily: 'var(--display)',
    fontSize: 29,
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
    fontSize: 42,
    lineHeight: 1,
    letterSpacing: '-0.06em',
  },
  planPeriod: {
    fontSize: 14,
    color: 'var(--ink3)',
    marginBottom: 5,
  },
  planPeriodFeatured: {
    fontSize: 14,
    color: 'rgba(234,245,255,0.74)',
    marginBottom: 5,
  },
  planDescription: {
    margin: '0 0 14px',
    fontSize: 14,
    lineHeight: 1.75,
    color: 'var(--ink2)',
  },
  planDescriptionFeatured: {
    margin: '0 0 14px',
    fontSize: 14,
    lineHeight: 1.75,
    color: 'rgba(234,245,255,0.78)',
  },
  featureList: {
    listStyle: 'none',
    padding: 0,
    margin: '0 0 18px',
    display: 'grid',
    gap: 10,
    flex: 1,
  },
  featureItem: {
    padding: '11px 13px',
    borderRadius: 16,
    background: 'rgba(14,43,74,0.04)',
    border: '1px solid rgba(120,171,218,0.16)',
    fontSize: 13,
    lineHeight: 1.55,
    color: 'var(--ink2)',
  },
  featureItemFeatured: {
    padding: '11px 13px',
    borderRadius: 16,
    background: 'rgba(255,255,255,0.07)',
    border: '1px solid rgba(255,255,255,0.1)',
    fontSize: 13,
    lineHeight: 1.55,
    color: 'rgba(234,245,255,0.82)',
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
    background: '#ffffff',
    color: '#143b63',
    fontWeight: 800,
    fontSize: 14,
    cursor: 'pointer',
    alignSelf: 'flex-start',
  },
  faqSection: {
    background: 'rgba(255,255,255,0.92)',
    borderRadius: 28,
    border: '1px solid rgba(120,171,218,0.16)',
    boxShadow: '0 16px 40px rgba(19,54,92,0.06)',
    padding: '28px 28px 30px',
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
    margin: '0 0 18px',
    fontFamily: 'var(--display)',
    fontSize: 30,
    lineHeight: 1.04,
    letterSpacing: '-0.05em',
    color: '#102743',
  },
  faqGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
    gap: 16,
  },
  faqCard: {
    borderRadius: 22,
    padding: '20px 20px 18px',
    background: 'linear-gradient(180deg, #f7fbff 0%, #edf6ff 100%)',
    border: '1px solid rgba(120,171,218,0.16)',
  },
  faqQuestion: {
    margin: '0 0 10px',
    fontFamily: 'var(--display)',
    fontSize: 22,
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

import { useState } from 'react'
import NavBar from '../components/NavBar'
import SiteFooter from '../components/SiteFooter'

const CONTACT_CHANNELS = [
  {
    title: 'General support',
    value: 'info@flashmat.ca',
    description: 'Questions about the platform, account access, or how to use FlashMat.',
  },
  {
    title: 'FlashFix urgency',
    value: '514-476-1708',
    description: 'For urgent roadside coordination and high-priority support requests.',
  },
  {
    title: 'Provider partnerships',
    value: 'providers@flashmat.ca',
    description: 'For garages, detailers, parts sellers, and provider onboarding conversations.',
  },
]

const FAQS = [
  'Client account and booking help',
  'Provider onboarding and public profile setup',
  'Marketplace questions and listing support',
  'FlashFix urgency requests and operational follow-up',
]

export default function Contact() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    topic: 'General support',
    message: '',
  })
  const [submitted, setSubmitted] = useState(false)

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  function handleSubmit(event) {
    event.preventDefault()
    setSubmitted(true)
  }

  return (
    <div style={styles.page}>
      <NavBar activePage="contact" />

      <main style={styles.main}>
        <section style={styles.hero}>
          <div style={styles.heroCopy}>
            <div style={styles.eyebrow}>FlashMat Contact</div>
            <h1 style={styles.title}>Talk to the right FlashMat team quickly.</h1>
            <p style={styles.subtitle}>
              For client help, provider onboarding, marketplace questions, or urgent operational support, use the route that matches your need.
            </p>
          </div>
        </section>

        <section style={styles.layout}>
          <div style={styles.leftColumn}>
            <div style={styles.card}>
              <div style={styles.sectionEyebrow}>Channels</div>
              <h2 style={styles.sectionTitle}>Choose the most direct path.</h2>
              <div style={styles.channelGrid}>
                {CONTACT_CHANNELS.map((item) => (
                  <article key={item.title} style={styles.channelCard}>
                    <h3 style={styles.channelTitle}>{item.title}</h3>
                    <div style={styles.channelValue}>{item.value}</div>
                    <p style={styles.channelText}>{item.description}</p>
                  </article>
                ))}
              </div>
            </div>

            <div style={styles.card}>
              <div style={styles.sectionEyebrow}>Common topics</div>
              <h2 style={styles.sectionTitle}>What the team usually helps with.</h2>
              <div style={styles.topicList}>
                {FAQS.map((item) => (
                  <div key={item} style={styles.topicPill}>{item}</div>
                ))}
              </div>
            </div>
          </div>

          <div style={styles.formCard}>
            <div style={styles.sectionEyebrow}>Contact form</div>
            <h2 style={styles.sectionTitle}>Send a message to FlashMat.</h2>
            <p style={styles.formIntro}>
              This form is a guided contact entry for now, designed to match the platform and prepare a future connected support workflow.
            </p>

            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.formGrid}>
                <label style={styles.field}>
                  <span style={styles.label}>Full name</span>
                  <input value={form.name} onChange={(e) => updateField('name', e.target.value)} style={styles.input} placeholder="Your name" />
                </label>
                <label style={styles.field}>
                  <span style={styles.label}>Email</span>
                  <input value={form.email} onChange={(e) => updateField('email', e.target.value)} style={styles.input} placeholder="you@example.com" />
                </label>
                <label style={styles.field}>
                  <span style={styles.label}>Phone</span>
                  <input value={form.phone} onChange={(e) => updateField('phone', e.target.value)} style={styles.input} placeholder="514-555-0000" />
                </label>
                <label style={styles.field}>
                  <span style={styles.label}>Topic</span>
                  <select value={form.topic} onChange={(e) => updateField('topic', e.target.value)} style={styles.input}>
                    <option>General support</option>
                    <option>Client booking help</option>
                    <option>Provider onboarding</option>
                    <option>Marketplace support</option>
                    <option>FlashFix urgency</option>
                  </select>
                </label>
              </div>

              <label style={styles.field}>
                <span style={styles.label}>Message</span>
                <textarea
                  value={form.message}
                  onChange={(e) => updateField('message', e.target.value)}
                  style={styles.textarea}
                  placeholder="Tell FlashMat what you need and we will direct it to the right team."
                />
              </label>

              {submitted ? (
                <div style={styles.successBox}>
                  Message captured. This contact page is now connected in the app flow, and the next step can be wiring this form to Supabase or a support inbox.
                </div>
              ) : null}

              <button type="submit" style={styles.primaryButton}>Send message</button>
            </form>
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
    gridTemplateColumns: 'minmax(0, 1fr)',
    gap: 22,
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
    margin: '0 0 14px',
    fontFamily: 'var(--display)',
    fontSize: 'clamp(2.4rem, 4vw, 4rem)',
    lineHeight: 1,
    letterSpacing: '-0.06em',
    color: '#11253e',
  },
  subtitle: {
    margin: 0,
    fontSize: 17,
    lineHeight: 1.7,
    color: 'var(--ink2)',
    maxWidth: 760,
  },
  layout: {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 0.95fr) minmax(320px, 0.85fr)',
    gap: 22,
  },
  leftColumn: {
    display: 'grid',
    gap: 22,
  },
  card: {
    background: 'rgba(255,255,255,0.92)',
    borderRadius: 28,
    border: '1px solid rgba(120,171,218,0.16)',
    boxShadow: '0 16px 40px rgba(19,54,92,0.06)',
    padding: '28px 28px 30px',
  },
  formCard: {
    background: 'rgba(255,255,255,0.92)',
    borderRadius: 28,
    border: '1px solid rgba(120,171,218,0.16)',
    boxShadow: '0 16px 40px rgba(19,54,92,0.06)',
    padding: '28px 28px 30px',
    alignSelf: 'start',
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
  channelGrid: {
    display: 'grid',
    gap: 14,
  },
  channelCard: {
    borderRadius: 22,
    padding: '18px 18px 16px',
    background: 'linear-gradient(180deg, #f7fbff 0%, #edf6ff 100%)',
    border: '1px solid rgba(120,171,218,0.16)',
  },
  channelTitle: {
    margin: '0 0 8px',
    fontFamily: 'var(--display)',
    fontSize: 22,
    lineHeight: 1.06,
    color: '#123052',
  },
  channelValue: {
    marginBottom: 8,
    fontSize: 18,
    fontWeight: 800,
    color: '#154779',
  },
  channelText: {
    margin: 0,
    fontSize: 14,
    lineHeight: 1.7,
    color: 'var(--ink2)',
  },
  topicList: {
    display: 'flex',
    gap: 10,
    flexWrap: 'wrap',
  },
  topicPill: {
    padding: '10px 14px',
    borderRadius: 999,
    background: 'rgba(59,159,216,0.08)',
    border: '1px solid rgba(59,159,216,0.14)',
    color: '#1d6da1',
    fontSize: 13,
    fontWeight: 700,
  },
  formIntro: {
    margin: '0 0 18px',
    fontSize: 14,
    lineHeight: 1.75,
    color: 'var(--ink2)',
  },
  form: {
    display: 'grid',
    gap: 16,
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: 14,
  },
  field: {
    display: 'grid',
    gap: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: '.12em',
    textTransform: 'uppercase',
    color: 'var(--ink3)',
  },
  input: {
    width: '100%',
    boxSizing: 'border-box',
    borderRadius: 14,
    border: '1px solid rgba(120,171,218,0.22)',
    background: '#eef5ff',
    padding: '13px 14px',
    fontSize: 14,
    color: '#15314f',
    outline: 'none',
    fontFamily: 'var(--font)',
  },
  textarea: {
    width: '100%',
    minHeight: 150,
    boxSizing: 'border-box',
    resize: 'vertical',
    borderRadius: 18,
    border: '1px solid rgba(120,171,218,0.22)',
    background: '#eef5ff',
    padding: '14px 14px',
    fontSize: 14,
    color: '#15314f',
    outline: 'none',
    fontFamily: 'var(--font)',
    lineHeight: 1.7,
  },
  successBox: {
    borderRadius: 18,
    padding: '14px 16px',
    background: 'rgba(59,159,216,0.08)',
    border: '1px solid rgba(59,159,216,0.14)',
    color: '#1d6da1',
    fontSize: 14,
    lineHeight: 1.7,
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
    justifySelf: 'start',
  },
}

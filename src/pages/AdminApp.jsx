import NavBar from '../components/NavBar'
import SiteFooter from '../components/SiteFooter'
import { useAuth } from '../hooks/useAuth'

const QUICK_ACTIONS = [
  ['Review providers', '/providers'],
  ['Open marketplace', '/marketplace'],
  ['Read community feed', '/community'],
  ['Support inbox', '/messages'],
]

export default function AdminApp() {
  const { profile } = useAuth()
  const displayName = profile?.full_name || 'FlashMat Admin'

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #edf4fb 0%, #f6f9ff 100%)', fontFamily: 'var(--font)' }}>
      <NavBar activePage={null} />

      <main style={{ maxWidth: 1440, margin: '0 auto', padding: '28px 24px 48px' }}>
        <section style={{ borderRadius: 28, padding: '34px 30px', background: 'linear-gradient(135deg, #081f31 0%, #113357 56%, #1f4ca4 100%)', color: '#fff', boxShadow: '0 26px 60px rgba(10, 28, 49, 0.16)', marginBottom: 22 }}>
          <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 1.8, textTransform: 'uppercase', color: 'rgba(140, 220, 255, 0.88)', marginBottom: 14 }}>
            FlashMat Admin
          </div>
          <h1 style={{ margin: 0, fontFamily: 'var(--display)', fontSize: 48, lineHeight: 0.96, letterSpacing: '-0.06em', maxWidth: 720 }}>
            Platform control room for {displayName}.
          </h1>
          <p style={{ maxWidth: 760, margin: '16px 0 0', fontSize: 16, lineHeight: 1.85, color: 'rgba(234, 244, 255, 0.78)' }}>
            This new account category is reserved for FlashMat platform management. Use it to supervise marketplace activity,
            provider visibility, community signals, and support operations from one dedicated admin space.
          </p>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(320px, 0.9fr)', gap: 18, alignItems: 'start' }}>
          <div style={{ display: 'grid', gap: 18 }}>
            <div className="panel">
              <div className="panel-hd"><div className="panel-title">Admin overview</div></div>
              <div className="panel-body" style={{ display: 'grid', gap: 14 }}>
                <div style={{ borderRadius: 18, border: '1px solid var(--border)', background: 'var(--bg3)', padding: '18px 20px' }}>
                  <div style={{ fontSize: 13, color: 'var(--ink3)', marginBottom: 8 }}>Account category</div>
                  <div style={{ fontFamily: 'var(--display)', fontSize: 28, fontWeight: 800, color: 'var(--ink)' }}>FlashMat Admin</div>
                </div>
                <div style={{ borderRadius: 18, border: '1px solid var(--border)', background: '#fff', padding: '18px 20px', color: 'var(--ink2)', lineHeight: 1.8 }}>
                  The admin space is ready for platform supervision. As more moderation and operations tools are added,
                  this role will be the protected entry point for managing the FlashMat ecosystem.
                </div>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-hd"><div className="panel-title">Quick actions</div></div>
            <div className="panel-body" style={{ display: 'grid', gap: 10 }}>
              {QUICK_ACTIONS.map(([label, href]) => (
                <a
                  key={label}
                  href={href}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '14px 16px',
                    borderRadius: 16,
                    border: '1px solid var(--border)',
                    background: 'var(--bg3)',
                    color: 'var(--ink)',
                    textDecoration: 'none',
                    fontWeight: 700,
                  }}
                >
                  <span>{label}</span>
                  <span style={{ color: 'var(--ink3)', fontFamily: 'var(--mono)', fontSize: 11 }}>Open</span>
                </a>
              ))}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter portal="public" />
    </div>
  )
}

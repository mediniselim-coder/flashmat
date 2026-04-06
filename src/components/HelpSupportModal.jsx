export default function HelpSupportModal({ onClose }) {
  return (
    <div className="modal-overlay" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 560 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div className="modal-title" style={{ marginBottom: 0 }}>Help & Support</div>
            <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 4 }}>
              Reach the right FlashMat team quickly.
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--ink3)' }}>X</button>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px' }}>
            <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 17, color: 'var(--ink)', marginBottom: 6 }}>General support</div>
            <div style={{ fontSize: 13, color: 'var(--ink2)', lineHeight: 1.7, marginBottom: 10 }}>
              Questions about your account, bookings, dashboard, or vehicle profile.
            </div>
            <a href="mailto:info@flashmat.ca" style={{ color: 'var(--blue)', fontWeight: 700, textDecoration: 'none' }}>info@flashmat.ca</a>
          </div>

          <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px' }}>
            <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 17, color: 'var(--ink)', marginBottom: 6 }}>Phone support</div>
            <div style={{ fontSize: 13, color: 'var(--ink2)', lineHeight: 1.7, marginBottom: 10 }}>
              For direct assistance with your account or current requests.
            </div>
            <a href="tel:5144761708" style={{ color: 'var(--green)', fontWeight: 700, textDecoration: 'none' }}>(514) 476-1708</a>
          </div>

          <div style={{ background: 'linear-gradient(135deg, rgba(10,39,65,0.94) 0%, rgba(23,76,122,0.92) 100%)', color: '#fff', borderRadius: 16, padding: '16px 18px' }}>
            <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>FlashFix emergency</div>
            <div style={{ fontSize: 13, lineHeight: 1.7, color: 'rgba(236,247,255,0.82)', marginBottom: 12 }}>
              For roadside urgency, towing, or immediate service matching, use FlashFix directly.
            </div>
            <a href="/urgence" style={{ color: '#fff', fontWeight: 800, textDecoration: 'none' }}>Open FlashFix Urgence</a>
          </div>
        </div>

        <div className="modal-actions" style={{ marginTop: 18 }}>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

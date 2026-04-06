export default function WalletModal({ onClose }) {
  return (
    <div className="modal-overlay" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 560 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div className="modal-title" style={{ marginBottom: 0 }}>Wallet</div>
            <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 4 }}>
              Your FlashMat payments, credits, and saved billing details.
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--ink3)' }}>X</button>
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          <div style={{ background: 'linear-gradient(135deg, rgba(10,39,65,0.94) 0%, rgba(23,76,122,0.92) 100%)', color: '#fff', borderRadius: 16, padding: '16px 18px' }}>
            <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 18, marginBottom: 8 }}>FlashMat Wallet</div>
            <div style={{ fontSize: 13, lineHeight: 1.7, color: 'rgba(236,247,255,0.82)' }}>
              Wallet tools are being prepared for bookings, reimbursements, marketplace payments, and future account credits.
            </div>
          </div>

          <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px' }}>
            <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 17, color: 'var(--ink)', marginBottom: 6 }}>Current balance</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--ink)' }}>$0.00</div>
            <div style={{ fontSize: 12, color: 'var(--ink2)', lineHeight: 1.7, marginTop: 8 }}>
              Available credits, refunds, or promotional balance will appear here.
            </div>
          </div>

          <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 14, padding: '14px 16px' }}>
            <div style={{ fontFamily: 'var(--display)', fontWeight: 700, fontSize: 17, color: 'var(--ink)', marginBottom: 6 }}>Billing methods</div>
            <div style={{ fontSize: 13, color: 'var(--ink2)', lineHeight: 1.7 }}>
              Saved cards and payment preferences will be managed here as FlashMat wallet features expand.
            </div>
          </div>
        </div>

        <div className="modal-actions" style={{ marginTop: 18 }}>
          <button className="btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

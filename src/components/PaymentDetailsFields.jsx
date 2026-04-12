export default function PaymentDetailsFields({
  payment,
  onPaymentChange,
  billing,
  onBillingChange,
  compact = false,
  title = 'Payment details',
  subtitle = 'Used to authorize and prepare your FlashMat payment.',
}) {
  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div>
        <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: compact ? 18 : 20, color: 'var(--ink)', marginBottom: 4 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--ink2)', lineHeight: 1.7 }}>{subtitle}</div>
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        <input className="form-input" value={payment.cardholder} onChange={(event) => onPaymentChange('cardholder', event.target.value)} placeholder="Cardholder name" />
        <input className="form-input" value={payment.cardNumber} onChange={(event) => onPaymentChange('cardNumber', formatCardNumber(event.target.value))} placeholder="Card number" inputMode="numeric" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <input className="form-input" value={payment.expiry} onChange={(event) => onPaymentChange('expiry', formatExpiry(event.target.value))} placeholder="MM/YY" inputMode="numeric" />
          <input className="form-input" value={payment.cvc} onChange={(event) => onPaymentChange('cvc', event.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="CVC" inputMode="numeric" />
        </div>
      </div>

      <div style={{ display: 'grid', gap: 10 }}>
        <div style={{ fontSize: 11, color: 'var(--ink3)', fontFamily: 'var(--mono)', letterSpacing: '.12em', textTransform: 'uppercase' }}>Billing address</div>
        <input className="form-input" value={billing.addressLine1} onChange={(event) => onBillingChange('addressLine1', event.target.value)} placeholder="Address line 1" />
        <input className="form-input" value={billing.addressLine2} onChange={(event) => onBillingChange('addressLine2', event.target.value)} placeholder="Address line 2 (optional)" />
        <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr 1fr', gap: 10 }}>
          <input className="form-input" value={billing.city} onChange={(event) => onBillingChange('city', event.target.value)} placeholder="City" />
          <input className="form-input" value={billing.province} onChange={(event) => onBillingChange('province', event.target.value)} placeholder="Province / State" />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : '1fr 1fr', gap: 10 }}>
          <input className="form-input" value={billing.postalCode} onChange={(event) => onBillingChange('postalCode', event.target.value.toUpperCase())} placeholder="Postal code" />
          <input className="form-input" value={billing.country} onChange={(event) => onBillingChange('country', event.target.value)} placeholder="Country" />
        </div>
      </div>
    </div>
  )
}

function formatCardNumber(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 19)
  return digits.replace(/(.{4})/g, '$1 ').trim()
}

function formatExpiry(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 4)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

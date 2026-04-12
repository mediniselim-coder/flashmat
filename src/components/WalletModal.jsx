import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import {
  FLASHMAT_WALLET_UPDATED_EVENT,
  readSavedPaymentMethods,
  removeSavedPaymentMethod,
  savePaymentMethod,
  setDefaultPaymentMethod,
  validateBillingAddress,
  validatePaymentDetails,
} from '../lib/payments'

const METHOD_OPTIONS = [
  { id: 'credit_card', label: 'Credit card' },
  { id: 'debit_card', label: 'Debit card' },
  { id: 'paypal', label: 'PayPal' },
]

function emptyBilling(profile = {}) {
  return {
    addressLine1: profile?.address || '',
    addressLine2: '',
    city: profile?.city || 'Montreal',
    province: profile?.province || 'QC',
    postalCode: profile?.postal_code || '',
    country: profile?.country || 'Canada',
  }
}

export default function WalletModal({ onClose }) {
  const { user, profile } = useAuth()
  const walletUserId = user?.id || 'guest'
  const [methods, setMethods] = useState([])
  const [methodType, setMethodType] = useState('credit_card')
  const [payment, setPayment] = useState({
    cardholder: profile?.full_name || '',
    cardNumber: '',
    expiry: '',
    cvc: '',
  })
  const [paypalEmail, setPaypalEmail] = useState(user?.email || '')
  const [billing, setBilling] = useState(emptyBilling(profile))
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    function syncMethods(event) {
      if (event?.type === FLASHMAT_WALLET_UPDATED_EVENT) {
        const eventUserId = event.detail?.userId || 'guest'
        if (String(eventUserId) !== String(walletUserId)) return
      }
      setMethods(readSavedPaymentMethods(walletUserId))
    }

    syncMethods()
    window.addEventListener('storage', syncMethods)
    window.addEventListener(FLASHMAT_WALLET_UPDATED_EVENT, syncMethods)
    return () => {
      window.removeEventListener('storage', syncMethods)
      window.removeEventListener(FLASHMAT_WALLET_UPDATED_EVENT, syncMethods)
    }
  }, [walletUserId])

  useEffect(() => {
    setPayment((current) => ({
      ...current,
      cardholder: current.cardholder || profile?.full_name || '',
    }))
    setPaypalEmail((current) => current || user?.email || '')
    setBilling((current) => ({
      ...emptyBilling(profile),
      ...current,
    }))
  }, [profile, user?.email])

  const defaultMethod = useMemo(
    () => methods.find((method) => method.isDefault) || methods[0] || null,
    [methods],
  )

  function handleBillingChange(name, value) {
    setBilling((current) => ({ ...current, [name]: value }))
  }

  function handlePaymentChange(name, value) {
    setPayment((current) => ({ ...current, [name]: value }))
  }

  function handleSaveMethod() {
    setError('')
    setSaving(true)

    try {
      const billingError = validateBillingAddress(billing)
      if (billingError) throw new Error(billingError)

      if (methodType === 'paypal') {
        if (!String(paypalEmail || '').trim()) {
          throw new Error('Add the PayPal email first.')
        }

        const next = savePaymentMethod({
          userId: walletUserId,
          kind: 'paypal',
          paypalEmail: paypalEmail.trim(),
          billingAddress: billing,
        })
        setMethods(next)
        setPaypalEmail(user?.email || '')
      } else {
        const paymentError = validatePaymentDetails(payment)
        if (paymentError) throw new Error(paymentError)

        const next = savePaymentMethod({
          userId: walletUserId,
          kind: methodType,
          paymentDetails: payment,
          billingAddress: billing,
        })
        setMethods(next)
        setPayment({
          cardholder: profile?.full_name || '',
          cardNumber: '',
          expiry: '',
          cvc: '',
        })
      }
    } catch (saveError) {
      setError(saveError.message || 'Unable to save this payment method.')
    } finally {
      setSaving(false)
    }
  }

  function handleRemoveMethod(methodId) {
    setMethods(removeSavedPaymentMethod(walletUserId, methodId))
  }

  function handleMakeDefault(methodId) {
    setMethods(setDefaultPaymentMethod(walletUserId, methodId))
  }

  return (
    <div className="modal-overlay" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 760, maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div className="modal-title" style={{ marginBottom: 0 }}>Wallet</div>
            <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 4 }}>
              Save cards or PayPal so checkout is faster across FlashMat.
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--ink3)' }}>X</button>
        </div>

        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ background: 'linear-gradient(135deg, rgba(10,39,65,0.94) 0%, rgba(23,76,122,0.92) 100%)', color: '#fff', borderRadius: 18, padding: '18px 20px' }}>
            <div style={{ fontFamily: 'var(--mono)', fontSize: 10, letterSpacing: '.16em', textTransform: 'uppercase', color: 'rgba(207,234,255,.72)', marginBottom: 8 }}>
              FlashMat wallet
            </div>
            <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 24, marginBottom: 6 }}>Saved payment methods</div>
            <div style={{ fontSize: 13, lineHeight: 1.7, color: 'rgba(236,247,255,0.82)' }}>
              Register a credit card, debit card, or PayPal account for faster bookings and marketplace checkout.
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.05fr) minmax(320px, .95fr)', gap: 16, alignItems: 'start' }}>
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 16, padding: '14px 16px' }}>
                <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 18, color: 'var(--ink)', marginBottom: 6 }}>Current balance</div>
                <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--ink)' }}>$0.00</div>
                <div style={{ fontSize: 12, color: 'var(--ink2)', lineHeight: 1.7, marginTop: 8 }}>
                  Refunds, credits, and future FlashMat wallet balance will appear here.
                </div>
              </div>

              <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, padding: '14px 16px', display: 'grid', gap: 12 }}>
                <div>
                  <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 18, color: 'var(--ink)', marginBottom: 4 }}>Saved methods</div>
                  <div style={{ fontSize: 12, color: 'var(--ink2)', lineHeight: 1.7 }}>
                    Choose the method you want FlashMat to show first at checkout.
                  </div>
                </div>

                {defaultMethod ? (
                  <div style={{ padding: 14, borderRadius: 14, background: 'var(--bg3)', border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 11, color: 'var(--ink3)', fontFamily: 'var(--mono)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 6 }}>Default method</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--ink)' }}>{defaultMethod.label}</div>
                    <div style={{ marginTop: 6, fontSize: 12, color: 'var(--ink2)' }}>
                      {defaultMethod.type === 'paypal'
                        ? defaultMethod.paypalEmail
                        : defaultMethod.billingAddress?.city
                          ? `${defaultMethod.billingAddress.city}, ${defaultMethod.billingAddress.province}`
                          : 'Billing address saved'}
                    </div>
                  </div>
                ) : null}

                {methods.length === 0 ? (
                  <div style={{ padding: '18px 12px', borderRadius: 14, background: 'var(--bg3)', border: '1px dashed var(--border)', color: 'var(--ink3)', textAlign: 'center', fontSize: 13 }}>
                    No payment method saved yet.
                  </div>
                ) : (
                  methods.map((method) => (
                    <div key={method.id} style={{ padding: 14, borderRadius: 14, background: '#fff', border: '1px solid var(--border)', display: 'grid', gap: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--ink)' }}>{method.label}</div>
                          <div style={{ fontSize: 12, color: 'var(--ink2)', marginTop: 4 }}>
                            {method.type === 'paypal'
                              ? method.paypalEmail
                              : `${method.billingAddress?.city || 'Billing city'} • ${method.billingAddress?.country || 'Country'}`}
                          </div>
                        </div>
                        {method.isDefault ? <span className="badge badge-blue">Default</span> : null}
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {!method.isDefault ? (
                          <button type="button" className="btn" onClick={() => handleMakeDefault(method.id)}>
                            Make default
                          </button>
                        ) : null}
                        <button type="button" className="btn" style={{ color: 'var(--red)', borderColor: 'rgba(239,68,68,.22)' }} onClick={() => handleRemoveMethod(method.id)}>
                          Remove
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div style={{ background: '#fff', border: '1px solid var(--border)', borderRadius: 16, padding: '16px 18px', display: 'grid', gap: 12 }}>
              <div>
                <div style={{ fontFamily: 'var(--display)', fontWeight: 800, fontSize: 18, color: 'var(--ink)', marginBottom: 4 }}>Add payment method</div>
                <div style={{ fontSize: 12, color: 'var(--ink2)', lineHeight: 1.7 }}>
                  Register a reusable payment option from your profile wallet.
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {METHOD_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className="btn"
                    onClick={() => setMethodType(option.id)}
                    style={{
                      background: methodType === option.id ? 'rgba(37,99,235,.08)' : '#fff',
                      borderColor: methodType === option.id ? 'rgba(37,99,235,.24)' : 'var(--border)',
                      color: methodType === option.id ? 'var(--accent)' : 'var(--ink)',
                      fontWeight: 800,
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {methodType === 'paypal' ? (
                <input
                  className="form-input"
                  value={paypalEmail}
                  onChange={(event) => setPaypalEmail(event.target.value)}
                  placeholder="PayPal email"
                />
              ) : (
                <>
                  <input className="form-input" value={payment.cardholder} onChange={(event) => handlePaymentChange('cardholder', event.target.value)} placeholder="Cardholder name" />
                  <input className="form-input" value={payment.cardNumber} onChange={(event) => handlePaymentChange('cardNumber', event.target.value)} placeholder="Card number" inputMode="numeric" />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <input className="form-input" value={payment.expiry} onChange={(event) => handlePaymentChange('expiry', event.target.value)} placeholder="MM/YY" inputMode="numeric" />
                    <input className="form-input" value={payment.cvc} onChange={(event) => handlePaymentChange('cvc', event.target.value)} placeholder="CVC" inputMode="numeric" />
                  </div>
                </>
              )}

              <div style={{ display: 'grid', gap: 10 }}>
                <div style={{ fontSize: 11, color: 'var(--ink3)', fontFamily: 'var(--mono)', letterSpacing: '.12em', textTransform: 'uppercase' }}>Billing address</div>
                <input className="form-input" value={billing.addressLine1} onChange={(event) => handleBillingChange('addressLine1', event.target.value)} placeholder="Address line 1" />
                <input className="form-input" value={billing.addressLine2} onChange={(event) => handleBillingChange('addressLine2', event.target.value)} placeholder="Address line 2 (optional)" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <input className="form-input" value={billing.city} onChange={(event) => handleBillingChange('city', event.target.value)} placeholder="City" />
                  <input className="form-input" value={billing.province} onChange={(event) => handleBillingChange('province', event.target.value)} placeholder="Province / State" />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <input className="form-input" value={billing.postalCode} onChange={(event) => handleBillingChange('postalCode', event.target.value)} placeholder="Postal code" />
                  <input className="form-input" value={billing.country} onChange={(event) => handleBillingChange('country', event.target.value)} placeholder="Country" />
                </div>
              </div>

              {error ? <div style={{ color: 'var(--red)', fontSize: 12 }}>{error}</div> : null}

              <button type="button" className="btn btn-green btn-lg" onClick={handleSaveMethod} disabled={saving} style={{ justifyContent: 'center' }}>
                {saving ? <span className="spinner" style={{ width: 16, height: 16 }} /> : 'Save payment method'}
              </button>
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

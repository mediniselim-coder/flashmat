export const FLASHMAT_PAYMENTS_UPDATED_EVENT = 'flashmat-payments-updated'

function getPaymentStorageKey(userId) {
  return `flashmat-payments:${userId || 'guest'}`
}

function normalizeCardNumber(cardNumber = '') {
  return String(cardNumber || '').replace(/\D/g, '')
}

export function getCardBrand(cardNumber = '') {
  const digits = normalizeCardNumber(cardNumber)
  if (/^4/.test(digits)) return 'Visa'
  if (/^(5[1-5]|2[2-7])/.test(digits)) return 'Mastercard'
  if (/^3[47]/.test(digits)) return 'Amex'
  return 'Card'
}

export function getMaskedCardLabel(cardNumber = '') {
  const digits = normalizeCardNumber(cardNumber)
  if (!digits) return 'Card not added'
  return `${getCardBrand(digits)} ending in ${digits.slice(-4)}`
}

export function validatePaymentDetails(details = {}) {
  const cardholder = String(details.cardholder || '').trim()
  const cardNumber = normalizeCardNumber(details.cardNumber)
  const expiry = String(details.expiry || '').trim()
  const cvc = String(details.cvc || '').replace(/\s/g, '')

  if (!cardholder) return 'Add the cardholder name.'
  if (cardNumber.length < 13 || cardNumber.length > 19) return 'Add a valid card number.'
  if (!/^\d{2}\/\d{2}$/.test(expiry)) return 'Add the expiry as MM/YY.'
  if (!/^\d{3,4}$/.test(cvc)) return 'Add a valid CVC.'

  const [monthRaw, yearRaw] = expiry.split('/')
  const month = Number(monthRaw)
  const year = Number(`20${yearRaw}`)
  if (!month || month < 1 || month > 12) return 'Add a valid expiry month.'

  const expiryDate = new Date(year, month, 0, 23, 59, 59, 999)
  if (Number.isNaN(expiryDate.getTime()) || expiryDate < new Date()) {
    return 'This card looks expired.'
  }

  return ''
}

export function validateBillingAddress(address = {}) {
  if (!String(address.addressLine1 || '').trim()) return 'Add the billing address.'
  if (!String(address.city || '').trim()) return 'Add the billing city.'
  if (!String(address.province || '').trim()) return 'Add the billing province or state.'
  if (!String(address.postalCode || '').trim()) return 'Add the billing postal code.'
  if (!String(address.country || '').trim()) return 'Add the billing country.'
  return ''
}

export function createPaymentRecord({
  userId,
  kind,
  amount = null,
  amountLabel = '',
  paymentDetails = {},
  billingAddress = {},
  payer = {},
  meta = {},
}) {
  if (typeof window === 'undefined') return null

  const payment = {
    id: `pay_${Date.now()}`,
    kind: kind || 'payment',
    amount: Number.isFinite(Number(amount)) ? Number(amount) : null,
    amountLabel: amountLabel || '',
    createdAt: new Date().toISOString(),
    status: 'authorized',
    payer: {
      name: payer.name || '',
      email: payer.email || '',
      phone: payer.phone || '',
    },
    billingAddress: {
      addressLine1: billingAddress.addressLine1 || '',
      addressLine2: billingAddress.addressLine2 || '',
      city: billingAddress.city || '',
      province: billingAddress.province || '',
      postalCode: billingAddress.postalCode || '',
      country: billingAddress.country || '',
    },
    paymentMethod: {
      type: paymentDetails.methodType || 'card',
      brand: paymentDetails.methodLabel || getCardBrand(paymentDetails.cardNumber),
      last4: normalizeCardNumber(paymentDetails.cardNumber).slice(-4),
      cardholder: String(paymentDetails.cardholder || '').trim(),
      label: paymentDetails.methodLabel || getMaskedCardLabel(paymentDetails.cardNumber),
    },
    meta,
  }

  const key = getPaymentStorageKey(userId)
  const current = readPaymentRecords(userId)
  const next = [payment, ...current]
  window.localStorage.setItem(key, JSON.stringify(next))
  window.dispatchEvent(new CustomEvent(FLASHMAT_PAYMENTS_UPDATED_EVENT, { detail: { userId, payment } }))
  return payment
}

export function readPaymentRecords(userId) {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(getPaymentStorageKey(userId))
    const parsed = JSON.parse(raw || '[]')
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

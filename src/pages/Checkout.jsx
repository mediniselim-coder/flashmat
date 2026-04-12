import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import NavBar from '../components/NavBar'
import SiteFooter from '../components/SiteFooter'
import ServiceIcon from '../components/ServiceIcon'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { FLASHMAT_CART_UPDATED_EVENT, clearCart, readCart, removeCartItem, updateCartItemQuantity } from '../lib/cart'

function formatCurrency(value) {
  if (!Number.isFinite(Number(value))) return 'Price on request'
  return `$${Number(value).toFixed(2)}`
}

export default function Checkout() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()
  const { toast } = useToast()
  const cartUserId = user?.id || 'guest'
  const [cartItems, setCartItems] = useState([])
  const [checkoutDone, setCheckoutDone] = useState(false)
  const [form, setForm] = useState({
    fullName: profile?.full_name || '',
    email: user?.email || '',
    phone: profile?.phone || '',
    address: '',
    city: profile?.city || 'Montreal',
    note: '',
  })

  useEffect(() => {
    setForm((current) => ({
      ...current,
      fullName: current.fullName || profile?.full_name || '',
      email: current.email || user?.email || '',
      phone: current.phone || profile?.phone || '',
      city: current.city || profile?.city || 'Montreal',
    }))
  }, [profile?.city, profile?.full_name, profile?.phone, user?.email])

  useEffect(() => {
    function syncCart(event) {
      if (event?.type === FLASHMAT_CART_UPDATED_EVENT) {
        const eventUserId = event.detail?.userId || 'guest'
        if (String(eventUserId) !== String(cartUserId)) return
      }
      setCartItems(readCart(cartUserId))
    }

    syncCart()
    window.addEventListener('storage', syncCart)
    window.addEventListener(FLASHMAT_CART_UPDATED_EVENT, syncCart)
    return () => {
      window.removeEventListener('storage', syncCart)
      window.removeEventListener(FLASHMAT_CART_UPDATED_EVENT, syncCart)
    }
  }, [cartUserId])

  const subtotal = useMemo(
    () => cartItems.reduce((total, item) => total + ((Number(item.price) || 0) * Math.max(1, Number(item.quantity || 1))), 0),
    [cartItems],
  )

  const orderFee = subtotal > 0 ? 12 : 0
  const tax = subtotal > 0 ? subtotal * 0.14975 : 0
  const total = subtotal + orderFee + tax

  function handleQuantityChange(itemId, nextQuantity) {
    if (nextQuantity <= 0) {
      setCartItems(removeCartItem(cartUserId, itemId))
      return
    }
    setCartItems(updateCartItemQuantity(cartUserId, itemId, nextQuantity))
  }

  function handleInputChange(event) {
    const { name, value } = event.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  function handleCheckout(event) {
    event.preventDefault()
    if (cartItems.length === 0) {
      toast('Your cart is empty.', 'error')
      return
    }

    if (!form.fullName || !form.email || !form.phone) {
      toast('Add your contact details before checkout.', 'error')
      return
    }

    clearCart(cartUserId)
    setCartItems([])
    setCheckoutDone(true)
    toast('Checkout request sent.', 'success')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>
      <NavBar activePage="marketplace" />

      <main style={{ flex: 1 }}>
        <section style={{ background: 'linear-gradient(135deg, #081f31 0%, #0f1e3d 58%, #2563eb 100%)', color: '#fff' }}>
          <div style={{ maxWidth: 1440, margin: '0 auto', padding: '40px 28px 44px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontFamily: 'var(--mono)', fontSize: 11, letterSpacing: 1.6, textTransform: 'uppercase', color: 'rgba(143, 217, 255, 0.88)', marginBottom: 10 }}>
                  FlashMat checkout
                </div>
                <h1 style={{ margin: 0, fontFamily: 'var(--display)', fontSize: 44, lineHeight: 1.02, letterSpacing: '-0.05em' }}>
                  Review your cart and checkout
                </h1>
                <p style={{ margin: '12px 0 0', maxWidth: 680, color: 'rgba(255,255,255,0.72)', fontSize: 15, lineHeight: 1.7 }}>
                  Confirm your items, choose the right contact details, and send your checkout request from one clean FlashMat page.
                </p>
              </div>

              <button type="button" className="btn" onClick={() => navigate('/marketplace')} style={{ background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.14)' }}>
                Back to marketplace
              </button>
            </div>
          </div>
        </section>

        <section style={{ maxWidth: 1440, margin: '0 auto', padding: '28px 28px 64px' }}>
          {checkoutDone ? (
            <div className="panel" style={{ padding: 34, textAlign: 'center' }}>
              <div style={{ width: 72, height: 72, margin: '0 auto 18px', borderRadius: 22, display: 'grid', placeItems: 'center', background: 'linear-gradient(135deg, rgba(22,199,132,.12), rgba(47,125,225,.12))', color: 'var(--green)' }}>
                <ServiceIcon code="CK" size={34} />
              </div>
              <div style={{ fontFamily: 'var(--display)', fontSize: 32, fontWeight: 800, letterSpacing: '-0.05em', color: 'var(--ink)', marginBottom: 10 }}>
                Checkout sent
              </div>
              <div style={{ maxWidth: 560, margin: '0 auto', color: 'var(--ink2)', fontSize: 15, lineHeight: 1.8 }}>
                Your cart request has been prepared for FlashMat follow-up. You can keep browsing the marketplace or go back to your cart later if you want to add more items.
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap', marginTop: 20 }}>
                <button type="button" className="btn btn-green" onClick={() => navigate('/marketplace')}>Continue shopping</button>
                <button type="button" className="btn" onClick={() => navigate('/messages')}>Open messages</button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18, alignItems: 'start' }}>
              <div style={{ display: 'grid', gap: 18 }}>
                <div className="panel">
                  <div className="panel-hd">
                    <div className="panel-title">Cart items</div>
                    <div className="panel-sub">{cartItems.length} item{cartItems.length !== 1 ? 's' : ''} ready for checkout</div>
                  </div>
                  <div className="panel-body" style={{ display: 'grid', gap: 12 }}>
                    {cartItems.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '24px 14px', color: 'var(--ink3)' }}>
                        <div style={{ fontFamily: 'var(--display)', fontSize: 24, fontWeight: 800, color: 'var(--ink)', marginBottom: 10 }}>Your cart is empty</div>
                        <div style={{ marginBottom: 16, fontSize: 14 }}>Add shop items from the marketplace first, then come back here to checkout.</div>
                        <button type="button" className="btn btn-green" onClick={() => navigate('/marketplace')}>Browse shop</button>
                      </div>
                    ) : (
                      cartItems.map((item) => (
                        <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '110px minmax(0, 1fr)', gap: 14, padding: 14, borderRadius: 18, border: '1px solid var(--border)', background: '#fff' }}>
                          <div style={{ width: 110, height: 110, borderRadius: 16, overflow: 'hidden', background: 'var(--bg3)' }}>
                            {item.image_url ? (
                              <img src={item.image_url} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                            ) : (
                              <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center' }}>
                                <ServiceIcon code="SH" size={40} />
                              </div>
                            )}
                          </div>

                          <div style={{ display: 'grid', gap: 10, minWidth: 0 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                              <div>
                                <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--ink)' }}>{item.title}</div>
                                <div style={{ fontSize: 12, color: 'var(--ink3)', fontFamily: 'var(--mono)', marginTop: 4 }}>
                                  {[item.category, item.seller_name].filter(Boolean).join(' · ') || 'Marketplace item'}
                                </div>
                              </div>
                              <div style={{ fontFamily: 'var(--display)', fontSize: 24, fontWeight: 800, color: 'var(--green)' }}>
                                {formatCurrency(Number(item.price) * Math.max(1, Number(item.quantity || 1)))}
                              </div>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 999, background: 'var(--bg3)', border: '1px solid var(--border)' }}>
                                <button type="button" className="btn" style={{ padding: '6px 10px', minWidth: 40, justifyContent: 'center' }} onClick={() => handleQuantityChange(item.id, Math.max(1, Number(item.quantity || 1) - 1))}>
                                  -
                                </button>
                                <span style={{ minWidth: 24, textAlign: 'center', fontWeight: 800, color: 'var(--ink)' }}>{Math.max(1, Number(item.quantity || 1))}</span>
                                <button type="button" className="btn" style={{ padding: '6px 10px', minWidth: 40, justifyContent: 'center' }} onClick={() => handleQuantityChange(item.id, Math.max(1, Number(item.quantity || 1) + 1))}>
                                  +
                                </button>
                              </div>

                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                <button type="button" className="btn" onClick={() => navigate(item.route || '/marketplace')}>View item</button>
                                <button type="button" className="btn" style={{ color: 'var(--red)', borderColor: 'rgba(239,68,68,.22)' }} onClick={() => setCartItems(removeCartItem(cartUserId, item.id))}>
                                  Remove
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gap: 18 }}>
                <form className="panel" onSubmit={handleCheckout}>
                  <div className="panel-hd">
                    <div className="panel-title">Checkout details</div>
                    <div className="panel-sub">Used to prepare the FlashMat order request</div>
                  </div>
                  <div className="panel-body" style={{ display: 'grid', gap: 12 }}>
                    <input className="form-input" name="fullName" value={form.fullName} onChange={handleInputChange} placeholder="Full name" />
                    <input className="form-input" name="email" value={form.email} onChange={handleInputChange} placeholder="Email" />
                    <input className="form-input" name="phone" value={form.phone} onChange={handleInputChange} placeholder="Phone" />
                    <input className="form-input" name="address" value={form.address} onChange={handleInputChange} placeholder="Address" />
                    <input className="form-input" name="city" value={form.city} onChange={handleInputChange} placeholder="City" />
                    <textarea className="form-input" name="note" value={form.note} onChange={handleInputChange} placeholder="Order note or pickup instructions" style={{ minHeight: 120, resize: 'vertical' }} />

                    <div style={{ padding: 14, borderRadius: 16, background: 'var(--bg3)', border: '1px solid var(--border)', display: 'grid', gap: 10 }}>
                      <SummaryRow label="Subtotal" value={formatCurrency(subtotal)} />
                      <SummaryRow label="FlashMat handling" value={formatCurrency(orderFee)} />
                      <SummaryRow label="Estimated taxes" value={formatCurrency(tax)} />
                      <div style={{ height: 1, background: 'var(--border)', margin: '2px 0' }} />
                      <SummaryRow label="Total" value={formatCurrency(total)} strong />
                    </div>

                    <button type="submit" className="btn btn-green btn-lg" style={{ width: '100%', justifyContent: 'center' }}>
                      Checkout now
                    </button>
                    <button type="button" className="btn" style={{ width: '100%', justifyContent: 'center' }} onClick={() => navigate('/marketplace')}>
                      Back to marketplace
                    </button>
                  </div>
                </form>

                <div className="panel">
                  <div className="panel-hd"><div className="panel-title">What happens next</div></div>
                  <div className="panel-body" style={{ display: 'grid', gap: 10, color: 'var(--ink2)', fontSize: 14, lineHeight: 1.75 }}>
                    <div>1. FlashMat keeps the item selection from your cart.</div>
                    <div>2. Your contact details help prepare the order request.</div>
                    <div>3. After checkout, you can keep shopping or follow up through your account.</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      <SiteFooter portal="public" />
    </div>
  )
}

function SummaryRow({ label, value, strong = false }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
      <span style={{ color: strong ? 'var(--ink)' : 'var(--ink2)', fontWeight: strong ? 800 : 600 }}>{label}</span>
      <span style={{ color: strong ? 'var(--ink)' : 'var(--ink)', fontWeight: 800, fontFamily: strong ? 'var(--display)' : 'inherit', fontSize: strong ? 20 : 14 }}>
        {value}
      </span>
    </div>
  )
}

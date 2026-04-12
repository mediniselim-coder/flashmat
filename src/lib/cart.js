export const FLASHMAT_CART_UPDATED_EVENT = 'flashmat-cart-updated'

function getCartStorageKey(userId) {
  return `flashmat-cart:${userId || 'guest'}`
}

function normalizeCartItem(item = {}) {
  return {
    id: String(item.id || item.listing_id || item.title || Date.now()),
    listing_id: String(item.listing_id || item.id || ''),
    title: item.title || 'FlashMat item',
    price: item.price ?? null,
    quantity: Number(item.quantity || 1),
    image_url: item.image_url || item.imageUrl || '',
    seller_name: item.seller_name || item.sellerName || '',
    route: item.route || item.path || '/marketplace',
    category: item.category || '',
    listing_type: item.listing_type || item.listingType || 'shop',
  }
}

export function readCart(userId) {
  if (typeof window === 'undefined') return []

  try {
    const raw = window.localStorage.getItem(getCartStorageKey(userId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.map(normalizeCartItem) : []
  } catch {
    return []
  }
}

export function writeCart(userId, items) {
  if (typeof window === 'undefined') return []
  const normalized = Array.isArray(items) ? items.map(normalizeCartItem) : []
  window.localStorage.setItem(getCartStorageKey(userId), JSON.stringify(normalized))
  window.dispatchEvent(new CustomEvent(FLASHMAT_CART_UPDATED_EVENT, { detail: { userId, items: normalized } }))
  return normalized
}

export function addCartItem(userId, item) {
  const nextItem = normalizeCartItem(item)
  const currentItems = readCart(userId)
  const existingIndex = currentItems.findIndex((entry) => String(entry.id) === String(nextItem.id))

  if (existingIndex === -1) {
    return writeCart(userId, [...currentItems, nextItem])
  }

  const mergedItems = [...currentItems]
  mergedItems[existingIndex] = {
    ...mergedItems[existingIndex],
    ...nextItem,
    quantity: Math.max(1, Number(mergedItems[existingIndex].quantity || 1) + Math.max(1, Number(nextItem.quantity || 1))),
  }
  return writeCart(userId, mergedItems)
}

export function updateCartItemQuantity(userId, itemId, quantity) {
  const nextQuantity = Math.max(1, Number(quantity || 1))
  const nextItems = readCart(userId).map((item) => (
    String(item.id) === String(itemId)
      ? { ...item, quantity: nextQuantity }
      : item
  ))
  return writeCart(userId, nextItems)
}

export function removeCartItem(userId, itemId) {
  const nextItems = readCart(userId).filter((item) => String(item.id) !== String(itemId))
  return writeCart(userId, nextItems)
}

export function clearCart(userId) {
  return writeCart(userId, [])
}

export function getCartCount(userId) {
  return readCart(userId).reduce((total, item) => total + Math.max(1, Number(item.quantity || 1)), 0)
}

export function getCartSubtotal(userId) {
  return readCart(userId).reduce((total, item) => {
    const price = Number(item.price)
    if (!Number.isFinite(price)) return total
    return total + (price * Math.max(1, Number(item.quantity || 1)))
  }, 0)
}

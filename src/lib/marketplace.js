const MARKETPLACE_META_PREFIX = '<!--FLASHMAT_MARKETPLACE_META:'
const MARKETPLACE_META_SUFFIX = '-->'

function encodeMarketplaceMeta(meta) {
  try {
    return encodeURIComponent(JSON.stringify(meta))
  } catch {
    return ''
  }
}

function decodeMarketplaceMeta(raw) {
  try {
    return JSON.parse(decodeURIComponent(raw))
  } catch {
    return {}
  }
}

export function serializeMarketplaceDescription(description, meta = {}) {
  const cleanDescription = String(description || '').trim()
  const encodedMeta = encodeMarketplaceMeta(meta)

  if (!encodedMeta) return cleanDescription
  return `${cleanDescription}\n\n${MARKETPLACE_META_PREFIX}${encodedMeta}${MARKETPLACE_META_SUFFIX}`
}

export function extractMarketplaceDescriptionMeta(description) {
  const rawDescription = String(description || '')
  const start = rawDescription.indexOf(MARKETPLACE_META_PREFIX)

  if (start === -1) {
    return {
      description: rawDescription.trim(),
      meta: {},
    }
  }

  const end = rawDescription.indexOf(MARKETPLACE_META_SUFFIX, start)
  const visibleDescription = rawDescription.slice(0, start).trim()

  if (end === -1) {
    return {
      description: visibleDescription,
      meta: {},
    }
  }

  return {
    description: visibleDescription,
    meta: decodeMarketplaceMeta(rawDescription.slice(start + MARKETPLACE_META_PREFIX.length, end)),
  }
}

export function normalizeMarketplaceListing(listing) {
  const { description, meta } = extractMarketplaceDescriptionMeta(listing.description)

  return {
    ...listing,
    description,
    condition: meta.condition || 'Bon etat',
    icon: meta.icon || '📦',
    phone: meta.phone || '',
    image_url: meta.imageUrl || '',
    seller_name: meta.sellerName || 'Vendeur FlashMat',
    seller_type: meta.sellerType || 'client',
    city: listing.city || meta.city || 'Montreal',
  }
}

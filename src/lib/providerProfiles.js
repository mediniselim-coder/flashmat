const STORAGE_KEY = 'flashmat-provider-overrides'

export const PROVIDER_SERVICE_OPTIONS = [
  { id: 'mechanic-general', label: 'Mecanique generale', icon: '🔧', category: 'mechanic' },
  { id: 'oil-change', label: 'Vidange', icon: '🛢️', category: 'mechanic' },
  { id: 'brakes', label: 'Freins', icon: '🛑', category: 'mechanic' },
  { id: 'suspension', label: 'Suspension', icon: '🛞', category: 'mechanic' },
  { id: 'diagnostic', label: 'Diagnostic electronique', icon: '🧠', category: 'mechanic' },
  { id: 'ac', label: 'Climatisation', icon: '❄️', category: 'mechanic' },
  { id: 'tires', label: 'Pneus', icon: '🔩', category: 'tire' },
  { id: 'alignment', label: 'Alignement', icon: '📐', category: 'tire' },
  { id: 'balancing', label: 'Balancement', icon: '⚙️', category: 'tire' },
  { id: 'flat-repair', label: 'Reparation crevaison', icon: '🛞', category: 'tire' },
  { id: 'wash', label: 'Lavage auto', icon: '🚿', category: 'wash' },
  { id: 'detailing', label: 'Detailing', icon: '✨', category: 'wash' },
  { id: 'ceramic', label: 'Traitement ceramique', icon: '🫧', category: 'wash' },
  { id: 'body', label: 'Carrosserie', icon: '🎨', category: 'body' },
  { id: 'paint', label: 'Peinture', icon: '🖌️', category: 'body' },
  { id: 'dent', label: 'Debosselage', icon: '🔨', category: 'body' },
  { id: 'glass', label: 'Vitres auto', icon: '🪟', category: 'glass' },
  { id: 'windshield', label: 'Pare-brise', icon: '🪟', category: 'glass' },
  { id: 'towing', label: 'Remorquage', icon: '🚛', category: 'tow' },
  { id: 'roadside', label: 'Assistance routiere', icon: '🚨', category: 'tow' },
  { id: 'battery', label: 'Boost batterie', icon: '🔋', category: 'tow' },
  { id: 'lockout', label: 'Deverrouillage', icon: '🔓', category: 'tow' },
  { id: 'parts', label: 'Pieces auto', icon: '⚙️', category: 'parts' },
  { id: 'parking', label: 'Stationnement', icon: '🅿️', category: 'parking' },
  { id: 'performance', label: 'Performance', icon: '🏎️', category: 'tuning' },
]

const CATEGORY_LABELS = {
  mechanic: 'Mecanique',
  wash: 'Lave-auto',
  tire: 'Pneus',
  body: 'Carrosserie',
  glass: 'Vitres auto',
  tow: 'Remorquage',
  parts: 'Pieces auto',
  parking: 'Parking',
  tuning: 'Performance',
}

export const DEFAULT_PROVIDER_HOURS = {
  Mon: { closed: false, open: '08:00', close: '17:00' },
  Tue: { closed: false, open: '08:00', close: '17:00' },
  Wed: { closed: false, open: '08:00', close: '17:00' },
  Thu: { closed: false, open: '08:00', close: '17:00' },
  Fri: { closed: false, open: '08:00', close: '17:00' },
  Sat: { closed: false, open: '09:00', close: '14:00' },
  Sun: { closed: true, open: '', close: '' },
}

function safeWindow() {
  return typeof window !== 'undefined' ? window : null
}

function readRawOverrides() {
  const win = safeWindow()
  if (!win) return {}

  try {
    const raw = win.localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeRawOverrides(overrides) {
  const win = safeWindow()
  if (!win) return

  win.localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides))
  win.dispatchEvent(new CustomEvent('flashmat-provider-profile-updated'))
}

export function getProviderOverrideKey(provider) {
  if (!provider) return ''

  return String(
    provider.email
    || provider.providerEmail
    || provider.slug
    || provider.name
    || provider.id
    || ''
  )
    .trim()
    .toLowerCase()
}

export function saveProviderOverride(provider, override) {
  const key = getProviderOverrideKey(provider)
  if (!key) return

  const all = readRawOverrides()
  all[key] = { ...(all[key] || {}), ...override, updatedAt: new Date().toISOString() }
  writeRawOverrides(all)
}

export function getProviderOverride(provider) {
  const key = getProviderOverrideKey(provider)
  if (!key) return null
  return readRawOverrides()[key] || null
}

export function hoursToDisplayMap(hours) {
  const source = hours || DEFAULT_PROVIDER_HOURS
  return Object.fromEntries(
    Object.entries(DEFAULT_PROVIDER_HOURS).map(([day, defaults]) => {
      const value = source[day] || defaults
      return [day, value.closed ? 'Ferme' : `${value.open}-${value.close}`]
    }),
  )
}

export function displayMapToHours(displayMap) {
  return Object.fromEntries(
    Object.entries(DEFAULT_PROVIDER_HOURS).map(([day, defaults]) => {
      const raw = displayMap?.[day]
      if (!raw || String(raw).toLowerCase().includes('ferme')) {
        return [day, { ...defaults, closed: true, open: '', close: '' }]
      }

      const [open, close] = String(raw).split('-')
      return [day, { closed: false, open: open || defaults.open, close: close || defaults.close }]
    }),
  )
}

export function normalizeProviderHours(hours) {
  if (!hours) return { ...DEFAULT_PROVIDER_HOURS }

  if (hours.Mon && typeof hours.Mon === 'object') {
    return Object.fromEntries(
      Object.entries(DEFAULT_PROVIDER_HOURS).map(([day, defaults]) => [day, { ...defaults, ...(hours[day] || {}) }]),
    )
  }

  return displayMapToHours(hours)
}

export function getProviderServiceCategories(services = [], fallbackType = '') {
  const categories = new Set()

  services
    .map((service) => String(service || '').trim())
    .filter(Boolean)
    .forEach((serviceLabel) => {
      const normalized = serviceLabel.toLowerCase()
      const option = PROVIDER_SERVICE_OPTIONS.find((entry) => entry.label.toLowerCase() === normalized)

      if (option?.category) {
        categories.add(option.category)
        return
      }

      if (normalized.includes('lavage') || normalized.includes('detailing') || normalized.includes('ceramique')) categories.add('wash')
      if (normalized.includes('remorquage') || normalized.includes('assistance') || normalized.includes('batterie') || normalized.includes('deverrouillage')) categories.add('tow')
      if (normalized.includes('pare-brise') || normalized.includes('vitres')) categories.add('glass')
      if (normalized.includes('carrosserie') || normalized.includes('peinture') || normalized.includes('debosselage')) categories.add('body')
      if (normalized.includes('pneu') || normalized.includes('alignement') || normalized.includes('balancement') || normalized.includes('crevaison')) categories.add('tire')
      if (normalized.includes('piece')) categories.add('parts')
      if (normalized.includes('parking') || normalized.includes('stationnement')) categories.add('parking')
      if (normalized.includes('performance')) categories.add('tuning')
      if (
        normalized.includes('mecanique')
        || normalized.includes('vidange')
        || normalized.includes('frein')
        || normalized.includes('suspension')
        || normalized.includes('diagnostic')
        || normalized.includes('climatisation')
      ) {
        categories.add('mechanic')
      }
    })

  if (categories.size === 0 && fallbackType) {
    categories.add(String(fallbackType).toLowerCase())
  }

  if (categories.size === 0) {
    categories.add('mechanic')
  }

  return Array.from(categories)
}

function getPrimaryServiceType(services = [], fallbackType = '') {
  const categories = getProviderServiceCategories(services, fallbackType)
  const primary = categories[0] || 'mechanic'
  return {
    type: primary,
    type_label: CATEGORY_LABELS[primary] || 'Mecanique',
  }
}

export function inferTypeMeta(services = []) {
  return getPrimaryServiceType(services)
}

export function isProviderProfileComplete(provider) {
  return Boolean(
    provider?.name
    && provider?.address
    && provider?.phone
    && provider?.description
    && Array.isArray(provider?.services)
    && provider.services.length > 0
  )
}

export function mergeProviderProfile(provider) {
  const baseTypeMeta = getPrimaryServiceType(provider?.services || [], provider?.type || '')
  const override = getProviderOverride(provider)
  if (!override) {
    return {
      ...provider,
      type: provider.type || baseTypeMeta.type,
      type_label: provider.type_label || baseTypeMeta.type_label,
      serviceCategories: getProviderServiceCategories(provider?.services || [], provider?.type || ''),
      publicReady: isProviderProfileComplete(provider),
      editableHours: normalizeProviderHours(provider.editableHours || provider.hours),
      coverPhoto: provider.coverPhoto || provider.cover_photo || provider.cover || '',
      galleryPhotos: provider.galleryPhotos || provider.gallery_photos || [],
      hours: provider.hours && provider.hours.Mon ? provider.hours : hoursToDisplayMap(normalizeProviderHours(provider.hours)),
    }
  }

  const mergedHours = normalizeProviderHours(override.editableHours || provider.editableHours || provider.hours)
  const mergedServices = override.services || provider.services || []
  const mergedTypeMeta = getPrimaryServiceType(mergedServices, override.type || provider.type || '')
  return {
    ...provider,
    ...override,
    services: mergedServices,
    coverPhoto: override.coverPhoto || provider.coverPhoto || provider.cover_photo || provider.cover || '',
    galleryPhotos: override.galleryPhotos || provider.galleryPhotos || provider.gallery_photos || [],
    editableHours: mergedHours,
    hours: hoursToDisplayMap(mergedHours),
    type: override.type || provider.type || mergedTypeMeta.type,
    type_label: override.type_label || provider.type_label || mergedTypeMeta.type_label,
    serviceCategories: getProviderServiceCategories(mergedServices, override.type || provider.type || ''),
    publicReady: isProviderProfileComplete({ ...provider, ...override, services: mergedServices }),
  }
}

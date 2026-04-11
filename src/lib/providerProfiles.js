import { supabase } from './supabase'

const STORAGE_KEY = 'flashmat-provider-overrides'
const STORAGE_KEY_PREFIX = 'flashmat-provider-overrides'
const AUTH_CACHE_KEY = 'flashmat-auth-cache'
const DESCRIPTION_META_PREFIX = '<!--FLASHMAT_PROVIDER_META:'
const DESCRIPTION_META_SUFFIX = '-->'

export const PROVIDER_SERVICE_OPTIONS = [
  { id: 'mechanic-general', label: 'Mecanique generale', icon: 'ME', category: 'mechanic' },
  { id: 'oil-change', label: 'Vidange', icon: 'VG', category: 'mechanic' },
  { id: 'brakes', label: 'Freins', icon: 'FR', category: 'mechanic' },
  { id: 'suspension', label: 'Suspension', icon: 'SP', category: 'mechanic' },
  { id: 'diagnostic', label: 'Diagnostic electronique', icon: 'DG', category: 'mechanic' },
  { id: 'ac', label: 'Climatisation', icon: 'CL', category: 'mechanic' },
  { id: 'tires', label: 'Pneus', icon: 'PN', category: 'tire' },
  { id: 'alignment', label: 'Alignement', icon: 'AL', category: 'tire' },
  { id: 'balancing', label: 'Balancement', icon: 'BL', category: 'tire' },
  { id: 'flat-repair', label: 'Reparation crevaison', icon: 'RC', category: 'tire' },
  { id: 'wash', label: 'Lavage auto', icon: 'LV', category: 'wash' },
  { id: 'detailing', label: 'Detailing', icon: 'DT', category: 'wash' },
  { id: 'ceramic', label: 'Traitement ceramique', icon: 'TC', category: 'wash' },
  { id: 'body', label: 'Carrosserie', icon: 'CR', category: 'body' },
  { id: 'paint', label: 'Peinture', icon: 'PT', category: 'body' },
  { id: 'dent', label: 'Debosselage', icon: 'DB', category: 'body' },
  { id: 'glass', label: 'Vitres auto', icon: 'VT', category: 'glass' },
  { id: 'windshield', label: 'Pare-brise', icon: 'PB', category: 'glass' },
  { id: 'towing', label: 'Remorquage', icon: 'RW', category: 'tow' },
  { id: 'roadside', label: 'Assistance routiere', icon: 'AR', category: 'tow' },
  { id: 'battery', label: 'Boost batterie', icon: 'BT', category: 'tow' },
  { id: 'lockout', label: 'Deverrouillage', icon: 'DV', category: 'tow' },
  { id: 'parts', label: 'Pieces auto', icon: 'PC', category: 'parts' },
  { id: 'parking', label: 'Stationnement', icon: 'PK', category: 'parking' },
  { id: 'performance', label: 'Performance', icon: 'PR', category: 'tuning' },
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

const CATEGORY_ICONS = {
  mechanic: 'ME',
  wash: 'LV',
  tire: 'PN',
  body: 'CR',
  glass: 'VT',
  tow: 'RW',
  parts: 'PC',
  parking: 'PK',
  tuning: 'PR',
}

export const PROVIDER_SERVICE_CATEGORY_LABELS = CATEGORY_LABELS
export const PROVIDER_SERVICE_CATEGORY_ICONS = CATEGORY_ICONS

const GLOBAL_SAMPLE_PROVIDERS = [
  {
    id: 'sample-fr-paris-auto',
    shop_name: 'Atelier Paris Rive Auto',
    name: 'Atelier Paris Rive Auto',
    email: 'parisrive@flashmat.sample',
    providerEmail: 'parisrive@flashmat.sample',
    address: '118 Rue de Charenton, Paris, France',
    phone: '+33 1 84 60 22 10',
    latitude: 48.8482,
    longitude: 2.3826,
    description: 'Atelier parisien axe sur la mecanique generale, le diagnostic electronique et les entretiens premium.',
    services: ['Mecanique generale', 'Vidange', 'Freins', 'Diagnostic electronique'],
    rating: 4.8,
    reviews: 124,
    is_open: true,
    type: 'mechanic',
    type_label: 'Mecanique',
  },
  {
    id: 'sample-tn-tunis-detail',
    shop_name: 'Tunis Lavage Signature',
    name: 'Tunis Lavage Signature',
    email: 'tunislavage@flashmat.sample',
    providerEmail: 'tunislavage@flashmat.sample',
    address: '14 Avenue Habib Bourguiba, Tunis, Tunisia',
    phone: '+216 71 245 880',
    latitude: 36.8008,
    longitude: 10.1809,
    description: 'Centre de lavage auto et detailing haut de gamme pour exterieur, interieur et finition ceramique.',
    services: ['Lavage auto', 'Detailing', 'Traitement ceramique'],
    rating: 4.9,
    reviews: 91,
    is_open: true,
    type: 'wash',
    type_label: 'Lave-auto',
  },
  {
    id: 'sample-it-milan-garage',
    shop_name: 'Milano Motori Garage',
    name: 'Milano Motori Garage',
    email: 'milanomotori@flashmat.sample',
    providerEmail: 'milanomotori@flashmat.sample',
    address: '22 Via Tortona, Milan, Italy',
    phone: '+39 02 9475 1180',
    latitude: 45.4527,
    longitude: 9.1656,
    description: 'Garage de Milan pour entretien courant, freins, suspension et performance urbaine.',
    services: ['Mecanique generale', 'Freins', 'Suspension', 'Performance'],
    rating: 4.7,
    reviews: 76,
    is_open: true,
    type: 'mechanic',
    type_label: 'Mecanique',
  },
  {
    id: 'sample-cn-shanghai-ev',
    shop_name: 'Shanghai EV Care Hub',
    name: 'Shanghai EV Care Hub',
    email: 'shanghaiev@flashmat.sample',
    providerEmail: 'shanghaiev@flashmat.sample',
    address: '88 Nanjing West Road, Shanghai, China',
    phone: '+86 21 6088 2211',
    latitude: 31.2308,
    longitude: 121.4737,
    description: 'Equipe specialisee en diagnostic electronique, climatisation et maintenance de vehicules modernes.',
    services: ['Diagnostic electronique', 'Climatisation', 'Mecanique generale'],
    rating: 4.8,
    reviews: 110,
    is_open: true,
    type: 'mechanic',
    type_label: 'Mecanique',
  },
  {
    id: 'sample-us-texas-tow',
    shop_name: 'Lone Star Road Assist',
    name: 'Lone Star Road Assist',
    email: 'lonestarassist@flashmat.sample',
    providerEmail: 'lonestarassist@flashmat.sample',
    address: '2400 Main Street, Dallas, Texas, USA',
    phone: '+1 (214) 555-0188',
    latitude: 32.7831,
    longitude: -96.8003,
    description: 'Service routier texan pour remorquage rapide, boost batterie, lockout et assistance pneu.',
    services: ['Remorquage', 'Assistance routiere', 'Boost batterie', 'Deverrouillage'],
    rating: 4.9,
    reviews: 143,
    is_open: true,
    type: 'tow',
    type_label: 'Remorquage',
  },
]

function toNumberOrNull(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function parseProviderCoords(provider) {
  if (Array.isArray(provider?.coords) && provider.coords.length === 2) {
    const lat = toNumberOrNull(provider.coords[0])
    const lng = toNumberOrNull(provider.coords[1])
    if (lat !== null && lng !== null) return [lat, lng]
  }

  const latitude = toNumberOrNull(
    provider?.latitude
    ?? provider?.lat
    ?? provider?.location_lat
    ?? provider?.locationLat,
  )
  const longitude = toNumberOrNull(
    provider?.longitude
    ?? provider?.lng
    ?? provider?.lon
    ?? provider?.location_lng
    ?? provider?.locationLng,
  )

  if (latitude !== null && longitude !== null) {
    return [latitude, longitude]
  }

  return null
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

function getScopedStorageKey() {
  const win = safeWindow()
  if (!win) return `${STORAGE_KEY_PREFIX}:anonymous`

  try {
    const rawAuth = win.localStorage.getItem(AUTH_CACHE_KEY)
    const parsedAuth = rawAuth ? JSON.parse(rawAuth) : null
    return `${STORAGE_KEY_PREFIX}:${parsedAuth?.user?.id || 'anonymous'}`
  } catch {
    return `${STORAGE_KEY_PREFIX}:anonymous`
  }
}

function readCurrentAuthIdentity() {
  const win = safeWindow()
  if (!win) return { userId: '', email: '' }

  try {
    const rawAuth = win.localStorage.getItem(AUTH_CACHE_KEY)
    const parsedAuth = rawAuth ? JSON.parse(rawAuth) : null
    return {
      userId: String(parsedAuth?.user?.id || '').trim(),
      email: String(parsedAuth?.user?.email || parsedAuth?.profile?.email || '').trim().toLowerCase(),
    }
  } catch {
    return { userId: '', email: '' }
  }
}

function readRawOverrides() {
  const win = safeWindow()
  if (!win) return {}

  try {
    const raw = win.localStorage.getItem(getScopedStorageKey())
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeRawOverrides(overrides) {
  const win = safeWindow()
  if (!win) return

  win.localStorage.setItem(getScopedStorageKey(), JSON.stringify(overrides))
  win.dispatchEvent(new CustomEvent('flashmat-provider-profile-updated'))
}

function encodeProviderMeta(meta) {
  try {
    return encodeURIComponent(JSON.stringify(meta))
  } catch {
    return ''
  }
}

function decodeProviderMeta(raw) {
  try {
    return JSON.parse(decodeURIComponent(raw))
  } catch {
    return {}
  }
}

export function serializeProviderDescription(description, meta = {}) {
  const cleanDescription = String(description || '').trim()
  const encodedMeta = encodeProviderMeta(meta)

  if (!encodedMeta) return cleanDescription

  return `${cleanDescription}\n\n${DESCRIPTION_META_PREFIX}${encodedMeta}${DESCRIPTION_META_SUFFIX}`
}

export function extractProviderDescriptionMeta(description) {
  const rawDescription = String(description || '')
  const start = rawDescription.indexOf(DESCRIPTION_META_PREFIX)

  if (start === -1) {
    return {
      description: rawDescription.trim(),
      meta: {},
    }
  }

  const end = rawDescription.indexOf(DESCRIPTION_META_SUFFIX, start)
  const visibleDescription = rawDescription.slice(0, start).trim()

  if (end === -1) {
    return {
      description: visibleDescription,
      meta: {},
    }
  }

  const encodedMeta = rawDescription.slice(start + DESCRIPTION_META_PREFIX.length, end)
  return {
    description: visibleDescription,
    meta: decodeProviderMeta(encodedMeta),
  }
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

export function normalizeProviderRecord(provider) {
  if (!provider) return provider

  const { description: visibleDescription, meta } = extractProviderDescriptionMeta(provider.description)
  const services = provider.services || []
  const typeMeta = getPrimaryServiceType(services, provider.type || '')
  const normalizedHours = normalizeProviderHours(
    provider.editableHours
    || meta.editableHours
    || meta.hours
    || provider.hours,
  )
  const explicitServiceTypes = Array.isArray(provider.serviceTypes || meta.serviceTypes)
    ? (provider.serviceTypes || meta.serviceTypes)
        .map((entry) => String(entry || '').trim().toLowerCase())
        .filter(Boolean)
    : []
  const derivedServiceTypes = getProviderServiceCategories(services, provider.type || '')
  const serviceTypes = explicitServiceTypes.length > 0 ? explicitServiceTypes : derivedServiceTypes

  return {
    ...provider,
    id: provider.id,
    name: provider.name || provider.shop_name || '',
    shop_name: provider.shop_name || provider.name || '',
    type: provider.type || typeMeta.type,
    type_label: provider.type_label || typeMeta.type_label,
    icon: provider.icon || CATEGORY_ICONS[provider.type || typeMeta.type] || 'ME',
    logo: provider.logo || provider.icon || CATEGORY_ICONS[provider.type || typeMeta.type] || 'ME',
    address: provider.address || '',
    phone: provider.phone || '',
    description: visibleDescription,
    services,
    rating: Number(provider.rating ?? 5),
    reviews: Number(provider.reviews ?? 0),
    is_open: provider.is_open ?? true,
    providerEmail: provider.providerEmail || provider.email || '',
    coords: parseProviderCoords(provider),
    highlights: provider.highlights || services,
    editableHours: normalizedHours,
    hours: hoursToDisplayMap(normalizedHours),
    coverPhoto: provider.coverPhoto || provider.cover_photo || provider.cover || meta.coverPhoto || '',
    galleryPhotos: provider.galleryPhotos || provider.gallery_photos || meta.galleryPhotos || [],
    logoImageUrl: provider.logoImageUrl || provider.logo_image_url || meta.logoImageUrl || '',
    staffMembers: Array.isArray(provider.staffMembers || meta.staffMembers)
      ? (provider.staffMembers || meta.staffMembers)
      : [],
    serviceTypes,
  }
}

export async function fetchProviders() {
  const { data } = await supabase
    .from('providers')
    .select('*')
    .order('rating', { ascending: false })
    .limit(100)

  const combinedProviders = [...GLOBAL_SAMPLE_PROVIDERS, ...(data || [])]

  return combinedProviders
    .map(mergeProviderProfile)
    .filter((provider, index, all) => provider.publicReady && all.findIndex((entry) => entry.id === provider.id) === index)
    .sort((left, right) => Number(right.rating || 0) - Number(left.rating || 0))
}

export function mergeProviderProfile(provider) {
  const normalizedProvider = normalizeProviderRecord(provider)
  const baseTypeMeta = getPrimaryServiceType(normalizedProvider?.services || [], normalizedProvider?.type || '')
  const authIdentity = readCurrentAuthIdentity()
  const providerOwnerId = String(normalizedProvider?.id || '').trim()
  const providerOwnerEmail = String(
    normalizedProvider?.providerEmail
    || normalizedProvider?.email
    || ''
  )
    .trim()
    .toLowerCase()
  const canUseLocalOverride = Boolean(
    (authIdentity.userId && providerOwnerId && authIdentity.userId === providerOwnerId)
    || (authIdentity.email && providerOwnerEmail && authIdentity.email === providerOwnerEmail)
  )
  const override = canUseLocalOverride ? getProviderOverride(normalizedProvider) : null
  if (!override) {
    return {
      ...normalizedProvider,
      type: normalizedProvider.type || baseTypeMeta.type,
      type_label: normalizedProvider.type_label || baseTypeMeta.type_label,
      serviceCategories: getProviderServiceCategories(normalizedProvider?.services || [], normalizedProvider?.type || ''),
      publicReady: isProviderProfileComplete(normalizedProvider),
      editableHours: normalizeProviderHours(normalizedProvider.editableHours || normalizedProvider.hours),
      coverPhoto: normalizedProvider.coverPhoto || normalizedProvider.cover_photo || normalizedProvider.cover || '',
      galleryPhotos: normalizedProvider.galleryPhotos || normalizedProvider.gallery_photos || [],
      logoImageUrl: normalizedProvider.logoImageUrl || normalizedProvider.logo_image_url || '',
      staffMembers: Array.isArray(normalizedProvider.staffMembers) ? normalizedProvider.staffMembers : [],
      serviceTypes: Array.isArray(normalizedProvider.serviceTypes) && normalizedProvider.serviceTypes.length > 0
        ? normalizedProvider.serviceTypes
        : getProviderServiceCategories(normalizedProvider?.services || [], normalizedProvider?.type || ''),
      hours: normalizedProvider.hours && normalizedProvider.hours.Mon ? normalizedProvider.hours : hoursToDisplayMap(normalizeProviderHours(normalizedProvider.hours)),
    }
  }

  const mergedHours = normalizeProviderHours(override.editableHours || normalizedProvider.editableHours || normalizedProvider.hours)
  const mergedServices = override.services || normalizedProvider.services || []
  const mergedTypeMeta = getPrimaryServiceType(mergedServices, override.type || normalizedProvider.type || '')
  return {
    ...normalizedProvider,
    ...override,
    services: mergedServices,
    coverPhoto: override.coverPhoto || normalizedProvider.coverPhoto || normalizedProvider.cover_photo || normalizedProvider.cover || '',
    galleryPhotos: override.galleryPhotos || normalizedProvider.galleryPhotos || normalizedProvider.gallery_photos || [],
    logoImageUrl: override.logoImageUrl || normalizedProvider.logoImageUrl || normalizedProvider.logo_image_url || '',
    staffMembers: Array.isArray(override.staffMembers || normalizedProvider.staffMembers)
      ? (override.staffMembers || normalizedProvider.staffMembers)
      : [],
    serviceTypes: Array.isArray(override.serviceTypes) && override.serviceTypes.length > 0
      ? override.serviceTypes
      : (Array.isArray(normalizedProvider.serviceTypes) && normalizedProvider.serviceTypes.length > 0
        ? normalizedProvider.serviceTypes
        : getProviderServiceCategories(mergedServices, override.type || normalizedProvider.type || '')),
    editableHours: mergedHours,
    hours: hoursToDisplayMap(mergedHours),
    type: override.type || normalizedProvider.type || mergedTypeMeta.type,
    type_label: override.type_label || normalizedProvider.type_label || mergedTypeMeta.type_label,
    serviceCategories: getProviderServiceCategories(mergedServices, override.type || normalizedProvider.type || ''),
    publicReady: isProviderProfileComplete({ ...normalizedProvider, ...override, services: mergedServices }),
  }
}


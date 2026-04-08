const GOOGLE_MAPS_SCRIPT_ID = 'flashmat-google-maps-sdk'
const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY
const GEOCODE_CACHE_KEY = 'flashmat-geocode-cache-v1'
const GEOCODE_CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 30

let googleMapsPromise = null

function getWindow() {
  return typeof window !== 'undefined' ? window : null
}

function normalizeLibraries(libraries = []) {
  return Array.from(new Set(libraries.filter(Boolean))).sort()
}

function buildScriptSrc(libraries = []) {
  const params = new URLSearchParams({ key: GOOGLE_MAPS_KEY })
  const normalizedLibraries = normalizeLibraries([...libraries, 'places'])
  if (normalizedLibraries.length > 0) {
    params.set('libraries', normalizedLibraries.join(','))
  }
  return `https://maps.googleapis.com/maps/api/js?${params.toString()}`
}

export function hasValidCoords(coords) {
  return Array.isArray(coords)
    && coords.length === 2
    && Number.isFinite(Number(coords[0]))
    && Number.isFinite(Number(coords[1]))
}

export function loadGoogleMapsApi(libraries = []) {
  const win = getWindow()
  if (!win) {
    return Promise.reject(new Error('Google Maps is only available in the browser.'))
  }

  const needsPlaces = normalizeLibraries(libraries).includes('places')

  if (win.google?.maps && (!needsPlaces || win.google?.maps?.places)) {
    return Promise.resolve(win.google)
  }

  if (!GOOGLE_MAPS_KEY) {
    return Promise.reject(new Error('Google Maps API key is not configured.'))
  }

  if (googleMapsPromise) {
    return googleMapsPromise
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById(GOOGLE_MAPS_SCRIPT_ID)

    if (existing) {
      existing.addEventListener('load', () => resolve(win.google), { once: true })
      existing.addEventListener('error', () => reject(new Error('Unable to load Google Maps.')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.id = GOOGLE_MAPS_SCRIPT_ID
    script.src = buildScriptSrc(libraries)
    script.async = true
    script.defer = true
    script.onload = () => resolve(win.google)
    script.onerror = () => reject(new Error('Unable to load Google Maps.'))
    document.head.appendChild(script)
  })

  return googleMapsPromise
}

function readGeocodeCache() {
  const win = getWindow()
  if (!win) return {}

  try {
    return JSON.parse(win.localStorage.getItem(GEOCODE_CACHE_KEY) || '{}')
  } catch {
    return {}
  }
}

function writeGeocodeCache(cache) {
  const win = getWindow()
  if (!win) return

  try {
    win.localStorage.setItem(GEOCODE_CACHE_KEY, JSON.stringify(cache))
  } catch {
    // Ignore storage issues and keep geocoding functional.
  }
}

function getCachedGeocode(addressKey) {
  const entry = readGeocodeCache()[addressKey]
  if (!entry) return null

  if ((Date.now() - Number(entry.timestamp || 0)) > GEOCODE_CACHE_TTL_MS) {
    const cache = readGeocodeCache()
    delete cache[addressKey]
    writeGeocodeCache(cache)
    return null
  }

  return hasValidCoords(entry.coords) ? entry.coords.map(Number) : null
}

function setCachedGeocode(addressKey, coords) {
  const cache = readGeocodeCache()
  cache[addressKey] = {
    coords: coords.map(Number),
    timestamp: Date.now(),
  }
  writeGeocodeCache(cache)
}

export async function geocodeAddress(address) {
  const query = String(address || '').trim()
  if (!query) return null

  const addressKey = query.toLowerCase()
  const cached = getCachedGeocode(addressKey)
  if (cached) return cached

  const google = await loadGoogleMapsApi()
  const geocoder = new google.maps.Geocoder()

  const result = await new Promise((resolve, reject) => {
    geocoder.geocode(
      {
        address: query,
        region: 'ca',
        componentRestrictions: {
          country: ['CA', 'US'],
        },
      },
      (results, status) => {
        if (status !== 'OK' || !results?.[0]?.geometry?.location) {
          reject(new Error(`Geocoding failed with status: ${status}`))
          return
        }

        const location = results[0].geometry.location
        resolve([location.lat(), location.lng()])
      },
    )
  })

  if (hasValidCoords(result)) {
    setCachedGeocode(addressKey, result)
    return result.map(Number)
  }

  return null
}

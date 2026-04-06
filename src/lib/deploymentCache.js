const APP_VERSION_STORAGE_KEY = 'flashmat-app-version'
const APP_RELOAD_STORAGE_KEY = 'flashmat-app-version-reload'
const PERSISTENT_STORAGE_PREFIXES = [
  'flashmat-vehicle-extras:',
]

function safeWindow() {
  return typeof window !== 'undefined' ? window : null
}

function clearFlashMatStorage(storage) {
  if (!storage) return

  const keysToRemove = []
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index)
    const shouldPreserve = key && PERSISTENT_STORAGE_PREFIXES.some((prefix) => key.startsWith(prefix))
    if (key && key.startsWith('flashmat-') && !shouldPreserve) {
      keysToRemove.push(key)
    }
  }

  keysToRemove.forEach((key) => storage.removeItem(key))
}

async function clearBrowserCaches(win) {
  if ('caches' in win) {
    const cacheKeys = await win.caches.keys()
    await Promise.all(cacheKeys.map((key) => win.caches.delete(key)))
  }

  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(registrations.map((registration) => registration.unregister()))
  }
}

export async function applyDeploymentVersion() {
  const win = safeWindow()
  if (!win) return

  const currentVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev'
  const previousVersion = win.localStorage.getItem(APP_VERSION_STORAGE_KEY)
  const reloadMarker = win.sessionStorage.getItem(APP_RELOAD_STORAGE_KEY)

  if (!previousVersion) {
    win.localStorage.setItem(APP_VERSION_STORAGE_KEY, currentVersion)
    return
  }

  if (previousVersion === currentVersion) {
    win.sessionStorage.removeItem(APP_RELOAD_STORAGE_KEY)
    return
  }

  clearFlashMatStorage(win.localStorage)
  clearFlashMatStorage(win.sessionStorage)
  await clearBrowserCaches(win)
  win.localStorage.setItem(APP_VERSION_STORAGE_KEY, currentVersion)

  if (reloadMarker === currentVersion) {
    win.sessionStorage.removeItem(APP_RELOAD_STORAGE_KEY)
    return
  }

  win.sessionStorage.setItem(APP_RELOAD_STORAGE_KEY, currentVersion)
  win.location.reload()
}

const APP_VERSION_STORAGE_KEY = 'flashmat-app-version'
const APP_RELOAD_STORAGE_KEY = 'flashmat-app-version-reload'
const TRANSIENT_SESSION_KEYS = [
  'flashmat-post-login-redirect',
  'flashmat-pending-service-search',
]

function safeWindow() {
  return typeof window !== 'undefined' ? window : null
}

function clearTransientSessionState(storage) {
  if (!storage) return
  TRANSIENT_SESSION_KEYS.forEach((key) => storage.removeItem(key))
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

  clearTransientSessionState(win.sessionStorage)
  win.localStorage.setItem(APP_VERSION_STORAGE_KEY, currentVersion)

  if (reloadMarker === currentVersion) {
    win.sessionStorage.removeItem(APP_RELOAD_STORAGE_KEY)
    return
  }

  win.sessionStorage.setItem(APP_RELOAD_STORAGE_KEY, currentVersion)
  win.location.reload()
}

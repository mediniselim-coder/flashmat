const FLASHFIX_REQUESTS_KEY = 'flashmat-flashfix-requests'
export const FLASHFIX_UPDATED_EVENT = 'flashmat:flashfix-updated'

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function nowIso() {
  return new Date().toISOString()
}

function makeEvent(label, actor = 'system') {
  return {
    id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    label,
    actor,
    at: nowIso(),
  }
}

export function readFlashFixRequests() {
  if (!canUseStorage()) return []

  try {
    const raw = window.localStorage.getItem(FLASHFIX_REQUESTS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function writeFlashFixRequests(requests) {
  if (!canUseStorage()) return
  window.localStorage.setItem(FLASHFIX_REQUESTS_KEY, JSON.stringify(requests))
  window.dispatchEvent(new CustomEvent(FLASHFIX_UPDATED_EVENT, { detail: { count: requests.length } }))
}

export function createFlashFixRequest(payload) {
  const request = {
    id: `ffx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    status: 'pending',
    providerName: null,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    events: [makeEvent('Demande FlashFix envoyee', 'client')],
    ...payload,
  }

  const next = [request, ...readFlashFixRequests()]
  writeFlashFixRequests(next)
  return request
}

export function updateFlashFixRequest(requestId, updater) {
  const current = readFlashFixRequests()
  const next = current.map((request) => {
    if (request.id !== requestId) return request
    const updated = typeof updater === 'function' ? updater(request) : { ...request, ...updater }
    return {
      ...updated,
      updatedAt: nowIso(),
    }
  })
  writeFlashFixRequests(next)
  return next.find((request) => request.id === requestId) || null
}

export function providerRespondToFlashFix(requestId, action, providerName) {
  return updateFlashFixRequest(requestId, (request) => {
    if (action === 'accept') {
      return {
        ...request,
        status: 'accepted',
        providerName,
        events: [...(request.events || []), makeEvent(`${providerName} a accepte la demande`, 'provider')],
      }
    }

    return {
      ...request,
      status: 'refused',
      providerName,
      events: [...(request.events || []), makeEvent(`${providerName} a refuse la demande`, 'provider')],
    }
  })
}

export function advanceFlashFixRequest(requestId, nextStatus, providerName) {
  const statusLabels = {
    en_route: `${providerName} est en route`,
    onsite: `${providerName} est arrive sur place`,
    completed: `Intervention terminee par ${providerName}`,
  }

  return updateFlashFixRequest(requestId, (request) => ({
    ...request,
    status: nextStatus,
    providerName: providerName || request.providerName,
    events: [...(request.events || []), makeEvent(statusLabels[nextStatus] || 'Mise a jour FlashFix', 'provider')],
  }))
}

export function getFlashFixStatusMeta(status) {
  const map = {
    pending: { label: 'En attente provider', cls: 'badge-blue' },
    accepted: { label: 'Acceptee', cls: 'badge-green' },
    en_route: { label: 'En route', cls: 'badge-amber' },
    onsite: { label: 'Sur place', cls: 'badge-amber' },
    completed: { label: 'Terminee', cls: 'badge-green' },
    refused: { label: 'Refusee', cls: 'badge-amber' },
  }

  return map[status] || { label: 'En cours', cls: 'badge-gray' }
}

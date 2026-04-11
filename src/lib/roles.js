export function isProviderRole(role) {
  return role === 'provider'
}

export function isClientRole(role) {
  return role === 'client'
}

export function isAdminRole(role) {
  return role === 'flashmat_admin'
}

export function getDefaultAppRoute(role) {
  if (isProviderRole(role)) return '/app/provider'
  if (isAdminRole(role)) return '/app/admin'
  return '/app/client'
}

export function getRoleLabel(role) {
  if (isProviderRole(role)) return 'fournisseur'
  if (isAdminRole(role)) return 'flashmat admin'
  if (isClientRole(role)) return 'client'
  return 'compte flashmat'
}

export function getRoleModeLabel(role) {
  if (isProviderRole(role)) return 'PROVIDER'
  if (isAdminRole(role)) return 'ADMIN'
  return 'CLIENT'
}

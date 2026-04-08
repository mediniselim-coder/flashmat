import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})
const AUTH_CACHE_KEY = 'flashmat-auth-cache'

function readAuthCache() {
  if (typeof window === 'undefined') return { user: null, profile: null }
  try {
    const raw = window.sessionStorage.getItem(AUTH_CACHE_KEY)
    if (!raw) return { user: null, profile: null }
    const parsed = JSON.parse(raw)
    const nextUser = parsed?.user ?? null
    const nextProfile = parsed?.profile ?? null
    const profileMatchesUser = !nextUser || !nextProfile || String(nextProfile.id || '') === String(nextUser.id || '')
    return {
      user: nextUser,
      profile: profileMatchesUser ? nextProfile : null,
    }
  } catch {
    return { user: null, profile: null }
  }
}

function writeAuthCache(user, profile) {
  if (typeof window === 'undefined') return
  try {
    if (!user && !profile) {
      window.sessionStorage.removeItem(AUTH_CACHE_KEY)
      return
    }
    window.sessionStorage.setItem(AUTH_CACHE_KEY, JSON.stringify({ user, profile }))
  } catch {
    // Ignore storage failures and keep the in-memory state.
  }
}

function matchesIdentity(record, userId = '') {
  return String(record?.id || '') === String(userId || '')
}

function clearCurrentUserScopedStorage(userId = '') {
  if (typeof window === 'undefined') return

  const keysToRemove = [AUTH_CACHE_KEY]
  const normalizedUserId = String(userId || '').trim()

  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index)
      if (!key) continue

      if (
        key.startsWith('flashmat-vehicle-extras:')
        || key.startsWith('flashmat-vehicle-gallery:')
        || key.startsWith('flashmat-provider-profile-draft:')
        || key.startsWith('flashmat-provider-overrides:')
        || key.startsWith('flashmat-client-vehicles:')
      ) {
        if (!normalizedUserId || key.includes(normalizedUserId) || key.endsWith(':anonymous')) {
          keysToRemove.push(key)
        }
      }
    }

    Array.from(new Set(keysToRemove)).forEach((key) => {
      window.localStorage.removeItem(key)
      window.sessionStorage.removeItem(key)
    })
  } catch {
    // Ignore storage cleanup errors and keep the auth flow moving.
  }
}

function clearSupabaseBrowserSession() {
  if (typeof window === 'undefined') return

  try {
    const keysToRemove = []

    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index)
      if (!key) continue

      if (
        key.startsWith('sb-')
        || key.includes('-auth-token')
        || key.includes('supabase.auth.token')
      ) {
        keysToRemove.push(key)
      }
    }

    keysToRemove.forEach((key) => {
      window.localStorage.removeItem(key)
      window.sessionStorage.removeItem(key)
    })
  } catch {
    // Ignore browser storage cleanup failures.
  }
}

function buildProfileRecord(record = {}, authUser = null) {
  const metadata = authUser?.user_metadata || {}

  return {
    ...record,
    id: record?.id || authUser?.id || null,
    email: record?.email || authUser?.email || '',
    full_name: record?.full_name || metadata.full_name || '',
    phone: record?.phone || '',
    address: record?.address || '',
    city: record?.city || '',
    province: record?.province || '',
    postal_code: record?.postal_code || '',
    avatar_url: record?.avatar_url || '',
    role: record?.role || metadata.role || '',
  }
}

function getMissingProfileColumn(error) {
  const message = String(error?.message || '')
  const match = message.match(/Could not find the '([^']+)' column/i)
  return match?.[1] || null
}

async function upsertProfileWithFallback(profileRecord) {
  let candidate = { ...profileRecord }

  while (true) {
    const result = await supabase
      .from('profiles')
      .upsert(candidate, { onConflict: 'id' })
      .select()
      .single()

    if (!result.error) return result

    const missingColumn = getMissingProfileColumn(result.error)
    if (!missingColumn || missingColumn === 'id' || !(missingColumn in candidate)) {
      return result
    }

    delete candidate[missingColumn]
  }
}

export function AuthProvider({ children }) {
  const cachedAuth            = readAuthCache()
  const [user, setUser]       = useState(cachedAuth.user)
  const [profile, setProfile] = useState(cachedAuth.profile)
  const [loading, setLoading] = useState(true)
  const explicitSignOutRef    = useRef(false)

  useEffect(() => {
    // Get current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        fetchProfile(session.user.id, session.user)
        return
      }

      setUser(null)
      setProfile(null)
      writeAuthCache(null, null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user && _event !== 'SIGNED_OUT' && !explicitSignOutRef.current) {
        return
      }

      setUser(session?.user ?? null)
      if (session?.user) {
        setProfile(null)
        writeAuthCache(session.user, null)
        fetchProfile(session.user.id, session.user)
      }
      else {
        setProfile(null)
        writeAuthCache(null, null)
        setLoading(false)
      }

      if (_event === 'SIGNED_OUT') {
        explicitSignOutRef.current = false
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function fetchProfile(userId, authUser = user ?? cachedAuth.user ?? null) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    const safeCurrentProfile = matchesIdentity(profile, userId) ? profile : null
    const safeCachedProfile = matchesIdentity(cachedAuth.profile, userId) ? cachedAuth.profile : null
    const nextProfile = buildProfileRecord(data ?? safeCurrentProfile ?? safeCachedProfile ?? {}, authUser)

    setProfile(nextProfile)
    writeAuthCache(authUser, nextProfile)
    setLoading(false)
  }

  async function signUp({ email, password, fullName, role }) {
    explicitSignOutRef.current = false
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName, role } }
    })
    if (error) throw error

    // Keep the profile in sync if the auth trigger already created it.
    if (data.user) {
      await supabase.from('profiles').upsert({
        id: data.user.id,
        full_name: fullName,
        email,
        role,
      }, {
        onConflict: 'id',
      })
    }
    return data
  }

  async function signIn({ email, password }) {
    explicitSignOutRef.current = false
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  async function signOut() {
    explicitSignOutRef.current = true
    try {
      await supabase.auth.signOut({ scope: 'local' })
    } finally {
      clearSupabaseBrowserSession()
      setUser(null)
      setProfile(null)
      writeAuthCache(null, null)
      explicitSignOutRef.current = false
      setLoading(false)
    }
  }

  async function shrinkAuthMetadata(activeUser = user, activeProfile = profile) {
    if (!activeUser?.id) return activeUser

    const { data, error } = await supabase.auth.updateUser({
      data: {
        ...(activeUser.user_metadata || {}),
        full_name: activeProfile?.full_name || activeUser.user_metadata?.full_name || '',
        role: activeProfile?.role || activeUser.user_metadata?.role || 'client',
        phone: null,
        address: null,
        city: null,
        province: null,
        postal_code: null,
        avatar_url: null,
      },
    })

    if (error) throw error
    if (data?.user) {
      setUser(data.user)
      return data.user
    }

    return activeUser
  }

  async function deleteAccount() {
    if (!user?.id) throw new Error('You need to be signed in to delete your account.')

    await shrinkAuthMetadata(user, profile)

    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) throw sessionError

    const accessToken = sessionData?.session?.access_token
    if (!accessToken) {
      throw new Error('Your session expired. Sign in again before deleting your account.')
    }

    const response = await fetch('/api/delete-account', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
      credentials: 'same-origin',
      body: JSON.stringify({ accessToken }),
    })

    let payload = null
    try {
      payload = await response.json()
    } catch {
      payload = null
    }

    if (!response.ok) {
      throw new Error(payload?.error || `Unable to delete your account right now. (HTTP ${response.status})`)
    }

    explicitSignOutRef.current = true
    clearCurrentUserScopedStorage(user.id)
    try {
      await supabase.auth.signOut({ scope: 'local' })
    } catch {
      // Ignore remote sign-out failures after the user row is already gone.
    } finally {
      clearSupabaseBrowserSession()
    }
    setUser(null)
    setProfile(null)
    writeAuthCache(null, null)
  }

  async function updateProfile(updates = {}) {
    if (!user?.id) throw new Error('You need to be signed in to update your profile.')

    const nextProfile = buildProfileRecord({
      ...(matchesIdentity(profile, user.id) ? profile : {}),
      ...updates,
      email: profile?.email || user.email || '',
      id: user.id,
    }, user)

    const authPayload = {}
    const nextMetadata = {
      ...(user.user_metadata || {}),
      full_name: nextProfile.full_name,
      role: nextProfile.role || profile?.role || user.user_metadata?.role || 'client',
      phone: null,
      address: null,
      city: null,
      province: null,
      postal_code: null,
      avatar_url: null,
    }
    authPayload.data = nextMetadata

    let activeUser = user

    if (Object.keys(authPayload).length > 0) {
      const { data, error } = await supabase.auth.updateUser(authPayload)
      if (error) throw error
      if (data?.user) {
        activeUser = data.user
        setUser(data.user)
      }
    }

    const { data, error } = await upsertProfileWithFallback(nextProfile)

    if (error) throw error

    const resolvedProfile = buildProfileRecord(data || nextProfile, activeUser)
    setProfile(resolvedProfile)
    writeAuthCache(activeUser, resolvedProfile)
    return resolvedProfile
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signUp, signIn, signOut, fetchProfile, updateProfile, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

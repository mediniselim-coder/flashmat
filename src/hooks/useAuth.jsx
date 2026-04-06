import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})
const AUTH_CACHE_KEY = 'flashmat-auth-cache'

function readAuthCache() {
  if (typeof window === 'undefined') return { user: null, profile: null }
  try {
    const raw = window.localStorage.getItem(AUTH_CACHE_KEY)
    if (!raw) return { user: null, profile: null }
    const parsed = JSON.parse(raw)
    return {
      user: parsed?.user ?? null,
      profile: parsed?.profile ?? null,
    }
  } catch {
    return { user: null, profile: null }
  }
}

function writeAuthCache(user, profile) {
  if (typeof window === 'undefined') return
  try {
    if (!user && !profile) {
      window.localStorage.removeItem(AUTH_CACHE_KEY)
      return
    }
    window.localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify({ user, profile }))
  } catch {
    // Ignore storage failures and keep the in-memory state.
  }
}

function buildProfileRecord(record = {}, authUser = null) {
  const metadata = authUser?.user_metadata || {}

  return {
    ...record,
    id: record?.id || authUser?.id || null,
    email: record?.email || authUser?.email || '',
    full_name: record?.full_name || metadata.full_name || '',
    phone: record?.phone || metadata.phone || '',
    address: record?.address || metadata.address || '',
    city: record?.city || metadata.city || '',
    province: record?.province || metadata.province || '',
    postal_code: record?.postal_code || metadata.postal_code || '',
    avatar_url: record?.avatar_url || metadata.avatar_url || '',
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
        writeAuthCache(session.user, profile ?? cachedAuth.profile ?? null)
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
    const nextProfile = buildProfileRecord(data ?? profile ?? cachedAuth.profile ?? {}, authUser)
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
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
    writeAuthCache(null, null)
  }

  async function updateProfile(updates = {}) {
    if (!user?.id) throw new Error('You need to be signed in to update your profile.')

    const nextProfile = buildProfileRecord({
      ...(profile || {}),
      ...updates,
      email: profile?.email || user.email || '',
      id: user.id,
    }, user)

    const authPayload = {}
    const nextMetadata = {
      ...(user.user_metadata || {}),
      full_name: nextProfile.full_name,
      role: nextProfile.role || profile?.role || user.user_metadata?.role || 'client',
      phone: nextProfile.phone || '',
      address: nextProfile.address || '',
      city: nextProfile.city || '',
      province: nextProfile.province || '',
      postal_code: nextProfile.postal_code || '',
      avatar_url: nextProfile.avatar_url || '',
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
    <AuthContext.Provider value={{ user, profile, loading, signUp, signIn, signOut, fetchProfile, updateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

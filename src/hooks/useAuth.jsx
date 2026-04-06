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
    const nextProfile = data ?? profile ?? cachedAuth.profile ?? null
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

  return (
    <AuthContext.Provider value={{ user, profile, loading, signUp, signIn, signOut, fetchProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)

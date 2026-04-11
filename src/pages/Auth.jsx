import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getDefaultAppRoute } from '../lib/roles'

// Cette page /auth redirige simplement vers l'accueil.
// Le login se fait via le popup LoginModal dans NavBar.
export default function Auth() {
  const navigate = useNavigate()
  const { user, profile, loading } = useAuth()

  useEffect(() => {
    if (loading) return

    if (user && profile) {
      navigate(getDefaultAppRoute(profile.role), { replace: true })
    } else {
      navigate('/', { replace: true })
    }
  }, [user, profile, loading, navigate])

  return null
}

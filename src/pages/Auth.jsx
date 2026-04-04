import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

// Cette page /auth redirige simplement vers l'accueil.
// Le login se fait via le popup LoginModal dans NavBar.
export default function Auth() {
  const navigate = useNavigate()
  const { user, profile, loading } = useAuth()

  useEffect(() => {
    if (loading) return

    if (user && profile) {
      navigate(profile.role === 'provider' ? '/app/provider' : '/app/client', { replace: true })
    } else {
      navigate('/', { replace: true })
    }
  }, [user, profile, loading, navigate])

  return null
}

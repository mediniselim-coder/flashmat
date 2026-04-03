import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

// Cette page /auth redirige simplement vers l'accueil
// Le login se fait maintenant via le popup LoginModal dans NavBar
export default function Auth() {
  const navigate = useNavigate()
  const { user, profile } = useAuth()

  useEffect(() => {
    // Si déjà connecté, redirige vers le bon dashboard
    if (user && profile) {
      navigate(profile.role === 'provider' ? '/app/provider' : '/app/client', { replace: true })
    } else {
      // Sinon retourne à l'accueil (le popup s'ouvrira depuis le NavBar)
      navigate('/', { replace: true })
    }
  }, [user, profile, navigate])

  return null
}

import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { AuthProvider, useAuth } from './hooks/useAuth'
import { ToastProvider } from './hooks/useToast'
import { supabase } from './lib/supabase'
import Landing from './pages/Landing'
import Auth from './pages/Auth'
import ClientApp from './pages/ClientApp'
import ProviderApp from './pages/ProviderApp'

function AuthCallback() {
  const navigate = useNavigate()
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const role = session.user.user_metadata?.role || 'client'
        navigate(role === 'provider' ? '/app/provider' : '/app/client', { replace: true })
      } else {
        navigate('/auth', { replace: true })
      }
    })
  }, [navigate])
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg,var(--green),var(--blue))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, margin: '0 auto 16px' }}>⚡</div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink3)' }}>Connexion en cours…</div>
      </div>
    </div>
  )
}

function ProtectedRoute({ children, requiredRole }) {
  const { user, profile, loading } = useAuth()
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg,var(--green),var(--blue))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, margin: '0 auto 16px' }}>⚡</div>
        <div style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink3)' }}>Chargement FlashMat…</div>
      </div>
    </div>
  )
  if (!user) return <Navigate to="/auth" replace />
  if (requiredRole && profile?.role !== requiredRole) {
    return <Navigate to={profile?.role === 'provider' ? '/app/provider' : '/app/client'} replace />
  }
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/app/client/*" element={
            <ProtectedRoute requiredRole="client"><ClientApp /></ProtectedRoute>
          } />
          <Route path="/app/provider/*" element={
            <ProtectedRoute requiredRole="provider"><ProviderApp /></ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ToastProvider>
    </AuthProvider>
  )
}
```


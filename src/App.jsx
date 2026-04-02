import { Routes, Route, Navigate, useNavigate } from "react-router-dom"
import { useEffect } from "react"
import { AuthProvider, useAuth } from "./hooks/useAuth"
import { ToastProvider } from "./hooks/useToast"
import { supabase } from "./lib/supabase"
import Landing from "./pages/Landing"
import Auth from "./pages/Auth"
import ClientApp from "./pages/ClientApp"
import ProviderApp from "./pages/ProviderApp"

function AuthCallback() {
  const navigate = useNavigate()
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const role = session.user.user_metadata?.role || "client"
        navigate(role === "provider" ? "/app/provider" : "/app/client", { replace: true })
      } else {
        navigate("/auth", { replace: true })
      }
    })
  }, [navigate])
  return null
}

function ProtectedRoute({ children, requiredRole }) {
  const { user, profile, loading } = useAuth()
  if (loading) return null
  if (!user) return <Navigate to="/auth" replace />
  if (requiredRole && profile?.role !== requiredRole) {
    return <Navigate to={profile?.role === "provider" ? "/app/provider" : "/app/client"} replace />
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

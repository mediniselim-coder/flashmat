import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom"
import { useEffect } from "react"
import { AuthProvider, useAuth } from "./hooks/useAuth"
import { ToastProvider } from "./hooks/useToast"
import { supabase } from "./lib/supabase"
import Landing from "./pages/Landing"
import Auth from "./pages/Auth"
import ClientApp from "./pages/ClientApp"
import ProviderApp from "./pages/ProviderApp"
import ProviderProfile from "./pages/ProviderProfile"
import Services from "./pages/Services"
import AutoDoctor from "./pages/AutoDoctor"
import FlashFixUrgence from "./pages/FlashFixUrgence"
import PublicMarketplace from "./pages/PublicMarketplace"

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
  const location = useLocation()

  if (loading) return null

  if (!user) {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("flashmat-post-login-redirect", `${location.pathname}${location.search}`)
    }
    return <Navigate to="/?login=1" replace />
  }

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
          <Route path="/services" element={<Services />} />
          <Route path="/doctor" element={<AutoDoctor />} />
          <Route path="/urgence" element={<FlashFixUrgence />} />
          <Route path="/marketplace" element={<PublicMarketplace />} />
          <Route path="/provider/:slug" element={<ProviderProfile />} />
          <Route path="/app/search" element={<Navigate to="/" replace />} />
          <Route
            path="/app/marketplace"
            element={
              <ProtectedRoute requiredRole="client">
                <ClientApp />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/client/*"
            element={
              <ProtectedRoute requiredRole="client">
                <ClientApp />
              </ProtectedRoute>
            }
          />
          <Route
            path="/app/provider/*"
            element={
              <ProtectedRoute requiredRole="provider">
                <ProviderApp />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ToastProvider>
    </AuthProvider>
  )
}

import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom"
import { useEffect, lazy, Suspense } from "react"
import { AuthProvider, useAuth } from "./hooks/useAuth"
import { ToastProvider } from "./hooks/useToast"
import { supabase } from "./lib/supabase"

const Landing = lazy(() => import("./pages/Landing"))
const Auth = lazy(() => import("./pages/Auth"))
const ClientApp = lazy(() => import("./pages/ClientApp"))
const ProviderApp = lazy(() => import("./pages/ProviderApp"))
const ProviderProfile = lazy(() => import("./pages/ProviderProfile"))
const Services = lazy(() => import("./pages/Services"))
const ServiceProviders = lazy(() => import("./pages/ServiceProviders"))
const AutoDoctor = lazy(() => import("./pages/AutoDoctor"))
const FlashFixUrgence = lazy(() => import("./pages/FlashFixUrgence"))
const PublicMarketplace = lazy(() => import("./pages/PublicMarketplace"))
const VehicleDetails = lazy(() => import("./pages/VehicleDetails"))
const PublicVehicleListing = lazy(() => import("./pages/PublicVehicleListing"))
const Community = lazy(() => import("./pages/Community"))
const Pricing = lazy(() => import("./pages/Pricing"))
const Contact = lazy(() => import("./pages/Contact"))
const Messages = lazy(() => import("./pages/Messages"))

function RouteLoadingScreen() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "linear-gradient(180deg, #edf4ff 0%, #f7fbff 100%)",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "min(100%, 420px)",
          borderRadius: 28,
          border: "1px solid rgba(120,171,218,0.18)",
          background: "rgba(255,255,255,0.88)",
          boxShadow: "0 24px 50px rgba(15,30,61,0.10)",
          padding: "28px 24px",
          textAlign: "center",
        }}
      >
        <img src="/logo-dark.png" alt="FlashMat" style={{ height: 34, objectFit: "contain", marginBottom: 16 }} />
        <div
          style={{
            fontFamily: "var(--display)",
            fontSize: 28,
            lineHeight: 1,
            color: "#15314f",
            marginBottom: 10,
          }}
        >
          Loading FlashMat
        </div>
        <div style={{ fontSize: 14, lineHeight: 1.7, color: "#6e86a0", marginBottom: 18 }}>
          Preparing your page and recent activity.
        </div>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: "50%",
            border: "3px solid rgba(37,99,235,0.14)",
            borderTopColor: "#2563eb",
            margin: "0 auto",
            animation: "flashmat-spin .8s linear infinite",
          }}
        />
        <style>{`
          @keyframes flashmat-spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  )
}

function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const role = session.user.user_metadata?.role || "client"
        navigate(role === "provider" ? "/app/provider/dashboard" : "/app/client/dashboard", { replace: true })
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

  if (loading) return <RouteLoadingScreen />

  if (!user) {
    if (typeof window !== "undefined") {
      window.sessionStorage.setItem("flashmat-post-login-redirect", `${location.pathname}${location.search}`)
    }
    return <Navigate to="/?login=1" replace />
  }

  if (requiredRole && profile?.role !== requiredRole) {
    return <Navigate to={profile?.role === "provider" ? "/app/provider/dashboard" : "/app/client/dashboard"} replace />
  }

  return children
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Suspense fallback={<RouteLoadingScreen />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/services" element={<Services />} />
            <Route path="/providers" element={<ServiceProviders />} />
            <Route path="/services/providers" element={<ServiceProviders />} />
            <Route path="/doctor" element={<AutoDoctor />} />
            <Route path="/urgence" element={<FlashFixUrgence />} />
            <Route path="/marketplace" element={<PublicMarketplace />} />
            <Route path="/community" element={<Community />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/contact" element={<Contact />} />
            <Route
              path="/messages"
              element={
                <ProtectedRoute>
                  <Messages />
                </ProtectedRoute>
              }
            />
            <Route path="/marketplace/vehicles/:listingId" element={<PublicVehicleListing />} />
            <Route path="/provider/:slug" element={<ProviderProfile />} />
            <Route path="/app/search" element={<Navigate to="/" replace />} />
            <Route path="/app/client" element={<Navigate to="/app/client/dashboard" replace />} />
            <Route path="/app/provider" element={<Navigate to="/app/provider/dashboard" replace />} />
            <Route
              path="/app/client/vehicles/:vehicleId"
              element={
                <ProtectedRoute requiredRole="client">
                  <VehicleDetails />
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
            <Route path="/app/marketplace" element={<Navigate to="/app/client/marketplace" replace />} />
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
        </Suspense>
      </ToastProvider>
    </AuthProvider>
  )
}

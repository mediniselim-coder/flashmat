import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom"
import { useEffect, lazy, Suspense, Component } from "react"
import { AuthProvider, useAuth } from "./hooks/useAuth"
import { ToastProvider } from "./hooks/useToast"
import { supabase } from "./lib/supabase"
import { getDefaultAppRoute } from "./lib/roles"

const ROUTE_RELOAD_PREFIX = "flashmat-route-reload:"
const routeModuleCache = new Map()

function loadPageModule(importer, key) {
  const cached = routeModuleCache.get(key)
  if (cached) return cached

  const request = importer().catch((error) => {
    routeModuleCache.delete(key)
    throw error
  })

  routeModuleCache.set(key, request)
  return request
}

function lazyPage(importer, key) {
  return lazy(async () => {
    try {
      return await loadPageModule(importer, key)
    } catch (error) {
      if (typeof window !== "undefined") {
        const markerKey = `${ROUTE_RELOAD_PREFIX}${key}`
        const alreadyReloaded = window.sessionStorage.getItem(markerKey)

        if (!alreadyReloaded) {
          window.sessionStorage.setItem(markerKey, "1")
          window.location.reload()
          return new Promise(() => {})
        }

        window.sessionStorage.removeItem(markerKey)
      }

      throw error
    }
  })
}

const pageImporters = {
  landing: () => import("./pages/Landing"),
  auth: () => import("./pages/Auth"),
  "client-app": () => import("./pages/ClientApp"),
  "provider-app": () => import("./pages/ProviderApp"),
  "admin-app": () => import("./pages/AdminApp"),
  "provider-profile": () => import("./pages/ProviderProfile"),
  services: () => import("./pages/Services"),
  "service-providers": () => import("./pages/ServiceProviders"),
  "auto-doctor": () => import("./pages/AutoDoctor"),
  flashfix: () => import("./pages/FlashFixUrgence"),
  marketplace: () => import("./pages/PublicMarketplace"),
  "vehicle-details": () => import("./pages/VehicleDetails"),
  "public-vehicle": () => import("./pages/PublicVehicleListing"),
  "marketplace-listing": () => import("./pages/PublicMarketplaceListing"),
  checkout: () => import("./pages/Checkout"),
  community: () => import("./pages/Community"),
  pricing: () => import("./pages/Pricing"),
  contact: () => import("./pages/Contact"),
  messages: () => import("./pages/Messages"),
}

const Landing = lazyPage(pageImporters.landing, "landing")
const Auth = lazyPage(pageImporters.auth, "auth")
const ClientApp = lazyPage(pageImporters["client-app"], "client-app")
const ProviderApp = lazyPage(pageImporters["provider-app"], "provider-app")
const AdminApp = lazyPage(pageImporters["admin-app"], "admin-app")
const ProviderProfile = lazyPage(pageImporters["provider-profile"], "provider-profile")
const Services = lazyPage(pageImporters.services, "services")
const ServiceProviders = lazyPage(pageImporters["service-providers"], "service-providers")
const AutoDoctor = lazyPage(pageImporters["auto-doctor"], "auto-doctor")
const FlashFixUrgence = lazyPage(pageImporters.flashfix, "flashfix")
const PublicMarketplace = lazyPage(pageImporters.marketplace, "marketplace")
const VehicleDetails = lazyPage(pageImporters["vehicle-details"], "vehicle-details")
const PublicVehicleListing = lazyPage(pageImporters["public-vehicle"], "public-vehicle")
const PublicMarketplaceListing = lazyPage(pageImporters["marketplace-listing"], "marketplace-listing")
const Checkout = lazyPage(pageImporters.checkout, "checkout")
const Community = lazyPage(pageImporters.community, "community")
const Pricing = lazyPage(pageImporters.pricing, "pricing")
const Contact = lazyPage(pageImporters.contact, "contact")
const Messages = lazyPage(pageImporters.messages, "messages")

class RouteErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error) {
    console.error("FlashMat route render failed:", error)
  }

  handleRetry = () => {
    if (typeof window !== "undefined") {
      window.location.reload()
    }
  }

  render() {
    if (!this.state.error) {
      return this.props.children
    }

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
            width: "min(100%, 520px)",
            borderRadius: 28,
            border: "1px solid rgba(120,171,218,0.18)",
            background: "rgba(255,255,255,0.92)",
            boxShadow: "0 24px 50px rgba(15,30,61,0.10)",
            padding: "28px 24px",
            textAlign: "center",
          }}
        >
          <img src="/loading-logo.png" alt="FlashMat" style={{ width: "min(100%, 210px)", objectFit: "contain", margin: "0 auto 16px", display: "block" }} />
          <div style={{ fontFamily: "var(--display)", fontSize: 30, lineHeight: 1.05, color: "#15314f", marginBottom: 10 }}>
            Page needs a quick reload
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.7, color: "#6e86a0", marginBottom: 18 }}>
            FlashMat hit a loading issue while opening this page. Reloading will usually fix it immediately.
          </div>
          <button type="button" className="btn btn-green btn-lg" onClick={this.handleRetry}>
            Reload page
          </button>
        </div>
      </div>
    )
  }
}

function RouteLoadingScreen() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(180deg, #edf4ff 0%, #f7fbff 100%)",
        padding: "32px 24px",
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
        <img src="/loading-logo.png" alt="FlashMat" style={{ width: "min(100%, 230px)", objectFit: "contain", margin: "0 auto 16px", display: "block" }} />
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

function RouteWarmup() {
  useEffect(() => {
    const preload = () => {
      const connection = window.navigator?.connection
      const shouldLimitWarmup = connection?.saveData || /2g/.test(connection?.effectiveType || "")
      const criticalRoutes = ["client-app", "provider-app", "messages", "marketplace", "service-providers"]
      const secondaryRoutes = ["provider-profile", "community", "checkout"]
      const preloadKeys = shouldLimitWarmup ? criticalRoutes : [...criticalRoutes, ...secondaryRoutes]

      preloadKeys.forEach((key) => {
        const importer = pageImporters[key]
        if (importer) {
          void loadPageModule(importer, key)
        }
      })
    }

    if (typeof window === "undefined") return undefined

    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(preload, { timeout: 1200 })
      return () => window.cancelIdleCallback?.(idleId)
    }

    const timeoutId = window.setTimeout(preload, 400)
    return () => window.clearTimeout(timeoutId)
  }, [])

  return null
}

function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const role = session.user.user_metadata?.role || "client"
        navigate(getDefaultAppRoute(role), { replace: true })
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

  const allowedRoles = Array.isArray(requiredRole) ? requiredRole : requiredRole ? [requiredRole] : []

  if (allowedRoles.length > 0 && !allowedRoles.includes(profile?.role)) {
    return <Navigate to={getDefaultAppRoute(profile?.role)} replace />
  }

  return children
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <RouteWarmup />
        <RouteErrorBoundary>
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
              <Route path="/marketplace/listings/:listingId" element={<PublicMarketplaceListing />} />
              <Route path="/checkout" element={<Checkout />} />
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
              <Route path="/app/admin" element={<Navigate to="/app/admin/dashboard" replace />} />
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
              <Route
                path="/app/admin/*"
                element={
                  <ProtectedRoute requiredRole="flashmat_admin">
                    <AdminApp />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </RouteErrorBoundary>
      </ToastProvider>
    </AuthProvider>
  )
}

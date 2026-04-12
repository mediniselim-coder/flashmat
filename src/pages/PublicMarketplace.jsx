import { useNavigate } from "react-router-dom"
import NavBar from "../components/NavBar"
import Marketplace from "../components/Marketplace"
import SiteFooter from "../components/SiteFooter"

const MARKETPLACE_STATS = [
  ["3", "sections"],
  ["200+", "annonces"],
  ["24/7", "visibilite"],
]

const MARKETPLACE_CHIPS = ["Vehicules", "Pieces", "Accessoires", "Pneus", "Outils"]

export default function PublicMarketplace() {
  const navigate = useNavigate()

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg, #f8f8f6)", fontFamily: "var(--sans, sans-serif)" }}>
      <NavBar activePage="marketplace" />

      <style>{`
        @media (max-width: 980px) {
          .marketplace-hero-grid {
            grid-template-columns: 1fr !important;
          }
          .marketplace-hero-shell {
            padding: 44px 18px 34px !important;
          }
          .marketplace-hero-headline {
            font-size: clamp(34px, 8vw, 50px) !important;
          }
        }

        @media (max-width: 640px) {
          .marketplace-hero-shell {
            padding: 34px 14px 28px !important;
          }
          .marketplace-hero-card {
            padding: 18px !important;
            border-radius: 20px !important;
          }
          .marketplace-hero-cta {
            width: 100% !important;
            justify-content: center !important;
          }
          .marketplace-hero-stats {
            grid-template-columns: 1fr !important;
          }
          .marketplace-page-wrap {
            padding-top: 16px !important;
          }
        }
      `}</style>

      <section
        className="marketplace-hero-shell"
        style={{
          position: "relative",
          overflow: "hidden",
          background:
            "radial-gradient(circle at top left, rgba(22,199,132,.14), transparent 28%), radial-gradient(circle at 88% 18%, rgba(59,159,216,.18), transparent 26%), linear-gradient(135deg, #091325 0%, #132846 54%, #1f4ca4 100%)",
          color: "#fff",
          padding: "58px 28px 42px",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(180deg, rgba(255,255,255,.04) 0%, rgba(255,255,255,0) 36%, rgba(6,16,32,.18) 100%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            width: 420,
            height: 420,
            top: -190,
            right: -80,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(255,255,255,.14), transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div style={{ maxWidth: 1320, margin: "0 auto", position: "relative", zIndex: 1 }}>
          <div
            className="marketplace-hero-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "minmax(0, 1.15fr) minmax(320px, .85fr)",
              gap: 24,
              alignItems: "stretch",
            }}
          >
            <div className="marketplace-hero-card" style={{ padding: "10px 6px 10px 0" }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 14px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,.08)",
                  border: "1px solid rgba(255,255,255,.12)",
                  fontSize: 11,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  fontWeight: 800,
                  color: "#75e0af",
                  marginBottom: 18,
                }}
              >
                Marketplace FlashMat
              </div>

              <h1
                className="marketplace-hero-headline"
                style={{
                  fontFamily: "var(--display)",
                  fontSize: "clamp(42px, 6vw, 68px)",
                  lineHeight: 0.98,
                  letterSpacing: "-0.06em",
                  fontWeight: 800,
                  margin: "0 0 18px",
                  maxWidth: 760,
                }}
              >
                Achetez, vendez,
                <br />
                <span style={{ color: "#78c8ff" }}>et reperez plus vite.</span>
              </h1>

              <p
                style={{
                  maxWidth: 700,
                  margin: "0 0 24px",
                  fontSize: 17,
                  lineHeight: 1.8,
                  color: "rgba(226,236,248,.8)",
                }}
              >
                Parcourez les vehicules, pieces, accessoires et outils dans un seul hub FlashMat. Le marketplace reste
                ouvert a la consultation, et la connexion n est demandee qu au moment de publier ou gerer vos annonces.
              </p>

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 }}>
                <button
                  type="button"
                  className="marketplace-hero-cta"
                  onClick={() => navigate("/app/client/vehicles")}
                  style={{
                    padding: "13px 18px",
                    borderRadius: 14,
                    border: "none",
                    background: "#fff",
                    color: "#133453",
                    fontWeight: 800,
                    fontSize: 14,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  Publier depuis mon espace
                </button>
                <button
                  type="button"
                  className="marketplace-hero-cta"
                  onClick={() => navigate("/services")}
                  style={{
                    padding: "13px 18px",
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,.16)",
                    background: "rgba(255,255,255,.08)",
                    color: "#fff",
                    fontWeight: 800,
                    fontSize: 14,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  Explorer les services FlashMat
                </button>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {MARKETPLACE_CHIPS.map((chip) => (
                  <span
                    key={chip}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 999,
                      background: "rgba(255,255,255,.08)",
                      border: "1px solid rgba(255,255,255,.08)",
                      fontSize: 12,
                      color: "rgba(255,255,255,.88)",
                    }}
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>

            <div
              className="marketplace-hero-card"
              style={{
                display: "grid",
                gap: 14,
                padding: 22,
                borderRadius: 26,
                background: "linear-gradient(180deg, rgba(255,255,255,.11) 0%, rgba(255,255,255,.06) 100%)",
                border: "1px solid rgba(255,255,255,.12)",
                boxShadow: "0 24px 60px rgba(5,12,24,.22)",
                backdropFilter: "blur(12px)",
              }}
            >
              <div style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "#9bd5ff", fontWeight: 800 }}>
                Vue d ensemble
              </div>
              <div style={{ fontFamily: "var(--display)", fontSize: 32, lineHeight: 1.03, letterSpacing: "-0.05em", fontWeight: 800 }}>
                Le bon canal pour chaque type d annonce.
              </div>
              <div style={{ fontSize: 14, lineHeight: 1.8, color: "rgba(226,236,248,.78)" }}>
                FlashMat Shop pour les items avec stock publies par FlashMat, auto parts pro pour les fournisseurs, et vehicle marketplace
                pour les ventes connectees aux profils vehicules FlashMat.
              </div>

              <div
                className="marketplace-hero-stats"
                style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}
              >
                {MARKETPLACE_STATS.map(([value, label]) => (
                  <div
                    key={label}
                    style={{
                      borderRadius: 18,
                      padding: "14px 16px",
                      background: "rgba(255,255,255,.08)",
                      border: "1px solid rgba(255,255,255,.08)",
                    }}
                  >
                    <div style={{ fontFamily: "var(--display)", fontSize: 28, fontWeight: 800, color: "#fff", marginBottom: 4 }}>
                      {value}
                    </div>
                    <div style={{ fontSize: 11, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(226,236,248,.68)" }}>
                      {label}
                    </div>
                  </div>
                ))}
              </div>

              <div
                style={{
                  borderRadius: 18,
                  padding: "16px 18px",
                  background: "linear-gradient(135deg, rgba(22,199,132,.16), rgba(120,200,255,.12))",
                  border: "1px solid rgba(255,255,255,.1)",
                }}
              >
                <div style={{ fontSize: 11, letterSpacing: "0.16em", textTransform: "uppercase", color: "#a9f3cf", fontWeight: 800, marginBottom: 8 }}>
                  Pour commencer
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.75, color: "#fff" }}>
                  Consultez librement les annonces, puis basculez vers votre espace client pour publier, gerer vos listings,
                  ou vendre un vehicule relie a votre profil FlashMat.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="marketplace-page-wrap" style={{ maxWidth: 1320, margin: "0 auto", padding: "24px 0 48px" }}>
        <Marketplace portal="public" />
      </div>

      <SiteFooter portal="public" />
    </div>
  )
}

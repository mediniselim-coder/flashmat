import NavBar from "../components/NavBar"
import Marketplace from "../components/Marketplace"

export default function PublicMarketplace() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg, #f8f8f6)", fontFamily: "var(--sans, sans-serif)" }}>
      <NavBar activePage="marketplace" />

      <section style={{ background: "linear-gradient(135deg, #111827 0%, #1f2937 100%)", color: "#fff", padding: "64px 32px 44px", textAlign: "center" }}>
        <div style={{ fontSize: 12, letterSpacing: 2, textTransform: "uppercase", color: "#22c55e", marginBottom: 12, fontWeight: 700 }}>
          Marketplace FlashMat
        </div>
        <h1 style={{ fontSize: 42, fontWeight: 800, margin: "0 0 16px", lineHeight: 1.15 }}>
          Voir les annonces auto
          <br />
          sans connexion
        </h1>
        <p style={{ color: "#cbd5e1", fontSize: 16, maxWidth: 760, margin: "0 auto" }}>
          Parcourez les pieces, pneus, accessoires et outils librement. La connexion est demandee seulement quand vous voulez publier une annonce.
        </p>
      </section>

      <div style={{ maxWidth: 1320, margin: "0 auto", padding: "24px 0 48px" }}>
        <Marketplace portal="public" />
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'

export default function LoginModal({ onClose }) {
  const { signIn, signUp } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [mode, setMode] = useState('login')
  const [role, setRole] = useState('client')
  const [loading, setLoading] = useState(false)
  const [shouldRedirectAfterClose, setShouldRedirectAfterClose] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', fullName: '', confirmPassword: '' })

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  useEffect(() => {
    function handlePostLoginRedirect() {
      try {
        const postLoginRedirect = window.sessionStorage.getItem('flashmat-post-login-redirect')
        if (postLoginRedirect) {
          window.sessionStorage.removeItem('flashmat-post-login-redirect')
          navigate(postLoginRedirect)
          return true
        }

        const raw = window.sessionStorage.getItem('flashmat-pending-service-search')
        if (!raw) return false
        const pending = JSON.parse(raw)
        if (!pending?.cat) return false
        navigate(`/app/client?pane=search&cat=${encodeURIComponent(pending.cat)}`)
        return true
      } catch {
        return false
      }
    }

    window.dispatchEvent(new CustomEvent('flashmat-login-modal-open'))

    return () => {
      window.dispatchEvent(new CustomEvent('flashmat-login-modal-close'))
      if (shouldRedirectAfterClose) {
        handlePostLoginRedirect()
      }
    }
  }, [navigate, shouldRedirectAfterClose])

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode === 'signup') {
        if (form.password !== form.confirmPassword) throw new Error('Les mots de passe ne correspondent pas')
        if (form.password.length < 6) throw new Error('Le mot de passe doit avoir au moins 6 caracteres')
        await signUp({ email: form.email, password: form.password, fullName: form.fullName, role })
        toast('Compte cree ! Bienvenue', 'success')
      } else {
        await signIn({ email: form.email, password: form.password })
        toast('Connexion reussie !', 'success')
      }
      setShouldRedirectAfterClose(true)
      onClose()
    } catch (err) {
      toast(err.message || 'Une erreur est survenue', 'error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
          zIndex: 900, backdropFilter: 'blur(3px)',
          animation: 'fadeIn 0.2s ease',
        }}
      />

      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        background: 'var(--bg2, #fff)',
        border: '1.5px solid var(--border, #eee)',
        borderRadius: 20, padding: '40px',
        width: '100%', maxWidth: 460,
        zIndex: 901,
        boxShadow: '0 20px 60px rgba(22,199,132,.15)',
        animation: 'slideUp 0.25s ease',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 16, right: 16,
            background: 'none', border: 'none', fontSize: 20,
            cursor: 'pointer', color: '#999', lineHeight: 1,
            width: 32, height: 32, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          ×
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24, cursor: 'pointer' }}>
          <img src="/logo.jpg" alt="FlashMat" style={{ height: 36, objectFit: 'contain' }} />
        </div>

        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 6, letterSpacing: -0.5 }}>
          {mode === 'login' ? 'Bon retour' : 'Creer un compte'}
        </h2>
        <p style={{ fontSize: 14, color: 'var(--ink2, #666)', marginBottom: 20 }}>
          {mode === 'login' ? 'Connectez-vous a votre espace FlashMat' : 'Rejoignez le hub automobile de Montreal'}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '14px 0 18px', fontSize: 11, color: '#999', fontFamily: 'monospace' }}>
          <div style={{ flex: 1, height: 1, background: 'var(--border, #eee)' }} />
          connexion securisee
          <div style={{ flex: 1, height: 1, background: 'var(--border, #eee)' }} />
        </div>

        {mode === 'signup' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 18 }}>
            {[
              { r: 'client', title: 'Je suis client', sub: 'Je cherche des services auto' },
              { r: 'provider', title: 'Je suis fournisseur', sub: "J'offre des services auto" },
            ].map(({ r, title, sub }) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10, padding: 14,
                  background: role === r ? (r === 'client' ? 'var(--green-bg, #f0fdf4)' : 'var(--blue-bg, #eff6ff)') : 'var(--bg3, #f9f9f9)',
                  border: `1.5px solid ${role === r ? (r === 'client' ? 'var(--green, #22c55e)' : 'var(--blue, #3b82f6)') : 'var(--border, #eee)'}`,
                  borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                }}
              >
                <div>
                  <strong style={{ display: 'block', fontSize: 13, marginBottom: 2 }}>{title}</strong>
                  <small style={{ fontSize: 10, color: '#888' }}>{sub}</small>
                </div>
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {mode === 'signup' && (
            <div className="form-group">
              <label className="form-label">Nom complet</label>
              <input
                className="form-input"
                type="text"
                placeholder="Alex Martin"
                required
                value={form.fullName}
                onChange={e => set('fullName', e.target.value)}
              />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Adresse email</label>
            <input
              className="form-input"
              type="email"
              placeholder="vous@email.com"
              required
              value={form.email}
              onChange={e => set('email', e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Mot de passe</label>
            <input
              className="form-input"
              type="password"
              placeholder="••••••••"
              required
              minLength={6}
              value={form.password}
              onChange={e => set('password', e.target.value)}
            />
          </div>
          {mode === 'signup' && (
            <div className="form-group">
              <label className="form-label">Confirmer le mot de passe</label>
              <input
                className="form-input"
                type="password"
                placeholder="••••••••"
                required
                value={form.confirmPassword}
                onChange={e => set('confirmPassword', e.target.value)}
              />
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '13px', borderRadius: 10, border: 'none',
              background: 'var(--green, #22c55e)', color: '#fff',
              fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: 8, opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Chargement...' : mode === 'login' ? 'Se connecter ->' : 'Creer mon compte ->'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 18, fontSize: 13, color: '#666' }}>
          {mode === 'login' ? (
            <span>Pas encore de compte ?{' '}
              <button onClick={() => setMode('signup')} style={switchBtnStyle}>S'inscrire gratuitement</button>
            </span>
          ) : (
            <span>Deja un compte ?{' '}
              <button onClick={() => setMode('login')} style={switchBtnStyle}>Se connecter</button>
            </span>
          )}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translate(-50%, calc(-50% + 20px)) } to { opacity: 1; transform: translate(-50%, -50%) } }
      `}</style>
    </>
  )
}

const switchBtnStyle = {
  background: 'none', border: 'none', color: 'var(--green, #22c55e)',
  fontWeight: 600, cursor: 'pointer', fontSize: 13,
}

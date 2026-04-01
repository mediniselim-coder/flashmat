import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import styles from './Auth.module.css'

export default function Auth() {
  const navigate      = useNavigate()
  const [params]      = useSearchParams()
  const { signIn, signUp, user, profile } = useAuth()
  const { toast }     = useToast()

  const defaultRole   = params.get('role') === 'provider' ? 'provider' : 'client'
  const [mode, setMode]     = useState('login')    // 'login' | 'signup'
  const [role, setRole]     = useState(defaultRole)
  const [loading, setLoading] = useState(false)
  const [form, setForm]     = useState({ email: '', password: '', fullName: '', confirmPassword: '' })

  // Redirect if already logged in
  useEffect(() => {
    if (user && profile) {
      navigate(profile.role === 'provider' ? '/app/provider' : '/app/client')
    }
  }, [user, profile, navigate])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode === 'signup') {
        if (form.password !== form.confirmPassword) throw new Error('Les mots de passe ne correspondent pas')
        if (form.password.length < 6) throw new Error('Le mot de passe doit avoir au moins 6 caractères')
        await signUp({ email: form.email, password: form.password, fullName: form.fullName, role })
        toast('Compte créé! Vérifiez votre email.', 'success')
        navigate(role === 'provider' ? '/app/provider' : '/app/client')
      } else {
        await signIn({ email: form.email, password: form.password })
        toast('Connexion réussie! 🎉', 'success')
      }
    } catch (err) {
      toast(err.message || 'Une erreur est survenue', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Demo login shortcut
  async function demoLogin(demoRole) {
    setLoading(true)
    try {
      await signIn({
        email: demoRole === 'provider' ? 'demo.provider@flashmat.ca' : 'demo.client@flashmat.ca',
        password: 'demo123456'
      })
    } catch {
      // Demo accounts might not exist — redirect directly
      navigate(demoRole === 'provider' ? '/app/provider' : '/app/client')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.bg} />

      <div className={styles.card}>
        {/* Logo */}
        <div className={styles.logo} onClick={() => navigate('/')}>
          <div className={styles.logoHex}>FM</div>
          <div className={styles.logoText}>Flash<span>Mat</span><sup>.ca</sup></div>
        </div>

        <h1 className={styles.title}>
          {mode === 'login' ? 'Bon retour 👋' : 'Créer un compte'}
        </h1>
        <p className={styles.sub}>
          {mode === 'login' ? 'Connectez-vous à votre espace FlashMat' : 'Rejoignez le hub automobile de Montréal'}
        </p>

        {/* DEMO QUICK ACCESS */}
        <div className={styles.demoRow}>
          <div className={styles.demoLabel}>Accès rapide démo :</div>
          <button className={styles.demoBtn} onClick={() => demoLogin('client')}>🚗 Client démo</button>
          <button className={styles.demoBtn} onClick={() => demoLogin('provider')}>🏪 Fournisseur démo</button>
        </div>

        <div className={styles.divider}><span>ou continuer avec email</span></div>

        {/* ROLE SELECTOR (signup only) */}
        {mode === 'signup' && (
          <div className={styles.roleRow}>
            <button
              className={`${styles.roleBtn} ${role === 'client' ? styles.roleBtnActive : ''}`}
              onClick={() => setRole('client')}
            >
              <span>🚗</span>
              <div>
                <strong>Je suis client</strong>
                <small>Je cherche des services auto</small>
              </div>
            </button>
            <button
              className={`${styles.roleBtn} ${role === 'provider' ? styles.roleBtnActiveBlue : ''}`}
              onClick={() => setRole('provider')}
            >
              <span>🏪</span>
              <div>
                <strong>Je suis fournisseur</strong>
                <small>J'offre des services auto</small>
              </div>
            </button>
          </div>
        )}

        {/* FORM */}
        <form onSubmit={handleSubmit} className={styles.form}>
          {mode === 'signup' && (
            <div className="form-group">
              <label className="form-label">Nom complet</label>
              <input className="form-input" type="text" placeholder="Alex Martin" required
                value={form.fullName} onChange={e => set('fullName', e.target.value)} />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Adresse email</label>
            <input className="form-input" type="email" placeholder="vous@email.com" required
              value={form.email} onChange={e => set('email', e.target.value)} />
          </div>

          <div className="form-group">
            <label className="form-label">Mot de passe</label>
            <input className="form-input" type="password" placeholder="••••••••" required minLength={6}
              value={form.password} onChange={e => set('password', e.target.value)} />
          </div>

          {mode === 'signup' && (
            <div className="form-group">
              <label className="form-label">Confirmer le mot de passe</label>
              <input className="form-input" type="password" placeholder="••••••••" required
                value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} />
            </div>
          )}

          <button type="submit" className={`btn btn-green btn-lg ${styles.submitBtn}`} disabled={loading}>
            {loading ? <span className="spinner" /> : mode === 'login' ? 'Se connecter →' : 'Créer mon compte →'}
          </button>
        </form>

        {/* SWITCH MODE */}
        <div className={styles.switchRow}>
          {mode === 'login' ? (
            <span>Pas encore de compte? <button onClick={() => setMode('signup')}>S'inscrire gratuitement</button></span>
          ) : (
            <span>Déjà un compte? <button onClick={() => setMode('login')}>Se connecter</button></span>
          )}
        </div>

        <button className={styles.back} onClick={() => navigate('/')}>← Retour à l'accueil</button>
      </div>
    </div>
  )
}

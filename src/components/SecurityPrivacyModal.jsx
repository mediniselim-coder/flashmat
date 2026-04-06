import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

export default function SecurityPrivacyModal({ onClose }) {
  const { user } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()

    if (!password) {
      setError('Enter a new password.')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      setSuccess('Your password was updated successfully.')
      setPassword('')
      setConfirmPassword('')
    } catch (submitError) {
      setError(submitError.message || 'Unable to update your password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 560 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div className="modal-title" style={{ marginBottom: 0 }}>Security & Privacy</div>
            <div style={{ fontSize: 11, color: 'var(--ink3)', marginTop: 4 }}>
              Manage password security for {user?.email || 'your account'}.
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--ink3)' }}>X</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">New password</label>
            <input className="form-input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter a new password" />
          </div>

          <div className="form-group">
            <label className="form-label">Confirm password</label>
            <input className="form-input" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Repeat the new password" />
          </div>

          <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 14, padding: '12px 14px', marginBottom: 14, fontSize: 12, color: 'var(--ink2)', lineHeight: 1.7 }}>
            Your profile information like name, email, phone number, and address can be updated from <strong>Edit Profile</strong>.
          </div>

          {error && <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 12 }}>{error}</div>}
          {success && <div style={{ color: 'var(--green)', fontSize: 12, marginBottom: 12 }}>{success}</div>}

          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose}>Close</button>
            <button type="submit" className="btn btn-green btn-lg" disabled={loading}>
              {loading ? <span className="spinner" style={{ width: 16, height: 16 }} /> : 'Update password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

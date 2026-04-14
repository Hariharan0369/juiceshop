import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import './AdminLogin.css'

function sha256(message) {
  const msgBuffer = new TextEncoder().encode(message)
  return crypto.subtle.digest('SHA-256', msgBuffer).then(hashBuffer => {
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2,'0')).join('')
  })
}

export default function AdminLogin() {
  const [form, setForm] = useState({ username: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async () => {
    if (!form.username || !form.password) { setError('Please fill in all fields'); return }
    setLoading(true)
    setError('')
    try {
      const passwordHash = await sha256(form.password)
      const { data } = await axios.post('/api/admin/login', { username: form.username, passwordHash })
      localStorage.setItem('admin_token', data.token)
      navigate('/admin/dashboard')
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => { if (e.key === 'Enter') handleLogin() }

  return (
    <div className="login-page">
      <div className="login-bg">
        <div className="login-orb login-orb-1"/>
        <div className="login-orb login-orb-2"/>
        <div className="login-orb login-orb-3"/>
        <div className="login-leaf login-leaf-1">🌿</div>
        <div className="login-leaf login-leaf-2">🥥</div>
        <div className="login-leaf login-leaf-3">🌱</div>
      </div>

      <div className="login-card glass-card noise">
        <div className="login-logo">
          <span style={{fontSize:'48px', display:'block', animation:'leafSway 4s ease-in-out infinite'}}>🌿</span>
          <h1 className="login-title">Nature<em>Juice</em></h1>
          <p className="login-subtitle">Admin Dashboard</p>
        </div>

        <div className="login-divider">
          <span>Sign in to manage your store</span>
        </div>

        <div className="login-form">
          <div className="form-group">
            <label className="label">Username</label>
            <input
              className="input"
              placeholder="admin"
              value={form.username}
              onChange={e => setForm({...form, username: e.target.value})}
              onKeyDown={handleKeyDown}
              autoComplete="username"
            />
          </div>
          <div className="form-group">
            <label className="label">Password</label>
            <div className="password-input-wrapper">
              <input
                className="input"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••••••"
                value={form.password}
                onChange={e => setForm({...form, password: e.target.value})}
                onKeyDown={handleKeyDown}
                autoComplete="current-password"
              />
              <button className="password-toggle" type="button" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {error && <div className="login-error">⚠ {error}</div>}

          <button className="btn btn-primary login-btn" onClick={handleLogin} disabled={loading}>
            {loading ? (
              <span className="login-spinner">●</span>
            ) : '🔐 Login to Admin →'}
          </button>
        </div>

        <div className="login-back">
          <a href="/" style={{color:'var(--muted)', fontSize:'13px', textDecoration:'none'}}>
            ← Back to website
          </a>
        </div>
      </div>
    </div>
  )
}

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import './AdminDashboard.css'

const API = (token) => ({
  get: (url) => axios.get(url, { headers: { Authorization: `Bearer ${token}` } }),
  post: (url, data) => axios.post(url, data, { headers: { Authorization: `Bearer ${token}` } }),
  put: (url, data) => axios.put(url, data, { headers: { Authorization: `Bearer ${token}` } }),
  delete: (url) => axios.delete(url, { headers: { Authorization: `Bearer ${token}` } }),
  upload: (url, formData) => axios.post(url, formData, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }),
})

function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [])
  return <div className={`toast ${type}`}>{message}</div>
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
function Sidebar({ active, setActive, counts, onLogout }) {
  const items = [
    { id: 'overview', icon: '📊', label: 'Overview' },
    { id: 'config', icon: '⚙️', label: 'Site Config' },
    { id: 'benefits', icon: '✨', label: 'Benefits' },
    { id: 'plans', icon: '💳', label: 'Plans' },
    { id: 'images', icon: '🖼️', label: 'Juice Images' },
    { id: 'enquiries', icon: '📬', label: 'Enquiries', badge: counts.enquiries },
    { id: 'reviews', icon: '⭐', label: 'Reviews', badge: counts.reviews },
    { id: 'password', icon: '🔐', label: 'Password' },
  ]

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span style={{ fontSize: '28px' }}>🌿</span>
        <div>
          <div className="sidebar-brand">NatureJuice</div>
          <div className="sidebar-role">Admin Panel</div>
        </div>
      </div>
      <nav className="sidebar-nav">
        {items.map(item => (
          <button
            key={item.id}
            className={`sidebar-item ${active === item.id ? 'active' : ''}`}
            onClick={() => setActive(item.id)}
          >
            <span className="si-icon">{item.icon}</span>
            <span className="si-label">{item.label}</span>
            {item.badge > 0 && <span className="si-badge">{item.badge}</span>}
          </button>
        ))}
      </nav>
      <button className="sidebar-logout" onClick={onLogout}>
        <span>↩</span> Logout
      </button>
    </aside>
  )
}

// ─── Overview ─────────────────────────────────────────────────────────────────
function Overview({ enquiries, reviews, plans }) {
  const newEnq = enquiries.filter(e => e.status === 'new').length
  const pendingRev = reviews.filter(r => !r.is_approved).length
  const activePlans = plans.filter(p => p.is_active).length

  return (
    <div className="panel">
      <h2 className="panel-title">Overview</h2>
      <div className="overview-grid">
        {[
          { label: 'New Enquiries', value: newEnq, icon: '📬', color: '#4a7c2f', sub: 'Awaiting your response' },
          { label: 'Pending Reviews', value: pendingRev, icon: '⭐', color: '#c8873a', sub: 'Need approval' },
          { label: 'Active Plans', value: activePlans, icon: '💳', color: '#2d5016', sub: 'Currently listed' },
          { label: 'Total Reviews', value: reviews.length, icon: '💬', color: '#6aab47', sub: 'All time' },
        ].map((stat, i) => (
          <div key={i} className="stat-card" style={{ '--accent': stat.color }}>
            <div className="stat-icon">{stat.icon}</div>
            <div className="stat-value">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
            <div className="stat-sub">{stat.sub}</div>
          </div>
        ))}
      </div>

      <div className="recent-section">
        <h3 className="recent-title">Recent Enquiries</h3>
        {enquiries.slice(0, 5).map(e => (
          <div key={e.id} className="recent-row">
            <div className="recent-avatar">{e.name.charAt(0)}</div>
            <div className="recent-info">
              <div className="recent-name">{e.name}</div>
              <div className="recent-detail">{e.phone} · {e.juice_type} · {e.plan || 'No plan'}</div>
            </div>
            <span className={`badge badge-${e.status}`}>{e.status}</span>
          </div>
        ))}
        {enquiries.length === 0 && <div className="empty-state">No enquiries yet</div>}
      </div>
    </div>
  )
}

// ─── Site Config ──────────────────────────────────────────────────────────────
function ConfigPanel({ api, showToast }) {
  const [config, setConfig] = useState({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    axios.get('/api/config').then(r => setConfig(r.data))
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      await api.put('/api/admin/config', config)
      showToast('✓ Configuration saved!', 'success')
    } catch { showToast('Failed to save', 'error') }
    setSaving(false)
  }

  const fields = [
    { key: 'hero_headline', label: 'Hero Headline', placeholder: 'Pure Nature. Daily Freshness.' },
    { key: 'hero_subheadline', label: 'Hero Sub-headline', placeholder: 'Daily-pressed juices delivered...' },
    { key: 'hero_tagline', label: 'Hero Tagline (• separated)', placeholder: '100% Natural • No Preservatives • Farm to Glass' },
    { key: 'contact_phone', label: 'Contact Phone', placeholder: '+91 98765 43210' },
    { key: 'contact_email', label: 'Contact Email', placeholder: 'hello@naturejuice.in' },
    { key: 'contact_address', label: 'Address', placeholder: 'Mumbai, Maharashtra' },
  ]

  return (
    <div className="panel">
      <div className="panel-header">
        <h2 className="panel-title">Site Configuration</h2>
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? 'Saving...' : '💾 Save All'}
        </button>
      </div>
      <div className="config-grid">
        {fields.map(f => (
          <div key={f.key} className="form-group">
            <label className="label">{f.label}</label>
            <input
              className="input"
              placeholder={f.placeholder}
              value={config[f.key] || ''}
              onChange={e => setConfig({ ...config, [f.key]: e.target.value })}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Benefits Panel ───────────────────────────────────────────────────────────
function BenefitsPanel({ api, showToast }) {
  const [benefits, setBenefits] = useState([])
  const [editing, setEditing] = useState(null)
  const [adding, setAdding] = useState(false)
  const [newB, setNewB] = useState({ juice_type: 'coconut', icon: '🌿', title: '', description: '', sort_order: 0 })

  const load = () => axios.get('/api/benefits').then(r => setBenefits(r.data))
  useEffect(() => { load() }, [])

  const save = async (id, data) => {
    try {
      await api.put(`/api/admin/benefits/${id}`, data)
      showToast('✓ Benefit updated!', 'success')
      setEditing(null)
      load()
    } catch { showToast('Failed to update', 'error') }
  }

  const add = async () => {
    if (!newB.title) return
    try {
      await api.post('/api/admin/benefits', newB)
      showToast('✓ Benefit added!', 'success')
      setAdding(false)
      setNewB({ juice_type: 'coconut', icon: '🌿', title: '', description: '', sort_order: 0 })
      load()
    } catch { showToast('Failed to add', 'error') }
  }

  const del = async (id) => {
    if (!confirm('Delete this benefit?')) return
    await api.delete(`/api/admin/benefits/${id}`)
    showToast('Deleted', 'success')
    load()
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <h2 className="panel-title">Benefits</h2>
        <button className="btn btn-primary" onClick={() => setAdding(true)}>+ Add Benefit</button>
      </div>

      {adding && (
        <div className="edit-form glass-card">
          <h4 className="edit-form-title">New Benefit</h4>
          <div className="edit-grid">
            <div className="form-group">
              <label className="label">Juice Type</label>
              <select className="input" value={newB.juice_type} onChange={e => setNewB({ ...newB, juice_type: e.target.value })}>
                <option value="coconut">Coconut Milk</option>
                <option value="amla">Amla Juice</option>
              </select>
            </div>
            <div className="form-group">
              <label className="label">Icon (emoji)</label>
              <input className="input" value={newB.icon} onChange={e => setNewB({ ...newB, icon: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="label">Title</label>
              <input className="input" placeholder="Benefit title" value={newB.title} onChange={e => setNewB({ ...newB, title: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="label">Sort Order</label>
              <input className="input" type="number" value={newB.sort_order} onChange={e => setNewB({ ...newB, sort_order: +e.target.value })} />
            </div>
          </div>
          <div className="form-group">
            <label className="label">Description</label>
            <textarea className="input" rows={3} placeholder="Describe the benefit..." value={newB.description} onChange={e => setNewB({ ...newB, description: e.target.value })} style={{ resize: 'vertical' }} />
          </div>
          <div className="edit-actions">
            <button className="btn btn-primary" onClick={add}>Add Benefit</button>
            <button className="btn btn-secondary" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="items-grid">
        {['coconut', 'amla'].map(type => (
          <div key={type}>
            <h3 className="group-title">{type === 'coconut' ? '🥥 Coconut Milk' : '🌿 Amla Juice'}</h3>
            {benefits.filter(b => b.juice_type === type).map(b => (
              <div key={b.id} className="item-row">
                {editing === b.id ? (
                  <EditBenefit benefit={b} onSave={(data) => save(b.id, data)} onCancel={() => setEditing(null)} />
                ) : (
                  <div className="item-display">
                    <span className="item-icon">{b.icon}</span>
                    <div className="item-info">
                      <div className="item-title">{b.title}</div>
                      <div className="item-desc">{b.description}</div>
                    </div>
                    <div className="item-actions">
                      <button className="icon-btn edit" onClick={() => setEditing(b.id)}>✏️</button>
                      <button className="icon-btn del" onClick={() => del(b.id)}>🗑️</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function EditBenefit({ benefit, onSave, onCancel }) {
  const [data, setData] = useState({ icon: benefit.icon, title: benefit.title, description: benefit.description, sort_order: benefit.sort_order })
  return (
    <div className="inline-edit">
      <div className="edit-row">
        <input className="input" style={{ width: '80px' }} value={data.icon} onChange={e => setData({ ...data, icon: e.target.value })} />
        <input className="input" value={data.title} onChange={e => setData({ ...data, title: e.target.value })} />
        <input className="input" type="number" style={{ width: '80px' }} value={data.sort_order} onChange={e => setData({ ...data, sort_order: +e.target.value })} />
      </div>
      <textarea className="input" rows={2} value={data.description} onChange={e => setData({ ...data, description: e.target.value })} style={{ resize: 'vertical', marginTop: '8px' }} />
      <div className="edit-actions" style={{ marginTop: '8px' }}>
        <button className="btn btn-primary" style={{ padding: '8px 18px', fontSize: '13px' }} onClick={() => onSave(data)}>Save</button>
        <button className="btn btn-secondary" style={{ padding: '8px 18px', fontSize: '13px' }} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

// ─── Plans Panel ──────────────────────────────────────────────────────────────
function PlansPanel({ api, showToast }) {
  const [plans, setPlans] = useState([])
  const [editing, setEditing] = useState(null)
  const [adding, setAdding] = useState(false)
  const [newP, setNewP] = useState({ juice_type: 'coconut', name: '', price: '', duration: '30 days', features: '', is_popular: false, is_active: true })

  const load = () => api.get('/api/admin/plans').then(r => setPlans(r.data))
  useEffect(() => { load() }, [])

  const add = async () => {
    if (!newP.name || !newP.price) return
    const feats = newP.features.split('\n').filter(Boolean)
    try {
      await api.post('/api/admin/plans', { ...newP, price: +newP.price, features: feats })
      showToast('✓ Plan added!', 'success')
      setAdding(false)
      setNewP({ juice_type: 'coconut', name: '', price: '', duration: '30 days', features: '', is_popular: false, is_active: true })
      load()
    } catch { showToast('Failed to add', 'error') }
  }

  const save = async (id, data) => {
    try {
      await api.put(`/api/admin/plans/${id}`, data)
      showToast('✓ Plan updated!', 'success')
      setEditing(null)
      load()
    } catch { showToast('Failed to update', 'error') }
  }

  const del = async (id) => {
    if (!confirm('Delete this plan?')) return
    await api.delete(`/api/admin/plans/${id}`)
    showToast('Deleted', 'success')
    load()
  }

  return (
    <div className="panel">
      <div className="panel-header">
        <h2 className="panel-title">Subscription Plans</h2>
        <button className="btn btn-primary" onClick={() => setAdding(true)}>+ Add Plan</button>
      </div>

      {adding && (
        <div className="edit-form glass-card">
          <h4 className="edit-form-title">New Plan</h4>
          <div className="edit-grid">
            <div className="form-group">
              <label className="label">Juice Type</label>
              <select className="input" value={newP.juice_type} onChange={e => setNewP({ ...newP, juice_type: e.target.value })}>
                <option value="coconut">Coconut Milk</option>
                <option value="amla">Amla Juice</option>
              </select>
            </div>
            <div className="form-group">
              <label className="label">Plan Name</label>
              <input className="input" placeholder="Monthly Glow" value={newP.name} onChange={e => setNewP({ ...newP, name: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="label">Price (₹)</label>
              <input className="input" type="number" placeholder="999" value={newP.price} onChange={e => setNewP({ ...newP, price: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="label">Duration</label>
              <select className="input" value={newP.duration} onChange={e => setNewP({ ...newP, duration: e.target.value })}>
                <option value="7 days">7 days</option>
                <option value="30 days">30 days</option>
                <option value="90 days">90 days</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="label">Features (one per line)</label>
            <textarea className="input" rows={5} placeholder="500ml daily&#10;Morning delivery&#10;Fresh pressed daily" value={newP.features} onChange={e => setNewP({ ...newP, features: e.target.value })} style={{ resize: 'vertical' }} />
          </div>
          <div className="check-row">
            <label className="check-label">
              <input type="checkbox" checked={newP.is_popular} onChange={e => setNewP({ ...newP, is_popular: e.target.checked })} /> Mark as Popular
            </label>
            <label className="check-label">
              <input type="checkbox" checked={newP.is_active} onChange={e => setNewP({ ...newP, is_active: e.target.checked })} /> Active (visible on site)
            </label>
          </div>
          <div className="edit-actions">
            <button className="btn btn-primary" onClick={add}>Add Plan</button>
            <button className="btn btn-secondary" onClick={() => setAdding(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div className="plans-admin-grid">
        {plans.map(plan => (
          <div key={plan.id} className={`plan-admin-card ${plan.is_popular ? 'popular-card' : ''} ${!plan.is_active ? 'inactive-card' : ''}`}>
            {editing === plan.id ? (
              <EditPlan plan={plan} onSave={(data) => save(plan.id, data)} onCancel={() => setEditing(null)} />
            ) : (
              <>
                <div className="pac-header">
                  <div>
                    <div className="pac-name">{plan.name}</div>
                    <div className="pac-type">{plan.juice_type} · {plan.duration}</div>
                  </div>
                  <div className="pac-price">₹{plan.price}</div>
                </div>
                <div className="pac-feats">
                  {(Array.isArray(plan.features) ? plan.features : []).map((f, i) => <div key={i} className="pac-feat">✓ {f}</div>)}
                </div>
                <div className="pac-flags">
                  {plan.is_popular ? <span className="flag flag-popular">⭐ Popular</span> : null}
                  {!plan.is_active ? <span className="flag flag-inactive">Hidden</span> : <span className="flag flag-active">Active</span>}
                </div>
                <div className="item-actions" style={{ marginTop: '12px' }}>
                  <button 
                    className={`icon-btn ${plan.is_active ? 'del' : 'edit'}`} 
                    onClick={() => save(plan.id, { ...plan, is_active: !plan.is_active })}
                    title={plan.is_active ? "Deactivate" : "Activate"}
                  >
                    {plan.is_active ? '🚫 Disable' : '✅ Enable'}
                  </button>
                  <button className="icon-btn edit" onClick={() => setEditing(plan.id)}>✏️ Edit</button>
                  <button className="icon-btn del" onClick={() => del(plan.id)}>🗑️ Delete</button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function EditPlan({ plan, onSave, onCancel }) {
  const [data, setData] = useState({
    name: plan.name,
    price: plan.price,
    duration: plan.duration,
    features: (Array.isArray(plan.features) ? plan.features : []).join('\n'),
    is_popular: plan.is_popular,
    is_active: plan.is_active,
  })
  const submit = () => {
    const feats = data.features.split('\n').filter(Boolean)
    onSave({ ...data, price: +data.price, features: feats })
  }
  return (
    <div className="inline-edit">
      <div className="edit-grid" style={{ marginBottom: '12px' }}>
        <div className="form-group">
          <label className="label">Name</label>
          <input className="input" value={data.name} onChange={e => setData({ ...data, name: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="label">Price (₹)</label>
          <input className="input" type="number" value={data.price} onChange={e => setData({ ...data, price: e.target.value })} />
        </div>
        <div className="form-group">
          <label className="label">Duration</label>
          <select className="input" value={data.duration} onChange={e => setData({ ...data, duration: e.target.value })}>
            <option value="7 days">7 days</option>
            <option value="30 days">30 days</option>
            <option value="90 days">90 days</option>
          </select>
        </div>
      </div>
      <div className="form-group">
        <label className="label">Features (one per line)</label>
        <textarea className="input" rows={4} value={data.features} onChange={e => setData({ ...data, features: e.target.value })} style={{ resize: 'vertical' }} />
      </div>
      <div className="check-row" style={{ margin: '12px 0' }}>
        <label className="check-label"><input type="checkbox" checked={!!data.is_popular} onChange={e => setData({ ...data, is_popular: e.target.checked })} /> Popular</label>
        <label className="check-label"><input type="checkbox" checked={!!data.is_active} onChange={e => setData({ ...data, is_active: e.target.checked })} /> Active</label>
      </div>
      <div className="edit-actions">
        <button className="btn btn-primary" style={{ padding: '10px 20px', fontSize: '13px' }} onClick={submit}>Save</button>
        <button className="btn btn-secondary" style={{ padding: '10px 20px', fontSize: '13px' }} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

// ─── Images Panel ─────────────────────────────────────────────────────────────
function ImagesPanel({ api, showToast }) {
  const [images, setImages] = useState([])
  const coconutRef = useRef()
  const amlaRef = useRef()

  const load = () => axios.get('/api/juice-images').then(r => setImages(r.data))
  useEffect(() => { load() }, [])

  const upload = async (type, file) => {
    if (!file) return
    const fd = new FormData()
    fd.append('image', file)
    try {
      await api.upload(`/api/admin/juice-images/${type}`, fd)
      showToast('✓ Image updated!', 'success')
      load()
    } catch { showToast('Failed to upload', 'error') }
  }

  return (
    <div className="panel">
      <h2 className="panel-title">Juice Images</h2>
      <p style={{ color: 'var(--muted)', marginBottom: '32px', fontSize: '14px' }}>
        Upload new images to replace the current juice photos displayed on the homepage.
      </p>
      <div className="images-grid">
        {[
          { type: 'coconut', label: '🥥 Coconut Milk Image', ref: coconutRef },
          { type: 'amla', label: '🌿 Amla Juice Image', ref: amlaRef },
        ].map(({ type, label, ref }) => {
          const img = images.find(i => i.juice_type === type)
          return (
            <div key={type} className="image-card glass-card">
              <h3 className="img-label">{label}</h3>
              {img && (
                <div className="img-preview-wrap">
                  <img src={`/uploads/${img.filename}`} alt={type} className="img-preview" />
                  <div className="img-updated">Updated: {new Date(img.updated_at).toLocaleDateString('en-IN')}</div>
                </div>
              )}
              <input
                type="file"
                accept="image/*"
                ref={ref}
                style={{ display: 'none' }}
                onChange={e => upload(type, e.target.files[0])}
              />
              <button className="btn btn-secondary" onClick={() => ref.current?.click()}>
                📤 Upload New Image
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Enquiries Panel ──────────────────────────────────────────────────────────
function EnquiriesPanel({ api, enquiries, setEnquiries, showToast }) {
  const [filter, setFilter] = useState('all')

  const updateStatus = async (id, status) => {
    try {
      await api.put(`/api/admin/enquiries/${id}/status`, { status })
      setEnquiries(prev => prev.map(e => e.id === id ? { ...e, status } : e))
      showToast('✓ Status updated!', 'success')
    } catch { showToast('Failed to update', 'error') }
  }

  const del = async (id) => {
    if (!confirm('Delete this enquiry?')) return
    await api.delete(`/api/admin/enquiries/${id}`)
    setEnquiries(prev => prev.filter(e => e.id !== id))
    showToast('Deleted', 'success')
  }

  const filtered = filter === 'all' ? enquiries : enquiries.filter(e => e.status === filter)

  return (
    <div className="panel">
      <div className="panel-header">
        <h2 className="panel-title">Enquiries <span className="count-badge">{enquiries.filter(e => e.status === 'new').length} new</span></h2>
        <div className="filter-tabs">
          {['all', 'new', 'contacted', 'closed'].map(f => (
            <button key={f} className={`ftab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="enquiry-list">
        {filtered.length === 0 && <div className="empty-state">No enquiries found</div>}
        {filtered.map(e => (
          <div key={e.id} className={`enq-row ${e.status === 'new' ? 'enq-new' : ''}`}>
            <div className="enq-avatar">{e.name.charAt(0)}</div>
            <div className="enq-body">
              <div className="enq-top">
                <span className="enq-name">{e.name}</span>
                <span className={`badge badge-${e.status}`}>{e.status}</span>
                <span className="enq-time">{new Date(e.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="enq-details">
                <a href={`tel:${e.phone}`} className="enq-phone">📞 {e.phone}</a>
                {e.email && <a href={`mailto:${e.email}`} className="enq-email">✉️ {e.email}</a>}
                <span className="enq-juice">🥤 {e.juice_type}</span>
                {e.plan && <span className="enq-plan">📋 {e.plan}</span>}
              </div>
              {e.message && <div className="enq-message">"{e.message}"</div>}
              <div className="enq-actions">
                {e.status !== 'contacted' && (
                  <button className="action-btn contacted" onClick={() => updateStatus(e.id, 'contacted')}>
                    ✓ Mark Contacted
                  </button>
                )}
                {e.status !== 'closed' && (
                  <button className="action-btn closed" onClick={() => updateStatus(e.id, 'closed')}>
                    ✗ Close
                  </button>
                )}
                {e.status !== 'new' && (
                  <button className="action-btn reopen" onClick={() => updateStatus(e.id, 'new')}>
                    ↺ Reopen
                  </button>
                )}
                <button className="action-btn danger" onClick={() => del(e.id)}>🗑️</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Reviews Panel ────────────────────────────────────────────────────────────
function ReviewsPanel({ api, reviews, setReviews, showToast }) {
  const [filter, setFilter] = useState('all')

  const toggleApprove = async (id, current) => {
    try {
      await api.put(`/api/admin/reviews/${id}/approve`, { is_approved: !current })
      setReviews(prev => prev.map(r => r.id === id ? { ...r, is_approved: !current } : r))
      showToast(current ? 'Review hidden' : '✓ Review approved!', 'success')
    } catch { showToast('Failed to update', 'error') }
  }

  const del = async (id) => {
    if (!confirm('Delete this review?')) return
    await api.delete(`/api/admin/reviews/${id}`)
    setReviews(prev => prev.filter(r => r.id !== id))
    showToast('Deleted', 'success')
  }

  const filtered = filter === 'all' ? reviews : filter === 'approved' ? reviews.filter(r => r.is_approved) : reviews.filter(r => !r.is_approved)

  return (
    <div className="panel">
      <div className="panel-header">
        <h2 className="panel-title">Reviews <span className="count-badge">{reviews.filter(r => !r.is_approved).length} pending</span></h2>
        <div className="filter-tabs">
          {['all', 'pending', 'approved'].map(f => (
            <button key={f} className={`ftab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="reviews-admin-grid">
        {filtered.length === 0 && <div className="empty-state">No reviews found</div>}
        {filtered.map(r => (
          <div key={r.id} className={`rev-card glass-card ${r.is_approved ? 'rev-approved' : 'rev-pending'}`}>
            <div className="rev-top">
              <div className="rev-avatar">{r.name.charAt(0)}</div>
              <div>
                <div className="rev-name">{r.name}</div>
                <div className="rev-meta">{r.juice_type || 'Nature Juice'} · {new Date(r.created_at).toLocaleDateString('en-IN')}</div>
              </div>
              <div className="stars" style={{ marginLeft: 'auto' }}>
                {Array.from({ length: 5 }, (_, i) => (
                  <span key={i} className={`star ${i < r.rating ? 'filled' : 'empty'}`}>★</span>
                ))}
              </div>
            </div>
            <p className="rev-comment">"{r.comment}"</p>
            <div className="rev-actions">
              <button
                className={`action-btn ${r.is_approved ? 'hide' : 'approve'}`}
                onClick={() => toggleApprove(r.id, r.is_approved)}
              >
                {r.is_approved ? '👁️ Hide' : '✓ Approve'}
              </button>
              <button className="action-btn danger" onClick={() => del(r.id)}>🗑️ Delete</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Password Panel ───────────────────────────────────────────────────────────
function PasswordPanel({ api, showToast }) {
  const [form, setForm] = useState({ current: '', newPass: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const sha256 = async (msg) => {
    const buf = new TextEncoder().encode(msg)
    const hash = await crypto.subtle.digest('SHA-256', buf)
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
  }

  const change = async () => {
    if (!form.current || !form.newPass) return showToast('Fill in all fields', 'error')
    if (form.newPass !== form.confirm) return showToast('Passwords do not match', 'error')
    if (form.newPass.length < 8) return showToast('Password must be at least 8 characters', 'error')
    setLoading(true)
    try {
      const currentPasswordHash = await sha256(form.current)
      const newPasswordHash = await sha256(form.newPass)
      await api.put('/api/admin/password', { currentPasswordHash, newPasswordHash })
      showToast('✓ Password changed! Please log in again.', 'success')
      setForm({ current: '', newPass: '', confirm: '' })
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to change password'
      showToast(msg, 'error')
    }
    setLoading(false)
  }

  return (
    <div className="panel">
      <h2 className="panel-title">Change Password</h2>
      <div className="password-form glass-card">
        <div className="pw-icon">🔐</div>
        <p style={{ color: 'var(--muted)', marginBottom: '28px', fontSize: '14px' }}>
          Your password is protected with SHA-256 hashing. Never share your admin credentials.
        </p>
        
        <div className="form-group">
          <label className="label">Current Password</label>
          <div className="password-input-wrapper">
            <input 
              className="input" 
              type={showCurrent ? "text" : "password"} 
              placeholder="Enter current password" 
              value={form.current} 
              onChange={e => setForm({ ...form, current: e.target.value })} 
            />
            <button className="password-toggle" type="button" onClick={() => setShowCurrent(!showCurrent)}>
              {showCurrent ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        <div className="form-group">
          <label className="label">New Password</label>
          <div className="password-input-wrapper">
            <input 
              className="input" 
              type={showNew ? "text" : "password"} 
              placeholder="Enter new password (min 8 chars)" 
              value={form.newPass} 
              onChange={e => setForm({ ...form, newPass: e.target.value })} 
            />
            <button className="password-toggle" type="button" onClick={() => setShowNew(!showNew)}>
              {showNew ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        <div className="form-group">
          <label className="label">Confirm New Password</label>
          <div className="password-input-wrapper">
            <input 
              className="input" 
              type={showConfirm ? "text" : "password"} 
              placeholder="Confirm new password" 
              value={form.confirm} 
              onChange={e => setForm({ ...form, confirm: e.target.value })} 
            />
            <button className="password-toggle" type="button" onClick={() => setShowConfirm(!showConfirm)}>
              {showConfirm ? '🙈' : '👁️'}
            </button>
          </div>
        </div>

        <button className="btn btn-primary" onClick={change} disabled={loading} style={{ marginTop: '8px' }}>
          {loading ? 'Changing...' : '🔐 Change Password'}
        </button>
      </div>
    </div>
  )
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function AdminDashboard() {
  const navigate = useNavigate()
  const token = localStorage.getItem('admin_token')
  const api = API(token)

  const [active, setActive] = useState('overview')
  const [enquiries, setEnquiries] = useState([])
  const [reviews, setReviews] = useState([])
  const [plans, setPlans] = useState([])
  const [toast, setToast] = useState(null)
  const [notification, setNotification] = useState(null)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const showToast = (message, type = 'success') => setToast({ message, type })

  const loadData = useCallback(() => {
    api.get('/api/admin/enquiries').then(r => setEnquiries(r.data)).catch(() => {})
    api.get('/api/admin/reviews').then(r => setReviews(r.data)).catch(() => {})
    axios.get('/api/plans').then(r => setPlans(r.data)).catch(() => {})
  }, [token])

  useEffect(() => { loadData() }, [loadData])

  // Real-time SSE
  useEffect(() => {
    const es = new EventSource(`/api/admin/stream?token=${token}`)

    es.addEventListener('new_enquiry', e => {
      const data = JSON.parse(e.data)
      setEnquiries(prev => [data, ...prev])
      setNotification({ type: 'enquiry', name: data.name, phone: data.phone })
      setTimeout(() => setNotification(null), 5000)
    })

    es.addEventListener('new_review', e => {
      const data = JSON.parse(e.data)
      setReviews(prev => [data, ...prev])
      setNotification({ type: 'review', name: data.name })
      setTimeout(() => setNotification(null), 5000)
    })

    es.onerror = () => es.close()
    return () => es.close()
  }, [token])

  const logout = () => {
    localStorage.removeItem('admin_token')
    navigate('/admin')
  }

  const counts = {
    enquiries: enquiries.filter(e => e.status === 'new').length,
    reviews: reviews.filter(r => !r.is_approved).length,
  }

  const panels = {
    overview: <Overview enquiries={enquiries} reviews={reviews} plans={plans} />,
    config: <ConfigPanel api={api} showToast={showToast} />,
    benefits: <BenefitsPanel api={api} showToast={showToast} />,
    plans: <PlansPanel api={api} showToast={showToast} />,
    images: <ImagesPanel api={api} showToast={showToast} />,
    enquiries: <EnquiriesPanel api={api} enquiries={enquiries} setEnquiries={setEnquiries} showToast={showToast} />,
    reviews: <ReviewsPanel api={api} reviews={reviews} setReviews={setReviews} showToast={showToast} />,
    password: <PasswordPanel api={api} showToast={showToast} />,
  }

  return (
    <div className="dashboard">
      {/* Mobile overlay */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}

      <div className={`sidebar-wrap ${sidebarOpen ? 'open' : ''}`}>
        <Sidebar active={active} setActive={(id) => { setActive(id); setSidebarOpen(false) }} counts={counts} onLogout={logout} />
      </div>

      <main className="dash-main">
        <div className="dash-topbar">
          <button className="hamburger mobile-only" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <span /><span /><span />
          </button>
          <div className="topbar-title">{active.charAt(0).toUpperCase() + active.slice(1)}</div>
          <a href="/" target="_blank" className="view-site-btn">↗ View Site</a>
        </div>

        {notification && (
          <div className={`live-notification ${notification.type}`}>
            {notification.type === 'enquiry'
              ? `🔔 New enquiry from ${notification.name} (${notification.phone})`
              : `⭐ New review from ${notification.name}`
            }
          </div>
        )}

        <div className="dash-content">
          {panels[active]}
        </div>
      </main>

      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
    </div>
  )
}

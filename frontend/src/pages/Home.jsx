import React, { useState, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { useReveal } from '../components/useReveal.js'
import './Home.css'

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ message, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t) }, [])
  return <div className={`toast ${type}`}>{message}</div>
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar({ config }) {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const nav = (id) => { document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); setMenuOpen(false) }

  return (
    <nav className={`navbar ${scrolled ? 'scrolled' : ''}`}>
      <div className="nav-inner">
        <div className="nav-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <span className="logo-icon">🌿</span>
          <span className="logo-text">Nature<em>Juice</em></span>
        </div>
        <div className={`nav-links ${menuOpen ? 'open' : ''}`}>
          {['benefits','plans','reviews','enquiry'].map(id => (
            <button key={id} className="nav-link" onClick={() => nav(id)}>
              {id.charAt(0).toUpperCase() + id.slice(1)}
            </button>
          ))}
          <Link to="/admin" className="nav-admin-btn">Admin ↗</Link>
        </div>
        <button className="hamburger" onClick={() => setMenuOpen(!menuOpen)}>
          <span/><span/><span/>
        </button>
      </div>
    </nav>
  )
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero({ config, images }) {
  const [activeJuice, setActiveJuice] = useState('coconut')
  const coconutImg = images.find(i => i.juice_type === 'coconut')
  const amlaImg = images.find(i => i.juice_type === 'amla')

  return (
    <section className={`hero ${activeJuice === 'amla' ? 'theme-amla' : ''}`}>
      <div className="hero-orbs">
        <div className="orb orb-1" />
        <div className="orb orb-2" />
        <div className="orb orb-3" />
      </div>
      <div className="hero-content">
        <div className="hero-text">
          <div className="hero-tag reveal-hero" style={{animationDelay:'0.1s'}}>
            ✦ Daily Freshly Pressed ✦
          </div>
          <h1 className="hero-headline reveal-hero" style={{animationDelay:'0.25s'}}>
            {config.hero_headline || 'Pure Nature.'}
            <br />
            <em className="hero-italic">Daily Freshness.</em>
          </h1>
          <p className="hero-sub reveal-hero" style={{animationDelay:'0.4s'}}>
            {config.hero_subheadline || 'Daily-pressed coconut milk & amla juice delivered to your door'}
          </p>
          <div className="hero-badges reveal-hero" style={{animationDelay:'0.55s'}}>
            {(config.hero_tagline || '100% Natural • No Preservatives • Farm to Glass').split('•').map((t, i) => (
              <span key={i} className="hero-badge">✓ {t.trim()}</span>
            ))}
          </div>
          <div className="hero-ctas reveal-hero" style={{animationDelay:'0.7s'}}>
            <button className="btn btn-primary" onClick={() => document.getElementById('plans')?.scrollIntoView({behavior:'smooth'})}>
              View Plans →
            </button>
            <button className="btn btn-secondary" onClick={() => document.getElementById('enquiry')?.scrollIntoView({behavior:'smooth'})}>
              Get Started
            </button>
          </div>
        </div>

        <div className="hero-visual reveal-hero" style={{animationDelay:'0.3s'}}>
          <div className="juice-switcher">
            <button className={`juice-tab ${activeJuice === 'coconut' ? 'active' : ''}`} onClick={() => setActiveJuice('coconut')}>🥥 Coconut</button>
            <button className={`juice-tab ${activeJuice === 'amla' ? 'active' : ''}`} onClick={() => setActiveJuice('amla')}>🌿 Amla</button>
          </div>
          <div className="hero-img-frame">
            <div className="img-blob" />
            {coconutImg && (
              <img
                src={`/uploads/${coconutImg.filename}`}
                alt="Coconut Milk"
                className={`hero-img ${activeJuice === 'coconut' ? 'active' : ''}`}
              />
            )}
            {amlaImg && (
              <img
                src={`/uploads/${amlaImg.filename}`}
                alt="Amla Juice"
                className={`hero-img ${activeJuice === 'amla' ? 'active' : ''}`}
              />
            )}
            <div className="float-tag float-tag-1">🌿 100% Natural</div>
            <div className="float-tag float-tag-2">⚡ Daily Fresh</div>
            <div className="float-tag float-tag-3">🥤 Farm to Glass</div>
          </div>
        </div>
      </div>

      <div className="hero-scroll-hint">
        <div className="scroll-line" />
        <span>Scroll to explore</span>
        <div className="scroll-line" />
      </div>
    </section>
  )
}

// ─── Benefits ─────────────────────────────────────────────────────────────────
function Benefits({ benefits }) {
  const [tab, setTab] = useState('coconut')
  const ref = useReveal()

  const filtered = benefits.filter(b => b.juice_type === tab)

  return (
    <section id="benefits" className={`section benefits-section ${tab === 'amla' ? 'theme-amla' : ''}`}>
      <div className="container">
        <div className="section-header" ref={ref}>
          <span className="section-tag">Why Nature Juice</span>
          <h2 className="section-title">Incredible Benefits<br />in Every Drop</h2>
          <p className="section-sub">Each juice is crafted to deliver maximum nutrition, pressed fresh every morning with zero additives.</p>
        </div>

        <div className="benefit-tabs">
          <button className={`btab ${tab === 'coconut' ? 'active' : ''}`} onClick={() => setTab('coconut')}>🥥 Coconut Milk</button>
          <button className={`btab ${tab === 'amla' ? 'active' : ''}`} onClick={() => setTab('amla')}>🌿 Amla Juice</button>
        </div>

        <div className="benefits-grid" key={tab}>
          {filtered.map((b, i) => (
            <div key={b.id} className="benefit-card reveal" style={{ transitionDelay: `${i * 0.15}s` }}
              ref={el => { if (el) { const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setTimeout(() => el.classList.add('visible'), i * 120); obs.unobserve(el) } }, { threshold: 0.1 }); obs.observe(el) } }}>
              <div className="benefit-icon">{b.icon}</div>
              <h3 className="benefit-title">{b.title}</h3>
              <div className="benefit-divider" />
              <p className="benefit-desc">{b.description}</p>
              <div className="benefit-glow" />
              <div className="benefit-decoration">★</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Plans ────────────────────────────────────────────────────────────────────
function Plans({ plans }) {
  const [tab, setTab] = useState('coconut')
  const ref = useReveal()

  const filtered = plans.filter(p => p.juice_type === tab)

  return (
    <section id="plans" className={`section plans-section ${tab === 'amla' ? 'theme-amla' : ''}`}>
      <div className="plans-bg-shape" />
      <div className="container">
        <div className="section-header centered" ref={ref}>
          <span className="section-tag">Subscription Plans</span>
          <h2 className="section-title">Choose Your Wellness<br /><em style={{fontFamily:'var(--font-italic)', fontStyle:'italic'}}>Journey</em></h2>
          <p className="section-sub" style={{margin:'0 auto'}}>Fresh delivery every morning, pause or cancel anytime. No contracts, just goodness.</p>
        </div>

        <div className="benefit-tabs" style={{justifyContent:'center'}}>
          <button className={`btab ${tab === 'coconut' ? 'active' : ''}`} onClick={() => setTab('coconut')}>🥥 Coconut Milk</button>
          <button className={`btab ${tab === 'amla' ? 'active' : ''}`} onClick={() => setTab('amla')}>🌿 Amla Juice</button>
        </div>

        <div className="plans-grid">
          {filtered.map((plan, i) => (
            <div key={plan.id}
              className={`plan-card reveal ${plan.is_popular ? 'popular' : ''}`}
              ref={el => { if (el) { const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setTimeout(() => el.classList.add('visible'), i * 120); obs.unobserve(el) } }, { threshold: 0.1 }); obs.observe(el) } }}>
              {plan.is_popular && <div className="popular-badge">⭐ Most Popular</div>}
              <div className="plan-header">
                <h3 className="plan-name">{plan.name}</h3>
                <div className="plan-duration">{plan.duration}</div>
              </div>
              <div className="plan-price">
                <span className="price-symbol">₹</span>
                <span className="price-amount">{plan.price}</span>
                <span className="price-period">/{plan.duration === '7 days' ? 'week' : plan.duration === '30 days' ? 'month' : '3 months'}</span>
              </div>
              <ul className="plan-features">
                {(Array.isArray(plan.features) ? plan.features : JSON.parse(plan.features)).map((f, fi) => (
                  <li key={fi}><span className="feat-check">✓</span> {f}</li>
                ))}
              </ul>
              <button className="btn btn-primary plan-cta" onClick={() => {
                document.getElementById('enquiry')?.scrollIntoView({ behavior: 'smooth' })
              }}>Subscribe Now →</button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Reviews ─────────────────────────────────────────────────────────────────
function Reviews({ reviews }) {
  const ref = useReveal()

  return (
    <section id="reviews" className="section reviews-section theme-amla">
      <div className="container">
        <div className="section-header" ref={ref}>
          <span className="section-tag">Customer Love</span>
          <h2 className="section-title">What Our Customers<br />Are Saying</h2>
        </div>

        {reviews.length === 0 ? (
          <div className="no-reviews">Be the first to leave a review! ↓</div>
        ) : (
          <div className="reviews-track-wrapper">
            <div className="reviews-track">
              {[...reviews, ...reviews].map((r, i) => (
                <div key={i} className="review-card glass-card">
                  <div className="review-top">
                    <div className="reviewer-avatar">{r.name.charAt(0).toUpperCase()}</div>
                    <div>
                      <div className="reviewer-name">{r.name}</div>
                      <div className="reviewer-juice">{r.juice_type || 'Nature Juice'}</div>
                    </div>
                  </div>
                  <div className="stars">
                    {Array.from({length: 5}, (_, si) => (
                      <span key={si} className={`star ${si < r.rating ? 'filled' : 'empty'}`}>★</span>
                    ))}
                  </div>
                  <p className="review-comment">"{r.comment}"</p>
                  <div className="review-date">{new Date(r.created_at).toLocaleDateString('en-IN', {month:'short',day:'numeric',year:'numeric'})}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

// ─── Review Form ──────────────────────────────────────────────────────────────
function ReviewForm({ onSubmit }) {
  const [form, setForm] = useState({ name: '', rating: 5, juice_type: 'coconut', comment: '' })
  const [loading, setLoading] = useState(false)
  const ref = useReveal()

  const handleSubmit = async () => {
    if (!form.name || !form.comment) return
    setLoading(true)
    await onSubmit(form)
    setForm({ name: '', rating: 5, juice_type: 'coconut', comment: '' })
    setLoading(false)
  }

  return (
    <section className="section review-form-section">
      <div className="container">
        <div className="review-form-inner glass-card" ref={ref}>
          <div className="rf-left">
            <span className="section-tag">Share Your Experience</span>
            <h2 className="section-title" style={{fontSize:'clamp(24px,3vw,38px)'}}>Leave a Review</h2>
            <p className="section-sub" style={{fontSize:'15px'}}>Your feedback helps us serve you better and guides others to make healthy choices.</p>
            <div className="rf-emoji">🌟</div>
          </div>
          <div className="rf-right">
            <div className="form-row">
              <div className="form-group">
                <label className="label">Your Name *</label>
                <input className="input" placeholder="John Doe" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="label">Juice Type</label>
                <select className="input" value={form.juice_type} onChange={e => setForm({...form, juice_type: e.target.value})}>
                  <option value="coconut">🥥 Coconut Milk</option>
                  <option value="amla">🌿 Amla Juice</option>
                  <option value="both">Both</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="label">Rating</label>
              <div className="stars" style={{fontSize:'28px'}}>
                {Array.from({length: 5}, (_, si) => (
                  <span key={si} className={`star ${si < form.rating ? 'filled' : 'empty'}`} onClick={() => setForm({...form, rating: si + 1})}>★</span>
                ))}
              </div>
            </div>
            <div className="form-group">
              <label className="label">Your Review *</label>
              <textarea className="input" rows={4} placeholder="Tell us about your experience with our juices, delivery, and service..." value={form.comment} onChange={e => setForm({...form, comment: e.target.value})} style={{resize:'vertical'}} />
            </div>
            <button className="btn btn-primary" onClick={handleSubmit} disabled={loading} style={{width:'100%', justifyContent:'center'}}>
              {loading ? 'Submitting...' : 'Submit Review ✓'}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Enquiry Form ─────────────────────────────────────────────────────────────
function EnquiryForm({ plans, onSubmit }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', juice_type: 'coconut', plan: '', message: '' })
  const [loading, setLoading] = useState(false)
  const ref = useReveal()

  const relevantPlans = plans.filter(p => p.juice_type === form.juice_type)

  const handleSubmit = async () => {
    if (!form.name || !form.phone) return
    setLoading(true)
    await onSubmit(form)
    setForm({ name: '', phone: '', email: '', juice_type: 'coconut', plan: '', message: '' })
    setLoading(false)
  }

  return (
    <section id="enquiry" className="section enquiry-section">
      <div className="enquiry-bg">
        <div className="enq-orb enq-orb-1" />
        <div className="enq-orb enq-orb-2" />
      </div>
      <div className="container">
        <div className="enquiry-inner" ref={ref}>
          <div className="section-header" style={{marginBottom:'40px'}}>
            <span className="section-tag">Get In Touch</span>
            <h2 className="section-title" style={{color:'white'}}>Start Your<br /><em style={{fontFamily:'var(--font-italic)'}}>Wellness Journey</em></h2>
            <p className="section-sub" style={{color:'rgba(255,255,255,0.75)'}}>Fill in your details and we'll reach out to set up your perfect juice subscription.</p>
          </div>

          <div className="enq-form glass-card">
            <div className="form-row">
              <div className="form-group">
                <label className="label">Full Name *</label>
                <input className="input" placeholder="Your full name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="label">Phone Number *</label>
                <input className="input" placeholder="+91 98765 43210" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="label">Email Address</label>
                <input className="input" placeholder="your@email.com" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
              </div>
              <div className="form-group">
                <label className="label">Preferred Juice</label>
                <select className="input" value={form.juice_type} onChange={e => setForm({...form, juice_type: e.target.value, plan: ''})}>
                  <option value="coconut">🥥 Coconut Milk</option>
                  <option value="amla">🌿 Amla Juice</option>
                  <option value="both">Both</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="label">Interested Plan</label>
              <select className="input" value={form.plan} onChange={e => setForm({...form, plan: e.target.value})}>
                <option value="">Select a plan (optional)</option>
                {relevantPlans.map(p => <option key={p.id} value={p.name}>{p.name} — ₹{p.price}/{p.duration}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="label">Message / Questions</label>
              <textarea className="input" rows={3} placeholder="Any specific delivery time, address details, or questions for us..." value={form.message} onChange={e => setForm({...form, message: e.target.value})} style={{resize:'vertical'}} />
            </div>
            <button className="btn btn-gold" onClick={handleSubmit} disabled={loading} style={{width:'100%', justifyContent:'center', fontSize:'16px', padding:'16px'}}>
              {loading ? '📤 Sending...' : '🌿 Send Enquiry →'}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer({ config }) {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-inner">
          <div className="footer-brand">
            <div className="nav-logo" style={{marginBottom:'12px'}}>
              <span className="logo-icon">🌿</span>
              <span className="logo-text" style={{color:'white'}}>Nature<em>Juice</em></span>
            </div>
            <p style={{color:'rgba(255,255,255,0.6)', fontSize:'14px', lineHeight:'1.7'}}>
              Daily freshly pressed juices delivered<br />to your doorstep. Pure, natural, no additives.
            </p>
          </div>
          <div className="footer-contact">
            <h4 style={{color:'white', marginBottom:'16px', fontFamily:'var(--font-display)'}}>Contact Us</h4>
            <div className="contact-item">📞 {config.contact_phone || '+91 98765 43210'}</div>
            <div className="contact-item">✉️ {config.contact_email || 'hello@naturejuice.in'}</div>
            <div className="contact-item">📍 {config.contact_address || 'Mumbai, Maharashtra'}</div>
          </div>
          <div className="footer-links">
            <h4 style={{color:'white', marginBottom:'16px', fontFamily:'var(--font-display)'}}>Quick Links</h4>
            {['benefits','plans','reviews','enquiry'].map(id => (
              <button key={id} className="footer-link" onClick={() => document.getElementById(id)?.scrollIntoView({behavior:'smooth'})}>
                {id.charAt(0).toUpperCase() + id.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}

// ─── Main Home ────────────────────────────────────────────────────────────────
export default function Home() {
  const [config, setConfig] = useState({})
  const [benefits, setBenefits] = useState([])
  const [plans, setPlans] = useState([])
  const [reviews, setReviews] = useState([])
  const [images, setImages] = useState([])
  const [toast, setToast] = useState(null)

  const showToast = (message, type = 'success') => setToast({ message, type })
  const hideToast = () => setToast(null)

  useEffect(() => {
    Promise.all([
      axios.get('/api/config'),
      axios.get('/api/benefits'),
      axios.get('/api/plans'),
      axios.get('/api/reviews'),
      axios.get('/api/juice-images'),
    ]).then(([cfg, ben, pln, rev, img]) => {
      setConfig(cfg.data)
      setBenefits(ben.data)
      setPlans(pln.data)
      setReviews(rev.data)
      setImages(img.data)
    }).catch(console.error)
  }, [])

  const submitReview = async (data) => {
    try {
      await axios.post('/api/reviews', data)
      showToast('🌟 Review submitted! It will appear after approval.', 'success')
    } catch { showToast('Something went wrong. Please try again.', 'error') }
  }

  const submitEnquiry = async (data) => {
    try {
      await axios.post('/api/enquiries', data)
      showToast('🌿 Enquiry sent! We\'ll contact you shortly.', 'success')
    } catch { showToast('Something went wrong. Please try again.', 'error') }
  }

  return (
    <div className="home">
      <Navbar config={config} />
      <Hero config={config} images={images} />
      <Benefits benefits={benefits} />
      <Plans plans={plans} />
      <Reviews reviews={reviews} />
      <ReviewForm onSubmit={submitReview} />
      <EnquiryForm plans={plans} onSubmit={submitEnquiry} />
      <Footer config={config} />
      {toast && <Toast {...toast} onClose={hideToast} />}
    </div>
  )
}

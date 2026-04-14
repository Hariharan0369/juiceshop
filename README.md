# 🌿 Nature Juice — Full Stack App

A beautiful full-stack juice subscription website with admin dashboard.

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- npm 8+

### Step 1 — Install Dependencies

```bash
# Install backend
cd backend
npm install

# Install frontend
cd ../frontend
npm install
```

### Step 2 — Start Backend

```bash
cd backend
node server.js
# OR for development with auto-reload:
npm run dev
```

Backend runs at: **http://localhost:5000**

### Step 3 — Start Frontend (in a new terminal)

```bash
cd frontend
npm run dev
```

Frontend runs at: **http://localhost:5173**

---

## 🔐 Admin Access

- **URL:** http://localhost:5173/admin
- **Username:** `admin`
- **Password:** `NatureJuice@2024`

> The password is **SHA-256 hashed** before transmission — never sent in plain text.
> Change it immediately after first login via Admin → Password section.

---

## 📁 Project Structure

```
juice-app/
├── backend/
│   ├── server.js       # Express API server
│   ├── db.js           # SQLite database setup & seeding
│   ├── juice.db        # SQLite database (auto-created)
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.jsx          # Main landing page
│   │   │   ├── Home.css
│   │   │   ├── AdminLogin.jsx    # Admin login page
│   │   │   ├── AdminLogin.css
│   │   │   ├── AdminDashboard.jsx # Full admin panel
│   │   │   └── AdminDashboard.css
│   │   ├── components/
│   │   │   ├── ProtectedRoute.jsx
│   │   │   └── useReveal.js      # Scroll animation hook
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css             # Global design system
│   ├── index.html
│   └── package.json
└── uploads/                      # Juice images stored here
    ├── coconut-milk.png
    └── amla-juice.jpeg
```

---

## ✨ Features

### Public Website
- **Hero Section** — Animated with floating tags, liquid blob effect, juice switcher
- **Benefits Section** — Editable benefits for both coconut milk and amla juice
- **Subscription Plans** — Monthly plans with pricing, tabbed by juice type
- **Reviews Carousel** — Auto-scrolling approved reviews
- **Review Form** — Customers submit reviews (pending admin approval)
- **Enquiry Form** — Customers enquire about subscriptions

### Admin Dashboard
- 🔐 **SHA-256 protected login** (never exposes plain passwords in code)
- 📊 **Overview** — Live stats for enquiries, reviews, plans
- ⚙️ **Site Config** — Edit hero text, tagline, contact info
- ✨ **Benefits** — Add/edit/delete benefits per juice
- 💳 **Plans** — Full CRUD for subscription plans, pricing, features
- 🖼️ **Juice Images** — Upload new product images
- 📬 **Enquiries** — Real-time new enquiry notifications via SSE, status management (new/contacted/closed), click-to-call/email
- ⭐ **Reviews** — Approve/reject/delete customer reviews
- 🔐 **Password** — Change admin password securely

### Technical Features
- **Real-time updates** via Server-Sent Events (SSE) — new enquiries/reviews appear instantly
- **SQLite database** — zero configuration, file-based
- **Image uploads** — multer-based with persistent storage
- **JWT authentication** — 8-hour sessions
- **Scroll reveal animations** — IntersectionObserver-based
- **Liquid morphing blob** — CSS animation
- **Auto-scrolling reviews** — CSS-only marquee

---

## 🌐 Production Deployment

1. Build the frontend:
```bash
cd frontend && npm run build
```

2. Serve static files from backend:
```javascript
// Add to server.js:
app.use(express.static(path.join(__dirname, '../frontend/dist')))
```

3. Run backend only:
```bash
cd backend && NODE_ENV=production node server.js
```

---

## 🎨 Design System

- **Fonts:** Playfair Display (headings) + DM Sans (body) + Cormorant Garamond (italic accents)
- **Colors:** Forest green (#2d5016), Jade (#6aab47), Coconut cream (#faf6f0), Bark brown (#3d2b1f)
- **Animations:** Liquid blob morph, scroll reveals, auto-marquee, floating tags, orb drift

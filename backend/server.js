const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const initDB = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'nature_juice_secret_2024_xK9mP';

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: UPLOADS_DIR,
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

app.use(cors({ origin: ['http://localhost:5173','http://localhost:3000','http://localhost:5000'] }));
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR));

function authMiddleware(req, res, next) {
  // Support both header and query param (for SSE)
  const token = req.headers.authorization?.split(' ')[1] || req.query.token;
  if (!token) return res.status(401).json({ error: 'No token' });
  try { req.admin = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid token' }); }
}

// SSE clients
const sseClients = new Set();
function broadcast(event, data) {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach(c => { try { c.write(msg); } catch {} });
}

// Boot
initDB().then(db => {

  // ── Admin login ────────────────────────────────────────────────────────────
  app.post('/api/admin/login', (req, res) => {
    const { username, passwordHash } = req.body;
    if (!username || !passwordHash) return res.status(400).json({ error: 'Missing fields' });
    const admin = db.get('SELECT * FROM admin WHERE username = ?', [username]);
    if (!admin || admin.password_hash !== passwordHash) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ username: admin.username, id: admin.id }, JWT_SECRET, { expiresIn: '8h' });
    res.json({ token });
  });

  app.put('/api/admin/password', authMiddleware, (req, res) => {
    const { currentPasswordHash, newPasswordHash } = req.body;
    if (!currentPasswordHash || !newPasswordHash) return res.status(400).json({ error: 'Missing fields' });
    
    const admin = db.get('SELECT password_hash FROM admin WHERE username = ?', [req.admin.username]);
    if (!admin || admin.password_hash !== currentPasswordHash) {
      return res.status(401).json({ error: 'Current password incorrect' });
    }

    db.run('UPDATE admin SET password_hash = ? WHERE username = ?', [newPasswordHash, req.admin.username]);
    res.json({ success: true });
  });

  // ── Site Config ────────────────────────────────────────────────────────────
  app.get('/api/config', (req, res) => {
    const rows = db.all('SELECT key, value FROM site_config');
    const config = {};
    rows.forEach(r => config[r.key] = r.value);
    res.json(config);
  });

  app.put('/api/admin/config', authMiddleware, (req, res) => {
    Object.entries(req.body).forEach(([k, v]) => {
      const exists = db.get('SELECT key FROM site_config WHERE key=?', [k]);
      if (exists) db.run('UPDATE site_config SET value=? WHERE key=?', [v, k]);
      else db.run('INSERT INTO site_config(key,value) VALUES(?,?)', [k, v]);
    });
    res.json({ success: true });
  });

  // ── Benefits ───────────────────────────────────────────────────────────────
  app.get('/api/benefits', (req, res) => {
    res.json(db.all('SELECT * FROM benefits ORDER BY juice_type, sort_order'));
  });

  app.post('/api/admin/benefits', authMiddleware, (req, res) => {
    const { juice_type, icon, title, description, sort_order } = req.body;
    const r = db.run('INSERT INTO benefits(juice_type,icon,title,description,sort_order) VALUES(?,?,?,?,?)',
      [juice_type, icon, title, description, sort_order || 0]);
    res.json({ id: r.lastInsertRowid });
  });

  app.put('/api/admin/benefits/:id', authMiddleware, (req, res) => {
    const { icon, title, description, sort_order } = req.body;
    db.run('UPDATE benefits SET icon=?,title=?,description=?,sort_order=? WHERE id=?',
      [icon, title, description, sort_order, req.params.id]);
    res.json({ success: true });
  });

  app.delete('/api/admin/benefits/:id', authMiddleware, (req, res) => {
    db.run('DELETE FROM benefits WHERE id=?', [req.params.id]);
    res.json({ success: true });
  });

  // ── Plans ──────────────────────────────────────────────────────────────────
  app.get('/api/plans', (req, res) => {
    const rows = db.all('SELECT * FROM plans WHERE is_active=1 ORDER BY juice_type, price');
    rows.forEach(r => { try { r.features = JSON.parse(r.features); } catch { r.features = []; } });
    res.json(rows);
  });

  app.get('/api/admin/plans', authMiddleware, (req, res) => {
    const rows = db.all('SELECT * FROM plans ORDER BY juice_type, price');
    rows.forEach(r => { try { r.features = JSON.parse(r.features); } catch { r.features = []; } });
    res.json(rows);
  });

  app.post('/api/admin/plans', authMiddleware, (req, res) => {
    const { juice_type, name, price, duration, features, is_popular, is_active } = req.body;
    const r = db.run('INSERT INTO plans(juice_type,name,price,duration,features,is_popular,is_active) VALUES(?,?,?,?,?,?,?)',
      [juice_type, name, price, duration, JSON.stringify(features), is_popular ? 1 : 0, is_active !== false ? 1 : 0]);
    res.json({ id: r.lastInsertRowid });
  });

  app.put('/api/admin/plans/:id', authMiddleware, (req, res) => {
    const { name, price, duration, features, is_popular, is_active } = req.body;
    db.run('UPDATE plans SET name=?,price=?,duration=?,features=?,is_popular=?,is_active=? WHERE id=?',
      [name, price, duration, JSON.stringify(features), is_popular ? 1 : 0, is_active !== false ? 1 : 0, req.params.id]);
    res.json({ success: true });
  });

  app.delete('/api/admin/plans/:id', authMiddleware, (req, res) => {
    db.run('DELETE FROM plans WHERE id=?', [req.params.id]);
    res.json({ success: true });
  });

  // ── Enquiries ──────────────────────────────────────────────────────────────
  app.get('/api/admin/enquiries', authMiddleware, (req, res) => {
    res.json(db.all('SELECT * FROM enquiries ORDER BY created_at DESC'));
  });

  app.post('/api/enquiries', (req, res) => {
    const { name, phone, email, juice_type, plan, message } = req.body;
    if (!name || !phone || !juice_type) return res.status(400).json({ error: 'Missing required fields' });
    const r = db.run('INSERT INTO enquiries(name,phone,email,juice_type,plan,message) VALUES(?,?,?,?,?,?)',
      [name, phone, email || '', juice_type, plan || '', message || '']);
    const row = db.get('SELECT * FROM enquiries WHERE id=?', [r.lastInsertRowid]);
    broadcast('new_enquiry', row);
    res.json({ id: r.lastInsertRowid, success: true });
  });

  app.put('/api/admin/enquiries/:id/status', authMiddleware, (req, res) => {
    db.run('UPDATE enquiries SET status=? WHERE id=?', [req.body.status, req.params.id]);
    res.json({ success: true });
  });

  app.delete('/api/admin/enquiries/:id', authMiddleware, (req, res) => {
    db.run('DELETE FROM enquiries WHERE id=?', [req.params.id]);
    res.json({ success: true });
  });

  // ── Reviews ────────────────────────────────────────────────────────────────
  app.get('/api/reviews', (req, res) => {
    res.json(db.all('SELECT * FROM reviews WHERE is_approved=1 ORDER BY created_at DESC'));
  });

  app.get('/api/admin/reviews', authMiddleware, (req, res) => {
    res.json(db.all('SELECT * FROM reviews ORDER BY created_at DESC'));
  });

  app.post('/api/reviews', (req, res) => {
    const { name, rating, juice_type, comment } = req.body;
    if (!name || !rating || !comment) return res.status(400).json({ error: 'Missing required fields' });
    const r = db.run('INSERT INTO reviews(name,rating,juice_type,comment) VALUES(?,?,?,?)',
      [name, rating, juice_type || '', comment]);
    const row = db.get('SELECT * FROM reviews WHERE id=?', [r.lastInsertRowid]);
    broadcast('new_review', row);
    res.json({ id: r.lastInsertRowid, success: true });
  });

  app.put('/api/admin/reviews/:id/approve', authMiddleware, (req, res) => {
    db.run('UPDATE reviews SET is_approved=? WHERE id=?', [req.body.is_approved ? 1 : 0, req.params.id]);
    res.json({ success: true });
  });

  app.delete('/api/admin/reviews/:id', authMiddleware, (req, res) => {
    db.run('DELETE FROM reviews WHERE id=?', [req.params.id]);
    res.json({ success: true });
  });

  // ── Juice Images ───────────────────────────────────────────────────────────
  app.get('/api/juice-images', (req, res) => {
    res.json(db.all('SELECT * FROM juice_images'));
  });

  app.post('/api/admin/juice-images/:type', authMiddleware, upload.single('image'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const type = req.params.type;
    const exists = db.get('SELECT id FROM juice_images WHERE juice_type=?', [type]);
    if (exists) db.run('UPDATE juice_images SET filename=?,updated_at=CURRENT_TIMESTAMP WHERE juice_type=?', [req.file.filename, type]);
    else db.run('INSERT INTO juice_images(juice_type,filename) VALUES(?,?)', [type, req.file.filename]);
    res.json({ filename: req.file.filename });
  });

  // ── SSE real-time ──────────────────────────────────────────────────────────
  app.get('/api/admin/stream', authMiddleware, (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    res.write(': connected\n\n');
    sseClients.add(res);
    req.on('close', () => sseClients.delete(res));
  });

  // ── Start ──────────────────────────────────────────────────────────────────
  app.listen(PORT, () => {
    console.log(`\n🥥  Nature Juice Server  →  http://localhost:${PORT}`);
    console.log(`🔐  Admin credentials: admin / NatureJuice@2024`);
    console.log(`📦  Database: juice.db\n`);
  });

}).catch(err => {
  console.error('Failed to init database:', err);
  process.exit(1);
});

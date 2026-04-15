const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const path = require('path');
const multer = require('multer');
const { createClient } = require('@libsql/client');

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'nature_juice_secret_2024_xK9mP';

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || 'libsql://nature-juice-db-hariharan0369.aws-ap-south-1.turso.io',
  authToken: process.env.TURSO_AUTH_TOKEN || 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzYxNDg2ODUsImlkIjoiMDE5ZDhhYjQtZTEwMS03NTMwLTgyODEtNDc0NjJiYTliYzE4IiwicmlkIjoiNmEzYjIyODUtODQ0Ny00NTExLWJlMTYtMDU3NTQ2NTYyYTU0In0.F0JxFbzcLC2s1YAZsJg2OosCdmj0Nzddrvacw4bIpqBAprjf8HSPBGUrpB3g99KytquFjqtWB72-hAP8zX-5AA',
});

// Configure Multer for transient uploads (Vercel /tmp)
const storage = multer.diskStorage({
  destination: '/tmp',
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('/tmp'));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// DB Wrapper
const db = {
  async execute(sql, params = []) { return await client.execute({ sql, args: params }); },
  async get(sql, params = []) { const res = await client.execute({ sql, args: params }); return res.rows[0]; },
  async all(sql, params = []) { const res = await client.execute({ sql, args: params }); return res.rows; }
};

let isInitialized = false;
async function ensureInit() {
  if (isInitialized) return;
  await db.execute(`CREATE TABLE IF NOT EXISTS admin (id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL)`);
  await db.execute(`CREATE TABLE IF NOT EXISTS site_config (key TEXT PRIMARY KEY, value TEXT NOT NULL)`);
  await db.execute(`CREATE TABLE IF NOT EXISTS benefits (id INTEGER PRIMARY KEY AUTOINCREMENT, juice_type TEXT NOT NULL, icon TEXT NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL, sort_order INTEGER DEFAULT 0)`);
  await db.execute(`CREATE TABLE IF NOT EXISTS plans (id INTEGER PRIMARY KEY AUTOINCREMENT, juice_type TEXT NOT NULL, name TEXT NOT NULL, price INTEGER NOT NULL, duration TEXT NOT NULL, features TEXT NOT NULL, is_popular INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1)`);
  await db.execute(`CREATE TABLE IF NOT EXISTS enquiries (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT, juice_type TEXT NOT NULL, plan TEXT, message TEXT, status TEXT DEFAULT 'new', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  await db.execute(`CREATE TABLE IF NOT EXISTS reviews (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, rating INTEGER NOT NULL, juice_type TEXT, comment TEXT NOT NULL, is_approved INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  await db.execute(`CREATE TABLE IF NOT EXISTS juice_images (id INTEGER PRIMARY KEY AUTOINCREMENT, juice_type TEXT UNIQUE NOT NULL, filename TEXT NOT NULL, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  
  const admin = await db.get('SELECT id FROM admin WHERE username = ?', ['admin']);
  if (!admin) {
    const hash = crypto.createHash('sha256').update('NatureJuice@2024').digest('hex');
    await db.execute('INSERT INTO admin (username, password_hash) VALUES (?, ?)', ['admin', hash]);
  }
  
  // Default config
  const configs = [
    ['hero_headline','Pure Nature. Daily Freshness.'],
    ['hero_subheadline','Daily-pressed coconut milk & amla juice delivered to your door'],
    ['hero_tagline','100% Natural • No Preservatives • Farm to Glass'],
    ['contact_phone','+91 98765 43210'],
    ['contact_email','hello@naturejuice.in'],
    ['contact_address','Mumbai, Maharashtra'],
  ];
  for (const [k,v] of configs) {
    const exists = await db.get('SELECT key FROM site_config WHERE key=?', [k]);
    if (!exists) await db.execute('INSERT INTO site_config(key,value) VALUES(?,?)', [k,v]);
  }
  
  isInitialized = true;
}

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1] || req.query.token;
  if (!token) return res.status(401).json({ error: 'No token' });
  try { req.admin = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid token' }); }
}

// Routes
app.post('/api/admin/login', async (req, res) => {
  await ensureInit();
  const { username, passwordHash } = req.body;
  const admin = await db.get('SELECT * FROM admin WHERE username = ?', [username]);
  if (!admin || admin.password_hash !== passwordHash) return res.status(401).json({ error: 'Invalid credentials' });
  res.json({ token: jwt.sign({ username: admin.username, id: admin.id }, JWT_SECRET, { expiresIn: '8h' }) });
});

app.put('/api/admin/password', authMiddleware, async (req, res) => {
  await ensureInit();
  const { currentPasswordHash, newPasswordHash } = req.body;
  const admin = await db.get('SELECT password_hash FROM admin WHERE username = ?', [req.admin.username]);
  if (!admin || admin.password_hash !== currentPasswordHash) return res.status(401).json({ error: 'Current password incorrect' });
  await db.execute('UPDATE admin SET password_hash = ? WHERE username = ?', [newPasswordHash, req.admin.username]);
  res.json({ success: true });
});

app.get('/api/config', async (req, res) => {
  await ensureInit();
  const rows = await db.all('SELECT key, value FROM site_config');
  const config = {}; rows.forEach(r => config[r.key] = r.value);
  res.json(config);
});

app.put('/api/admin/config', authMiddleware, async (req, res) => {
  await ensureInit();
  for (const [k, v] of Object.entries(req.body)) {
    const exists = await db.get('SELECT key FROM site_config WHERE key=?', [k]);
    if (exists) await db.execute('UPDATE site_config SET value=? WHERE key=?', [v, k]);
    else await db.execute('INSERT INTO site_config(key,value) VALUES(?,?)', [k, v]);
  }
  res.json({ success: true });
});

app.get('/api/benefits', async (req, res) => {
  await ensureInit();
  res.json(await db.all('SELECT * FROM benefits ORDER BY juice_type, sort_order'));
});

app.post('/api/admin/benefits', authMiddleware, async (req, res) => {
  await ensureInit();
  const { juice_type, icon, title, description, sort_order } = req.body;
  const r = await db.execute('INSERT INTO benefits(juice_type,icon,title,description,sort_order) VALUES(?,?,?,?,?)', [juice_type, icon, title, description, sort_order || 0]);
  res.json({ id: Number(r.lastInsertRowid) });
});

app.put('/api/admin/benefits/:id', authMiddleware, async (req, res) => {
  await ensureInit();
  const { icon, title, description, sort_order } = req.body;
  await db.execute('UPDATE benefits SET icon=?,title=?,description=?,sort_order=? WHERE id=?', [icon, title, description, sort_order, req.params.id]);
  res.json({ success: true });
});

app.delete('/api/admin/benefits/:id', authMiddleware, async (req, res) => {
  await ensureInit();
  await db.execute('DELETE FROM benefits WHERE id=?', [req.params.id]);
  res.json({ success: true });
});

app.get('/api/plans', async (req, res) => {
  await ensureInit();
  const rows = await db.all('SELECT * FROM plans WHERE is_active=1 ORDER BY juice_type, price');
  rows.forEach(r => { try { r.features = JSON.parse(r.features); } catch { r.features = []; } });
  res.json(rows);
});

app.get('/api/admin/plans', authMiddleware, async (req, res) => {
  await ensureInit();
  const rows = await db.all('SELECT * FROM plans ORDER BY juice_type, price');
  rows.forEach(r => { try { r.features = JSON.parse(r.features); } catch { r.features = []; } });
  res.json(rows);
});

app.post('/api/admin/plans', authMiddleware, async (req, res) => {
  await ensureInit();
  const { juice_type, name, price, duration, features, is_popular, is_active } = req.body;
  const r = await db.execute('INSERT INTO plans(juice_type,name,price,duration,features,is_popular,is_active) VALUES(?,?,?,?,?,?,?)', [juice_type, name, price, duration, JSON.stringify(features), is_popular ? 1 : 0, is_active !== false ? 1 : 0]);
  res.json({ id: Number(r.lastInsertRowid) });
});

app.put('/api/admin/plans/:id', authMiddleware, async (req, res) => {
  await ensureInit();
  const { name, price, duration, features, is_popular, is_active } = req.body;
  await db.execute('UPDATE plans SET name=?,price=?,duration=?,features=?,is_popular=?,is_active=? WHERE id=?', [name, price, duration, JSON.stringify(features), is_popular ? 1 : 0, is_active !== false ? 1 : 0, req.params.id]);
  res.json({ success: true });
});

app.delete('/api/admin/plans/:id', authMiddleware, async (req, res) => {
  await ensureInit();
  await db.execute('DELETE FROM plans WHERE id=?', [req.params.id]);
  res.json({ success: true });
});

app.get('/api/admin/enquiries', authMiddleware, async (req, res) => {
  await ensureInit();
  res.json(await db.all('SELECT * FROM enquiries ORDER BY created_at DESC'));
});

app.post('/api/enquiries', async (req, res) => {
  await ensureInit();
  const { name, phone, email, juice_type, plan, message } = req.body;
  if (!name || !phone || !juice_type) return res.status(400).json({ error: 'Missing fields' });
  const r = await db.execute('INSERT INTO enquiries(name,phone,email,juice_type,plan,message) VALUES(?,?,?,?,?,?)', [name, phone, email || '', juice_type, plan || '', message || '']);
  res.json({ id: Number(r.lastInsertRowid), success: true });
});

app.put('/api/admin/enquiries/:id/status', authMiddleware, async (req, res) => {
  await ensureInit();
  await db.execute('UPDATE enquiries SET status=? WHERE id=?', [req.body.status, req.params.id]);
  res.json({ success: true });
});

app.delete('/api/admin/enquiries/:id', authMiddleware, async (req, res) => {
  await ensureInit();
  await db.execute('DELETE FROM enquiries WHERE id=?', [req.params.id]);
  res.json({ success: true });
});

app.get('/api/reviews', async (req, res) => {
  await ensureInit();
  res.json(await db.all('SELECT * FROM reviews WHERE is_approved=1 ORDER BY created_at DESC'));
});

app.get('/api/admin/reviews', authMiddleware, async (req, res) => {
  await ensureInit();
  res.json(await db.all('SELECT * FROM reviews ORDER BY created_at DESC'));
});

app.post('/api/reviews', async (req, res) => {
  await ensureInit();
  const { name, rating, juice_type, comment } = req.body;
  if (!name || !rating || !comment) return res.status(400).json({ error: 'Missing fields' });
  const r = await db.execute('INSERT INTO reviews(name,rating,juice_type,comment) VALUES(?,?,?,?)', [name, rating, juice_type || '', comment]);
  res.json({ id: Number(r.lastInsertRowid), success: true });
});

app.put('/api/admin/reviews/:id/approve', authMiddleware, async (req, res) => {
  await ensureInit();
  await db.execute('UPDATE reviews SET is_approved=? WHERE id=?', [req.body.is_approved ? 1 : 0, req.params.id]);
  res.json({ success: true });
});

app.delete('/api/admin/reviews/:id', authMiddleware, async (req, res) => {
  await ensureInit();
  await db.execute('DELETE FROM reviews WHERE id=?', [req.params.id]);
  res.json({ success: true });
});

app.get('/api/juice-images', async (req, res) => {
  await ensureInit();
  res.json(await db.all('SELECT * FROM juice_images'));
});

app.post('/api/admin/juice-images/:type', authMiddleware, upload.single('image'), async (req, res) => {
  await ensureInit();
  if (!req.file) return res.status(400).json({ error: 'No file' });
  const type = req.params.type;
  const filename = req.file.filename;
  const exists = await db.get('SELECT id FROM juice_images WHERE juice_type=?', [type]);
  if (exists) await db.execute('UPDATE juice_images SET filename=?,updated_at=CURRENT_TIMESTAMP WHERE juice_type=?', [filename, type]);
  else await db.execute('INSERT INTO juice_images(juice_type,filename) VALUES(?,?)', [type, filename]);
  res.json({ filename });
});

// Real-time SSE dummy for serverless compatibility
app.get('/api/admin/stream', authMiddleware, (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
  res.write(': connected\n\n');
  // In serverless, this connection will likely timeout after 10-60s.
  // The client will reconnect automatically.
});

module.exports = app;

if (require.main === module) {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => console.log(`🚀 Server: http://localhost:${PORT}`));
}

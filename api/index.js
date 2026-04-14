const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const initSqlJs = require('sql.js');

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'nature_juice_secret_2024_xK9mP';

// Vercel /tmp for transient DB storage
const DB_PATH = '/tmp/juice.db';
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR));

// DB Wrapper for sql.js
class SyncDB {
  constructor(sqlDb) {
    this._db = sqlDb;
  }
  run(sql, params = []) {
    const stmt = this._db.prepare(sql);
    stmt.run(params);
    const changes = this._db.getRowsModified();
    const res = this._db.exec('SELECT last_insert_rowid()');
    const rowid = res.length ? res[0].values[0][0] : 0;
    stmt.free();
    this._persist();
    return { changes, lastInsertRowid: rowid };
  }
  get(sql, params = []) {
    const stmt = this._db.prepare(sql);
    stmt.bind(params);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return row;
    }
    stmt.free();
    return undefined;
  }
  all(sql, params = []) {
    const stmt = this._db.prepare(sql);
    stmt.bind(params);
    const rows = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    return rows;
  }
  _persist() {
    const data = this._db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  }
}

let dbInstance = null;
async function getDB() {
  if (dbInstance) return dbInstance;
  const SQL = await initSqlJs();
  let sqlDb;
  
  // Try to load existing from project if not in /tmp
  const LOCAL_DB = path.join(__dirname, '..', 'backend', 'juice.db');
  if (fs.existsSync(DB_PATH)) {
    sqlDb = new SQL.Database(fs.readFileSync(DB_PATH));
  } else if (fs.existsSync(LOCAL_DB)) {
    sqlDb = new SQL.Database(fs.readFileSync(LOCAL_DB));
  } else {
    sqlDb = new SQL.Database();
  }

  const db = new SyncDB(sqlDb);
  // Ensure tables
  sqlDb.run(`
    CREATE TABLE IF NOT EXISTS admin (id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS site_config (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS benefits (id INTEGER PRIMARY KEY AUTOINCREMENT, juice_type TEXT NOT NULL, icon TEXT NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL, sort_order INTEGER DEFAULT 0);
    CREATE TABLE IF NOT EXISTS plans (id INTEGER PRIMARY KEY AUTOINCREMENT, juice_type TEXT NOT NULL, name TEXT NOT NULL, price INTEGER NOT NULL, duration TEXT NOT NULL, features TEXT NOT NULL, is_popular INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1);
    CREATE TABLE IF NOT EXISTS enquiries (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT, juice_type TEXT NOT NULL, plan TEXT, message TEXT, status TEXT DEFAULT 'new', created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS reviews (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, rating INTEGER NOT NULL, juice_type TEXT, comment TEXT NOT NULL, is_approved INTEGER DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS juice_images (id INTEGER PRIMARY KEY AUTOINCREMENT, juice_type TEXT UNIQUE NOT NULL, filename TEXT NOT NULL, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP);
  `);
  
  // Initial data if empty
  if (!db.get('SELECT id FROM admin WHERE username = ?', ['admin'])) {
    const hash = crypto.createHash('sha256').update('NatureJuice@2024').digest('hex');
    db.run('INSERT INTO admin (username, password_hash) VALUES (?, ?)', ['admin', hash]);
  }

  dbInstance = db;
  return db;
}

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1] || req.query.token;
  if (!token) return res.status(401).json({ error: 'No token' });
  try { req.admin = jwt.verify(token, JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid token' }); }
}

// API Routes
app.post('/api/admin/login', async (req, res) => {
  const db = await getDB();
  const { username, passwordHash } = req.body;
  const admin = db.get('SELECT * FROM admin WHERE username = ?', [username]);
  if (!admin || admin.password_hash !== passwordHash) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ username: admin.username, id: admin.id }, JWT_SECRET, { expiresIn: '8h' });
  res.json({ token });
});

app.put('/api/admin/password', authMiddleware, async (req, res) => {
  const db = await getDB();
  const { currentPasswordHash, newPasswordHash } = req.body;
  const admin = db.get('SELECT password_hash FROM admin WHERE username = ?', [req.admin.username]);
  if (!admin || admin.password_hash !== currentPasswordHash) return res.status(401).json({ error: 'Current password incorrect' });
  db.run('UPDATE admin SET password_hash = ? WHERE username = ?', [newPasswordHash, req.admin.username]);
  res.json({ success: true });
});

app.get('/api/config', async (req, res) => {
  const db = await getDB();
  const rows = db.all('SELECT key, value FROM site_config');
  const config = {};
  rows.forEach(r => config[r.key] = r.value);
  res.json(config);
});

app.put('/api/admin/config', authMiddleware, async (req, res) => {
  const db = await getDB();
  Object.entries(req.body).forEach(([k, v]) => {
    const exists = db.get('SELECT key FROM site_config WHERE key=?', [k]);
    if (exists) db.run('UPDATE site_config SET value=? WHERE key=?', [v, k]);
    else db.run('INSERT INTO site_config(key,value) VALUES(?,?)', [k, v]);
  });
  res.json({ success: true });
});

app.get('/api/benefits', async (req, res) => {
  const db = await getDB();
  res.json(db.all('SELECT * FROM benefits ORDER BY juice_type, sort_order'));
});

app.post('/api/admin/benefits', authMiddleware, async (req, res) => {
  const db = await getDB();
  const { juice_type, icon, title, description, sort_order } = req.body;
  const r = db.run('INSERT INTO benefits(juice_type,icon,title,description,sort_order) VALUES(?,?,?,?,?)', [juice_type, icon, title, description, sort_order || 0]);
  res.json({ id: r.lastInsertRowid });
});

app.get('/api/plans', async (req, res) => {
  const db = await getDB();
  const rows = db.all('SELECT * FROM plans WHERE is_active=1 ORDER BY juice_type, price');
  rows.forEach(r => { try { r.features = JSON.parse(r.features); } catch { r.features = []; } });
  res.json(rows);
});

app.get('/api/admin/plans', authMiddleware, async (req, res) => {
  const db = await getDB();
  const rows = db.all('SELECT * FROM plans ORDER BY juice_type, price');
  rows.forEach(r => { try { r.features = JSON.parse(r.features); } catch { r.features = []; } });
  res.json(rows);
});

app.post('/api/admin/plans', authMiddleware, async (req, res) => {
  const db = await getDB();
  const { juice_type, name, price, duration, features, is_popular, is_active } = req.body;
  const r = db.run('INSERT INTO plans(juice_type,name,price,duration,features,is_popular,is_active) VALUES(?,?,?,?,?,?,?)', [juice_type, name, price, duration, JSON.stringify(features), is_popular ? 1 : 0, is_active !== false ? 1 : 0]);
  res.json({ id: r.lastInsertRowid });
});

app.put('/api/admin/plans/:id', authMiddleware, async (req, res) => {
  const db = await getDB();
  const { name, price, duration, features, is_popular, is_active } = req.body;
  db.run('UPDATE plans SET name=?,price=?,duration=?,features=?,is_popular=?,is_active=? WHERE id=?', [name, price, duration, JSON.stringify(features), is_popular ? 1 : 0, is_active !== false ? 1 : 0, req.params.id]);
  res.json({ success: true });
});

app.delete('/api/admin/plans/:id', authMiddleware, async (req, res) => {
  const db = await getDB();
  db.run('DELETE FROM plans WHERE id=?', [req.params.id]);
  res.json({ success: true });
});

app.get('/api/admin/enquiries', authMiddleware, async (req, res) => {
  const db = await getDB();
  res.json(db.all('SELECT * FROM enquiries ORDER BY created_at DESC'));
});

app.post('/api/enquiries', async (req, res) => {
  const db = await getDB();
  const { name, phone, email, juice_type, plan, message } = req.body;
  if (!name || !phone || !juice_type) return res.status(400).json({ error: 'Missing fields' });
  const r = db.run('INSERT INTO enquiries(name,phone,email,juice_type,plan,message) VALUES(?,?,?,?,?,?)', [name, phone, email || '', juice_type, plan || '', message || '']);
  res.json({ id: r.lastInsertRowid, success: true });
});

app.get('/api/reviews', async (req, res) => {
  const db = await getDB();
  res.json(db.all('SELECT * FROM reviews WHERE is_approved=1 ORDER BY created_at DESC'));
});

app.post('/api/reviews', async (req, res) => {
  const db = await getDB();
  const { name, rating, juice_type, comment } = req.body;
  const r = db.run('INSERT INTO reviews(name,rating,juice_type,comment) VALUES(?,?,?,?)', [name, rating, juice_type || '', comment]);
  res.json({ id: r.lastInsertRowid, success: true });
});

app.get('/api/juice-images', async (req, res) => {
  const db = await getDB();
  res.json(db.all('SELECT * FROM juice_images'));
});

// For Vercel, we export the app
module.exports = app;

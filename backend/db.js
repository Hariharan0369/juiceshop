/**
 * db.js — SQLite via sql.js (pure JavaScript, no C++ build tools needed)
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DB_PATH = path.join(__dirname, 'juice.db');

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

  exec(sql) {
    this._db.run(sql);
    this._persist();
  }

  _persist() {
    const data = this._db.export();
    fs.writeFileSync(DB_PATH, Buffer.from(data));
  }
}

async function initDB() {
  const initSqlJs = require('sql.js');
  const SQL = await initSqlJs();

  let sqlDb;
  if (fs.existsSync(DB_PATH)) {
    sqlDb = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    sqlDb = new SQL.Database();
  }

  const db = new SyncDB(sqlDb);

  sqlDb.run(`
    CREATE TABLE IF NOT EXISTS admin (
      id INTEGER PRIMARY KEY, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS site_config (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS benefits (
      id INTEGER PRIMARY KEY AUTOINCREMENT, juice_type TEXT NOT NULL,
      icon TEXT NOT NULL, title TEXT NOT NULL, description TEXT NOT NULL, sort_order INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT, juice_type TEXT NOT NULL, name TEXT NOT NULL,
      price INTEGER NOT NULL, duration TEXT NOT NULL, features TEXT NOT NULL,
      is_popular INTEGER DEFAULT 0, is_active INTEGER DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS enquiries (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, phone TEXT NOT NULL,
      email TEXT, juice_type TEXT NOT NULL, plan TEXT, message TEXT,
      status TEXT DEFAULT 'new', created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, rating INTEGER NOT NULL,
      juice_type TEXT, comment TEXT NOT NULL, is_approved INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS juice_images (
      id INTEGER PRIMARY KEY AUTOINCREMENT, juice_type TEXT UNIQUE NOT NULL,
      filename TEXT NOT NULL, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
  db._persist();

  if (!db.get('SELECT id FROM admin WHERE username = ?', ['admin'])) {
    const hash = crypto.createHash('sha256').update('NatureJuice@2024').digest('hex');
    db.run('INSERT INTO admin (username, password_hash) VALUES (?, ?)', ['admin', hash]);
  }

  const configs = [
    ['hero_headline','Pure Nature. Daily Freshness.'],
    ['hero_subheadline','Daily-pressed coconut milk & amla juice delivered to your door'],
    ['hero_tagline','100% Natural • No Preservatives • Farm to Glass'],
    ['contact_phone','+91 98765 43210'],
    ['contact_email','hello@naturejuice.in'],
    ['contact_address','Mumbai, Maharashtra'],
  ];
  configs.forEach(([k,v]) => { if (!db.get('SELECT key FROM site_config WHERE key=?',[k])) db.run('INSERT INTO site_config(key,value) VALUES(?,?)',[k,v]); });

  const bc = db.get('SELECT COUNT(*) as c FROM benefits');
  if (!bc || bc.c == 0) {
    [['coconut','🫀','Heart Health','Rich in lauric acid that supports cardiovascular wellness and healthy cholesterol levels.',1],
     ['coconut','⚡','Instant Energy','Medium-chain triglycerides provide rapid, clean energy without blood sugar spikes.',2],
     ['coconut','💧','Deep Hydration','Electrolyte-rich composition replenishes minerals lost through sweat naturally.',3],
     ['coconut','🛡️','Immunity Shield','Antimicrobial properties from lauric acid protect against viruses and bacteria.',4],
     ['amla','🌿','Vitamin C Powerhouse','20x more Vitamin C than oranges — strengthens immunity and fights infections.',1],
     ['amla','✨','Skin Radiance','Antioxidants flush free radicals, giving you natural glow from within.',2],
     ['amla','🧠','Memory Boost','Phytonutrients enhance brain function and improve memory retention.',3],
     ['amla','🔥','Metabolism Fire','Stimulates digestive enzymes and accelerates healthy weight management.',4],
    ].forEach(r => db.run('INSERT INTO benefits(juice_type,icon,title,description,sort_order) VALUES(?,?,?,?,?)',r));
  }

  const pc = db.get('SELECT COUNT(*) as c FROM plans');
  if (!pc || pc.c == 0) {
    [['coconut','Weekly Fresh',299,'7 days',JSON.stringify(['500ml daily','Morning delivery','Fresh pressed daily','WhatsApp updates']),0,1],
     ['coconut','Monthly Glow',999,'30 days',JSON.stringify(['500ml daily','Priority delivery','Fresh pressed daily','WhatsApp updates','Free health tips','5% discount']),1,1],
     ['coconut','Quarterly Wellness',2699,'90 days',JSON.stringify(['1L daily','Priority delivery','Fresh pressed daily','WhatsApp updates','Free health consultation','10% discount','Free bamboo straw kit']),0,1],
     ['amla','Weekly Shot',249,'7 days',JSON.stringify(['200ml daily','Morning delivery','Fresh pressed daily','WhatsApp updates']),0,1],
     ['amla','Monthly Boost',849,'30 days',JSON.stringify(['200ml daily','Priority delivery','Fresh pressed daily','WhatsApp updates','Free health tips','5% discount']),1,1],
     ['amla','Quarterly Vitality',2299,'90 days',JSON.stringify(['400ml daily','Priority delivery','Fresh pressed daily','WhatsApp updates','Free health consultation','10% discount','Amla powder gift']),0,1],
    ].forEach(r => db.run('INSERT INTO plans(juice_type,name,price,duration,features,is_popular,is_active) VALUES(?,?,?,?,?,?,?)',r));
  }

  if (!db.get("SELECT id FROM juice_images WHERE juice_type='coconut'")) db.run("INSERT INTO juice_images(juice_type,filename) VALUES('coconut','coconut-milk.png')");
  if (!db.get("SELECT id FROM juice_images WHERE juice_type='amla'")) db.run("INSERT INTO juice_images(juice_type,filename) VALUES('amla','amla-juice.jpeg')");

  console.log('✅ Database ready');
  return db;
}

module.exports = initDB;

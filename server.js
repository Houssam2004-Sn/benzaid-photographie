const express = require('express');
const cors    = require('cors');
const dotenv  = require('dotenv');
const multer  = require('multer');
const path    = require('path');
const Database = require('better-sqlite3');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// ─── DATABASE ───
const db = new Database('benzaid.db');
console.log('✅ SQLite Connected!');

// ─── CREATE TABLES ───
db.exec(`
  CREATE TABLE IF NOT EXISTS photos (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    title      TEXT NOT NULL,
    category   TEXT,
    price      REAL,
    filename   TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS orders (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT,
    email       TEXT,
    photo_id    INTEGER,
    total       REAL,
    created_at  TEXT DEFAULT (datetime('now'))
  );
`);
console.log('✅ Tables OK!');

// ─── MULTER ───
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename:    (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// ─── ROUTES ───

// GET photos
app.get('/api/photos', (req, res) => {
  const photos = db.prepare('SELECT * FROM photos ORDER BY created_at DESC').all();
  res.json(photos);
});

// POST photo
app.post('/api/photos', upload.single('photo'), (req, res) => {
  const { title, category, price } = req.body;
  const filename = req.file ? req.file.filename : null;
  const stmt = db.prepare('INSERT INTO photos (title, category, price, filename) VALUES (?, ?, ?, ?)');
  const result = stmt.run(title, category, price, filename);
  res.json({ message: '✅ Photo ajoutée!', id: result.lastInsertRowid });
});

// DELETE photo
app.delete('/api/photos/:id', (req, res) => {
  db.prepare('DELETE FROM photos WHERE id = ?').run(req.params.id);
  res.json({ message: '✅ Photo supprimée!' });
});

// POST order
app.post('/api/orders', (req, res) => {
  const { name, email, photo_id, total } = req.body;
  const stmt = db.prepare('INSERT INTO orders (name, email, photo_id, total) VALUES (?, ?, ?, ?)');
  const result = stmt.run(name, email, photo_id, total);
  res.json({ message: '✅ Commande reçue!', id: result.lastInsertRowid });
});

// GET orders
app.get('/api/orders', (req, res) => {
  const orders = db.prepare(`
    SELECT o.*, p.title as photo_title 
    FROM orders o 
    LEFT JOIN photos p ON o.photo_id = p.id 
    ORDER BY o.created_at DESC
  `).all();
  res.json(orders);
});

// ─── START ───
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server: http://localhost:${PORT}`);
});
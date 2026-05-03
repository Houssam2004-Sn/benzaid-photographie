const express = require('express');
const cors    = require('cors');
const dotenv  = require('dotenv');
const multer  = require('multer');
const path    = require('path');
const sqlite3 = require('sqlite3').verbose();

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

// ─── DATABASE ───
const db = new sqlite3.Database('./benzaid.db', (err) => {
  if (err) console.error(err.message);
  else console.log('✅ SQLite Connected!');
});

db.run(`CREATE TABLE IF NOT EXISTS photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  category TEXT,
  price REAL,
  filename TEXT,
  created_at TEXT DEFAULT (datetime('now'))
)`);

db.run(`CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT,
  email TEXT,
  photo_id INTEGER,
  total REAL,
  created_at TEXT DEFAULT (datetime('now'))
)`);

// ─── MULTER ───
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename:    (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});
const upload = multer({ storage });

// ─── ROUTES ───

app.get('/api/photos', (req, res) => {
  db.all('SELECT * FROM photos ORDER BY created_at DESC', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post('/api/photos', upload.single('photo'), (req, res) => {
  const { title, category, price } = req.body;
  const filename = req.file ? req.file.filename : null;
  db.run(
    'INSERT INTO photos (title, category, price, filename) VALUES (?, ?, ?, ?)',
    [title, category, price, filename],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: '✅ Photo ajoutée!', id: this.lastID });
    }
  );
});

app.delete('/api/photos/:id', (req, res) => {
  db.run('DELETE FROM photos WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: '✅ Photo supprimée!' });
  });
});

app.post('/api/orders', (req, res) => {
  const { name, email, photo_id, total } = req.body;
  db.run(
    'INSERT INTO orders (name, email, photo_id, total) VALUES (?, ?, ?, ?)',
    [name, email, photo_id, total],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: '✅ Commande reçue!', id: this.lastID });
    }
  );
});

app.get('/api/orders', (req, res) => {
  db.all(
    `SELECT o.*, p.title as photo_title 
     FROM orders o 
     LEFT JOIN photos p ON o.photo_id = p.id 
     ORDER BY o.created_at DESC`,
    [], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    }
  );
});

// ─── START ───
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server: http://localhost:${PORT}`);
});
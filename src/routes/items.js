const express = require('express');
const router = express.Router();
const { getDB } = require('../db/init');

// GET /api/items - list all items
router.get('/', (req, res) => {
  const db = getDB();
  const { status, category, q } = req.query;

  let query = 'SELECT * FROM items WHERE 1=1';
  const params = [];

  if (status) { query += ' AND status = ?'; params.push(status); }
  if (category && category !== 'all') { query += ' AND category = ?'; params.push(category); }
  if (q) {
    query += ' AND (title LIKE ? OR summary LIKE ? OR url LIKE ?)';
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }

  query += ' ORDER BY created_at DESC';
  const items = db.prepare(query).all(...params);

  // Parse tags JSON
  const parsed = items.map(item => ({
    ...item,
    tags: JSON.parse(item.tags || '[]'),
  }));

  res.json(parsed);
});

// GET /api/items/stats
router.get('/stats', (req, res) => {
  const db = getDB();
  const total = db.prepare('SELECT COUNT(*) as count FROM items').get().count;
  const unread = db.prepare("SELECT COUNT(*) as count FROM items WHERE status = 'unread'").get().count;
  const byCategory = db.prepare('SELECT category, COUNT(*) as count FROM items GROUP BY category').all();
  res.json({ total, unread, byCategory });
});

// GET /api/items/:id
router.get('/:id', (req, res) => {
  const db = getDB();
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json({ ...item, tags: JSON.parse(item.tags || '[]') });
});

// PATCH /api/items/:id
router.patch('/:id', (req, res) => {
  const db = getDB();
  const { status, remind_at } = req.body;
  const fields = [];
  const params = [];

  if (status) { fields.push('status = ?'); params.push(status); }
  if (remind_at !== undefined) {
    fields.push('remind_at = ?', 'reminded = 0');
    params.push(remind_at);
  }

  if (fields.length === 0) return res.status(400).json({ error: 'No fields to update' });

  params.push(req.params.id);
  db.prepare(`UPDATE items SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
  res.json({ ...item, tags: JSON.parse(item.tags || '[]') });
});

// DELETE /api/items/:id
router.delete('/:id', (req, res) => {
  const db = getDB();
  db.prepare('DELETE FROM items WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;

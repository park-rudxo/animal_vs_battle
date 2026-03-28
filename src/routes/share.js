const express = require('express');
const router = express.Router();
const { getDB } = require('../db/init');
const { analyzeContent } = require('../services/ai');

// POST /api/share - save a new URL for later
router.post('/', async (req, res) => {
  const { url, title } = req.body;

  if (!url) return res.status(400).json({ error: 'URL is required' });

  // Validate URL
  try { new URL(url); } catch {
    return res.status(400).json({ error: 'Invalid URL' });
  }

  const db = getDB();

  // Check duplicate
  const existing = db.prepare('SELECT id FROM items WHERE url = ?').get(url);
  if (existing) {
    return res.status(409).json({ error: 'Already saved', id: existing.id });
  }

  // Save immediately with pending status
  const result = db.prepare(
    'INSERT INTO items (url, title, status) VALUES (?, ?, ?)'
  ).run(url, title || url, 'processing');

  const itemId = result.lastInsertRowid;
  res.json({ id: itemId, status: 'processing', message: 'AI가 분석 중이에요...' });

  // Process with AI in background
  setImmediate(async () => {
    try {
      const analysis = await analyzeContent(url, title);
      const remindAt = new Date(Date.now() + analysis.remind_hours * 60 * 60 * 1000).toISOString();

      db.prepare(`
        UPDATE items SET
          title = ?,
          summary = ?,
          category = ?,
          tags = ?,
          reading_time_min = ?,
          remind_at = ?,
          status = 'unread',
          processed_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(
        analysis.title,
        analysis.summary,
        analysis.category,
        JSON.stringify(analysis.tags || []),
        analysis.reading_time_min,
        remindAt,
        itemId
      );

      console.log(`[AI] Processed item ${itemId}: ${analysis.title}`);
    } catch (err) {
      console.error(`[AI] Failed to process item ${itemId}:`, err.message);
      db.prepare("UPDATE items SET status = 'unread' WHERE id = ?").run(itemId);
    }
  });
});

// GET /api/share/status/:id - poll processing status
router.get('/status/:id', (req, res) => {
  const db = getDB();
  const item = db.prepare('SELECT * FROM items WHERE id = ?').get(req.params.id);
  if (!item) return res.status(404).json({ error: 'Not found' });
  res.json({ ...item, tags: JSON.parse(item.tags || '[]') });
});

module.exports = router;

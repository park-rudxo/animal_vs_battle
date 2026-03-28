require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDB } = require('./src/db/init');
const itemsRouter = require('./src/routes/items');
const shareRouter = require('./src/routes/share');
const notifyRouter = require('./src/routes/notify');
const { startReminderScheduler } = require('./src/services/scheduler');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/items', itemsRouter);
app.use('/api/share', shareRouter);
app.use('/api/notify', notifyRouter);

// PWA share target endpoint (GET from Web Share Target API)
app.get('/share', (req, res) => {
  const { url, title, text } = req.query;
  // Redirect to frontend with pre-filled share data
  const params = new URLSearchParams({ url: url || '', title: title || '', text: text || '' });
  res.redirect(`/?share=1&${params.toString()}`);
});

// PWA share target endpoint (POST from Web Share Target API)
app.post('/share', express.urlencoded({ extended: true }), (req, res) => {
  const { url, title, text } = req.body;
  const params = new URLSearchParams({ url: url || '', title: title || '', text: text || '' });
  res.redirect(`/?share=1&${params.toString()}`);
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

async function main() {
  await initDB();
  startReminderScheduler();
  app.listen(PORT, () => {
    console.log(`LaterAI server running on http://localhost:${PORT}`);
  });
}

main().catch(console.error);

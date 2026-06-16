const http = require('http');
const fs = require('fs');
const path = require('path');
const storage = require('./storage');

// Load .env
try {
  fs.readFileSync(path.join(__dirname, '.env'), 'utf8')
    .split('\n')
    .forEach(line => {
      const [k, ...v] = line.split('=');
      if (k && v.length) process.env[k.trim()] = v.join('=').trim();
    });
} catch {}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css',
  '.js': 'application/javascript',
};

function serveFile(res, filePath, status = 200) {
  const ext = path.extname(filePath) || '.html';
  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500);
      res.end('Erro interno');
    } else {
      res.writeHead(status, { 'Content-Type': MIME[ext] || 'text/plain' });
      res.end(content);
    }
  });
}

const routes = {
  '/': 'index.html',
  '/config': 'config.html',
  '/notepad': 'notepad.html',
};

async function handler(req, res) {
  const { url, method } = req;

  const staticPath = path.join(__dirname, 'public', url);
  if (url.startsWith('/css/') || url.startsWith('/js/')) {
    serveFile(res, staticPath);
    return;
  }

  if (url === '/api/config' && method === 'GET') {
    const userKey = storage.getItem('groq-api-key');
    const groqApiKey = userKey || process.env.GROQ_API_KEY || '';
    const groqSource = userKey ? 'user' : 'env';
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ groqApiKey, groqSource }));
    return;
  }

  if (url === '/api/config' && method === 'POST') {
    let raw = '';
    req.on('data', (c) => (raw += c));
    await new Promise((resolve) => req.on('end', resolve));
    try {
      const { groqApiKey } = JSON.parse(raw);
      if (groqApiKey) {
        storage.setItem('groq-api-key', groqApiKey);
      } else {
        storage.removeItem('groq-api-key');
      }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true }));
    } catch {
      res.writeHead(400);
      res.end(JSON.stringify({ ok: false }));
    }
    return;
  }


  if (url === '/api/layout' && method === 'GET') {
    const layout = storage.getItem('dashboard-layout');
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(layout ?? { columns: 2, order: [], sizes: {} }));
    return;
  }

  if (url === '/api/layout' && method === 'POST') {
    let raw = '';
    req.on('data', (c) => (raw += c));
    await new Promise((resolve) => req.on('end', resolve));
    try { storage.setItem('dashboard-layout', JSON.parse(raw)); } catch {}
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // Notes API
  if (url === '/api/notes' && method === 'GET') {
    const notes = storage.getItem('notes') || [];
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(notes));
    return;
  }

  if (url === '/api/notes' && method === 'POST') {
    let raw = '';
    req.on('data', (c) => (raw += c));
    await new Promise((resolve) => req.on('end', resolve));
    try {
      const { title, content } = JSON.parse(raw);
      const notes = storage.getItem('notes') || [];
      const note = { id: Date.now().toString(), title: title || '', content: content || '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      notes.unshift(note);
      storage.setItem('notes', notes);
      res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(note));
    } catch {
      res.writeHead(400);
      res.end(JSON.stringify({ ok: false }));
    }
    return;
  }

  const noteMatch = url.match(/^\/api\/notes\/([^/]+)$/);
  if (noteMatch) {
    const id = noteMatch[1];

    if (method === 'PUT') {
      let raw = '';
      req.on('data', (c) => (raw += c));
      await new Promise((resolve) => req.on('end', resolve));
      try {
        const { title, content } = JSON.parse(raw);
        const notes = storage.getItem('notes') || [];
        const idx = notes.findIndex((n) => n.id === id);
        if (idx === -1) { res.writeHead(404); res.end('{}'); return; }
        notes[idx] = { ...notes[idx], title: title ?? notes[idx].title, content: content ?? notes[idx].content, updatedAt: new Date().toISOString() };
        storage.setItem('notes', notes);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(notes[idx]));
      } catch {
        res.writeHead(400);
        res.end(JSON.stringify({ ok: false }));
      }
      return;
    }

    if (method === 'DELETE') {
      const notes = (storage.getItem('notes') || []).filter((n) => n.id !== id);
      storage.setItem('notes', notes);
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }
  }

  const file = routes[url];
  if (file) {
    serveFile(res, path.join(__dirname, 'views', file));
  } else {
    serveFile(res, path.join(__dirname, 'views', '404.html'), 404);
  }
}

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  http.createServer(handler).listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });
}

module.exports = handler;

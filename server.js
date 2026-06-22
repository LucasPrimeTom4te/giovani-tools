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
  '/comex': 'comex.html',
};

async function handler(req, res) {
  const { url, method } = req;

  const staticPath = path.join(__dirname, 'public', url);
  if (url.startsWith('/css/') || url.startsWith('/js/')) {
    serveFile(res, staticPath);
    return;
  }

  if (url === '/api/config' && method === 'GET') {
    const userKey = await storage.getItem('groq-api-key');
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
        await storage.setItem('groq-api-key', groqApiKey);
      } else {
        await storage.removeItem('groq-api-key');
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
    const layout = await storage.getItem('dashboard-layout');
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(layout ?? { columns: 2, order: [], sizes: {} }));
    return;
  }

  if (url === '/api/layout' && method === 'POST') {
    let raw = '';
    req.on('data', (c) => (raw += c));
    await new Promise((resolve) => req.on('end', resolve));
    try { await storage.setItem('dashboard-layout', JSON.parse(raw)); } catch {}
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // Notes API
  if (url === '/api/notes' && method === 'GET') {
    const notes = await storage.getItem('notes') || [];
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
      const notes = await storage.getItem('notes') || [];
      const note = { id: Date.now().toString(), title: title || '', content: content || '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      notes.unshift(note);
      await storage.setItem('notes', notes);
      res.writeHead(201, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(note));
    } catch {
      res.writeHead(400);
      res.end(JSON.stringify({ ok: false }));
    }
    return;
  }

  if (url === '/api/comex' && method === 'POST') {
    let raw = '';
    req.on('data', (c) => (raw += c));
    await new Promise((resolve) => req.on('end', resolve));
    try {
      const { fileBase64, mediaType, history, question } = JSON.parse(raw);
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ error: 'ANTHROPIC_API_KEY não configurada.' }));
        return;
      }
      const Anthropic = require('@anthropic-ai/sdk');
      const client = new Anthropic.default({ apiKey });

      const isPdf = mediaType === 'application/pdf';
      const docBlock = isPdf
        ? { type: 'document', source: { type: 'base64', media_type: mediaType, data: fileBase64 } }
        : { type: 'image', source: { type: 'base64', media_type: mediaType, data: fileBase64 } };

      let messages = [];
      if (!history || history.length === 0) {
        messages = [{ role: 'user', content: [docBlock, { type: 'text', text: question }] }];
      } else {
        messages.push({ role: 'user', content: [docBlock, { type: 'text', text: history[0].text }] });
        for (let i = 1; i < history.length; i++) {
          messages.push({ role: history[i].role, content: history[i].text });
        }
        messages.push({ role: 'user', content: question });
      }

      const system = 'Você é um especialista em documentos de comércio exterior (COMEX). Analise o documento enviado e responda as perguntas do usuário com precisão, extraindo as informações diretamente do documento. Responda sempre em português. Seja direto e objetivo.';
      const response = await client.messages.create({ model: 'claude-sonnet-4-6', max_tokens: 2048, system, messages });
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ answer: response.content[0].text }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: err.message || 'Erro ao processar documento.' }));
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
        const notes = await storage.getItem('notes') || [];
        const idx = notes.findIndex((n) => n.id === id);
        if (idx === -1) { res.writeHead(404); res.end('{}'); return; }
        notes[idx] = { ...notes[idx], title: title ?? notes[idx].title, content: content ?? notes[idx].content, updatedAt: new Date().toISOString() };
        await storage.setItem('notes', notes);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify(notes[idx]));
      } catch {
        res.writeHead(400);
        res.end(JSON.stringify({ ok: false }));
      }
      return;
    }

    if (method === 'DELETE') {
      const notes = (await storage.getItem('notes') || []).filter((n) => n.id !== id);
      await storage.setItem('notes', notes);
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

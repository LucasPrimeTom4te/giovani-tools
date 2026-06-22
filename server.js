const http = require('http');
const fs = require('fs');
const path = require('path');
const storage = require('./storage');
const auth = require('./auth');

// Load .env
try {
  fs.readFileSync(path.join(__dirname, '.env'), 'utf8')
    .split('\n')
    .forEach(line => {
      const [k, ...v] = line.split('=');
      if (k && v.length) {
        const val = v.join('=').trim().replace(/^["']|["']$/g, '');
        process.env[k.trim()] = val;
      }
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

function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function redirect(res, location) {
  res.writeHead(302, { Location: location });
  res.end();
}

async function readBody(req) {
  let raw = '';
  req.on('data', c => (raw += c));
  await new Promise(resolve => req.on('end', resolve));
  return JSON.parse(raw);
}

const routes = {
  '/': 'index.html',
  '/config': 'config.html',
  '/notepad': 'notepad.html',
  '/comex': 'comex.html',
  '/users': 'users.html',
  '/login': 'login.html',
};

// Paths that don't require authentication
const PUBLIC_PAGES = new Set(['/login']);
const PUBLIC_API = new Set(['/api/auth/login']);

async function handler(req, res) {
  const { url, method } = req;
  const urlPath = url.split('?')[0];

  // Static assets — no auth required
  if (urlPath.startsWith('/css/') || urlPath.startsWith('/js/')) {
    serveFile(res, path.join(__dirname, 'public', urlPath));
    return;
  }

  // Auth check for all non-public paths
  const isPublic = PUBLIC_PAGES.has(urlPath) || PUBLIC_API.has(urlPath);
  let session = null;
  if (!isPublic) {
    session = await auth.getSession(req);
    if (!session) {
      if (urlPath.startsWith('/api/')) {
        json(res, 401, { error: 'Não autenticado' });
      } else {
        redirect(res, '/login');
      }
      return;
    }
  }

  // ── Auth API ────────────────────────────────────────────────────────────

  if (urlPath === '/api/auth/login' && method === 'POST') {
    let body;
    try { body = await readBody(req); } catch { json(res, 400, { error: 'JSON inválido' }); return; }
    const { username, password } = body;
    const masterUser = process.env.MASTER_USER;
    const masterPass = process.env.MASTER_PASS;

    let sessionData = null;

    if (username === masterUser && auth.hashPassword(password) === auth.hashPassword(masterPass)) {
      sessionData = { username: masterUser, isMaster: true };
    } else {
      const users = await storage.getItem('auth-users') || [];
      const user = users.find(u => u.username === username && u.passwordHash === auth.hashPassword(password));
      if (user) sessionData = { id: user.id, username: user.username, isMaster: false };
    }

    if (!sessionData) {
      json(res, 401, { error: 'Usuário ou senha incorretos.' });
      return;
    }

    const token = await auth.createSession(sessionData);
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Set-Cookie': auth.sessionCookie(token),
    });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (urlPath === '/api/auth/logout' && method === 'POST') {
    await auth.destroySession(req);
    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8',
      'Set-Cookie': auth.clearCookie(),
    });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  if (urlPath === '/api/auth/me' && method === 'GET') {
    json(res, 200, { username: session.username, isMaster: session.isMaster });
    return;
  }

  // ── Users API (master only) ─────────────────────────────────────────────

  if (urlPath === '/api/users' && method === 'GET') {
    if (!session.isMaster) { json(res, 403, { error: 'Acesso negado' }); return; }
    const users = await storage.getItem('auth-users') || [];
    json(res, 200, users.map(({ passwordHash, ...u }) => u));
    return;
  }

  if (urlPath === '/api/users' && method === 'POST') {
    if (!session.isMaster) { json(res, 403, { error: 'Acesso negado' }); return; }
    let body;
    try { body = await readBody(req); } catch { json(res, 400, { error: 'JSON inválido' }); return; }
    const { username, password } = body;
    if (!username || !password) { json(res, 400, { error: 'Usuário e senha são obrigatórios.' }); return; }

    const users = await storage.getItem('auth-users') || [];
    if (users.find(u => u.username === username) || username === process.env.MASTER_USER) {
      json(res, 409, { error: 'Usuário já existe.' }); return;
    }
    const newUser = { id: Date.now().toString(), username, passwordHash: auth.hashPassword(password), createdAt: new Date().toISOString() };
    users.push(newUser);
    await storage.setItem('auth-users', users);
    const { passwordHash, ...safe } = newUser;
    json(res, 201, safe);
    return;
  }

  if (urlPath === '/api/comex' && method === 'POST') {
    let body;
    try { body = await readBody(req); } catch { json(res, 400, { error: 'JSON inválido' }); return; }
    const { fileBase64, mediaType, textContent, history, question } = body;
    const groqKey = await storage.getItem('groq-api-key') || process.env.GROQ_API_KEY;
    if (!groqKey) {
      json(res, 400, { error: 'Chave da API Groq não configurada. Acesse Configurações para adicionar.' });
      return;
    }
    try {
      const systemPrompt = 'Você é um especialista em documentos de comércio exterior (COMEX). Analise o documento enviado e responda as perguntas do usuário com precisão, extraindo as informações diretamente do documento. Responda sempre em português. Seja direto e objetivo.';
      let messages = [];
      if (textContent) {
        const docContext = `Documento COMEX:\n\n${textContent}`;
        if (!history || history.length === 0) {
          messages = [{ role: 'user', content: `${docContext}\n\nPergunta: ${question}` }];
        } else {
          messages.push({ role: 'user', content: `${docContext}\n\nPergunta: ${history[0].text}` });
          for (let i = 1; i < history.length; i++) messages.push({ role: history[i].role, content: history[i].text });
          messages.push({ role: 'user', content: question });
        }
      } else {
        const imageUrl = `data:${mediaType};base64,${fileBase64}`;
        if (!history || history.length === 0) {
          messages = [{ role: 'user', content: [{ type: 'image_url', image_url: { url: imageUrl } }, { type: 'text', text: question }] }];
        } else {
          messages.push({ role: 'user', content: [{ type: 'image_url', image_url: { url: imageUrl } }, { type: 'text', text: history[0].text }] });
          for (let i = 1; i < history.length; i++) messages.push({ role: history[i].role, content: history[i].text });
          messages.push({ role: 'user', content: question });
        }
      }
      const model = textContent ? 'llama-3.3-70b-versatile' : 'meta-llama/llama-4-scout-17b-16e-instruct';
      const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: [{ role: 'system', content: systemPrompt }, ...messages], max_tokens: 2048 }),
      });
      const groqData = await groqRes.json();
      if (!groqRes.ok) throw new Error(groqData.error?.message || 'Erro na API Groq.');
      json(res, 200, { answer: groqData.choices[0].message.content });
    } catch (err) {
      json(res, 500, { error: err.message || 'Erro ao processar documento.' });
    }
    return;
  }

  const userMatch = urlPath.match(/^\/api\/users\/([^/]+)$/);
  if (userMatch) {
    if (!session.isMaster) { json(res, 403, { error: 'Acesso negado' }); return; }
    const id = userMatch[1];

    if (method === 'PUT') {
      let body;
      try { body = await readBody(req); } catch { json(res, 400, { error: 'JSON inválido' }); return; }
      const { username, password } = body;
      const users = await storage.getItem('auth-users') || [];
      const idx = users.findIndex(u => u.id === id);
      if (idx === -1) { json(res, 404, { error: 'Usuário não encontrado.' }); return; }
      if (username && username !== users[idx].username) {
        if (users.find(u => u.username === username) || username === process.env.MASTER_USER) {
          json(res, 409, { error: 'Usuário já existe.' }); return;
        }
        users[idx].username = username;
      }
      if (password) users[idx].passwordHash = auth.hashPassword(password);
      await storage.setItem('auth-users', users);
      const { passwordHash, ...safe } = users[idx];
      json(res, 200, safe);
      return;
    }

    if (method === 'DELETE') {
      const users = (await storage.getItem('auth-users') || []).filter(u => u.id !== id);
      await storage.setItem('auth-users', users);
      json(res, 200, { ok: true });
      return;
    }
  }

  // /users page — master only
  if (urlPath === '/users') {
    if (!session.isMaster) { redirect(res, '/'); return; }
  }

  // ── Existing APIs (require auth — already checked above) ────────────────

  if (urlPath === '/api/config' && method === 'GET') {
    const userKey = await storage.getItem('groq-api-key');
    const groqApiKey = userKey || process.env.GROQ_API_KEY || '';
    const groqSource = userKey ? 'user' : 'env';
    json(res, 200, { groqApiKey, groqSource });
    return;
  }

  if (urlPath === '/api/config' && method === 'POST') {
    let body;
    try { body = await readBody(req); } catch { json(res, 400, { ok: false }); return; }
    const { groqApiKey } = body;
    if (groqApiKey) { await storage.setItem('groq-api-key', groqApiKey); }
    else { await storage.removeItem('groq-api-key'); }
    json(res, 200, { ok: true });
    return;
  }

  if (urlPath === '/api/layout' && method === 'GET') {
    const layout = await storage.getItem('dashboard-layout');
    json(res, 200, layout ?? { columns: 2, order: [], sizes: {} });
    return;
  }

  if (urlPath === '/api/layout' && method === 'POST') {
    let body;
    try { body = await readBody(req); } catch {}
    if (body) await storage.setItem('dashboard-layout', body);
    json(res, 200, { ok: true });
    return;
  }

  if (urlPath === '/api/notes' && method === 'GET') {
    const notes = await storage.getItem('notes') || [];
    json(res, 200, notes);
    return;
  }

  if (urlPath === '/api/notes' && method === 'POST') {
    let body;
    try { body = await readBody(req); } catch { json(res, 400, { ok: false }); return; }
    const { title, content } = body;
    const notes = await storage.getItem('notes') || [];
    const note = { id: Date.now().toString(), title: title || '', content: content || '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    notes.unshift(note);
    await storage.setItem('notes', notes);
    json(res, 201, note);
    return;
  }

  const noteMatch = urlPath.match(/^\/api\/notes\/([^/]+)$/);
  if (noteMatch) {
    const id = noteMatch[1];

    if (method === 'PUT') {
      let body;
      try { body = await readBody(req); } catch { json(res, 400, { ok: false }); return; }
      const { title, content } = body;
      const notes = await storage.getItem('notes') || [];
      const idx = notes.findIndex(n => n.id === id);
      if (idx === -1) { res.writeHead(404); res.end('{}'); return; }
      notes[idx] = { ...notes[idx], title: title ?? notes[idx].title, content: content ?? notes[idx].content, updatedAt: new Date().toISOString() };
      await storage.setItem('notes', notes);
      json(res, 200, notes[idx]);
      return;
    }

    if (method === 'DELETE') {
      const notes = (await storage.getItem('notes') || []).filter(n => n.id !== id);
      await storage.setItem('notes', notes);
      json(res, 200, { ok: true });
      return;
    }
  }

  // ── Page routes ─────────────────────────────────────────────────────────

  const file = routes[urlPath];
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

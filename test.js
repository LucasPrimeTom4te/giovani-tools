const assert = require('node:assert');
const http = require('node:http');

const PORT = 3099;
const BASE = `http://localhost:${PORT}`;

let total = 0;
let passed = 0;

function test(name, fn) {
  total++;
  try {
    fn();
    passed++;
    console.log(`  \u2713 ${name}`);
  } catch (e) {
    console.log(`  \u2717 ${name}`);
    console.log(`    ${e.message}`);
  }
}

async function get(url) {
  return new Promise((resolve, reject) => {
    http.get(`${BASE}${url}`, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ status: res.statusCode, body }));
    }).on('error', reject);
  });
}

async function post(url, data) {
  const body = new URLSearchParams(data).toString();
  return new Promise((resolve, reject) => {
    const req = http.request(`${BASE}${url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function postJSON(url, data) {
  const body = JSON.stringify(data);
  return new Promise((resolve, reject) => {
    const req = http.request(`${BASE}${url}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function del(url) {
  return new Promise((resolve, reject) => {
    const req = http.request(`${BASE}${url}`, { method: 'DELETE' }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.end();
  });
}

// ─── Storage unit tests ────────────────────────────────────
function testStorage() {
  const storage = require('./storage');

  storage.clear();

  test('getItem retorna null para chave inexistente', () => {
    assert.strictEqual(storage.getItem('nada'), null);
  });

  test('setItem e getItem funcionam', () => {
    storage.setItem('nome', 'Maria');
    assert.strictEqual(storage.getItem('nome'), 'Maria');
  });

  test('setItem sobrescreve valor', () => {
    storage.setItem('nome', 'João');
    assert.strictEqual(storage.getItem('nome'), 'João');
  });

  test('removeItem deleta chave', () => {
    storage.setItem('tmp', 'valor');
    storage.removeItem('tmp');
    assert.strictEqual(storage.getItem('tmp'), null);
  });

  test('getAll retorna todos os dados', () => {
    storage.setItem('a', 1);
    storage.setItem('b', 2);
    const all = storage.getAll();
    assert.strictEqual(all.a, 1);
    assert.strictEqual(all.b, 2);
  });

  test('clear remove todos os dados', () => {
    storage.setItem('x', 'y');
    storage.clear();
    assert.strictEqual(storage.getItem('x'), null);
    assert.deepStrictEqual(storage.getAll(), {});
  });
}

// ─── Server integration tests ──────────────────────────────
async function testServer() {
  const handler = require('./server');
  const server = http.createServer(handler).listen(PORT);

  try {
    // Pages
    for (const route of ['/', '/form', '/table', '/ncm', '/lpco']) {
      test(`GET ${route} retorna 200`, async () => {
        const res = await get(route);
        assert.strictEqual(res.status, 200);
      });
    }

    // Static CSS
    test('GET /css/style.css retorna 200', async () => {
      const res = await get('/css/style.css');
      assert.strictEqual(res.status, 200);
    });

    // 404
    test('GET /rota-inexistente retorna 404', async () => {
      const res = await get('/rota-inexistente');
      assert.strictEqual(res.status, 404);
    });

    // API GET vazio
    test('GET /api/data retorna array vazio', async () => {
      const res = await get('/api/data');
      assert.strictEqual(res.status, 200);
      const data = JSON.parse(res.body);
      assert.ok(Array.isArray(data));
    });

    // API POST
    test('POST /api/data retorna 302 (redirect)', async () => {
      const res = await post('/api/data', { nome: 'Teste', email: 't@t.com', idade: '25' });
      assert.strictEqual(res.status, 302);
    });

    // API GET após POST
    test('GET /api/data retorna registro salvo', async () => {
      const res = await get('/api/data');
      const data = JSON.parse(res.body);
      assert.strictEqual(data.length, 1);
      assert.strictEqual(data[0].nome, 'Teste');
      assert.strictEqual(data[0].email, 't@t.com');
      assert.strictEqual(data[0].idade, '25');
    });

    // API DELETE
    test('DELETE /api/data limpa registros', async () => {
      const res = await del('/api/data');
      assert.strictEqual(res.status, 200);
      assert.deepStrictEqual(JSON.parse(res.body), { ok: true });
    });

    // API GET após DELETE
    test('GET /api/data retorna array vazio após DELETE', async () => {
      const res = await get('/api/data');
      assert.strictEqual(res.status, 200);
      assert.deepStrictEqual(JSON.parse(res.body), []);
    });

    // Layout API
    test('GET /api/layout retorna layout padrão', async () => {
      const res = await get('/api/layout');
      assert.strictEqual(res.status, 200);
      const data = JSON.parse(res.body);
      assert.strictEqual(data.columns, 2);
      assert.ok(Array.isArray(data.order));
    });

    test('POST /api/layout salva e GET confirma', async () => {
      const payload = { columns: 3, order: ['form', 'table'], sizes: { form: 2 } };
      const p1 = await postJSON('/api/layout', payload);
      assert.strictEqual(p1.status, 200);
      assert.deepStrictEqual(JSON.parse(p1.body), { ok: true });

      const p2 = await get('/api/layout');
      const data = JSON.parse(p2.body);
      assert.strictEqual(data.columns, 3);
      assert.deepStrictEqual(data.order, ['form', 'table']);
      assert.strictEqual(data.sizes.form, 2);
    });
  } finally {
    server.close();
    require('./storage').clear();
  }
}

// ─── Run ────────────────────────────────────────────────────
(async () => {
  console.log('\n  Storage');
  testStorage();

  console.log('\n  Server');
  await testServer();

  console.log(`\n  ${passed}/${total} testes passaram\n`);
  process.exit(passed === total ? 0 : 1);
})();

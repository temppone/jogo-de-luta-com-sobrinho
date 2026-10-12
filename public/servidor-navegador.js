// Hospedagem estática (Vercel): não existe server.js rodando, então ele roda aqui no navegador.
// O build copia server.js para public/; se ele existir, interceptamos fetch e EventSource
// e entregamos as requisições ao handler do servidor, sem rede. Rodando com node server.js,
// public/server.js não existe e nada muda.
(() => {
  const fetchReal = window.fetch.bind(window), EventSourceReal = window.EventSource;
  let handler = null;
  const pronto = fetchReal('/server.js').then(r => r.ok ? r.text() : null).then(codigo => {
    if (!codigo) return;
    const CHAVE = 'perfis.json';
    const fs = {
      readFileSync() { const s = localStorage.getItem(CHAVE); if (s == null) throw new Error('sem perfis'); return s; },
      writeFileSync(_, dados) { try { localStorage.setItem(CHAVE, dados); } catch {} },
      renameSync() {},
      readFile(_, cb) { cb(new Error('estático')); },
    };
    const mods = {
      fs,
      path: { join: (...p) => p.join('/'), sep: '/', extname: s => (s.match(/\.[^./]*$/) || [''])[0] },
      os: { networkInterfaces: () => ({}) },
      http: { createServer: h => { handler = h; return { listen() {} }; } },
    };
    new Function('require', 'process', '__dirname', codigo)(n => mods[n], { env: {}, pid: 0 }, '');
  }).catch(e => console.warn('servidor no navegador falhou', e));

  // chama o handler com req/res falsos; resolve quando res.end()
  function chama(method, url, corpo, aoEscrever) {
    return new Promise(resolve => {
      const ouvintes = {};
      const req = { method, url, headers: {}, on(ev, cb) { (ouvintes[ev] = ouvintes[ev] || []).push(cb); return req; } };
      const res = { writeHead() { return res; }, setHeader() {}, write: d => aoEscrever && aoEscrever(String(d)), end: d => resolve(d == null ? '' : String(d)) };
      handler(req, res);
      setTimeout(() => {
        if (corpo != null) (ouvintes.data || []).forEach(cb => cb(String(corpo)));
        (ouvintes.end || []).forEach(cb => cb());
      });
      return req;
    });
  }

  window.fetch = async (url, opts = {}) => {
    await pronto;
    const u = typeof url === 'string' ? url : url.url;
    const method = (opts.method || 'GET').toUpperCase();
    if (!handler || method !== 'POST' || !u.startsWith('/')) return fetchReal(url, opts);
    const txt = await chama(method, u, opts.body);
    return new Response(txt, { status: 200 });
  };

  window.EventSource = function (url) {
    const es = { onmessage: null, onerror: null, onopen: null, readyState: 0, close() { es.readyState = 2; } };
    pronto.then(() => {
      if (!handler) {
        const real = new EventSourceReal(url);
        for (const k of ['onmessage', 'onerror', 'onopen']) real[k] = e => es[k] && es[k](e);
        es.close = () => real.close();
        return;
      }
      es.readyState = 1;
      chama('GET', url, null, txt => {
        if (es.readyState === 2) return;
        for (const bloco of txt.split('\n\n')) {
          const data = bloco.split('\n').filter(l => l.startsWith('data: ')).map(l => l.slice(6)).join('\n');
          if (data && es.onmessage) es.onmessage({ data });
        }
      });
    });
    return es;
  };
})();

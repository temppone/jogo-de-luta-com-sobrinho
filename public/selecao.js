// Tela de seleção estilo Mortal Kombat: grade de retratos, cursor, lutadores animados nas laterais.
// Usa pose()/poseBlocos()/aproxima()/lerp de jogo.js e "dirige" os botões originais (#persEscolha, data-p, #local).
(() => {
  const esc = document.querySelector('#escolha');
  if (!esc) return;
  const PERS = [
    { v: 'palito', nome: 'PALITO', sub: 'ágil e elástico' },
    { v: 'blocos', nome: 'BLOCOS', sub: 'duro feito pedra' },
    { v: '?', nome: 'ALEATÓRIO', sub: 'deixa a sorte escolher' },
  ];
  const COR = ['#ef4444', '#3b82f6'];
  const css = document.createElement('style');
  css.textContent = `
#escolha.mk{background:#05010a;justify-content:flex-end;gap:8px;padding:12px 12px 14px}
#escolha.mk>*:not(#selFundo):not(#selNome):not(#selGuiaBt){position:relative;z-index:1}
#escolha.mk>h1,#escolha.mk #persEscolha,#escolha.mk #selPalco,#escolha.mk .selOculto{display:none}
#escolha.mk .guia{display:none;position:fixed;z-index:5;left:50%;top:50%;transform:translate(-50%,-50%);max-height:90%;overflow:auto;background:#000e}
#escolha.mk.verGuia .guia{display:block}
#selFundo{position:fixed;inset:0;width:100%;height:100%;z-index:0}
#selNome{position:fixed;top:10px;left:0;right:0;text-align:center;z-index:1;font:900 clamp(30px,8vw,72px)/1 Audiowide,Audiowide,Impact,system-ui;letter-spacing:4px;color:#fde047;text-shadow:0 0 18px #f97316,0 4px 0 #7c2d12,0 0 40px #000;pointer-events:none}
#selNome small{display:block;font:700 14px system-ui;letter-spacing:2px;color:#fed7aa;text-shadow:0 2px 4px #000;margin-top:4px}
#selGrade{display:flex;gap:8px;justify-content:center}
#selGrade .ret{width:clamp(64px,14vw,96px);height:clamp(64px,14vw,96px);border:3px solid #78350f;border-radius:6px;background:linear-gradient(#3b0f28,#0b0410);padding:0;position:relative;cursor:pointer;box-shadow:inset 0 0 18px #000}
#selGrade .ret canvas{position:absolute;inset:0;width:100%;height:100%}
#selGrade .ret span{position:absolute;bottom:2px;left:0;right:0;font:800 10px system-ui;color:#fde68a;text-shadow:0 1px 2px #000}
#selGrade .ret.cur{border-color:#facc15;box-shadow:0 0 0 2px #000,0 0 22px #facc15,inset 0 0 18px #000;animation:selPulsa .8s infinite alternate}
@keyframes selPulsa{to{box-shadow:0 0 0 2px #000,0 0 34px #f97316,inset 0 0 18px #000}}
#escolha.mk .bt[data-p]{transition:transform .15s}
#escolha.mk .bt[data-p].alvo{outline:4px solid #facc15;transform:scale(1.08)}
#selDica{font:600 12px system-ui;opacity:.75;text-align:center;text-shadow:0 1px 3px #000}
#selGuiaBt{position:fixed;top:10px;right:10px;z-index:6;font:700 13px system-ui;background:#0008;color:#fff;border:2px solid #fff4;border-radius:999px;padding:6px 12px}`;
  document.head.appendChild(css);
  esc.classList.add('mk');
  esc.querySelectorAll(':scope>p').forEach(p => { if (/Quem é você|Personagem:/.test(p.textContent)) p.classList.add('selOculto'); });
  const fundo = document.createElement('canvas'); fundo.id = 'selFundo'; esc.prepend(fundo);
  const nomeEl = document.createElement('div'); nomeEl.id = 'selNome'; esc.appendChild(nomeEl);
  const grade = document.createElement('div'); grade.id = 'selGrade';
  const timesEl = esc.querySelector('.bt[data-p]').parentElement;
  esc.insertBefore(grade, timesEl);
  const dica = document.createElement('div'); dica.id = 'selDica';
  dica.textContent = '◀ ▶ escolhe · ▲ ▼ lado · Enter / A confirma';
  timesEl.after(dica);
  const guiaBt = document.createElement('button'); guiaBt.id = 'selGuiaBt'; guiaBt.textContent = '📜 Golpes';
  guiaBt.onclick = () => esc.classList.toggle('verGuia'); esc.appendChild(guiaBt);
  esc.querySelector('.guia').addEventListener('click', () => esc.classList.remove('verGuia'));

  let cursor = Math.max(0, PERS.findIndex(p => p.v === (sessionStorage.getItem('visual') || 'palito')));
  let lado = 0, confirmado = -1, tConf = 0, troca = 0;
  const lut = [0, 1].map(() => ({ a: { fase: 0, vx: 0, vy: 0, cur: null, squash: 0, cabeca: 0 }, golpe: null, tg: 0 }));
  const rets = PERS.map((p, i) => {
    const b = document.createElement('button'); b.className = 'ret';
    const c = document.createElement('canvas'); b.appendChild(c);
    const s = document.createElement('span'); s.textContent = p.nome; b.appendChild(s);
    b.onclick = () => (i === cursor ? confirma(lado) : move(i - cursor));
    grade.appendChild(b); return { b, c, a: { fase: 0, vx: 0, vy: 0, cur: null, squash: 0, cabeca: 0 } };
  });
  const visualDe = i => PERS[i].v === '?' ? null : PERS[i].v;
  function aplica() {
    rets.forEach((r, i) => r.b.classList.toggle('cur', i === cursor));
    esc.querySelectorAll('.bt[data-p]').forEach(b => b.classList.toggle('alvo', +b.dataset.p === lado));
    nomeEl.innerHTML = PERS[cursor].nome + '<small>' + PERS[cursor].sub + '</small>';
    const v = visualDe(cursor);
    if (v) { const b = esc.querySelector('#persEscolha .bt[data-v="' + v + '"]'); if (b) b.click(); }
  }
  const GOLPES = ['socoAlto', 'chuteAlto', 'magia', 'gancho', 'giro'];
  function move(d) {
    if (confirmado >= 0 || !d) return;
    cursor = (cursor + d + PERS.length) % PERS.length; troca = 1;
    lut.forEach((l, i) => { l.golpe = GOLPES[(cursor * 2 + i) % GOLPES.length]; l.tg = 0; });
    aplica();
  }
  function confirma(p, botaoLocal) {
    if (confirmado >= 0) return;
    if (PERS[cursor].v === '?') { cursor = Math.floor(Math.random() * (PERS.length - 1)); aplica(); }
    confirmado = p; tConf = 0;
    setTimeout(() => {
      liberado = true;
      (botaoLocal ? esc.querySelector('#local') : esc.querySelector('.bt[data-p="' + p + '"]')).click();
      liberado = false; confirmado = -1;
    }, 900);
  }
  // intercepta os botões originais pra tocar a animação de "pronto" antes de entrar
  let liberado = false;
  esc.querySelectorAll('.bt[data-p]').forEach(b => b.addEventListener('click', e => {
    if (liberado) return; e.stopImmediatePropagation(); lado = +b.dataset.p; aplica(); confirma(lado);
  }, true));
  const loc = esc.querySelector('#local');
  if (loc) loc.addEventListener('click', e => { if (liberado) return; e.stopImmediatePropagation(); confirma(0, true); }, true);

  const ativa = () => !esc.classList.contains('hide') && !esc.classList.contains('verGuia');
  addEventListener('keydown', e => {
    if (esc.classList.contains('verGuia') && e.key === 'Escape') return esc.classList.remove('verGuia');
    if (!ativa() || e.repeat) return;
    const k = e.key.toLowerCase();
    if (k === 'arrowleft' || k === 'a') move(-1);
    else if (k === 'arrowright' || k === 'd') move(1);
    else if (k === 'arrowup' || k === 'arrowdown' || k === 'w' || k === 's') { lado = 1 - lado; aplica(); }
    else if (k === 'enter' || k === ' ' || k === 'j' || k === 'u') { e.preventDefault(); confirma(lado); }
  });
  // controle: lê direto (jogo.js só troca a entrada pra "controle" nessa tela)
  let gpAnt = {};
  function lePad() {
    const pads = navigator.getGamepads ? [...navigator.getGamepads()].filter(Boolean) : [];
    const ag = {};
    for (const g of pads) {
      const bt = i => g.buttons[i] && g.buttons[i].pressed, ax = g.axes[0] || 0, ay = g.axes[1] || 0;
      if (bt(14) || ax < -0.6) ag.esq = 1; if (bt(15) || ax > 0.6) ag.dir = 1;
      if (bt(12) || bt(13) || Math.abs(ay) > 0.6) ag.lado = 1;
      if (bt(0) || bt(9)) ag.ok = 1; if (bt(1)) ag.volta = 1;
    }
    if (ativa()) {
      const b = k => ag[k] && !gpAnt[k];
      if (b('esq')) move(-1); if (b('dir')) move(1);
      if (b('lado')) { lado = 1 - lado; aplica(); }
      if (b('ok')) confirma(lado);
    }
    gpAnt = ag;
  }

  // desenho do boneco (mesma geometria do boneco() de jogo.js, mas em qualquer canvas)
  const R = g => g * Math.PI / 180;
  function desenhaLutador(c, a, f, visual, cor, x, chao, s, d, tempo, dt, extra) {
    const blocos = visual === 'blocos';
    const alvo = blocos ? poseBlocos(f, a, tempo) : pose(f, a, tempo);
    if (extra) extra(alvo);
    aproxima(a, alvo, dt, f.dur > 0);
    const p = a.cur;
    const vai = (o, ang, len) => [o[0] + Math.sin(R(ang)) * len * s * d * p.giro, o[1] + Math.cos(R(ang)) * len * s];
    c.save();
    c.lineWidth = (blocos ? 15 : 9) * s; c.lineCap = blocos ? 'butt' : 'round'; c.lineJoin = blocos ? 'miter' : 'round';
    c.strokeStyle = cor; c.fillStyle = cor; c.shadowColor = cor; c.shadowBlur = 14 * s;
    const quadril = [x, chao - (62 - p.baixa) * s], ombro = vai(quadril, 180 + p.tronco, 58);
    const curva = (p0, p1, p2) => { c.beginPath(); c.moveTo(...p0); c.quadraticCurveTo(...p1, ...p2); c.stroke(); };
    for (const k of [1, 0]) {
      c.globalAlpha = k ? 0.65 : 1;
      const jo = vai(quadril, p.perna[k], 32), pe = vai(jo, p.perna[k] + p.joelho[k], 32);
      curva(quadril, jo, pe);
      const co = vai(ombro, p.bracoT[k], 30), mao = vai(co, p.bracoT[k] + p.cotovelo[k], 32);
      curva(ombro, co, mao); c.beginPath(); c.arc(...mao, 7 * s, 0, 7); c.fill();
    }
    c.globalAlpha = 1;
    const meio = vai(quadril, 180 + p.tronco * 0.5, 29);
    curva(quadril, [meio[0] - 3 * s * d, meio[1]], ombro);
    a.cabeca += (p.tronco - a.cabeca) * (1 - Math.exp(-dt / 110));
    const cab = vai(ombro, 180 + a.cabeca, 24);
    if (blocos) c.fillRect(cab[0] - 16 * s, cab[1] - 16 * s, 32 * s, 32 * s);
    else { c.beginPath(); c.arc(...cab, 19 * s, 0, 7); c.fill(); }
    c.shadowBlur = 0; c.fillStyle = '#fff';
    const pisca = tempo % 3200 < 120;
    c.beginPath(); c.ellipse(cab[0] + 8 * s * d, cab[1] - 3 * s, 4 * s, pisca ? 0.8 * s : 4 * s, 0, 0, 7); c.fill();
    c.restore();
  }
  const vitoria = (t, i) => p => { // braços pra cima, pulinho
    const w = Math.sin(t / 90);
    p.bracoT = [165 + w * 10, i ? 150 - w * 10 : 195 - w * 10]; p.cotovelo = [10, -10];
    p.tronco = -8; p.perna = [14, -14]; p.joelho = [-6, -6]; p.baixa = Math.max(0, 6 - Math.abs(w) * 10);
  };

  // fundo dramático: céu vermelho, lua, fogo subindo, chão com reflexo
  let brasas = [];
  function cena(c, w, h, t) {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#0a0006'); g.addColorStop(0.55, '#4a0812'); g.addColorStop(0.75, '#9a1b0b'); g.addColorStop(1, '#120204');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    const lx = w / 2, ly = h * 0.36, lr = Math.min(w, h) * 0.22;
    const lg = c.createRadialGradient(lx, ly, lr * 0.2, lx, ly, lr * 2.2);
    lg.addColorStop(0, '#fca5a5aa'); lg.addColorStop(0.35, '#dc262655'); lg.addColorStop(1, '#0000');
    c.fillStyle = lg; c.fillRect(0, 0, w, h);
    c.fillStyle = '#fecaca'; c.globalAlpha = 0.85; c.beginPath(); c.arc(lx, ly, lr, 0, 7); c.fill(); c.globalAlpha = 1;
    // silhuetas de montanhas
    c.fillStyle = '#16020a'; c.beginPath(); c.moveTo(0, h * 0.72);
    for (let x = 0; x <= w; x += w / 12) c.lineTo(x, h * (0.6 + 0.08 * Math.sin(x * 0.013 + 1) + 0.04 * Math.sin(x * 0.05)));
    c.lineTo(w, h); c.lineTo(0, h); c.fill();
    const chao = c.createLinearGradient(0, h * 0.78, 0, h);
    chao.addColorStop(0, '#2b0508'); chao.addColorStop(1, '#000');
    c.fillStyle = chao; c.fillRect(0, h * 0.78, w, h * 0.22);
    // brasas
    if (brasas.length < 70) brasas.push({ x: Math.random() * w, y: h + 5, v: 0.4 + Math.random() * 1.2, r: 1 + Math.random() * 2.5, f: Math.random() * 6 });
    c.fillStyle = '#fb923c';
    brasas = brasas.filter(b => { b.y -= b.v * 1.6; b.x += Math.sin(t / 500 + b.f) * 0.6; c.globalAlpha = Math.max(0, b.y / h); c.beginPath(); c.arc(b.x, b.y, b.r, 0, 7); c.fill(); return b.y > -5; });
    c.globalAlpha = 1;
    // vinheta
    const vg = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
    vg.addColorStop(0, '#0000'); vg.addColorStop(1, '#000c'); c.fillStyle = vg; c.fillRect(0, 0, w, h);
  }

  let ult = performance.now();
  function quadro(agora) {
    requestAnimationFrame(quadro);
    lePad();
    if (esc.classList.contains('hide')) { ult = agora; return; }
    const dt = Math.min(50, agora - ult); ult = agora;
    const dpr = devicePixelRatio || 1, W = innerWidth, H = innerHeight;
    if (fundo.width !== Math.round(W * dpr) || fundo.height !== Math.round(H * dpr)) { fundo.width = Math.round(W * dpr); fundo.height = Math.round(H * dpr); }
    const c = fundo.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
    cena(c, W, H, agora);
    troca = Math.max(0, troca - dt / 250); tConf += dt;
    const vis = visualDe(cursor) || (Math.floor(agora / 180) % 2 ? 'blocos' : 'palito');
    const s = Math.min(H / 290, W / 560) * (1 + troca * 0.08);
    const chao = H * 0.86;
    for (const i of [0, 1]) {
      const l = lut[i], x = W * (i ? 0.82 : 0.18), d = i ? -1 : 1;
      const f = { acao: i === lado ? 'defesa' : 'parado', dur: 0, t: 0, y: 0, agachado: false, martelo: 0, hp: 100, estrela: 0 };
      if (l.golpe) { l.tg += dt; f.acao = l.golpe; f.dur = 420; f.t = l.tg; if (l.tg >= 420) l.golpe = null; }
      const pronto = confirmado === i;
      const sel = i === lado;
      // destaque no chão
      c.save(); c.globalAlpha = sel ? 0.55 : 0.2;
      const hg = c.createRadialGradient(x, chao, 2, x, chao, 90 * s); hg.addColorStop(0, COR[i]); hg.addColorStop(1, '#0000');
      c.fillStyle = hg; c.fillRect(x - 90 * s, chao - 90 * s, 180 * s, 180 * s); c.restore();
      c.globalAlpha = sel || pronto ? 1 : 0.55;
      desenhaLutador(c, l.a, f, vis, COR[i], x - (troca * 30 * d), chao - (pronto ? Math.abs(Math.sin(tConf / 90)) * 12 * s : 0), s * (sel ? 1 : 0.9), d, agora + i * 1700, dt, pronto ? vitoria(tConf, i) : null);
      c.globalAlpha = 1;
      c.font = `900 ${Math.round(16 * s / 2)}px Audiowide,Audiowide,Impact,system-ui`; c.textAlign = 'center'; c.fillStyle = COR[i];
      c.fillText(i ? 'P2 AZUL' : 'P1 VERMELHO', x, chao + 22 * s / 2 + 6);
      if (pronto) { c.font = `900 ${Math.round(28 * s / 2)}px Audiowide,Audiowide,Impact,system-ui`; c.fillStyle = '#fde047'; c.fillText('PRONTO!', x, chao - 175 * s); }
    }
    // retratos animados
    rets.forEach((r, i) => {
      const cw = r.c.clientWidth, ch = r.c.clientHeight; if (!cw) return;
      if (r.c.width !== Math.round(cw * dpr)) { r.c.width = Math.round(cw * dpr); r.c.height = Math.round(ch * dpr); }
      const rc = r.c.getContext('2d'); rc.setTransform(dpr, 0, 0, dpr, 0, 0); rc.clearRect(0, 0, cw, ch);
      if (PERS[i].v === '?') { rc.font = `900 ${ch * 0.6}px Audiowide,Impact,system-ui`; rc.textAlign = 'center'; rc.fillStyle = i === cursor ? '#fde047' : '#a16207'; rc.fillText('?', cw / 2, ch * 0.72); return; }
      const sc = ch / 120;
      desenhaLutador(rc, r.a, { acao: 'parado', dur: 0, t: 0, y: 0, agachado: false, martelo: 0, hp: 100 }, PERS[i].v, i === cursor ? '#fde047' : '#d6d3d1', cw / 2, ch * 1.05 + 30 * sc, sc * 1.25, 1, agora + i * 900, dt);
    });
  }
  aplica();
  requestAnimationFrame(quadro);
})();

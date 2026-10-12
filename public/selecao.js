// Tela de seleção estilo Mortal Kombat: grade de retratos, cursor, lutadores animados nas laterais.
// Usa pose()/poseBlocos()/aproxima()/lerp de jogo.js e "dirige" os botões originais (#persEscolha, data-p, #local).
(() => {
  const esc = document.querySelector('#escolha');
  if (!esc) return;
  const PERS = [
    { v: 'palito', nome: 'PALITO', sub: 'ágil e elástico' },
    { v: 'blocos', nome: 'BLOCOS', sub: 'duro feito pedra' },
    { v: 'eddie', nome: 'EDDIE', sub: 'capoeira e axé' },
    { v: 'pretoVelho', nome: 'PRETO VELHO', sub: 'sabedoria e mandinga' },
    { v: 'bob', nome: 'BOB MALTÊS', sub: 'pequeno, branco e feroz' },
    { v: '?', nome: 'ALEATÓRIO', sub: 'deixa a sorte escolher' },
  ];
  const COR_PADRAO = ['#ef4444', '#3b82f6'];
  const corDoLado = i => sessionStorage.getItem('corLutador' + i) || COR_PADRAO[i];
  const COR_SKIN = { fogo: '#ff7430', gelo: '#8be9ff', trovao: '#d3a5ff', vento: '#8fffd5', astronauta: '#dceaff', gala: '#f472b6', dourado: '#facc15' };
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
#selGrade{display:flex;flex-wrap:wrap;gap:8px;justify-content:center}
#selGrade .ret{width:clamp(52px,11vw,96px);height:clamp(52px,11vw,96px);border:3px solid #78350f;border-radius:6px;background:linear-gradient(#3b0f28,#0b0410);padding:0;position:relative;cursor:pointer;box-shadow:inset 0 0 18px #000}
#selGrade .ret canvas{position:absolute;inset:0;width:100%;height:100%}
#selGrade .ret span{position:absolute;bottom:2px;left:0;right:0;font:800 10px system-ui;color:#fde68a;text-shadow:0 1px 2px #000}
#selGrade .ret.cur{border-color:#facc15;box-shadow:0 0 0 2px #000,0 0 22px #facc15,inset 0 0 18px #000;animation:selPulsa .8s infinite alternate}
@keyframes selPulsa{to{box-shadow:0 0 0 2px #000,0 0 34px #f97316,inset 0 0 18px #000}}
#escolha.mk .bt[data-p]{transition:transform .15s}
#escolha.mk .bt[data-p].alvo{outline:4px solid #facc15;transform:scale(1.08)}
#selDica{font:600 12px system-ui;opacity:.75;text-align:center;text-shadow:0 1px 3px #000}
#selCores{display:flex;justify-content:center;gap:12px;flex-wrap:wrap}
#selCores label{display:flex;align-items:center;gap:7px;padding:5px 10px;border:1px solid #ffffff55;border-radius:999px;background:#090311dd;font:700 11px system-ui;letter-spacing:1px;color:#fff}
#selCores input{width:36px;height:30px;padding:0;border:0;border-radius:6px;background:transparent;cursor:pointer}
#selCores input::-webkit-color-swatch-wrapper{padding:0}#selCores input::-webkit-color-swatch{border:2px solid #fff;border-radius:6px}
#selGrade .ret.p1{border-color:#ef4444;box-shadow:0 0 0 2px #000,0 0 22px #ef4444,inset 0 0 18px #000}
#selGrade .ret.p2{border-color:#3b82f6;box-shadow:0 0 0 2px #000,0 0 22px #3b82f6,inset 0 0 18px #000}
#selGrade .ret.p1.p2{border-color:#facc15;border-left-color:#ef4444;border-top-color:#ef4444;border-right-color:#3b82f6;border-bottom-color:#3b82f6}
#selGrade .ret.p1::before,#selGrade .ret.p2::after{position:absolute;top:2px;font:900 10px system-ui;padding:1px 4px;border-radius:3px;color:#fff;z-index:1}
#selGrade .ret.p1::before{content:'1P';left:2px;background:#dc2626}
#selGrade .ret.p2::after{content:'2P';right:2px;background:#2563eb}
#selGrade .ret.ok1::before{content:'1P ✓'}#selGrade .ret.ok2::after{content:'2P ✓'}
#escolha.mk.local>*:not(#selFundo):not(#selNome):not(#selGuiaBt):not(#selGrade):not(#selDica):not(#selCores):not(#selVolta):not(.guia){display:none!important}
#escolha.mk.local.ladoFase #selGrade{visibility:hidden}
#selVolta{display:none;font:700 13px system-ui;background:#0008;color:#fff;border:2px solid #fff4;border-radius:999px;padding:6px 14px;margin:0 auto}
#escolha.mk.local #selVolta{display:block}
#selNome .duplo{display:flex;justify-content:space-between;padding:0 4vw;font-size:clamp(20px,5vw,48px)}
#selNome .duplo>div:first-child{color:#fca5a5;text-shadow:0 0 18px #dc2626,0 3px 0 #450a0a}
#selNome .duplo>div:last-child{color:#93c5fd;text-shadow:0 0 18px #2563eb,0 3px 0 #172554}
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
  const cores = document.createElement('div'); cores.id = 'selCores';
  cores.innerHTML = [0, 1].map(i => '<label>' + (i ? '2P' : '1P') + ' COR <input type="color" aria-label="Cor do personagem ' + (i + 1) + '" value="' + corDoLado(i) + '" data-cor="' + i + '"></label>').join('');
  dica.after(cores);
  cores.querySelectorAll('input').forEach(input => input.addEventListener('input', () => {
    sessionStorage.setItem('corLutador' + input.dataset.cor, input.value);
    if (window.setCorJogador) window.setCorJogador(+input.dataset.cor, input.value);
    aplica();
  }));
  const guiaBt = document.createElement('button'); guiaBt.id = 'selGuiaBt'; guiaBt.textContent = 'Golpes';
  const volta = document.createElement('button'); volta.id = 'selVolta'; volta.textContent = '◀ Voltar (Esc)';
  volta.onclick = () => saiLocal(); dica.after(volta);
  guiaBt.onclick = () => esc.classList.toggle('verGuia'); esc.appendChild(guiaBt);
  esc.querySelector('.guia').addEventListener('click', () => esc.classList.remove('verGuia'));

  let cursor = Math.max(0, PERS.findIndex(p => p.v === (sessionStorage.getItem('visual') || 'palito')));
  let lado = 0, confirmado = -1, tConf = 0, troca = 0;
  // modo local (mesma tela): P1 no teclado e P2 no controle, cada um com seu cursor
  let local = false;
  const cur = [0, 0], pronto = [false, false], tPronto = [0, 0];
  // fase 'lado': cada dispositivo anda pra esquerda (1P) ou direita (2P); fase 'pers': cada lado escolhe lutador
  let fase = 'lado';
  const pos = { kb: 0, gp: 0 }; // -1 = 1P (esquerda), 0 = meio, 1 = 2P (direita)
  const ladoDe = d => pos[d] < 0 ? 0 : pos[d] > 0 ? 1 : -1;
  const outro = d => d === 'kb' ? 'gp' : 'kb';
  function andaPos(d, dir) {
    const novo = Math.max(-1, Math.min(1, pos[d] + dir));
    if (novo !== 0 && pos[outro(d)] === novo) return; // lado já ocupado
    pos[d] = novo; aplica();
  }
  function fechaLados() {
    if (ladoDe('kb') < 0 || ladoDe('gp') < 0) return;
    fase = 'pers'; pronto[0] = pronto[1] = false; aplica();
  }
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
    if (local) {
      esc.classList.toggle('ladoFase', fase === 'lado');
      if (fase === 'lado') {
        nomeEl.innerHTML = 'ESCOLHAM O LADO<small>teclado: A / D · controle: ◀ ▶ · Enter / A confirma</small>';
        const ok = ladoDe('kb') >= 0 && ladoDe('gp') >= 0;
        dica.textContent = ok ? 'Pronto! Enter ou A pra escolher os lutadores · Esc volta' : 'Cada um vai pro lado que quer jogar (1P esquerda · 2P direita) · Esc volta';
        return;
      }
      rets.forEach((r, i) => { const c = r.b.classList; c.remove('cur'); c.toggle('p1', cur[0] === i); c.toggle('p2', cur[1] === i); c.toggle('ok1', cur[0] === i && pronto[0]); c.toggle('ok2', cur[1] === i && pronto[1]); });
      nomeEl.innerHTML = '<div class="duplo">' + [0, 1].map(i => '<div style="color:' + corDoLado(i) + '">' + PERS[cur[i]].nome + '<small>' + (pronto[i] ? 'PRONTO!' : PERS[cur[i]].sub) + '</small></div>').join('') + '</div>';
      const nomeDev = i => ladoDe('kb') === i ? 'teclado: A/D escolhe · J/Enter confirma · Esc volta' : 'controle: ◀ ▶ escolhe · A confirma · B volta';
      dica.textContent = '1P ' + nomeDev(0) + '  |  2P ' + nomeDev(1);
      return;
    }
    rets.forEach(r => r.b.classList.remove('p1', 'p2', 'ok1', 'ok2'));
    rets.forEach((r, i) => r.b.classList.toggle('cur', i === cursor));
    esc.querySelectorAll('.bt[data-p]').forEach(b => b.classList.toggle('alvo', +b.dataset.p === lado));
    nomeEl.innerHTML = PERS[cursor].nome + '<small>' + PERS[cursor].sub + '</small>';
    const v = visualDe(cursor);
    if (v) { const b = esc.querySelector('#persEscolha .bt[data-v="' + v + '"]'); if (b) b.click(); }
  }
  const GOLPES = ['socoAlto', 'chuteAlto', 'magia', 'gancho', 'giro'];
  const VITRINE = {
    palito: ['socoAlto', 'chuteAlto', 'magia', 'gancho', 'milCortes'],
    blocos: ['socoRocha', 'chuteCristal', 'meteoroPedra', 'gancho', 'giro'],
    eddie: ['au', 'armada', 'bencao', 'rabo', 'meiaLua'],
    pretoVelho: ['bengalada', 'rasteiraBengala', 'fumaca', 'mandinga', 'ancestrais'],
    bob: ['mordida', 'patada', 'latido', 'rabada', 'furacaoBob'],
  };
  function move(d) {
    if (confirmado >= 0 || !d) return;
    cursor = (cursor + d + PERS.length) % PERS.length; troca = 1;
    lut.forEach((l, i) => { l.golpe = GOLPES[(cursor * 2 + i) % GOLPES.length]; l.tg = 0; });
    aplica();
  }
  function confirma(p, botao) {
    if (confirmado >= 0) return;
    if (esc.dataset.modo === 'ia') { p = 0; botao = '#ia'; } // 1 x IA: sempre Vermelho, entra direto
    if (PERS[cursor].v === '?') { cursor = Math.floor(Math.random() * (PERS.length - 1)); aplica(); }
    confirmado = p; tConf = 0;
    setTimeout(() => {
      liberado = true;
      (botao ? esc.querySelector(botao) : esc.querySelector('.bt[data-p="' + p + '"]')).click();
      liberado = false; confirmado = -1;
    }, 900);
  }
  function entraLocal() {
    local = true; cur[0] = cur[1] = cursor; pronto[0] = pronto[1] = false;
    fase = 'lado'; pos.kb = pos.gp = 0;
    esc.classList.add('local');
    if (window.pegaControle) window.pegaControle();
    aplica();
  }
  function saiLocal() { if (!local) return; local = false; esc.classList.remove('local', 'ladoFase'); aplica(); }
  function moveL(i, d) {
    if (pronto[i]) return;
    cur[i] = (cur[i] + d + PERS.length) % PERS.length;
    lut[i].golpe = GOLPES[(cur[i] * 2 + i) % GOLPES.length]; lut[i].tg = 0;
    aplica();
  }
  function confirmaL(i) {
    if (pronto[i]) return;
    if (PERS[cur[i]].v === '?') cur[i] = Math.floor(Math.random() * (PERS.length - 1));
    pronto[i] = true; tPronto[i] = 0; aplica();
    if (pronto[0] && pronto[1]) setTimeout(comecaLocal, 900);
  }
  function cancelaL(i) {
    if (pronto[i]) { pronto[i] = false; aplica(); }
    else { fase = 'lado'; pronto[0] = pronto[1] = false; aplica(); }
  }
  async function comecaLocal() {
    if (!local || !pronto[0] || !pronto[1]) return;
    const tipos = cur.map(c => PERS[c].v);
    await Promise.all(tipos.map((tipo, p) => fetch('/personagem', { method: 'POST', body: JSON.stringify({ p, tipo }) })));
    if (!local || !pronto[0] || !pronto[1]) return;
    sessionStorage.setItem('ladoTeclado', String(ladoDe('kb')));
    liberado = true; esc.querySelector('#local').click(); liberado = false;
    saiLocal();
  }
  // intercepta os botões originais pra tocar a animação de "pronto" antes de entrar
  let liberado = false;
  esc.querySelectorAll('.bt[data-p]').forEach(b => b.addEventListener('click', e => {
    if (liberado) return; e.stopImmediatePropagation(); lado = +b.dataset.p; aplica(); confirma(lado);
  }, true));
  const loc = esc.querySelector('#local');
  if (loc) loc.addEventListener('click', e => { if (liberado) return; e.stopImmediatePropagation(); entraLocal(); }, true);
  const btIA = esc.querySelector('#ia');
  if (btIA) btIA.addEventListener('click', e => { if (liberado) return; e.stopImmediatePropagation(); lado = 0; aplica(); confirma(0, '#ia'); }, true);

  // só navega na grade nos modos que escolhem lutador (o menu de modos e a simulação têm navegação própria)
  const ativa = () => !esc.classList.contains('hide') && !esc.classList.contains('verGuia') && ['ia', 'online', 'local'].includes(esc.dataset.modo);
  addEventListener('keydown', e => {
    if (esc.classList.contains('verGuia') && e.key === 'Escape') return esc.classList.remove('verGuia');
    if (!ativa() || e.repeat) return;
    const k = e.key.toLowerCase();
    if (local) {
      const esq = k === 'arrowleft' || k === 'a', dir = k === 'arrowright' || k === 'd';
      const ok = k === 'enter' || k === ' ' || k === 'j' || k === 'u', volta = k === 'escape' || k === 'backspace';
      if (ok || volta) e.preventDefault();
      if (fase === 'lado') { if (esq) andaPos('kb', -1); else if (dir) andaPos('kb', 1); else if (ok) fechaLados(); else if (volta) saiLocal(); return; }
      const i = ladoDe('kb');
      if (esq) moveL(i, -1); else if (dir) moveL(i, 1); else if (ok) confirmaL(i); else if (volta) cancelaL(i);
      return;
    }
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
    if (ativa() && local) {
      const b = k => ag[k] && !gpAnt[k];
      if (fase === 'lado') {
        if (b('esq')) andaPos('gp', -1); if (b('dir')) andaPos('gp', 1);
        if (b('ok')) fechaLados(); if (b('volta')) saiLocal();
      } else {
        const i = ladoDe('gp');
        if (b('esq')) moveL(i, -1); if (b('dir')) moveL(i, 1);
        if (b('ok')) confirmaL(i); if (b('volta')) cancelaL(i);
      }
    } else if (ativa() && (!window.podeLerControle || window.podeLerControle())) {
      const b = k => ag[k] && !gpAnt[k];
      if (b('esq')) move(-1); if (b('dir')) move(1);
      if (b('lado')) { lado = 1 - lado; aplica(); }
      if (b('ok')) confirma(lado);
    }
    gpAnt = ag;
    if (local) { gpAnt = ag; return; }
    const st = !pads.length ? '' : window.podeLerControle && window.podeLerControle() ? ' · 🎮 controle nesta janela' : ' · 🎮 controle em outra janela (aperte "Controle" pra trazer)';
    const txt = '◀ ▶ escolhe · ▲ ▼ lado · Enter / A confirma' + st;
    if (dica.textContent !== txt) dica.textContent = txt;
  }

  // desenho do boneco (mesma geometria do boneco() de jogo.js, mas em qualquer canvas)
  const R = g => g * Math.PI / 180;
  function desenhaLutador(c, a, f, visual, cor, x, chao, s, d, tempo, dt, extra, skin) {
    if (visual === 'bob') {
      const gold = skin === 'dourado', fur = gold ? '#f4d47a' : '#fffdf8';
      const bobMove = Math.sin(tempo / 90) * 2, cx = x, cy = chao - 42 * s + bobMove * s, headX = x + d * 24 * s;
      c.save(); c.lineCap = 'round'; c.lineJoin = 'round'; c.shadowColor = gold ? '#facc15' : '#ddd'; c.shadowBlur = skin === 'dourado' ? 16 * s : 5 * s;
      c.fillStyle = fur; c.strokeStyle = '#d9d5cf'; c.lineWidth = 1.5 * s;
      c.beginPath(); c.ellipse(cx, cy, 35 * s, 22 * s, 0, 0, Math.PI * 2); c.fill(); c.stroke();
      // patas acompanham a corrida e se recolhem nos golpes
      const correndo = Math.abs(f.vx || 0) > 1 || f.acao === 'furacaoBob';
      for (let n = 0; n < 4; n++) {
        const front = n % 2 === 0, side = n < 2 ? -1 : 1;
        const px = cx + (front ? 21 : -20) * s, swing = correndo ? Math.sin(tempo / 65 + n * Math.PI) * 7 : 0;
        const lift = f.acao === 'pulo' ? 8 : 0;
        c.beginPath(); c.ellipse(px + swing * s, chao - (18 + lift) * s, 6.5 * s, 15 * s, swing * .025, 0, Math.PI * 2); c.fill(); c.stroke();
      }
      // rabo abanando; durante a rabada vira um arco de ataque
      const wag = f.acao === 'rabada' ? 95 : Math.sin(tempo / 70) * 38;
      c.save(); c.translate(cx - d * 31 * s, cy - 4 * s); c.rotate((-25 + wag) * Math.PI / 180);
      c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(-10 * s, -18 * s, -23 * s, -15 * s); c.strokeStyle = fur; c.lineWidth = 10 * s; c.stroke(); c.restore();
      c.fillStyle = fur; c.beginPath(); c.ellipse(headX, cy - 12 * s, 23 * s, 22 * s, 0, 0, Math.PI * 2); c.fill(); c.stroke();
      for (const z of [-1, 1]) { c.beginPath(); c.ellipse(headX - d * 5 * s, cy + z * 16 * s, 8 * s, 13 * s, -d * .3, 0, Math.PI * 2); c.fill(); c.stroke(); }
      c.fillStyle = '#fff'; c.beginPath(); c.ellipse(headX + d * 15 * s, cy - 5 * s, 14 * s, 10 * s, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#171717'; c.beginPath(); c.arc(headX + d * 26 * s, cy - 8 * s, 3.8 * s, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#211a18'; c.beginPath(); c.arc(headX + d * 9 * s, cy - 18 * s, 2.5 * s, 0, Math.PI * 2); c.arc(headX + d * 18 * s, cy - 18 * s, 2.5 * s, 0, Math.PI * 2); c.fill();
      if (skin === 'gala') { c.fillStyle = '#e11d48'; c.beginPath(); c.moveTo(cx + d * 8 * s, cy - 3 * s); c.lineTo(cx + d * 18 * s, cy + 3 * s); c.lineTo(cx + d * 8 * s, cy + 9 * s); c.lineTo(cx - d * 2 * s, cy + 3 * s); c.fill(); }
      if (f.acao === 'latido' || f.acao === 'mordida') { c.fillStyle = '#fda4af'; c.beginPath(); c.ellipse(headX + d * 25 * s, cy + 1 * s, 8 * s, 4 * s, 0, 0, 7); c.fill(); }
      c.restore(); return;
    }
    const blocos = visual === 'blocos';
    const alvo = poseDe(visual, f, a, tempo);
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
      if (skin === 'pirata') {
        const ang = p.bracoT[k] + p.cotovelo[k], ponta = vai(mao, ang, 42);
        c.save(); c.lineCap = 'butt'; c.strokeStyle = '#dbeafe'; c.lineWidth = 5 * s;
        c.beginPath(); c.moveTo(mao[0], mao[1]); c.lineTo(ponta[0], ponta[1]); c.stroke();
        c.strokeStyle = '#f4c542'; c.lineWidth = 3 * s;
        const g1 = vai(mao, ang + 90, 7), g2 = vai(mao, ang - 90, 7);
        c.beginPath(); c.moveTo(g1[0], g1[1]); c.lineTo(g2[0], g2[1]); c.stroke(); c.restore();
      }
    }
    if (visual === 'palito' || visual === 'pretoVelho') {
      const co = vai(ombro, p.bracoT[0], 30), mao = vai(co, p.bracoT[0] + p.cotovelo[0], 32);
      const ponta = vai(mao, p.bracoT[0] + p.cotovelo[0], visual === 'palito' ? 78 : 68);
      if (visual !== 'palito' || f.acao !== 'magia' || f.t / f.dur < 7 / 16) {
        c.save(); c.shadowBlur = 5 * s; c.strokeStyle = visual === 'palito' ? '#bae6fd' : '#a16207';
        c.lineWidth = (visual === 'palito' ? 6 : 5) * s;
        c.beginPath(); c.moveTo(...mao); c.lineTo(...ponta); c.stroke();
        if (visual === 'palito') { c.strokeStyle = '#fef9c3'; c.lineWidth = 3 * s; c.beginPath(); c.moveTo(mao[0] - 8 * s * d, mao[1]); c.lineTo(mao[0] + 8 * s * d, mao[1]); c.stroke(); }
        c.restore();
      }
    }
    c.globalAlpha = 1;
    const meio = vai(quadril, 180 + p.tronco * 0.5, 29);
    curva(quadril, [meio[0] - 3 * s * d, meio[1]], ombro);
    a.cabeca += (p.tronco - a.cabeca) * (1 - Math.exp(-dt / 110));
    const cab = vai(ombro, 180 + a.cabeca, 24);
    if (blocos) c.fillRect(cab[0] - 16 * s, cab[1] - 16 * s, 32 * s, 32 * s);
    else { c.beginPath(); c.arc(...cab, 19 * s, 0, 7); c.fill(); }
    // Marcas visuais próprias para identificar cada lutador na prévia.
    c.save(); c.shadowBlur = 0;
    if (visual === 'palito' && skin === 'pirata') {
      c.fillStyle = '#d4a017'; c.strokeStyle = '#fff0a6'; c.lineWidth = 1.5 * s;
      c.beginPath(); c.moveTo(cab[0] - 13 * s, cab[1] - 14 * s);
      c.lineTo(cab[0] - 12 * s, cab[1] - 27 * s); c.lineTo(cab[0] - 5 * s, cab[1] - 20 * s);
      c.lineTo(cab[0], cab[1] - 31 * s); c.lineTo(cab[0] + 5 * s, cab[1] - 20 * s);
      c.lineTo(cab[0] + 12 * s, cab[1] - 27 * s); c.lineTo(cab[0] + 13 * s, cab[1] - 14 * s);
      c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#111318'; c.strokeStyle = '#3b2418'; c.lineWidth = 2 * s;
      c.beginPath(); c.ellipse(cab[0] + 8 * s * d, cab[1] - 3 * s, 6 * s, 5 * s, 0, 0, Math.PI * 2); c.fill(); c.stroke();
    } else if (visual === 'blocos') {
      c.fillStyle = skin === 'astronauta' ? '#1d4ed8' : '#4a2c17';
      c.fillRect(cab[0] - 16 * s, cab[1] - 16 * s, 32 * s, 7 * s);
      if (skin === 'astronauta') { c.fillStyle = '#091833'; c.fillRect(cab[0] + (d > 0 ? 9 : -16) * s, cab[1] - 6 * s, 7 * s, 15 * s); }
    } else if (visual === 'eddie') {
      c.strokeStyle = '#211613'; c.lineWidth = 4 * s;
      for (let n = -2; n <= 2; n++) { c.beginPath(); c.moveTo(cab[0] - 3 * s, cab[1] - 15 * s + n * 3 * s); c.lineTo(cab[0] - (16 + n % 2 * 4) * s, cab[1] - 8 * s + n * 7 * s); c.stroke(); }
      c.strokeStyle = '#facc15'; c.lineWidth = 3 * s; c.beginPath(); c.moveTo(quadril[0] - 10 * s, quadril[1]); c.lineTo(quadril[0] + 10 * s, quadril[1]); c.stroke();
    } else if (visual === 'pretoVelho') {
      c.fillStyle = '#e7e5e4'; c.beginPath(); c.ellipse(cab[0] + 4 * d * s, cab[1] + 12 * s, 11 * s, 9 * s, 0, 0, 7); c.fill();
      c.fillStyle = '#c49a58'; c.fillRect(cab[0] - 26 * s, cab[1] - 18 * s, 52 * s, 5 * s);
      c.fillRect(cab[0] - 14 * s, cab[1] - 32 * s, 28 * s, 16 * s);
    }
    c.restore();
    c.shadowBlur = 0; c.fillStyle = '#fff';
    const pisca = tempo % 3200 < 120;
    c.beginPath(); c.ellipse(cab[0] + 8 * s * d, cab[1] - 3 * s, 4 * s, pisca ? 0.8 * s : 4 * s, 0, 0, 7); c.fill();
    if (COR_SKIN[skin]) {
      c.fillStyle = COR_SKIN[skin]; c.shadowColor = COR_SKIN[skin]; c.shadowBlur = 16 * s;
      for (let n = 0; n < 12; n++) {
        const fase = n / 12, ang = fase * Math.PI * 2 + tempo / (skin === 'trovao' ? 160 : 400);
        const subida = (tempo / (skin === 'fogo' ? 850 : 1400) + fase) % 1;
        c.globalAlpha = skin === 'trovao' ? (Math.sin(tempo / 55 + n * 7) > 0 ? .9 : .12) : (1 - subida) * .8;
        c.beginPath(); c.arc(x + Math.cos(ang) * 30 * s, chao - (12 + subida * 130) * s, (skin === 'fogo' ? 4 : 3) * s, 0, 7); c.fill();
      }
    }
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
    troca = Math.max(0, troca - dt / 250); tConf += dt; tPronto[0] += dt; tPronto[1] += dt;
    const aleat = PERS[Math.floor(agora / 180) % (PERS.length - 1)].v;
    const s = Math.min(H / 290, W / 560) * (1 + troca * 0.08);
    const chao = H * 0.86;
    for (const i of [0, 1]) {
      const l = lut[i], x = W * (i ? 0.82 : 0.18), d = i ? -1 : 1;
      const emSim = esc.dataset.modo === 'sim';
      const skin = emSim ? (esc.querySelector('#simS' + i).value || 'padrao') : 'padrao';
      const f = { acao: emSim ? 'parado' : i === lado ? 'defesa' : 'parado', dur: 0, t: 0, y: 0, agachado: false, martelo: 0, hp: 100, estrela: 0 };
      const vis = emSim ? esc.querySelector('#simP' + i).value : visualDe(local ? cur[i] : cursor) || aleat;
      if (l.golpe) {
        l.tg += dt; const indice = GOLPES.indexOf(l.golpe);
        f.acao = (VITRINE[vis] || GOLPES)[indice < 0 ? 0 : indice];
        f.dur = 420; f.t = l.tg; if (l.tg >= 420) l.golpe = null;
      }
      const ok = local ? pronto[i] : confirmado === i, tC = local ? tPronto[i] : tConf;
      const sel = emSim || local || i === lado;
      // destaque no chão
      c.save(); c.globalAlpha = sel ? 0.55 : 0.2;
      const hg = c.createRadialGradient(x, chao, 2, x, chao, 90 * s); hg.addColorStop(0, corDoLado(i)); hg.addColorStop(1, '#0000');
      c.fillStyle = hg; c.fillRect(x - 90 * s, chao - 90 * s, 180 * s, 180 * s); c.restore();
      c.globalAlpha = sel || ok ? 1 : 0.55;
      const kx = x - (troca * 30 * d), ky = chao - (ok ? Math.abs(Math.sin(tC / 90)) * 12 * s : 0);
      const corVis = COR_SKIN[skin] || corDoLado(i);
      if (window.SEL3D && SEL3D.tem(vis) && skin === 'padrao') { f.vitoria = ok; if (!SEL3D.desenha(c, 'lado' + i, vis, f, kx, ky, 170 * s * (sel ? 1 : 0.9), d, dt, agora)) desenhaLutador(c, l.a, f, 'palito', corVis, kx, ky, s, d, agora, dt); }
      else desenhaLutador(c, l.a, f, vis, corVis, x - (troca * 30 * d), chao - (ok ? Math.abs(Math.sin(tC / 90)) * 12 * s : 0), s * (sel ? 1 : 0.9), d, agora + i * 1700, dt, ok ? vitoria(tC, i) : null, skin);
      c.globalAlpha = 1;
      c.font = `900 ${Math.round(16 * s / 2)}px Audiowide,Audiowide,Impact,system-ui`; c.textAlign = 'center'; c.fillStyle = corDoLado(i);
      c.fillText(local ? (i ? '2P' : '1P') + (ladoDe('kb') === i ? ' · TECLADO' : ladoDe('gp') === i ? ' · CONTROLE' : ' · LIVRE') : i ? 'P2 AZUL' : 'P1 VERMELHO', x, chao + 22 * s / 2 + 6);
      if (emSim) {
        const nome = PERS.find(p => p.v === vis);
        c.font = `800 ${Math.round(12 * s / 2)}px Audiowide,system-ui`;
        c.fillStyle = '#fff'; c.fillText((nome ? nome.nome : '') + (skin !== 'padrao' ? ' · ' + skin.toUpperCase() : ''), x, chao + 22 * s / 2 + 28);
      }
      if (ok) { c.font = `900 ${Math.round(28 * s / 2)}px Audiowide,Audiowide,Impact,system-ui`; c.fillStyle = '#fde047'; c.fillText('PRONTO!', x, chao - 175 * s); }
    }
    if (local && fase === 'lado') {
      const temPad = navigator.getGamepads && [...navigator.getGamepads()].some(Boolean);
      [['kb', '⌨ TECLADO', H * 0.42], ['gp', temPad ? '🎮 CONTROLE' : '🎮 conecte um controle', H * 0.54]].forEach(([d, txt, y]) => {
        const x = W / 2 + pos[d] * W * 0.32, lado = ladoDe(d);
        c.font = `900 ${Math.round(Math.max(16, 22 * s / 2))}px Audiowide,Impact,system-ui`; c.textAlign = 'center';
        const tw = c.measureText(txt).width + 36;
        c.fillStyle = lado < 0 ? '#000a' : corDoLado(lado); c.strokeStyle = '#fde047'; c.lineWidth = 2;
        c.beginPath(); c.roundRect(x - tw / 2, y - 26, tw, 40, 20); c.fill(); c.stroke();
        c.fillStyle = '#fff'; c.fillText((pos[d] > -1 ? '◀ ' : '') + txt + (pos[d] < 1 ? ' ▶' : ''), x, y + 2);
      });
    }
    // retratos animados
    rets.forEach((r, i) => {
      const cw = r.c.clientWidth, ch = r.c.clientHeight; if (!cw) return;
      if (r.c.width !== Math.round(cw * dpr)) { r.c.width = Math.round(cw * dpr); r.c.height = Math.round(ch * dpr); }
      const rc = r.c.getContext('2d'); rc.setTransform(dpr, 0, 0, dpr, 0, 0); rc.clearRect(0, 0, cw, ch);
      if (PERS[i].v === '?') { rc.font = `900 ${ch * 0.6}px Audiowide,Impact,system-ui`; rc.textAlign = 'center'; rc.fillStyle = i === cursor ? '#fde047' : '#a16207'; rc.fillText('?', cw / 2, ch * 0.72); return; }
      const sc = ch / 120;
      if (window.SEL3D && SEL3D.tem(PERS[i].v) && SEL3D.desenha(rc, 'ret' + i, PERS[i].v, { acao: 'parado', hp: 100, y: 0 }, cw / 2, ch, ch, 1, dt, agora, true)) return;
      desenhaLutador(rc, r.a, { acao: 'parado', dur: 0, t: 0, y: 0, agachado: false, martelo: 0, hp: 100 }, PERS[i].v, i === cursor ? '#fde047' : '#d6d3d1', cw / 2, ch * 1.05 + 30 * sc, sc * 1.25, 1, agora + i * 900, dt);
    });
  }
  aplica();
  requestAnimationFrame(quadro);
})();

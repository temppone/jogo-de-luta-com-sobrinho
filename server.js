// Servidor do jogo de luta (estilo Mortal Kombat clássico): lógica da luta, itens, habilidades.
// O cliente fica em public/. Sem dependências: node server.js
const http = require('http');
const os = require('os');
const PORT = 8081;

const W = 800, TICK = 1000 / 30, VIDA = 100;
// y: faixa de altura que o golpe acerta, medida a partir do pé de quem bate
const GOLPES = {
  socoAlto:      { dur: 8,  ativo: [3, 5],  alcance: 78,  y: [95, 125], dano: 5,  empurra: 8 },
  socoBaixo:     { dur: 7,  ativo: [2, 4],  alcance: 72,  y: [70, 100], dano: 4,  empurra: 6 },
  chuteAlto:     { dur: 13, ativo: [5, 8],  alcance: 100, y: [90, 135], dano: 9,  empurra: 14 },
  chuteBaixo:    { dur: 11, ativo: [4, 7],  alcance: 95,  y: [35, 75],  dano: 7,  empurra: 12 },
  gancho:        { dur: 18, ativo: [5, 8],  alcance: 72,  y: [40, 160], dano: 15, empurra: 14, derruba: true, lanca: 17, msg: 'GANCHO!' },
  socoAgachado:  { dur: 8,  ativo: [3, 5],  alcance: 72,  y: [30, 65],  dano: 4,  empurra: 6, agachado: true },
  chuteAgachado: { dur: 10, ativo: [3, 6],  alcance: 100, y: [0, 30],   dano: 6,  empurra: 10, agachado: true, baixo: true },
  rasteira:      { dur: 18, ativo: [6, 9],  alcance: 115, y: [0, 25],   dano: 8,  empurra: 6, agachado: true, baixo: true, derruba: true, lanca: 5, msg: 'RASTEIRA!' },
  giro:          { dur: 20, ativo: [8, 11], alcance: 108, y: [85, 140], dano: 13, empurra: 22, derruba: true, lanca: 8, msg: 'CHUTE GIRATÓRIO!' },
  socoAereo:     { dur: 10, ativo: [2, 8],  alcance: 72,  y: [60, 115], dano: 7,  empurra: 10, ar: true },
  voadora:       { dur: 16, ativo: [2, 13], alcance: 98,  y: [15, 85],  dano: 10, empurra: 16, ar: true, msg: 'VOADORA!' },
  magia:         { dur: 16, ativo: [99, 99], alcance: 0, y: [0, 0], dano: 0, empurra: 0 },
  martelada:     { dur: 14, ativo: [5, 9],  alcance: 110, y: [0, 160],  dano: 12, empurra: 24, derruba: true, lanca: 10, msg: 'MARTELADA!' },
};
const MAGIA = { dano: 10, empurra: 16, msg: 'BOLA DE FOGO!' };
const ATAQUES = ['socoAlto', 'socoBaixo', 'chuteAlto', 'chuteBaixo'];
// itens que caem do céu (estilo Smash): pega encostando
const ITENS = ['comida', 'estrela', 'martelo'];
const ESTRELA = 150, MARTELO = 180, VIDA_ITEM = 450; // em ticks (30 por segundo)
for (const k in GOLPES) GOLPES[k].nome = k;
MAGIA.nome = 'magia';

// árvore de habilidades: cada vitória dá 1 ponto; cada habilidade precisa da anterior do mesmo ramo
const SKILLS = {
  punho: null, chutePesado: 'punho', fogoDuplo: 'chutePesado',
  pele: null, defesaFirme: 'pele', regen: 'defesaFirme',
  pes: null, puloDuplo: 'pes', levanta: 'puloDuplo',
};
const fs = require('fs'), path = require('path');
const PUBLIC = path.join(__dirname, 'public');
const ARQ = path.join(__dirname, 'perfis.json');
let perfis = [{ pontos: 0, skills: [] }, { pontos: 0, skills: [] }];
try { perfis = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch {}
// skins disponíveis por personagem (a primeira é a padrão)
const SKINS = { palito: ['padrao'], blocos: ['padrao', 'astronauta'] };
perfis.forEach(pf => { if (pf.visual === 'astronauta') { pf.visual = 'blocos'; pf.skins = { blocos: 'astronauta' }; } });
const salva = () => fs.writeFile(ARQ, JSON.stringify(perfis), () => {});
const tem = (i, sk) => perfis[i].skills.includes(sk);
const config = { itens: true, vida: 100 };

const placar = [0, 0];
let jogo, tick = 0, msgId = 0, itemId = 0;
const clients = new Set();

function lutador(x, facing, i) {
  const vidaMax = config.vida + (tem(i, 'pele') ? 15 : 0);
  return { x, y: 0, vx: 0, vy: 0, facing, hp: vidaMax, vidaMax, pulouDuplo: false, puloAnt: false, acao: 'parado', dur: 0, t: 0, atingiu: false, stun: 0, agachado: false, noAr: false, estrela: 0, martelo: 0, keys: {}, fila: [], dirs: [] };
}
function msg(txt) { jogo.msg = { txt, id: ++msgId }; }
// luta estilo Mortal Kombat: melhor de 3 rounds, 99 segundos por round
const ROUNDS_VITORIA = 2, TEMPO = 99 * 30, INTRO = 50, PAUSA_ROUND = 100;
let vitorias = [0, 0], rodada = 0, campeao = null;
function novaRodada() {
  rodada++;
  // vencedor = quem levou o round (3 = empate); congela a luta até o próximo round
  jogo = { p: [lutador(200, 1, 0), lutador(600, -1, 1)], magias: [], itens: [], proximoItem: tick + INTRO + 30 * 4, vencedor: null, finish: null, fatality: null, fimTick: 0, inicio: tick + INTRO, tempo: TEMPO, placar, msg: null, danos: [] };
  msg(rodada === 3 ? 'ROUND FINAL' : 'ROUND ' + rodada);
}
function novaLuta() { vitorias = [0, 0]; rodada = 0; campeao = null; novaRodada(); }
novaLuta();
function fimRodada(v, txt) { // v: 1 ou 2 = vencedor do round, 3 = empate
  jogo.vencedor = v; jogo.fimTick = tick;
  if (v !== 3) vitorias[v - 1]++;
  const c = vitorias.findIndex(n => n >= ROUNDS_VITORIA);
  if (c >= 0 && v !== 3) {
    // round decisivo por nocaute: "FINISH HIM!" — o vencedor tem alguns segundos pra fazer o fatality
    if (jogo.p[2 - v].hp === 0) { jogo.finish = { v, ate: tick + FINISH }; return msg('FINISH HIM!'); }
    return fechaLuta(v, txt);
  }
  msg(txt);
}
function fechaLuta(v, txt) {
  campeao = v; jogo.finish = null;
  if (!jogo.simulado) { placar[v - 1]++; perfis[v - 1].pontos++; salva(); } // simulação não vale ponto
  if (txt) msg(txt);
}
// fatality: trás, frente, baixo + soco alto, perto do inimigo, durante o FINISH HIM
const FINISH = 30 * 30, FATALITY = 110, FATALITY_ESPADA = 170, FATALITY_PEDRA = 165;
function fatality(eu) {
  const d = eu.dirs.filter(x => tick - x.t < 60).slice(-3);
  return d.length === 3 && d[0].dir === -eu.facing && d[1].dir === eu.facing && d[2].dir === 0;
}
function finishHim() {
  const f = jogo.finish, quem = jogo.p[f.v - 1], alvo = jogo.p[2 - f.v];
  if (jogo.fatality) { // animação do fatality rolando
    const id = tick - jogo.fatality.t, espada = jogo.fatality.tipo === 'espada';
    if (espada) { // palito: saca espada, corta a cabeça, chute no tronco, soco arranca a cabeça
      quem.vx = alvo.vx = 0;
      if (id === 62) alvo.decapitado = true;
    } else if (jogo.fatality.tipo === 'pedra') { // blocos: punho vira pedra, soco, pedra gigante gira e esmaga
      quem.vx = alvo.vx = 0;
      if (id === 72) alvo.esmagado = true;
    } else if (id === 12) alvo.explodiu = true;
    if (id >= (espada ? FATALITY_ESPADA : jogo.fatality.tipo === 'pedra' ? FATALITY_PEDRA : FATALITY)) fechaLuta(f.v, 'FATALITY!'); // fala no final
    return;
  }
  if (alvo.y === 0 && alvo.acao !== 'tonto') { alvo.acao = 'tonto'; alvo.stun = 0; alvo.vx = 0; }
  if (tick >= f.ate) return fechaLuta(f.v, (f.v === 1 ? 'VERMELHO' : 'AZUL') + ' VENCE');
  const press = quem.fila.find(x => x.k === 'socoAlto');
  if (press && fatality(quem) && Math.abs(quem.x - alvo.x) < 170) {
    jogo.fatality = { t: tick, quem: f.v - 1, tipo: (perfis[f.v - 1].visual || 'palito') === 'palito' ? 'espada' : 'pedra' };
    quem.acao = 'gancho'; quem.dur = GOLPES.gancho.dur; quem.t = 0; quem.atingiu = true; quem.fila = [];
    msg('FATALITY');
  }
}

function frenteFrente(eu) {
  const d = eu.dirs.filter(x => tick - x.t < 36).slice(-2);
  return d.length === 2 && d.every(x => x.dir === eu.facing) && d[1].t - d[0].t <= 20;
}

function escolhe(eu, botao) {
  const k = eu.keys, idx = jogo.p.indexOf(eu);
  const tras = eu.facing === 1 ? k.esq : k.dir;
  if (eu.martelo > 0 && eu.y === 0) return 'martelada';
  if (eu.y > 0) return eu.noAr ? null : botao.startsWith('soco') ? 'socoAereo' : 'voadora';
  if (botao === 'socoAlto' && frenteFrente(eu) && !jogo.magias.some(m => m.dono === idx)) return 'magia';
  if (k.baixo) return { socoAlto: 'gancho', socoBaixo: 'socoAgachado', chuteAlto: 'chuteAgachado', chuteBaixo: 'chuteAgachado' }[botao];
  if (tras && botao === 'chuteBaixo') return 'rasteira';
  if (tras && botao === 'chuteAlto') return 'giro';
  return botao;
}

function dano(alvo, n, atacante) {
  alvo.hp = Math.max(0, alvo.hp - n);
  if (n) jogo.danos.push({ p: jogo.p.indexOf(alvo), n, id: ++msgId });
  if (alvo.hp === 0 && !jogo.vencedor) {
    const v = jogo.p.indexOf(atacante) + 1;
    fimRodada(v, atacante.hp === atacante.vidaMax ? 'VITÓRIA PERFEITA!' : 'NOCAUTE!');
  }
}

function caiAlvo(o) { return o.acao === 'caido' || o.acao === 'levantando'; }
function acerta(eu, o, g) {
  if (caiAlvo(o)) return false;
  const dist = (o.x - eu.x) * eu.facing;
  const alto = o.agachado ? 70 : 135;
  return dist > 0 && dist < g.alcance && eu.y + g.y[0] < o.y + alto && eu.y + g.y[1] > o.y;
}

function bate(eu, o, g, dir) {
  if (o.estrela > 0) { o.vx = dir * 3; return; } // invencível
  if (jogo.finish) { o.vx = dir * 4; return; } // no FINISH HIM golpe comum só empurra
  const defendeu = o.acao === 'defesa' && o.facing === -dir && (!g.baixo || o.agachado);
  o.vx = dir * (defendeu ? g.empurra / 3 : g.empurra) * 0.3;
  const ie = jogo.p.indexOf(eu), io = jogo.p.indexOf(o);
  let mult = 1;
  if (/^soco|gancho/.test(g.nome) && tem(ie, 'punho')) mult = 1.2;
  if (/^chute|rasteira|giro|voadora/.test(g.nome) && tem(ie, 'chutePesado')) mult = 1.2;
  const base = g.nome === 'magia' && tem(ie, 'fogoDuplo') ? 15 : g.dano;
  dano(o, defendeu ? (tem(io, 'defesaFirme') ? 0 : 1) : Math.round(base * mult), eu);
  if (defendeu) return;
  o.dur = 0; o.t = 0;
  if (g.derruba || o.y > 0 || o.hp === 0) { o.acao = 'caido'; o.stun = tem(io, 'levanta') ? 12 : 26; o.vy = g.lanca || 6; o.agachado = false; }
  else { o.acao = 'apanhou'; o.stun = 8; }
  if (g.msg && !jogo.vencedor) msg(g.msg);
}

function atualiza(eu, outro) {
  const k = eu.keys, idx = jogo.p.indexOf(eu);
  eu.fila = eu.fila.filter(p => tick - p.t <= 5);

  // quedas e atordoamento
  if (eu.acao === 'tonto') return; // cambaleando no FINISH HIM
  if (eu.acao === 'caido') {
    if (eu.y === 0 && eu.hp > 0 && --eu.stun <= 0) { eu.acao = 'levantando'; eu.stun = 9; }
  } else if (eu.stun > 0 && --eu.stun === 0) eu.acao = 'parado';

  const livre = (!jogo.vencedor || (jogo.finish && !jogo.fatality && idx === jogo.finish.v - 1)) && tick >= jogo.inicio && eu.stun === 0 && eu.acao !== 'caido' && !GOLPES[eu.acao];
  if (livre) {
    const press = eu.fila.pop(); eu.fila = [];
    const nome = press && escolhe(eu, press.k);
    if (nome) {
      eu.acao = nome; eu.dur = GOLPES[nome].dur; eu.t = 0; eu.atingiu = false;
      eu.agachado = !!GOLPES[nome].agachado;
      if (eu.y > 0) eu.noAr = true;
    }
  }
  if (livre && !GOLPES[eu.acao]) {
    eu.agachado = eu.y === 0 && !!k.baixo;
    eu.acao = k.defesa && eu.y === 0 ? 'defesa' : 'parado';
    if (!eu.agachado && eu.acao !== 'defesa') {
      const passo = d => (d === eu.facing ? 9 : 7) * (tem(idx, 'pes') ? 1.2 : 1); // andar pra trás é mais lento
      if (k.esq) eu.x -= passo(-1);
      if (k.dir) eu.x += passo(1);
      if (k.pulo && eu.y === 0) eu.vy = 20;
      else if (k.pulo && !eu.puloAnt && eu.y > 0 && !eu.pulouDuplo && tem(idx, 'puloDuplo')) { eu.vy = 17; eu.pulouDuplo = true; }
    }
  } else if (GOLPES[eu.acao] && GOLPES[eu.acao].ar) {
    if (k.esq) eu.x -= 6;
    if (k.dir) eu.x += 6;
  }

  eu.puloAnt = !!k.pulo;
  // física
  eu.x += eu.vx; eu.vx *= 0.8;
  eu.y += eu.vy; eu.vy -= 1.6;
  if (eu.y <= 0) {
    eu.y = 0; eu.vy = 0; eu.noAr = false; eu.pulouDuplo = false;
    if (GOLPES[eu.acao] && GOLPES[eu.acao].ar) { eu.acao = 'parado'; eu.dur = 0; }
  }
  eu.x = Math.max(40, Math.min(W - 40, eu.x));
  if (eu.stun === 0 && !GOLPES[eu.acao] && eu.acao !== 'caido') eu.facing = outro.x > eu.x ? 1 : -1;

  // golpes
  const g = GOLPES[eu.acao];
  if (g) {
    eu.t++;
    if (eu.acao === 'magia' && eu.t === 7) jogo.magias.push({ x: eu.x + eu.facing * 50, y: eu.y + 100, dir: eu.facing, dono: idx, forte: tem(idx, 'fogoDuplo') });
    if (!eu.atingiu && eu.t >= g.ativo[0] && eu.t <= g.ativo[1] && acerta(eu, outro, g)) { eu.atingiu = true; bate(eu, outro, g, eu.facing); }
    if (eu.t >= g.dur) { eu.acao = 'parado'; eu.dur = 0; eu.agachado = eu.y === 0 && !!k.baixo; }
  }
}

function moveMagias() {
  for (const m of jogo.magias) {
    m.x += m.dir * (m.forte ? 17 : 13);
    const o = jogo.p[1 - m.dono];
    if (!m.fim && Math.abs(o.x - m.x) < 30 && m.y > o.y && m.y < o.y + (o.agachado ? 70 : 135) && !caiAlvo(o)) {
      m.fim = true; bate(jogo.p[m.dono], o, MAGIA, m.dir);
    }
  }
  const [m1, m2] = jogo.magias;
  if (m1 && m2 && Math.abs(m1.x - m2.x) < 30) m1.fim = m2.fim = true; // magias se anulam
  jogo.magias = jogo.magias.filter(m => !m.fim && m.x > -20 && m.x < W + 20);
}

function itens() {
  if (config.itens && !jogo.vencedor && jogo.itens.length < 2 && tick >= jogo.proximoItem) {
    jogo.itens.push({ id: ++itemId, tipo: ITENS[Math.floor(Math.random() * ITENS.length)], x: 80 + Math.random() * (W - 160), y: 420, vy: 0, vida: VIDA_ITEM });
    jogo.proximoItem = tick + 30 * (6 + Math.random() * 6);
  }
  for (const it of jogo.itens) {
    it.vy -= 1.2; it.y = Math.max(0, it.y + it.vy); if (it.y === 0) it.vy = 0;
    it.vida--;
    const quem = jogo.p.find(p => !caiAlvo(p) && p.hp > 0 && Math.abs(p.x - it.x) < 38 && it.y < p.y + 130 && it.y + 30 > p.y);
    if (!quem || jogo.vencedor) continue;
    it.vida = 0;
    if (it.tipo === 'comida') { const antes = quem.hp; quem.hp = Math.min(quem.vidaMax, quem.hp + 15); if (antes !== quem.hp) jogo.danos.push({ p: jogo.p.indexOf(quem), n: antes - quem.hp, id: ++msgId }); msg('COMIDA! +15'); }
    if (it.tipo === 'estrela') { quem.estrela = ESTRELA; msg('ESTRELA!'); }
    if (it.tipo === 'martelo') { quem.martelo = MARTELO; msg('MARTELO!'); }
  }
  jogo.itens = jogo.itens.filter(it => it.vida > 0);
  for (const p of jogo.p) {
    if (p.estrela > 0) p.estrela--; if (p.martelo > 0) p.martelo--;
    if (tick % 60 === 0 && p.hp > 0 && p.hp < p.vidaMax && !jogo.vencedor && tem(jogo.p.indexOf(p), 'regen')) p.hp++;
  }
}

function passo() {
  tick++;
  if (tick === jogo.inicio) msg('LUTE!');
  if (!jogo.vencedor && tick >= jogo.inicio && --jogo.tempo <= 0) { // acabou o tempo: vence quem tem mais vida
    const [a, b] = jogo.p.map(f => f.hp / f.vidaMax);
    fimRodada(a > b ? 1 : b > a ? 2 : 3, a === b ? 'EMPATE!' : 'TEMPO!');
  }
  if (jogo.vencedor && !jogo.finish && !campeao && tick - jogo.fimTick > PAUSA_ROUND) novaRodada();
  if (jogo.finish && !campeao) finishHim();
  const [a, b] = jogo.p;
  atualiza(a, b); atualiza(b, a);
  moveMagias();
  itens();
  // não deixa um atravessar o outro no chão
  const d = b.x - a.x;
  if (Math.abs(d) < 50 && Math.abs(a.y - b.y) < 60 && !caiAlvo(a) && !caiAlvo(b)) {
    const empurra = (50 - Math.abs(d)) / 2 * (d >= 0 ? 1 : -1);
    a.x -= empurra; b.x += empurra;
  }
  jogo.danos = jogo.danos.filter(x => msgId - x.id < 20);
  const estado = { p: jogo.p.map(({ keys, fila, dirs, ...r }) => r), magias: jogo.magias, itens: jogo.itens.map(({ vy, ...r }) => r), vencedor: jogo.vencedor, campeao, finish: !!jogo.finish && !campeao, fatality: jogo.fatality ? { quem: jogo.fatality.quem, tipo: jogo.fatality.tipo, idade: tick - jogo.fatality.t } : null, finishResta: jogo.finish && !jogo.fatality ? Math.max(0, jogo.finish.ate - tick) / 30 : 0, vitorias, rodada, tempo: Math.ceil(jogo.tempo / 30), placar, perfis, config, msg: jogo.msg, danos: jogo.danos };
  const data = `data: ${JSON.stringify(estado)}\n\n`;
  for (const res of clients) res.write(data);
}
setInterval(passo, TICK);



function body(req) {
  return new Promise(r => { let s = ''; req.on('data', c => s += c); req.on('end', () => { try { r(JSON.parse(s)); } catch { r({}); } }); });
}

const TECLAS = ['esq', 'dir', 'pulo', 'baixo', 'defesa', ...ATAQUES];
http.createServer(async (req, res) => {
  if (req.url === '/eventos') {
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
    clients.add(res); req.on('close', () => clients.delete(res));
    return;
  }
  if (req.method === 'POST' && req.url === '/tecla') {
    const { p, k, v } = await body(req);
    const f = jogo.p[p];
    if (f && TECLAS.includes(k)) {
      f.keys[k] = !!v;
      if (v && ATAQUES.includes(k)) f.fila.push({ k, t: tick });
      if (v && k === 'baixo') { f.dirs.push({ dir: 0, t: tick }); f.dirs = f.dirs.slice(-4); }
      if (v && (k === 'esq' || k === 'dir')) { f.dirs.push({ dir: k === 'dir' ? 1 : -1, t: tick }); f.dirs = f.dirs.slice(-4); }
    }
    return res.end();
  }
  if (req.method === 'POST' && req.url === '/skill') {
    const { p, id } = await body(req), pf = perfis[p];
    if (pf && id in SKILLS && pf.pontos > 0 && !pf.skills.includes(id) && (!SKILLS[id] || pf.skills.includes(SKILLS[id]))) { pf.pontos--; pf.skills.push(id); salva(); }
    return res.end();
  }
  if (req.method === 'POST' && req.url === '/personagem') {
    const { p, tipo } = await body(req);
    if (perfis[p] && tipo in SKINS) { perfis[p].visual = tipo; salva(); }
    return res.end();
  }
  if (req.method === 'POST' && req.url === '/skin') {
    const { p, tipo, skin } = await body(req), pf = perfis[p];
    if (pf && SKINS[tipo] && SKINS[tipo].includes(skin)) { pf.skins = Object.assign({}, pf.skins, { [tipo]: skin }); salva(); }
    return res.end();
  }
  if (req.method === 'POST' && req.url === '/resetSkills') {
    const { p } = await body(req), pf = perfis[p];
    if (pf) { pf.pontos += pf.skills.length; pf.skills = []; salva(); }
    return res.end();
  }
  if (req.method === 'POST' && req.url === '/config') {
    const c = await body(req);
    if (typeof c.itens === 'boolean') config.itens = c.itens;
    if ([100, 150, 200].includes(c.vida)) config.vida = c.vida;
    return res.end();
  }
  if (req.method === 'POST' && req.url === '/simulaFinish') {
    // teste: pula direto pro FINISH HIM com o jogador p vencendo, inimigo perto e zerado
    let corpo = ''; req.on('data', d => corpo += d); req.on('end', () => {
      let p = 0; try { p = JSON.parse(corpo).p ? 1 : 0; } catch {}
      novaLuta();
      const v = p + 1, quem = jogo.p[p], alvo = jogo.p[1 - p];
      vitorias = [0, 0]; vitorias[p] = ROUNDS_VITORIA; jogo.inicio = tick; jogo.simulado = true;
      quem.x = 340 + p * 120; alvo.x = 460 - p * 120; alvo.hp = 0;
      jogo.vencedor = v; jogo.fimTick = tick; jogo.finish = { v, ate: tick + FINISH };
      msg('FINISH HIM!'); res.end();
    });
    return;
  }
  if (req.method === 'POST' && req.url === '/reset') {
    if (campeao) novaLuta();
    return res.end();
  }
  // arquivos da pasta public/
  const TIPOS = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
  const rel = req.url === '/' ? 'index.html' : decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '');
  const arq = path.join(PUBLIC, rel);
  if (!arq.startsWith(PUBLIC + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(arq, (err, dados) => {
    if (err) { res.writeHead(404); return res.end('não encontrado'); }
    res.writeHead(200, { 'Content-Type': (TIPOS[path.extname(arq)] || 'application/octet-stream') + '; charset=utf-8', 'Cache-Control': rel.startsWith('vendor/') ? 'max-age=86400' : 'no-cache' });
    res.end(dados);
  });
}).listen(PORT, '0.0.0.0', () => {
  const ips = Object.values(os.networkInterfaces()).flat().filter(n => n.family === 'IPv4' && !n.internal).map(n => n.address);
  console.log('Abra no celular:', ips.map(ip => `http://${ip}:${PORT}`).join('  ou  '));
});

// Cliente do jogo: entrada (toque/teclado/controle), animação 2D, HUD, menu
let eu = sessionStorage.getItem('lutador'), st, modoLocal = sessionStorage.getItem('local') === '1', entrada = sessionStorage.getItem('entrada') || 'teclado';
const usaTeclado = () => modoLocal || entrada === 'teclado', usaControle = () => modoLocal || entrada === 'controle';
// etiquetas dos botões: teclas do teclado ou botões do controle, conforme a entrada desta janela
const TECLA_KB = { pulo: 'W', baixo: 'S', esq: 'A', dir: 'D', socoAlto: 'U', socoBaixo: 'J', chuteAlto: 'I', chuteBaixo: 'K', defesa: 'L' };
function etiquetas() {
  document.querySelectorAll('.btn[data-k]').forEach(b => {
    if (!b.dataset.ctl) b.dataset.ctl = b.dataset.gp;
    const kb = TECLA_KB[b.dataset.k], ctl = b.dataset.ctl;
    const controle = !modoLocal && entrada === 'controle';
    b.dataset.gp = modoLocal ? kb + ' · ' + ctl : controle ? ctl : kb;
    b.classList.toggle('kb', !controle && !modoLocal);
  });
}
function marcaEntrada() { document.querySelectorAll('#entrada .bt').forEach(b => b.classList.toggle('sel', b.dataset.e === entrada)); etiquetas(); }
document.querySelectorAll('#entrada .bt').forEach(b => b.onclick = () => { entrada = b.dataset.e; sessionStorage.setItem('entrada', entrada); marcaEntrada(); });
marcaEntrada();
const $ = s => document.querySelector(s), cv = $('#c');
let ctx = cv.getContext('2d'); // trocado temporariamente pra desenhar na tela de escolha
const CORES = ['#ef4444', '#3b82f6'], VIDA = 100;
function mostra() { $('#escolha').classList.toggle('hide', eu !== null); $('#app').classList.toggle('hide', eu === null); etiquetas(); }
$('#local').onclick = () => { modoLocal = true; eu = '0'; sessionStorage.setItem('local', '1'); sessionStorage.setItem('lutador', eu); mostra(); };
let visualEscolhido = sessionStorage.getItem('visual') || 'palito';
function marcaVisual() { document.querySelectorAll('#persEscolha .bt').forEach(b => b.classList.toggle('sel', b.dataset.v === visualEscolhido)); }
document.querySelectorAll('#persEscolha .bt').forEach(b => b.onclick = () => { visualEscolhido = b.dataset.v; sessionStorage.setItem('visual', visualEscolhido); marcaVisual(); });
marcaVisual();
document.querySelectorAll('#escolha .bt[data-p]').forEach(b => b.onclick = () => { fetch('/personagem', { method: 'POST', body: JSON.stringify({ p: +b.dataset.p, tipo: visualEscolhido }) }); eu = b.dataset.p; modoLocal = false; sessionStorage.setItem('local', '0'); sessionStorage.setItem('lutador', eu); mostra(); });
mostra();
function envia(k, v, p = +eu) { if (eu !== null) fetch('/tecla', { method: 'POST', body: JSON.stringify({ p, k, v }) }); }
document.querySelectorAll('.btn').forEach(b => {
  const on = e => { e.preventDefault(); if (!b.classList.contains('on')) { b.classList.add('on'); envia(b.dataset.k, true); if (opc.vibrar && navigator.vibrate) navigator.vibrate(15); } };
  const off = e => { e.preventDefault(); if (b.classList.contains('on')) { b.classList.remove('on'); envia(b.dataset.k, false); } };
  b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off);
});
const TECLAS = { ArrowLeft: 'esq', ArrowRight: 'dir', ArrowUp: 'pulo', ArrowDown: 'baixo', a: 'esq', d: 'dir', w: 'pulo', s: 'baixo', u: 'socoAlto', j: 'socoBaixo', i: 'chuteAlto', k: 'chuteBaixo', l: 'defesa' };
addEventListener('keydown', e => { if (e.key === 'Escape' && eu !== null) return menuAberto ? fechaMenu() : abreMenu(); if (menuAberto) return; const k = usaTeclado() && TECLAS[e.key]; if (k && !e.repeat) envia(k, true, modoLocal ? 0 : +eu); });
addEventListener('keyup', e => { const k = usaTeclado() && TECLAS[e.key]; if (k) envia(k, false, modoLocal ? 0 : +eu); });
$('#ajuda').onclick = () => $('#lista').classList.toggle('hide');
$('#lista').innerHTML = document.querySelector('.guia').innerHTML;
// fim da luta: jogar de novo com os mesmos personagens ou voltar pra escolha
$('#reset').onclick = () => fetch('/reset', { method: 'POST' });
function trocaPersonagem() {
  fetch('/reset', { method: 'POST' });
  eu = null; modoLocal = false; sessionStorage.removeItem('lutador'); sessionStorage.setItem('local', '0'); mostra();
}
$('#trocar').onclick = trocaPersonagem;
document.addEventListener('contextmenu', e => e.preventDefault());

// animação: juntas com suavização (mola), interpolação entre estados do servidor
const anim = [0, 1].map(() => ({ fase: 0, vx: 0, xAnt: null, hp: VIDA, fantasma: VIDA, flash: 0, cur: null, yAnt: 0, vy: 0, squash: 0, cabeca: 0, dano: 0 }));
let parada = 0; // hit-stop: congela as poses uns ms no impacto
let faiscas = [], tremor = 0, popup = null, ultimoMsg = 0, ultimoDano = 0, numeros = [];
const lerp = (a, b, t) => a + (b - a) * t;
const suave = t => t * t * (3 - 2 * t);
// curva de golpe: recua (antecipação), estica rápido, segura, volta devagar
function curvaGolpe(u) {
  if (u < 0.25) return -0.35 * suave(u / 0.25);
  if (u < 0.42) { const t = (u - 0.25) / 0.17; return lerp(-0.35, 1.12, 1 - (1 - t) ** 3); } // estalo rápido com overshoot
  if (u < 0.6) return 1 + 0.12 * (1 - suave((u - 0.42) / 0.18)); // assenta no impacto
  return 1 - suave((u - 0.6) / 0.4);
}
function agacha(p) { p.perna = [75, 35]; p.joelho = [-125, -125]; p.baixa = 32; p.tronco = 18; p.bracoT = [35, 15]; p.cotovelo = [120, 125]; }
function noAr(p, a) {
  const sub = Math.max(-1, Math.min(1, a.vy / 15)); // subindo=1, caindo=-1
  p.perna = [lerp(35, 55, sub), lerp(5, -15, sub)]; p.joelho = [lerp(-50, -100, sub), lerp(-30, -70, sub)];
  p.bracoT = [lerp(60, 140, sub), lerp(40, 120, sub)]; p.cotovelo = [40, 30]; p.tronco = lerp(0, 12, sub); p.baixa = 0;
}

function pose(f, a, tempo) {
  // ângulos em graus; 0 = pra baixo, positivo = pra frente; cotovelo/joelho relativos ao osso de cima
  const vel = f.agachado ? 0 : Math.min(1, Math.abs(a.vx) / 8);
  const resp = Math.sin(tempo / 450), bal = Math.sin(tempo / 760) * (1 - vel); // respiração + balanço de guarda
  const c = Math.sin(a.fase), c2 = Math.cos(a.fase);
  const p = {
    tronco: 6 + vel * 10 + resp * 1.5,
    bracoT: [lerp(25 + resp * 4 + bal * 5, 20 - c * 40, vel), lerp(-5 - resp * 4 - bal * 3, -10 + c * 40, vel)],
    cotovelo: [lerp(115, 75, vel), lerp(125, 75, vel)],
    perna: [lerp(18 + bal * 4, c * 38, vel), lerp(-16 + bal * 4, -c * 38, vel)],
    joelho: [lerp(-14, -10 - Math.max(0, -c) * 70, vel), lerp(-12, -10 - Math.max(0, c) * 70, vel)],
    baixa: lerp(4 + resp * 2, 3 + Math.abs(c2) * -5, vel),
    giro: 1,
  };
  if (f.agachado) agacha(p);
  if (f.y > 0) noAr(p, a);
  if (f.acao === 'defesa') {
    p.bracoT = [78, 62]; p.cotovelo = [115, 120]; // antebraços na frente do rosto
    if (!f.agachado) { p.tronco = -10 + resp; p.baixa = 14; p.perna = [30, -30]; p.joelho = [-40, -28]; }
  }
  const u = f.dur ? f.t / f.dur : 0, e = curvaGolpe(u), k = Math.max(0, e);
  switch (f.acao) {
    case 'socoAlto':
    case 'socoBaixo': {
      const alto = f.acao === 'socoAlto';
      p.bracoT[0] = 30 + e * (alto ? 65 : 48); p.cotovelo[0] = 115 - k * 113;
      p.bracoT[1] = 20 - e * 25; p.cotovelo[1] = 125;
      p.tronco = 8 + e * (alto ? 18 : 24); p.perna = [32, -28]; p.joelho = [-20, -10]; p.baixa = alto ? 6 : 10;
      break;
    }
    case 'chuteAlto':
    case 'chuteBaixo': {
      const alto = f.acao === 'chuteAlto';
      p.perna[0] = 20 + e * (alto ? 120 : 72); p.joelho[0] = -20 - (1 - Math.abs(e)) * 70;
      p.perna[1] = -12; p.joelho[1] = -6; p.tronco = 6 - e * (alto ? 40 : 18);
      p.bracoT = [50 - e * 10, -40 - e * 40]; p.cotovelo = [100, 80]; p.baixa = 2;
      break;
    }
    case 'gancho':
      p.perna = [lerp(75, 10, k), lerp(35, -15, k)]; p.joelho = [lerp(-125, -5, k), lerp(-125, -5, k)];
      p.bracoT = [e < 0 ? 20 + e * 60 : 20 + e * 155, 10]; p.cotovelo = [e < 0 ? 120 : 120 - e * 110, 120];
      p.tronco = lerp(18, -10, k); p.baixa = lerp(32, -6, k);
      break;
    case 'socoAgachado':
      agacha(p); p.bracoT[0] = 35 + e * 55; p.cotovelo[0] = 120 - k * 118; p.tronco = 18 + e * 10;
      break;
    case 'chuteAgachado':
      agacha(p); p.perna[0] = 75 + e * 15; p.joelho[0] = -125 + k * 125; p.tronco = 18 - e * 15;
      break;
    case 'rasteira':
      agacha(p); p.baixa = 36; p.perna = [lerp(75, 92, k), 20]; p.joelho = [lerp(-125, 0, k), -140];
      p.bracoT = [10, -10]; p.cotovelo = [10, 10]; p.tronco = 35;
      p.giro = u < 0.4 ? Math.cos(u / 0.4 * Math.PI * 2) : 1;
      break;
    case 'giro':
      p.perna[0] = 20 + e * 115; p.joelho[0] = -20 - (1 - Math.abs(e)) * 60; p.perna[1] = -12; p.joelho[1] = -6;
      p.tronco = 6 - e * 45; p.bracoT = [80, -60]; p.cotovelo = [20, 20]; p.baixa = 2;
      p.giro = u < 0.45 ? Math.cos(u / 0.45 * Math.PI * 2) : 1;
      break;
    case 'socoAereo':
      noAr(p, a); p.bracoT[0] = 60 + e * 45; p.cotovelo[0] = 90 - k * 88;
      break;
    case 'voadora': {
      const v = Math.min(1, u / 0.2);
      p.perna = [lerp(40, 100, v), lerp(10, -20, v)]; p.joelho = [lerp(-90, 0, v), -100];
      p.tronco = -25 * v; p.bracoT = [100, -30]; p.cotovelo = [40, 40]; p.baixa = 0;
      break;
    }
    case 'magia':
      p.bracoT = [30 + e * 62, 25 + e * 64]; p.cotovelo = [115 - k * 110, 120 - k * 100];
      p.tronco = 8 + e * 15; p.perna = [35, -30]; p.joelho = [-25, -10]; p.baixa = 6;
      break;
    case 'martelada':
      p.bracoT[0] = e < 0 ? 170 - e * 60 : lerp(170, 70, e); p.cotovelo[0] = 10; p.bracoT[1] = p.bracoT[0] - 10; p.cotovelo[1] = 15;
      p.tronco = 8 + e * 25; p.perna = [35, -30]; p.joelho = [-25, -10]; p.baixa = 4 + k * 8;
      break;
    case 'tonto': { // cambaleando no FINISH HIM
      const bal = Math.sin(tempo / 260);
      p.tronco = -12 + bal * 14; p.bracoT = [-20 + bal * 20, -35 - bal * 20]; p.cotovelo = [20, 15]; p.perna = [10 + bal * 8, -12 + bal * 8]; p.joelho = [-30, -25]; p.baixa = 12;
      break;
    }
    case 'apanhou':
      p.tronco = -32; p.bracoT = [-45, -65]; p.cotovelo = [-35, -25]; p.perna = [30, -10]; p.joelho = [-30, -35]; p.baixa = 12;
      break;
    case 'levantando':
      agacha(p);
      break;
    case 'caido':
      if (f.y > 0) { p.tronco = -60; p.perna = [40, 30]; p.joelho = [-30, -40]; p.bracoT = [-120, -100]; p.cotovelo = [20, 20]; p.baixa = 0; }
      else { p.tronco = -85; p.perna = [-65, -75]; p.joelho = [5, 0]; p.bracoT = [-125, -145]; p.cotovelo = [-10, 0]; p.baixa = 44; }
      break;
  }
  if (f.martelo > 0 && !f.dur && f.acao !== 'caido') { p.bracoT[0] = 40; p.cotovelo[0] = 100; }
  reage(p, a, f);
  return p;
}

// pose do boneco de blocos (estilo Minecraft): braços e pernas retos, giram só no ombro e no quadril.
// torcao = quanto o tronco gira (o braço que bate vem pra frente)
function poseBlocos(f, a, tempo) {
  const vel = f.agachado ? 0 : Math.min(1, Math.abs(a.vx) / 8);
  const c = Math.sin(a.fase), resp = Math.sin(tempo / 450);
  const p = {
    tronco: 3 + vel * 6, bracoT: [lerp(10 + resp * 4, c * 50, vel), lerp(-8 - resp * 4, -c * 50, vel)], cotovelo: [0, 0],
    perna: [lerp(6, -c * 40, vel), lerp(-6, c * 40, vel)], joelho: [0, 0], baixa: 0, giro: 1, torcao: 0,
  };
  const agacha = () => { p.perna = [62, -52]; p.tronco = 22; p.bracoT = [35, 15]; };
  const u = f.dur ? f.t / f.dur : 0, e = curvaGolpe(u), k = Math.max(0, e);
  const ida = (de, ate) => e < 0 ? de + e * 80 : lerp(de, ate, e); // recua antes, depois estica
  if (f.agachado) agacha();
  if (f.y > 0) { const sub = Math.max(-1, Math.min(1, a.vy / 15)); p.perna = [lerp(15, 35, sub), lerp(-20, -5, sub)]; p.bracoT = [lerp(40, 150, sub), lerp(-30, 120, sub)]; p.tronco = 0; }
  if (f.martelo > 0 && !f.dur) p.bracoT[0] = 60;
  switch (f.acao) {
    case 'defesa': p.bracoT = [105, 95]; p.tronco = -4; if (!f.agachado) p.perna = [18, -18]; p.torcao = -0.3; break;
    case 'socoAlto': case 'socoBaixo':
      p.bracoT[0] = ida(10, f.acao === 'socoAlto' ? 92 : 72); p.bracoT[1] = -20 * k; p.torcao = e; p.tronco = 6 + e * 12; p.perna = [22, -22]; break;
    case 'chuteAlto': case 'chuteBaixo':
      p.perna[0] = ida(6, f.acao === 'chuteAlto' ? 118 : 70); p.perna[1] = -12; p.tronco = 4 - e * 28; p.bracoT = [45 * k, -55 * k]; p.torcao = -e * 0.4; break;
    case 'gancho':
      p.bracoT[0] = e < 0 ? -10 + e * 60 : lerp(-10, 178, k); p.bracoT[1] = -30 * k; p.tronco = lerp(22, -14, k); p.torcao = k;
      p.perna = [lerp(55, 5, k), lerp(-45, -8, k)]; break;
    case 'socoAgachado': agacha(); p.bracoT[0] = ida(30, 88); p.torcao = e; break;
    case 'chuteAgachado': agacha(); p.perna[0] = lerp(62, 92, k); p.tronco = 22 - k * 10; break;
    case 'rasteira': agacha(); p.perna = [lerp(62, 95, k), -75]; p.tronco = 38; p.bracoT = [5, -5]; break;
    case 'giro': p.perna[0] = ida(6, 115); p.perna[1] = -10; p.tronco = 4 - e * 40; p.bracoT = [85, -75]; break;
    case 'socoAereo': p.bracoT[0] = ida(60, 105); p.torcao = e; break;
    case 'voadora': { const v = Math.min(1, u / 0.2); p.perna = [lerp(30, 100, v), lerp(-10, -35, v)]; p.tronco = -25 * v; p.bracoT = [100, -40]; break; }
    case 'magia': p.bracoT = [ida(10, 92), ida(10, 88)]; p.tronco = 6 + e * 12; p.perna = [24, -24]; break;
    case 'martelada': p.bracoT[0] = e < 0 ? 170 - e * 60 : lerp(170, 72, e); p.bracoT[1] = p.bracoT[0] - 12; p.tronco = 6 + e * 22; p.perna = [24, -24]; break;
    case 'tonto': { const bal = Math.sin(tempo / 260); p.tronco = -12 + bal * 14; p.bracoT = [-20 + bal * 20, -35 - bal * 20]; p.perna = [10 + bal * 6, -12 + bal * 6]; break; }
    case 'apanhou': p.tronco = -26; p.bracoT = [-45, -65]; p.perna = [12, -22]; break;
    case 'levantando': agacha(); break;
    case 'caido':
      if (f.y > 0) { p.tronco = -60; p.perna = [40, 25]; p.bracoT = [-120, -100]; }
      else { p.tronco = -88; p.perna = [-84, -90]; p.bracoT = [-160, -175]; }
      break;
  }
  if (f.hp === 0 && f.y === 0 && f.acao !== 'tonto') { p.tronco = -88; p.perna = [-84, -90]; p.bracoT = [-160, -175]; }
  // perna reta não dobra: abaixa o quadril pra os dois pés ficarem no chão
  reage(p, a, f);
  const deitado = p.tronco < -80;
  if (deitado) p.baixa = 52;
  else if (f.y === 0) p.baixa = 62 - 64 * Math.cos(rad(Math.min(80, Math.max(Math.abs(p.perna[0]) * (f.acao.startsWith('chute') || f.acao === 'giro' ? 0 : 1), Math.abs(p.perna[1])))));
  return p;
}
const rad = g => g * Math.PI / 180;
// reação a dano (tranco pra trás) e aterrissagem (joelho cede) somadas por cima de qualquer pose
function reage(p, a, f) {
  if (a.dano > 0.02 && f.acao !== 'caido' && f.hp > 0) { p.tronco -= 26 * a.dano; p.bracoT[0] -= 30 * a.dano; p.bracoT[1] -= 30 * a.dano; }
  if (a.squash > 0 && f.y === 0) p.baixa += a.squash * 45;
}

// giro de corpo inteiro (chute giratório e rasteira) em radianos, pro 3D
function giroCorpo(f) {
  const u = f.dur ? f.t / f.dur : 0;
  // acelera e freia (em vez de girar em velocidade constante)
  const ease = x => x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
  if (f.acao === 'giro' && u < 0.45) return ease(u / 0.45) * Math.PI * 2;
  if (f.acao === 'rasteira' && u < 0.4) return ease(u / 0.4) * Math.PI * 2;
  return 0;
}

// juntas do boneco em coordenadas locais (x pra frente, y pra cima, origem no pé) pro renderizador 3D
function juntasLocais(f, i, tempo, dt) {
  const a = anim[i], blocos = st && st.perfis[i] && st.perfis[i].visual === 'blocos';
  aproxima(a, blocos ? poseBlocos(f, a, tempo) : pose(f, a, tempo), dt, f.dur > 0);
  const p = a.cur, sq = a.squash;
  const vai = (o, ang, len) => [o[0] + Math.sin(rad(ang)) * len * (1 + sq * 0.3), o[1] - Math.cos(rad(ang)) * len * (1 - sq * 0.3)];
  const quadril = [0, (62 - p.baixa) * (1 - sq * 0.3)];
  const ombro = vai(quadril, 180 + p.tronco, 58);
  a.cabeca += (p.tronco - (a.dano || 0) * 30 - a.cabeca) * (1 - Math.exp(-dt / 110));
  const j = { quadril, ombro, cabeca: vai(ombro, 180 + a.cabeca, 24), angCabeca: a.cabeca, giro: p.giro, spin: giroCorpo(f), torcao: p.torcao || 0, acao: f.acao, u: f.dur ? f.t / f.dur : 0, flash: a.flash > 0, joelho: [], pe: [], cot: [], mao: [] };
  for (const k of [0, 1]) {
    j.joelho[k] = vai(quadril, p.perna[k], 32); j.pe[k] = vai(j.joelho[k], p.perna[k] + p.joelho[k], 32);
    j.cot[k] = vai(ombro, p.bracoT[k], 30); j.mao[k] = vai(j.cot[k], p.bracoT[k] + p.cotovelo[k], 32);
  }
  j.ponta = vai(j.mao[0], p.bracoT[0] + p.cotovelo[0], 46);
  return j;
}

// mola amortecida por junta: tem inércia e passa um pouco do alvo, em vez de deslizar reto.
// cada parte tem seu ritmo: tronco pesado, braço/antebraço e canela chegam atrasados (follow-through)
const MOLA = { tronco: [0.75, 0.85], baixa: [0.8, 0.9], bracoT: [1, 0.62], cotovelo: [0.85, 0.55], perna: [1, 0.7], joelho: [0.9, 0.6], giro: [1.6, 1], torcao: [0.9, 0.7] };
function aproxima(a, alvo, dt, golpe) {
  if (!a.cur) { a.cur = JSON.parse(JSON.stringify(alvo)); a.vel = {}; return; }
  a.vel = a.vel || {};
  // golpes: mola dura (pose legível); resto: mola solta com balanço
  const w0 = golpe ? 34 : 15, amort = golpe ? 1.05 : 1;
  for (const key in alvo) {
    if (a.cur[key] === undefined) a.cur[key] = JSON.parse(JSON.stringify(alvo[key]));
    const arr = Array.isArray(alvo[key]);
    if (a.vel[key] === undefined) a.vel[key] = arr ? alvo[key].map(() => 0) : 0;
    const [fw, z] = MOLA[key] || [1, 0.8], w = w0 * fw, zeta = Math.min(1, z * amort);
    const passo = (x, v, alv) => {
      // substeps de até 8ms pra mola não explodir com frame lento
      for (let r = dt; r > 0; r -= 8) {
        const h = Math.min(8, r) / 1000;
        v += (w * w * (alv - x) - 2 * zeta * w * v) * h; x += v * h;
      }
      return [x, v];
    };
    if (arr) alvo[key].forEach((alv, j) => { [a.cur[key][j], a.vel[key][j]] = passo(a.cur[key][j], a.vel[key][j], alv); });
    else [a.cur[key], a.vel[key]] = passo(a.cur[key], a.vel[key], alvo[key]);
  }
}

function boneco(f, i, cor, X, Y, s, tempo, dt, opts) {
  const a = (opts && opts.a) || anim[i];
  aproxima(a, (opts ? opts.blocos : st && st.perfis[i] && st.perfis[i].visual === 'blocos') ? poseBlocos(f, a, tempo) : pose(f, a, tempo), dt, f.dur > 0);
  const p = a.cur;
  const x = X(f.x), chao = Y(f.y), d = f.facing;
  const rad = g => g * Math.PI / 180;
  const sq = a.squash; // >0 achata (aterrissagem), <0 estica (pulo)
  const vai = (o, ang, len) => [o[0] + Math.sin(rad(ang)) * len * s * d * p.giro * (1 + sq * 0.3), o[1] + Math.cos(rad(ang)) * len * s * (1 - sq * 0.3)];
  ctx.save();
  const blocos = opts ? opts.blocos : st && st.perfis[i] && st.perfis[i].visual === 'blocos';
  ctx.lineWidth = (blocos ? 15 : 9) * s; ctx.lineCap = blocos ? 'butt' : 'round'; ctx.lineJoin = blocos ? 'miter' : 'round';
  const pintado = a.flash > 0 ? '#fff' : f.estrela > 0 ? 'hsl(' + (tempo / 3 % 360) + ',95%,60%)' : cor;
  ctx.fillStyle = '#0005'; ctx.beginPath(); ctx.ellipse(x, Y(0) + 2 * s, 35 * s * Math.max(0.4, 1 - f.y / 250), 7 * s, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = pintado; ctx.fillStyle = pintado;
  const quadril = [x, chao - (62 - p.baixa) * s * (1 - sq * 0.3)];
  const ombro = vai(quadril, 180 + p.tronco, 58);
  const curva = (p0, p1, p2) => { ctx.beginPath(); ctx.moveTo(...p0); ctx.quadraticCurveTo(...p1, ...p2); ctx.stroke(); };
  for (const k of [1, 0]) {
    ctx.globalAlpha = k ? 0.6 : 1;
    const joelho = vai(quadril, p.perna[k], 32), pe = vai(joelho, p.perna[k] + p.joelho[k], 32);
    curva(quadril, joelho, pe);
    const cot = vai(ombro, p.bracoT[k], 30), mao = vai(cot, p.bracoT[k] + p.cotovelo[k], 32);
    curva(ombro, cot, mao);
    ctx.beginPath(); ctx.arc(...mao, 7 * s, 0, 7); ctx.fill();
    if (k === 0 && f.martelo > 0) { // martelo na mão da frente
      const ang = p.bracoT[0] + p.cotovelo[0], ponta = vai(mao, ang, 46);
      ctx.save(); ctx.globalAlpha = f.martelo < 60 && Math.floor(tempo / 120) % 2 ? 0.4 : 1;
      ctx.strokeStyle = '#92400e'; ctx.lineWidth = 6 * s; curva(mao, mao, ponta);
      ctx.strokeStyle = '#6b7280'; ctx.lineWidth = 20 * s; ctx.lineCap = 'butt'; curva(vai(ponta, ang + 90, 16), ponta, vai(ponta, ang - 90, 16));
      ctx.restore(); ctx.strokeStyle = pintado; ctx.fillStyle = pintado;
    }
  }
  ctx.globalAlpha = 1;
  const meio = vai(quadril, 180 + p.tronco * 0.5, 29);
  curva(quadril, [meio[0] - 3 * s * d, meio[1]], ombro);
  // cabeça com atraso (balança depois do corpo)
  a.cabeca += (p.tronco - (a.dano || 0) * 30 - a.cabeca) * (1 - Math.exp(-dt / 110));
  const cabeca = vai(ombro, 180 + a.cabeca, 24);
  if (f.decapitado) return ctx.restore(); // fatality: a cabeça saiu voando
  if (blocos) ctx.fillRect(cabeca[0] - 16 * s, cabeca[1] - 16 * s, 32 * s, 32 * s);
  else { ctx.beginPath(); ctx.arc(...cabeca, 19 * s, 0, 7); ctx.fill(); }
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 3 * s;
  const ox = cabeca[0] + 8 * s * d * p.giro, oy = cabeca[1] - 3 * s;
  const L = (p1, p2) => { ctx.beginPath(); ctx.moveTo(...p1); ctx.lineTo(...p2); ctx.stroke(); };
  if (f.hp === 0 && f.acao !== 'tonto') { L([ox - 4 * s, oy - 4 * s], [ox + 4 * s, oy + 4 * s]); L([ox + 4 * s, oy - 4 * s], [ox - 4 * s, oy + 4 * s]); }
  else if (p.giro > 0) {
    const pisca = (tempo + i * 1700) % 3200 < 120;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(ox, oy, 4 * s, pisca ? 0.8 * s : 4 * s, 0, 0, 7); ctx.fill();
  }
  ctx.restore();
}

const EMOJI = { comida: '🍗', estrela: '⭐', martelo: '🔨' };
function desenhaItens(vis, X, Y, s, tempo) {
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const it of vis.itens) {
    if (it.vida < 90 && Math.floor(tempo / 100) % 2) continue; // pisca antes de sumir
    const bob = it.y === 0 ? Math.sin(tempo / 250 + it.id) * 4 : 0;
    ctx.fillStyle = '#0005'; ctx.beginPath(); ctx.ellipse(X(it.x), Y(0) + 2 * s, 16 * s, 4 * s, 0, 0, 7); ctx.fill();
    ctx.font = 34 * s + 'px system-ui'; ctx.fillText(EMOJI[it.tipo], X(it.x), Y(it.y + 20 + bob));
  }
  ctx.textBaseline = 'alphabetic';
  // brilho da estrela em volta de quem está invencível
  vis.p.forEach(f => { if (f.estrela > 0) for (let j = 0; j < 3; j++) {
    const ang = tempo / 200 + j * 2.1; ctx.font = 14 * s + 'px Orbitron, system-ui';
    ctx.fillText('✨', X(f.x + Math.cos(ang) * 40), Y(f.y + 80 + Math.sin(ang) * 60));
  } });
}

function magias(vis, X, Y, s, tempo) {
  for (const m of vis.magias) {
    const x = X(m.x), y = Y(m.y), r = 16 * s * (1 + Math.sin(tempo / 60) * 0.15);
    for (let j = 1; j <= 4; j++) { ctx.globalAlpha = 0.25 / j; ctx.fillStyle = CORES[m.dono]; ctx.beginPath(); ctx.arc(x - m.dir * j * 14 * s, y, r * (1 - j * 0.15), 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 1.6);
    g.addColorStop(0, '#fff'); g.addColorStop(0.35, '#fde047'); g.addColorStop(0.7, CORES[m.dono]); g.addColorStop(1, '#0000');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 1.6, 0, 7); ctx.fill();
  }
}

function atualizaAnim(vis, dt, P, s) {
  vis.p.forEach((f, i) => {
    const a = anim[i];
    const vxAgora = a.xAnt === null || dt === 0 ? 0 : (f.x - a.xAnt) / dt * 33;
    a.vx += (vxAgora - a.vx) * (1 - Math.exp(-dt / 60)); a.xAnt = f.x;
    a.fase += Math.abs(a.vx) * 0.11 * dt / 33;
    const vyAgora = dt ? (f.y - a.yAnt) / dt * 33 : 0;
    if (a.yAnt > 0 && f.y === 0 && a.vy < -4) { a.squash = 0.35; SOM.pouso(); } // aterrissou
    if (a.yAnt === 0 && f.y > 0) { a.squash = -0.25; SOM.pulo(); } // pulou
    if (f.acao !== a.acaoAnt) { // golpe começando
      if (f.acao === 'magia') SOM.magia();
      else if (/^(soco|chute|gancho|rasteira|giro|voadora|martelada)/.test(f.acao)) SOM.golpe(/chuteAlto|gancho|giro|voadora|martelada|rasteira/.test(f.acao));
      if (f.acao === 'caido') SOM.queda();
      a.acaoAnt = f.acao;
    }
    if (f.decapitado && !a.decapAnt) SOM.corte();
    a.decapAnt = f.decapitado;
    a.vy = vyAgora; a.yAnt = f.y;
    a.squash *= Math.exp(-dt / 70);
    a.flash = Math.max(0, a.flash - dt);
    a.dano *= Math.exp(-dt / 160);
    if (f.hp < a.hp) {
      const forte = a.hp - f.hp > 1;
      if (f.acao === 'defesa') SOM.defesa(); else SOM.acerto(forte);
      a.dano = forte ? 1 : 0.6; parada = forte ? 90 : 50;
      a.flash = forte ? 90 : 0; tremor = forte ? Math.min(18, 4 + (a.hp - f.hp)) : 3;
      for (let n = 0; n < (forte ? 16 : 6); n++) faiscas.push({ x: f.x - f.facing * 15, y: f.y + (f.agachado ? 50 : 95), vx: (Math.random() - 0.5) * 14, vy: Math.random() * 12, vida: 1, cor: forte ? '#fde047' : '#93c5fd' });
      if (!opc.tremor) tremor = 0;
      if (forte && +eu === i && opc.vibrar && navigator.vibrate) navigator.vibrate(60);
    }
    if (f.hp > a.hp) a.fantasma = f.hp; // rodada nova
    a.hp = f.hp;
    // pedaço amarelo da barra que some devagar mostrando o dano
    if (a.fantasma > f.hp) a.fantasma = Math.max(f.hp, a.fantasma - dt * 0.02);
  });
  faiscas = faiscas.filter(p => (p.vida -= dt / 400) > 0);
  faiscas.forEach(p => { const k = dt / 33; p.x += p.vx * k; p.y += p.vy * k; p.vy -= 0.8 * k; ctx.globalAlpha = p.vida; ctx.fillStyle = p.cor; ctx.beginPath(); const [px, py] = P(p.x, p.y); ctx.arc(px, py, 5 * s * p.vida, 0, 7); ctx.fill(); });
  ctx.globalAlpha = 1;
}

function barras(vis, ox, s, agora) {
  const bw = 300 * s, by = 14 * s, bh = 26 * s;
  const borda = (i, v) => { const M = vis.p[i].vidaMax || VIDA; return i === 0 ? ox + 20 * s + bw * v / M : ox + 780 * s - bw * v / M; };
  vis.p.forEach((f, i) => {
    const a = anim[i], bx = i === 0 ? ox + 20 * s : ox + 780 * s - bw;
    const M = f.vidaMax || VIDA, larg = v => bw * v / M, pos = v => i === 0 ? bx : bx + bw - larg(v);
    ctx.fillStyle = '#0008'; ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = '#fde047'; ctx.fillRect(pos(a.fantasma), by, larg(a.fantasma), bh);
    ctx.fillStyle = f.hp > 30 ? CORES[i] : '#f59e0b'; ctx.fillRect(pos(f.hp), by, larg(f.hp), bh);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2 * s; ctx.strokeRect(bx, by, bw, bh);
    ctx.font = 'bold ' + 17 * s + 'px Orbitron, system-ui'; ctx.textAlign = i === 0 ? 'left' : 'right'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 3 * s; ctx.strokeStyle = '#0009';
    const txt = f.hp + ' / ' + M, tx = i === 0 ? bx + 8 * s : bx + bw - 8 * s;
    ctx.strokeText(txt, tx, by + bh / 2); ctx.fillStyle = '#fff'; ctx.fillText(txt, tx, by + bh / 2);
  });
  // medalhas de rounds vencidos embaixo da barra (estilo Mortal Kombat)
  if (st.vitorias) [0, 1].forEach(i => { for (let n = 0; n < st.vitorias[i]; n++) {
    const mx = i === 0 ? ox + 32 * s + n * 26 * s : ox + 768 * s - n * 26 * s, my = by + bh + 14 * s;
    ctx.beginPath(); ctx.arc(mx, my, 9 * s, 0, Math.PI * 2); ctx.fillStyle = '#facc15'; ctx.fill();
    ctx.lineWidth = 2 * s; ctx.strokeStyle = '#000'; ctx.stroke();
    ctx.fillStyle = '#b91c1c'; ctx.font = 'bold ' + 11 * s + 'px Orbitron, system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('★', mx, my + 1 * s);
  } });
  // números de dano saindo da ponta da barra
  numeros = numeros.filter(n => agora - n.ini < 1100);
  numeros.forEach(n => {
    const age = (agora - n.ini) / 1100, bx = borda(n.p, anim[n.p].hp);
    ctx.globalAlpha = 1 - age * age; ctx.textAlign = 'center';
    ctx.font = 'bold ' + (Math.abs(n.n) > 1 ? 26 : 18) * s * (1 + 0.4 * Math.exp(-age * 10)) + 'px Orbitron, system-ui';
    ctx.lineWidth = 4 * s; ctx.strokeStyle = '#000';
    const ty = by + bh + 22 * s + age * 30 * s, t = n.n < 0 ? '+' + -n.n : '-' + n.n;
    ctx.strokeText(t, bx, ty); ctx.fillStyle = n.n < 0 ? '#4ade80' : n.n > 1 ? '#fde047' : '#93c5fd'; ctx.fillText(t, bx, ty);
  });
  ctx.globalAlpha = 1; ctx.textBaseline = 'alphabetic';
}

// buffer de estados: desenha ~1 tick no passado e interpola entre dois estados
const snaps = [];
function interpolado(agora) {
  const alvo = agora - 50;
  while (snaps.length > 2 && snaps[1].t <= alvo) snaps.shift();
  const [A, B] = snaps;
  if (!B || alvo <= A.t) return A.st;
  const u = Math.min(1, (alvo - A.t) / (B.t - A.t));
  return { ...B.st,
    p: B.st.p.map((fb, i) => {
      const fa = A.st.p[i], mesma = fa.acao === fb.acao && fb.t >= fa.t;
      return { ...fb, x: lerp(fa.x, fb.x, u), y: lerp(fa.y, fb.y, u), t: mesma ? lerp(fa.t, fb.t, u) : fb.t };
    }),
    itens: B.st.itens.map(ib => { const ia = A.st.itens.find(i => i.id === ib.id); return ia ? { ...ib, y: lerp(ia.y, ib.y, u) } : ib; }),
    magias: B.st.magias.map(mb => { const ma = A.st.magias.find(m => m.dono === mb.dono); return ma ? { ...mb, x: lerp(ma.x, mb.x, u) } : mb; }),
  };
}

// cenário: templo no pôr do sol. Parte fixa desenhada uma vez num canvas separado; fogo, nuvens e brasas animados
let fundo = null, fundoKey = '', brasas = [];
function pagode(c, x, base, e, cor) {
  c.fillStyle = cor;
  let y = base, larg = 70 * e;
  for (let n = 0; n < 4; n++) {
    const alt = 26 * e;
    c.fillRect(x - larg * 0.35, y - alt, larg * 0.7, alt); // parede
    c.beginPath(); // telhado com pontas curvadas
    c.moveTo(x - larg * 0.75, y - alt - 2 * e); c.quadraticCurveTo(x - larg * 0.5, y - alt + 4 * e, x - larg * 0.3, y - alt - 14 * e);
    c.lineTo(x + larg * 0.3, y - alt - 14 * e); c.quadraticCurveTo(x + larg * 0.5, y - alt + 4 * e, x + larg * 0.75, y - alt - 2 * e);
    c.closePath(); c.fill();
    y -= alt + 14 * e; larg *= 0.8;
  }
  c.fillRect(x - 2 * e, y - 22 * e, 4 * e, 22 * e); // ponta
}
function montaFundo(w, h, s, X, Y) {
  fundo = document.createElement('canvas'); fundo.width = w; fundo.height = h;
  const c = fundo.getContext('2d');
  let seed = 7; const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
  const ceu = c.createLinearGradient(0, 0, 0, Y(0));
  ceu.addColorStop(0, '#1e1b4b'); ceu.addColorStop(0.45, '#9d174d'); ceu.addColorStop(0.8, '#f97316'); ceu.addColorStop(1, '#fdba74');
  c.fillStyle = ceu; c.fillRect(0, 0, w, h);
  // estrelinhas no alto
  c.fillStyle = '#fff';
  for (let n = 0; n < 60; n++) { c.globalAlpha = rnd() * 0.7; c.fillRect(rnd() * w, rnd() * Y(260), 2 * s * rnd() + 1, 2 * s * rnd() + 1); }
  c.globalAlpha = 1;
  // sol
  const sx = X(400), sy = Y(150), sol = c.createRadialGradient(sx, sy, 0, sx, sy, 160 * s);
  sol.addColorStop(0, '#fff7ed'); sol.addColorStop(0.25, '#fde047'); sol.addColorStop(0.5, '#fb923c88'); sol.addColorStop(1, '#f9731600');
  c.fillStyle = sol; c.fillRect(0, 0, w, h);
  // montanhas: longe (clara) e perto (escura)
  for (const [cor, altMin, altVar, passo] of [['#7e2253', 70, 110, 60], ['#4a1530', 30, 70, 45]]) {
    c.fillStyle = cor; c.beginPath(); c.moveTo(0, Y(0));
    for (let x = -60; x <= 860; x += passo * (0.6 + rnd() * 0.8)) c.lineTo(X(x), Y(altMin + rnd() * altVar));
    c.lineTo(w, Y(0)); c.lineTo(w, Y(0)); c.closePath(); c.fill();
  }
  pagode(c, X(130), Y(0), s * 1.1, '#2a0a1c');
  pagode(c, X(690), Y(0), s * 0.9, '#2a0a1c');
  pagode(c, X(470), Y(0), s * 0.55, '#3b0f28');
  // chão de pedra
  const chao = c.createLinearGradient(0, Y(0), 0, h);
  chao.addColorStop(0, '#57351f'); chao.addColorStop(1, '#2b1a0f');
  c.fillStyle = chao; c.fillRect(0, Y(0), w, h - Y(0));
  c.strokeStyle = '#0004'; c.lineWidth = 2 * s;
  const fundoChao = h - Y(0);
  for (let r = 1; r <= 3; r++) { const y = Y(0) + fundoChao * r / 3.2; c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
  for (let x = -400; x <= 1200; x += 70) { c.beginPath(); c.moveTo(X(400 + (x - 400) * 0.8), Y(0)); c.lineTo(X(400 + (x - 400) * 1.4), h); c.stroke(); }
  c.fillStyle = '#fde04722'; c.fillRect(0, Y(0), w, 3 * s); // brilho na borda do chão
  // postes das tochas
  for (const tx of [40, 760]) { c.fillStyle = '#1c0a12'; c.fillRect(X(tx) - 6 * s, Y(110), 12 * s, 110 * s); c.fillRect(X(tx) - 14 * s, Y(112), 28 * s, 8 * s); }
}
function cenario(w, h, s, X, Y, t) {
  if (!w || !h) return; // canvas escondido (tela de escolha)
  const key = w + 'x' + h;
  if (key !== fundoKey) { fundoKey = key; montaFundo(w, h, s, X, Y); }
  ctx.drawImage(fundo, 0, 0);
  // nuvens passando
  ctx.fillStyle = '#fed7aa'; 
  for (let n = 0; n < 4; n++) {
    const x = X(((t / 60 * (0.4 + n * 0.15) + n * 260) % 1100) - 150), y = Y(230 + n * 18);
    ctx.globalAlpha = 0.18;
    for (let j = 0; j < 4; j++) { ctx.beginPath(); ctx.ellipse(x + j * 28 * s, y + Math.sin(j * 2) * 5 * s, 40 * s, 12 * s, 0, 0, 7); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
  // tochas com fogo tremendo
  for (const tx of [40, 760]) {
    const fx = X(tx), fy = Y(122), tremida = Math.sin(t / 70 + tx) * 0.15 + Math.sin(t / 37) * 0.1;
    const luz = ctx.createRadialGradient(fx, fy, 0, fx, fy, 110 * s * (1 + tremida * 0.5));
    luz.addColorStop(0, '#fdba7466'); luz.addColorStop(1, '#f9731600');
    ctx.fillStyle = luz; ctx.fillRect(fx - 120 * s, fy - 120 * s, 240 * s, 240 * s);
    for (const [cor, esc] of [['#dc2626', 1], ['#f97316', 0.75], ['#fde047', 0.45]]) {
      ctx.fillStyle = cor; ctx.beginPath();
      const alt = 38 * s * esc * (1 + tremida), larg = 13 * s * esc;
      ctx.moveTo(fx - larg, fy); ctx.quadraticCurveTo(fx - larg, fy - alt * 0.6, fx + tremida * 20 * s, fy - alt);
      ctx.quadraticCurveTo(fx + larg, fy - alt * 0.6, fx + larg, fy); ctx.closePath(); ctx.fill();
    }
    if (Math.random() < 0.15) brasas.push({ x: tx + (Math.random() - 0.5) * 16, y: 125, vx: (Math.random() - 0.5) * 0.6, vida: 1 });
  }
  brasas = brasas.filter(b => (b.vida -= 0.012) > 0);
  ctx.fillStyle = '#fde047';
  for (const b of brasas) { b.y += 1.4; b.x += b.vx + Math.sin(t / 300 + b.y / 20) * 0.4; ctx.globalAlpha = b.vida; ctx.fillRect(X(b.x), Y(b.y), 3 * s, 3 * s); }
  ctx.globalAlpha = 1;
}

// fatality: o perdedor explode em pedaços e a tela escurece em vermelho
let pedacos = [], explodiuAnt = [false, false];
function fatality(vis, w, h, s, P, dt) {
  vis.p.forEach((f, i) => {
    if (f.explodiu && !explodiuAnt[i]) {
      SOM.explosao();
      tremor = 25;
      const cor = CORES[i];
      for (let n = 0; n < 7; n++) pedacos.push({ x: f.x, y: f.y + 40 + Math.random() * 80, vx: (Math.random() - 0.5) * 18, vy: 10 + Math.random() * 14, giro: Math.random() * 6, vg: (Math.random() - 0.5) * 0.5, tam: n === 0 ? 0 : 26 + Math.random() * 14, cor, cabeca: n === 0 });
      for (let n = 0; n < 60; n++) pedacos.push({ x: f.x, y: f.y + 70, vx: (Math.random() - 0.5) * 24, vy: 4 + Math.random() * 20, sangue: true, tam: 3 + Math.random() * 5 });
    }
    explodiuAnt[i] = !!f.explodiu;
  });
  if (!st.fatality) { pedacos = []; return; }
  ctx.fillStyle = 'rgba(80,0,0,.45)'; ctx.fillRect(0, 0, w, h);
  const k = dt / 33;
  for (const q of pedacos) {
    if (q.y > 0 || q.vy > 0) { q.x += q.vx * k; q.y += q.vy * k; q.vy -= 1.3 * k; q.giro += (q.vg || 0) * k; }
    if (q.y <= 0) { q.y = 0; q.vy = 0; q.vx *= 0.7; q.vg = 0; }
    const [px, py] = P(q.x, q.y);
    ctx.save(); ctx.translate(px, py);
    if (q.sangue) { ctx.fillStyle = '#b91c1c'; ctx.beginPath(); ctx.ellipse(0, 0, q.tam * s * (q.y ? 1 : 2.2), q.tam * s * (q.y ? 1 : 0.5), 0, 0, 7); ctx.fill(); }
    else {
      ctx.rotate(q.giro); ctx.fillStyle = ctx.strokeStyle = q.cor;
      if (q.cabeca) { ctx.beginPath(); ctx.arc(0, 0, 18 * s, 0, 7); ctx.fill(); }
      else { ctx.lineWidth = 9 * s; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-q.tam / 2 * s, 0); ctx.lineTo(q.tam / 2 * s, 0); ctx.stroke(); ctx.fillStyle = '#b91c1c'; ctx.beginPath(); ctx.arc(q.tam / 2 * s, 0, 4 * s, 0, 7); ctx.fill(); }
    }
    ctx.restore();
  }
}

let ultimo = performance.now();
function desenha() {
  const agora = performance.now(), dt = Math.min(50, agora - ultimo); ultimo = agora;
  const w = cv.width = cv.clientWidth * devicePixelRatio, h = cv.height = cv.clientHeight * devicePixelRatio;
  const s = Math.min(w / 800, h / 320);
  const ox = (w - 800 * s) / 2, chaoY = h - 30 * s;
  const X = x => ox + x * s, Y = y => chaoY - y * s;
  const usa3d = opc.modo3d && window.R3D;
  $('#c3').classList.toggle('hide', !usa3d);
  ctx.save();
  if (usa3d) ctx.clearRect(0, 0, w, h); // o 3D fica embaixo, este canvas vira só o HUD
  else {
    if (tremor > 0) ctx.translate((Math.random() - .5) * tremor * s, (Math.random() - .5) * tremor * s);
    cenario(w, h, s, X, Y, agora);
  }
  if (!st || !snaps.length) return ctx.restore();
  const vis = interpolado(agora);
  const dtA = parada > 0 ? 0 : dt; parada = Math.max(0, parada - dt);
  let P;
  if (usa3d) {
    R3D.frame(vis, vis.p.map((f, i) => juntasLocais(f, i, agora, dtA)), st.perfis, agora, tremor);
    P = (x, y) => R3D.projeta(x, y, w, h);
  } else {
    vis.p.forEach((f, i) => { if (!f.explodiu) boneco(f, i, CORES[i], X, Y, s, agora, dtA); });
    magias(vis, X, Y, s, agora);
    desenhaItens(vis, X, Y, s, agora);
    P = (x, y) => [X(x), Y(y)];
  }
  if (tremor > 0) { tremor *= 0.85; if (tremor < .5) tremor = 0; }
  atualizaAnim(vis, dt, P, s);
  ctx.restore();
  fatality(vis, w, h, s, P, dt);
  barras(vis, ox, s, agora);
  if (window.FAT) FAT.hud(ctx, vis, P, w, h, s, agora);
  ctx.fillStyle = '#fff'; ctx.font = 'bold ' + 24 * s + 'px Orbitron, system-ui'; ctx.textAlign = 'center';
  ctx.font = 'bold ' + 30 * s + 'px Orbitron, system-ui'; ctx.fillStyle = st.tempo <= 10 ? '#ef4444' : '#fff';
  ctx.fillText(st.tempo != null ? st.tempo : '', ox + 400 * s, 38 * s);
  ctx.fillStyle = '#fff'; ctx.font = 'bold ' + 14 * s + 'px Orbitron, system-ui';
  ctx.fillText('Lutas ' + st.placar[0] + ' × ' + st.placar[1], ox + 400 * s, 60 * s);
  ctx.font = 'bold ' + 16 * s + 'px Orbitron, system-ui';
  if (modoLocal) vis.p.forEach((f, i) => ctx.fillText(i ? '🎮 CONTROLE' : '⌨️ TECLADO', ...P(f.x, f.y + 175)));
  else if (eu !== null) { const f = vis.p[+eu]; ctx.fillText('VOCÊ', ...P(f.x, f.y + 175)); }
  const mostrandoPopup = popup && agora - popup.ini < 1300;
  if (mostrandoPopup) {
    const age = agora - popup.ini, esc = 1 + 0.5 * Math.exp(-age / 90);
    ctx.globalAlpha = Math.min(1, (1300 - age) / 300);
    ctx.font = 'italic 900 ' + 54 * s * esc + 'px Orbitron, system-ui'; ctx.lineWidth = 8 * s; ctx.strokeStyle = '#000';
    ctx.strokeText(popup.txt, w / 2, h * 0.32); ctx.fillStyle = /FATALITY|FINISH/.test(popup.txt) ? '#dc2626' : '#facc15'; ctx.fillText(popup.txt, w / 2, h * 0.32);
    ctx.globalAlpha = 1;
  }
  const nome = v => v === 1 ? 'VERMELHO' : 'AZUL';
  if (st.campeao && !mostrandoPopup) { // fim da luta (melhor de 3)
    ctx.fillStyle = '#000a'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#facc15'; ctx.font = 'bold ' + 52 * s + 'px Orbitron, system-ui';
    ctx.fillText(!modoLocal && st.campeao - 1 === +eu ? 'VOCÊ VENCEU!' : nome(st.campeao) + ' VENCEU!', w / 2, h * 0.38);
    ctx.fillStyle = '#fff'; ctx.font = 'bold ' + 18 * s + 'px Orbitron, system-ui';
    if (st.fatality) { ctx.fillStyle = '#dc2626'; ctx.font = 'italic 900 ' + 30 * s + 'px Orbitron, system-ui'; ctx.fillText('FATALITY', w / 2, h * 0.38 - 52 * s); }
    ctx.fillStyle = '#fff'; ctx.font = 'bold ' + 18 * s + 'px Orbitron, system-ui';
    ctx.fillText('Rounds ' + st.vitorias[0] + ' × ' + st.vitorias[1] + ' · 🌳 +1 ponto de habilidade pro ' + (st.campeao === 1 ? 'Vermelho' : 'Azul'), w / 2, h * 0.38 + 36 * s);
  } else if (st.vencedor && !mostrandoPopup && !st.finish) { // fim de um round: o próximo começa sozinho
    ctx.fillStyle = '#facc15'; ctx.font = 'bold ' + 40 * s + 'px Orbitron, system-ui'; ctx.lineWidth = 6 * s; ctx.strokeStyle = '#000';
    const t = st.vencedor === 3 ? 'EMPATE' : nome(st.vencedor) + ' VENCE O ROUND';
    ctx.strokeText(t, w / 2, h * 0.36); ctx.fillText(t, w / 2, h * 0.36);
  }
  $('#fim').classList.toggle('hide', !st.campeao || eu === null);
}
function somMsg(t) {
  if (t === 'FATALITY!') SOM.falaFatality();
  else if (/FATALITY/.test(t)) SOM.fatality();
  else if (/^ROUND/.test(t)) SOM.round();
  else if (/LUTE/.test(t)) SOM.lute();
  else if (/FINISH/.test(t)) SOM.finishHim();
  else if (/COMIDA/.test(t)) SOM.comida();
  else if (/ESTRELA/.test(t)) SOM.estrela();
  else if (/MARTELO/.test(t)) SOM.martelo();
  else if (/EMPATE/.test(t)) SOM.empate();
  else SOM.anuncio();
}
let tempoAnt = null, vencedorAnt = null, campeaoAnt = null;
new EventSource('/eventos').onmessage = e => {
  st = JSON.parse(e.data);
  if (st.tempo !== tempoAnt && st.tempo != null && st.tempo <= 10 && st.tempo > 0 && !st.vencedor) SOM.tique(st.tempo <= 5);
  if (st.vencedor && !vencedorAnt && st.vencedor !== 3 && !st.finish) SOM.vitoriaRound();
  if (st.campeao && !campeaoAnt) SOM.campeao();
  tempoAnt = st.tempo; vencedorAnt = st.vencedor; campeaoAnt = st.campeao;
  // música só durante a luta (não na escolha de personagem nem na tela de campeão)
  SOM.musica(eu !== null && !st.campeao);
  snaps.push({ t: performance.now(), st }); if (snaps.length > 10) snaps.shift();
  if (st.msg && st.msg.id !== ultimoMsg) { ultimoMsg = st.msg.id; somMsg(st.msg.txt); if (!/FATALITY|FINISH/.test(st.msg.txt)) popup = { txt: st.msg.txt, ini: performance.now() }; }
  for (const d of st.danos) if (d.id > ultimoDano) { ultimoDano = d.id; if (opc.numeros) numeros.push({ p: d.p, n: d.n, ini: performance.now() }); }
};
// controle (Gamepad API, mapeamento padrão Xbox/XInput)
// direcional ou analógico esquerdo = mover · Y = soco alto · X = soco baixo · B = chute alto · A = chute baixo · LB/RB/LT/RT = defesa
const BOTOES = { 9: 'menu', 3: 'socoAlto', 2: 'socoBaixo', 1: 'chuteAlto', 0: 'chuteBaixo', 4: 'defesa', 5: 'defesa', 6: 'defesa', 7: 'defesa', 12: 'pulo', 13: 'baixo', 14: 'esq', 15: 'dir' };
let controleAnt = {};
function lerControle() {
  const gp = [...(navigator.getGamepads ? navigator.getGamepads() : [])].find(Boolean);
  if (eu !== null && !usaControle()) return;
  $('#gp').classList.toggle('hide', !gp);
  if (!gp) return;
  const agora = {};
  for (const i in BOTOES) if (gp.buttons[i] && gp.buttons[i].pressed) agora[BOTOES[i]] = true;
  const [ax, ay] = gp.axes;
  if (ax < -0.5) agora.esq = true;
  if (ax > 0.5) agora.dir = true;
  if (ay < -0.6) agora.pulo = true;
  if (ay > 0.6) agora.baixo = true;
  if (agora.menu && !controleAnt.menu && eu !== null) { menuAberto ? fechaMenu() : abreMenu(); controleAnt = agora; return; }
  if (menuAberto) { // navegação do menu no controle
    const borda = k => agora[k] && !controleAnt[k];
    const bs = [...$('#menuCaixa').querySelectorAll('button')];
    if (borda('baixo') || borda('dir')) { foco = (foco + 1) % bs.length; desenhaMenu(); }
    if (borda('pulo') || borda('esq')) { foco = (foco - 1 + bs.length) % bs.length; desenhaMenu(); }
    if (borda('chuteBaixo') && bs[foco]) bs[foco].click();
    if (borda('chuteAlto')) acaoMenu(pagina === 'principal' ? 'continuar' : 'voltar');
    controleAnt = agora; return;
  }
  if (eu === null) { // na tela de escolha: qualquer botão abre o modo teclado vs controle
    if (Object.keys(agora).length && !Object.keys(controleAnt).length) { entrada = 'controle'; sessionStorage.setItem('entrada', entrada); marcaEntrada(); }
  } else {
    for (const k of new Set([...Object.keys(agora), ...Object.keys(controleAnt)])) if (!!agora[k] !== !!controleAnt[k]) envia(k, !!agora[k], modoLocal ? 1 : +eu);
    if (st && st.campeao && agora.socoAlto && !controleAnt.socoAlto) fetch('/reset', { method: 'POST' });
    if (st && st.campeao && agora.chuteAlto && !controleAnt.chuteAlto) trocaPersonagem();
  }
  controleAnt = agora;
}
// ---------- menu, árvore de habilidades e configurações ----------
const ARVORE = [
  { ramo: '💪 Força', itens: [
    { id: 'punho', ic: '👊', nome: 'Punho de Ferro', desc: 'Socos +20% de dano' },
    { id: 'chutePesado', ic: '🦵', nome: 'Chute Pesado', desc: 'Chutes +20% de dano' },
    { id: 'fogoDuplo', ic: '🔥', nome: 'Fogo Forte', desc: 'Bola de fogo mais rápida e com 15 de dano' } ] },
  { ramo: '🛡 Defesa', itens: [
    { id: 'pele', ic: '🦏', nome: 'Pele Grossa', desc: '+15 de vida máxima' },
    { id: 'defesaFirme', ic: '🧱', nome: 'Defesa Firme', desc: 'Defender não perde vida' },
    { id: 'regen', ic: '❤️', nome: 'Regeneração', desc: 'Recupera 1 de vida a cada 2s' } ] },
  { ramo: '⚡ Agilidade', itens: [
    { id: 'pes', ic: '👟', nome: 'Pés Ligeiros', desc: 'Anda 20% mais rápido' },
    { id: 'puloDuplo', ic: '🦘', nome: 'Pulo Duplo', desc: 'Aperte pular de novo no ar' },
    { id: 'levanta', ic: '🤸', nome: 'Levanta Rápido', desc: 'Fica menos tempo caído' } ] },
];
const opc = Object.assign({ modo3d: true, botoes: true, vibrar: true, tremor: true, numeros: true, sangue: true }, (() => { try { return JSON.parse(localStorage.getItem('opc')) || {}; } catch { return {}; } })());
function aplicaOpc() { $('#ctrl').classList.toggle('hide', !opc.botoes); }
function salvaOpc() { try { localStorage.setItem('opc', JSON.stringify(opc)); } catch {} aplicaOpc(); }
const post = (u, b) => fetch(u, { method: 'POST', body: JSON.stringify(b) });
let menuAberto = false, pagina = 'principal', abaSkill = 0, foco = 0;
function soltaTudo() {
  for (const p of modoLocal ? [0, 1] : [+eu]) for (const k of ['esq', 'dir', 'pulo', 'baixo', 'defesa', 'socoAlto', 'socoBaixo', 'chuteAlto', 'chuteBaixo']) envia(k, false, p);
  document.querySelectorAll('.btn.on').forEach(b => b.classList.remove('on'));
}
function abreMenu() { menuAberto = true; pagina = 'principal'; foco = 0; soltaTudo(); desenhaMenu(); $('#menu').classList.remove('hide'); }
function fechaMenu() { menuAberto = false; $('#menu').classList.add('hide'); }
$('#menuBtn').onclick = abreMenu;
function desenhaMenu() {
  const c = $('#menuCaixa'), bt = (a, t, cls = 'mb') => '<button class="' + cls + '" data-a="' + a + '">' + t + '</button>';
  if (pagina === 'principal') c.innerHTML = '<h2>⏸ Menu</h2>' + bt('continuar', '▶ Continuar') + bt('skills', '🌳 Árvore de habilidades') + bt('pers', '🧍 Personagem') + bt('config', '⚙️ Configurações') + bt('finish', '💀 Simular FINISH HIM') + bt('sair', '🚪 Sair do jogo');
  if (pagina === 'skills') {
    const pf = st ? st.perfis[abaSkill] : { pontos: 0, skills: [] };
    c.innerHTML = '<h2>🌳 Árvore de habilidades</h2><div class="abas">' + bt('aba0', '🔴 Vermelho', 'mb' + (abaSkill === 0 ? ' sel' : '')) + bt('aba1', '🔵 Azul', 'mb' + (abaSkill === 1 ? ' sel' : '')) + '</div>'
      + '<p style="text-align:center;margin:8px 0">Pontos: <b style="color:#facc15;font-size:24px">' + pf.pontos + '</b> &nbsp;·&nbsp; cada vitória = 1 ponto</p><div class="arvore">'
      + ARVORE.map(r => '<div class="ramo"><h3>' + r.ramo + '</h3>' + r.itens.map((sk, j) => {
          const tem = pf.skills.includes(sk.id), req = j === 0 || pf.skills.includes(r.itens[j - 1].id), pode = !tem && req && pf.pontos > 0;
          const status = tem ? '✅ aprendida' : !req ? '🔒 aprenda a de cima' : pode ? '⭐ aprender (1 ponto)' : 'precisa de 1 ponto';
          return (j ? '<div class="seta">⬇</div>' : '') + bt('sk:' + sk.id, '<b>' + sk.ic + '</b>' + sk.nome + '<br><small>' + sk.desc + '</small><br><small>' + status + '</small>', 'sk ' + (tem ? 'tem' : pode ? 'pode' : !req ? 'bloq' : ''));
        }).join('') + '</div>').join('') + '</div>'
      + '<p style="font-size:12px;opacity:.7;text-align:center">Vida extra começa a valer na próxima luta.</p>'
      + bt('resetSk', '♻️ Devolver pontos e esquecer habilidades') + bt('voltar', '⬅ Voltar');
  }
  if (pagina === 'pers') {
    const vis = i => (st && st.perfis[i].visual) || 'palito';
    const skin = (i, t) => (st && st.perfis[i].skins && st.perfis[i].skins[t]) || 'padrao';
    const PERS = [['palito', '🦯 Palito', [['padrao', '🎨 Padrão']]], ['blocos', '🧱 Blocos', [['padrao', '🧑 Padrão'], ['astronauta', '👨‍🚀 Astronauta']]]];
    c.innerHTML = '<h2>🧍 Personagem</h2>' + [0, 1].map(i => '<h3>' + (i ? '🔵 Azul' : '🔴 Vermelho') + '</h3>'
      + PERS.map(([t, nome, skins]) => '<div class="ramo">' + bt('v:' + i + ':' + t, nome + (vis(i) === t ? ' ✅' : ''), 'mb' + (vis(i) === t ? ' sel' : ''))
        + '<small style="opacity:.7">Skins:</small>' + skins.map(([k, n]) => bt('s:' + i + ':' + t + ':' + k, n + (skin(i, t) === k ? ' ✅' : ''), 'mb' + (skin(i, t) === k ? ' sel' : ''))).join('') + '</div>').join('')).join('')
      + '<p style="font-size:12px;opacity:.7;text-align:center">Troca na hora. Blocos fica mais bonito com Gráficos 3D ligado.</p>' + bt('voltar', '⬅ Voltar');
  }
  if (pagina === 'config') {
    const tg = (a, t, v) => bt(a, t + ': <b style="color:' + (v ? '#4ade80' : '#f87171') + '">' + (v ? 'LIGADO' : 'DESLIGADO') + '</b>');
    const cf = st ? st.config : { itens: true, vida: 100 };
    c.innerHTML = '<h2>⚙️ Configurações</h2><h3>Nesta tela</h3>' + tg('o:modo3d', 'Gráficos 3D', opc.modo3d) + tg('o:botoes', 'Botões na tela', opc.botoes) + tg('o:vibrar', 'Vibração', opc.vibrar) + tg('o:tremor', 'Tremer a tela', opc.tremor) + tg('o:numeros', 'Números de dano', opc.numeros) + tg('o:sangue', 'Sangue', opc.sangue)
      + '<h3>Partida (vale pros dois, a partir da próxima luta)</h3>' + tg('itens', 'Itens caindo', cf.itens) + bt('vida', 'Vida inicial: <b style="color:#facc15">' + cf.vida + '</b> (toque pra trocar)') + bt('voltar', '⬅ Voltar');
  }
  const bs = [...c.querySelectorAll('button')]; foco = Math.min(foco, bs.length - 1);
  bs.forEach((b, i) => { b.classList.toggle('foco', i === foco); b.onclick = () => { foco = i; acaoMenu(b.dataset.a); }; });
}
function acaoMenu(a) {
  if (a === 'continuar') return fechaMenu();
  if (a === 'sair') { fechaMenu(); soltaTudo(); eu = null; modoLocal = false; sessionStorage.removeItem('lutador'); sessionStorage.setItem('local', '0'); mostra(); return; }
  if (a === 'skills') { pagina = 'skills'; foco = 0; if (eu !== null && !modoLocal) abaSkill = +eu; }
  if (a === 'config') { pagina = 'config'; foco = 0; }
  if (a === 'finish') { post('/simulaFinish', { p: eu !== null && !modoLocal ? +eu : 0 }); return fechaMenu(); }
  if (a === 'pers') { pagina = 'pers'; foco = 0; }
  if (a.startsWith('s:')) { const [, p, tipo, sk] = a.split(':'); post('/skin', { p: +p, tipo, skin: sk }); }
  if (a.startsWith('v:')) { const [, p, tipo] = a.split(':'); post('/personagem', { p: +p, tipo }); }
  if (a === 'voltar') { pagina = 'principal'; foco = 0; }
  if (a.startsWith('aba')) abaSkill = +a.slice(3);
  if (a.startsWith('sk:')) post('/skill', { p: abaSkill, id: a.slice(3) });
  if (a === 'resetSk') post('/resetSkills', { p: abaSkill });
  if (a.startsWith('o:')) { const k = a.slice(2); opc[k] = !opc[k]; salvaOpc(); }
  if (a === 'itens' && st) post('/config', { itens: !st.config.itens });
  if (a === 'vida' && st) post('/config', { vida: { 100: 150, 150: 200, 200: 100 }[st.config.vida] });
  desenhaMenu();
  setTimeout(desenhaMenu, 150); // redesenha depois que o servidor atualizar
}
aplicaOpc();

// ---------- tela de escolha animada (estilo Mortal Kombat) ----------
const VITRINE = [['parado', 0], ['socoAlto', 8], ['parado', 0], ['chuteAlto', 13], ['parado', 0], ['giro', 20], ['parado', 0], ['gancho', 18], ['parado', 0], ['magia', 16]];
// controle lido por timer (rAF pausa quando a janela fica sem foco/escondida)
setInterval(lerControle, 16);
(function loop() { desenha(); requestAnimationFrame(loop); })();

// clique nos botões da interface
addEventListener('click', e => { if (e.target.closest('button, .opcao, [data-acao]')) SOM.clique(); }, true);

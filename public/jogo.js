// Cliente do jogo: entrada (toque/teclado/controle), animação 2D, HUD, menu
let eu = sessionStorage.getItem('lutador'), st, modoLocal = sessionStorage.getItem('local') === '1', modoIA = sessionStorage.getItem('ia') === '1', modoSim = sessionStorage.getItem('sim') === '1', entrada = sessionStorage.getItem('entrada') || 'teclado';
const ladoTeclado = () => +(sessionStorage.getItem('ladoTeclado') || 0) === 1 ? 1 : 0;
const usaTeclado = () => modoLocal || modoIA || entrada === 'teclado', usaControle = () => window.podeLerControle();
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
// dono do controle: com várias janelas abertas no mesmo PC, só UMA lê o controle (a que escolheu "Controle").
// a posse fica no localStorage com batimento; outra janela que pegar o controle tira desta, que volta pro teclado.
const JANELA = Math.random().toString(36).slice(2);
const donoControle = () => { try { const d = JSON.parse(localStorage.getItem('donoControle')); return d && Date.now() - d.t < 3000 ? d.id : null; } catch { return null; } };
const precisaControle = () => modoLocal || modoIA || entrada === 'controle';
function pegaControle() { try { localStorage.setItem('donoControle', JSON.stringify({ id: JANELA, t: Date.now() })); } catch {} }
function soltaControle() { try { if (donoControle() === JANELA) localStorage.removeItem('donoControle'); } catch {} }
const souDonoControle = () => donoControle() === JANELA;
window.pegaControle = pegaControle;
window.podeLerControle = () => precisaControle() && souDonoControle();
function setEntrada(e) { entrada = e; sessionStorage.setItem('entrada', e); if (precisaControle()) pegaControle(); else soltaControle(); marcaEntrada(); }
setInterval(() => { if (precisaControle() && (souDonoControle() || !donoControle())) pegaControle(); }, 1000);
addEventListener('storage', e => { if (e.key === 'donoControle' && entrada === 'controle' && !modoLocal && !modoIA && donoControle() && !souDonoControle()) { entrada = 'teclado'; sessionStorage.setItem('entrada', entrada); marcaEntrada(); } });
addEventListener('pagehide', soltaControle);
document.querySelectorAll('#entrada .bt').forEach(b => b.onclick = () => setEntrada(b.dataset.e));
if (precisaControle() && !donoControle()) pegaControle();
marcaEntrada();
const $ = s => document.querySelector(s), cv = $('#c');
let ctx = cv.getContext('2d'); // trocado temporariamente pra desenhar na tela de escolha
const CORES = [0, 1].map(i => sessionStorage.getItem('corLutador' + i) || ['#ef4444', '#3b82f6'][i]), VIDA = 100;
const corJogador = i => sessionStorage.getItem('corLutador' + i) || CORES[i];
window.setCorJogador = (i, cor) => { CORES[i] = cor; };
window.corJogador = corJogador;
// A escolha desta janela vale imediatamente, mesmo antes do próximo evento do servidor.
function skinDoLutador(i, tipo) {
  const local = modoSim
    ? sessionStorage.getItem('simSkin' + i + ':' + tipo) || sessionStorage.getItem('simSkin' + i)
    : sessionStorage.getItem('skinLocal' + i + ':' + tipo);
  return local || (st && st.perfis && st.perfis[i] && st.perfis[i].skins && st.perfis[i].skins[tipo]) || 'padrao';
}
window.skinDoLutador = skinDoLutador;
function mostra() { $('#escolha').classList.toggle('hide', eu !== null); $('#app').classList.toggle('hide', eu === null); etiquetas(); }
// 1 x IA: você é o Vermelho (teclado ou controle), a IA do servidor joga com o Azul
function saiIA() { if (modoIA) fetch('/ia', { method: 'POST', body: JSON.stringify({ ligada: false }) }); modoIA = modoSim = false; sessionStorage.setItem('ia', '0'); sessionStorage.setItem('sim', '0'); }
// simulação: escolhe os dois lutadores e a IA joga com os dois; esta janela só assiste
{
  const nomes = [...document.querySelectorAll('#persEscolha .bt')].map(b => [b.dataset.v, b.textContent]);
  const skins = {
    palito: [['padrao', 'Padrão'], ['fogo', '🔥 Fogo'], ['pirata', '🏴‍☠️ Rei Pirata']],
    blocos: [['padrao', 'Padrão'], ['astronauta', 'Astronauta'], ['gelo', '❄️ Gelo']],
    eddie: [['padrao', 'Padrão'], ['trovao', '⚡ Trovão']],
    pretoVelho: [['padrao', 'Padrão'], ['vento', '🌪️ Vento']],
    bob: [['padrao', 'Maltês Branco'], ['gala', '🎀 Gala'], ['dourado', '✨ Dourado']],
  };
  [0, 1].forEach(i => {
    const personagem = $('#simP' + i), skin = $('#simS' + i);
    personagem.innerHTML = nomes.map(([v, n]) => '<option value="' + v + '">' + n + '</option>').join('');
    const salvo = sessionStorage.getItem('sim' + i);
    personagem.value = nomes.some(([v]) => v === salvo) ? salvo : nomes[i % nomes.length][0];
    function atualizaSkin() {
      const opcoes = skins[personagem.value] || skins.palito;
      skin.innerHTML = opcoes.map(([v, n]) => '<option value="' + v + '">' + n + '</option>').join('');
      const guardada = sessionStorage.getItem('simSkin' + i + ':' + personagem.value);
      skin.value = opcoes.some(([v]) => v === guardada) ? guardada : 'padrao';
      sessionStorage.setItem('simSkin' + i, skin.value);
    }
    personagem.onchange = () => { sessionStorage.setItem('sim' + i, personagem.value); atualizaSkin(); };
    skin.onchange = () => { sessionStorage.setItem('simSkin' + i + ':' + personagem.value, skin.value); sessionStorage.setItem('simSkin' + i, skin.value); };
    atualizaSkin();
  });
}
$('#sim').onclick = async () => {
  const botao = $('#sim'); botao.disabled = true;
  try {
    await Promise.all([0, 1].flatMap(p => [
      fetch('/personagem', { method: 'POST', body: JSON.stringify({ p, tipo: $('#simP' + p).value }) }),
      fetch('/skin', { method: 'POST', body: JSON.stringify({ p, tipo: $('#simP' + p).value, skin: $('#simS' + p).value }) }),
    ]));
    await fetch('/ia', { method: 'POST', body: JSON.stringify({ ligada: true, sim: true, nivel: nivelIA }) });
  modoIA = modoSim = true; modoLocal = false; eu = '0'; sessionStorage.setItem('ia', '1'); sessionStorage.setItem('sim', '1'); sessionStorage.setItem('local', '0'); sessionStorage.setItem('lutador', eu); mostra();
  } finally { botao.disabled = false; }
};
$('#ia').onclick = () => {
  const opcoes = [...document.querySelectorAll('#persEscolha .bt')].map(b => b.dataset.v);
  fetch('/personagem', { method: 'POST', body: JSON.stringify({ p: 0, tipo: visualEscolhido }) });
  fetch('/personagem', { method: 'POST', body: JSON.stringify({ p: 1, tipo: opcoes[Math.floor(Math.random() * opcoes.length)] }) });
  fetch('/ia', { method: 'POST', body: JSON.stringify({ ligada: true, nivel: nivelIA }) });
  modoIA = true; modoSim = false; sessionStorage.setItem('sim', '0'); modoLocal = false; eu = '0'; if (entrada === 'controle') pegaControle(); sessionStorage.setItem('ia', '1'); sessionStorage.setItem('local', '0'); sessionStorage.setItem('lutador', eu); mostra();
};
let nivelIA = sessionStorage.getItem('nivelIA') || 'normal';
function marcaNivel() { document.querySelectorAll('#iaNivel .bt').forEach(b => { const sel = b.dataset.n === nivelIA; b.classList.toggle('sel', sel); b.style.outline = sel ? '3px solid #fff' : ''; b.style.opacity = sel ? 1 : 0.6; }); }
document.querySelectorAll('#iaNivel .bt').forEach(b => b.onclick = () => { nivelIA = b.dataset.n; sessionStorage.setItem('nivelIA', nivelIA); marcaNivel(); });
marcaNivel();
$('#local').onclick = () => { saiIA(); modoLocal = true; pegaControle(); eu = '0'; sessionStorage.setItem('local', '1'); sessionStorage.setItem('lutador', eu); mostra(); };
let visualEscolhido = sessionStorage.getItem('visual') || 'palito';
if (!document.querySelector('#persEscolha .bt[data-v="' + visualEscolhido + '"]')) { visualEscolhido = 'palito'; sessionStorage.setItem('visual', visualEscolhido); }
function marcaVisual() { document.querySelectorAll('#persEscolha .bt').forEach(b => b.classList.toggle('sel', b.dataset.v === visualEscolhido)); }
document.querySelectorAll('#persEscolha .bt').forEach(b => b.onclick = () => { visualEscolhido = b.dataset.v; sessionStorage.setItem('visual', visualEscolhido); marcaVisual(); });
marcaVisual();
document.querySelectorAll('#escolha .bt[data-p]').forEach(b => b.onclick = () => { saiIA(); fetch('/personagem', { method: 'POST', body: JSON.stringify({ p: +b.dataset.p, tipo: visualEscolhido }) }); eu = b.dataset.p; modoLocal = false; sessionStorage.setItem('local', '0'); sessionStorage.setItem('lutador', eu); mostra(); });
mostra();
function envia(k, v, p = +eu) { if (eu !== null && !modoSim) fetch('/tecla', { method: 'POST', body: JSON.stringify({ p, k, v }) }); }
document.querySelectorAll('.btn').forEach(b => {
  const on = e => { e.preventDefault(); if (!b.classList.contains('on')) { b.classList.add('on'); envia(b.dataset.k, true); if (opc.vibrar && navigator.vibrate) navigator.vibrate(15); } };
  const off = e => { e.preventDefault(); if (b.classList.contains('on')) { b.classList.remove('on'); envia(b.dataset.k, false); } };
  b.addEventListener('pointerdown', on); b.addEventListener('pointerup', off); b.addEventListener('pointerleave', off); b.addEventListener('pointercancel', off);
});
const TECLAS = { ArrowLeft: 'esq', ArrowRight: 'dir', ArrowUp: 'pulo', ArrowDown: 'baixo', a: 'esq', d: 'dir', w: 'pulo', s: 'baixo', u: 'socoAlto', j: 'socoBaixo', i: 'chuteAlto', k: 'chuteBaixo', l: 'defesa' };
addEventListener('keydown', e => { if (e.key === 'Escape' && eu !== null) return menuAberto ? fechaMenu() : abreMenu(); if (menuAberto) return; const k = usaTeclado() && TECLAS[e.key]; if (k && !e.repeat) { envia(k, true, modoLocal ? ladoTeclado() : +eu); if (k === 'defesa') envia('parryMod', true, modoLocal ? ladoTeclado() : +eu); } });
addEventListener('keyup', e => { const k = usaTeclado() && TECLAS[e.key]; if (k) { envia(k, false, modoLocal ? ladoTeclado() : +eu); if (k === 'defesa') envia('parryMod', false, modoLocal ? ladoTeclado() : +eu); } });
$('#ajuda').onclick = () => $('#lista').classList.toggle('hide');
$('#lista').innerHTML = document.querySelector('.guia').innerHTML;
// fim da luta: jogar de novo com os mesmos personagens ou voltar pra escolha
$('#reset').onclick = () => fetch('/reset', { method: 'POST' });
function trocaPersonagem() {
  fetch('/reset', { method: 'POST' }); saiIA();
  eu = null; modoLocal = false; sessionStorage.removeItem('lutador'); sessionStorage.setItem('local', '0'); mostra();
}
$('#trocar').onclick = trocaPersonagem;
document.addEventListener('contextmenu', e => e.preventDefault());

// animação: juntas com suavização (mola), interpolação entre estados do servidor
const anim = [0, 1].map(() => ({ fase: 0, vx: 0, xAnt: null, hp: VIDA, fantasma: VIDA, flash: 0, cur: null, yAnt: 0, vy: 0, squash: 0, cabeca: 0, dano: 0 }));
let parada = 0; // hit-stop: congela as poses uns ms no impacto
let raiosOuvidos = {}, faiscas = [], tremor = 0, popup = null, ultimoMsg = 0, ultimoDano = 0, numeros = [];
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
    case 'fatalBlow':
      p.perna = [38 + k * 18, -38]; p.joelho = [-38, -18]; p.baixa = 12;
      p.tronco = 20 + e * 24; p.bracoT = [35 + e * 75, 85 - e * 35];
      p.cotovelo = [100 - k * 100, 90];
      break;
    case 'tonto': { // cambaleando no FINISH HIM
      const bal = Math.sin(tempo / 260);
      p.tronco = -12 + bal * 14; p.bracoT = [-20 + bal * 20, -35 - bal * 20]; p.cotovelo = [20, 15]; p.perna = [10 + bal * 8, -12 + bal * 8]; p.joelho = [-30, -25]; p.baixa = 12;
      break;
    }
    case 'apanhou': case 'congelado':
      p.tronco = -32 + (f.acao === 'apanhou' ? Math.sin(tempo / 95) * 3 : 0);
      p.bracoT = [-45, -65]; p.cotovelo = [-35, -25]; p.perna = [30, -10]; p.joelho = [-30, -35]; p.baixa = 12;
      break;
    case 'levantando':
      agacha(p);
      { const subir = 1 - Math.min(1, Math.max(0, f.stun / 9));
        p.baixa = lerp(40, 9, suave(subir)); p.tronco = lerp(-35, 8, suave(subir));
        p.bracoT = [lerp(-60, 65, subir), lerp(-30, 45, subir)];
        p.joelho = [lerp(-135, -45, subir), lerp(-125, -35, subir)]; }
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
  if (f.acao === 'parado' && !f.agachado && f.y === 0) {
    const peso = Math.sin(tempo / 650);
    p.tronco += peso * 3; p.torcao = peso * 0.12;
    p.perna[0] += peso * 5; p.perna[1] += peso * 5;
    p.bracoT[0] += Math.sin(tempo / 330) * 3;
  }
  if (f.agachado) agacha();
  if (f.y > 0) { const sub = Math.max(-1, Math.min(1, a.vy / 15)); p.perna = [lerp(15, 35, sub), lerp(-20, -5, sub)]; p.bracoT = [lerp(40, 150, sub), lerp(-30, 120, sub)]; p.tronco = 0; }
  if (f.martelo > 0 && !f.dur) p.bracoT[0] = 60;
  switch (f.acao) {
    case 'defesa': p.bracoT = [105, 95]; p.tronco = -4; if (!f.agachado) p.perna = [18, -18]; p.torcao = -0.3; break;
    case 'socoAlto': case 'socoBaixo':
      { const mao = f.socoVar === 1 ? 1 : 0;
        p.bracoT[mao] = ida(10, f.acao === 'socoAlto' ? 92 : 72); p.bracoT[1 - mao] = -20 * k;
        p.torcao = e * (mao ? -1 : 1); p.tronco = 6 + e * 12; p.perna = [22, -22]; break; }
    case 'socoRocha': p.bracoT = [ida(-25, 115), ida(15, 90)]; p.torcao = e * 1.2; p.tronco = 10 + e * 25; p.perna = [36 + k * 8, -30]; break;
    case 'chuteCristal': p.perna = [ida(-15, 125), -38 - k * 10]; p.tronco = 14 - e * 35; p.bracoT = [80, -40 - k * 15]; p.torcao = -e * 0.5; break;
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
    case 'meteoroPedra': { // ergue a rocha e a lança com os dois braços
      const carga = suave(Math.min(1, u / 0.45)), solta = suave(Math.max(0, Math.min(1, (u - 0.45) / 0.3)));
      p.bracoT = [lerp(45, 175, carga) - solta * 75, lerp(35, 170, carga) - solta * 80];
      p.tronco = 20 - carga * 32 + solta * 42; p.perna = [46, -40]; p.torcao = solta * 0.55;
      break;
    }
    case 'fatalBlow': p.bracoT = [ida(-30, 125), 85 - k * 35]; p.tronco = 16 + e * 28; p.torcao = e * 1.2; p.perna = [48, -35]; break;
    case 'martelada': p.bracoT[0] = e < 0 ? 170 - e * 60 : lerp(170, 72, e); p.bracoT[1] = p.bracoT[0] - 12; p.tronco = 6 + e * 22; p.perna = [24, -24]; break;
    case 'tonto': { const bal = Math.sin(tempo / 260); p.tronco = -12 + bal * 14; p.bracoT = [-20 + bal * 20, -35 - bal * 20]; p.perna = [10 + bal * 6, -12 + bal * 6]; break; }
    case 'apanhou': case 'congelado': p.tronco = -26 + (f.acao === 'apanhou' ? Math.sin(tempo / 110) * 3 : 0); p.bracoT = [-45, -65]; p.perna = [12, -22]; break;
    case 'levantando': {
      agacha(); const subir = suave(1 - Math.min(1, Math.max(0, f.stun / 9)));
      p.tronco = lerp(-58, 3, subir); p.bracoT = [lerp(-80, 65, subir), lerp(-65, 45, subir)]; p.perna = [lerp(75, 18, subir), lerp(-68, -18, subir)];
      break;
    }
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
// pose do Eddie (capoeirista): ginga parado, golpes de capoeira por cima da pose comum
function poseEddie(f, a, tempo) {
  const p = pose(f, a, tempo);
  const u = f.dur ? f.t / f.dur : 0, e = curvaGolpe(u), k = Math.max(0, e);
  const vel = Math.min(1, Math.abs(a.vx) / 8);
  if (f.acao === 'parado' && !f.agachado && f.y === 0 && f.hp > 0 && !f.vitoria) {
    // ginga: troca a perna de trás e o braço de guarda num balanço contínuo
    const w = Math.sin(tempo / 420), lado = (w + 1) / 2, q = 1 - vel;
    const mix = (de, ate) => lerp(de, ate, q);
    p.perna = [mix(p.perna[0], lerp(40, -35, lado)), mix(p.perna[1], lerp(-35, 40, lado))];
    p.joelho = [mix(p.joelho[0], lerp(-70, 0, lado)), mix(p.joelho[1], lerp(0, -70, lado))];
    p.bracoT = [mix(p.bracoT[0], lerp(115, -25, lado)), mix(p.bracoT[1], lerp(-25, 115, lado))];
    p.cotovelo = [mix(p.cotovelo[0], lerp(70, 30, lado)), mix(p.cotovelo[1], lerp(30, 70, lado))];
    p.tronco = mix(p.tronco, 14 + 8 * Math.abs(w) + Math.sin(tempo / 210) * 2);
    p.baixa = mix(p.baixa, 10 + 4 * (1 - Math.abs(w)));
  }
  switch (f.acao) {
    case 'defesa': // esquiva lateral com a guarda alta
      p.tronco = -17 + Math.sin(tempo / 180) * 3; p.bracoT = [112, 75];
      p.cotovelo = [65, 110]; p.perna = [42, -38]; p.joelho = [-62, -48]; p.baixa = 17;
      break;
    case 'fatalBlow': // entra em ginga baixa antes de disparar o golpe
      p.tronco = 35 - k * 35; p.perna = [70 - k * 28, -55];
      p.joelho = [-95 + k * 65, -25]; p.bracoT = [100 + e * 55, -35]; p.baixa = 22 - k * 16;
      break;
    case 'armada': // chute giratório de perna esticada
      p.perna = [15 + e * 135, -8 - k * 12]; p.joelho = [-15 * (1 - k), -10]; p.tronco = 10 - e * 40;
      p.bracoT = [70, -50]; p.cotovelo = [30, 30]; p.baixa = 4;
      break;
    case 'meiaLua': // meia-lua de compasso: mão no chão, perna gira por trás bem alto
      p.tronco = 15 + k * 65; p.bracoT = [10, 22]; p.cotovelo = [0, 0];
      p.perna = [10 + e * 150, -15]; p.joelho = [0, -40]; p.baixa = 18;
      break;
    case 'bencao': // bênção: chute de empurrão com a sola do pé
      p.perna = [20 + e * 85, -10]; p.joelho = [-90 * (1 - k), -20]; p.tronco = 8 - e * 25;
      p.bracoT = [-30, -50]; p.cotovelo = [40, 40]; p.baixa = 6;
      break;
    case 'rabo': // rabo de arraia: agachado com as mãos no chão, perna varre em arco
      p.tronco = 70; p.bracoT = [5, 15]; p.cotovelo = [0, 0];
      p.perna = [30 + e * 130, 70]; p.joelho = [-20 * (1 - k), -120]; p.baixa = 34;
      break;
    case 'au': // aú (estrela): braços e pernas abertos, o corpo inteiro roda (render3d)
      p.bracoT = [172, 188]; p.cotovelo = [0, 0]; p.perna = [42, -42]; p.joelho = [0, 0]; p.tronco = 0; p.baixa = 0;
      break;
    case 'parafuso': // parafuso: chute girando no ar
      p.perna = [20 + e * 110, -30]; p.joelho = [0, -60]; p.tronco = -20 * k; p.bracoT = [120, -60]; p.cotovelo = [20, 20];
      break;
    case 'tempestade': { // super: redemoinho com as pernas chutando alternado
      const ph = Math.sin(u * Math.PI * 10);
      p.perna = [55 + 70 * Math.max(0, ph), -20 - 70 * Math.max(0, -ph)]; p.joelho = [-10, -10];
      p.bracoT = [92 + ph * 20, -92 + ph * 20]; p.cotovelo = [0, 0]; p.tronco = -8 + ph * 8; p.baixa = 4 + Math.abs(ph) * 4;
      break;
    }
  }
  const gc = giroCorpo(f);
  if (gc) p.giro = Math.cos(gc); // no 2D o giro achata o boneco
  return p;
}
// pose do Palito: soco vira corte de espada (alto/baixo), magia arremessa a espada, giro roda a espada em círculo
function posePalito(f, a, tempo) {
  const p = pose(f, a, tempo);
  const u = f.dur ? f.t / f.dur : 0, e = curvaGolpe(u), k = Math.max(0, e);
  if (f.acao === 'parado' && !f.agachado && f.y === 0) {
    const guarda = Math.sin(tempo / 510);
    p.bracoT[0] = 80 + guarda * 7; p.cotovelo[0] = 32 + guarda * 5;
    p.bracoT[1] = 40 - guarda * 8; p.cotovelo[1] = 105;
    p.perna = [25 + guarda * 4, -25 + guarda * 4]; p.tronco += guarda * 3;
  }
  switch (f.acao) {
    case 'defesa': // lâmina atravessada na frente do corpo
      p.bracoT = [115, 65]; p.cotovelo = [30, 100]; p.tronco = -8;
      p.perna = [32, -32]; p.joelho = [-35, -22]; p.baixa = 11;
      break;
    case 'fatalBlow': // estocada longa com todo o peso do corpo
      p.bracoT = [50 + e * 78, 42]; p.cotovelo = [70 - k * 70, 95];
      p.tronco = 12 + e * 35; p.perna = [53 + k * 13, -48]; p.baixa = 15;
      break;
    case 'gancho': // corte ascendente da espada
      p.bracoT = [e < 0 ? 12 + e * 55 : lerp(12, 172, k), -28];
      p.cotovelo = [15, 95]; p.tronco = 20 - k * 30;
      p.perna = [lerp(65, 18, k), -26]; p.joelho = [lerp(-95, -20, k), -18]; p.baixa = 22 - k * 18;
      break;
    case 'socoAlto': // corte alto: espada erguida atrás da cabeça desce na altura do rosto
      p.bracoT[0] = e < 0 ? 175 - e * 40 : lerp(175, 95, k); p.cotovelo[0] = lerp(25, -8, k);
      p.bracoT[1] = -20; p.cotovelo[1] = 100; p.tronco = 4 + e * 22; p.perna = [34, -30]; p.joelho = [-22, -12]; p.baixa = 8;
      break;
    case 'socoBaixo': // corte baixo: vem de cima e varre na altura da cintura/joelho
      p.bracoT[0] = e < 0 ? 120 - e * 40 : lerp(120, 40, k); p.cotovelo[0] = lerp(20, -10, k);
      p.bracoT[1] = -25; p.cotovelo[1] = 100; p.tronco = 10 + e * 30; p.perna = [40, -32]; p.joelho = [-35, -15]; p.baixa = 16;
      break;
    case 'magia': // arremessa a espada: puxa por trás do ombro e solta à frente
      p.bracoT[0] = e < 0 ? -140 + e * 40 : lerp(-140, 110, k); p.cotovelo[0] = lerp(60, 0, k);
      p.bracoT[1] = lerp(30, -40, k); p.cotovelo[1] = 60; p.tronco = 6 + e * 20; p.perna = [36, -30]; p.joelho = [-25, -10]; p.baixa = 8;
      break;
    case 'chuteAlto': // corte subindo: espada sai de baixo e sobe na frente até acima da cabeça
      p.bracoT[0] = e < 0 ? 20 + e * 40 : lerp(20, 165, k); p.cotovelo[0] = lerp(30, 0, k);
      p.bracoT[1] = -30; p.cotovelo[1] = 90; p.perna = [34, -30]; p.joelho = [-22, -12]; p.tronco = 12 - e * 18; p.baixa = 10;
      break;
    case 'chuteBaixo': // estocada baixa: puxa a espada pra trás e espeta reto na altura da perna
      p.bracoT[0] = e < 0 ? 40 + e * 120 : lerp(40, 62, k); p.cotovelo[0] = e < 0 ? 60 : lerp(60, 0, k);
      p.bracoT[1] = -40; p.cotovelo[1] = 60; p.perna = [55, -40]; p.joelho = [-50, -10]; p.tronco = 14 + k * 26; p.baixa = 22;
      break;
    case 'milCortes': { // super: avança cortando de cima pra baixo e de baixo pra cima, cada vez mais rápido
      const c = Math.sin(u * Math.PI * 12);
      p.bracoT[0] = 100 + 70 * c; p.cotovelo[0] = -8 * Math.abs(c); p.bracoT[1] = -40 + c * 15; p.cotovelo[1] = 60;
      p.perna = [45 + c * 12, -35 + c * 12]; p.joelho = [-30, -15]; p.tronco = 18 + 10 * c; p.baixa = 14 + Math.abs(c) * 5;
      break;
    }
    case 'giro': // espada esticada girando em círculo junto com o corpo
      p.bracoT = [92, -60]; p.cotovelo = [0, 30]; p.perna = [22, -22]; p.joelho = [-15, -15]; p.tronco = 4; p.baixa = 8;
      break;
  }
  return p;
}
// pose do Preto Velho: curvado, bengala na mão da frente, a outra mão nas costas
function posePretoVelho(f, a, tempo) {
  const p = pose(f, a, tempo);
  const u = f.dur ? f.t / f.dur : 0, e = curvaGolpe(u), k = Math.max(0, e);
  const vel = Math.min(1, Math.abs(a.vx) / 8), livre = !f.dur && f.y === 0 && f.hp > 0 && !f.agachado && !f.vitoria;
  if (livre && (f.acao === 'parado' || f.acao === 'defesa')) {
    const resp = Math.sin(tempo / 700), passo = Math.sin(a.fase * 0.8);
    p.tronco = 20 + resp * 2 + vel * 4;
    p.bracoT = [lerp(25, 30 + passo * 18, vel), -35]; p.cotovelo = [-15 + resp * 3, 95]; // bengala no chão, mão nas costas
    p.perna = [lerp(12, passo * 22, vel), lerp(-10, -passo * 22, vel)]; p.joelho = [-18, -16];
    p.baixa = 7 + resp + (vel ? 0 : Math.max(0, Math.sin(tempo / 950)) * 2);
    if (!vel && f.acao === 'parado') p.bracoT[0] += Math.max(0, Math.sin(tempo / 950)) * 8; // pequena batida da bengala no chão
    if (f.acao === 'defesa') { p.bracoT = [95, 80]; p.cotovelo = [80, 100]; p.tronco = 8; } // bengala atravessada na frente
  }
  switch (f.acao) {
    case 'fatalBlow': // firma a bengala e avança com ela
      p.bracoT = [e < 0 ? 160 - e * 35 : lerp(160, 92, k), 55];
      p.cotovelo = [8, 95]; p.tronco = 15 + e * 22;
      p.perna = [34 + k * 18, -30]; p.joelho = [-50, -25]; p.baixa = 12;
      break;
    case 'gancho': // golpe ascendente com o cabo da bengala
      p.bracoT = [e < 0 ? 5 + e * 45 : lerp(5, 170, k), -25];
      p.cotovelo = [5, 90]; p.tronco = 30 - k * 35;
      p.perna = [48 - k * 26, -24]; p.baixa = 18 - k * 12;
      break;
    case 'bengalada': // bengala desce de cima com força
      p.bracoT[0] = e < 0 ? 165 - e * 40 : lerp(165, 70, e); p.cotovelo[0] = 5; p.bracoT[1] = -30; p.cotovelo[1] = 90;
      p.tronco = 18 + e * 18; p.perna = [30, -22]; p.joelho = [-25, -12]; p.baixa = 8;
      break;
    case 'rasteiraBengala': // agacha e varre os pés do outro com o cabo da bengala
      p.tronco = 45; p.bracoT = [lerp(-30, 55, k), -20]; p.cotovelo = [0, 60];
      p.perna = [70, -10]; p.joelho = [-110, -60]; p.baixa = 26;
      break;
    case 'fumaca': // leva o cachimbo à boca e solta uma baforada
      p.bracoT = [25, u < 0.5 ? lerp(-30, 150, u * 2) : 150]; p.cotovelo = [-15, u < 0.5 ? lerp(90, 150, u * 2) : 150];
      p.tronco = u < 0.5 ? 18 - u * 20 : lerp(8, 30, (u - 0.5) * 2); p.baixa = 8;
      break;
    case 'benze': { // ajoelha e reza: mãos juntas, balança devagar
      const reza = Math.sin(tempo / 300) * 3;
      p.tronco = 12 + reza; p.bracoT = [70, 70]; p.cotovelo = [95, 95];
      p.perna = [85, -20]; p.joelho = [-95, -110]; p.baixa = 30;
      break;
    }
    case 'ancestrais': { // super: ergue a bengala e conduz cada onda de luz
      const tremor = Math.sin(tempo / 60) * 3, onda = Math.sin(u * Math.PI * 8);
      p.tronco = -10 + tremor + onda * 5; p.bracoT = [172 - Math.max(0, onda) * 18, 165 + onda * 12]; p.cotovelo = [6, 12];
      p.perna = [22 + onda * 5, -22 + onda * 5]; p.joelho = [-20, -20]; p.baixa = 6 - Math.min(1, u * 4) * 10; // pés quase saindo do chão
      break;
    }
    case 'mandinga': { // braços abertos, corpo balançando: quem bater apanha
      const b = Math.sin(tempo / 90);
      p.tronco = 6 + b * 6; p.bracoT = [60 + b * 15, -60 - b * 15]; p.cotovelo = [30, 30];
      p.perna = [25, -25]; p.joelho = [-35, -35]; p.baixa = 14;
      break;
    }
  }
  if (f.zonzo > 0 && f.acao === 'apanhou') p.tronco += Math.sin(tempo / 120) * 12;
  return p;
}
// pose do lutador i (opts = desenho fora da luta)
function poseDe(visual, f, a, tempo) { return visual === 'blocos' ? poseBlocos(f, a, tempo) : visual === 'eddie' ? poseEddie(f, a, tempo) : visual === 'pretoVelho' ? posePretoVelho(f, a, tempo) : visual === 'palito' ? posePalito(f, a, tempo) : pose(f, a, tempo); }
const visualDe = i => (st && st.perfis[i] && st.perfis[i].visual) || 'palito';
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
  if (f.acao === 'armada' && u < 0.6) return ease(u / 0.6) * Math.PI * 2;
  if (f.acao === 'meiaLua' && u < 0.65) return ease(u / 0.65) * Math.PI * 2;
  if (f.acao === 'rabo' && u < 0.6) return ease(u / 0.6) * Math.PI * 2;
  if (f.acao === 'parafuso' && u < 0.7) return ease(u / 0.7) * Math.PI * 2;
  if (f.acao === 'tempestade') return ease(u) * Math.PI * 6;
  return 0;
}
// cambalhota no plano da tela (aú), em radianos; negativo = roda pra frente
function rolagem(f) {
  const u = f.dur ? f.t / f.dur : 0;
  return f.acao === 'au' ? -suave(Math.min(1, u / 0.9)) * Math.PI * 2 : 0;
}

// juntas do boneco em coordenadas locais (x pra frente, y pra cima, origem no pé) pro renderizador 3D
function juntasLocais(f, i, tempo, dt) {
  const a = anim[i];
  aproxima(a, poseDe(visualDe(i), f, a, tempo), dt, f.dur > 0);
  const p = a.cur, sq = a.squash;
  const vai = (o, ang, len) => [o[0] + Math.sin(rad(ang)) * len * (1 + sq * 0.3), o[1] - Math.cos(rad(ang)) * len * (1 - sq * 0.3)];
  const quadril = [0, (62 - p.baixa) * (1 - sq * 0.3)];
  const ombro = vai(quadril, 180 + p.tronco, 58);
  a.cabeca += (p.tronco - (a.dano || 0) * 30 - a.cabeca) * (1 - Math.exp(-dt / 110));
  const j = { quadril, ombro, cabeca: vai(ombro, 180 + a.cabeca, 24), angCabeca: a.cabeca, giro: p.giro, spin: giroCorpo(f), roll: rolagem(f), torcao: p.torcao || 0, acao: f.acao, u: f.dur ? f.t / f.dur : 0, flash: a.flash > 0, joelho: [], pe: [], cot: [], mao: [] };
  for (const k of [0, 1]) {
    j.joelho[k] = vai(quadril, p.perna[k], 32); j.pe[k] = vai(j.joelho[k], p.perna[k] + p.joelho[k], 32);
    j.cot[k] = vai(ombro, p.bracoT[k], 30); j.mao[k] = vai(j.cot[k], p.bracoT[k] + p.cotovelo[k], 32);
  }
  j.ponta = vai(j.mao[0], p.bracoT[0] + p.cotovelo[0], 46);
  // espada do palito: sempre na mão (no arremesso some depois de soltar)
  j.espada = visualDe(i) === 'palito' && !(f.acao === 'magia' && j.u >= 7 / 16) ? vai(j.mao[0], p.bracoT[0] + p.cotovelo[0], 78) : null;
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
  const visual = opts ? (opts.blocos ? 'blocos' : 'palito') : visualDe(i);
  aproxima(a, poseDe(visual, f, a, tempo), dt, f.dur > 0);
  const p = a.cur;
  const x = X(f.x), chao = Y(f.y), d = f.facing;
  const rad = g => g * Math.PI / 180;
  const sq = a.squash; // >0 achata (aterrissagem), <0 estica (pulo)
  const skin = !opts && skinDoLutador(i, visualDe(i));
  if (!opts && visual === 'bob') {
    const gold = skin === 'dourado', fur = gold ? '#f4d47a' : '#fffdf8', bobX = X(f.x), ground = Y(f.y), head = bobX + d * 23 * s;
    ctx.save(); ctx.globalAlpha = f.hp <= 0 ? .45 : 1; ctx.shadowColor = gold ? '#facc15' : '#ddd'; ctx.shadowBlur = skin === 'dourado' ? 18 * s : 4 * s;
    ctx.fillStyle = '#0005'; ctx.beginPath(); ctx.ellipse(bobX, Y(0) + 2 * s, 34 * s, 7 * s, 0, 0, 7); ctx.fill();
    ctx.fillStyle = fur; ctx.strokeStyle = '#d6d3d1'; ctx.lineWidth = 1.5 * s;
    const correndo = Math.abs(f.vx) > 1, latindo = f.acao === 'latido', mordendo = f.acao === 'mordida';
    const superBob = f.acao === 'furacaoBob', bounce = Math.sin(tempo / (superBob ? 36 : 90)) * (superBob ? 9 : correndo ? 5 : 1.5);
    const cy = ground - 39 * s + bounce * s + (latindo ? 3 * s : 0), cabecaX = head + (mordendo ? d * 9 * s : 0);
    if (superBob) { ctx.translate(bobX, cy); ctx.rotate(Math.sin(tempo / 45) * .16); ctx.translate(-bobX, -cy); }
    ctx.beginPath(); ctx.ellipse(bobX, cy, superBob ? 37 * s : 34 * s, latindo ? 19 * s : 22 * s, 0, 0, 7); ctx.fill(); ctx.stroke();
    for (let n = 0; n < 4; n++) {
      const frente = n < 2, passo = Math.sin(tempo / (correndo ? 55 : 100) + n * Math.PI) * (correndo ? 8 : 1.5);
      const patada = f.acao === 'patada' && frente && n === 0 ? d * 12 : 0;
      ctx.beginPath(); ctx.ellipse(bobX + (frente ? 20 : -20) * s + (passo + patada) * s, ground - 13 * s + Math.max(0, passo) * .35 * s, 6.5 * s, 13 * s, (passo + patada) * .018, 0, 7); ctx.fill(); ctx.stroke();
    }
    const raboAgito = f.acao === 'rabada' ? Math.sin(tempo / 25) * 110 : Math.sin(tempo / 60) * (correndo ? 60 : 35);
    ctx.save(); ctx.translate(bobX - d * 30 * s, cy - 4 * s); ctx.rotate((-25 + raboAgito) * Math.PI / 180); ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-10 * s, -16 * s, -23 * s, -14 * s); ctx.strokeStyle = fur; ctx.lineWidth = 9 * s; ctx.stroke(); ctx.restore();
    // orelhas caídas balançam com a corrida e levantam quando Bob late.
    for (const z of [-1, 1]) { ctx.save(); ctx.translate(cabecaX - d * 5 * s, cy + z * 7 * s); ctx.rotate(d * (-.22 + Math.sin(tempo / 75 + z) * .13 + (latindo ? -.3 : 0))); ctx.beginPath(); ctx.ellipse(0, 9 * s, 7 * s, 14 * s, -d * .3, 0, 7); ctx.fill(); ctx.stroke(); ctx.restore(); }
    ctx.beginPath(); ctx.ellipse(cabecaX, cy - 10 * s, 22 * s, 21 * s, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(cabecaX + d * 14 * s, cy - 3 * s, 13 * s, 9 * s, 0, 0, 7); ctx.fill();
    if (latindo || mordendo) { ctx.fillStyle = '#5b1824'; ctx.beginPath(); ctx.ellipse(cabecaX + d * 23 * s, cy + 4 * s, (latindo ? 8 : 6) * s, (latindo ? 5 : 3) * s, .12 * d, 0, 7); ctx.fill(); if (latindo) { ctx.fillStyle = '#fb7185'; ctx.beginPath(); ctx.ellipse(cabecaX + d * 25 * s, cy + 7 * s, 3 * s, 4 * s, 0, 0, 7); ctx.fill(); } }
    const piscaBob = (tempo + i * 1700) % 2900 < 130 || f.hp <= f.vidaMax * .18 || f.acao === 'apanhou';
    ctx.fillStyle = '#171717'; ctx.beginPath();
    for (const ex of [8, 16]) { if (piscaBob) { ctx.ellipse(cabecaX + d * ex * s, cy - 17 * s, 2.8 * s, .7 * s, 0, 0, 7); } else { ctx.arc(cabecaX + d * ex * s, cy - 17 * s, 2.5 * s, 0, 7); } }
    ctx.fill();
    if (f.acao === 'apanhou' || (f.acao === 'defesa' && !latindo)) { ctx.strokeStyle = '#51423e'; ctx.lineWidth = 2 * s; for (const ex of [8, 16]) { ctx.beginPath(); ctx.moveTo(cabecaX + d * (ex - 3) * s, cy - 21 * s); ctx.lineTo(cabecaX + d * (ex + 2) * s, cy - 19 * s); ctx.stroke(); } }
    if (skin === 'gala') { ctx.fillStyle = '#e11d48'; ctx.beginPath(); ctx.moveTo(bobX + d * 6 * s, cy - 3 * s); ctx.lineTo(bobX + d * 16 * s, cy + 3 * s); ctx.lineTo(bobX + d * 6 * s, cy + 9 * s); ctx.lineTo(bobX - d * 4 * s, cy + 3 * s); ctx.fill(); }
    ctx.restore(); return;
  }
  const coresSkin = { fogo: '#ff7430', gelo: '#8be9ff', trovao: '#d3a5ff', vento: '#8fffd5' };
  const vai = (o, ang, len) => [o[0] + Math.sin(rad(ang)) * len * s * d * p.giro * (1 + sq * 0.3), o[1] + Math.cos(rad(ang)) * len * s * (1 - sq * 0.3)];
  ctx.save();
  const blocos = opts ? opts.blocos : st && st.perfis[i] && st.perfis[i].visual === 'blocos';
  ctx.lineWidth = (blocos ? 15 : 9) * s; ctx.lineCap = blocos ? 'butt' : 'round'; ctx.lineJoin = blocos ? 'miter' : 'round';
  const pintado = a.flash > 0 ? '#fff' : f.estrela > 0 ? 'hsl(' + (tempo / 3 % 360) + ',95%,60%)' : coresSkin[skin] || cor;
  ctx.fillStyle = '#0005'; ctx.beginPath(); ctx.ellipse(x, Y(0) + 2 * s, 35 * s * Math.max(0.4, 1 - f.y / 250), 7 * s, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = pintado; ctx.fillStyle = pintado;
  const quadril = [x, chao - (62 - p.baixa) * s * (1 - sq * 0.3)];
  const ombro = vai(quadril, 180 + p.tronco, 58);
  const curva = (p0, p1, p2) => { ctx.beginPath(); ctx.moveTo(...p0); ctx.quadraticCurveTo(...p1, ...p2); ctx.stroke(); };
  const rocha = (pt, raio) => {
    ctx.save(); ctx.translate(pt[0], pt[1]);
    ctx.fillStyle = '#555b68'; ctx.strokeStyle = '#2b3440'; ctx.lineWidth = 2 * s; ctx.beginPath();
    for (let n = 0; n < 8; n++) { const a = n * Math.PI / 4; ctx.lineTo(Math.cos(a) * raio * (n % 2 ? 0.85 : 1.1), Math.sin(a) * raio * (n % 2 ? 0.85 : 1.1)); }
    ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#70e8f7';
    for (const [dx, dy] of [[-0.5, -0.6], [0.45, -0.3], [0.1, 0.4]]) {
      ctx.beginPath(); ctx.moveTo(dx * raio, dy * raio); ctx.lineTo((dx + 0.12) * raio, (dy - 0.75) * raio); ctx.lineTo((dx + 0.35) * raio, dy * raio); ctx.fill();
    }
    ctx.restore();
  };
  for (const k of [1, 0]) {
    ctx.globalAlpha = k ? 0.6 : 1;
    const joelho = vai(quadril, p.perna[k], 32), pe = vai(joelho, p.perna[k] + p.joelho[k], 32);
    curva(quadril, joelho, pe);
    if (blocos && /^(chute|rasteira|giro|voadora)/.test(f.acao) && k === 0) rocha(pe, (f.acao === 'chuteCristal' ? 30 : 24) * s);
    const cot = vai(ombro, p.bracoT[k], 30), mao = vai(cot, p.bracoT[k] + p.cotovelo[k], 32);
    curva(ombro, cot, mao);
    if (blocos && (/^(soco|gancho)/.test(f.acao) || f.acao === 'meteoroPedra') && (k === (f.socoVar === 1 ? 1 : 0) || f.socoVar === 2 || f.acao === 'socoRocha' || f.acao === 'meteoroPedra')) rocha(mao, (f.acao === 'socoRocha' ? 32 : 26) * s);
    else { ctx.beginPath(); ctx.arc(...mao, 7 * s, 0, 7); ctx.fill(); }
    if (skin === 'pirata') {
      const ang = p.bracoT[k] + p.cotovelo[k], ponta = vai(mao, ang, 46);
      ctx.save(); ctx.lineCap = 'butt'; ctx.strokeStyle = '#dbeafe'; ctx.lineWidth = 5 * s;
      ctx.beginPath(); ctx.moveTo(mao[0], mao[1]); ctx.lineTo(ponta[0], ponta[1]); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5 * s; ctx.beginPath(); ctx.moveTo(mao[0], mao[1]); ctx.lineTo(ponta[0], ponta[1]); ctx.stroke();
      const guarda = vai(mao, ang + 90, 7);
      ctx.strokeStyle = '#f4c542'; ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.moveTo(guarda[0], guarda[1]);
      const outroLado = vai(mao, ang - 90, 7); ctx.lineTo(outroLado[0], outroLado[1]); ctx.stroke();
      ctx.restore(); ctx.strokeStyle = pintado; ctx.fillStyle = pintado;
    }
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
  if (skin === 'pirata') {
    // Coroa dourada com pontas e tapa-olho preto visível mesmo no renderizador 2D.
    ctx.save(); ctx.shadowBlur = 5 * s; ctx.shadowColor = '#facc15';
    ctx.fillStyle = '#d4a017'; ctx.strokeStyle = '#fff0a6'; ctx.lineWidth = 1.5 * s;
    ctx.beginPath(); ctx.moveTo(cabeca[0] - 13 * s, cabeca[1] - 14 * s);
    ctx.lineTo(cabeca[0] - 12 * s, cabeca[1] - 27 * s); ctx.lineTo(cabeca[0] - 5 * s, cabeca[1] - 20 * s);
    ctx.lineTo(cabeca[0], cabeca[1] - 31 * s); ctx.lineTo(cabeca[0] + 5 * s, cabeca[1] - 20 * s);
    ctx.lineTo(cabeca[0] + 12 * s, cabeca[1] - 27 * s); ctx.lineTo(cabeca[0] + 13 * s, cabeca[1] - 14 * s);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#111318'; ctx.strokeStyle = '#3b2418'; ctx.lineWidth = 2 * s;
    ctx.beginPath(); ctx.ellipse(ox, oy, 6 * s, 5 * s, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.restore();
  }
  if (coresSkin[skin]) {
    ctx.save(); ctx.fillStyle = coresSkin[skin]; ctx.strokeStyle = coresSkin[skin];
    ctx.shadowColor = coresSkin[skin]; ctx.shadowBlur = 16 * s;
    for (let n = 0; n < 9; n++) {
      const fase = n / 9, ang = fase * Math.PI * 2 + tempo / (skin === 'trovao' ? 150 : 400);
      const subida = (tempo / (skin === 'fogo' ? 850 : 1350) + fase) % 1;
      const px = x + Math.cos(ang) * (25 + (n % 3) * 8) * s;
      const py = chao - (15 + subida * 125) * s;
      ctx.globalAlpha = skin === 'trovao' ? (Math.sin(tempo / 55 + n * 7) > 0 ? .9 : .1) : (1 - subida) * .8;
      ctx.beginPath(); ctx.arc(px, py, (skin === 'fogo' ? 4 : 3) * s, 0, 7); ctx.fill();
    }
    ctx.restore();
  }
  ctx.restore();
}

const EMOJI = { comida: '🍗', estrela: '⭐', martelo: '🔨', fogo: '🔥', gelo: '❄️', raio: '⚡', vento: '🌪️', lendario: '💸' };
const COR_ELEM = { fogo: '#ff6a1a', gelo: '#7fe3ff', raio: '#ffe45e', vento: '#9cffd9', lendario: '#d879ff' };
function desenhaItens(vis, X, Y, s, tempo) {
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const it of vis.itens) {
    if (it.vida < 90 && Math.floor(tempo / 100) % 2) continue; // pisca antes de sumir
    const bob = it.y === 0 ? Math.sin(tempo / 250 + it.id) * 4 : 0;
    ctx.fillStyle = '#0005'; ctx.beginPath(); ctx.ellipse(X(it.x), Y(0) + 2 * s, 16 * s, 4 * s, 0, 0, 7); ctx.fill();
    const cor = COR_ELEM[it.tipo];
    if (cor) { // elemento: brilho na cor e rastro de meteoro enquanto cai
      const x = X(it.x), y = Y(it.y + 20 + bob);
      if (it.y > 0) { const g = ctx.createLinearGradient(x, y, x, y - 120 * s); g.addColorStop(0, cor + 'cc'); g.addColorStop(1, cor + '00'); ctx.fillStyle = g; ctx.fillRect(x - 10 * s, y - 120 * s, 20 * s, 120 * s); }
      const g = ctx.createRadialGradient(x, y, 0, x, y, 40 * s); g.addColorStop(0, cor + 'cc'); g.addColorStop(1, cor + '00');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 40 * s * (1 + Math.sin(tempo / 120) * 0.1), 0, 7); ctx.fill();
    }
    const emoji = it.tipo === 'lendario' ? ({ agiota: '💸', tiaZap: '📱', pombo: '🐦' }[it.poder] || EMOJI.lendario) : EMOJI[it.tipo];
    ctx.font = 34 * s + 'px system-ui'; ctx.fillText(emoji, X(it.x), Y(it.y + 20 + bob));
  }
  ctx.textBaseline = 'alphabetic';
  poderes2d(vis, X, Y, s, tempo);
  // brilho da estrela em volta de quem está invencível
  vis.p.forEach(f => { if (f.estrela > 0) for (let j = 0; j < 3; j++) {
    const ang = tempo / 200 + j * 2.1; ctx.font = 14 * s + 'px Orbitron, system-ui';
    ctx.fillText('✨', X(f.x + Math.cos(ang) * 40), Y(f.y + 80 + Math.sin(ang) * 60));
  } });
}

// poderes elementais no modo 2D (o 3D fica em elementos3d.js)
function poderes2d(vis, X, Y, s, tempo) {
  const zz = (x0, y0, x1, y1, d) => { ctx.beginPath(); ctx.moveTo(x0, y0); for (let k = 1; k < 10; k++) ctx.lineTo(x0 + (x1 - x0) * k / 10 + (Math.random() - 0.5) * d, y0 + (y1 - y0) * k / 10); ctx.lineTo(x1, y1); ctx.stroke(); };
  for (const pd of vis.poderes || []) {
    const x = X(pd.x);
    if (pd.tipo === 'gelo') for (let k = 0; k < 6; k++) {
      const ex = X(pd.x - pd.dir * k * 16), h = (60 - k * 8) * s;
      ctx.fillStyle = k % 2 ? '#bff4ffdd' : '#7fe3ffdd'; ctx.beginPath(); ctx.moveTo(ex - 9 * s, Y(0)); ctx.lineTo(ex + pd.dir * 6 * s, Y(0) - h); ctx.lineTo(ex + 9 * s, Y(0)); ctx.fill();
    }
    if (pd.tipo === 'vento') {
      ctx.strokeStyle = '#d9fff4aa'; ctx.lineWidth = 3 * s;
      for (let k = 0; k < 9; k++) { const r = (10 + k * 7) * s; ctx.beginPath(); ctx.ellipse(x + Math.sin(tempo / 150 + k * 0.6) * k * 2 * s, Y(k * 18), r, r * 0.25, 0, tempo / 80 + k, tempo / 80 + k + 5); ctx.stroke(); }
    }
    if (pd.tipo === 'raio') {
      const fase = pd.t % 26;
      ctx.fillStyle = '#2a2440cc'; for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.ellipse(x + k * 28 * s, Y(360) + Math.abs(k) * 6 * s, 40 * s, 20 * s, 0, 0, 7); ctx.fill(); }
      if (fase < 17) { ctx.strokeStyle = Math.sin(tempo / 50) > 0 ? '#ffe45e' : '#ffe45e55'; ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.ellipse(x, Y(0), (40 - fase) * s, (10 - fase / 4) * s, 0, 0, 7); ctx.stroke(); }
      else if (fase < 23) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 4 * s; ctx.shadowColor = '#ffe45e'; ctx.shadowBlur = 20 * s; zz(x, Y(360), x, Y(0), 40 * s); ctx.shadowBlur = 0; }
    }
  }
  vis.p.forEach(f => {
    if (f.acao === 'congelado') { ctx.fillStyle = '#9be8ff66'; ctx.strokeStyle = '#e6fbff'; ctx.lineWidth = 2 * s; ctx.fillRect(X(f.x) - 32 * s, Y(f.y + 150), 64 * s, 150 * s); ctx.strokeRect(X(f.x) - 32 * s, Y(f.y + 150), 64 * s, 150 * s); }
    if (f.fogo > 0 || f.queima > 0) for (let k = 0; k < (f.fogo > 0 ? 6 : 3); k++) {
      const u = ((tempo / 500 + k / 6) % 1), fx = X(f.x + Math.sin(k * 7 + tempo / 200) * 16), fy = Y(f.y + 40 + u * 110);
      ctx.globalAlpha = 1 - u; ctx.fillStyle = f.fogo > 0 ? '#ff8a1a' : '#ff4a1a'; ctx.beginPath(); ctx.arc(fx, fy, (9 - u * 6) * s, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
  });
}

function magias(vis, X, Y, s, tempo) {
  for (const m of vis.magias) {
    const x = X(m.x), y = Y(m.y), r = 16 * s * (1 + Math.sin(tempo / 60) * 0.15);
    if (m.pedra) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(tempo / 150 * m.dir); ctx.scale(m.gigante ? 2.8 : 1.6, m.gigante ? 2.8 : 1.6);
      ctx.fillStyle = '#555b68'; ctx.beginPath();
      for (let j = 0; j < 8; j++) { const a = j * Math.PI / 4; ctx.lineTo(Math.cos(a) * (j % 2 ? 14 : 18) * s, Math.sin(a) * (j % 2 ? 14 : 18) * s); }
      ctx.closePath(); ctx.fill(); ctx.fillStyle = '#70e8f7';
      for (const a of [0, 2, 4]) { ctx.save(); ctx.rotate(a); ctx.beginPath(); ctx.moveTo(5 * s, -4 * s); ctx.lineTo(24 * s, 0); ctx.lineTo(5 * s, 4 * s); ctx.fill(); ctx.restore(); }
      ctx.restore(); continue;
    }
    if (m.fumaca) { // nuvem do cachimbo: bolas cinzas girando
      for (let j = 0; j < 7; j++) {
        const ang = tempo / 300 + j * 0.9, rr = (12 + (j % 3) * 5) * s;
        ctx.globalAlpha = 0.55; ctx.fillStyle = j % 2 ? '#d6d3d1' : '#a8a29e';
        ctx.beginPath(); ctx.arc(x + Math.cos(ang) * 14 * s - m.dir * j * 4 * s, y + Math.sin(ang) * 10 * s, rr, 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 1; continue;
    }
    if (m.onda) { // onda sonora do berimbau: arcos dourados
      ctx.lineCap = 'round';
      for (let j = 0; j < 4; j++) {
        const rr = (14 + j * 9 + (tempo / 30) % 9) * s; ctx.globalAlpha = 1 - j * 0.22;
        ctx.strokeStyle = j % 2 ? CORES[m.dono] : '#fde047'; ctx.lineWidth = 5 * s;
        ctx.beginPath(); ctx.arc(x - m.dir * j * 10 * s, y, rr, m.dir > 0 ? -0.9 : Math.PI - 0.9, m.dir > 0 ? 0.9 : Math.PI + 0.9); ctx.stroke();
      }
      ctx.globalAlpha = 1; continue;
    }
    if (m.latido) {
      ctx.save(); ctx.strokeStyle = '#fff'; ctx.shadowColor = '#e0f2fe'; ctx.shadowBlur = 15 * s; ctx.lineWidth = 4 * s;
      for (let j = 0; j < 3; j++) { const r0 = (10 + j * 11 + tempo / 55 % 11) * s; ctx.globalAlpha = .85 - j * .2; ctx.beginPath(); ctx.arc(x - m.dir * j * 8 * s, y, r0, m.dir > 0 ? -0.8 : Math.PI - .8, m.dir > 0 ? .8 : Math.PI + .8); ctx.stroke(); }
      ctx.restore(); ctx.globalAlpha = 1; continue;
    }
    for (let j = 1; j <= 4; j++) { ctx.globalAlpha = 0.25 / j; ctx.fillStyle = CORES[m.dono]; ctx.beginPath(); ctx.arc(x - m.dir * j * 14 * s, y, r * (1 - j * 0.15), 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 1.6);
    g.addColorStop(0, '#fff'); g.addColorStop(0.35, '#fde047'); g.addColorStop(0.7, CORES[m.dono]); g.addColorStop(1, '#0000');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 1.6, 0, 7); ctx.fill();
  }
}

function atualizaAnim(vis, dt, P, s) {
  // raio caindo: trovão e tela tremendo (uma vez por raio)
  for (const pd of vis.poderes || []) if (pd.tipo === 'raio') {
    const n = Math.floor((pd.t - 17) / 26);
    if (pd.t % 26 >= 17 && raiosOuvidos[pd.id] !== n) { raiosOuvidos[pd.id] = n; SOM.trovao(); if (opc.tremor) tremor = Math.max(tremor, 14); }
  }
  vis.p.forEach((f, i) => {
    const a = anim[i];
    const vxAgora = a.xAnt === null || dt === 0 ? 0 : (f.x - a.xAnt) / dt * 33;
    a.vx += (vxAgora - a.vx) * (1 - Math.exp(-dt / 60)); a.xAnt = f.x;
    a.fase += Math.abs(a.vx) * 0.11 * dt / 33;
    const vyAgora = dt ? (f.y - a.yAnt) / dt * 33 : 0;
    if (a.yAnt > 0 && f.y === 0 && a.vy < -4) { a.squash = 0.35; SOM.pouso(); } // aterrissou
    if (a.yAnt === 0 && f.y > 0) { a.squash = -0.25; SOM.pulo(); } // pulou
    if (f.acao !== a.acaoAnt) { // golpe começando
      const ehBob = visualDe(i) === 'bob';
      if (ehBob && f.acao === 'latido') SOM.latidoBob(3);
      if (ehBob && f.acao === 'mordida') SOM.rosnadoBob();
      if (ehBob && (f.acao === 'patada' || f.acao === 'rabada')) SOM.latidoBob(1);
      if (ehBob && f.acao === 'apanhou') SOM.ganidoBob();
      if (ehBob && /^(latido|mordida|patada|rabada|apanhou)$/.test(f.acao)) {}
      else if (f.acao === 'furacaoBob') { SOM.axe(); SOM.latidoBob(4); }
      else if (f.acao === 'magia') SOM.magia();
      else if (f.acao === 'tempestade') SOM.axe();
      else if (f.acao === 'fumaca') SOM.fumaca();
      else if (f.acao === 'bengalada' || f.acao === 'rasteiraBengala') SOM.golpe(true);
      else if (f.acao === 'milCortes') { SOM.corte(); SOM.golpe(true); }
      else if (/^(soco|chute|gancho|rasteira|giro|voadora|martelada|armada|meiaLua|bencao|rabo|au|parafuso|mordida|patada|rabada)/.test(f.acao)) SOM.golpe(/chuteAlto|gancho|giro|voadora|martelada|rasteira|armada|meiaLua|rabo|parafuso|rabada/.test(f.acao));
      const vz = visualDe(i);
      if (vz === 'eddie' && /^(soco|chute|gancho|rasteira|giro|voadora|armada|meiaLua|bencao|rabo|au|parafuso)/.test(f.acao)) SOM.golpeCapoeira(/armada|meiaLua|rabo|parafuso|voadora|chuteAlto/.test(f.acao));
      if (vz === 'pretoVelho' && /^(bengalada|rasteiraBengala|soco|chute|gancho)/.test(f.acao)) SOM.golpeVelho();
      if (vz === 'eddie') {
        if (f.acao === 'tempestade') SOM.gritoEddie(true);
        else if (/^(armada|meiaLua|bencao|rabo|au|parafuso|rasteira)/.test(f.acao) && Math.random() < 0.55) SOM.gritoEddie();
      }
      if (vz === 'pretoVelho') {
        if (f.acao === 'ancestrais') SOM.gritoVelho(true);
        else if (/^(fumaca|bengalada|rasteiraBengala|benzimento|mandinga)/.test(f.acao) && Math.random() < 0.6) SOM.gritoVelho();
      }
      if (vz === 'palito') {
        if (f.acao === 'milCortes') SOM.gritoPalito(true);
        else if (/^(magia|soco|chute|gancho|rasteira|giro|voadora)/.test(f.acao) && Math.random() < 0.55) SOM.gritoPalito();
      }
      if (vz === 'blocos') {
        if (f.acao === 'meteoroPedra') SOM.gritoBlocos(true);
        else if (/^(socoRocha|chuteCristal|magia|soco|chute|gancho|rasteira|giro|voadora)/.test(f.acao) && Math.random() < 0.55) SOM.gritoBlocos();
      }
      if (f.acao === 'caido') SOM.queda();
      if (a.acaoAnt === 'congelado') SOM.quebraGelo();
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
      const atk = visualDe(1 - i); // quem bateu
      if (f.acao !== 'defesa') { if (atk === 'eddie') SOM.acertoCapoeira(); else if (atk === 'pretoVelho') SOM.acertoVelho(); }
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
    const barra = { eddie: ['axe', 'AXÉ MÁXIMO!', 'TRÁS, FRENTE + CHUTE ALTO', 45, '#d97706', '#fde047'], palito: ['fio', 'FIO MÁXIMO!', 'TRÁS, FRENTE + SOCO ALTO', 195, '#64748b', '#bae6fd'], pretoVelho: ['axe', 'ANCESTRAIS PRONTOS!', 'TRÁS, FRENTE + SOCO ALTO', 355, '#991b1b', '#fca5a5'], blocos: ['axe', 'PEDRA PRONTA!', 'TRÁS, FRENTE + SOCO ALTO', 185, '#0891b2', '#a5f3fc'], bob: ['axe', 'FOFURA MÁXIMA!', 'TRÁS, FRENTE + CHUTE ALTO', 280, '#e5e7eb', '#fff'] }[visualDe(i)];
    if (barra) { // barra especial embaixo da vida (AXÉ do Eddie, FIO da espada do Palito)
      const ax = (f[barra[0]] || 0) / 100, cheio = ax >= 1, ah = 6 * s;
      const blocos = visualDe(i) === 'blocos', barraY = blocos ? by + bh + 5 * s : by + bh - ah, barraH = blocos ? 18 * s : ah;
      ctx.fillStyle = blocos ? '#05141ce6' : '#000a'; ctx.fillRect(bx, barraY, bw, barraH);
      ctx.fillStyle = cheio ? 'hsl(' + (barra[3] + Math.sin(agora / 90) * 12) + ',100%,' + (55 + Math.sin(agora / 70) * 15) + '%)' : barra[4];
      ctx.fillRect(i === 0 ? bx : bx + bw * (1 - ax), barraY, bw * ax, barraH);
      if (blocos) {
        ctx.strokeStyle = '#67e8f9'; ctx.lineWidth = 2 * s; ctx.strokeRect(bx, barraY, bw, barraH);
        ctx.save(); ctx.font = 'bold ' + 12 * s + 'px Orbitron, system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = '#cffafe'; ctx.shadowColor = '#000'; ctx.shadowBlur = 4 * s;
        ctx.fillText('PEDRA ' + Math.floor(ax * 100) + '%', bx + bw / 2, barraY + barraH / 2); ctx.restore();
      }
      if (visualDe(i) === 'pretoVelho' && !cheio) {
        ctx.save(); ctx.font = 'bold ' + 9 * s + 'px Orbitron, system-ui'; ctx.textAlign = i === 0 ? 'left' : 'right';
        ctx.fillStyle = '#fecaca'; ctx.fillText('FÉ · ANCESTRAIS ' + Math.floor(ax * 100) + '%', i === 0 ? bx : bx + bw, by + bh + 13 * s); ctx.restore();
      }
      if (cheio) {
        ctx.save(); ctx.font = 'italic 900 ' + 13 * s + 'px Audiowide, Impact, system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.globalAlpha = 0.65 + 0.35 * Math.sin(agora / 120); ctx.lineWidth = 4 * s; ctx.strokeStyle = '#000';
        const lx = bx + bw / 2, ly = by + bh + 14 * s;
        ctx.strokeText(barra[1], lx, ly); ctx.fillStyle = barra[5]; ctx.fillText(barra[1], lx, ly);
        if (i === +eu || modoLocal || (modoIA && i === 0)) { ctx.font = 'bold ' + 9 * s + 'px Orbitron, system-ui'; ctx.fillStyle = '#fff'; ctx.fillText(barra[2], lx, ly + 13 * s); }
        ctx.restore();
      }
    }
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
    ctx.fillStyle = '#b91c1c'; ctx.font = 'bold ' + 11 * s + 'px Orbitron, system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('', mx, my + 1 * s);
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
    poderes: (B.st.poderes || []).map(pb => { const pa = (A.st.poderes || []).find(p => p.id === pb.id); return pa && pb.tipo !== 'raio' ? { ...pb, x: lerp(pa.x, pb.x, u) } : pb; }),
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
      if (st.perfis[i] && st.perfis[i].visual === 'bob') {
        for (let n = 0; n < 85; n++) pedacos.push({ x: f.x, y: f.y + 45 + Math.random() * 85, vx: (Math.random() - 0.5) * 24, vy: 4 + Math.random() * 20, fofo: true, pata: n % 9 === 0, tam: 3 + Math.random() * 10, cor: Math.random() < 0.7 ? '#fffdf8' : '#f4d47a', giro: Math.random() * 6, vg: (Math.random() - 0.5) * 0.5 });
      } else {
        for (let n = 0; n < 7; n++) pedacos.push({ x: f.x, y: f.y + 40 + Math.random() * 80, vx: (Math.random() - 0.5) * 18, vy: 10 + Math.random() * 14, giro: Math.random() * 6, vg: (Math.random() - 0.5) * 0.5, tam: n === 0 ? 0 : 26 + Math.random() * 14, cor, cabeca: n === 0 });
        for (let n = 0; n < 60; n++) pedacos.push({ x: f.x, y: f.y + 70, vx: (Math.random() - 0.5) * 24, vy: 4 + Math.random() * 20, sangue: true, tam: 3 + Math.random() * 5 });
      }
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
    if (q.fofo) {
      ctx.rotate(q.giro); ctx.fillStyle = q.cor;
      if (q.pata) {
        const r = q.tam * s; ctx.beginPath(); ctx.ellipse(0, r * .22, r * .55, r * .4, 0, 0, 7); ctx.fill();
        for (const [dx, dy] of [[-1, -0.55], [-.35, -1], [.35, -1], [1, -.55]]) { ctx.beginPath(); ctx.arc(dx * r * .42, dy * r * .55, r * .22, 0, 7); ctx.fill(); }
      } else { ctx.beginPath(); ctx.arc(0, 0, q.tam * s, 0, 7); ctx.fill(); }
    }
    else if (q.sangue) { ctx.fillStyle = '#b91c1c'; ctx.beginPath(); ctx.ellipse(0, 0, q.tam * s * (q.y ? 1 : 2.2), q.tam * s * (q.y ? 1 : 0.5), 0, 0, 7); ctx.fill(); }
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
  if (window.FB) FB.hud(vis, w, h, s, ox, agora);
  ctx.fillStyle = '#fff'; ctx.font = 'bold ' + 24 * s + 'px Orbitron, system-ui'; ctx.textAlign = 'center';
  ctx.font = 'bold ' + 30 * s + 'px Orbitron, system-ui'; ctx.fillStyle = st.tempo <= 10 ? '#ef4444' : '#fff';
  ctx.fillText(st.tempo != null ? st.tempo : '', ox + 400 * s, 38 * s);
  ctx.fillStyle = '#fff'; ctx.font = 'bold ' + 14 * s + 'px Orbitron, system-ui';
  ctx.fillText('Lutas ' + st.placar[0] + ' × ' + st.placar[1], ox + 400 * s, 60 * s);
  ctx.font = 'bold ' + 16 * s + 'px Orbitron, system-ui';
  if (modoLocal || modoIA) vis.p.forEach((f, i) => ctx.fillText(modoSim ? 'IA ' + (i + 1) : modoIA ? (i ? 'IA' : 'VOCÊ') : i === ladoTeclado() ? 'TECLADO' : 'CONTROLE', ...P(f.x, f.y + 175)));
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
    if (st.fatality) { ctx.fillStyle = '#dc2626'; ctx.font = 'italic 900 ' + 30 * s + 'px Orbitron, system-ui'; ctx.fillText(st.fatality.tipo === 'brutal' ? 'BRUTALITY' : 'FATALITY', w / 2, h * 0.38 - 52 * s); }
    ctx.fillStyle = '#fff'; ctx.font = 'bold ' + 18 * s + 'px Orbitron, system-ui';
    ctx.fillText('Rounds ' + st.vitorias[0] + ' × ' + st.vitorias[1] + ' · +1 ponto de habilidade pro ' + (st.campeao === 1 ? 'Vermelho' : 'Azul'), w / 2, h * 0.38 + 36 * s);
  } else if (st.vencedor && !mostrandoPopup && !st.finish) { // fim de um round: o próximo começa sozinho
    ctx.fillStyle = '#facc15'; ctx.font = 'bold ' + 40 * s + 'px Orbitron, system-ui'; ctx.lineWidth = 6 * s; ctx.strokeStyle = '#000';
    const t = st.vencedor === 3 ? 'EMPATE' : nome(st.vencedor) + ' VENCE O ROUND';
    ctx.strokeText(t, w / 2, h * 0.36); ctx.fillText(t, w / 2, h * 0.36);
  }
  $('#fim').classList.toggle('hide', !st.campeao || eu === null);
}
function somMsg(t) {
  if (t === 'FATALITY!') SOM.falaFatality();
  else if (t === 'BRUTALITY!') SOM.falaFatality('Brutality');
  else if (t === 'FATAL BLOW') SOM.fatalBlow();
  else if (/FATALITY|BRUTALITY/.test(t)) SOM.fatality();
  else if (/^ROUND/.test(t)) SOM.round();
  else if (/LUTE/.test(t)) SOM.lute();
  else if (/FINISH/.test(t)) SOM.finishHim();
  else if (/COMIDA/.test(t)) SOM.comida();
  else if (/BERIMBAU/.test(t)) SOM.berimbau();
  else if (/^BENZIMENTO/.test(t)) SOM.benze(t !== 'BENZIMENTO');
  else if (/^MANDINGA/.test(t)) SOM.mandinga(t === 'MANDINGA!');
  else if (t === 'ANCESTRAIS!') { SOM.mandinga(true); SOM.benze(true); }
  else if (t === 'AXÉ!') SOM.berimbau(true);
  else if (t === 'LÂMINA AFIADA!') SOM.corte();
  else if (/ESTRELA/.test(t)) SOM.estrela();
  else if (/MARTELO/.test(t)) SOM.martelo();
  else if (/AGIOTA CELESTIAL/.test(t)) SOM.lendarioAgiota();
  else if (/TIA DO ZAP/.test(t)) SOM.lendarioTiaZap();
  else if (/POMBO DEUS/.test(t)) SOM.lendarioPombo();
  else if (/^FOGO/.test(t)) SOM.fogo();
  else if (/^GELO/.test(t)) SOM.gelo();
  else if (/^RAIO/.test(t)) SOM.raioPega();
  else if (/^VENTO/.test(t)) SOM.vento();
  else if (/CONGELOU/.test(t)) SOM.congela();
  else if (/ZAP/.test(t)) {}
  else if (/TORNADO/.test(t)) SOM.vento();
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
  SOM.cenario(sessionStorage.getItem('cenario') || 'neon');
  SOM.musica(eu !== null && !st.campeao);
  if (st.perfis) SOM.ritmo(st.perfis.some(p => p && p.visual === 'eddie'), st.perfis.some(p => p && p.visual === 'pretoVelho'));
  snaps.push({ t: performance.now(), st }); if (snaps.length > 10) snaps.shift();
  if (st.msg && st.msg.id !== ultimoMsg) { ultimoMsg = st.msg.id; somMsg(st.msg.txt); if (!/FATALITY|BRUTALITY|FINISH|FATAL BLOW/.test(st.msg.txt)) popup = { txt: st.msg.txt, ini: performance.now() }; }
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
  if ((gp.buttons[4] && gp.buttons[4].pressed) || (gp.buttons[5] && gp.buttons[5].pressed)) agora.parryMod = true;
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
  if (eu === null) { // na tela de escolha: apertar o controle com ESTA janela em foco faz ela virar a janela do controle (se nenhuma outra já for)
    if (Object.keys(agora).length && !Object.keys(controleAnt).length && entrada !== 'controle' && document.hasFocus() && !donoControle()) setEntrada('controle');
  } else {
    for (const k of new Set([...Object.keys(agora), ...Object.keys(controleAnt)])) if (!!agora[k] !== !!controleAnt[k]) envia(k, !!agora[k], modoLocal ? 1 - ladoTeclado() : +eu);
    if (st && st.campeao && agora.socoAlto && !controleAnt.socoAlto) fetch('/reset', { method: 'POST' });
    if (st && st.campeao && agora.chuteAlto && !controleAnt.chuteAlto) trocaPersonagem();
  }
  controleAnt = agora;
}
// ---------- menu, árvore de habilidades e configurações ----------
const ARVORE = [
  { ramo: 'Força', itens: [
    { id: 'punho', ic: '', nome: 'Punho de Ferro', desc: 'Socos +20% de dano' },
    { id: 'chutePesado', ic: '', nome: 'Chute Pesado', desc: 'Chutes +20% de dano' },
    { id: 'fogoDuplo', ic: '', nome: 'Fogo Forte', desc: 'Bola de fogo mais rápida e com 15 de dano' } ] },
  { ramo: 'Defesa', itens: [
    { id: 'pele', ic: '', nome: 'Pele Grossa', desc: '+15 de vida máxima' },
    { id: 'defesaFirme', ic: '', nome: 'Defesa Firme', desc: 'Defender não perde vida' },
    { id: 'regen', ic: '', nome: 'Regeneração', desc: 'Recupera 1 de vida a cada 2s' } ] },
  { ramo: 'Agilidade', itens: [
    { id: 'pes', ic: '', nome: 'Pés Ligeiros', desc: 'Anda 20% mais rápido' },
    { id: 'puloDuplo', ic: '', nome: 'Pulo Duplo', desc: 'Aperte pular de novo no ar' },
    { id: 'levanta', ic: '', nome: 'Levanta Rápido', desc: 'Fica menos tempo caído' } ] },
  { ramo: 'Bob Maltês', apenasBob: true, itens: [
    { id: 'bobFofura', ic: '', nome: 'Coração Valente', desc: 'Bob: +70 de vida máxima e +20% de dano em todos os ataques' } ] },
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
  if (pagina === 'principal') c.innerHTML = '<h2>Menu</h2>' + bt('continuar', '▶ Continuar') + bt('skills', 'Árvore de habilidades') + bt('pers', 'Personagem') + bt('config', 'Configurações') + bt('finish', 'Simular FINISH HIM') + bt('sair', 'Sair do jogo');
  if (pagina === 'skills') {
    const pf = st ? st.perfis[abaSkill] : { pontos: 0, skills: [] };
    c.innerHTML = '<h2>Árvore de habilidades</h2><div class="abas">' + bt('aba0', 'Vermelho', 'mb' + (abaSkill === 0 ? ' sel' : '')) + bt('aba1', 'Azul', 'mb' + (abaSkill === 1 ? ' sel' : '')) + '</div>'
      + '<p style="text-align:center;margin:8px 0">Pontos: <b style="color:#facc15;font-size:24px">' + pf.pontos + '</b> &nbsp;·&nbsp; cada vitória = 1 ponto</p><div class="arvore">'
      + ARVORE.filter(r => !r.apenasBob || pf.visual === 'bob').map(r => '<div class="ramo"><h3>' + r.ramo + '</h3>' + r.itens.map((sk, j) => {
          const tem = pf.skills.includes(sk.id), req = j === 0 || pf.skills.includes(r.itens[j - 1].id), pode = !tem && req && pf.pontos > 0;
          const status = tem ? 'aprendida' : !req ? 'aprenda a de cima' : pode ? 'aprender (1 ponto)' : 'precisa de 1 ponto';
          return (j ? '<div class="seta">⬇</div>' : '') + bt('sk:' + sk.id, sk.nome + '<br><small>' + sk.desc + '</small><br><small>' + status + '</small>', 'sk ' + (tem ? 'tem' : pode ? 'pode' : !req ? 'bloq' : ''));
        }).join('') + '</div>').join('') + '</div>'
      + '<p style="font-size:12px;opacity:.7;text-align:center">Vida extra começa a valer na próxima luta.</p>'
      + bt('resetSk', 'Devolver pontos e esquecer habilidades') + bt('voltar', '⬅ Voltar');
  }
  if (pagina === 'pers') {
    const vis = i => (st && st.perfis[i].visual) || 'palito';
    const skin = (i, t) => skinDoLutador(i, t);
    const PERS = [['palito', 'Palito', [['padrao', 'Padrão'], ['fogo', '🔥 Fogo'], ['pirata', '🏴‍☠️ Rei Pirata']]], ['blocos', 'Blocos', [['padrao', 'Padrão'], ['astronauta', 'Astronauta'], ['gelo', '❄️ Gelo']]], ['eddie', 'Eddie', [['padrao', 'Padrão'], ['trovao', '⚡ Trovão']]], ['pretoVelho', 'Preto Velho', [['padrao', 'Padrão'], ['vento', '🌪️ Vento']]], ['bob', 'Bob Maltês', [['padrao', 'Maltês Branco'], ['gala', '🎀 Gala'], ['dourado', '✨ Dourado']]]];
    c.innerHTML = '<h2>Personagem</h2>' + [0, 1].map(i => '<h3>' + (i ? 'Azul' : 'Vermelho') + '</h3>'
      + PERS.map(([t, nome, skins]) => '<div class="ramo">' + bt('v:' + i + ':' + t, nome + (vis(i) === t ? ' ' : ''), 'mb' + (vis(i) === t ? ' sel' : ''))
        + '<small style="opacity:.7">Skins:</small>' + skins.map(([k, n]) => bt('s:' + i + ':' + t + ':' + k, n + (skin(i, t) === k ? ' ' : ''), 'mb' + (skin(i, t) === k ? ' sel' : ''))).join('') + '</div>').join('')).join('')
      + '<p style="font-size:12px;opacity:.7;text-align:center">Troca na hora. Blocos fica mais bonito com Gráficos 3D ligado.</p>' + bt('voltar', '⬅ Voltar');
  }
  if (pagina === 'config') {
    const tg = (a, t, v) => bt(a, t + ': <b style="color:' + (v ? '#4ade80' : '#f87171') + '">' + (v ? 'LIGADO' : 'DESLIGADO') + '</b>');
    const cf = st ? st.config : { itens: true, vida: 300 };
    c.innerHTML = '<h2>Configurações</h2><h3>Nesta tela</h3>' + tg('o:modo3d', 'Gráficos 3D', opc.modo3d) + tg('o:botoes', 'Botões na tela', opc.botoes) + tg('o:vibrar', 'Vibração', opc.vibrar) + tg('o:tremor', 'Tremer a tela', opc.tremor) + tg('o:numeros', 'Números de dano', opc.numeros) + tg('o:sangue', 'Sangue', opc.sangue)
      + '<h3>Partida (vale pros dois, a partir da próxima luta)</h3>' + tg('itens', 'Itens caindo', cf.itens) + bt('vida', 'Vida inicial: <b style="color:#facc15">' + cf.vida + '</b> (toque pra trocar)') + bt('voltar', '⬅ Voltar');
  }
  const bs = [...c.querySelectorAll('button')]; foco = Math.min(foco, bs.length - 1);
  bs.forEach((b, i) => { b.classList.toggle('foco', i === foco); b.onclick = () => { foco = i; acaoMenu(b.dataset.a); }; });
}
function acaoMenu(a) {
  if (a === 'continuar') return fechaMenu();
  if (a === 'sair') { fechaMenu(); soltaTudo(); saiIA(); eu = null; modoLocal = false; sessionStorage.removeItem('lutador'); sessionStorage.setItem('local', '0'); mostra(); return; }
  if (a === 'skills') { pagina = 'skills'; foco = 0; if (eu !== null && !modoLocal) abaSkill = +eu; }
  if (a === 'config') { pagina = 'config'; foco = 0; }
  if (a === 'finish') { post('/simulaFinish', { p: eu !== null && !modoLocal ? +eu : 0 }); return fechaMenu(); }
  if (a === 'pers') { pagina = 'pers'; foco = 0; }
  if (a.startsWith('s:')) { const [, p, tipo, sk] = a.split(':'); sessionStorage.setItem('skinLocal' + p + ':' + tipo, sk); post('/skin', { p: +p, tipo, skin: sk }); }
  if (a.startsWith('v:')) { const [, p, tipo] = a.split(':'); post('/personagem', { p: +p, tipo }); }
  if (a === 'voltar') { pagina = 'principal'; foco = 0; }
  if (a.startsWith('aba')) abaSkill = +a.slice(3);
  if (a.startsWith('sk:')) post('/skill', { p: abaSkill, id: a.slice(3) });
  if (a === 'resetSk') post('/resetSkills', { p: abaSkill });
  if (a.startsWith('o:')) { const k = a.slice(2); opc[k] = !opc[k]; salvaOpc(); }
  if (a === 'itens' && st) post('/config', { itens: !st.config.itens });
  if (a === 'vida' && st) post('/config', { vida: { 300: 350, 350: 400, 400: 300 }[st.config.vida] || 300 });
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

// Servidor do jogo de luta (estilo Mortal Kombat clássico): lógica da luta, itens, habilidades.
// O cliente fica em public/. Sem dependências: node server.js
const http = require('http');
const os = require('os');
const PORT = +process.env.PORT || 8081;

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
  fatalBlow:     { dur: 22, ativo: [8, 13], alcance: 115, y: [0, 160], dano: 0,  empurra: 6, investida: 13 },
  martelada:     { dur: 14, ativo: [5, 9],  alcance: 110, y: [0, 160],  dano: 12, empurra: 24, derruba: true, lanca: 10, msg: 'MARTELADA!' },
  socoRocha:     { dur: 16, ativo: [6, 9], alcance: 105, y: [65, 135], dano: 12, empurra: 22, msg: 'SOCO DE ROCHA!' },
  chuteCristal:  { dur: 18, ativo: [7, 11], alcance: 125, y: [20, 100], dano: 13, empurra: 20, derruba: true, lanca: 7, msg: 'CHUTE DE CRISTAL!' },
  meteoroPedra:  { dur: 28, ativo: [99, 99], alcance: 0, y: [0, 0], dano: 0, empurra: 0 },
  // ---- Eddie (capoeira): golpes próprios ----
  armada:        { dur: 18, ativo: [7, 11],  alcance: 108, y: [80, 145], dano: 11, empurra: 16, msg: 'ARMADA!' },
  meiaLua:       { dur: 22, ativo: [9, 13],  alcance: 120, y: [55, 150], dano: 14, empurra: 20, derruba: true, lanca: 9, msg: 'MEIA-LUA DE COMPASSO!' },
  bencao:        { dur: 14, ativo: [5, 8],   alcance: 102, y: [50, 115], dano: 8,  empurra: 34, msg: 'BÊNÇÃO!' },
  rabo:          { dur: 20, ativo: [8, 12],  alcance: 112, y: [10, 95],  dano: 12, empurra: 14, agachado: true, derruba: true, lanca: 7, msg: 'RABO DE ARRAIA!' },
  au:            { dur: 20, ativo: [7, 14],  alcance: 82,  y: [60, 160], dano: 9,  empurra: 14, avanca: 8, msg: 'AÚ!' },
  parafuso:      { dur: 18, ativo: [4, 12],  alcance: 104, y: [30, 125], dano: 12, empurra: 18, ar: true, derruba: true, lanca: 8, msg: 'PARAFUSO!' },
  // super (barra de AXÉ cheia): redemoinho de chutes, 5 acertos, o último derruba
  tempestade:    { dur: 52, ativo: [6, 44],  alcance: 108, y: [0, 160],  dano: 5,  empurra: 3, avanca: 5,
                   multi: [[6, 9], [14, 17], [22, 25], [30, 33], [40, 44]], final: { dano: 12, empurra: 26, derruba: true, lanca: 15, msg: 'TEMPESTADE DE CAPOEIRA!' } },
  // ---- Palito (espada): super da barra de FIO cheia — avança dando 6 cortes, o último derruba ----
  milCortes:     { dur: 48, ativo: [4, 42],  alcance: 118, y: [0, 160],  dano: 5,  empurra: 2, avanca: 6,
                   multi: [[4, 7], [11, 14], [18, 21], [25, 28], [32, 35], [39, 42]], final: { dano: 14, empurra: 28, derruba: true, lanca: 16, msg: 'MIL CORTES!' } },
  mordida:       { dur: 14, ativo: [5, 8], alcance: 105, y: [65, 135], dano: 10, empurra: 18, msg: 'MORDIDA!' },
  patada:        { dur: 12, ativo: [4, 7], alcance: 95, y: [20, 90], dano: 8, empurra: 13, msg: 'PATADA!' },
  rabada:        { dur: 17, ativo: [6, 10], alcance: 118, y: [25, 120], dano: 12, empurra: 18, derruba: true, lanca: 7, msg: 'RABADA!' },
  latido:        { dur: 16, ativo: [99, 99], alcance: 0, y: [0, 0], dano: 0, empurra: 0 },
  furacaoBob:    { dur: 48, ativo: [6, 42], alcance: 112, y: [0, 170], dano: 5, empurra: 3, avanca: 4,
                   multi: [[6, 9], [14, 17], [22, 25], [30, 33], [38, 42]], final: { dano: 14, empurra: 24, derruba: true, lanca: 14, msg: 'FURACÃO DE PELOS!' } },
};
// ---- Preto Velho: bengala, cachimbo, benzimento e mandinga ----
Object.assign(GOLPES, {
  // super (barra de FÉ cheia): luzes dos ancestrais voam até o inimigo, 4 acertos de longe, o último joga pro alto
  ancestrais:      { dur: 50, ativo: [10, 40], alcance: 460, y: [0, 230], dano: 6, empurra: 2,
                     multi: [[10, 13], [18, 21], [26, 29], [34, 40]], final: { dano: 14, empurra: 20, derruba: true, lanca: 18, msg: 'CHAMADO DOS ANCESTRAIS!' } },
  bengalada:       { dur: 16, ativo: [7, 10],  alcance: 128, y: [70, 170], dano: 10, empurra: 18, msg: 'BENGALADA!' },
  rasteiraBengala: { dur: 18, ativo: [7, 10],  alcance: 132, y: [0, 30],   dano: 7,  empurra: 8, agachado: true, baixo: true, derruba: true, lanca: 5, msg: 'RASTEIRA DE BENGALA!' },
  fumaca:          { dur: 18, ativo: [99, 99], alcance: 0,   y: [0, 0],    dano: 0,  empurra: 0 }, // solta a nuvem no tick 9
  benze:           { dur: 42, ativo: [99, 99], alcance: 0,   y: [0, 0],    dano: 0,  empurra: 0 }, // cura no tick 30
  mandinga:        { dur: 24, ativo: [99, 99], alcance: 0,   y: [0, 0],    dano: 0,  empurra: 0 }, // contra-ataque se apanhar
});
for (const k in GOLPES) GOLPES[k].nome = k;
const FUMACA = { nome: 'fumaca', dano: 6, empurra: 4, msg: 'FUMAÇA DO CACHIMBO!' };
const BENZE_CURA = 15, BENZE_ESPERA = 30 * 10, ZONZO = 36, MANDINGA_JANELA = 20, MANDINGA_DANO = 12;
const AXE_MAX = 100;
// Número de transições permitidas depois de um acerto; cada estilo tem seu ritmo.
const COMBOS = { palito: { cancels: 3, stun: 18, recuo: 0.45 }, blocos: { cancels: 2, stun: 17, recuo: 0.4 }, eddie: { cancels: 4, stun: 20, recuo: 0.35 }, pretoVelho: { cancels: 2, stun: 19, recuo: 0.4 }, bob: { cancels: 4, stun: 17, recuo: 0.32 } };
const MAGIA = { dano: 10, empurra: 16, msg: 'BOLA DE FOGO!' };
const PEDRA = { nome: 'magia', dano: 10, empurra: 16, msg: 'PEDRA DE CRISTAL!' };
const METEORO = { nome: 'meteoroPedra', dano: 24, empurra: 28, derruba: true, lanca: 10, msg: 'METEORO DE PEDRA!' };
const LATIDO = { nome: 'latido', dano: 9, empurra: 13, msg: 'AU AU!' };
const ATAQUES = ['socoAlto', 'socoBaixo', 'chuteAlto', 'chuteBaixo'];
// itens que caem do céu (estilo Smash): pega encostando
const ITENS = ['comida', 'estrela', 'martelo', 'fogo', 'gelo', 'raio', 'vento'];
const ELEMENTOS = ['fogo', 'gelo', 'raio', 'vento']; // caem devagar, como meteoros
const LENDARIOS = ['agiota', 'tiaZap', 'pombo']; // um drop especial por rodada
const INTERVALO_LENDARIO = 30 * 20;
const ESTRELA = 150, MARTELO = 180, VIDA_ITEM = 450; // em ticks (30 por segundo)
// poderes elementais: FOGO = punhos em chamas (queima), GELO = estacas de gelo pelo chão (congela),
// RAIO = 3 raios caindo em cima do outro, VENTO = tornado que arremessa
const FOGO = 300, QUEIMA = 90, CONGELA = 66, RAIO_CICLO = 26, RAIO_AVISO = 17, RAIOS = 3;
for (const k in GOLPES) GOLPES[k].nome = k;
MAGIA.nome = 'magia';

// árvore de habilidades: cada vitória dá 1 ponto; cada habilidade precisa da anterior do mesmo ramo
const SKILLS = {
  punho: null, chutePesado: 'punho', fogoDuplo: 'chutePesado',
  pele: null, defesaFirme: 'pele', regen: 'defesaFirme',
  pes: null, puloDuplo: 'pes', levanta: 'puloDuplo',
  bobFofura: null,
};
const fs = require('fs'), path = require('path');
const PUBLIC = path.join(__dirname, 'public');
const ARQ = path.join(__dirname, 'perfis.json');
let perfis = [{ pontos: 0, skills: [] }, { pontos: 0, skills: [] }];
try { perfis = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch {
  // arquivo corrompido (versão antiga do salva): aproveita o primeiro JSON válido do começo
  try { const txt = fs.readFileSync(ARQ, 'utf8'); for (let n = txt.length; n > 0; n--) if (txt[n - 1] === ']') { try { perfis = JSON.parse(txt.slice(0, n)); break; } catch {} } } catch {}
}
if (!Array.isArray(perfis) || perfis.length < 2) perfis = [{ pontos: 0, skills: [] }, { pontos: 0, skills: [] }];
perfis.forEach(pf => { pf.pontos = pf.pontos | 0; if (!Array.isArray(pf.skills)) pf.skills = []; });
// skins disponíveis por personagem (a primeira é a padrão)
const SKINS = { palito: ['padrao', 'fogo', 'pirata'], blocos: ['padrao', 'astronauta', 'gelo'], eddie: ['padrao', 'trovao'], pretoVelho: ['padrao', 'vento'], bob: ['padrao', 'gala', 'dourado'] };
perfis.forEach(pf => { if (pf.visual === 'astronauta') { pf.visual = 'blocos'; pf.skins = { blocos: 'astronauta' }; } });
perfis.forEach(pf => { if (!SKINS[pf.visual || 'palito']) pf.visual = 'palito'; });
// grava inteiro num arquivo temporário e troca de uma vez (renomear é atômico):
// gravações sobrepostas não deixam mais pedaço velho no fim do JSON
const salva = () => { try { const tmp = ARQ + '.' + process.pid + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(perfis)); fs.renameSync(tmp, ARQ); } catch (e) { console.warn('não salvou perfis', e.message); } };
const tem = (i, sk) => perfis[i].skills.includes(sk);
const ehEddie = i => perfis[i] && perfis[i].visual === 'eddie';
const ehVelho = i => perfis[i] && perfis[i].visual === 'pretoVelho';
const ehPalito = i => perfis[i] && (perfis[i].visual || 'palito') === 'palito';
const ehBlocos = i => perfis[i] && perfis[i].visual === 'blocos';
const ehBob = i => perfis[i] && perfis[i].visual === 'bob';
const estilo = i => COMBOS[(perfis[i] && perfis[i].visual) || 'palito'];
// palito luta de espada: mesmos golpes, nomes próprios
const MSG_PALITO = { giro: 'ESPADA GIRATÓRIA!', magia: 'ESPADA VOADORA!' };
const config = { itens: true, vida: 300 };

const placar = [0, 0];
let jogo, tick = 0, msgId = 0, itemId = 0;
const clients = new Set();

function lutador(x, facing, i) {
  const vidaMax = config.vida + (tem(i, 'pele') ? 15 : 0) + (ehVelho(i) ? 10 : 0) + (ehBob(i) && tem(i, 'bobFofura') ? 70 : 0);
  return { x, y: 0, vx: 0, vy: 0, facing, hp: vidaMax, vidaMax, pulouDuplo: false, puloAnt: false, acao: 'parado', dur: 0, t: 0, atingiu: false, stun: 0, agachado: false, noAr: false, estrela: 0, martelo: 0, fogo: 0, queima: 0, axe: 0, fio: 0, combo: 0, hitN: 0, cancels: 0, acertou: false, benzeEspera: 0, parryAte: 0, parryEfeito: 0, socoVar: 0, keys: {}, fila: [], dirs: [] };
}
function msg(txt) { jogo.msg = { txt, id: ++msgId }; }
// luta estilo Mortal Kombat: melhor de 3 rounds, 99 segundos por round
const ROUNDS_VITORIA = 2, TEMPO = 99 * 30, INTRO = 50, PAUSA_ROUND = 100;
let vitorias = [0, 0], rodada = 0, campeao = null, fatalUsado = [false, false];
function novaRodada() {
  rodada++;
  // vencedor = quem levou o round (3 = empate); congela a luta até o próximo round
  jogo = { p: [lutador(200, 1, 0), lutador(600, -1, 1)], magias: [], itens: [], poderes: [], proximoItem: tick + INTRO + 30 * 4, lendarioTick: tick + INTRO + INTERVALO_LENDARIO, vencedor: null, finish: null, fatality: null, fatalBlow: null, fimTick: 0, inicio: tick + INTRO, tempo: TEMPO, placar, msg: null, danos: [] };
  msg(rodada === 3 ? 'ROUND FINAL' : 'ROUND ' + rodada);
}
function novaLuta() { fatalUsado = [false, false]; vitorias = [0, 0]; rodada = 0; campeao = null; novaRodada(); }
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
const FINISH = 30 * 30, FATALITY = 110, FATALITY_ESPADA = 170, FATALITY_PEDRA = 165, FATALITY_CAPOEIRA = 150, CAPOEIRA_EXPLODE = 66, FATALITY_ANCESTRAL = 150, ANCESTRAL_EXPLODE = 76, FATALITY_BOB = 72, BOB_EXPLODE = 42;
// brutality: gancho que acerta o inimigo com 5% de vida ou menos no round que fecha a luta; ele explode
const BRUTAL_EXPLODE = 7, BRUTALITY = 74, BRUTAL_VIDA = 0.05;
function fatality(eu) {
  const d = eu.dirs.filter(x => tick - x.t < 60).slice(-3);
  return d.length === 3 && d[0].dir === -eu.facing && d[1].dir === eu.facing && d[2].dir === 0;
}
function finishHim() {
  const f = jogo.finish, quem = jogo.p[f.v - 1], alvo = jogo.p[2 - f.v];
  if (jogo.fatality) { // animação do fatality rolando
    const id = tick - jogo.fatality.t, espada = jogo.fatality.tipo === 'espada';
    if (jogo.fatality.tipo === 'brutal') { // brutality: o inimigo explode logo depois do gancho
      quem.vx = alvo.vx = 0;
      if (id === BRUTAL_EXPLODE) alvo.explodiu = true;
      if (id >= BRUTALITY) fechaLuta(f.v, 'BRUTALITY!');
      return;
    }
    if (espada) { // palito: saca espada, corta a cabeça, chute no tronco, soco arranca a cabeça
      quem.vx = alvo.vx = 0;
      if (id === 62) alvo.decapitado = true;
    } else if (jogo.fatality.tipo === 'pedra') { // blocos: punho vira pedra, soco, pedra gigante gira e esmaga
      quem.vx = alvo.vx = 0;
      if (id === 72) alvo.esmagado = true;
    } else if (jogo.fatality.tipo === 'capoeira') { // eddie: armada, meia-lua, redemoinho de axé e chute final que explode
      quem.vx = alvo.vx = 0;
      if (id === CAPOEIRA_EXPLODE) alvo.explodiu = true;
    } else if (jogo.fatality.tipo === 'ancestral') { // preto velho: baforada, nuvem de fumaça, o outro levita e a bengala bate no chão
      quem.vx = alvo.vx = 0;
      if (id === ANCESTRAL_EXPLODE) alvo.explodiu = true;
    } else if (jogo.fatality.tipo === 'bob') { // Bob dispara um latido de energia e arremessa o rival
      quem.vx = alvo.vx = 0;
      if (id === 8) { quem.acao = 'latido'; quem.dur = GOLPES.latido.dur; quem.t = 0; quem.atingiu = true; }
      if (id === 18) jogo.magias.push({ x: quem.x + quem.facing * 45, y: 95, dir: quem.facing, dono: f.v - 1, latido: true });
      if (id === 24) { quem.acao = 'furacaoBob'; quem.dur = GOLPES.furacaoBob.dur; quem.t = 0; quem.atingiu = true; }
      alvo.y = id >= 26 && id < BOB_EXPLODE ? Math.sin((id - 26) / (BOB_EXPLODE - 26) * Math.PI) * 110 : 0;
      if (id === BOB_EXPLODE) alvo.explodiu = true;
    } else if (id === 12) alvo.explodiu = true;
    const tipo = jogo.fatality.tipo;
    if (id >= (espada ? FATALITY_ESPADA : tipo === 'pedra' ? FATALITY_PEDRA : tipo === 'capoeira' ? FATALITY_CAPOEIRA : tipo === 'ancestral' ? FATALITY_ANCESTRAL : tipo === 'bob' ? FATALITY_BOB : FATALITY)) fechaLuta(f.v, 'FATALITY!'); // fala no final
    return;
  }
  if (alvo.y === 0 && alvo.acao !== 'tonto') { alvo.acao = 'tonto'; alvo.stun = 0; alvo.vx = 0; }
  if (tick >= f.ate) return fechaLuta(f.v, (f.v === 1 ? 'VERMELHO' : 'AZUL') + ' VENCE');
  const press = quem.fila.find(x => x.k === 'socoAlto');
  if (press && fatality(quem) && Math.abs(quem.x - alvo.x) < 170) {
    jogo.fatality = { t: tick, quem: f.v - 1, tipo: { palito: 'espada', eddie: 'capoeira', pretoVelho: 'ancestral', bob: 'bob' }[perfis[f.v - 1].visual || 'palito'] || 'pedra' };
    quem.acao = 'gancho'; quem.dur = GOLPES.gancho.dur; quem.t = 0; quem.atingiu = true; quem.fila = [];
    msg('FATALITY');
  }
}

// FATAL BLOW (Mortal Kombat 11): com 30% de vida ou menos, soco alto + chute alto juntos.
// Uma vez por luta se acertar; se errar ou for defendido, pode tentar de novo depois de 3 s.
const FATAL_VIDA = 0.3, FATAL_ESPERA = 90, FATAL_DANO = 0.3;
// sequência cinematográfica (ticks desde o acerto): golpe que o atacante faz, quando acerta e quanto do dano total
const FATAL_SEQ = [{ ini: 4, golpe: 'socoAlto', eddie: 'bencao', velho: 'bengalada', bate: 7, parte: 0.25 }, { ini: 20, golpe: 'chuteAlto', eddie: 'armada', velho: 'rasteiraBengala', bate: 26, parte: 0.25 }, { ini: 38, golpe: 'gancho', eddie: 'meiaLua', velho: 'gancho', bate: 44, parte: 0.5 }];
const FATAL_FIM = 72;
function fatalPronto(eu) {
  const i = jogo.p.indexOf(eu);
  return !fatalUsado[i] && !jogo.vencedor && !jogo.fatalBlow && tick >= jogo.inicio && tick >= (eu.fatalEspera || 0) && eu.hp > 0 && eu.hp <= eu.vidaMax * FATAL_VIDA;
}
// apertou soco alto e chute alto com no máximo 5 ticks de diferença, agora há pouco
function juntos(eu) {
  const a = eu.apertou || {}, s = a.socoAlto, c = a.chuteAlto;
  return s != null && c != null && Math.abs(s - c) <= 5 && tick - Math.max(s, c) <= 2;
}
function aperta(eu, k) { eu.fila.push({ k, t: tick, frente: !!eu.keys[eu.facing === 1 ? 'dir' : 'esq'] }); (eu.apertou || (eu.apertou = {}))[k] = tick; }
function fatalBlowPasso() {
  const fb = jogo.fatalBlow, id = tick - fb.t, quem = jogo.p[fb.quem], alvo = jogo.p[fb.alvo];
  quem.vx = 0;
  alvo.x = Math.max(40, Math.min(W - 40, quem.x + quem.facing * 62)); // gruda no atacante
  if (alvo.y === 0 && alvo.acao !== 'caido') alvo.vx = 0;
  for (const s of FATAL_SEQ) {
    if (id === s.ini) { const gn = ehEddie(fb.quem) ? s.eddie : ehVelho(fb.quem) ? s.velho : s.golpe; quem.acao = gn; quem.dur = GOLPES[gn].dur; quem.t = 0; quem.atingiu = true; }
    if (id === s.bate) {
      const ultimo = s === FATAL_SEQ[FATAL_SEQ.length - 1];
      const n = ultimo ? fb.dano - fb.dado : Math.round(fb.dano * s.parte);
      fb.dado += n;
      alvo.dur = 0; alvo.t = 0; alvo.agachado = false;
      if (ultimo) { alvo.acao = 'caido'; alvo.stun = 30; alvo.vy = 17; alvo.vx = quem.facing * 5; }
      else { alvo.acao = 'apanhou'; alvo.stun = 99; }
      dano(alvo, n, quem);
    }
  }
  if (GOLPES[quem.acao] && quem.t < quem.dur) quem.t++;
  else if (GOLPES[quem.acao]) { quem.acao = 'parado'; quem.dur = 0; }
  if (id > FATAL_SEQ[FATAL_SEQ.length - 1].bate) { // depois do último golpe o alvo voa e cai
    alvo.x += alvo.vx; alvo.y = Math.max(0, alvo.y + alvo.vy); alvo.vy = alvo.y > 0 ? alvo.vy - 1.6 : 0;
  }
  if (id >= FATAL_FIM) { jogo.fatalBlow = null; quem.acao = 'parado'; quem.dur = 0; }
}

function frenteFrente(eu) {
  const d = eu.dirs.filter(x => tick - x.t < 36).slice(-2);
  return d.length === 2 && d.every(x => x.dir === eu.facing) && d[1].t - d[0].t <= 20;
}

// trás, frente (meia-lua pra frente) há pouco: comando do super do Eddie
function trasFrente(eu) {
  const d = eu.dirs.filter(x => tick - x.t < 50 && x.dir !== 0).slice(-2);
  return d.length === 2 && d[0].dir === -eu.facing && d[1].dir === eu.facing;
}

function trasTras(eu) {
  const d = eu.dirs.filter(x => tick - x.t < 36).slice(-2);
  return d.length === 2 && d.every(x => x.dir === -eu.facing) && d[1].t - d[0].t <= 20;
}

function escolhe(eu, botao, press) {
  const k = eu.keys, idx = jogo.p.indexOf(eu), ed = ehEddie(idx), pv = ehVelho(idx), bob = ehBob(idx);
  const tras = eu.facing === 1 ? k.esq : k.dir, frente = eu.facing === 1 ? k.dir : k.esq;
  if (eu.martelo > 0 && eu.y === 0) return 'martelada';
  if (eu.y > 0) return eu.noAr ? null : botao.startsWith('soco') ? 'socoAereo' : ed && botao === 'chuteAlto' ? 'parafuso' : 'voadora';
  if (ed && botao === 'chuteAlto' && eu.axe >= AXE_MAX && trasFrente(eu)) return 'tempestade';
  if (bob && botao === 'chuteAlto' && trasFrente(eu)) { if (eu.axe >= AXE_MAX) return 'furacaoBob'; msg('FOFURA ' + Math.floor(eu.axe) + '%'); }
  if (bob && botao === 'socoAlto' && frente) return 'mordida';
  if (bob && botao === 'socoBaixo' && (k.baixo || frente)) return 'patada';
  if (bob && botao === 'chuteAlto' && tras) return 'rabada';
  if (bob && botao === 'chuteBaixo' && (frente || press?.frente || frenteFrente(eu)) && !jogo.magias.some(m => m.dono === idx && m.latido)) return 'latido';
  if (pv) {
    if (botao === 'socoAlto' && eu.axe >= AXE_MAX && trasFrente(eu)) return 'ancestrais';
    if (botao === 'socoAlto' && frenteFrente(eu) && !jogo.magias.some(m => m.dono === idx)) return 'fumaca';
    if (botao === 'socoBaixo' && trasTras(eu) && tick >= eu.benzeEspera) return 'benze';
    if (tras && botao === 'chuteAlto') return 'mandinga';
    if (tras && botao === 'socoBaixo') return 'rasteiraBengala';
    if (frente && botao === 'socoAlto') return 'bengalada';
  }
  if (ehPalito(idx) && botao === 'socoAlto' && eu.fio >= AXE_MAX && trasFrente(eu)) return 'milCortes';
  if (ehBlocos(idx) && botao === 'socoAlto' && eu.axe >= AXE_MAX && trasFrente(eu)) return 'meteoroPedra';
  if (ehBlocos(idx) && (frente || press?.frente) && botao === 'socoBaixo') return 'socoRocha';
  if (ehBlocos(idx) && (frente || press?.frente) && botao === 'chuteBaixo') return 'chuteCristal';
  if (ehBlocos(idx) && (frente || press?.frente) && botao === 'socoAlto' && !jogo.magias.some(m => m.dono === idx)) return 'magia';
  if (botao === 'socoAlto' && frenteFrente(eu) && !jogo.magias.some(m => m.dono === idx)) return 'magia';
  if (ed && botao === 'chuteBaixo' && frenteFrente(eu)) return 'au';
  if (k.baixo) return ed && botao === 'chuteAlto' ? 'rabo' : { socoAlto: 'gancho', socoBaixo: 'socoAgachado', chuteAlto: 'chuteAgachado', chuteBaixo: 'chuteAgachado' }[botao];
  if (tras && botao === 'chuteBaixo') return 'rasteira';
  if (tras && botao === 'chuteAlto') return ed ? 'meiaLua' : 'giro';
  if (ed && frente && botao === 'chuteAlto') return 'armada';
  if (ed && frente && botao === 'chuteBaixo') return 'bencao';
  return botao;
}
// começa um golpe (do zero ou cancelando outro num combo)
function ganhaFe(eu, n) { if (ehVelho(jogo.p.indexOf(eu))) eu.axe = Math.min(AXE_MAX, eu.axe + n); }
function iniciaGolpe(eu, nome) {
  const idx = jogo.p.indexOf(eu);
  eu.acao = nome; eu.dur = GOLPES[nome].dur; eu.t = 0; eu.atingiu = false; eu.acertou = false; eu.hitN = 0;
  eu.agachado = !!GOLPES[nome].agachado;
  if (eu.y > 0) eu.noAr = true;
  if (nome === 'tempestade') { eu.axe = 0; msg('AXÉ!'); }
  if (nome === 'meteoroPedra') { eu.axe = 0; msg('METEORO DE PEDRA!'); }
  if (nome === 'furacaoBob') { eu.axe = 0; msg('FURACÃO DE PELOS!'); }
  if (nome === 'latido') msg('AU AU!');
  if (nome === 'milCortes') { eu.fio = 0; msg('LÂMINA AFIADA!'); }
  if (nome === 'magia' && ehEddie(idx)) msg('BERIMBAU!');
  if (nome === 'benze') { eu.benzeEspera = tick + BENZE_ESPERA; msg('BENZIMENTO'); ganhaFe(eu, 10); }
  if (nome === 'ancestrais') { // gasta a fé e ainda recupera um pouco de vida
    eu.axe = 0; const antes = eu.hp; eu.hp = Math.min(eu.vidaMax, eu.hp + 10);
    if (eu.hp !== antes) jogo.danos.push({ p: idx, n: antes - eu.hp, id: ++msgId });
    msg('ANCESTRAIS!');
  }
  if (nome === 'mandinga') msg('MANDINGA');
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
  if (o.acao === 'mandinga' && o.t <= MANDINGA_JANELA && !jogo.vencedor) { // preto velho na mandinga: o golpe não pega e ele revida
    o.facing = eu.x > o.x ? 1 : -1;
    o.acao = 'bengalada'; o.dur = GOLPES.bengalada.dur; o.t = 6; o.atingiu = true; o.agachado = false;
    if (Math.abs(eu.x - o.x) < 220 && !caiAlvo(eu)) {
      eu.dur = 0; eu.t = 0; eu.agachado = false;
      dano(eu, MANDINGA_DANO, o);
      if (eu.hp > 0) { eu.acao = 'caido'; eu.stun = 26; eu.vy = 12; eu.vx = o.facing * 6; }
    }
    ganhaFe(o, 20);
    return msg('MANDINGA!');
  }
  const defendeu = o.acao === 'defesa' && o.facing === -dir && (!g.baixo || o.agachado);
  if (defendeu && tick <= o.parryAte && !jogo.vencedor) {
    o.parryAte = 0; o.parryEfeito = tick + 9;
    eu.dur = 0; eu.t = 0; eu.acao = 'apanhou'; eu.stun = 75; eu.vx = -dir * 5;
    o.vx = 0; o.combo = 0; msg('PARRY!'); return;
  }
  o.vx = dir * (defendeu ? g.empurra / 3 : g.empurra) * 0.3;
  const ie = jogo.p.indexOf(eu), io = jogo.p.indexOf(o);
  const emCombo = o.stun > 0 && (o.acao === 'apanhou' || o.acao === 'congelado'); // ainda atordoado do golpe anterior
  if (!g.derruba && g.nome !== 'bencao' && !g.multi && g.nome !== 'magia') o.vx *= estilo(ie).recuo;
  let mult = 1;
  if ((/^soco|gancho/.test(g.nome) || ['mordida', 'patada'].includes(g.nome)) && tem(ie, 'punho')) mult = 1.2;
  if ((/^chute|rasteira|giro|voadora/.test(g.nome) || ['rabada', 'furacaoBob'].includes(g.nome)) && tem(ie, 'chutePesado')) mult = 1.2;
  if (ehBob(ie) && tem(ie, 'bobFofura')) mult *= 1.2;
  // brutality direto: gancho no inimigo com 5% de vida ou menos, no round que fecha a luta — explode sem FINISH HIM
  if (g.nome === 'gancho' && !defendeu && o.hp > 0 && o.hp <= o.vidaMax * BRUTAL_VIDA && vitorias[ie] + 1 >= ROUNDS_VITORIA && !jogo.vencedor) {
    o.hp = 0; o.vx = 0; jogo.vencedor = ie + 1; jogo.fimTick = tick; vitorias[ie]++;
    jogo.finish = { v: ie + 1, ate: tick + FINISH };
    jogo.fatality = { t: tick, quem: ie, tipo: 'brutal' };
    return msg('BRUTALITY');
  }
  if (emCombo && eu.combo >= 2) mult *= 0.75; // combo longo: cada golpe a partir do 3º tira menos
  const base = (g.nome === 'magia' || g.nome === 'latido') && tem(ie, 'fogoDuplo') ? Math.round(g.dano * 1.5) : g.dano;
  const chamas = eu.fogo > 0 && g.nome !== 'fatalBlow';
  dano(o, defendeu ? (tem(io, 'defesaFirme') ? 0 : 1) : Math.round(base * mult) + (chamas ? 3 : 0), eu);
  // barra de AXÉ do Eddie: enche batendo (e um pouco apanhando); o super não recarrega
  // barra do Eddie (AXÉ) e do Preto Velho (FÉ): enche batendo e um pouco apanhando; o super não recarrega
  if ((ehEddie(ie) || ehVelho(ie) || ehBlocos(ie) || ehBob(ie)) && !['tempestade', 'ancestrais', 'meteoroPedra', 'furacaoBob'].includes(eu.acao)) eu.axe = Math.min(AXE_MAX, eu.axe + (defendeu ? 2 : ehBob(ie) ? 12 : 7));
  if (ehEddie(io) || ehVelho(io) || ehBlocos(io) || ehBob(io)) o.axe = Math.min(AXE_MAX, o.axe + (defendeu ? 1 : ehBob(io) ? 7 : 4));
  // barra de FIO do Palito: a espada afia batendo (e um pouco apanhando); o super não recarrega
  if (ehPalito(ie) && eu.acao !== 'milCortes') eu.fio = Math.min(AXE_MAX, eu.fio + (defendeu ? 2 : 7));
  if (ehPalito(io)) o.fio = Math.min(AXE_MAX, o.fio + (defendeu ? 1 : 4));
  if (defendeu) { eu.combo = 0; return; }
  eu.acertou = true;
  eu.combo = emCombo ? eu.combo + 1 : 1;
  if (chamas) o.queima = QUEIMA;
  if (g.nome === 'fatalBlow') { // acertou: começa a cena e gasta o fatal blow da luta
    fatalUsado[ie] = true; o.vx = 0;
    o.acao = 'apanhou'; o.stun = 99; o.dur = 0; o.t = 0; o.agachado = false;
    jogo.fatalBlow = { t: tick, quem: ie, alvo: io, dano: Math.round(o.vidaMax * FATAL_DANO), dado: 0 };
    return msg('FATAL BLOW');
  }
  o.dur = 0; o.t = 0;
  if (g.derruba || o.y > 0 || o.hp === 0) { o.acao = 'caido'; o.stun = tem(io, 'levanta') ? 12 : 26; o.vy = g.lanca || 6; o.agachado = false; }
  else { o.acao = 'apanhou'; o.stun = estilo(ie).stun; }
  if (jogo.vencedor) return;
  if (eu.combo >= 3 && g.nome !== 'tempestade' && g.nome !== 'milCortes' && g.nome !== 'ancestrais') msg((ehEddie(ie) ? 'GINGA COMBO ' : 'COMBO ') + eu.combo + '!');
  else if ((ehPalito(ie) && MSG_PALITO[g.nome]) || g.msg) msg((ehPalito(ie) && MSG_PALITO[g.nome]) || g.msg);
  if (g.nome === 'fumaca' && o.acao === 'apanhou') { o.stun = ZONZO; o.zonzo = ZONZO; } // fumaça deixa zonzo
}

function atualiza(eu, outro) {
  const k = eu.keys, idx = jogo.p.indexOf(eu);
  eu.fila = eu.fila.filter(p => tick - p.t <= 5);

  // quedas e atordoamento
  if (eu.acao === 'tonto') return; // cambaleando no FINISH HIM
  if (eu.acao === 'caido') {
    if (eu.y === 0 && eu.hp > 0 && --eu.stun <= 0) { eu.acao = 'levantando'; eu.stun = 9; }
  } else if (eu.stun > 0 && --eu.stun === 0) eu.acao = 'parado';
  if (outro.combo && eu.stun === 0 && !GOLPES[outro.acao]) outro.combo = 0; // escapou: o combo do outro acaba

  // FATAL BLOW: soco alto + chute alto quase juntos (cancela o soco/chute que começou com a primeira tecla)
  const comecando = (eu.acao === 'socoAlto' || eu.acao === 'chuteAlto') && eu.t <= 4;
  if (fatalPronto(eu) && eu.y === 0 && eu.stun === 0 && (comecando || !GOLPES[eu.acao]) && eu.acao !== 'caido' && eu.acao !== 'levantando'
    && juntos(eu)) {
    const g = GOLPES.fatalBlow;
    eu.acao = 'fatalBlow'; eu.dur = g.dur; eu.t = 0; eu.atingiu = false; eu.agachado = false; eu.fila = []; eu.apertou = {};
    eu.vx = eu.facing * g.investida; eu.fatalEspera = tick + g.dur + FATAL_ESPERA;
  }

  const livre = (!jogo.vencedor || (jogo.finish && !jogo.fatality && idx === jogo.finish.v - 1)) && tick >= jogo.inicio && eu.stun === 0 && eu.acao !== 'caido' && !GOLPES[eu.acao];
  if (livre) {
    const press = eu.fila.pop(); eu.fila = [];
    const nome = press && escolhe(eu, press.k, press);
    if (nome) { eu.cancels = 0; if (ehBlocos(idx) && (/^soco|^gancho/.test(nome))) eu.socoVar = (eu.socoVar + 1) % 3; iniciaGolpe(eu, nome); }
  }
  // Cada lutador pode encadear golpes de contato diferentes depois de acertar.
  const ga = GOLPES[eu.acao];
  if (!livre && ga && ga.alcance > 0 && eu.acertou && !ga.multi && eu.t > ga.ativo[1] && eu.y === 0 && eu.cancels < estilo(idx).cancels && eu.fila.length && !jogo.vencedor) {
    const press = eu.fila.pop(); eu.fila = [];
    const nome = escolhe(eu, press.k, press);
    if (nome && nome !== eu.acao && GOLPES[nome].alcance > 0 && !GOLPES[nome].multi && !GOLPES[nome].ar && nome !== 'fatalBlow') { eu.cancels++; iniciaGolpe(eu, nome); }
  }
  if (livre && !GOLPES[eu.acao]) {
    eu.agachado = eu.y === 0 && !!k.baixo;
    eu.acao = k.defesa && eu.y === 0 ? 'defesa' : 'parado';
    if (!eu.agachado && eu.acao !== 'defesa') {
      const passo = d => (d === eu.facing ? 9 : 7) * (tem(idx, 'pes') ? 1.2 : 1) * (ehVelho(idx) ? 0.8 : 1); // andar pra trás é mais lento
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
    if (eu.acao === 'magia' && eu.t === 7) jogo.magias.push({ x: eu.x + eu.facing * 50, y: eu.y + 100, dir: eu.facing, dono: idx, forte: tem(idx, 'fogoDuplo'), onda: ehEddie(idx), espada: ehPalito(idx), pedra: ehBlocos(idx) });
    if (eu.acao === 'meteoroPedra' && eu.t === 12) jogo.magias.push({ x: eu.x + eu.facing * 60, y: eu.y + 100, dir: eu.facing, dono: idx, pedra: true, gigante: true });
    if (eu.acao === 'fumaca' && eu.t === 9) jogo.magias.push({ x: eu.x + eu.facing * 40, y: eu.y + 130, dir: eu.facing, dono: idx, fumaca: true });
    if (eu.acao === 'latido' && eu.t === 8) jogo.magias.push({ x: eu.x + eu.facing * 45, y: eu.y + 95, dir: eu.facing, dono: idx, latido: true });
    if (eu.acao === 'benze' && eu.t === 30 && eu.hp > 0 && !jogo.vencedor) {
      const antes = eu.hp; eu.hp = Math.min(eu.vidaMax, eu.hp + BENZE_CURA);
      if (eu.hp !== antes) jogo.danos.push({ p: idx, n: antes - eu.hp, id: ++msgId });
      msg('BENZIMENTO! +' + (eu.hp - antes));
    }
    if (g.avanca && eu.t < g.ativo[1]) eu.vx = eu.facing * g.avanca; // aú e tempestade andam pra frente
    if (g.multi) { // vários acertos: cada janela acerta uma vez
      const w = g.multi[eu.hitN];
      if (w && eu.t >= w[0] && eu.t <= w[1] && acerta(eu, outro, g)) {
        const ultimo = eu.hitN === g.multi.length - 1;
        eu.hitN++; eu.atingiu = true;
        bate(eu, outro, ultimo ? Object.assign({}, g, g.final) : g, eu.facing);
      } else if (w && eu.t > w[1]) eu.hitN++;
    } else if (!eu.atingiu && eu.t >= g.ativo[0] && eu.t <= g.ativo[1] && acerta(eu, outro, g)) { eu.atingiu = true; bate(eu, outro, g, eu.facing); }
    if (eu.t >= g.dur) { eu.acao = 'parado'; eu.dur = 0; eu.agachado = eu.y === 0 && !!k.baixo; }
  }
}

function moveMagias() {
  for (const m of jogo.magias) {
    m.x += m.dir * (m.gigante ? 11 : m.forte ? 17 : m.fumaca ? 8 : m.latido ? 15 : 13); // pedra gigante é mais lenta
    const o = jogo.p[1 - m.dono];
    if (!m.fim && Math.abs(o.x - m.x) < (m.gigante ? 65 : m.pedra ? 42 : 30) && m.y > o.y && m.y < o.y + (o.agachado ? 70 : 135) && !caiAlvo(o)) {
      m.fim = true; bate(jogo.p[m.dono], o, m.gigante ? METEORO : m.pedra ? PEDRA : m.fumaca ? FUMACA : m.latido ? LATIDO : MAGIA, m.dir);
    }
  }
  const [m1, m2] = jogo.magias;
  if (m1 && m2 && Math.abs(m1.x - m2.x) < 30) m1.fim = m2.fim = true; // magias se anulam
  jogo.magias = jogo.magias.filter(m => !m.fim && m.x > -20 && m.x < W + 20);
}

// poder elemental acertando o outro (respeita estrela, FINISH HIM e fim de round)
function atingePoder(dono, o, n, efeito) {
  if (o.estrela > 0 || jogo.finish || jogo.vencedor || caiAlvo(o) || o.hp === 0) return false;
  dano(o, n, dono);
  o.dur = 0; o.t = 0; o.agachado = false;
  efeito(o);
  return true;
}
function derruba(o, vy, vx) { o.acao = 'caido'; o.stun = tem(jogo.p.indexOf(o), 'levanta') ? 12 : 26; o.vy = vy; o.vx = vx; }

function pegaElemento(quem, tipo) {
  const dono = jogo.p.indexOf(quem), o = jogo.p[1 - dono], dir = o.x > quem.x ? 1 : -1;
  if (tipo === 'fogo') { quem.fogo = FOGO; msg('FOGO!'); }
  if (tipo === 'gelo') { jogo.poderes.push({ id: ++itemId, tipo, dono, x: quem.x + dir * 40, dir, t: 0 }); msg('GELO!'); }
  if (tipo === 'raio') { jogo.poderes.push({ id: ++itemId, tipo, dono, x: o.x, t: 0, n: 0 }); msg('RAIO!'); }
  if (tipo === 'vento') { jogo.poderes.push({ id: ++itemId, tipo, dono, x: quem.x + dir * 30, dir, t: 0 }); msg('VENTO!'); }
}

function movePoderes() {
  for (const pd of jogo.poderes) {
    const eu = jogo.p[pd.dono], o = jogo.p[1 - pd.dono];
    pd.t++;
    if (pd.tipo === 'gelo') { // onda de estacas de gelo correndo pelo chão
      pd.x += pd.dir * 12;
      if (Math.abs(o.x - pd.x) < 34 && o.y < 70 && atingePoder(eu, o, 6, a => { a.acao = 'congelado'; a.stun = CONGELA; a.vx = 0; a.queima = 0; })) { pd.fim = true; msg('CONGELOU!'); }
      if (pd.x < -20 || pd.x > W + 20) pd.fim = true;
    }
    if (pd.tipo === 'vento') { // tornado: anda devagar, persegue um pouco e arremessa
      pd.dir += (Math.sign(o.x - pd.x) - pd.dir) * 0.03;
      pd.x += pd.dir * 7;
      if (Math.abs(o.x - pd.x) < 40 && o.y < 160 && atingePoder(eu, o, 7, a => derruba(a, 25, pd.dir * 7))) { pd.fim = true; msg('TORNADO!'); }
      if (pd.t > 110 || pd.x < -40 || pd.x > W + 40) pd.fim = true;
    }
    if (pd.tipo === 'raio') { // a mira segue o outro e trava antes de cair
      const fase = pd.t % RAIO_CICLO;
      if (fase < RAIO_AVISO - 3) pd.x += (o.x - pd.x) * 0.22;
      if (fase === RAIO_AVISO) {
        const ultimo = pd.n === RAIOS - 1;
        if (Math.abs(o.x - pd.x) < 46 && atingePoder(eu, o, ultimo ? 9 : 6, a => { if (ultimo || a.y > 0) derruba(a, 12, 0); else { a.acao = 'apanhou'; a.stun = 12; } })) msg('ZAP!');
        pd.n++;
      }
      if (pd.n >= RAIOS && fase >= RAIO_AVISO + 6) pd.fim = true;
    }
  }
  jogo.poderes = jogo.poderes.filter(pd => !pd.fim);
}

function itens() {
  // Drop recorrente durante a luta, com intervalo fixo de 20 segundos.
  if (!jogo.vencedor && tick >= jogo.lendarioTick) {
    const poder = LENDARIOS[Math.floor(Math.random() * LENDARIOS.length)];
    jogo.itens.push({ id: ++itemId, tipo: 'lendario', poder, x: 80 + Math.random() * (W - 160), y: 700, vy: 0, vida: VIDA_ITEM + 40 });
    jogo.lendarioTick += INTERVALO_LENDARIO;
  }
  if (config.itens && !jogo.vencedor && jogo.itens.length < 2 && tick >= jogo.proximoItem) {
    const tipo = ITENS[Math.floor(Math.random() * ITENS.length)], elem = ELEMENTOS.includes(tipo);
    jogo.itens.push({ id: ++itemId, tipo, x: 80 + Math.random() * (W - 160), y: elem ? 700 : 420, vy: 0, vida: VIDA_ITEM + (elem ? 40 : 0) });
    jogo.proximoItem = tick + 30 * (6 + Math.random() * 6);
  }
  for (const it of jogo.itens) {
    const elem = ELEMENTOS.includes(it.tipo) || it.tipo === 'lendario';
    it.vy = elem ? Math.max(-8, it.vy - 0.45) : it.vy - 1.2; it.y = Math.max(0, it.y + it.vy); if (it.y === 0) it.vy = 0;
    it.vida--;
    const quem = jogo.p.find(p => !caiAlvo(p) && p.hp > 0 && Math.abs(p.x - it.x) < 38 && it.y < p.y + 130 && it.y + 30 > p.y);
    if (!quem || jogo.vencedor) continue;
    it.vida = 0;
    if (it.tipo === 'comida') { const antes = quem.hp; quem.hp = Math.min(quem.vidaMax, quem.hp + 15); if (antes !== quem.hp) jogo.danos.push({ p: jogo.p.indexOf(quem), n: antes - quem.hp, id: ++msgId }); msg('COMIDA! +15'); }
    if (it.tipo === 'estrela') { quem.estrela = ESTRELA; msg('ESTRELA!'); }
    if (it.tipo === 'martelo') { quem.martelo = MARTELO; msg('MARTELO!'); }
    if (ELEMENTOS.includes(it.tipo)) pegaElemento(quem, it.tipo);
    if (it.tipo === 'lendario') aplicaLendario(quem, it.poder);
  }
  movePoderes();
  jogo.itens = jogo.itens.filter(it => it.vida > 0);
  for (const p of jogo.p) {
    if (p.zonzo > 0) p.zonzo--;
    if (p.estrela > 0) p.estrela--; if (p.martelo > 0) p.martelo--; if (p.fogo > 0) p.fogo--;
    if (p.queima > 0 && --p.queima % 15 === 0 && !jogo.vencedor && p.hp > 1) dano(p, 1, jogo.p[1 - jogo.p.indexOf(p)]); // queimadura não mata
    if (tick % 60 === 0 && p.hp > 0 && p.hp < p.vidaMax && !jogo.vencedor && tem(jogo.p.indexOf(p), 'regen')) p.hp++;
  }
}

function aplicaLendario(quem, poder) {
  const alvo = jogo.p[1 - jogo.p.indexOf(quem)];
  if (poder === 'agiota') {
    dano(alvo, 42, quem); if (alvo.hp > 0) derruba(alvo, 18, alvo.x > quem.x ? 13 : -13);
    msg('AGIOTA CELESTIAL: JUROS DE 9000%!!!');
  } else if (poder === 'tiaZap') {
    dano(alvo, 38, quem); if (alvo.hp > 0) derruba(alvo, 20, alvo.x > quem.x ? 15 : -15);
    quem.hp = Math.min(quem.vidaMax, quem.hp + 18);
    msg('TIA DO ZAP: BOM DIA, GRUPO DA FAMÍLIA!');
  } else {
    dano(alvo, 28, quem); if (alvo.hp > 0) derruba(alvo, 24, alvo.x > quem.x ? 18 : -18);
    quem.hp = Math.min(quem.vidaMax, quem.hp + 25);
    msg('POMBO DEUS: BOMBEIO E CURA!');
  }
}


// ---------- IA: joga com o Azul (índice 1) quando o modo 1xIA está ligado ----------
let iaLigada = false, iaSim = false; // iaSim: simulação, a IA joga com os dois lados
// reacao: ticks entre decisões (30 = 1 s), menor = mais difícil; def/fogo/ataque: multiplicam as chances de defender, desviar e atacar
const IA_NIVEIS = { facil: { reacao: 14, def: 0.35, fogo: 0.4, ataque: 0.5 }, normal: { reacao: 6, def: 1, fogo: 1, ataque: 1 }, dificil: { reacao: 2, def: 1.6, fogo: 1.3, ataque: 1.5 } };
let iaNivel = IA_NIVEIS.normal;
function iaAperta(eu, k) { aperta(eu, k); }
// guarda a direção apertada; ignora repetição da mesma direção no mesmo instante (evento duplicado de teclado/controle)
function anotaDir(eu, dir) {
  const ult = eu.dirs[eu.dirs.length - 1];
  if (ult && ult.dir === dir && tick - ult.t <= 2) return;
  eu.dirs.push({ dir, t: tick }); eu.dirs = eu.dirs.slice(-6);
}
function iaDir(eu, dir) { anotaDir(eu, dir); }
function ia(eu, o) {
  const k = eu.keys, mem = eu.ia || (eu.ia = { prox: 0 });
  if (tick < mem.prox) return;
  mem.prox = tick + iaNivel.reacao + Math.floor(Math.random() * 4);
  for (const n of TECLAS) k[n] = false;
  if (tick < jogo.inicio || eu.acao === 'caido' || eu.acao === 'tonto') return;
  const dx = o.x - eu.x, dist = Math.abs(dx), frente = dx > 0 ? 'dir' : 'esq', tras = dx > 0 ? 'esq' : 'dir';
  const r = Math.random();
  // FINISH HIM com a IA vencendo: tenta o fatality (trás, frente, baixo + soco alto)
  if (jogo.finish && jogo.finish.v === 2 && !jogo.fatality) {
    if (dist > 90) { k[frente] = true; return; }
    iaDir(eu, -eu.facing); iaDir(eu, eu.facing); iaDir(eu, 0); iaAperta(eu, 'socoAlto'); return;
  }
  if (jogo.vencedor) return;
  if (fatalPronto(eu) && dist < 120 && r < 0.35 * iaNivel.ataque) { iaAperta(eu, 'socoAlto'); iaAperta(eu, 'chuteAlto'); return; }
  const ed = ehEddie(1);
  // Eddie: solta o super com o axé cheio e emenda combos quando acerta
  if (ed && eu.axe >= AXE_MAX && dist < 130 && eu.y === 0 && r < 0.5) { iaDir(eu, -eu.facing); iaDir(eu, eu.facing); iaAperta(eu, 'chuteAlto'); return; }
  // Palito: solta os MIL CORTES com o fio cheio
  if (ehPalito(1) && eu.fio >= AXE_MAX && dist < 140 && eu.y === 0 && r < 0.5) { iaDir(eu, -eu.facing); iaDir(eu, eu.facing); iaAperta(eu, 'socoAlto'); return; }
  // Bob: furacão de pelos com o axé cheio; late de longe
  if (ehBob(1) && eu.axe >= AXE_MAX && dist < 140 && eu.y === 0 && r < 0.5) { iaDir(eu, -eu.facing); iaDir(eu, eu.facing); iaAperta(eu, 'chuteAlto'); return; }
  if (ehBob(1) && dist > 200 && eu.y === 0 && r < 0.05 && !jogo.magias.some(m => m.dono === 1)) { iaDir(eu, eu.facing); iaDir(eu, eu.facing); iaAperta(eu, 'chuteBaixo'); return; }
  if (ehBlocos(jogo.p.indexOf(eu)) && eu.axe >= AXE_MAX && eu.y === 0 && r < 0.5) { iaDir(eu, -eu.facing); iaDir(eu, eu.facing); iaAperta(eu, 'socoAlto'); return; }
  if (ed && eu.acertou && GOLPES[eu.acao] && r < 0.7) {
    const [bt, mod] = [['chuteAlto', 'frente'], ['chuteBaixo', 'frente'], ['chuteAlto', 'tras'], ['chuteAlto', 'baixo'], ['chuteAlto']][Math.floor(Math.random() * 5)];
    if (mod) k[{ frente, tras, baixo: 'baixo' }[mod]] = true;
    iaAperta(eu, bt); mem.prox = tick + 3; return;
  }
  // bola de fogo vindo: pula ou agacha
  const fogo = jogo.magias.find(m => m.dono !== 1 && Math.abs(m.x - eu.x) < 220 && Math.sign(eu.x - m.x) === m.dir);
  if (fogo && r < 0.75 * iaNivel.fogo) { if (r < 0.4 * iaNivel.fogo) k.pulo = true; else k.baixo = true; return; }
  // inimigo atacando perto: defende (baixo contra golpe baixo) ou recua
  const g = GOLPES[o.acao];
  if (g && dist < g.alcance + 30 && o.t < g.ativo[1]) {
    if (r < 0.55 * iaNivel.def) { k.defesa = true; k.baixo = !!g.baixo; return; }
    if (r < 0.75 * iaNivel.def) { k[tras] = true; return; }
  }
  if (o.acao === 'caido' || o.acao === 'levantando') { if (dist > 140) k[frente] = true; return; }
  if (ehVelho(1) && dist > 200 && r < 0.25 && !jogo.magias.some(m => m.dono === 1)) { iaDir(eu, eu.facing); iaDir(eu, eu.facing); iaAperta(eu, 'socoAlto'); return; }
  if (dist > 260 && r < 0.12 && !jogo.magias.some(m => m.dono === 1)) { // frente, frente + soco alto
    iaDir(eu, eu.facing); iaDir(eu, eu.facing); iaAperta(eu, 'socoAlto'); return;
  }
  if (dist > 105) { // aproxima, às vezes pulando com voadora
    k[frente] = true;
    if (dist < 220 && r < 0.12) { k.pulo = true; mem.voadora = tick + 8; }
    return;
  }
  if (eu.y > 0) { if (mem.voadora && tick >= mem.voadora) { iaAperta(eu, 'chuteAlto'); mem.voadora = 0; } return; }
  // perto: escolhe um golpe
  if (Math.random() > iaNivel.ataque) return; // fácil: às vezes só fica parado perto
  if (r < 0.12) { k[tras] = true; return; }
  if (r < 0.2) { k.defesa = true; return; }
  const golpes = [['socoAlto'], ['socoBaixo'], ['chuteAlto'], ['chuteBaixo'], ['socoAlto', 'baixo'], ['chuteBaixo', 'baixo'], ['chuteBaixo', 'tras'], ['chuteAlto', 'tras']];
  if (ehVelho(1)) {
    if (eu.axe >= AXE_MAX && dist < 420 && eu.y === 0 && r < 0.5) { iaDir(eu, -eu.facing); iaDir(eu, eu.facing); iaAperta(eu, 'socoAlto'); return; }
    if (eu.hp < eu.vidaMax * 0.5 && tick >= eu.benzeEspera && dist > 200 && r < 0.5) { iaDir(eu, -eu.facing); iaDir(eu, -eu.facing); iaAperta(eu, 'socoBaixo'); return; }
    golpes.push(['socoAlto', 'frente'], ['socoAlto', 'frente'], ['socoBaixo', 'tras'], ['chuteAlto', 'tras']);
  }
  if (ed) golpes.push(['chuteAlto', 'frente'], ['chuteBaixo', 'frente'], ['chuteAlto', 'baixo'], ['chuteBaixo', 'frente']);
  const [bt, mod] = golpes[Math.floor(Math.random() * golpes.length)];
  if (mod === 'baixo') k.baixo = true;
  if (mod === 'tras') k[tras] = true;
  if (mod === 'frente') k[frente] = true;
  iaAperta(eu, bt);
}

function passo() {
  tick++;
  if (tick === jogo.inicio) msg('LUTE!');
  if (jogo.fatalBlow) { fatalBlowPasso(); return envia(); } // cena do fatal blow: o resto da luta congela
  if (!jogo.vencedor && tick >= jogo.inicio && --jogo.tempo <= 0) { // acabou o tempo: vence quem tem mais vida
    const [a, b] = jogo.p.map(f => f.hp / f.vidaMax);
    fimRodada(a > b ? 1 : b > a ? 2 : 3, a === b ? 'EMPATE!' : 'TEMPO!');
  }
  if (jogo.vencedor && !jogo.finish && !campeao && tick - jogo.fimTick > PAUSA_ROUND) novaRodada();
  if (jogo.finish && !campeao) finishHim();
  const [a, b] = jogo.p;
  if (iaLigada) ia(b, a);
  if (iaLigada && iaSim) ia(a, b);
  atualiza(a, b); atualiza(b, a);
  moveMagias();
  itens();
  // não deixa um atravessar o outro no chão
  const d = b.x - a.x;
  if (Math.abs(d) < 50 && Math.abs(a.y - b.y) < 60 && !caiAlvo(a) && !caiAlvo(b)) {
    const empurra = (50 - Math.abs(d)) / 2 * (d >= 0 ? 1 : -1);
    a.x -= empurra; b.x += empurra;
  }
  envia();
}
function envia() {
  jogo.danos = jogo.danos.filter(x => msgId - x.id < 20);
  const estado = { ia: iaLigada, p: jogo.p.map(({ keys, fila, dirs, ia, apertou, fatalEspera, ...r }, i) => ({ ...r, acao: r.acao === 'fatalBlow' ? 'gancho' : r.acao, fatalPronto: fatalPronto(jogo.p[i]) })), magias: jogo.magias, poderes: jogo.poderes, itens: jogo.itens.map(({ vy, ...r }) => r), vencedor: jogo.vencedor, campeao, finish: !!jogo.finish && !campeao, fatality: jogo.fatality ? { quem: jogo.fatality.quem, tipo: jogo.fatality.tipo, idade: tick - jogo.fatality.t } : null, fatalBlow: jogo.fatalBlow ? { quem: jogo.fatalBlow.quem, idade: tick - jogo.fatalBlow.t, batidas: FATAL_SEQ.map(x => x.bate) } : null, fatalUsado, finishResta: jogo.finish && !jogo.fatality ? Math.max(0, jogo.finish.ate - tick) / 30 : 0, vitorias, rodada, tempo: Math.ceil(jogo.tempo / 30), placar, perfis, config, msg: jogo.msg, danos: jogo.danos };
  const data = `data: ${JSON.stringify(estado)}\n\n`;
  for (const res of clients) res.write(data);
}
setInterval(passo, TICK);



function body(req) {
  return new Promise(r => { let s = ''; req.on('data', c => s += c); req.on('end', () => { try { r(JSON.parse(s)); } catch { r({}); } }); });
}

const TECLAS = ['esq', 'dir', 'pulo', 'baixo', 'defesa', 'parryMod', ...ATAQUES];
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
      const apertouAgora = !!v && !f.keys[k];
      f.keys[k] = !!v;
      const parry = apertouAgora && (k === 'defesa' || k === 'socoAlto') && f.keys.defesa && f.keys.socoAlto
        && f.y === 0 && f.stun === 0 && !caiAlvo(f) && !jogo.vencedor && tick >= jogo.inicio;
      if (parry) {
        f.acao = 'defesa'; f.dur = 0; f.t = 0; f.fila = []; f.vx = 0;
        f.parryAte = tick + 8; // ~0,27 s para o golpe chegar
      } else if (v && ATAQUES.includes(k)) aperta(f, k);
      if (apertouAgora && k === 'baixo') anotaDir(f, 0);
      if (apertouAgora && (k === 'esq' || k === 'dir')) anotaDir(f, k === 'dir' ? 1 : -1);
    }
    return res.end();
  }
  if (req.method === 'POST' && req.url === '/skill') {
    const { p, id } = await body(req), pf = perfis[p];
    if (pf && id in SKILLS && (id !== 'bobFofura' || pf.visual === 'bob') && pf.pontos > 0 && !pf.skills.includes(id) && (!SKILLS[id] || pf.skills.includes(SKILLS[id]))) { pf.pontos--; pf.skills.push(id); salva(); }
    return res.end();
  }
  if (req.method === 'POST' && req.url === '/personagem') {
    const { p, tipo } = await body(req);
    if (perfis[p] && tipo in SKINS) { perfis[p].visual = tipo; salva(); }
    return res.end();
  }
  if (req.method === 'POST' && req.url === '/skin') {
    const { p, tipo, skin } = await body(req), pf = perfis[p];
    if (pf && SKINS[tipo] && SKINS[tipo].includes(skin)) { pf.visual = tipo; pf.skins = Object.assign({}, pf.skins, { [tipo]: skin }); salva(); }
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
    if ([300, 350, 400].includes(c.vida)) config.vida = c.vida;
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
  if (req.method === 'POST' && req.url === '/ia') {
    const { ligada, nivel, sim } = await body(req);
    if (IA_NIVEIS[nivel]) iaNivel = IA_NIVEIS[nivel];
    if (!!ligada !== iaLigada || (!!ligada && !!sim !== iaSim)) { iaLigada = !!ligada; iaSim = iaLigada && !!sim; jogo.p[0].keys = {}; jogo.p[1].keys = {}; novaLuta(); }
    return res.end();
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

// sons sintetizados na hora com Web Audio (sem arquivos). Inclui música de fundo.
const SOM = (() => {
  let ac = null, master = null, ruido = null;
  let musicaGain = null, musicaTimer = null;
  const liga = () => {
    if (!ac) {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain(); master.gain.value = 0.5; master.connect(ac.destination);
      ruido = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
      const d = ruido.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ac.state === 'suspended') ac.resume();
    carregaLatido();
  };
  // latido gravado de verdade (public/sons/latido.*); se não existir, usa o sintetizado.
  let latidoReal = null, latidoPedido = false;
  function carregaLatido() {
    if (latidoPedido) return; latidoPedido = true;
    const tenta = ([arq, ...resto]) => arq && fetch('sons/' + arq).then(r => { if (!r.ok) throw 0; return r.arrayBuffer(); })
      .then(b => ac.decodeAudioData(b)).then(buf => { latidoReal = buf; }).catch(() => tenta(resto));
    tenta(['latido.mp3', 'latido.ogg', 'latido.wav']);
  }
  function tocaLatidoReal(atraso, vel) {
    const t = ac.currentTime + atraso, s = ac.createBufferSource(), g = ac.createGain();
    s.buffer = latidoReal; s.playbackRate.value = vel; g.gain.value = 0.9;
    s.connect(g).connect(master); s.start(t);
  }
  // navegador só libera áudio depois de interação do usuário
  ['keydown', 'pointerdown', 'touchstart'].forEach(ev => addEventListener(ev, liga, { passive: true }));

  const pronto = () => ac && ac.state === 'running' ;
  const env = (g, t, ataque, vol, dur) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + ataque); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); };

  function chiado(dur, vol, tipo, f0, f1, q = 1) {
    const t = ac.currentTime, s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = ruido; fl.type = tipo; fl.Q.value = q;
    fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(f1, t + dur);
    env(g, t, 0.005, vol, dur);
    s.connect(fl).connect(g).connect(master); s.start(t); s.stop(t + dur + 0.05);
  }
  function tom(dur, vol, onda, f0, f1, atraso = 0) {
    const t = ac.currentTime + atraso, o = ac.createOscillator(), g = ac.createGain();
    o.type = onda; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    env(g, t, 0.005, vol, dur);
    o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.05);
  }

  // música de fundo: techno/synthwave em Lá menor, 140 BPM, sequenciador com lookahead
  let PASSO = 60 / 140 / 4; // semicolcheia; cada arena tem seu andamento
  const nota = n => 440 * Math.pow(2, (n - 69) / 12);
  // progressão Am - F - C - G (2 compassos cada), em MIDI
  const RAIZES = [45, 41, 48, 43];
  const ARPEJO = [0, 12, 7, 12, 3, 12, 7, 15, 0, 12, 7, 12, 3, 19, 15, 12];
  const BAIXO = [1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 1];
  let passo = 0, proxima = 0;
  let cenarioMusica = 'neon';
  let ritmoBR = { eddie: false, velho: false }; // camadas brasileiras na música quando Eddie/Preto Velho lutam

  // percussão brasileira (tudo sintetizado), saída configurável (música ou efeitos)
  function atabaqueEm(t, f, vol, saida) { // pele grave: tom caindo + tapa
    const o = ac.createOscillator(), g = ac.createGain();
    o.frequency.setValueAtTime(f * 1.6, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.04);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    o.connect(g).connect(saida); o.start(t); o.stop(t + 0.5);
    ruidoEm(t, 0.03, vol * 0.5, 'bandpass', 1200, saida);
  }
  function agogoEm(t, f, vol, saida) { // sino de metal: parciais inarmônicas
    [1, 2.4, 3.9].forEach((m, i) => {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sine'; o.frequency.value = f * m;
      g.gain.setValueAtTime(vol / (i + 1), t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.35 / (i + 1));
      o.connect(g).connect(saida); o.start(t); o.stop(t + 0.4);
    });
  }
  function ruidoEm(t, dur, vol, tipo, f, saida) {
    const s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = ruido; fl.type = tipo; fl.frequency.value = f;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(fl).connect(g).connect(saida); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }
  function berimbauEm(t, f, vol, saida) { // corda batida com dobra (cabaça abrindo)
    const o = ac.createOscillator(), fl = ac.createBiquadFilter(), g = ac.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(f * 0.97, t); o.frequency.linearRampToValueAtTime(f, t + 0.08);
    fl.type = 'bandpass'; fl.Q.value = 4; fl.frequency.setValueAtTime(f * 2, t); fl.frequency.linearRampToValueAtTime(f * 5, t + 0.25);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    o.connect(fl).connect(g).connect(saida); o.start(t); o.stop(t + 0.55);
  }
  function cuicaEm(t, f0, f1, vol, saida) { // ronco puxado da cuíca
    const o = ac.createOscillator(), fl = ac.createBiquadFilter(), g = ac.createGain();
    o.type = 'triangle'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + 0.15);
    fl.type = 'lowpass'; fl.frequency.value = 1500;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.03); g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
    o.connect(fl).connect(g).connect(saida); o.start(t); o.stop(t + 0.25);
  }
  // toque de angola (berimbau) e pandeiro / agogô para o Eddie
  const BERIM = { 0: 'dom', 4: 'dom', 6: 'din', 8: 'chi', 10: 'chi', 12: 'dom' };
  // ijexá de terreiro (atabaques rum/rumpi/lé) para o Preto Velho
  const ATAB = { 0: 98, 3: 98, 6: 131, 8: 98, 10: 147, 12: 131, 14: 131 };

  function bumbo(t) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
    g.gain.setValueAtTime(1, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o.connect(g).connect(musicaGain); o.start(t); o.stop(t + 0.32);
  }
  function ruidoM(t, dur, vol, tipo, f) {
    const s = ac.createBufferSource(), fl = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = ruido; fl.type = tipo; fl.frequency.value = f;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(fl).connect(g).connect(musicaGain); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }
  function synth(t, freq, dur, vol, onda, corte) {
    const o = ac.createOscillator(), fl = ac.createBiquadFilter(), g = ac.createGain();
    o.type = onda; o.frequency.value = freq;
    fl.type = 'lowpass'; fl.Q.value = 6;
    fl.frequency.setValueAtTime(corte, t); fl.frequency.exponentialRampToValueAtTime(200, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(fl).connect(g).connect(musicaGain); o.start(t); o.stop(t + dur + 0.02);
  }
  // Copacabana: balanço de bossa, baixo alternado e acordes suaves em Ré menor.
  function tocaPraia(i, t) {
    const p = i % 16, compasso = Math.floor(i / 16), raiz = [50, 46, 53, 48][Math.floor(compasso / 2) % 4];
    if (p === 0 || p === 8) {
      synth(t, nota(raiz - 12 + (p === 8 ? 7 : 0)), PASSO * 3.2, 0.42, 'sine', 600);
      atabaqueEm(t, p === 0 ? 88 : 112, 0.25, musicaGain);
    }
    if ([3, 6, 11, 14].includes(p)) ruidoEm(t, 0.045, p === 11 ? 0.23 : 0.14, 'bandpass', 2300, musicaGain);
    if (p % 2 === 0) ruidoEm(t, 0.035, 0.065, 'highpass', 6000, musicaGain);
    if ([0, 5, 10, 14].includes(p)) {
      const dur = PASSO * (p === 14 ? 4 : 3);
      [0, 3, 7, 10].forEach((iv, k) => synth(t + k * 0.012, nota(raiz + 12 + iv), dur, 0.045, 'triangle', 1800));
    }
    if (p === 7 || p === 15) agogoEm(t, p === 7 ? 660 : 880, 0.055, musicaGain);
    if (p === 12 && compasso % 4 === 3) berimbauEm(t, nota(raiz + 12), 0.11, musicaGain);
  }
  // Trilhas próprias para cada destino: andamento, escala, percussão e timbre variam.
  const trilhas = {
    toquio: { bpm: 126, raizes: [50, 53, 45, 48], escala: [0, 2, 5, 7, 9], timbre: 'triangle' },
    cairo: { bpm: 112, raizes: [45, 46, 52, 45], escala: [0, 1, 4, 5, 7, 8, 10], timbre: 'sawtooth' },
    paris: { bpm: 118, raizes: [53, 48, 50, 45], escala: [0, 2, 4, 7, 9], timbre: 'triangle' },
    novaYork: { bpm: 132, raizes: [48, 53, 55, 50], escala: [0, 3, 5, 7, 10], timbre: 'sine' },
    antartida: { bpm: 82, raizes: [45, 41, 48, 43], escala: [0, 2, 5, 7, 9], timbre: 'sine' },
  };
  function tocaDestino(i, t, nome) {
    const cfg = trilhas[nome], p = i % 16, compasso = Math.floor(i / 16);
    const raiz = cfg.raizes[Math.floor(compasso / 2) % cfg.raizes.length], escala = cfg.escala;
    const notaEscala = (grau, oitava = 0) => nota(raiz + 12 + escala[(grau % escala.length + escala.length) % escala.length] + oitava * 12);
    if (nome === 'toquio') {
      // Taiko sintético, sino de templo e pentatônica japonesa.
      if ([0, 6, 8, 14].includes(p)) atabaqueEm(t, p % 8 ? 118 : 82, p % 8 ? 0.32 : 0.52, musicaGain);
      if ([4, 12].includes(p)) agogoEm(t, p === 4 ? 740 : 988, 0.09, musicaGain);
      if (p % 4 === 2) ruidoM(t, 0.035, 0.12, 'highpass', 6500);
      if ([0, 3, 6, 8, 11, 14].includes(p)) synth(t, notaEscala([0, 2, 1, 3, 2, 4][[0, 3, 6, 8, 11, 14].indexOf(p)]), PASSO * 2.7, 0.15, 'triangle', 1500);
      if (p === 0) synth(t, nota(raiz - 12), PASSO * 3, 0.3, 'sine', 500);
    } else if (nome === 'cairo') {
      // Tambor de mão, palmas e melodia de escala frígia dominante.
      if ([0, 5, 8, 13].includes(p)) atabaqueEm(t, p === 0 || p === 8 ? 76 : 132, 0.44, musicaGain);
      if ([3, 7, 11, 15].includes(p)) ruidoM(t, 0.055, 0.28, 'bandpass', 1500);
      if (p % 2 === 0) ruidoM(t, 0.025, 0.08, 'highpass', 7000);
      if ([0, 3, 6, 9, 12, 14].includes(p)) synth(t, notaEscala([0, 2, 1, 3, 4, 2][[0, 3, 6, 9, 12, 14].indexOf(p)]), PASSO * 2.2, 0.13, 'sawtooth', 1200);
      if (p === 0) synth(t, nota(raiz - 12), PASSO * 3, 0.33, 'triangle', 450);
    } else if (nome === 'paris') {
      // Valsa leve com acordeão filtrado e baixo em três tempos.
      if ([0, 4, 8, 12].includes(p)) synth(t, nota(raiz - 12), PASSO * 3.8, 0.31, 'triangle', 700);
      if ([0, 4, 8, 12].includes(p)) { const ac = [0, 3, 7]; ac.forEach((iv, k) => synth(t + k * 0.008, nota(raiz + 12 + iv), PASSO * 2.8, 0.055, 'sawtooth', 1800)); }
      if ([2, 6, 10, 14].includes(p)) ruidoM(t, 0.025, 0.075, 'highpass', 5200);
      if ([0, 3, 6, 8, 11, 14].includes(p)) synth(t, notaEscala([0, 2, 4, 3, 1, 2][[0, 3, 6, 8, 11, 14].indexOf(p)]), PASSO * 2.2, 0.105, 'square', 1100);
    } else if (nome === 'novaYork') {
      // Walking bass, bateria escovada e síncopes de jazz urbano.
      if ([0, 4, 8, 12].includes(p)) synth(t, nota(raiz - 12 + (p === 8 ? 7 : 0)), PASSO * 1.8, 0.4, 'triangle', 900);
      if ([4, 12].includes(p)) ruidoM(t, 0.09, 0.32, 'bandpass', 1800);
      if ([2, 6, 10, 14].includes(p)) ruidoM(t, 0.025, 0.11, 'highpass', 7200);
      if ([3, 7, 11, 15].includes(p)) { [0, 3, 7, 10].forEach((iv, k) => synth(t + k * 0.01, nota(raiz + 12 + iv), PASSO * 1.6, 0.045, 'sine', 2200)); }
      if ([0, 3, 6, 9, 12, 14].includes(p)) synth(t, notaEscala([0, 2, 4, 3, 1, 2][[0, 3, 6, 9, 12, 14].indexOf(p)], 1), PASSO * 1.8, 0.12, 'sawtooth', 1400);
    } else {
      // Camadas longas e sinos espaçados sobre uma pulsação lenta de vento polar.
      if (p === 0) [0, 4, 7].forEach((iv, k) => synth(t + k * 0.02, nota(raiz + 12 + iv), PASSO * 28, 0.035, 'sine', 1200));
      if ([0, 8].includes(p)) synth(t, nota(raiz - 12), PASSO * 7, 0.24, 'sine', 350);
      if ([4, 12].includes(p)) synth(t, notaEscala(p === 4 ? 2 : 4), PASSO * 5, 0.075, 'sine', 2800);
      if (p === 6 || p === 14) ruidoM(t, 0.22, 0.07, 'bandpass', 900);
      if ([0, 5, 10, 13].includes(p)) synth(t, notaEscala([0, 2, 4, 1][[0, 5, 10, 13].indexOf(p)], 1), PASSO * 6, 0.075, 'triangle', 900);
    }
  }
  function tocaPasso(i, t) {
    if (cenarioMusica === 'brasil') { tocaPraia(i, t); return; }
    if (trilhas[cenarioMusica]) { tocaDestino(i, t, cenarioMusica); return; }
    const p = i % 16, compasso = Math.floor(i / 16), raiz = RAIZES[Math.floor(compasso / 2) % 4];
    const secao = Math.floor(compasso / 8) % 2; // a cada 8 compassos alterna parte calma/intensa
    if (p % 4 === 0) bumbo(t);
    if (p === 4 || p === 12) ruidoM(t, 0.18, 0.5, 'bandpass', 1800); // caixa
    ruidoM(t, p % 2 ? 0.03 : 0.06, p % 4 === 2 ? 0.35 : 0.15, 'highpass', 8000); // chimbal
    if (BAIXO[p]) synth(t, nota(raiz - 12), PASSO * 0.9, 0.5, 'sawtooth', 900 + 500 * Math.sin(i / 10));
    const corte = secao ? 2000 + 1800 * Math.sin(i / 24) ** 2 : 900 + 600 * Math.sin(i / 32) ** 2;
    synth(t, nota(raiz + 12 + ARPEJO[p]), PASSO * 1.6, secao ? 0.2 : 0.12, 'square', corte);
    if (ritmoBR.eddie) {
      const b = BERIM[p];
      if (b === 'dom') berimbauEm(t, nota(raiz), 0.3, musicaGain);
      else if (b === 'din') berimbauEm(t, nota(raiz + 2), 0.3, musicaGain);
      else if (b === 'chi') ruidoEm(t, 0.05, 0.35, 'highpass', 5000, musicaGain); // caxixi
      ruidoEm(t, 0.04, p % 4 === 0 ? 0.3 : 0.12, 'highpass', 7000, musicaGain); // platinela do pandeiro
      if (p === 2 || p === 7 || p === 10) agogoEm(t, p === 7 ? 660 : 880, 0.12, musicaGain);
    }
    if (ritmoBR.velho) {
      if (ATAB[p]) atabaqueEm(t, ATAB[p], p === 0 ? 0.7 : 0.45, musicaGain);
      if (p % 2 === 0) ruidoEm(t, 0.05, 0.15, 'bandpass', 4000, musicaGain); // xequerê
      if (p === 0 && compasso % 4 === 3) agogoEm(t, 520, 0.18, musicaGain);
    }
    if (secao && p === 0 && compasso % 2 === 0) // pad nas partes intensas
      [0, 3, 7].forEach(iv => synth(t, nota(raiz + 24 + iv), PASSO * 30, 0.06, 'sawtooth', 3000));
  }
  function iniciaMusica() {
    musicaGain = ac.createGain(); musicaGain.gain.value = 0; musicaGain.connect(master);
    proxima = ac.currentTime + 0.1;
    musicaTimer = setInterval(() => {
      if (ac.state !== 'running') return;
      if (proxima < ac.currentTime) proxima = ac.currentTime + 0.05; // aba voltou do segundo plano
      while (proxima < ac.currentTime + 0.15) { tocaPasso(passo++, proxima); proxima += PASSO; }
    }, 25);
  }

  let musicaLigada = false;
  function sequencia(notas, passo, vol, onda, atraso = 0) { notas.forEach((n, i) => tom(passo * 1.4, vol, onda, nota(n), nota(n) * 1.001, atraso + i * passo)); }

  function vozMasculinaBR() {
    if (!window.speechSynthesis) return null;
    const masculinas = /\b(male|masculin[oa]|antonio|antônio|daniel|felipe|ricardo|thiago|bruno|pedro|jo[aã]o|paulo)\b/i;
    return speechSynthesis.getVoices().find(v => /^pt[-_]BR$/i.test(v.lang) &&
      !/\bfemale\b/i.test(v.name) && masculinas.test(v.name)) || null;
  }

  let ultimaFala = 0;
  function fala(txt, pitch, rate, destaque = false) { // limita interrupções durante os combos
    if (!window.speechSynthesis) return;
    const agora = performance.now();
    if (!destaque && (agora - ultimaFala < 2800 || speechSynthesis.speaking)) return;
    const vozes = speechSynthesis.getVoices();
    const masculina = vozMasculinaBR();
    const voz = masculina || vozes.find(v => /^pt[-_]BR$/i.test(v.lang)) || null;
    const f = new SpeechSynthesisUtterance(txt);
    if (voz) f.voice = voz;
    f.lang = 'pt-BR'; f.pitch = masculina ? pitch : Math.min(pitch, 0.6);
    f.rate = rate; f.volume = 1;
    ultimaFala = agora;
    if (destaque) speechSynthesis.cancel();
    speechSynthesis.speak(f);
  }

  return {
    cenario(nome) {
      const novo = nome === 'brasil' || trilhas[nome] ? nome : 'neon';
      if (novo === cenarioMusica) return;
      cenarioMusica = novo; PASSO = 60 / (novo === 'brasil' ? 108 : trilhas[novo] ? trilhas[novo].bpm : 140) / 4;
      passo = 0;
      if (ac && musicaTimer) proxima = ac.currentTime + 0.12;
    },
    ritmo(eddie, velho) { ritmoBR.eddie = !!eddie; ritmoBR.velho = !!velho; },
    golpeCapoeira(forte) { // ginga: berimbau curto + caxixi (+ cuíca nos golpes fortes)
      if (!pronto()) return;
      const t = ac.currentTime;
      berimbauEm(t, forte ? 147 : 220, 0.25, master); ruidoEm(t, 0.06, 0.25, 'highpass', 6000, master);
      if (forte) cuicaEm(t + 0.05, 500, 1100, 0.2, master);
    },
    acertoCapoeira() { if (pronto()) agogoEm(ac.currentTime, Math.random() < 0.5 ? 660 : 880, 0.22, master); },
    golpeVelho() { if (pronto()) atabaqueEm(ac.currentTime, 110, 0.5, master); },
    acertoVelho() { if (pronto()) { const t = ac.currentTime; atabaqueEm(t, 82, 0.7, master); atabaqueEm(t + 0.12, 123, 0.4, master); } },
    gritoEddie(destaque = false) {
      const frases = destaque ? ['Iê, camará! Bora pra roda!', 'Oxente! Segura essa ginga, meu rei!', 'Axé! Capoeira da Bahia!']
        : ['Iê!', 'Bora, meu rei!', 'Oxente, olha a ginga!', 'Vixe, que rasteira!', 'Axé!', 'É na capoeira!'];
      fala(frases[Math.floor(Math.random() * frases.length)], 0.85, 1.05, destaque);
    },
    gritoVelho(destaque = false) {
      const frases = destaque ? ['Saravá! Os ancestrais estão comigo!', 'Oxente, meu filho! Respeite a mandinga!', 'Com calma e fé, meu rei!']
        : ['Saravá!', 'Calma, meu filho.', 'Oxente, tenha paciência!', 'Vixe, meu rei!', 'A fé me guia.', 'Venha com respeito.'];
      fala(frases[Math.floor(Math.random() * frases.length)], 0.45, 0.85, destaque);
    },
    gritoPalito(destaque = false) {
      const frases = destaque ? ['Mil cortes!', 'Sinta o fio da minha espada!', 'Lâmina afiada!']
        : ['En garde!', 'Minha espada é mais rápida!', 'Tome essa!', 'Corte certeiro!'];
      fala(frases[Math.floor(Math.random() * frases.length)], 0.95, 1.15, destaque);
    },
    gritoBlocos(destaque = false) {
      const frases = destaque ? ['Meteoro de pedra!', 'O chão vai tremer!', 'Força da rocha!']
        : ['Sou inabalável!', 'Pedra contra você!', 'Sinta o peso!', 'Nada me derruba!'];
      fala(frases[Math.floor(Math.random() * frases.length)], 0.6, 0.9, destaque);
    },
    // liga a música só durante a luta, com fade
    musica(ligar) {
      if (!ac || ligar === musicaLigada) return;
      if (ligar && ac.state !== 'running') return;
      musicaLigada = ligar;
      if (ligar && !musicaTimer) iniciaMusica();
      const g = musicaGain.gain, t = ac.currentTime;
      g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(ligar ? 0.32 : 0, t + (ligar ? 1.5 : 0.8));
      if (ligar) passo = 0; // recomeça do início a cada luta
    },
    round() { // gongo
      if (!pronto()) return;
      [1, 2.76, 5.4].forEach((m, i) => tom(1.8, 0.35 / (i + 1), 'sine', 180 * m, 175 * m));
      chiado(0.3, 0.3, 'bandpass', 3000, 1000, 1);
    },
    lute() { // "LUTE!": batida + subida
      if (!pronto()) return;
      tom(0.3, 0.8, 'sine', 140, 40); chiado(0.4, 0.5, 'lowpass', 5000, 300);
      tom(0.35, 0.25, 'sawtooth', 220, 880, 0.05);
    },
    finishHim() { // nota grave e ameaçadora
      if (!pronto()) return;
      tom(1.4, 0.4, 'sawtooth', 55, 52); tom(1.4, 0.3, 'sawtooth', 58.3, 55); tom(1.4, 0.2, 'square', 110, 104, 0.1);
    },
    vitoriaRound() { if (pronto()) sequencia([57, 60, 64, 69], 0.1, 0.22, 'square'); },
    campeao() { if (pronto()) { sequencia([60, 64, 67, 72, 67, 72, 76], 0.12, 0.22, 'square'); tom(1.2, 0.2, 'sawtooth', nota(72), nota(72), 0.84); } },
    empate() { if (pronto()) sequencia([64, 63, 62, 61], 0.15, 0.2, 'triangle'); },
    comida() { if (pronto()) sequencia([72, 76, 79], 0.06, 0.2, 'triangle'); },
    estrela() { if (pronto()) for (let i = 0; i < 8; i++) tom(0.15, 0.12, 'square', nota(84 + (i % 4) * 3), nota(86 + (i % 4) * 3), i * 0.05); },
    martelo() { if (pronto()) { tom(0.4, 0.6, 'square', 90, 60); chiado(0.3, 0.4, 'bandpass', 1200, 400, 3); tom(0.5, 0.15, 'triangle', 600, 580, 0.05); } },
    fogo() { if (pronto()) { chiado(0.7, 0.5, 'bandpass', 400, 2500, 0.8); tom(0.5, 0.25, 'sawtooth', 110, 220); sequencia([64, 67, 71], 0.06, 0.15, 'square'); } },
    gelo() { if (pronto()) { for (let i = 0; i < 6; i++) tom(0.25, 0.1, 'sine', nota(96 - i * 2), nota(98 - i * 2), i * 0.04); chiado(0.6, 0.3, 'highpass', 6000, 3000, 2); } },
    raioPega() { if (pronto()) { tom(0.3, 0.2, 'sawtooth', 200, 1600); chiado(0.25, 0.3, 'bandpass', 3000, 6000, 4); } },
    vento() { if (pronto()) { chiado(1.1, 0.45, 'bandpass', 300, 1400, 3); chiado(1.1, 0.2, 'bandpass', 900, 250, 5); } },
    lendarioAgiota() { // chuva de moedas e um grave ameaçador
      if (!pronto()) return;
      [0, 0.07, 0.14, 0.21, 0.28].forEach((a, i) => tom(0.22, 0.18, 'triangle', 1500 - i * 90, 700 - i * 50, a));
      tom(0.65, 0.55, 'sawtooth', 100, 35, 0.18); chiado(0.4, 0.25, 'highpass', 5000, 2500, 2);
    },
    lendarioTiaZap() { // notificações em cascata e alerta de grupo da família
      if (!pronto()) return;
      [0, 0.11, 0.22, 0.33, 0.44].forEach((a, i) => tom(0.09, 0.22, 'sine', 1250 + (i % 2) * 250, 950 + (i % 2) * 180, a));
      chiado(0.55, 0.2, 'highpass', 4500, 7000, 2); sequencia([84, 79, 84], 0.1, 0.12, 'square', 0.5);
    },
    lendarioPombo() { // arrulhos caricatos sintetizados e explosão de asas
      if (!pronto()) return;
      tom(0.16, 0.2, 'triangle', 420, 300); tom(0.18, 0.2, 'triangle', 380, 260, 0.13);
      chiado(0.35, 0.42, 'bandpass', 900, 4200, 1.2); tom(0.55, 0.4, 'sine', 90, 30, 0.22);
    },
    trovao() { if (pronto()) { chiado(0.12, 0.9, 'highpass', 2000, 8000); chiado(1.6, 0.9, 'lowpass', 1800, 60); tom(1.2, 0.6, 'sine', 70, 28); } },
    congela() { if (pronto()) { chiado(0.4, 0.4, 'highpass', 4000, 9000, 1); for (let i = 0; i < 5; i++) tom(0.12, 0.12, 'triangle', nota(100 - i * 3), nota(100 - i * 3), i * 0.03); } },
    quebraGelo() { if (pronto()) { chiado(0.35, 0.6, 'highpass', 5000, 2000, 2); for (let i = 0; i < 7; i++) tom(0.08, 0.1, 'triangle', 2000 + Math.random() * 3000, 1500, i * 0.025); } },
    tique(urgente) { if (pronto()) tom(0.05, urgente ? 0.25 : 0.12, 'square', urgente ? 1400 : 1000, urgente ? 1400 : 1000); },
    queda() { if (pronto()) { tom(0.3, 0.7, 'sine', 90, 35); chiado(0.25, 0.4, 'lowpass', 1200, 100); } },
    explosao() { if (pronto()) { chiado(1.2, 0.9, 'lowpass', 4000, 60); tom(0.8, 0.8, 'sine', 120, 25); } },
    corte() { if (pronto()) { chiado(0.25, 0.5, 'highpass', 3000, 9000); tom(0.15, 0.3, 'sawtooth', 2000, 400); } },
    clique() { if (pronto()) tom(0.05, 0.15, 'triangle', 700, 900); },
    golpe(forte) { // ar cortando no início do ataque
      if (!pronto()) return;
      chiado(forte ? 0.22 : 0.14, forte ? 0.35 : 0.22, 'bandpass', forte ? 600 : 900, forte ? 2400 : 3200, 2);
    },
    acerto(forte) {
      if (!pronto()) return;
      tom(forte ? 0.25 : 0.12, forte ? 0.9 : 0.6, 'sine', forte ? 160 : 220, 45);
      chiado(forte ? 0.18 : 0.08, forte ? 0.7 : 0.45, 'lowpass', forte ? 3000 : 4000, 300);
    },
    defesa() {
      if (!pronto()) return;
      tom(0.09, 0.3, 'square', 900, 500); chiado(0.06, 0.3, 'highpass', 2000, 1500);
    },
    pulo() { if (pronto()) tom(0.15, 0.15, 'triangle', 250, 520); },
    pouso() { if (pronto()) { tom(0.1, 0.35, 'sine', 120, 50); chiado(0.08, 0.2, 'lowpass', 800, 200); } },
    berimbau(forte) { // corda do berimbau (tom com dobra de afinação) + caxixi
      if (!pronto()) return;
      const n = forte ? [45, 52, 57, 52, 57, 64] : [45, 52];
      n.forEach((m, i) => { tom(0.7, 0.28, 'sawtooth', nota(m) * 0.97, nota(m), i * 0.11); tom(0.5, 0.18, 'triangle', nota(m + 12), nota(m + 12) * 0.99, i * 0.11); chiado(0.07, 0.25, 'highpass', 6000, 9000, 2); });
    },
    fumaca() { if (pronto()) { chiado(0.9, 0.35, 'lowpass', 900, 200, 0.7); chiado(0.6, 0.15, 'bandpass', 400, 900, 1); } }, // baforada
    latidoBob(n = 2) { // latidos de cachorro pequeno: dente-de-serra com formante subindo e caindo + sopro
      if (!pronto()) return;
      if (latidoReal) { const passo = Math.min(0.32, latidoReal.duration * 0.9); for (let k = 0; k < n; k++) tocaLatidoReal(k * passo, 1.05 + Math.random() * 0.15); return; }
      for (let k = 0; k < n; k++) {
        const t = ac.currentTime + k * 0.2, f0 = 620 + Math.random() * 80;
        const o = ac.createOscillator(), fl = ac.createBiquadFilter(), g = ac.createGain();
        o.type = 'sawtooth';
        o.frequency.setValueAtTime(f0 * 0.75, t); o.frequency.exponentialRampToValueAtTime(f0, t + 0.03); o.frequency.exponentialRampToValueAtTime(f0 * 0.55, t + 0.14);
        fl.type = 'bandpass'; fl.Q.value = 2.5;
        fl.frequency.setValueAtTime(900, t); fl.frequency.exponentialRampToValueAtTime(1800, t + 0.03); fl.frequency.exponentialRampToValueAtTime(700, t + 0.14);
        env(g, t, 0.008, 0.75, 0.16);
        o.connect(fl).connect(g).connect(master); o.start(t); o.stop(t + 0.2);
        ruidoEm(t, 0.08, 0.25, 'bandpass', 2200, master);
      }
    },
    rosnadoBob() { // rosnado curto antes da mordida
      if (!pronto()) return;
      const t = ac.currentTime, o = ac.createOscillator(), lfo = ac.createOscillator(), lg = ac.createGain(), fl = ac.createBiquadFilter(), g = ac.createGain();
      o.type = 'sawtooth'; o.frequency.value = 140; lfo.frequency.value = 28; lg.gain.value = 0.5;
      fl.type = 'lowpass'; fl.frequency.value = 900;
      env(g, t, 0.03, 0.5, 0.35);
      lfo.connect(lg).connect(g.gain);
      o.connect(fl).connect(g).connect(master); o.start(t); lfo.start(t); o.stop(t + 0.4); lfo.stop(t + 0.4);
    },
    ganidoBob() { if (pronto()) { tom(0.25, 0.35, 'triangle', 1300, 700); tom(0.2, 0.15, 'sine', 2600, 1400); } }, // apanhou
    benze(cura) { // sininhos suaves; mais alto quando a cura entra
      if (!pronto()) return;
      (cura ? [76, 79, 83, 88] : [72, 76]).forEach((m, i) => tom(0.9, cura ? 0.14 : 0.08, 'sine', nota(m), nota(m), i * 0.12));
    },
    mandinga(revida) { // grave misterioso; com estalo quando o contra-ataque entra
      if (!pronto()) return;
      tom(0.8, 0.25, 'triangle', 98, 92); tom(0.8, 0.18, 'sine', 147, 139, 0.05);
      if (revida) { chiado(0.2, 0.6, 'highpass', 2000, 6000); tom(0.3, 0.6, 'square', 300, 60); }
    },
    axe() { // redemoinho do super: vento subindo + acorde
      if (!pronto()) return;
      chiado(1.6, 0.5, 'bandpass', 300, 2600, 2); sequencia([57, 61, 64, 69, 73], 0.08, 0.18, 'square');
    },
    magia() { if (pronto()) { tom(0.5, 0.25, 'sawtooth', 200, 1200); tom(0.5, 0.2, 'sine', 400, 2000, 0.05); } },
    anuncio() { // FIGHT / round / KO
      if (!pronto()) return;
      [0, 0.08, 0.16].forEach((a, i) => tom(0.35, 0.25, 'sawtooth', 110 * (i + 1), 90 * (i + 1), a));
    },
    fatalBlow() { // estrondo + voz "Fatal Blow"
      if (pronto()) { tom(1.2, 0.7, 'sawtooth', 80, 35); chiado(0.9, 0.5, 'lowpass', 2500, 80); tom(0.6, 0.3, 'square', 440, 110, 0.05); }
      if (!window.speechSynthesis) return;
      const f = new SpeechSynthesisUtterance('Fatal Blow');
      const vozes = speechSynthesis.getVoices();
      f.voice = vozes.find(v => /en.(US|GB)/i.test(v.lang) && /male|david|daniel|fred|alex/i.test(v.name)) || vozes.find(v => /^en/i.test(v.lang)) || null;
      f.lang = 'en-US'; f.pitch = 0.2; f.rate = 0.8; f.volume = 1;
      speechSynthesis.cancel(); speechSynthesis.speak(f);
    },
    falaFatality(txt = 'Fatality') { // voz grave "Fatality" (sintetizada pelo navegador) + estrondo
      if (pronto()) { tom(1.8, 0.7, 'sine', 60, 28); chiado(1.4, 0.5, 'lowpass', 900, 60); }
      if (!window.speechSynthesis) return;
      const f = new SpeechSynthesisUtterance(txt);
      const vozes = speechSynthesis.getVoices();
      f.voice = vozes.find(v => /en.(US|GB)/i.test(v.lang) && /male|david|daniel|fred|alex/i.test(v.name)) || vozes.find(v => /^en/i.test(v.lang)) || null;
      f.lang = 'en-US'; f.pitch = 0.1; f.rate = 0.65; f.volume = 1;
      speechSynthesis.cancel(); speechSynthesis.speak(f);
    },
    fatality() {
      if (!pronto()) return;
      tom(1.6, 0.6, 'sawtooth', 70, 30); tom(1.6, 0.4, 'square', 73, 31); chiado(1.2, 0.5, 'lowpass', 1500, 80);
    },
  };
})();

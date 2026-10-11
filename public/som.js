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
  };
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
  const BPM = 140, PASSO = 60 / BPM / 4; // semicolcheia
  const nota = n => 440 * Math.pow(2, (n - 69) / 12);
  // progressão Am - F - C - G (2 compassos cada), em MIDI
  const RAIZES = [45, 41, 48, 43];
  const ARPEJO = [0, 12, 7, 12, 3, 12, 7, 15, 0, 12, 7, 12, 3, 19, 15, 12];
  const BAIXO = [1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 1];
  let passo = 0, proxima = 0;

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
  function tocaPasso(i, t) {
    const p = i % 16, compasso = Math.floor(i / 16), raiz = RAIZES[Math.floor(compasso / 2) % 4];
    const secao = Math.floor(compasso / 8) % 2; // a cada 8 compassos alterna parte calma/intensa
    if (p % 4 === 0) bumbo(t);
    if (p === 4 || p === 12) ruidoM(t, 0.18, 0.5, 'bandpass', 1800); // caixa
    ruidoM(t, p % 2 ? 0.03 : 0.06, p % 4 === 2 ? 0.35 : 0.15, 'highpass', 8000); // chimbal
    if (BAIXO[p]) synth(t, nota(raiz - 12), PASSO * 0.9, 0.5, 'sawtooth', 900 + 500 * Math.sin(i / 10));
    const corte = secao ? 2000 + 1800 * Math.sin(i / 24) ** 2 : 900 + 600 * Math.sin(i / 32) ** 2;
    synth(t, nota(raiz + 12 + ARPEJO[p]), PASSO * 1.6, secao ? 0.2 : 0.12, 'square', corte);
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

  return {
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
    magia() { if (pronto()) { tom(0.5, 0.25, 'sawtooth', 200, 1200); tom(0.5, 0.2, 'sine', 400, 2000, 0.05); } },
    anuncio() { // FIGHT / round / KO
      if (!pronto()) return;
      [0, 0.08, 0.16].forEach((a, i) => tom(0.35, 0.25, 'sawtooth', 110 * (i + 1), 90 * (i + 1), a));
    },
    falaFatality() { // voz grave "Fatality" (sintetizada pelo navegador) + estrondo
      if (pronto()) { tom(1.8, 0.7, 'sine', 60, 28); chiado(1.4, 0.5, 'lowpass', 900, 60); }
      if (!window.speechSynthesis) return;
      const f = new SpeechSynthesisUtterance('Fatality');
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

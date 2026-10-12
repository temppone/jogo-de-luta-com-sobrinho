// FATALITY do Preto Velho: baforada do cachimbo, a nuvem envolve o inimigo, luzes dos ancestrais giram
// e ele levita; a bengala bate no chão e ele explode. Quadros-chave em st.fatality.idade (ticks, 30/s).
// Server marca f.explodiu no tick 76.
(() => {
  const ativo = () => st && st.fatality && st.fatality.tipo === 'ancestral';
  const SOPRO = 18, CHEGA = 32, LEVITA = 40, BATE = 72, IMPACTO = 76;
  const PARADO = { tr: 20, ba: 7, p: [12, -10], j: [-18, -16], b: [25, -35], c: [-15, 95] };

  const VENCEDOR = [
    [0, PARADO],
    [10, { b: [25, 150], c: [-15, 150], tr: 10 }], // cachimbo na boca
    [16, { tr: 4 }], // puxa o fumo
    [SOPRO + 4, { tr: 34, ba: 10 }], // baforada
    [28, PARADO],
    [36, { b: [170, -35], c: [5, 95], tr: -8, ba: 4, p: [20, -18] }], // ergue a bengala
    [66, { b: [175, -35], tr: -12 }],
    [BATE, { b: [35, -35], c: [0, 95], tr: 42, ba: 16, p: [35, -25], j: [-40, -20] }], // bengala no chão
    [90, { b: [35, -35], tr: 40 }],
    [110, PARADO],
  ];
  const PERDEDOR = [
    [CHEGA, { tr: 8, b: [10, -10], c: [40, 50], ba: 6, p: [12, -12], j: [-25, -20] }],
    [CHEGA + 4, { tr: 45, b: [60, 50], c: [110, 110], ba: 14 }], // tosse na fumaça
    [LEVITA, { tr: 30 }],
    [LEVITA + 8, { tr: -15, b: [-40, -50], c: [10, 10], ba: -20, p: [5, -5], j: [-10, -10] }], // pés saem do chão
    [BATE, { tr: -25, b: [-70, -80], ba: -75, p: [-5, 5], j: [-5, -5] }],
  ];
  function amostra(kf, campo, t) {
    let a = null, b = null;
    for (const [tk, v] of kf) if (v[campo] !== undefined) { if (tk <= t) a = [tk, v[campo]]; else if (!b) b = [tk, v[campo]]; }
    if (!a) return b ? b[1] : undefined;
    if (!b) return a[1];
    const u = suave((t - a[0]) / (b[0] - a[0]));
    return Array.isArray(a[1]) ? a[1].map((x, k) => lerp(x, b[1][k], u)) : lerp(a[1], b[1], u);
  }
  function aplica(p, kf, t) {
    for (const [campo, chave] of [['tr', 'tronco'], ['ba', 'baixa'], ['p', 'perna'], ['j', 'joelho'], ['b', 'bracoT'], ['c', 'cotovelo']]) {
      const v = amostra(kf, campo, t);
      if (v !== undefined) p[chave] = Array.isArray(v) ? v.slice() : v;
    }
    p.giro = 1; p.torcao = 0;
  }
  let ultIdade = -1, ultEm = 0;
  function tempo() {
    const id = st.fatality.idade, agora = performance.now();
    if (id !== ultIdade) { ultIdade = id; ultEm = agora; }
    return id + Math.min(1, (agora - ultEm) / 33);
  }
  const embrulha = orig => function (f, a, t) {
    const p = orig(f, a, t);
    if (!ativo()) return p;
    const tf = tempo();
    if (f.hp === 0) {
      if (tf >= CHEGA) {
        aplica(p, PERDEDOR, tf);
        if (tf >= LEVITA) { const tr = Math.sin(t / 35) * 4; p.tronco += tr; p.baixa += Math.sin(t / 300) * 4; } // treme no ar
      }
    } else aplica(p, VENCEDOR, tf);
    return p;
  };
  pose = embrulha(pose); poseBlocos = embrulha(poseBlocos);
  if (typeof poseEddie === 'function') poseEddie = embrulha(poseEddie);
  if (typeof posePalito === 'function') posePalito = embrulha(posePalito);
  posePretoVelho = embrulha(posePretoVelho);

  let chave = null, nuvem = [], luzes = [], onda = 0, flash = 0, bateu = false, soprou = false;
  const hudAntes = FAT.hud;
  FAT.hud = function (ctx_, vis, P, w, h, s, agora) {
    hudAntes.call(this, ctx_, vis, P, w, h, s, agora);
    if (!ativo()) { chave = null; return; }
    const t = tempo(), iv = st.fatality.quem, V = vis.p[iv], L = vis.p[1 - iv];
    if (chave !== st.rodada) { chave = st.rodada; nuvem = []; luzes = []; onda = 0; flash = 0; bateu = false; soprou = false; }
    const esc = (x, y) => { const a = P(x, y), b = P(x, y + 100); return Math.hypot(a[0] - b[0], a[1] - b[1]) / 100; };
    if (t >= SOPRO && !soprou) {
      soprou = true; SOM.fumaca();
      for (let n = 0; n < 26; n++) nuvem.push({ a: Math.random() * 7, r: 10 + Math.random() * 45, y: 20 + Math.random() * 130, tam: 18 + Math.random() * 22, v: (Math.random() - 0.5) * 0.06 });
    }
    if (t >= LEVITA && !luzes.length) { SOM.mandinga(false); for (let n = 0; n < 9; n++) luzes.push({ a: n / 9 * 7, r: 55 + (n % 3) * 15, y: 30 + n * 15, v: 0.04 + Math.random() * 0.03 }); }
    if (t >= BATE && !bateu) { bateu = true; onda = agora; tremor = Math.max(tremor, 30); SOM.mandinga(true); }
    if (t >= IMPACTO && !flash) flash = agora;
    ctx.save();
    // nuvem: sai da boca do velho, viaja e envolve o inimigo; se desfaz depois da explosão
    if (nuvem.length) {
      const ida = Math.min(1, (t - SOPRO) / (CHEGA - SOPRO)), some = t > IMPACTO ? Math.max(0, 1 - (t - IMPACTO) / 20) : 1;
      const cx = lerp(V.x + V.facing * 40, L.x, suave(ida));
      for (const q of nuvem) {
        q.a += q.v;
        const r = q.r * (0.3 + 0.7 * ida), y = lerp(150, q.y + (t > LEVITA ? Math.min(60, (t - LEVITA) * 2) : 0), ida);
        const [nx, ny] = P(cx + Math.cos(q.a) * r, y + Math.sin(q.a * 2) * 6), k = esc(cx, y);
        ctx.globalAlpha = 0.28 * some; ctx.fillStyle = '#a8a29e';
        ctx.beginPath(); ctx.arc(nx, ny, q.tam * k * (0.5 + 0.5 * ida), 0, 7); ctx.fill();
      }
    }
    // luzes dos ancestrais girando em volta de quem levita
    for (const q of luzes) {
      if (t > IMPACTO + 10) break;
      q.a += q.v;
      const y = q.y + Math.min(70, (t - LEVITA) * 2.2), [lx, ly] = P(L.x + Math.cos(q.a) * q.r, y), k = esc(L.x, y);
      const gr = ctx.createRadialGradient(lx, ly, 0, lx, ly, 16 * k);
      gr.addColorStop(0, 'rgba(255,255,255,.95)'); gr.addColorStop(0.4, 'rgba(165,180,252,.6)'); gr.addColorStop(1, 'rgba(165,180,252,0)');
      ctx.globalAlpha = Math.sin(q.a * 3) * 0.3 + 0.7; ctx.fillStyle = gr; ctx.fillRect(lx - 16 * k, ly - 16 * k, 32 * k, 32 * k);
    }
    // onda de choque no chão quando a bengala bate
    if (onda && agora - onda < 700) {
      const u = (agora - onda) / 700, [ox, oy] = P(V.x + V.facing * 60, 0), k = esc(V.x, 0);
      ctx.globalAlpha = 1 - u; ctx.strokeStyle = '#e0e7ff'; ctx.lineWidth = 6 * k * (1 - u);
      ctx.beginPath(); ctx.ellipse(ox, oy, 260 * u * k, 40 * u * k, 0, 0, 7); ctx.stroke();
    }
    if (flash && agora - flash < 350) { ctx.globalAlpha = 1; ctx.fillStyle = 'rgba(224,231,255,' + 0.8 * (1 - (agora - flash) / 350) + ')'; ctx.fillRect(0, 0, w, h); }
    const rotulo = t >= SOPRO && t < CHEGA + 4 ? 'BAFORADA' : t >= LEVITA && t < BATE ? 'OS ANCESTRAIS CHEGARAM' : null;
    if (rotulo) {
      ctx.globalAlpha = 1; ctx.font = 'italic 900 ' + 28 * s + 'px Audiowide, Impact, system-ui'; ctx.textAlign = 'center';
      ctx.lineWidth = 7 * s; ctx.strokeStyle = '#000'; ctx.strokeText(rotulo, w / 2, h * 0.36); ctx.fillStyle = '#e0e7ff'; ctx.fillText(rotulo, w / 2, h * 0.36);
    }
    ctx.restore();
  };
})();

// FATALITY do Eddie: ginga, armada na cabeça, meia-lua de compasso, redemoinho de axé subindo do chão
// e um chute final que explode o inimigo. Quadros-chave em st.fatality.idade (ticks, 30/s). Server marca f.explodiu no tick 66.
(() => {
  const ativo = () => st && st.fatality && st.fatality.tipo === 'capoeira';
  const ARMADA = 15, MEIALUA = 31, GIRO = [42, 62], IMPACTO = 66;
  const GINGA = { tr: 12, ba: 10, p: [40, -35], j: [-70, 0], b: [110, -20], c: [60, 30] };

  // b/c = braços/cotovelos (os dois), tr = tronco, ba = baixa (negativo sobe), p/j = pernas/joelhos
  const VENCEDOR = [
    [0, GINGA],
    [8, { tr: 16, p: [-30, 35], j: [0, -70], b: [-20, 110], c: [30, 60] }], // ginga pro outro lado
    [11, { tr: 10, p: [20, -8], j: [-10, -10], b: [70, -50], c: [30, 30], ba: 4 }],
    [ARMADA, { tr: -30, p: [150, -8], j: [0, -10] }], // armada na cabeça
    [20, { tr: 10, p: [30, -15], j: [-30, -10] }],
    [24, { tr: 30, ba: 12 }],
    [27, { tr: 75, b: [10, 22], c: [0, 0], p: [10, -15], j: [0, -40], ba: 18 }], // mão no chão
    [MEIALUA, { p: [160, -15] }], // meia-lua de compasso
    [36, { p: [20, -15] }],
    [40, GINGA],
    [GIRO[0], { tr: -5, b: [92, -92], c: [0, 0], p: [10, -10], j: [0, 0], ba: 0 }], // abre os braços e gira
    [GIRO[1], { ba: -26, tr: -10 }], // sobe no redemoinho
    [64, { ba: 4, tr: -20, p: [25, -10], j: [-85, -10] }], // engatilha
    [IMPACTO, { p: [125, -10], j: [0, -10], tr: -38 }], // chute final
    [74, { p: [125, -10] }],
    [86, { tr: -4, ba: 6, p: [25, -25], j: [-20, -20], b: [168, 192], c: [10, -10] }], // braços pro alto
  ];
  const PERDEDOR = [
    [ARMADA, { tr: 10, b: [10, -10], c: [40, 50], ba: 6, p: [12, -12], j: [-25, -20] }],
    [ARMADA + 2, { tr: -38, b: [-40, -55], c: [10, 10] }], // cabeça vai pra trás
    [26, { tr: -6, b: [10, -10], c: [40, 50] }],
    [MEIALUA, { tr: -4 }],
    [MEIALUA + 2, { tr: -50, ba: 14, p: [30, -5], j: [-40, -30] }], // quase cai
    [44, { tr: 8, ba: 8, p: [12, -12], j: [-25, -20] }],
    [58, { tr: -20, b: [140, 150], c: [30, 30] }], // vento do redemoinho levanta os braços
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
  // tempo do fatality com fração (o server manda ticks inteiros; interpola pelo relógio)
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
    if (f.hp === 0) { if (tf >= ARMADA) aplica(p, PERDEDOR, tf); }
    else aplica(p, VENCEDOR, tf);
    return p;
  };
  pose = embrulha(pose); poseBlocos = embrulha(poseBlocos); poseEddie = embrulha(poseEddie);

  // giros do corpo inteiro do vencedor (armada, meia-lua e o redemoinho que acelera)
  const ease = x => x < 0.5 ? 4 * x * x * x : 1 - (-2 * x + 2) ** 3 / 2;
  const giroAntes = giroCorpo;
  giroCorpo = function (f) {
    if (!ativo() || f.hp === 0) return giroAntes(f);
    const t = tempo(), V = Math.PI * 2;
    if (t >= 10 && t < 19) return ease((t - 10) / 9) * V;
    if (t >= 25 && t < 36) return ease((t - 25) / 11) * V;
    if (t >= GIRO[0] && t < IMPACTO) return ((t - GIRO[0]) / (IMPACTO - GIRO[0])) ** 2 * V * 4;
    return 0;
  };

  let chave = null, batidas = {}, notas = [], faiscas = [], flash = 0;
  const hudAntes = FAT.hud;
  FAT.hud = function (ctx_, vis, P, w, h, s, agora) {
    hudAntes.call(this, ctx_, vis, P, w, h, s, agora);
    if (!ativo()) { chave = null; return; }
    const t = tempo(), iv = st.fatality.quem, V = vis.p[iv], L = vis.p[1 - iv];
    if (chave !== st.rodada) { chave = st.rodada; batidas = {}; notas = []; faiscas = []; flash = 0; }
    const esc = (x, y) => { const a = P(x, y), b = P(x, y + 100); return Math.hypot(a[0] - b[0], a[1] - b[1]) / 100; };
    // impactos: tremor, faíscas, som
    for (const [tk, y, forte] of [[ARMADA, 120, false], [MEIALUA, 105, false], [IMPACTO, 80, true]]) {
      if (t >= tk && !batidas[tk]) {
        batidas[tk] = true; tremor = Math.max(tremor, forte ? 34 : 16);
        if (tk === IMPACTO) flash = agora; else SOM.acerto(true);
        for (let n = 0; n < (forte ? 40 : 18); n++) faiscas.push({ x: L.x - L.facing * 10, y, vx: (Math.random() - 0.5) * 16, vy: Math.random() * 12, vida: 1 });
      }
    }
    if (t >= GIRO[0] && !batidas.giro) { batidas.giro = true; SOM.berimbau(true); }
    ctx.save();
    // redemoinho de axé: anéis dourados elípticos subindo em volta do Eddie, notas musicais girando
    if (t >= GIRO[0] - 2 && t < IMPACTO + 8) {
      const forca = Math.min(1, (t - GIRO[0] + 2) / 10) * (t > IMPACTO ? Math.max(0, 1 - (t - IMPACTO) / 8) : 1);
      for (let n = 0; n < 6; n++) {
        const y = 15 + n * 28 + ((agora / 12) % 28), [cx, cy] = P(V.x, y), k = esc(V.x, y);
        ctx.globalAlpha = forca * (0.75 - n * 0.09); ctx.strokeStyle = n % 2 ? '#fde047' : '#f59e0b'; ctx.lineWidth = (5 - n * 0.5) * k;
        const rx = (40 + n * 9 + Math.sin(agora / 90 + n) * 6) * k, giro = agora / 70 + n;
        ctx.beginPath(); ctx.ellipse(cx, cy, rx, rx * 0.28, 0, giro % (Math.PI * 2), giro % (Math.PI * 2) + 4.2); ctx.stroke();
      }
      if (Math.random() < 0.5 * forca) notas.push({ a: Math.random() * 7, r: 50 + Math.random() * 30, y: 10, vy: 1.5 + Math.random() * 2, txt: Math.random() < 0.5 ? '♪' : '♫', vida: 1 });
      // luz dourada no chão
      const [gx, gy] = P(V.x, 0), k0 = esc(V.x, 0), gr = ctx.createRadialGradient(gx, gy, 0, gx, gy, 120 * k0);
      gr.addColorStop(0, 'rgba(253,224,71,' + 0.5 * forca + ')'); gr.addColorStop(1, 'rgba(253,224,71,0)');
      ctx.globalAlpha = 1; ctx.fillStyle = gr; ctx.fillRect(gx - 120 * k0, gy - 120 * k0, 240 * k0, 240 * k0);
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    notas = notas.filter(q => (q.vida -= 0.012) > 0);
    for (const q of notas) {
      q.a += 0.12; q.y += q.vy;
      const [nx, ny] = P(V.x + Math.cos(q.a) * q.r, q.y), k = esc(V.x, q.y);
      ctx.globalAlpha = q.vida; ctx.font = 'bold ' + 26 * k + 'px system-ui'; ctx.fillStyle = '#fde047'; ctx.strokeStyle = '#7c2d12'; ctx.lineWidth = 3 * k;
      ctx.strokeText(q.txt, nx, ny); ctx.fillText(q.txt, nx, ny);
    }
    faiscas = faiscas.filter(q => (q.vida -= 0.03) > 0);
    for (const q of faiscas) {
      q.x += q.vx; q.y += q.vy; q.vy -= 0.8;
      const [fx, fy] = P(q.x, q.y), k = esc(q.x, q.y);
      ctx.globalAlpha = q.vida; ctx.fillStyle = '#fde047'; ctx.beginPath(); ctx.arc(fx, fy, 5 * k * q.vida, 0, 7); ctx.fill();
    }
    // flash dourado no chute final
    if (flash && agora - flash < 300) { ctx.globalAlpha = 1; ctx.fillStyle = 'rgba(253,224,71,' + 0.7 * (1 - (agora - flash) / 300) + ')'; ctx.fillRect(0, 0, w, h); }
    // nome dos golpes durante a coreografia
    const rotulo = t >= ARMADA - 3 && t < 24 ? 'ARMADA' : t >= MEIALUA - 3 && t < 40 ? 'MEIA-LUA DE COMPASSO' : t >= GIRO[0] && t < IMPACTO ? 'AXÉ!' : null;
    if (rotulo) {
      ctx.globalAlpha = 1; ctx.font = 'italic 900 ' + 30 * s + 'px Audiowide, Impact, system-ui';
      ctx.lineWidth = 7 * s; ctx.strokeStyle = '#000'; ctx.strokeText(rotulo, w / 2, h * 0.36); ctx.fillStyle = '#fde047'; ctx.fillText(rotulo, w / 2, h * 0.36);
    }
    ctx.restore();
  };
})();

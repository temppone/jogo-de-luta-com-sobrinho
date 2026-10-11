// FATALITY do Palito: saca a espada, corta a cabeça, chute no tronco, soco arranca a cabeça (sai voando).
// Coreografia por quadros-chave em st.fatality.idade (ticks do server, 30/s). Server marca f.decapitado no tick 62.
(() => {
  const espada = () => st && st.fatality && st.fatality.tipo === 'espada';
  const idade = () => st.fatality.idade + 0; // ticks

  // quadros-chave: b/c = braço/cotovelo da frente, tr = tronco, ba = baixa, p/j = pernas/joelhos
  const VENCEDOR = [
    [0, { b: 20, c: 60, tr: 5, ba: 4, p: [15, -15], j: [-20, -20] }],
    [8, { b: -150, c: -20, tr: -5 }], // mão atrás do ombro, pega a espada
    [14, { b: 170, c: 10, tr: -10 }], // espada erguida
    [18, { b: 60, c: 0, tr: 25, ba: 12 }], // corte na cabeça
    [26, { b: 40, c: 10, tr: 20, ba: 12 }],
    [30, { b: 10, c: 40, tr: -15, ba: 2, p: [95, -20], j: [0, -20] }], // chute no tronco
    [38, { b: 10, c: 40, tr: -15, p: [95, -20], j: [0, -20] }],
    [46, { b: -20, c: 90, tr: 5, ba: 8, p: [15, -15], j: [-20, -20] }], // guarda a espada
    [56, { b: -30, c: 130, tr: -5 }], // carrega o soco
    [61, { b: 95, c: 0, tr: 22 }], // soco na cabeça
    [72, { b: 95, c: 0, tr: 22 }],
    [92, { b: 165, c: 10, tr: -5, ba: 0 }], // braço erguido
  ];
  const PERDEDOR = [
    [18, { tr: 10, b: [10, -10], c: [40, 50], ba: 6, p: [12, -12], j: [-25, -20] }],
    [20, { tr: -28 }], // cabeça cortada joga pra trás
    [27, { tr: -12 }],
    [30, { tr: -8 }],
    [33, { tr: 48, ba: 18, b: [35, 45], c: [60, 70], p: [25, -25], j: [-50, -40] }], // dobra com o chute
    [44, { tr: 32 }],
    [56, { tr: 4, ba: 6, p: [12, -12], j: [-25, -20] }],
    [62, { tr: -22, b: [-30, -40], c: [10, 10] }], // soco: a cabeça sai
    [70, { tr: -6, b: [5, -5], c: [10, 10] }], // de pé sem cabeça
    [92, { tr: -2 }],
    [108, { tr: 30, ba: 32, p: [100, 92], j: [-150, -150], b: [20, 10] }], // ajoelha
    [124, { tr: 88, ba: 50, b: [150, 140], c: [0, 0] }], // cai de cara
  ];
  // valor de cada campo no instante t (segura o último definido, interpola com suave)
  function amostra(kf, campo, t) {
    let a = null, b = null;
    for (const [tk, v] of kf) if (v[campo] !== undefined) { if (tk <= t) a = [tk, v[campo]]; else if (!b) b = [tk, v[campo]]; }
    if (!a) return b ? b[1] : undefined;
    if (!b) return a[1];
    const u = suave((t - a[0]) / (b[0] - a[0]));
    return Array.isArray(a[1]) ? a[1].map((x, k) => lerp(x, b[1][k], u)) : lerp(a[1], b[1], u);
  }
  function aplica(p, kf, t, soFrente) {
    const v = n => amostra(kf, n, t);
    if (v('tr') !== undefined) p.tronco = v('tr');
    if (v('ba') !== undefined) p.baixa = v('ba');
    if (v('p')) p.perna = v('p');
    if (v('j')) p.joelho = v('j');
    if (soFrente) { if (v('b') !== undefined) p.bracoT = [v('b'), p.bracoT[1]]; if (v('c') !== undefined) p.cotovelo = [v('c'), p.cotovelo[1]]; }
    else { if (v('b')) p.bracoT = v('b'); if (v('c')) p.cotovelo = v('c'); }
    p.giro = 1; p.torcao = 0;
  }
  const embrulha = orig => function (f, a, tempo) {
    const p = orig(f, a, tempo);
    if (!espada()) return p;
    const t = idade();
    if (f.hp === 0) { if (t >= 18) aplica(p, PERDEDOR, t, false); }
    else aplica(p, VENCEDOR, t, true);
    return p;
  };
  pose = embrulha(pose); poseBlocos = embrulha(poseBlocos);

  // juntas no espaço do mundo (mesma conta de juntasLocais, sem mexer na animação)
  function mao(i, f) {
    const p = anim[i].cur; if (!p) return null;
    const sq = anim[i].squash || 0, d = f.facing;
    const vai = (o, ang, len) => [o[0] + Math.sin(ang * Math.PI / 180) * len * (1 + sq * 0.3), o[1] - Math.cos(ang * Math.PI / 180) * len * (1 - sq * 0.3)];
    const ombro = vai([0, (62 - p.baixa) * (1 - sq * 0.3)], 180 + p.tronco, 58);
    const cab = vai(ombro, 180 + anim[i].cabeca, 24);
    const cot = vai(ombro, p.bracoT[0], 30), m = vai(cot, p.bracoT[0] + p.cotovelo[0], 32);
    const W = q => [f.x + q[0] * d, f.y + q[1]];
    return { mao: W(m), ang: p.bracoT[0] + p.cotovelo[0], ombro: W(ombro), cabeca: W(cab), d };
  }

  const gotas = []; let cabecaVoa = null, chave = null, cortou = false;
  function jorra(x, y, n, dx, forca) {
    for (let k = 0; k < n; k++) gotas.push({ x, y, vx: dx * (2 + Math.random() * forca) + (Math.random() - .5) * 6, vy: 4 + Math.random() * forca, r: 2 + Math.random() * 4 });
  }

  const hudAntes = FAT.hud;
  FAT.hud = function (ctx_, vis, P, w, h, s, agora) {
    hudAntes.call(this, ctx_, vis, P, w, h, s, agora);
    if (!espada()) { gotas.length = 0; cabecaVoa = null; chave = null; return; }
    const fat = st.fatality, t = idade(), iv = fat.quem, ip = 1 - iv;
    if (chave !== st.rodada) { chave = st.rodada; gotas.length = 0; cabecaVoa = null; cortou = false; }
    const V = vis.p[iv], L = vis.p[ip], jv = mao(iv, V), jl = mao(ip, L);
    if (!jv || !jl) return;
    ctx.save();
    // espada na mão
    if (t >= 8 && t < 46) {
      const r = jv.ang * Math.PI / 180, [hx, hy] = jv.mao, ponta = [hx + Math.sin(r) * 72 * jv.d, hy - Math.cos(r) * 72];
      const guarda = [hx + Math.sin(r) * 8 * jv.d, hy - Math.cos(r) * 8];
      const a = P(...guarda), b = P(...ponta), c = P(hx, hy);
      ctx.lineCap = 'round';
      ctx.strokeStyle = '#78350f'; ctx.lineWidth = 6 * s; ctx.beginPath(); ctx.moveTo(...c); ctx.lineTo(...a); ctx.stroke();
      ctx.strokeStyle = '#e5e7eb'; ctx.lineWidth = 5 * s; ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke();
      ctx.strokeStyle = '#fff8'; ctx.lineWidth = 1.5 * s; ctx.beginPath(); ctx.moveTo(...a); ctx.lineTo(...b); ctx.stroke();
      if (t >= 14 && t < 20) { // rastro do corte
        ctx.strokeStyle = 'rgba(255,255,255,' + (1 - (t - 14) / 6) + ')'; ctx.lineWidth = 14 * s;
        const [ox, oy] = P(...jv.ombro); ctx.beginPath(); ctx.arc(ox, oy, 95 * s, -Math.PI / 2 - 0.2 * jv.d, jv.d > 0 ? 0.3 : Math.PI - 0.3, jv.d < 0); ctx.stroke();
      }
    }
    // sangue: corte na cabeça, chute, e o pescoço jorrando depois do soco
    const atras = -L.facing;
    if (t >= 18 && !cortou) { cortou = true; jorra(...jl.cabeca, 30, atras, 7); tremor = Math.max(tremor, 12); }
    if (t >= 18 && t < 30 && Math.random() < .6) jorra(...jl.cabeca, 1, atras, 4);
    if (t >= 30 && t < 33) jorra(jl.ombro[0], jl.ombro[1] - 25, 4, atras, 6);
    if (L.decapitado && !cabecaVoa) {
      const [x, y] = jl.ombro;
      cabecaVoa = { x, y: y + 24, vx: atras * 9, vy: 19, giro: 0, chao: false };
      jorra(x, y + 20, 40, atras, 10); tremor = Math.max(tremor, 28);
    }
    if (L.decapitado && t < 112) jorra(...jl.ombro, Math.random() < .7 ? 2 : 0, atras * 0.3, 9); // pescoço jorra
    // gotas
    ctx.fillStyle = '#b91c1c';
    for (let k = gotas.length - 1; k >= 0; k--) {
      const g = gotas[k];
      if (g.y > 0) { g.x += g.vx; g.y += g.vy; g.vy -= 1.2; } else { g.y = 0; g.vx = 0; }
      const [px, py] = P(g.x, g.y);
      ctx.beginPath(); ctx.ellipse(px, py, g.r * s * (g.y ? 1 : 2.4), g.r * s * (g.y ? 1 : .5), 0, 0, 7); ctx.fill();
    }
    if (gotas.length > 900) gotas.splice(0, gotas.length - 900);
    // cabeça voando, girando, quica e rola
    if (cabecaVoa) {
      const c = cabecaVoa;
      if (!c.chao) {
        c.x += c.vx; c.y += c.vy; c.vy -= 1.1; c.giro += 0.35 * Math.sign(c.vx);
        if (Math.random() < .8) gotas.push({ x: c.x, y: c.y, vx: c.vx * .3, vy: 0, r: 2 + Math.random() * 3 });
        if (c.y <= 18) { c.y = 18; c.vy = Math.abs(c.vy) * .4; c.vx *= .6; if (c.vy < 3) { c.vy = 0; c.chao = true; } }
      } else if (Math.abs(c.vx) > .2) { c.x += c.vx; c.giro += c.vx / 18; c.vx *= .93; }
      if (c.x < 0 || c.x > 800) { c.x = Math.max(0, Math.min(800, c.x)); c.vx *= -.5; }
      const [px, py] = P(c.x, c.y), blocos = st.perfis[ip] && st.perfis[ip].visual === 'blocos';
      ctx.translate(px, py); ctx.rotate(c.giro);
      ctx.fillStyle = CORES[ip];
      if (blocos) ctx.fillRect(-16 * s, -16 * s, 32 * s, 32 * s); else { ctx.beginPath(); ctx.arc(0, 0, 19 * s, 0, 7); ctx.fill(); }
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 3 * s; // olho em X
      ctx.beginPath(); ctx.moveTo(4 * s, -7 * s); ctx.lineTo(12 * s, 1 * s); ctx.moveTo(12 * s, -7 * s); ctx.lineTo(4 * s, 1 * s); ctx.stroke();
      ctx.fillStyle = '#b91c1c'; ctx.beginPath(); ctx.ellipse(0, 17 * s, 13 * s, 5 * s, 0, 0, 7); ctx.fill(); // pescoço cortado
    }
    ctx.restore();
  };
})();

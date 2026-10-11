// FATALITY do Blocos: punho vira pedra, soco na cabeça, a pedra cresce até virar uma rocha gigante,
// o braço gira e esmaga o inimigo. Quadros-chave em st.fatality.idade (ticks, 30/s). Server marca f.esmagado no tick 72.
(() => {
  const ativo = () => st && st.fatality && st.fatality.tipo === 'pedra';
  const IMPACTO = 72;

  const VENCEDOR = [
    [0, { b: 20, c: 60, tr: 5, ba: 6, p: [20, -20], j: [-25, -25] }],
    [12, { b: -40, c: 120, tr: -10 }], // punho virando pedra, braço engatilhado
    [16, { b: 95, c: 0, tr: 22 }], // soco na cabeça
    [24, { b: 95, c: 0, tr: 18 }],
    [40, { b: 25, c: 5, tr: 30, ba: 16, p: [35, -30], j: [-40, -35] }], // pedra gigante pesa, braço desce
    [52, { b: -90, c: 0, tr: -10, ba: 10 }], // gira: pra trás
    [62, { b: -180, c: 0, tr: -25 }], // por cima da cabeça
    [IMPACTO, { b: -300, c: 0, tr: 45, ba: 30, p: [55, -40], j: [-70, -40] }], // esmaga (= 60° na frente, embaixo)
    [100, { b: -300, c: 0, tr: 35, ba: 22 }],
  ];
  const PERDEDOR = [
    [14, { tr: 10, b: [10, -10], c: [40, 50], ba: 6, p: [12, -12], j: [-25, -20] }],
    [17, { tr: -35 }], // soco: cabeça pra trás
    [26, { tr: -10 }],
    [44, { tr: -18, b: [-20, -30], c: [60, 60] }], // olha pra pedra gigante, braços pra se proteger
    [66, { tr: -28, b: [150, 160], c: [30, 30], ba: 14 }], // mãos pra cima, agachando de medo
  ];
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
    if (!ativo()) return p;
    const t = st.fatality.idade;
    if (f.hp === 0) { if (t >= 14) aplica(p, PERDEDOR, t, false); }
    else aplica(p, VENCEDOR, t, true);
    return p;
  };
  pose = embrulha(pose); poseBlocos = embrulha(poseBlocos);
  // esmagado some (2D); no 3D o render3d esconde o grupo
  const bonecoAntes = boneco;
  boneco = function (f, ...r) { if (!f.esmagado) bonecoAntes(f, ...r); };

  function juntas(i, f) {
    const p = anim[i].cur; if (!p) return null;
    const sq = anim[i].squash || 0, d = f.facing;
    const vai = (o, ang, len) => [o[0] + Math.sin(ang * Math.PI / 180) * len * (1 + sq * 0.3), o[1] - Math.cos(ang * Math.PI / 180) * len * (1 - sq * 0.3)];
    const ombro = vai([0, (62 - p.baixa) * (1 - sq * 0.3)], 180 + p.tronco, 58);
    const cot = vai(ombro, p.bracoT[0], 30), m = vai(cot, p.bracoT[0] + p.cotovelo[0], 32);
    const W = q => [f.x + q[0] * d, f.y + q[1]];
    return { mao: W(m), ang: p.bracoT[0] + p.cotovelo[0], ombro: W(ombro), cabeca: W(vai(ombro, 180 + anim[i].cabeca, 24)), d };
  }
  // raio da pedra (mundo) no instante t
  const raio = t => t < 12 ? 6 + t * 0.4 : t < 24 ? 11 : t < 40 ? 11 + suave((t - 24) / 16) * 47 : 58;

  // rocha poligonal fixa (formato sorteado uma vez)
  const FORMA = Array.from({ length: 11 }, (_, k) => 0.82 + ((k * 37) % 11) / 11 * 0.3);
  function rocha(cx, cy, r, giro) {
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(giro);
    const pts = FORMA.map((m, k) => { const a = k / FORMA.length * Math.PI * 2; return [Math.cos(a) * r * m, Math.sin(a) * r * m]; });
    const g = ctx.createRadialGradient(-r * .35, -r * .35, r * .1, 0, 0, r * 1.1);
    g.addColorStop(0, '#a8a29e'); g.addColorStop(.6, '#57534e'); g.addColorStop(1, '#292524');
    ctx.fillStyle = g; ctx.strokeStyle = '#1c1917'; ctx.lineWidth = Math.max(1.5, r * .06);
    ctx.beginPath(); pts.forEach((q, k) => k ? ctx.lineTo(...q) : ctx.moveTo(...q)); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.lineWidth = Math.max(1, r * .035); // rachaduras
    ctx.beginPath(); ctx.moveTo(-r * .5, -r * .1); ctx.lineTo(-r * .1, r * .05); ctx.lineTo(r * .05, r * .4);
    ctx.moveTo(r * .2, -r * .55); ctx.lineTo(r * .3, -r * .15); ctx.lineTo(r * .55, -r * .05); ctx.stroke();
    ctx.restore();
  }

  let chave = null, socou = false, bateu = null, poeira = [], gotas = [], pedrasInic = [];
  const hudAntes = FAT.hud;
  FAT.hud = function (ctx_, vis, P, w, h, s, agora) {
    hudAntes.call(this, ctx_, vis, P, w, h, s, agora);
    if (!ativo()) { chave = null; return; }
    const t = st.fatality.idade, iv = st.fatality.quem, ip = 1 - iv;
    if (chave !== st.rodada) { chave = st.rodada; socou = false; bateu = null; poeira = []; gotas = []; pedrasInic = []; }
    const V = vis.p[iv], L = vis.p[ip], jv = juntas(iv, V), jl = juntas(ip, L);
    if (!jv || !jl) return;
    // escala de tela do mundo nesse ponto (vale pro 2D e pro 3D)
    const esc = (x, y) => { const a = P(x, y), b = P(x, y + 100); return Math.hypot(a[0] - b[0], a[1] - b[1]) / 100; };
    ctx.save();
    // pedrinhas se juntando no punho enquanto ele vira pedra
    if (t < 12 && Math.random() < .7) pedrasInic.push({ a: Math.random() * 7, d: 40, v: 2 + Math.random() * 2 });
    const r = raio(t);
    let centro;
    if (bateu) centro = bateu;
    else {
      const ar = jv.ang * Math.PI / 180;
      centro = [jv.mao[0] + Math.sin(ar) * r * 0.75 * jv.d, jv.mao[1] - Math.cos(ar) * r * 0.75];
    }
    // impacto: trava a pedra no chão em cima do inimigo
    if (t >= IMPACTO && !bateu) {
      bateu = [L.x, 52]; centro = bateu;
      tremor = Math.max(tremor, 45);
      for (let k = 0; k < 70; k++) gotas.push({ x: L.x + (Math.random() - .5) * 60, y: 6, vx: (Math.random() - .5) * 26, vy: 4 + Math.random() * 16, r: 2 + Math.random() * 5 });
      for (let k = 0; k < 40; k++) poeira.push({ x: L.x + (Math.random() - .5) * 110, y: 4, vx: (Math.random() - .5) * 10, vy: Math.random() * 4, r: 10 + Math.random() * 18, vida: 1 });
    }
    if (t >= 16 && !socou) { // soco de pedra na cabeça
      socou = true; tremor = Math.max(tremor, 14);
      for (let k = 0; k < 18; k++) gotas.push({ x: jl.cabeca[0], y: jl.cabeca[1], vx: -L.facing * (2 + Math.random() * 7) + (Math.random() - .5) * 4, vy: 3 + Math.random() * 8, r: 2 + Math.random() * 3 });
    }
    // depois do impacto: poça e membros achatados saindo debaixo da pedra
    if (bateu) {
      const [px, py] = P(L.x, 0), k = esc(L.x, 0), u = Math.min(1, (t - IMPACTO) / 10);
      ctx.fillStyle = '#7f1d1d'; ctx.beginPath(); ctx.ellipse(px, py, (60 + 70 * u) * k, (8 + 6 * u) * k, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#b91c1c'; ctx.beginPath(); ctx.ellipse(px, py, (45 + 50 * u) * k, (5 + 4 * u) * k, 0, 0, 7); ctx.fill();
      ctx.strokeStyle = CORES[ip]; ctx.lineCap = 'round'; ctx.lineWidth = 8 * k;
      for (const [ang, len] of [[-0.15, 95], [0.2, 90], [3.0, 85], [3.3, 80]]) {
        ctx.beginPath(); ctx.moveTo(px + Math.cos(ang) * 40 * k, py); ctx.lineTo(px + Math.cos(ang) * len * k, py - Math.sin(ang) * 6 * k); ctx.stroke();
      }
    }
    // rastro do giro
    if (t >= 44 && t < IMPACTO) {
      const [ox, oy] = P(...jv.ombro), k = esc(...jv.ombro);
      ctx.strokeStyle = 'rgba(214,211,209,.35)'; ctx.lineWidth = r * 1.2 * k;
      const ar = (jv.ang - 90) * Math.PI / 180;
      ctx.beginPath(); ctx.arc(ox, oy, (62 + r * .75) * k, jv.d > 0 ? ar - .9 : Math.PI - ar, jv.d > 0 ? ar : Math.PI - ar + .9); ctx.stroke();
    }
    // a pedra
    const [cx, cy] = P(...centro), k = esc(...centro);
    for (let n = pedrasInic.length - 1; n >= 0; n--) { // pedrinhas convergindo
      const q = pedrasInic[n]; q.d -= q.v; if (q.d <= 0) { pedrasInic.splice(n, 1); continue; }
      ctx.fillStyle = '#78716c'; ctx.fillRect(cx + Math.cos(q.a) * q.d * k - 2 * k, cy + Math.sin(q.a) * q.d * k - 2 * k, 4 * k, 4 * k);
    }
    rocha(cx, cy, r * k, bateu ? 0.4 : jv.ang * Math.PI / 180 * jv.d);
    // gotas e poeira
    ctx.fillStyle = '#b91c1c';
    for (const g of gotas) {
      if (g.y > 0) { g.x += g.vx; g.y += g.vy; g.vy -= 1.2; } else { g.y = 0; g.vx = 0; }
      const [gx, gy] = P(g.x, g.y), kk = esc(g.x, g.y);
      ctx.beginPath(); ctx.ellipse(gx, gy, g.r * kk * .6 * (g.y ? 1 : 2.4), g.r * kk * .6 * (g.y ? 1 : .5), 0, 0, 7); ctx.fill();
    }
    for (const q of poeira) {
      q.x += q.vx; q.y += q.vy; q.vx *= .95; q.r *= 1.015; q.vida -= .012;
      if (q.vida <= 0) continue;
      const [qx, qy] = P(q.x, q.y), kk = esc(q.x, q.y);
      ctx.fillStyle = 'rgba(168,162,158,' + q.vida * .5 + ')'; ctx.beginPath(); ctx.arc(qx, qy, q.r * kk, 0, 7); ctx.fill();
    }
    ctx.restore();
  };
})();

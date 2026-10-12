// Fatality do Bob: dois latidos de energia, o rival levita e uma espiral de patas e pelos explode no impacto.
(() => {
  const ativo = () => st && st.fatality && st.fatality.tipo === 'bob';
  const poseBob = pose;
  pose = function (f, a, tempo) {
    const p = poseBob(f, a, tempo);
    if (!ativo() || f.hp > 0) return p;
    const t = st.fatality.idade;
    if (t >= 24 && t < 42) {
      const sobe = Math.sin(Math.max(0, Math.min(1, (t - 24) / 18)) * Math.PI);
      p.baixa -= sobe * 22; p.tronco -= sobe * 28;
      p.bracoT = [-50 - sobe * 35, -55 - sobe * 30]; p.cotovelo = [15, 15];
      p.perna = [20, -20]; p.joelho = [-18, -18];
    }
    return p;
  };

  let rodada = null, latidoSuper = false, impacto = false, pelos = [];
  const hudAntes = FAT.hud;
  FAT.hud = function (ctx_, vis, P, w, h, s, agora) {
    hudAntes.call(this, ctx_, vis, P, w, h, s, agora);
    if (!ativo()) { rodada = null; return; }
    const fat = st.fatality, t = fat.idade, V = vis.p[fat.quem], L = vis.p[1 - fat.quem];
    if (rodada !== st.rodada) { rodada = st.rodada; latidoSuper = impacto = false; pelos = []; }
    if (t >= 24 && !latidoSuper) latidoSuper = true; // o estado furacaoBob dispara o som no animador do lutador
    if (t >= 42 && !impacto) { impacto = true; tremor = Math.max(tremor, 36); }

    const escala = (x, y) => { const a = P(x, y), b = P(x, y + 100); return Math.hypot(a[0] - b[0], a[1] - b[1]) / 100; };
    ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    // O latido vira ondas brancas que atravessam a arena até o rival.
    if (t >= 12 && t < 34) {
      const progresso = Math.max(0, Math.min(1, (t - 12) / 18));
      for (let n = 0; n < 5; n++) {
        const u = Math.max(0, Math.min(1, progresso - n * .11));
        const x = V.x + (L.x - V.x) * u, y = 104 + Math.sin(u * Math.PI) * 26;
        const [px, py] = P(x, y), k = escala(x, y), r = (14 + ((agora / 18 + n * 13) % 26)) * k;
        ctx.globalAlpha = (1 - n * .14) * Math.max(.15, 1 - progresso * .45);
        ctx.strokeStyle = n % 2 ? '#bae6fd' : '#fff'; ctx.lineWidth = 5 * k;
        ctx.beginPath(); ctx.arc(px, py, r, -1.2, 1.2); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.font = 'italic 900 ' + 38 * s + 'px Audiowide, Impact, system-ui';
      ctx.lineWidth = 6 * s; ctx.strokeStyle = '#172033'; ctx.strokeText('AU! AU!', w / 2, h * .25);
      ctx.fillStyle = '#fff'; ctx.fillText('AU! AU!', w / 2, h * .25);
    }
    // Patinhas giram em espiral enquanto Bob dispara o latido final.
    if (t >= 24 && t < 46) {
      if (Math.random() < .3) pelos.push({ a: Math.random() * Math.PI * 2, r: 30 + Math.random() * 65, y: 20 + Math.random() * 120, vida: 1, tam: 5 + Math.random() * 5 });
      pelos = pelos.filter(q => (q.vida -= .018) > 0);
      for (const q of pelos) {
        q.a += .08; q.r += .4;
        const x = V.x + Math.cos(q.a) * q.r, y = q.y + (t - 24) * 2.2 + Math.sin(q.a * 2) * 5;
        const [px, py] = P(x, y), k = escala(x, y), r = q.tam * k;
        ctx.globalAlpha = q.vida * (1 - Math.max(0, t - 42) / 4); ctx.fillStyle = q.tam > 8 ? '#f9a8d4' : '#fffdf8';
        ctx.beginPath(); ctx.ellipse(px, py + r * .18, r * .55, r * .4, 0, 0, 7); ctx.fill();
        for (const [dx, dy] of [[-1, -.55], [-.35, -1], [.35, -1], [1, -.55]]) { ctx.beginPath(); ctx.arc(px + dx * r * .42, py + dy * r * .55, r * .22, 0, 7); ctx.fill(); }
      }
    }
    ctx.restore();
  };
})();

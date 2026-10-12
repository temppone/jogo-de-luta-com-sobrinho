// FINISH HIM / FATALITY: visuais (2D e 3D). Estado vem do server: st.finish, st.finishResta, st.fatality {quem, idade(ticks)}, f.explodiu, f.acao==='tonto'
(() => {
  const pedacos = []; let explodiuEm = null, ultimoFat = null;

  // perdedor cambaleando atordoado (embrulha pose sem mexer nela)
  const poseOrig = pose;
  pose = function (f, a, tempo) {
    const p = poseOrig(f, a, tempo);
    if (f.acao === 'tonto') {
      const o = Math.sin(tempo / 260);
      p.tronco = 14 + o * 16; p.baixa = 8 + Math.abs(o) * 6;
      p.bracoT = [10 + o * 25, -10 + o * 25]; p.cotovelo = [40, 50];
      p.perna = [12 + o * 10, -12 + o * 10]; p.joelho = [-25, -20];
    }
    return p;
  };
  // corpo explodido some (2D)
  const bonecoOrig = boneco;
  boneco = function (f, ...r) { if (!f.explodiu) bonecoOrig(f, ...r); };
  // zoom lento no 2D durante o FINISH HIM / FATALITY
  const cenarioOrig = cenario;
  cenario = function (w, h, s, X, Y, t) {
    if (st && (st.finish || st.fatality) && st.p) {
      const prog = st.fatality ? 1 : Math.min(1, (5 - st.finishResta) / 2.5);
      const z = 1 + 0.35 * prog, cx = X((st.p[0].x + st.p[1].x) / 2), cy = Y(80);
      ctx.translate(cx, cy); ctx.scale(z, z); ctx.translate(-cx, -cy);
    }
    cenarioOrig(w, h, s, X, Y, t);
  };
  // 3D: esconde o explodido (joga pra baixo do chão)
  (function liga3d() {
    if (!window.R3D) return setTimeout(liga3d, 200);
    const fr = R3D.frame;
    R3D.frame = function (vis, js, perfis, t, tr) {
      if (vis.p.some(f => f.explodiu)) vis = { ...vis, p: vis.p.map(f => f.explodiu ? { ...f, y: -5000 } : f) };
      return fr.call(this, vis, js, perfis, t, st && st.fatality ? Math.max(tr, 6) : tr);
    };
  })();

  function explode(f, P, s) {
    const [x, y] = P(f.x, f.y + 90);
    for (let n = 0; n < 70; n++) {
      const a = Math.random() * Math.PI * 2, v = (4 + Math.random() * 14) * s;
      pedacos.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 10 * s, r: (n < 12 ? 10 + Math.random() * 10 : 3 + Math.random() * 5) * s, osso: n < 12, rot: Math.random() * 6, vr: Math.random() - .5, cor: n < 12 ? CORES[st.p.indexOf(f)] : (Math.random() < .5 ? '#b91c1c' : '#7f1d1d'), chao: y + 90 * s });
    }
    tremor = 30;
  }
  function textoGrande(txt, cor, y, tam, w, s, esc = 1) {
    ctx.font = 'italic 900 ' + tam * s * esc + 'px Audiowide, Impact, system-ui'; ctx.textAlign = 'center';
    ctx.lineWidth = 10 * s; ctx.strokeStyle = '#000'; ctx.strokeText(txt, w / 2, y);
    ctx.fillStyle = cor; ctx.fillText(txt, w / 2, y);
  }

  window.FAT = {
    hud(ctx_, vis, P, w, h, s, agora) {
      if (!st) return;
      const fat = st.fatality;
      if (!st.finish && !fat && !pedacos.length) { explodiuEm = null; return; }
      if (fat && ultimoFat !== fat.quem + ':' + st.rodada) { ultimoFat = fat.quem + ':' + st.rodada; explodiuEm = null; pedacos.length = 0; }
      const perd = vis.p.find(f => f.explodiu);
      if (perd && explodiuEm === null) { explodiuEm = agora; explode(perd, P, s); }
      ctx.save();
      if (fat) { // tela escurece
        const ini = fat.tipo === 'espada' ? 62 : fat.tipo === 'pedra' ? 72 : fat.tipo === 'capoeira' ? 66 : fat.tipo === 'ancestral' ? 76 : fat.tipo === 'brutal' ? 7 : 0; ctx.fillStyle = 'rgba(0,0,0,' + Math.min(fat.idade < ini ? 0.3 : 0.75, Math.max(0, fat.idade - ini) / 16 + (ini ? 0.3 : 0)) + ')'; ctx.fillRect(0, 0, w, h);
      }
      // pedaços e sangue
      for (const p of pedacos) {
        p.vy += 0.6 * s; p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        if (p.y > p.chao) { p.y = p.chao; p.vy *= -0.3; p.vx *= 0.7; }
        ctx.fillStyle = p.cor;
        if (p.osso) { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillRect(-p.r, -p.r / 2.5, p.r * 2, p.r / 1.25); ctx.restore(); }
        else { ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill(); }
      }
      if (!st.finish && !fat) pedacos.length = 0;
      // flash branco na explosão
      if (explodiuEm !== null && agora - explodiuEm < 350) { ctx.fillStyle = 'rgba(255,255,255,' + (1 - (agora - explodiuEm) / 350) + ')'; ctx.fillRect(0, 0, w, h); }
      if (fat) {
        const tx = fat.tipo === 'espada' ? 66 : fat.tipo === 'pedra' ? 78 : fat.tipo === 'capoeira' ? 70 : fat.tipo === 'ancestral' ? 80 : fat.tipo === 'brutal' ? 10 : 14; if (fat.idade > tx) textoGrande(fat.tipo === 'brutal' ? 'BRUTALITY' : 'FATALITY', '#dc2626', h * 0.22, 96, w, s, 1 + 0.4 * Math.exp(-(fat.idade - tx) / 6));
      } else if (st.finish) {
        const pisca = Math.floor(agora / 250) % 2;
        textoGrande('FINISH HIM!', pisca ? '#facc15' : '#ef4444', h * 0.3, 70, w, s);
        ctx.font = 'bold ' + 18 * s + 'px Orbitron, system-ui'; ctx.fillStyle = '#fff';
        ctx.fillText('Perto do inimigo: TRÁS, FRENTE, BAIXO + SOCO ALTO  ·  ' + Math.ceil(st.finishResta) + 's', w / 2, h * 0.3 + 34 * s);
      }
      ctx.restore();
    },
  };
})();

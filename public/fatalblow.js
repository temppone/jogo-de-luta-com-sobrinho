// FATAL BLOW (estilo Mortal Kombat 11): aviso "pronto" embaixo da barra de vida e a cena cinematográfica.
// Estado vem do server: f.fatalPronto, st.fatalUsado[i], st.fatalBlow {quem, idade(ticks), batidas[]}
(() => {
  let ultimaBatida = -1, ultimoFb = null, flash = 0;

  // zoom no 2D durante a cena, centrado no atacante
  const cenarioOrig = cenario;
  cenario = function (w, h, s, X, Y, t) {
    const fb = st && st.fatalBlow;
    if (fb && st.p) {
      const u = Math.min(1, fb.idade / 6), z = 1 + 0.45 * u, cx = X((st.p[0].x + st.p[1].x) / 2), cy = Y(90);
      ctx.translate(cx, cy); ctx.scale(z, z); ctx.translate(-cx, -cy);
    }
    cenarioOrig(w, h, s, X, Y, t);
  };

  function texto(txt, x, y, tam, cor, s, esc = 1, contorno = '#000') {
    ctx.font = 'italic 900 ' + tam * s * esc + 'px Audiowide, Impact, system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.lineWidth = 9 * s; ctx.strokeStyle = contorno; ctx.strokeText(txt, x, y);
    ctx.fillStyle = cor; ctx.fillText(txt, x, y);
  }

  window.FB = {
    hud(vis, w, h, s, ox, agora) {
      if (!st || !st.p) return;
      ctx.save();
      // selo "FATAL BLOW" embaixo da barra de quem pode usar (piscando, como no MK11)
      const by = 14 * s + 26 * s + 34 * s;
      vis.p.forEach((f, i) => {
        if (!st.p[i] || !st.p[i].fatalPronto) return;
        const x = i === 0 ? ox + 20 * s + 150 * s : ox + 780 * s - 150 * s;
        const brilho = 0.6 + 0.4 * Math.sin(agora / 140);
        ctx.globalAlpha = brilho;
        ctx.font = 'italic 900 ' + 15 * s + 'px Audiowide, Impact, system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 4 * s; ctx.strokeStyle = '#000'; ctx.strokeText('FATAL BLOW', x, by);
        ctx.fillStyle = '#fbbf24'; ctx.fillText('FATAL BLOW', x, by);
        ctx.globalAlpha = 1;
        if (i === +eu || modoLocal || (modoIA && i === 0)) {
          ctx.font = 'bold ' + 10 * s + 'px Orbitron, system-ui'; ctx.fillStyle = '#fff';
          ctx.fillText('SOCO ALTO + CHUTE ALTO', x, by + 15 * s);
        }
      });

      const fb = st.fatalBlow;
      if (!fb) { ultimaBatida = -1; ultimoFb = null; return ctx.restore(); }
      if (ultimoFb !== fb.quem + ':' + st.rodada) { ultimoFb = fb.quem + ':' + st.rodada; ultimaBatida = -1; }
      const id = fb.idade;
      // tela escurece com vinheta vermelha e faixas de cinema
      const esc = Math.min(1, id / 5);
      const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, w * 0.7);
      g.addColorStop(0, 'rgba(0,0,0,' + 0.25 * esc + ')'); g.addColorStop(1, 'rgba(90,0,0,' + 0.75 * esc + ')');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      const faixa = h * 0.1 * esc;
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, faixa); ctx.fillRect(0, h - faixa, w, faixa);
      // cada golpe: flash branco, tremor e pausa curta (hitstop)
      for (const b of fb.batidas) if (id >= b && ultimaBatida < b) {
        ultimaBatida = b; flash = agora;
        const final = b === fb.batidas[fb.batidas.length - 1];
        if (opc.tremor) tremor = final ? 32 : 20;
        parada = final ? 180 : 90;
        if (opc.vibrar && navigator.vibrate) navigator.vibrate(final ? 200 : 80);
      }
      if (flash && agora - flash < 160) { ctx.fillStyle = 'rgba(255,255,255,' + 0.8 * (1 - (agora - flash) / 160) + ')'; ctx.fillRect(0, 0, w, h); }
      // título
      if (id < 30) texto('FATAL BLOW', w / 2, h * 0.24, 80, '#fbbf24', s, 1 + 0.5 * Math.exp(-id / 4), '#7f1d1d');
      else texto('FATAL BLOW', w / 2, faixa / 2 + 4 * s, 28, '#fbbf24', s);
      ctx.restore();
    },
  };
})();

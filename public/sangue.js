// SANGUE estilo MK: jatos de gotas no golpe que acerta (sem defesa) e poças no chão até o fim do round.
// Embrulha atualizaAnim(vis, dt, P, s) do jogo.js; funciona em 2D e 3D porque usa a projeção P.
(() => {
  if (typeof atualizaAnim !== 'function') return;
  const orig = atualizaAnim;
  let gotas = [], pocas = [], hps = [];
  const MAX_POCAS = 60;
  window.atualizaAnim = atualizaAnim = function (vis, dt, P, s) {
    vis.p.forEach((f, i) => {
      const antes = hps[i]; hps[i] = f.hp;
      if (antes == null) return;
      if (f.hp > antes) { gotas = []; pocas = []; return; } // round novo: limpa o chão
      const perda = antes - f.hp;
      if (perda <= 0 || f.acao === 'defesa' || opc.sangue === false) return;
      const forte = perda > 1, n = forte ? 14 + Math.min(26, perda * 2) : 7;
      const dir = -f.facing; // voa para longe de quem bateu
      const x0 = f.x - f.facing * 15, y0 = f.y + (f.agachado ? 50 : 95);
      for (let k = 0; k < n; k++) gotas.push({
        x: x0, y: y0, vx: dir * (2 + Math.random() * (forte ? 11 : 6)) + (Math.random() - .5) * 3,
        vy: 2 + Math.random() * (forte ? 10 : 6), r: 2 + Math.random() * (forte ? 4 : 2.5)
      });
    });
    const k = dt / 33, c = ctx;
    // poças (embaixo das gotas)
    for (const p of pocas) {
      p.cresce = Math.min(1, p.cresce + dt / 250);
      const [px, py] = P(p.x, 0), [qx] = P(p.x + p.r, 0);
      const rx = Math.max(1, Math.abs(qx - px)) * p.cresce;
      c.globalAlpha = p.a; c.fillStyle = '#6b0000';
      c.beginPath(); c.ellipse(px, py, rx, rx * 0.28, 0, 0, 7); c.fill();
      c.globalAlpha = p.a * 0.6; c.fillStyle = '#a30d0d';
      c.beginPath(); c.ellipse(px - rx * .2, py - rx * .05, rx * .5, rx * .12, 0, 0, 7); c.fill();
      p.a = Math.max(0.25, p.a - dt / 40000); // desbota devagar
    }
    gotas = gotas.filter(g => {
      g.x += g.vx * k; g.y += g.vy * k; g.vy -= 0.9 * k;
      if (g.y <= 0) { // caiu: vira mancha
        const perto = pocas.find(p => Math.abs(p.x - g.x) < 10);
        if (perto) perto.r = Math.min(40, perto.r + g.r * 0.5);
        else { pocas.push({ x: g.x, r: g.r * 2.2, a: 0.85, cresce: 0 }); if (pocas.length > MAX_POCAS) pocas.shift(); }
        return false;
      }
      const [px, py] = P(g.x, g.y), [qx, qy] = P(g.x - g.vx * 0.8, g.y - g.vy * 0.8);
      c.globalAlpha = 1; c.strokeStyle = '#b10000'; c.lineCap = 'round'; c.lineWidth = g.r * s;
      c.beginPath(); c.moveTo(qx, qy); c.lineTo(px, py); c.stroke();
      c.fillStyle = '#e01010'; c.beginPath(); c.arc(px, py, g.r * s * 0.6, 0, 7); c.fill();
      return true;
    });
    c.globalAlpha = 1;
    if (gotas.length > 400) gotas.splice(0, gotas.length - 400);
    return orig.apply(this, arguments);
  };
})();

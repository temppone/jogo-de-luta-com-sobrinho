// Contador de FPS na tela: abra com ?fps na URL (ex.: /?fps)
if (new URLSearchParams(location.search).has('fps')) {
  const el = document.createElement('div');
  el.style.cssText = 'position:fixed;top:4px;left:4px;z-index:99999;padding:2px 6px;background:rgba(0,0,0,.7);color:#0f0;font:bold 14px monospace;pointer-events:none;white-space:pre';
  document.body.appendChild(el);
  let quadros = [], ant = performance.now();
  (function quadro(t) {
    quadros.push(t - ant); ant = t;
    requestAnimationFrame(quadro);
  })(ant);
  setInterval(() => {
    const q = quadros.splice(0).sort((a, b) => a - b);
    if (!q.length) return;
    const pior = q[q.length - 1];
    el.textContent = `${q.length} FPS  pior ${pior.toFixed(0)}ms  ${innerWidth}x${innerHeight}@${devicePixelRatio}`;
    el.style.color = q.length >= 50 ? '#0f0' : q.length >= 30 ? '#ff0' : '#f44';
  }, 1000);
}

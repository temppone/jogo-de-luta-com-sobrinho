// Menu inicial em duas etapas: primeiro escolhe o modo, depois só aparecem as opções daquele modo.
// O modo fica em #escolha[data-modo]; o CSS (style.css) mostra/esconde as partes de cada um.
(() => {
  const esc = document.querySelector('#escolha');
  if (!esc) return;
  const $ = s => esc.querySelector(s);
  const times = $('.bt[data-p]'); if (times) times.parentElement.classList.add('times');
  const modos = [...esc.querySelectorAll('#modos .mbt')];
  const tit = document.createElement('div'); tit.id = 'modoTit'; esc.appendChild(tit);
  const TITULOS = { sim: 'SIMULAÇÃO<small>escolha os lutadores, a dificuldade e o cenário</small>' };

  function setModo(m) {
    if (m) esc.dataset.modo = m; else delete esc.dataset.modo;
    tit.innerHTML = TITULOS[m] || '';
    if (!m) setTimeout(() => (modos.find(b => b.dataset.modo === ultimo) || modos[0]).focus(), 0);
  }
  let ultimo = sessionStorage.getItem('modo') || 'ia';
  modos.forEach(b => b.onclick = () => {
    const m = b.dataset.modo;
    if (m === 'golpes') return esc.classList.add('verGuia');
    ultimo = m; sessionStorage.setItem('modo', m); setModo(m);
    if (m === 'local') $('#local').click(); // selecao.js entra na escolha de lado/lutador
  });
  $('#modoVolta').onclick = () => setModo(null);
  // saiu do modo local (Esc na escolha de lado ou a luta começou): volta pro menu de modos
  new MutationObserver(() => { if (esc.dataset.modo === 'local' && !esc.classList.contains('local')) setModo(null); })
    .observe(esc, { attributes: true, attributeFilter: ['class'] });
  let estavaOculto = esc.classList.contains('hide');
  new MutationObserver(() => {
    const oculto = esc.classList.contains('hide');
    if (estavaOculto && !oculto && !esc.classList.contains('local')) setModo(null);
    estavaOculto = oculto;
  })
    .observe(esc, { attributes: true, attributeFilter: ['class'] });

  // cenário (vale pra simulação e 1 x IA; o render3d.js lê do sessionStorage)
  const cen = [...esc.querySelectorAll('#cenarioBox .bt')];
  const marcaCen = () => { const c = sessionStorage.getItem('cenario') || 'neon'; cen.forEach(b => b.classList.toggle('sel', b.dataset.c === c)); };
  cen.forEach(b => b.onclick = () => { sessionStorage.setItem('cenario', b.dataset.c); marcaCen(); });
  marcaCen();

  // teclado: ▲ ▼ navega nos modos, Enter escolhe, Esc volta (document roda antes do listener de window do selecao.js)
  const visivel = () => !esc.classList.contains('hide') && !esc.classList.contains('verGuia');
  function navega(d) { const i = modos.indexOf(document.activeElement); modos[(i + d + modos.length) % modos.length].focus(); }
  document.addEventListener('keydown', e => {
    if (!visivel()) return;
    const k = e.key;
    if (!esc.dataset.modo) {
      if (k === 'ArrowDown' || k === 's') { e.preventDefault(); navega(1); }
      else if (k === 'ArrowUp' || k === 'w') { e.preventDefault(); navega(-1); }
      else if ((k === 'Enter' || k === ' ') && !modos.includes(document.activeElement)) { e.preventDefault(); navega(0); }
    } else if ((k === 'Escape' || k === 'Backspace') && esc.dataset.modo !== 'local') { e.preventDefault(); setModo(null); }
  });
  // controle no menu de modos: direcional navega, A escolhe, B volta
  let ant = {};
  (function pad() {
    requestAnimationFrame(pad);
    const g = navigator.getGamepads ? [...navigator.getGamepads()].find(Boolean) : null;
    if (!g) return;
    const bt = i => g.buttons[i] && g.buttons[i].pressed, ay = g.axes[1] || 0;
    const ag = { cima: bt(12) || ay < -0.6, baixo: bt(13) || ay > 0.6, ok: bt(0) || bt(9), volta: bt(1) };
    const novo = k => ag[k] && !ant[k];
    if (visivel() && !esc.dataset.modo) {
      if (novo('cima')) navega(-1); if (novo('baixo')) navega(1);
      if (novo('ok')) (modos.includes(document.activeElement) ? document.activeElement : modos[0]).click();
    } else if (visivel() && novo('volta') && esc.dataset.modo !== 'local') setModo(null);
    ant = ag;
  })();

  setModo(null);
})();

// Efeitos 3D dos itens elementais (fogo, gelo, raio, vento): o item caindo do céu como meteoro,
// os poderes andando pela arena e o que fica no lutador (chamas, bloco de gelo, queimadura).
// Tudo é só visual; quem decide acerto e dano é o servidor.
import * as THREE from '/vendor/three.module.min.js';

export const ELEMENTOS = ['fogo', 'gelo', 'raio', 'vento', 'lendario'];
const COR = { fogo: 0xff6a1a, gelo: 0x7fe3ff, raio: 0xffe45e, vento: 0x9cffd9, lendario: 0xd879ff };
const RAIO_CICLO = 26, RAIO_AVISO = 17; // iguais ao servidor
const GOLPE = /^(soco|chute|gancho|rasteira|giro|voadora|martelada)/;

export function criaElementos(scene, texBrilho) {
  const aleat = (a, b) => a + Math.random() * (b - a);

  // ---------- partículas: pool de sprites somados (brilho) e normais (fumaça) ----------
  const texFumaca = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, '#ffffffaa'); gr.addColorStop(0.5, '#ffffff44'); gr.addColorStop(1, '#ffffff00');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
  })();
  const texFloco = (() => { // floco de neve de 6 pontas
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'); g.strokeStyle = '#fff'; g.lineWidth = 4; g.lineCap = 'round'; g.translate(32, 32);
    for (let k = 0; k < 6; k++) { g.rotate(Math.PI / 3); g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -26); g.moveTo(0, -15); g.lineTo(-8, -22); g.moveTo(0, -15); g.lineTo(8, -22); g.stroke(); }
    return new THREE.CanvasTexture(c);
  })();
  const pool = [];
  function particula(o) {
    let p = pool.find(q => !q.viva);
    if (!p) {
      if (pool.length >= 700) return;
      p = { sp: new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false })) };
      scene.add(p.sp); pool.push(p);
    }
    const m = p.sp.material, tex = o.tex === 'fumaca' ? texFumaca : o.tex === 'floco' ? texFloco : texBrilho;
    if (m.map !== tex) { m.map = tex; m.needsUpdate = true; }
    m.blending = o.tex === 'fumaca' ? THREE.NormalBlending : THREE.AdditiveBlending;
    m.color.set(o.cor); m.rotation = Math.random() * 6;
    Object.assign(p, { viva: true, x: o.x, y: o.y, z: o.z || 0, vx: o.vx || 0, vy: o.vy || 0, vz: o.vz || 0, g: o.g || 0, atrito: o.atrito ?? 0.98,
      vida: 0, dur: o.dur, t0: o.tam, t1: o.tam1 ?? o.tam * 0.2, op: o.op ?? 1, gira: o.gira || 0, cor1: o.cor1 !== undefined ? new THREE.Color(o.cor1) : null, cor0: new THREE.Color(o.cor) });
    p.sp.visible = true;
  }
  function animaParticulas(dt) {
    const k = dt / 33;
    for (const p of pool) {
      if (!p.viva) continue;
      p.vida += dt;
      const u = p.vida / p.dur;
      if (u >= 1) { p.viva = false; p.sp.visible = false; continue; }
      p.vy += p.g * k; const f = Math.pow(p.atrito, k); p.vx *= f; p.vy *= f; p.vz *= f;
      p.x += p.vx * k; p.y += p.vy * k; p.z += p.vz * k;
      if (p.y < 1) { p.y = 1; p.vy *= -0.3; }
      p.sp.position.set(p.x, p.y, p.z);
      const tam = p.t0 + (p.t1 - p.t0) * u; p.sp.scale.set(tam, tam, 1);
      p.sp.material.opacity = p.op * (u < 0.15 ? u / 0.15 : 1 - (u - 0.15) / 0.85);
      p.sp.material.rotation += p.gira * k;
      if (p.cor1) p.sp.material.color.copy(p.cor0).lerp(p.cor1, u);
    }
  }
  const brilhoS = (cor, tam, op = 1) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texBrilho, color: cor, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false }));
    s.scale.set(tam, tam, 1); return s;
  };
  const basico = (cor, op = 1, extra = {}) => new THREE.MeshBasicMaterial({ color: cor, transparent: op < 1, opacity: op, depthWrite: op >= 1, ...extra });

  // ondas de choque no chão (anel que abre e some)
  const ondas = [];
  function onda(x, cor, tam, dur = 450, z = 0) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.75, 1, 48), basico(cor, 0.9, { blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, 2, z); scene.add(m);
    ondas.push({ m, tam, dur, vida: 0 });
  }
  // raio em zigue-zague de a até b (com galhos); devolve o grupo
  function zigue(a, b, larg, desvio, galhos) {
    const g = new THREE.Group(), pts = [a.clone()], n = 12;
    for (let i = 1; i < n; i++) {
      const p = a.clone().lerp(b, i / n);
      p.x += aleat(-desvio, desvio); p.z += aleat(-desvio, desvio) * 0.5; pts.push(p);
    }
    pts.push(b.clone());
    const curva = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.1);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curva, 48, larg, 5), basico(0xffffff)));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curva, 48, larg * 4, 6), basico(0xffe45e, 0.35, { blending: THREE.AdditiveBlending })));
    g.add(new THREE.Mesh(new THREE.TubeGeometry(curva, 48, larg * 10, 6), basico(0x9a7bff, 0.12, { blending: THREE.AdditiveBlending })));
    for (let k = 0; k < galhos; k++) {
      const i = 2 + Math.floor(Math.random() * (n - 4)), ini = pts[i];
      const fim = ini.clone().add(new THREE.Vector3(aleat(-70, 70), -aleat(30, 90), aleat(-20, 20)));
      g.add(zigue(ini, fim, larg * 0.5, desvio * 0.5, 0));
    }
    return g;
  }
  const descarta = o => o.traverse(m => { if (m.geometry) m.geometry.dispose(); if (m.material) m.material.dispose(); });

  // ---------- itens elementais caindo ----------
  function criaItem(tipo) {
    const g = new THREE.Group(), cor = COR[tipo], it = { g, tipo, giro: [] };
    const corpo = new THREE.Group(); g.add(corpo); it.corpo = corpo;
    if (tipo === 'fogo') {
      const nucleo = new THREE.Mesh(new THREE.IcosahedronGeometry(9, 1), basico(0xfff2b0)); corpo.add(nucleo);
      const casca = new THREE.Mesh(new THREE.IcosahedronGeometry(14, 0), basico(0xff4d00, 0.55, { blending: THREE.AdditiveBlending, wireframe: false }));
      corpo.add(casca); it.giro.push([casca, 0.03, 0.05]);
      // labaredas: cones girando em volta
      for (let k = 0; k < 6; k++) {
        const c = new THREE.Mesh(new THREE.ConeGeometry(4, 16, 6), basico(k % 2 ? 0xffb020 : 0xff3d00, 0.8, { blending: THREE.AdditiveBlending }));
        const piv = new THREE.Group(); piv.rotation.z = k * Math.PI / 3; c.position.y = 15; piv.add(c); corpo.add(piv);
      }
      it.giro.push([corpo, 0, 0.04, 0.06]);
    }
    if (tipo === 'gelo') {
      const cristal = new THREE.Mesh(new THREE.OctahedronGeometry(14, 0), new THREE.MeshStandardMaterial({ color: 0xbdf3ff, emissive: 0x2aa8d8, emissiveIntensity: 0.7, metalness: 0.2, roughness: 0.05, transparent: true, opacity: 0.85, flatShading: true }));
      cristal.scale.y = 1.5; corpo.add(cristal); it.giro.push([cristal, 0, 0.05]);
      const miolo = brilhoS(0xdff9ff, 26); corpo.add(miolo);
      it.orb = [];
      for (let k = 0; k < 5; k++) { // lascas orbitando
        const l = new THREE.Mesh(new THREE.TetrahedronGeometry(3.5), new THREE.MeshStandardMaterial({ color: 0xe6fbff, emissive: 0x5fd8ff, emissiveIntensity: 0.6, flatShading: true }));
        corpo.add(l); it.orb.push(l);
      }
    }
    if (tipo === 'raio') {
      const nucleo = new THREE.Mesh(new THREE.SphereGeometry(9, 16, 12), basico(0xfffbe0)); corpo.add(nucleo);
      const anel = new THREE.Mesh(new THREE.TorusGeometry(16, 1.4, 6, 32), basico(0xffe45e, 0.9, { blending: THREE.AdditiveBlending }));
      corpo.add(anel); it.giro.push([anel, 0.07, 0.05]);
      const anel2 = anel.clone(); anel2.rotation.x = Math.PI / 2; corpo.add(anel2); it.giro.push([anel2, 0.05, -0.08]);
      it.faisca = new THREE.Group(); corpo.add(it.faisca); it.proxFaisca = 0;
    }
    if (tipo === 'vento') {
      it.aneis = [];
      for (let k = 0; k < 4; k++) {
        const a = new THREE.Mesh(new THREE.TorusGeometry(7 + k * 3.5, 1.1, 6, 40, Math.PI * 1.5), basico(k % 2 ? 0xd8fff2 : 0x6ff0c0, 0.75, { blending: THREE.AdditiveBlending }));
        a.rotation.x = Math.PI / 2; a.position.y = -10 + k * 7; corpo.add(a); it.aneis.push(a);
      }
      corpo.add(brilhoS(0xbfffe8, 30, 0.7));
    }
    if (tipo === 'lendario') {
      const cristal = new THREE.Mesh(new THREE.DodecahedronGeometry(14, 1), basico(0xf0c9ff, 0.92, { blending: THREE.AdditiveBlending }));
      corpo.add(cristal); it.giro.push([cristal, 0.035, 0.06]);
      corpo.add(brilhoS(0xffd6ff, 34, 0.9));
      it.aneis = [];
      for (let k = 0; k < 3; k++) {
        const anel = new THREE.Mesh(new THREE.TorusGeometry(19 + k * 6, 1.3, 6, 40), basico(k % 2 ? 0xffd6ff : 0x9d4edd, 0.8, { blending: THREE.AdditiveBlending }));
        anel.rotation.set(k * 0.8, k * 0.6, k * 1.1); corpo.add(anel); it.aneis.push(anel);
      }
    }
    it.halo = brilhoS(cor, 90, 0.75); g.add(it.halo);
    it.cauda = brilhoS(cor, 1, 0.55); it.cauda.center.set(0.5, 0.1); g.add(it.cauda); // rastro de meteoro esticado pra cima
    it.luz = new THREE.PointLight(cor, 3, 260, 1.2); g.add(it.luz);
    it.marca = new THREE.Mesh(new THREE.RingGeometry(18, 22, 40), basico(cor, 0.5, { blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    it.marca.rotation.x = -Math.PI / 2; scene.add(it.marca);
    scene.add(g);
    return it;
  }
  function animaItem(it, d, t, dt) {
    const k = dt / 33, caindo = d.y > 0, cor = COR[it.tipo];
    const flut = caindo ? 0 : Math.sin(t / 260 + d.id) * 5;
    it.g.position.set(d.x, d.y + 26 + flut, 0);
    for (const [o, rx, ry, rz] of it.giro) { o.rotation.x += (rx || 0) * k; o.rotation.y += (ry || 0) * k; o.rotation.z += (rz || 0) * k; }
    // aparece pulsando, pisca antes de sumir
    const pulso = 1 + Math.sin(t / 140) * 0.08;
    it.corpo.scale.setScalar(pulso);
    it.halo.material.opacity = 0.55 + Math.sin(t / 90) * 0.15;
    it.g.visible = !(d.vida < 90 && Math.floor(t / 100) % 2);
    // marca no chão de onde vai cair: encolhe conforme o meteoro chega
    const perto = Math.max(0, Math.min(1, 1 - d.y / 700));
    it.marca.position.set(d.x, 1.5, 0);
    it.marca.scale.setScalar(caindo ? 2.4 - perto * 1.4 : 1 + Math.sin(t / 200) * 0.06);
    it.marca.material.opacity = caindo ? 0.25 + perto * 0.5 : 0.55;
    it.marca.visible = it.g.visible;
    it.cauda.visible = caindo;
    if (caindo) it.cauda.scale.set(30, 160, 1);
    it.luz.intensity = 2.5 + Math.sin(t / 70) * 0.8 + (it.tipo === 'raio' && Math.random() < 0.15 ? 3 : 0);
    // pousou: onda de choque e estouro de partículas
    if (it.yAnt > 0 && d.y === 0) {
      onda(d.x, cor, 110, 500); onda(d.x, 0xffffff, 60, 300);
      for (let n = 0; n < 26; n++) { const a = Math.random() * Math.PI * 2, v = aleat(3, 9); particula({ x: d.x, y: 10, z: 0, vx: Math.cos(a) * v, vz: Math.sin(a) * v * 0.6, vy: aleat(2, 8), g: -0.5, tam: aleat(10, 22), dur: aleat(400, 800), cor, cor1: 0xffffff }); }
    }
    it.yAnt = d.y;
    const px = d.x, py = d.y + 26 + flut;
    // rastro e partículas próprias de cada elemento
    const n = caindo ? 3 : 1;
    for (let j = 0; j < n; j++) {
      if (it.tipo === 'fogo' && Math.random() < 0.9) particula({ x: px + aleat(-8, 8), y: py + aleat(-6, 6), vx: aleat(-0.6, 0.6), vy: caindo ? aleat(4, 7) : aleat(1.5, 3), tam: aleat(14, 24), tam1: 3, dur: aleat(350, 650), cor: 0xffd060, cor1: 0xff2a00 });
      if (it.tipo === 'fogo' && Math.random() < 0.25) particula({ tex: 'fumaca', x: px, y: py + 12, vx: aleat(-0.4, 0.4), vy: aleat(1, 2.5), tam: 12, tam1: 34, dur: 900, cor: 0x2a1a1a, op: 0.35 });
      if (it.tipo === 'gelo' && Math.random() < 0.6) particula({ tex: Math.random() < 0.5 ? 'floco' : 'brilho', x: px + aleat(-14, 14), y: py + aleat(-14, 14), z: aleat(-10, 10), vx: aleat(-0.5, 0.5), vy: caindo ? aleat(2, 4) : aleat(-0.8, -0.2), tam: aleat(6, 11), dur: aleat(600, 1100), cor: 0xd8f8ff, gira: 0.05 });
      if (it.tipo === 'vento' && Math.random() < 0.8) { const a = t / 120 + Math.random() * 6; particula({ x: px + Math.cos(a) * 20, y: py + aleat(-14, 14), z: Math.sin(a) * 20, vx: -Math.sin(a) * 3, vz: Math.cos(a) * 3, vy: caindo ? 4 : 0.6, tam: aleat(6, 12), dur: 500, cor: 0xcfffee, op: 0.7 }); }
      if (it.tipo === 'raio' && Math.random() < 0.4) particula({ x: px, y: py, vx: aleat(-5, 5), vy: aleat(-3, 6), g: -0.3, tam: aleat(5, 9), dur: aleat(200, 400), cor: 0xfff6b0 });
    }
    if (it.orb) it.orb.forEach((l, j) => { const a = t / 380 + j * 1.26; l.position.set(Math.cos(a) * 22, Math.sin(a * 1.7) * 8, Math.sin(a) * 22); l.rotation.x += 0.1 * k; l.rotation.y += 0.07 * k; });
    if (it.aneis) it.aneis.forEach((a, j) => { a.rotation.z += (0.12 + j * 0.05) * k * (j % 2 ? -1 : 1); a.position.x = Math.sin(t / 150 + j) * 2; });
    if (it.faisca && t > it.proxFaisca) { // faíscas elétricas pulando em volta da esfera
      it.faisca.children.slice().forEach(c => { it.faisca.remove(c); descarta(c); });
      for (let q = 0; q < 2; q++) {
        const a = Math.random() * Math.PI * 2, b = Math.random() * Math.PI * 2;
        const ini = new THREE.Vector3(Math.cos(a) * 9, Math.sin(a) * 9, 0), fim = new THREE.Vector3(Math.cos(b) * 26, Math.sin(b) * 26, aleat(-10, 10));
        it.faisca.add(zigue(ini, fim, 0.5, 5, 0));
      }
      it.proxFaisca = t + aleat(50, 130);
    }
  }
  function apagaItem(it, d, pego) {
    scene.remove(it.g); scene.remove(it.marca); descarta(it.g); descarta(it.marca);
    if (!pego) return;
    // pego: explode em luz na cor do elemento
    onda(d.x, COR[it.tipo], 140, 550);
    for (let n = 0; n < 34; n++) { const a = Math.random() * Math.PI * 2, e = Math.random() * Math.PI - Math.PI / 2, v = aleat(4, 10); particula({ x: d.x, y: d.y + 30, vx: Math.cos(a) * Math.cos(e) * v, vy: Math.sin(e) * v + 3, vz: Math.sin(a) * Math.cos(e) * v, g: -0.2, atrito: 0.93, tam: aleat(10, 20), dur: aleat(400, 750), cor: COR[it.tipo], cor1: 0xffffff }); }
  }

  // ---------- poderes na arena ----------
  // GELO: estacas brotando do chão pelo caminho
  const estacas = [];
  const matGelo = new THREE.MeshStandardMaterial({ color: 0xc4f2ff, emissive: 0x2490c0, emissiveIntensity: 0.55, metalness: 0.1, roughness: 0.08, transparent: true, opacity: 0.88, flatShading: true });
  const geoEstaca = new THREE.ConeGeometry(1, 1, 5);
  function estaca(x, z, alt, larg, inclina) {
    const m = new THREE.Mesh(geoEstaca, matGelo); m.castShadow = true;
    m.position.set(x, 0, z); m.rotation.set(aleat(-0.25, 0.25), Math.random() * 6, inclina);
    scene.add(m); estacas.push({ m, alt, larg, vida: 0, dur: aleat(650, 900) });
  }
  // VENTO: funil de anéis
  function criaTornado() {
    const g = new THREE.Group(), aneis = [];
    for (let k = 0; k < 11; k++) {
      const r = 10 + k * k * 0.55 + k * 2.5;
      const a = new THREE.Mesh(new THREE.TorusGeometry(r, 1.4 + k * 0.15, 6, 48, Math.PI * aleat(1.2, 1.8)), basico(k % 3 ? 0xd9fff4 : 0x70f0c8, 0.32 + (k % 2) * 0.12, { blending: THREE.AdditiveBlending }));
      a.rotation.x = Math.PI / 2; a.position.y = k * 16; g.add(a); aneis.push(a);
    }
    const nucleo = new THREE.Mesh(new THREE.CylinderGeometry(60, 6, 175, 24, 1, true), basico(0xbfffea, 0.08, { blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    nucleo.position.y = 88; g.add(nucleo);
    scene.add(g); return { g, aneis, nucleo, x: 0, vida: 0 };
  }
  // RAIO: nuvem carregada + mira no chão + o próprio raio
  function criaTempestade() {
    const g = new THREE.Group(), nuvens = [];
    for (let k = 0; k < 9; k++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texFumaca, color: 0x2a2440, transparent: true, opacity: 0, depthWrite: false }));
      s.position.set(aleat(-70, 70), 360 + aleat(-14, 14), aleat(-30, 10)); const tam = aleat(90, 150); s.scale.set(tam, tam * 0.6, 1);
      g.add(s); nuvens.push(s);
    }
    const clarao = brilhoS(0xb9a6ff, 260, 0); clarao.position.y = 360; g.add(clarao);
    const mira = new THREE.Group();
    const anel = new THREE.Mesh(new THREE.RingGeometry(36, 42, 48), basico(0xffe45e, 0.7, { blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    const cruz = new THREE.Mesh(new THREE.RingGeometry(8, 12, 4), basico(0xffe45e, 0.9, { blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    mira.add(anel, cruz); mira.rotation.x = -Math.PI / 2; mira.position.y = 2; g.add(mira);
    const luz = new THREE.PointLight(0xc8b8ff, 0, 900, 1); luz.position.y = 120; g.add(luz);
    scene.add(g); return { g, nuvens, clarao, mira, anel, luz, raio: null, raioVida: 0, cicloAnt: -1, aparece: 0 };
  }
  const tornados = new Map(), tempestades = new Map(), ondasGelo = new Map();

  // ---------- no lutador ----------
  const estado = [0, 1].map(() => ({ bloco: null, luzFogo: null, congAnt: false }));
  function criaBloco() {
    const g = new THREE.Group(), pecas = [];
    const mat = new THREE.MeshStandardMaterial({ color: 0xbfefff, emissive: 0x1f86b8, emissiveIntensity: 0.45, metalness: 0.1, roughness: 0.04, transparent: true, opacity: 0.55, flatShading: true, depthWrite: false });
    for (let k = 0; k < 14; k++) { // cristais apontando pra fora, mais grossos embaixo
      const alt = aleat(40, 95), m = new THREE.Mesh(new THREE.OctahedronGeometry(1, 0), mat);
      const y = aleat(10, 140), a = Math.random() * Math.PI * 2, r = aleat(8, 22);
      m.position.set(Math.cos(a) * r, y, Math.sin(a) * r * 0.7);
      m.scale.set(aleat(14, 24), alt / 2, aleat(12, 20)); m.rotation.set(aleat(-0.4, 0.4), Math.random() * 6, aleat(-0.4, 0.4));
      g.add(m); pecas.push({ m, y });
    }
    const frio = brilhoS(0x9be8ff, 220, 0.35); frio.position.y = 80; g.add(frio);
    scene.add(g); return { g, pecas, mat, vida: 0 };
  }
  // cacos de gelo voando quando o bloco quebra
  const cacos = [], geoCaco = new THREE.TetrahedronGeometry(1);
  function quebraGelo(x, y) {
    for (let n = 0; n < 26; n++) {
      const m = new THREE.Mesh(geoCaco, matGelo); const tam = aleat(3, 9); m.scale.setScalar(tam); m.castShadow = true;
      m.position.set(x + aleat(-20, 20), y + aleat(10, 140), aleat(-12, 12)); scene.add(m);
      cacos.push({ m, vx: aleat(-7, 7), vy: aleat(2, 11), vz: aleat(-5, 5), rx: aleat(-0.3, 0.3), ry: aleat(-0.3, 0.3), vida: 0, dur: aleat(900, 1400) });
    }
    for (let n = 0; n < 20; n++) particula({ tex: n % 2 ? 'floco' : 'brilho', x: x + aleat(-25, 25), y: y + aleat(10, 140), vx: aleat(-4, 4), vy: aleat(-1, 4), g: -0.15, tam: aleat(6, 12), dur: 800, cor: 0xe2fbff, gira: 0.1 });
    onda(x, 0x9be8ff, 120, 450);
  }

  const itensVis = new Map();
  let tAnt = 0, flashCena = 0;
  return {
    eElemento: tipo => ELEMENTOS.includes(tipo),
    // claridade extra que o renderizador soma na luz ambiente (clarão do raio)
    get flash() { return flashCena; },
    frame(vis, t, lut) {
      const dt = Math.min(50, tAnt ? t - tAnt : 16); tAnt = t;
      const k = dt / 33;
      flashCena *= Math.exp(-dt / 90);

      // itens
      const vivos = new Set();
      for (const d of vis.itens) {
        if (!ELEMENTOS.includes(d.tipo)) continue;
        vivos.add(d.id);
        if (!itensVis.has(d.id)) itensVis.set(d.id, Object.assign(criaItem(d.tipo), { yAnt: d.y }));
        const it = itensVis.get(d.id); it.d = d; animaItem(it, d, t, dt);
      }
      for (const [id, it] of itensVis) if (!vivos.has(id)) { apagaItem(it, it.d, it.d.vida > 2 && !vis.vencedor); itensVis.delete(id); }

      // poderes
      const poderes = vis.poderes || [], ids = new Set(poderes.map(p => p.id));
      for (const pd of poderes) {
        if (pd.tipo === 'gelo') {
          let og = ondasGelo.get(pd.id);
          if (!og) ondasGelo.set(pd.id, og = { ultX: pd.x - pd.dir * 30, x: pd.x, dir: pd.dir });
          og.x = pd.x; og.dir = pd.dir;
          while ((og.x - og.ultX) * og.dir >= 14) { // estacas novas a cada 14 px de caminho
            og.ultX += og.dir * 14;
            estaca(og.ultX, aleat(-14, 14), aleat(40, 75), aleat(9, 14), og.dir * aleat(-0.5, -0.15));
            if (Math.random() < 0.6) estaca(og.ultX + aleat(-6, 6), aleat(-30, 30), aleat(18, 35), aleat(5, 8), aleat(-0.6, 0.6));
            for (let n = 0; n < 3; n++) particula({ tex: 'fumaca', x: og.ultX, y: 8, z: aleat(-20, 20), vx: aleat(-1, 1), vy: aleat(0.5, 1.5), tam: 16, tam1: 46, dur: 900, cor: 0xdff6ff, op: 0.45 });
          }
          particula({ x: og.x, y: aleat(5, 40), vx: og.dir * aleat(2, 5), vy: aleat(0, 3), tam: aleat(6, 12), dur: 400, cor: 0xbff4ff });
        }
        if (pd.tipo === 'vento') {
          let tn = tornados.get(pd.id);
          if (!tn) { tornados.set(pd.id, tn = criaTornado()); tn.x = pd.x; }
          tn.x += (pd.x - tn.x) * 0.5; tn.vida += dt; tn.ultDir = pd.dir;
          tn.g.position.set(tn.x, 0, 0);
          const cresce = Math.min(1, tn.vida / 250); tn.g.scale.setScalar(0.3 + cresce * 0.7);
          tn.aneis.forEach((a, j) => {
            a.rotation.z += (0.22 - j * 0.012) * k;
            a.position.x = Math.sin(t / 180 + j * 0.5) * j * 2.2; a.position.z = Math.cos(t / 210 + j * 0.5) * j * 1.2; // funil serpenteando
          });
          tn.nucleo.rotation.y += 0.3 * k;
          for (let n = 0; n < 3; n++) { // poeira e folhas subindo em espiral
            const a = Math.random() * Math.PI * 2, y = aleat(0, 160), r = 10 + y * 0.35;
            particula({ tex: n ? 'brilho' : 'fumaca', x: tn.x + Math.cos(a) * r, y, z: Math.sin(a) * r, vx: -Math.sin(a) * 6, vz: Math.cos(a) * 6, vy: aleat(2, 5), atrito: 0.9, tam: n ? aleat(4, 8) : aleat(20, 34), dur: aleat(350, 600), cor: n ? 0xe6fff6 : 0x8aa79a, op: n ? 0.9 : 0.25 });
          }
          if (Math.random() < 0.5 * k) particula({ tex: 'fumaca', x: tn.x + aleat(-30, 30), y: 6, z: aleat(-20, 20), vx: aleat(-3, 3), vy: 0.5, tam: 24, tam1: 60, dur: 700, cor: 0xa89a80, op: 0.3 });
        }
        if (pd.tipo === 'raio') {
          let tp = tempestades.get(pd.id);
          if (!tp) tempestades.set(pd.id, tp = criaTempestade());
          tp.aparece = Math.min(1, tp.aparece + dt / 300);
          tp.g.position.set(pd.x, 0, 0);
          const fase = pd.t % RAIO_CICLO, ciclo = Math.floor(pd.t / RAIO_CICLO);
          tp.nuvens.forEach((s, j) => { s.material.opacity = 0.85 * tp.aparece; s.position.x += Math.sin(t / 400 + j) * 0.2; });
          // mira encolhendo e piscando mais rápido conforme o raio chega
          const carga = Math.min(1, fase / RAIO_AVISO), avisando = fase < RAIO_AVISO;
          tp.mira.visible = avisando; tp.mira.scale.setScalar(1.6 - carga * 0.75); tp.mira.rotation.z += 0.08 * k;
          tp.anel.material.opacity = 0.35 + (Math.sin(t / (90 - carga * 60)) > 0 ? 0.55 : 0);
          // nuvem carregando: relâmpagos internos
          if (avisando && Math.random() < 0.08 + carga * 0.25) tp.clarao.material.opacity = aleat(0.3, 0.7);
          tp.clarao.material.opacity *= Math.exp(-dt / 60);
          if (avisando && Math.random() < carga * 0.5) particula({ x: pd.x + aleat(-40, 40), y: 4, vy: aleat(1, 3), tam: aleat(4, 8), dur: 300, cor: 0xfff3a0 });
          if (fase >= RAIO_AVISO && tp.cicloAnt !== ciclo) { // CAIU
            tp.cicloAnt = ciclo;
            if (tp.raio) { tp.g.remove(tp.raio); descarta(tp.raio); }
            tp.raio = zigue(new THREE.Vector3(aleat(-20, 20), 360, 0), new THREE.Vector3(0, 0, 0), 2.2, 22, 4);
            tp.g.add(tp.raio); tp.raioVida = 0;
            tp.luz.intensity = 40; tp.clarao.material.opacity = 1; flashCena = 1;
            onda(pd.x, 0xffe45e, 150, 400); onda(pd.x, 0xffffff, 80, 250);
            for (let n = 0; n < 40; n++) { const a = Math.random() * Math.PI * 2, v = aleat(3, 12); particula({ x: pd.x, y: 4, vx: Math.cos(a) * v, vz: Math.sin(a) * v * 0.5, vy: aleat(3, 12), g: -0.7, atrito: 0.97, tam: aleat(4, 10), dur: aleat(300, 650), cor: 0xffffff, cor1: 0xffc23a }); }
            for (let n = 0; n < 8; n++) particula({ tex: 'fumaca', x: pd.x + aleat(-20, 20), y: 6, vx: aleat(-1.5, 1.5), vy: aleat(1, 2.5), tam: 20, tam1: 70, dur: 1300, cor: 0x302a2a, op: 0.45 });
          }
          if (tp.raio) {
            tp.raioVida += dt;
            // o raio pisca 2 vezes (re-sorteia o zigue-zague) e some
            if (tp.raioVida > 70 && !tp.raio.segundo) { tp.g.remove(tp.raio); descarta(tp.raio); tp.raio = zigue(new THREE.Vector3(aleat(-20, 20), 360, 0), new THREE.Vector3(0, 0, 0), 1.8, 26, 3); tp.raio.segundo = true; tp.g.add(tp.raio); tp.luz.intensity = 25; flashCena = Math.max(flashCena, 0.6); }
            tp.raio.visible = !(tp.raioVida > 40 && tp.raioVida < 70);
            if (tp.raioVida > 190) { tp.g.remove(tp.raio); descarta(tp.raio); tp.raio = null; }
          }
          tp.luz.intensity *= Math.exp(-dt / 70);
        }
      }
      for (const [id, og] of ondasGelo) if (!ids.has(id)) ondasGelo.delete(id);
      for (const [id, tn] of tornados) if (!ids.has(id)) { // se desfaz em vento
        tn.some = (tn.some || 0) + dt; const u = tn.some / 350;
        tn.g.scale.set(1 + u, Math.max(0.01, 1 - u), 1 + u); tn.aneis.forEach(a => a.material.opacity *= 0.85);
        if (u >= 1) { scene.remove(tn.g); descarta(tn.g); tornados.delete(id); }
      }
      for (const [id, tp] of tempestades) if (!ids.has(id)) { // nuvem se dissipa
        tp.some = (tp.some || 0) + dt; const u = tp.some / 600;
        tp.nuvens.forEach(s => { s.material.opacity = 0.85 * (1 - u); s.scale.x *= 1.004; }); tp.mira.visible = false;
        if (tp.raio) { tp.raioVida += dt; tp.raio.visible = tp.raioVida < 150; }
        tp.luz.intensity *= Math.exp(-dt / 70);
        if (u >= 1) { scene.remove(tp.g); descarta(tp.g); tempestades.delete(id); }
      }

      // estacas: sobem rápido, ficam, afundam
      for (let n = estacas.length - 1; n >= 0; n--) {
        const e = estacas[n]; e.vida += dt; const u = e.vida / e.dur;
        const h = u < 0.12 ? e.alt * (1 - Math.pow(1 - u / 0.12, 3)) * 1.1 : u < 0.2 ? e.alt * (1.1 - (u - 0.12) / 0.08 * 0.1) : u < 0.75 ? e.alt : e.alt * (1 - (u - 0.75) / 0.25);
        e.m.scale.set(e.larg, Math.max(0.01, h), e.larg); e.m.position.y = h / 2;
        if (u >= 1) { scene.remove(e.m); estacas.splice(n, 1); }
      }
      for (let n = cacos.length - 1; n >= 0; n--) {
        const c = cacos[n]; c.vida += dt; c.vy -= 0.7 * k;
        c.m.position.x += c.vx * k; c.m.position.y += c.vy * k; c.m.position.z += c.vz * k;
        if (c.m.position.y < 2) { c.m.position.y = 2; c.vy *= -0.35; c.vx *= 0.7; c.vz *= 0.7; }
        c.m.rotation.x += c.rx * k; c.m.rotation.y += c.ry * k;
        if (c.vida > c.dur * 0.7) c.m.scale.multiplyScalar(0.9);
        if (c.vida > c.dur) { scene.remove(c.m); cacos.splice(n, 1); }
      }
      for (let n = ondas.length - 1; n >= 0; n--) {
        const o = ondas[n]; o.vida += dt; const u = o.vida / o.dur;
        o.m.scale.setScalar(o.tam * (1 - Math.pow(1 - u, 3))); o.m.material.opacity = 0.9 * (1 - u);
        if (u >= 1) { scene.remove(o.m); descarta(o.m); ondas.splice(n, 1); }
      }

      // efeitos presos nos lutadores
      vis.p.forEach((f, i) => {
        const e = estado[i], alto = f.acao === 'caido' ? 30 : f.agachado ? 80 : 130;
        // punhos em chamas
        if (f.fogo > 0) {
          if (!e.luzFogo) { e.luzFogo = new THREE.PointLight(0xff6a1a, 0, 280, 1.3); scene.add(e.luzFogo); }
          e.luzFogo.position.set(f.x, f.y + 90, 30);
          e.luzFogo.intensity = (f.fogo < 60 ? 2 : 4) + Math.sin(t / 50) * 1.2 + Math.random();
          const atacando = GOLPE.test(f.acao) && f.dur, maos = lut && lut[i];
          const qtd = (atacando ? 5 : 2) * k;
          for (let n = 0; n < qtd; n++) {
            // sai das mãos se a gente souber onde estão; senão, do corpo todo
            const pm = maos && maos[n % maos.length];
            const x = pm ? pm[0] : f.x + aleat(-18, 18), y = pm ? pm[1] : f.y + aleat(10, alto);
            particula({ x: x + aleat(-5, 5), y: y + aleat(-5, 5), z: aleat(-8, 8) + 10, vx: aleat(-0.5, 0.5) + (atacando ? f.facing * 2 : 0), vy: aleat(1.5, 3.5), tam: aleat(10, 20) * (atacando ? 1.3 : 1), tam1: 2, dur: aleat(300, 550), cor: 0xffe08a, cor1: 0xff2a00 });
          }
          if (Math.random() < 0.15 * k) particula({ tex: 'fumaca', x: f.x + aleat(-10, 10), y: f.y + alto, vy: 2, tam: 12, tam1: 40, dur: 900, cor: 0x2a1c1c, op: 0.3 });
        } else if (e.luzFogo) e.luzFogo.intensity = 0;
        // queimando: brasas e fumaça
        if (f.queima > 0 && Math.random() < 0.7 * k) {
          particula({ x: f.x + aleat(-16, 16), y: f.y + aleat(10, alto), z: 12, vx: aleat(-0.6, 0.6), vy: aleat(1, 2.5), tam: aleat(7, 13), tam1: 2, dur: 450, cor: 0xff8a2a, cor1: 0x801000 });
          if (Math.random() < 0.3) particula({ tex: 'fumaca', x: f.x + aleat(-10, 10), y: f.y + alto * 0.8, vy: 1.6, vx: aleat(-0.4, 0.4), tam: 14, tam1: 46, dur: 1100, cor: 0x1c1616, op: 0.4 });
        }
        // congelado: bloco de cristais crescendo dos pés à cabeça
        const cong = f.acao === 'congelado';
        if (cong && !e.bloco) e.bloco = criaBloco();
        if (e.bloco) {
          e.bloco.vida += dt;
          e.bloco.g.position.set(f.x, f.y, 0);
          const cresce = Math.min(1, e.bloco.vida / 260);
          e.bloco.pecas.forEach(p => { const v = Math.max(0, Math.min(1, cresce * 1.6 - p.y / 150 * 0.6)); p.m.visible = v > 0.02; p.m.scale.y = Math.max(0.01, p.m.userData.sy ??= p.m.scale.y) * v; });
          e.bloco.mat.emissiveIntensity = 0.35 + Math.sin(t / 160) * 0.1;
          if (Math.random() < 0.3 * k) particula({ tex: 'fumaca', x: f.x + aleat(-30, 30), y: f.y + aleat(0, 30), vx: aleat(-0.6, 0.6), vy: -0.2, tam: 20, tam1: 50, dur: 900, cor: 0xe6f9ff, op: 0.35 });
          if (Math.random() < 0.2 * k) particula({ x: f.x + aleat(-25, 25), y: f.y + aleat(20, 140), z: 25, tam: aleat(5, 10), dur: 260, cor: 0xffffff });
          if (!cong) { quebraGelo(f.x, f.y); scene.remove(e.bloco.g); descarta(e.bloco.g); e.bloco = null; }
        }
      });

      animaParticulas(dt);
    },
    // limpa tudo (troca de modo, nova luta)
    limpa() {
      for (const [, it] of itensVis) apagaItem(it, it.d, false); itensVis.clear();
    },
  };
}

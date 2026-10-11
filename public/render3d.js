// Renderizador 3D (Three.js). A lógica da luta continua no servidor; aqui só desenha.
// Mundo: x 0..800 (arena), y pra cima (0 = chão), z = profundidade (câmera em z positivo).
import * as THREE from '/vendor/three.module.min.js';

const cv3 = document.getElementById('c3');
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas: cv3, antialias: true }); } catch (e) { console.warn('Sem WebGL, usando 2D', e); }

if (renderer) {
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x3a1450, 0.00032);
  const camera = new THREE.PerspectiveCamera(38, 2, 1, 6000);
  const CORES = [0xef4444, 0x3b82f6];
  const rad = g => g * Math.PI / 180;
  let seed = 11; const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;

  // ---------- luzes ----------
  scene.add(new THREE.HemisphereLight(0x9d8bff, 0x1a0820, 1.0));
  // contraluz do sol poente (rosa) + luz principal fria vinda da câmera, que faz as sombras
  const contra = new THREE.DirectionalLight(0xff6ab0, 1.6); contra.position.set(400, 200, -900); scene.add(contra);
  const sol = new THREE.DirectionalLight(0xdfe6ff, 2.0);
  sol.position.set(250, 520, 380); sol.target.position.set(400, 0, 0);
  sol.castShadow = true; sol.shadow.mapSize.set(1024, 1024);
  Object.assign(sol.shadow.camera, { left: -550, right: 550, top: 450, bottom: -350, near: 10, far: 1600 });
  sol.shadow.bias = -0.0005;
  scene.add(sol, sol.target);

  // brilho falso (sprite somado) pra neon e luzes
  const texBrilho = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, '#ffffffff'); gr.addColorStop(0.25, '#ffffff88'); gr.addColorStop(1, '#ffffff00');
    g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();
  const brilho = (cor, tam, op = 0.8) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texBrilho, color: cor, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false }));
    s.scale.set(tam, tam, 1); return s;
  };

  // ---------- céu: crepúsculo com sol listrado retrô ----------
  function texturaCeu() {
    const c = document.createElement('canvas'); c.width = 2048; c.height = 1024;
    const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 0, 760);
    gr.addColorStop(0, '#04020f'); gr.addColorStop(0.35, '#1d0a3d'); gr.addColorStop(0.62, '#6b1660'); gr.addColorStop(0.85, '#e0457b'); gr.addColorStop(1, '#ffb36b');
    g.fillStyle = gr; g.fillRect(0, 0, 2048, 1024);
    for (let n = 0; n < 260; n++) { g.fillStyle = '#fff'; g.globalAlpha = rnd() * rnd(); const r = rnd() * 2 + 0.5; g.fillRect(rnd() * 2048, rnd() * 420, r, r); }
    g.globalAlpha = 1;
    // halo do sol
    const halo = g.createRadialGradient(1024, 640, 0, 1024, 640, 520);
    halo.addColorStop(0, '#ffcf7a99'); halo.addColorStop(0.4, '#ff4f8b44'); halo.addColorStop(1, '#ff4f8b00');
    g.fillStyle = halo; g.fillRect(0, 0, 2048, 1024);
    // disco do sol com faixas cortadas embaixo
    g.save(); g.beginPath(); g.arc(1024, 640, 230, 0, Math.PI * 2); g.clip();
    const disco = g.createLinearGradient(0, 410, 0, 870);
    disco.addColorStop(0, '#fff3a8'); disco.addColorStop(0.45, '#ffb04a'); disco.addColorStop(1, '#ff2e7e');
    g.fillStyle = disco; g.fillRect(780, 400, 500, 480);
    g.globalCompositeOperation = 'destination-out';
    for (let k = 0, y = 640; y < 880; k++) { const h = 3 + k * 2.2; g.fillRect(780, y, 500, h); y += h + 14 - k; }
    g.restore();
    // cordilheira distante com borda iluminada
    for (const [cor, base, alt, borda] of [['#2b0f3f', 760, 170, '#ff5fa855'], ['#14071f', 790, 90, '#ff8fc444']]) {
      g.beginPath(); g.moveTo(0, 1024);
      for (let x = -40; x <= 2090; x += 40 + rnd() * 80) g.lineTo(x, base - rnd() * alt);
      g.lineTo(2048, 1024); g.closePath(); g.fillStyle = cor; g.fill(); g.strokeStyle = borda; g.lineWidth = 2; g.stroke();
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
  }
  const ceu = new THREE.Mesh(new THREE.PlaneGeometry(6400, 3200), new THREE.MeshBasicMaterial({ map: texturaCeu(), fog: false }));
  ceu.position.set(400, 700, -2600); scene.add(ceu);

  // ---------- chão: metal escuro polido com grade neon ----------
  function texturaGrade(emissivo) {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = emissivo ? '#000' : '#2a2238'; g.fillRect(0, 0, 256, 256);
    if (!emissivo) for (let n = 0; n < 1500; n++) { g.fillStyle = rnd() < 0.5 ? '#1c1729' : '#0f0c17'; g.fillRect(rnd() * 256, rnd() * 256, 2, 2); }
    g.strokeStyle = emissivo ? '#ff3fd0' : '#2a2238'; g.lineWidth = emissivo ? 3 : 4;
    g.strokeRect(0, 0, 256, 256);
    if (emissivo) { g.strokeStyle = '#ff3fd033'; g.lineWidth = 10; g.strokeRect(0, 0, 256, 256); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(42, 22); t.anisotropy = 8;
    if (!emissivo) t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  const chao = new THREE.Mesh(new THREE.PlaneGeometry(8400, 4400), new THREE.MeshStandardMaterial({
    map: texturaGrade(false), emissiveMap: texturaGrade(true), emissive: 0xffffff, emissiveIntensity: 0.9, metalness: 0.7, roughness: 0.32,
  }));
  chao.rotation.x = -Math.PI / 2; chao.position.set(400, 0, -1500); chao.receiveShadow = true; scene.add(chao);

  // plataforma da arena: borda de neon ciano na frente e atrás
  const plataforma = new THREE.Mesh(new THREE.BoxGeometry(900, 6, 260), new THREE.MeshStandardMaterial({ color: 0x3a3150, metalness: 0.6, roughness: 0.35 }));
  plataforma.position.set(400, -2.5, 0); plataforma.receiveShadow = true; scene.add(plataforma);
  const neonCiano = new THREE.MeshBasicMaterial({ color: 0x5ef2ff });
  for (const z of [130, -130]) { const b = new THREE.Mesh(new THREE.BoxGeometry(900, 2, 2), neonCiano); b.position.set(400, 0.6, z); scene.add(b); }

  // ---------- cidade ao fundo: prédios com janelas acesas ----------
  function texturaJanelas() {
    const c = document.createElement('canvas'); c.width = 128; c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, 128, 256);
    for (let y = 4; y < 256; y += 10) for (let x = 4; x < 128; x += 9) {
      if (rnd() < 0.38) { g.fillStyle = rnd() < 0.7 ? '#ffc874' : rnd() < 0.5 ? '#7ae8ff' : '#ff7ad9'; g.globalAlpha = 0.4 + rnd() * 0.6; g.fillRect(x, y, 5, 6); }
    }
    g.globalAlpha = 1;
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  }
  const janelas = [texturaJanelas(), texturaJanelas(), texturaJanelas()];
  const casco = new THREE.MeshStandardMaterial({ color: 0x14101f, metalness: 0.6, roughness: 0.5 });
  const neons = [0xff3fd0, 0x5ef2ff, 0xffb347, 0x9d6bff];
  const pisca = [];
  const cidade = new THREE.Group(); scene.add(cidade); // rola para a esquerda em loop
  for (let n = 0; n < 110; n++) {
    const x = -2200 + rnd() * 5200, z = -1300 - rnd() * 1200;
    if (x > -150 && x < 950 && rnd() < 0.85) continue; // deixa o sol aparecer no meio
    const lx = 70 + rnd() * 120, lz = 70 + rnd() * 120, alt = 200 + rnd() * rnd() * 1000;
    const tex = janelas[n % 3].clone(); tex.repeat.set(lx / 110, alt / 220); tex.needsUpdate = true;
    const mat = new THREE.MeshStandardMaterial({ color: 0x0f0c18, metalness: 0.5, roughness: 0.45, emissive: 0xffffff, emissiveMap: tex, emissiveIntensity: 0.8 });
    const p = new THREE.Mesh(new THREE.BoxGeometry(lx, alt, lz), [mat, mat, casco, casco, mat, mat]);
    p.position.set(x, alt / 2, z); cidade.add(p);
    // faixa neon no topo e antena com luz vermelha piscando
    if (rnd() < 0.55) {
      const cor = neons[Math.floor(rnd() * neons.length)];
      const f = new THREE.Mesh(new THREE.BoxGeometry(lx + 2, 3, lz + 2), new THREE.MeshBasicMaterial({ color: cor }));
      f.position.set(x, alt - 8, z); cidade.add(f);
    }
    if (alt > 500) {
      const ant = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 2.5, 90, 6), casco); ant.position.set(x, alt + 45, z); cidade.add(ant);
      const luz = brilho(0xff2a2a, 40, 0.9); luz.position.set(x, alt + 92, z); cidade.add(luz); pisca.push({ luz, fase: rnd() * 6 });
    }
  }

  // ---------- carros voadores cruzando o céu ----------
  const carros = [];
  for (let n = 0; n < 9; n++) {
    const g = new THREE.Group();
    const corpo = new THREE.Mesh(new THREE.BoxGeometry(26, 6, 10), casco); g.add(corpo);
    const farol = brilho(n % 2 ? 0xfff1c4 : 0xff3a5a, 26, 1); farol.position.x = n % 2 ? 14 : -14; g.add(farol);
    g.position.set(-1500 + rnd() * 3800, 260 + rnd() * 420, -900 - rnd() * 900); scene.add(g);
    carros.push({ g, v: (n % 2 ? 1 : -1) * (0.08 + rnd() * 0.12) });
  }

  // ---------- postes de neon nos cantos (substituem as tochas) ----------
  const tochas = [];
  const cromo = new THREE.MeshStandardMaterial({ color: 0xb8bcc8, metalness: 1, roughness: 0.18 });
  for (const [tx, cor] of [[30, 0xff3fd0], [770, 0x5ef2ff]]) {
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(16, 20, 10, 16), cromo); base.position.y = 5; g.add(base);
    const poste = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 4.5, 150, 12), cromo); poste.position.y = 80; poste.castShadow = true; g.add(poste);
    const tubo = new THREE.MeshBasicMaterial({ color: cor });
    for (const y of [40, 75, 110]) { const a = new THREE.Mesh(new THREE.TorusGeometry(8, 1.3, 8, 24), tubo); a.rotation.x = Math.PI / 2; a.position.y = y; g.add(a); }
    const globo = new THREE.Mesh(new THREE.SphereGeometry(9, 20, 14), tubo); globo.position.y = 160; g.add(globo);
    const halo = brilho(cor, 110, 0.7); halo.position.y = 160; g.add(halo);
    const luz = new THREE.PointLight(cor, 3, 460, 0); luz.position.y = 150; g.add(luz);
    g.position.set(tx, 0, -50); scene.add(g);
    tochas.push({ halo, luz, fase: tx });
  }

  // ---------- lutadores ----------
  // liga um osso (geometria de altura 1 no eixo Y) entre dois pontos [x, y]
  function liga(m, a, b, z) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    m.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z);
    m.scale.y = Math.hypot(dx, dy) || 0.001;
    m.rotation.z = Math.atan2(dy, dx) - Math.PI / 2;
  }

  function criaLutador(tipo, skin, cor) {
    const g = new THREE.Group(), mats = [];
    const mat = (c, extra) => { const m = new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.55 }, extra)); mats.push(m); return m; };
    const add = (geo, m) => { const mesh = new THREE.Mesh(geo, m); mesh.castShadow = true; g.add(mesh); return mesh; };
    const L = { g, tipo, chave: tipo + ':' + skin, mats, coxa: [], canela: [], braco: [], ante: [], juntas: [] };
    const cabeca = new THREE.Group(); g.add(cabeca); L.cabeca = cabeca;
    const olhos = new THREE.Group(); cabeca.add(olhos); L.olhos = olhos;

    if (tipo === 'blocos' && skin === 'astronauta') {
      // skin do desenho: traje listrado, painel no peito, capacete azul com visor em X
      const traje = mat(0xd9dee8), listra = mat(0x1e3a8a), capacete = mat(0x1d4ed8, { roughness: 0.3, metalness: 0.2 }), bota = mat(0x334155), luva = mat(cor);
      const caixa = (lx, lz) => new THREE.BoxGeometry(lx, 1, lz);
      L.z = { braco: [22, -22], perna: [7, -7] };
      L.tronco = add(caixa(16, 30), traje);
      for (const k of [0, 1]) {
        L.coxa[k] = add(caixa(14, 14), traje); L.canela[k] = add(caixa(14, 14), traje);
        L.braco[k] = add(caixa(13, 13), traje); L.ante[k] = add(caixa(13, 13), traje);
      }
      // listras verticais e painel quadrado no peito (filhos do tronco: escala y acompanha)
      for (const z of [-9, -3, 3, 9]) { const l = new THREE.Mesh(new THREE.BoxGeometry(17, 1.02, 1.6), listra); l.position.z = z; L.tronco.add(l); }
      const painel = new THREE.Mesh(new THREE.BoxGeometry(17.4, 0.3, 9), mat(cor)); painel.position.y = 0.15; L.tronco.add(painel);
      L.juntaGeo = [['joelho', traje, 14], ['cot', traje, 13], ['pe', bota, 15], ['mao', luva, 13]];
      const cubo = new THREE.Mesh(new THREE.BoxGeometry(30, 30, 30), capacete); cubo.castShadow = true; cabeca.add(cubo);
      const visor = new THREE.Mesh(new THREE.BoxGeometry(2, 18, 22), new THREE.MeshStandardMaterial({ color: 0x0b1530, roughness: 0.1, metalness: 0.6 })); visor.position.set(15, 1, 0); cabeca.add(visor);
      const xmat = new THREE.MeshBasicMaterial({ color: 0x93c5fd });
      for (const r of [0.68, -0.68]) { const x = new THREE.Mesh(new THREE.BoxGeometry(1, 24, 2.5), xmat); x.position.set(16.2, 1, 0); x.rotation.x = r; olhos.add(x); }
      const antena = new THREE.Mesh(new THREE.BoxGeometry(2, 8, 2), listra); antena.position.set(-4, 19, 0); cabeca.add(antena);
    } else if (tipo === 'blocos') {
      // estilo Minecraft: pele, camisa na cor do time, calça azul, cabelo
      const pele = mat(0xe0ac69), camisa = mat(cor), calca = mat(0x2f3fb0), sapato = mat(0x3a3a3a), cabelo = mat(0x4a2c17);
      const caixa = (lx, lz) => new THREE.BoxGeometry(lx, 1, lz);
      L.z = { braco: [22, -22], perna: [7, -7] };
      L.tronco = add(caixa(16, 30), camisa);
      for (const k of [0, 1]) {
        L.coxa[k] = add(caixa(14, 14), calca); L.canela[k] = add(caixa(14, 14), calca);
        L.braco[k] = add(caixa(13, 13), camisa); L.ante[k] = add(caixa(13, 13), pele);
      }
      // cubinhos nas juntas pra não abrir buraco quando dobra
      L.juntaGeo = [['joelho', calca, 14], ['cot', pele, 13], ['pe', sapato, 15], ['mao', pele, 13]];
      const cubo = new THREE.Mesh(new THREE.BoxGeometry(28, 28, 28), pele); cubo.castShadow = true; cabeca.add(cubo);
      const topo = new THREE.Mesh(new THREE.BoxGeometry(30, 8, 30), cabelo); topo.position.y = 12; cabeca.add(topo);
      const nuca = new THREE.Mesh(new THREE.BoxGeometry(6, 20, 30), cabelo); nuca.position.set(-12, 2, 0); cabeca.add(nuca);
      const branco = new THREE.MeshBasicMaterial({ color: 0xffffff }), pupila = new THREE.MeshBasicMaterial({ color: 0x3b2a8a });
      for (const z of [-7, 7]) {
        const o = new THREE.Mesh(new THREE.BoxGeometry(2, 5, 7), branco); o.position.set(14.2, 2, z); olhos.add(o);
        const p = new THREE.Mesh(new THREE.BoxGeometry(2.4, 5, 3.5), pupila); p.position.set(14.4, 2, z + (z > 0 ? 1.7 : -1.7)); olhos.add(p);
      }
      const boca = new THREE.Mesh(new THREE.BoxGeometry(2, 3, 10), new THREE.MeshBasicMaterial({ color: 0x7a3b1d })); boca.position.set(14.2, -7, 0); cabeca.add(boca);
    } else {
      // palito: ossos cilíndricos com bolinhas nas juntas
      const corpo = mat(cor, { roughness: 0.35, metalness: 0.1 });
      const osso = () => add(new THREE.CylinderGeometry(4.5, 4.5, 1, 12), corpo);
      L.z = { braco: [11, -11], perna: [6, -6] };
      L.tronco = osso();
      for (const k of [0, 1]) { L.coxa[k] = osso(); L.canela[k] = osso(); L.braco[k] = osso(); L.ante[k] = osso(); }
      L.juntaGeo = [['joelho', corpo, 4.5], ['cot', corpo, 4.5], ['pe', corpo, 5], ['mao', corpo, 7], ['ombro', corpo, 5], ['quadril', corpo, 5]];
      const bola = new THREE.Mesh(new THREE.SphereGeometry(19, 24, 16), corpo); bola.castShadow = true; cabeca.add(bola);
      const branco = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const o = new THREE.Mesh(new THREE.SphereGeometry(4, 12, 8), branco); o.position.set(16, 4, 6); olhos.add(o);
      const o2 = o.clone(); o2.position.z = -6; olhos.add(o2);
    }
    // juntas
    for (const [nome, m, r] of L.juntaGeo) for (const k of (nome === 'ombro' || nome === 'quadril') ? [0] : [0, 1]) {
      const geo = tipo === 'blocos' ? new THREE.BoxGeometry(r, r, r) : new THREE.SphereGeometry(r, 12, 8);
      const mesh = add(geo, m); L.juntas.push({ nome, k, mesh });
    }
    // martelo
    const madeira = new THREE.MeshStandardMaterial({ color: 0x92400e }), ferro = new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 0.6, roughness: 0.3 });
    L.cabo = add(new THREE.CylinderGeometry(3, 3, 1, 8), madeira);
    L.malho = add(new THREE.BoxGeometry(34, 18, 18), ferro);
    // rastro do golpe: arco branco translúcido (raio 1, escalado pelo tamanho do membro)
    L.rastro = new THREE.Mesh(new THREE.RingGeometry(0.72, 1.05, 32, 1, 0, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
    g.add(L.rastro);
    return L;
  }

  const arcos = {}; // geometria do rastro por tamanho de arco
  function posa(L, f, j, t, i) {
    L.g.position.set(f.x, f.y, 0);
    // vira de lado girando (não teleporta); durante o spin do golpe segue direto
    const alvoY = f.facing > 0 ? 0 : Math.PI;
    if (L.rotY === undefined) L.rotY = alvoY;
    L.rotY += (alvoY - L.rotY) * (1 - Math.exp(-(L.dt || 16) / 55));
    L.g.rotation.y = L.rotY + j.spin;
    liga(L.tronco, j.quadril, j.ombro, 0);
    // torção: o tronco gira e o braço da frente avança no golpe (o de trás recua)
    const tor = Math.max(-1, Math.min(1, j.torcao));
    L.tronco.rotation.y = tor * 0.45;
    const zb = [L.z.braco[0] - tor * (L.z.braco[0] * 0.55), L.z.braco[1] - tor * (L.z.braco[1] * 0.25)];
    for (const k of [0, 1]) {
      liga(L.coxa[k], j.quadril, j.joelho[k], L.z.perna[k]); liga(L.canela[k], j.joelho[k], j.pe[k], L.z.perna[k]);
      liga(L.braco[k], j.ombro, j.cot[k], zb[k]); liga(L.ante[k], j.cot[k], j.mao[k], zb[k]);
    }
    for (const { nome, k, mesh } of L.juntas) {
      const pt = nome === 'ombro' ? j.ombro : nome === 'quadril' ? j.quadril : j[nome][k];
      const z = nome === 'joelho' || nome === 'pe' ? L.z.perna[k] : nome === 'ombro' || nome === 'quadril' ? 0 : zb[k];
      mesh.position.set(pt[0], pt[1], z);
      if (L.tipo === 'blocos') mesh.rotation.z = (nome === 'joelho' || nome === 'pe' ? L.coxa[k] : L.ante[k]).rotation.z;
    }
    L.cabeca.position.set(j.cabeca[0], j.cabeca[1] + (L.tipo === 'blocos' ? 4 : 0), 0);
    L.cabeca.rotation.z = -rad(j.angCabeca);
    const pisca = (t + i * 1700) % 3200 < 120 || f.hp === 0;
    L.olhos.scale.y = pisca ? 0.15 : 1;
    // martelo
    const comMartelo = f.martelo > 0;
    L.cabo.visible = L.malho.visible = comMartelo;
    if (comMartelo) {
      liga(L.cabo, j.mao[0], j.ponta, zb[0]);
      L.malho.position.set(j.ponta[0], j.ponta[1], zb[0]); L.malho.rotation.z = L.cabo.rotation.z;
    }
    // rastro: aparece na hora em que o golpe acerta. [centro, raio, ângulo inicial, tamanho do arco] (radianos, 0 = pra frente)
    const R = {
      socoAlto: ['ombro', 66, -0.9, 1.1], socoBaixo: ['ombro', 64, -1.2, 1.1], socoAgachado: ['ombro', 64, -1.2, 1.1], socoAereo: ['ombro', 66, -0.9, 1.3],
      chuteAlto: ['quadril', 70, -1.3, 2.2], chuteBaixo: ['quadril', 68, -1.4, 1.3], chuteAgachado: ['quadril', 68, -1.0, 1.0],
      gancho: ['ombro', 68, -1.6, 3.0], martelada: ['ombro', 80, -0.2, 1.9], giro: ['quadril', 72, -0.6, 1.6], rasteira: ['quadril', 72, -1.65, 0.9],
      voadora: ['quadril', 70, -0.9, 0.6], magia: ['ombro', 64, -0.3, 0.6],
    }[f.acao];
    const vis = R && j.u > 0.3 && j.u < 0.7;
    L.rastro.visible = !!vis;
    if (vis) {
      const c = R[0] === 'ombro' ? j.ombro : j.quadril, z = R[0] === 'ombro' ? zb[0] : L.z.perna[0];
      L.rastro.position.set(c[0], c[1], z + 1);
      L.rastro.scale.setScalar(R[1]);
      // gancho e martelada desenham o arco de baixo pra cima / de cima pra baixo
      L.rastro.rotation.set(0, 0, R[2]);
      L.rastro.geometry = arcos[R[3]] || (arcos[R[3]] = new THREE.RingGeometry(0.72, 1.05, 24, 1, 0, R[3]));
      L.rastro.material.opacity = 0.55 * Math.sin((j.u - 0.3) / 0.4 * Math.PI);
    }
    // brilho: piscar branco ao apanhar, arco-íris com estrela
    const em = new THREE.Color(0, 0, 0);
    if (j.flash) em.setRGB(0.45, 0.45, 0.45);
    else if (f.estrela > 0) em.setHSL((t / 1000) % 1, 1, 0.35);
    for (const m of L.mats) m.emissive.copy(em);
  }

  // ---------- bolas de fogo ----------
  const fogos = [0, 1, 2, 3].map(() => {
    const g = new THREE.Group();
    const nucleo = new THREE.Mesh(new THREE.SphereGeometry(10, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff3b0 }));
    const aura = new THREE.Mesh(new THREE.SphereGeometry(19, 16, 12), new THREE.MeshBasicMaterial({ color: 0xff8a00, transparent: true, opacity: 0.45, depthWrite: false }));
    const luz = new THREE.PointLight(0xff8a2a, 4, 320, 0);
    g.add(nucleo, aura, luz); g.visible = false; scene.add(g);
    return { g, aura };
  });

  // ---------- itens (emoji em sprite) ----------
  const EMOJI = { comida: '🍗', estrela: '⭐', martelo: '🔨' }, texEmoji = {};
  function spriteItem(tipo) {
    if (!texEmoji[tipo]) {
      const c = document.createElement('canvas'); c.width = c.height = 128;
      const g = c.getContext('2d'); g.font = '100px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(EMOJI[tipo], 64, 70);
      texEmoji[tipo] = new THREE.CanvasTexture(c); texEmoji[tipo].colorSpace = THREE.SRGBColorSpace;
    }
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: texEmoji[tipo] })); sp.scale.set(42, 42, 1); scene.add(sp); return sp;
  }
  const itensVis = new Map();

  // ---------- quadro ----------
  const L = [null, null];
  let camX = 400, camZ = 520, w0 = 0, h0 = 0;
  window.R3D = {
    frame(vis, js, perfis, t, tremor) {
      const w = cv3.clientWidth, h = cv3.clientHeight;
      if (!w || !h) return;
      if (w !== w0 || h !== h0) { w0 = w; h0 = h; renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
      vis.p.forEach((f, i) => {
        const tipo = (perfis && perfis[i] && perfis[i].visual) || 'palito';
        const skin = (perfis && perfis[i] && perfis[i].skins && perfis[i].skins[tipo]) || 'padrao';
        if (!L[i] || L[i].chave !== tipo + ':' + skin) { if (L[i]) scene.remove(L[i].g); L[i] = criaLutador(tipo, skin, CORES[i]); scene.add(L[i].g); }
        L[i].cabeca.visible = !f.decapitado; // fatality da espada: cabeça sai voando (desenhada no HUD)
        L[i].g.visible = !f.explodiu && !f.esmagado; // fatality: o corpo vira pedaços (desenhados no HUD)
        L[i].dt = Math.min(50, t - (L[i].tAnt || t)); L[i].tAnt = t;
        posa(L[i], f, js[i], t, i);
      });
      fogos.forEach((fg, n) => {
        const m = vis.magias[n]; fg.g.visible = !!m;
        if (m) { fg.g.position.set(m.x, m.y, 0); fg.aura.material.color.setHex(CORES[m.dono]); fg.aura.scale.setScalar(1 + Math.sin(t / 60) * 0.15); }
      });
      const vivos = new Set();
      for (const it of vis.itens) {
        vivos.add(it.id);
        if (!itensVis.has(it.id)) itensVis.set(it.id, spriteItem(it.tipo));
        const sp = itensVis.get(it.id);
        sp.position.set(it.x, it.y + 22 + (it.y === 0 ? Math.sin(t / 250 + it.id) * 4 : 0), 0);
        sp.visible = !(it.vida < 90 && Math.floor(t / 100) % 2);
      }
      for (const [id, sp] of itensVis) if (!vivos.has(id)) { scene.remove(sp); sp.material.dispose(); itensVis.delete(id); }
      for (const tc of tochas) {
        const tr = Math.sin(t / 400 + tc.fase) * 0.15 + (Math.random() < 0.01 ? -0.4 : 0); // pulsa e às vezes falha
        tc.luz.intensity = 3 + tr * 4; tc.halo.material.opacity = 0.7 + tr;
      }
      for (const p of pisca) p.luz.material.opacity = Math.sin(t / 300 + p.fase) > 0.6 ? 0.95 : 0.05;
      for (const o of cidade.children) { o.position.x -= 0.9; if (o.position.x < -2200) o.position.x += 5200; }
      for (const c of carros) { c.g.position.x += c.v * 16; if (c.g.position.x > 2400) c.g.position.x = -1600; if (c.g.position.x < -1600) c.g.position.x = 2400; }
      // câmera segue o meio da luta e afasta quando os dois se afastam
      const [a, b] = vis.p, meio = (a.x + b.x) / 2, dist = Math.abs(a.x - b.x);
      // distância que enquadra os dois com folga, considerando o formato da tela
      const meiaLarg = Math.max(190, dist / 2 + 120), tanH = Math.tan(rad(19)) * camera.aspect;
      const alvoZ = Math.max(meiaLarg / tanH, 150 / Math.tan(rad(19)));
      camX += (Math.max(meiaLarg - 40, Math.min(840 - meiaLarg, meio)) - camX) * 0.08;
      camZ += (alvoZ - camZ) * 0.08;
      const sh = tremor ? (Math.random() - 0.5) * tremor * 1.2 : 0, sv = tremor ? (Math.random() - 0.5) * tremor * 1.2 : 0;
      camera.position.set(camX + sh, 125 + sv, camZ);
      camera.lookAt(camX, 100, 0);
      renderer.render(scene, camera);
    },
    // posição do mundo (x, y, z=0) → pixel no canvas 2D de cima (HUD)
    projeta(x, y, w, h) {
      const v = new THREE.Vector3(x, y, 0).project(camera);
      return [(v.x + 1) / 2 * w, (1 - v.y) / 2 * h];
    },
  };
}

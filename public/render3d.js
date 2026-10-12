// Renderizador 3D (Three.js). A lógica da luta continua no servidor; aqui só desenha.
// Mundo: x 0..800 (arena), y pra cima (0 = chão), z = profundidade (câmera em z positivo).
import * as THREE from '/vendor/three.module.min.js';
import { criaElementos } from '/elementos3d.js';

// Modelos opcionais em public/modelos/. Se o GLB não carregar, mantém o lutador procedural.
const modelosGLB = fetch('/modelos/manifest.json').then(r => r.ok ? r.json() : {}).catch(() => ({}));
let loaderGLTF;
const carregaModeloGLTF = async url => {
  if (!loaderGLTF) {
    const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
    loaderGLTF = new GLTFLoader();
  }
  return loaderGLTF.loadAsync(url);
};
const nomeAnimacao = s => (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

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
  const hemi = new THREE.HemisphereLight(0x9d8bff, 0x1a0820, 1.0); scene.add(hemi);
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
  const bordasNeon = [];
  for (const z of [130, -130]) { const b = new THREE.Mesh(new THREE.BoxGeometry(900, 2, 2), neonCiano); b.position.set(400, 0.6, z); scene.add(b); bordasNeon.push(b); }

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
  const postesNeon = [];
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
    postesNeon.push(g);
    tochas.push({ halo, luz, fase: tx });
  }

  // Praia de Copacabana: calçadão de ondas, faixa de areia, mar e prédios da orla.
  const neonCena = [ceu, chao, plataforma, ...bordasNeon, ...postesNeon, ...carros.map(c => c.g)];
  const brasil = new THREE.Group(); scene.add(brasil);
  const mat = (cor, roughness = 0.9) => new THREE.MeshStandardMaterial({ color: cor, roughness });
  const areia = mat(0xd8bd83), pedra = mat(0xe8e4d7), preta = mat(0x303439), mar = mat(0x287f99, 0.38);
  function caixa(w, h, d, material, x, y, z, pai = brasil) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
    m.position.set(x, y, z); m.receiveShadow = true; pai.add(m); return m;
  }
  caixa(8400, 3, 3600, areia, 400, -5, -1000);
  caixa(920, 5, 255, pedra, 400, -2, 0);
  // Mosaico preto e branco em faixas onduladas, típico do calçadão.
  for (let z = -105; z <= 105; z += 22) {
    const pontos = [];
    for (let x = -50; x <= 850; x += 12) pontos.push(new THREE.Vector3(x, 1.2, z + Math.sin(x / 55 + z / 32) * 8));
    const curva = new THREE.CatmullRomCurve3(pontos);
    brasil.add(new THREE.Mesh(new THREE.TubeGeometry(curva, 76, 3.2, 5, false), preta));
  }
  caixa(8400, 2, 1350, mar, 400, -2, -2170);
  const espuma = new THREE.MeshBasicMaterial({ color: 0xe5f7f5, transparent: true, opacity: 0.65, depthWrite: false });
  const ondasPraia = [];
  for (let i = 0; i < 10; i++) {
    const pontos = [];
    for (let x = -1800; x <= 2600; x += 80) pontos.push(new THREE.Vector3(x, 0.1, -1485 - i * 88 + Math.sin(x / 95 + i * 1.7) * (5 + i * 0.7)));
    const onda = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pontos), 100, 1.5 + i * 0.35, 3, false), espuma.clone());
    brasil.add(onda); ondasPraia.push(onda);
  }
  const reflexos = [], reflexoMat = new THREE.MeshBasicMaterial({ color: 0xc7ebdf, transparent: true, opacity: 0.36, depthWrite: false });
  for (let i = 0; i < 38; i++) {
    const r = new THREE.Mesh(new THREE.PlaneGeometry(18 + rnd() * 75, 1 + rnd() * 3), reflexoMat.clone());
    r.rotation.x = -Math.PI / 2; r.position.set(-1400 + rnd() * 3600, 0.2, -1530 - rnd() * 1030);
    brasil.add(r); reflexos.push({ mesh: r, fase: rnd() * 6.28 });
  }
  const predios = [0xf0e4cf, 0xd6d0bb, 0xb9c5bd, 0xe9d7bd].map(c => mat(c));
  const vidro = mat(0x557987, 0.3);
  for (let i = 0; i < 29; i++) {
    const x = -1600 + i * 145, h = 220 + (i * 73 % 180), z = -1050 - (i % 3) * 35;
    caixa(112, h, 86, predios[i % 4], x, h / 2 - 8, z);
    for (let y = 35; y < h - 15; y += 32) for (let dx = -40; dx <= 40; dx += 26) caixa(16, 19, 1, vidro, x + dx, y, z + 44);
  }
  const tronco = mat(0x766344), folha = mat(0x3c7650);
  for (const x of [-20, 820]) {
    caixa(8, 105, 8, tronco, x, 48, -170);
    const copa = new THREE.Mesh(new THREE.SphereGeometry(35, 10, 7), folha); copa.scale.set(1.3, 0.55, 0.7); copa.position.set(x, 110, -170); brasil.add(copa);
  }
  // Quiosques, guarda-sóis e coqueiros ocupam a faixa de areia atrás da luta.
  const lona = [0xd15046, 0xf3dfb0, 0x3b8b9b], metalPraia = mat(0xb7b1a0, 0.65);
  for (const x of [-700, -360, 1000, 1360]) {
    const z = -370 - (Math.abs(x) % 3) * 35;
    const haste = new THREE.Mesh(new THREE.CylinderGeometry(2, 2.5, 95, 8), metalPraia); haste.position.set(x, 43, z); brasil.add(haste);
    const cobertura = new THREE.Mesh(new THREE.ConeGeometry(50, 18, 8), mat(lona[Math.abs(x / 20) % 3])); cobertura.position.set(x, 99, z); cobertura.castShadow = true; brasil.add(cobertura);
    for (const dx of [-20, 20]) caixa(25, 3, 28, mat(0x497682), x + dx, 5, z + 48);
  }
  for (const x of [-1020, 1560]) {
    const g = new THREE.Group(); g.position.set(x, 0, -620); brasil.add(g);
    caixa(100, 55, 70, mat(0xb28e67), 0, 27, 0, g);
    const teto = new THREE.Mesh(new THREE.ConeGeometry(90, 40, 4), mat(0xb45e43)); teto.position.y = 75; teto.rotation.y = Math.PI / 4; g.add(teto);
    caixa(55, 4, 20, pedra, 0, 39, 46, g);
  }
  const folhasPalma = mat(0x357454), coqueiros = [];
  for (const x of [-850, -480, 1190, 1740]) {
    const g = new THREE.Group(); g.position.set(x, 0, -530); brasil.add(g);
    const t = new THREE.Mesh(new THREE.CylinderGeometry(5, 8, 145, 8), tronco); t.position.y = 72; t.rotation.z = 0.09; g.add(t);
    const copa = new THREE.Group(); copa.position.set(-7, 145, 0); g.add(copa);
    for (let k = 0; k < 7; k++) { const f = new THREE.Mesh(new THREE.ConeGeometry(11, 90, 5), folhasPalma); f.position.set(Math.cos(k * 6.28 / 7) * 35, -9, Math.sin(k * 6.28 / 7) * 35); f.rotation.z = Math.PI / 2; f.rotation.y = k * 6.28 / 7; copa.add(f); }
    coqueiros.push({ copa, fase: x });
  }
  const barcos = [];
  for (const [x, z, escala] of [[-1000, -1950, 1], [1650, -2150, 0.75]]) {
    const g = new THREE.Group(); g.position.set(x, 5, z); g.scale.setScalar(escala); brasil.add(g);
    const cascoBarco = new THREE.Mesh(new THREE.CylinderGeometry(4, 12, 65, 3), mat(0xf5eee1)); cascoBarco.rotation.z = Math.PI / 2; g.add(cascoBarco);
    const vela = new THREE.Mesh(new THREE.ConeGeometry(25, 75, 3), mat(0xfff8e8)); vela.position.y = 43; vela.rotation.y = Math.PI / 2; g.add(vela);
    barcos.push({ g, x });
  }
  const passaros = [];
  const asaMat = new THREE.MeshBasicMaterial({ color: 0x425f66, side: THREE.DoubleSide });
  for (let i = 0; i < 7; i++) {
    const g = new THREE.Group(); g.position.set(-1000 + i * 330, 270 + (i % 3) * 34, -900 - i * 90); brasil.add(g);
    for (const lado of [-1, 1]) { const asa = new THREE.Mesh(new THREE.ConeGeometry(8, 35, 3), asaMat); asa.rotation.z = lado * Math.PI / 2; asa.position.x = lado * 13; g.add(asa); }
    passaros.push({ g, fase: i * 0.8 });
  }
  const brasilCeu = new THREE.Mesh(new THREE.PlaneGeometry(6400, 3200), new THREE.MeshBasicMaterial({ color: 0x8ec6dd, fog: false }));
  brasilCeu.position.set(400, 700, -2700); brasil.add(brasilCeu);

  // Outros destinos: cada grupo tem seu próprio piso e silhueta de fundo.
  const palcos = {};
  function texturaDestino(tipo) {
    const c = document.createElement('canvas'); c.width = 2048; c.height = 1024;
    const x = c.getContext('2d');
    const grad = x.createLinearGradient(0, 0, 0, 1024);
    const paletas = {
      tokyo: ['#111c42', '#4d3972', '#e98b94'], cairo: ['#34344e', '#c76f48', '#f4c77c'],
      paris: ['#34476e', '#a17a91', '#f4bf9b'], nyc: ['#18304d', '#e27755', '#ffc078'],
      antarctica: ['#061b3c', '#145878', '#65d5c1'],
    };
    const pal = paletas[tipo]; grad.addColorStop(0, pal[0]); grad.addColorStop(0.57, pal[1]); grad.addColorStop(1, pal[2]);
    x.fillStyle = grad; x.fillRect(0, 0, c.width, c.height);
    // halos de luz e estrelas dão profundidade sem competir com os personagens.
    const glow = x.createRadialGradient(1450, 390, 8, 1450, 390, 360);
    glow.addColorStop(0, tipo === 'antarctica' ? '#72ffe588' : '#ffe4ae99'); glow.addColorStop(1, '#ffffff00');
    x.fillStyle = glow; x.fillRect(1000, 0, 900, 850);
    for (let i = 0; i < 140; i++) { const px = (i * 317) % 2048, py = (i * 191) % 530; x.globalAlpha = 0.15 + (i % 7) * 0.08; x.fillStyle = '#fff'; x.beginPath(); x.arc(px, py, 1 + i % 3, 0, Math.PI * 2); x.fill(); }
    x.globalAlpha = 1;
    if (tipo === 'tokyo') {
      // Céu de hora azul, Fuji compacto e horizonte de Tóquio em camadas.
      x.fillStyle = '#f8dce0'; x.beginPath(); x.arc(1510, 360, 74, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#8991ae'; x.beginPath(); x.moveTo(900, 755); x.lineTo(1050, 535); x.lineTo(1115, 580); x.lineTo(1195, 550); x.lineTo(1300, 755); x.fill();
      x.fillStyle = '#f0e9e8'; x.beginPath(); x.moveTo(1018, 581); x.lineTo(1050, 535); x.lineTo(1090, 566); x.lineTo(1070, 568); x.lineTo(1054, 585); x.lineTo(1038, 567); x.closePath(); x.fill();
      // Nuvens finas e colinas distantes em rosa escuro.
      x.fillStyle = '#986b83'; x.beginPath(); x.moveTo(0, 760); x.quadraticCurveTo(390, 675, 790, 760); x.quadraticCurveTo(1410, 690, 2048, 750); x.lineTo(2048, 1024); x.lineTo(0, 1024); x.fill();
      for (let i = 0; i < 27; i++) {
        const bx = i * 80 - 18, bh = 55 + (i * 61 % 110), bw = 58 + i % 3 * 7, top = 785 - bh;
        const facade = x.createLinearGradient(bx, top, bx + bw, top + bh); facade.addColorStop(0, i % 2 ? '#38354f' : '#414258'); facade.addColorStop(1, '#242a43');
        x.fillStyle = facade; x.fillRect(bx, top, bw, bh + 250);
        x.fillStyle = '#ffcc8c'; x.globalAlpha = 0.58;
        for (let wy = top + 15; wy < 790; wy += 29) for (let wx = bx + 9; wx < bx + bw - 7; wx += 17) if ((wx + wy + i) % 3) x.fillRect(wx, wy, 5, 9);
        x.globalAlpha = 1; x.fillStyle = '#ee8492'; x.fillRect(bx, top, bw, 3);
      }
      x.strokeStyle = '#ff8290'; x.lineWidth = 4; x.beginPath(); x.moveTo(0, 790); x.lineTo(2048, 790); x.stroke();
    } else if (tipo === 'cairo') {
      x.fillStyle = '#ffe3a2'; x.beginPath(); x.arc(1510, 350, 118, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#b77b56'; x.beginPath(); x.moveTo(0, 800); x.lineTo(380, 800); x.lineTo(700, 455); x.lineTo(1020, 800); x.lineTo(1130, 800); x.lineTo(1435, 350); x.lineTo(1770, 800); x.lineTo(2048, 800); x.lineTo(2048, 1024); x.lineTo(0, 1024); x.fill();
      x.fillStyle = '#9d684f'; x.beginPath(); x.moveTo(0, 850); x.quadraticCurveTo(500, 700, 970, 870); x.quadraticCurveTo(1430, 1020, 2048, 820); x.lineTo(2048, 1024); x.lineTo(0, 1024); x.fill();
      x.strokeStyle = '#e4b979'; x.lineWidth = 9; for (const [a, b, d] of [[380, 800, 700], [1435, 350, 1770]]) { x.beginPath(); x.moveTo(a, 800); x.lineTo(b, b === 350 ? 350 : 455); x.lineTo(d, 800); x.stroke(); }
    } else if (tipo === 'paris') {
      x.fillStyle = '#ffe2bc'; x.beginPath(); x.arc(1460, 405, 86, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#4a5068';
      for (let i = 0; i < 25; i++) { const bx = i * 86, bh = 60 + (i * 61 % 110); x.fillRect(bx, 800 - bh, 78, bh + 250); x.fillStyle = '#676178'; x.fillRect(bx + 6, 800 - bh - 18, 66, 18); x.fillStyle = '#4a5068'; }
      x.strokeStyle = '#4a3f49'; x.lineWidth = 8; x.beginPath(); x.moveTo(1055, 795); x.lineTo(1125, 500); x.lineTo(1170, 500); x.lineTo(1240, 795); x.moveTo(1075, 710); x.lineTo(1220, 710); x.moveTo(1095, 620); x.lineTo(1200, 620); x.moveTo(1110, 550); x.lineTo(1185, 550); x.moveTo(1145, 500); x.lineTo(1145, 390); x.stroke();
      x.strokeStyle = '#3a4258'; x.lineWidth = 8; x.beginPath(); x.moveTo(0, 810); x.quadraticCurveTo(1024, 770, 2048, 810); x.stroke();
      x.fillStyle = '#f5d0a4'; for (let i = 0; i < 34; i++) x.fillRect(i * 64, 840 + (i % 3) * 24, 7, 10);
    } else if (tipo === 'nyc') {
      x.fillStyle = '#ffd48b'; x.beginPath(); x.arc(1500, 420, 100, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#26364d';
      for (let i = 0; i < 34; i++) { const bx = i * 63, bh = 100 + (i * 97 % 390); x.fillRect(bx, 800 - bh, 58, bh + 240); if (i % 4 === 0) { x.beginPath(); x.moveTo(bx, 800 - bh); x.lineTo(bx + 29, 760 - bh); x.lineTo(bx + 58, 800 - bh); x.fill(); } }
      x.strokeStyle = '#d3a477'; x.lineWidth = 7; x.beginPath(); x.moveTo(0, 770); x.lineTo(2048, 770); x.moveTo(260, 520); x.lineTo(260, 960); x.moveTo(1780, 520); x.lineTo(1780, 960); x.moveTo(260, 540); x.quadraticCurveTo(1024, 980, 1780, 540); x.stroke();
      x.fillStyle = '#c8b48e'; x.fillRect(1735, 625, 90, 80); x.fillRect(1760, 560, 40, 70); x.beginPath(); x.arc(1780, 530, 18, 0, Math.PI * 2); x.fill();
    } else {
      // Faixas onduladas de aurora por cima de montanhas azuis e gelo.
      for (let i = 0; i < 6; i++) { x.beginPath(); x.moveTo(-100, 240 + i * 42); x.bezierCurveTo(460, 80 + i * 25, 880, 580 + i * 30, 1420, 220 + i * 36); x.bezierCurveTo(1670, 60 + i * 30, 1840, 130 + i * 35, 2160, 240 + i * 42); x.strokeStyle = `rgba(${45 + i * 9},${210 + i * 4},${180 + i * 8},${0.16 - i * 0.012})`; x.lineWidth = 35; x.stroke(); }
      x.fillStyle = '#1a4564'; x.beginPath(); x.moveTo(0, 780); for (let i = 0; i <= 12; i++) x.lineTo(i * 180, 500 + (i * 137 % 180)); x.lineTo(2048, 920); x.lineTo(0, 920); x.fill();
      x.fillStyle = '#a8dce7'; x.beginPath(); x.moveTo(0, 830); for (let i = 0; i <= 12; i++) x.lineTo(i * 180, 610 + (i * 91 % 130)); x.lineTo(2048, 950); x.lineTo(0, 950); x.fill();
      x.fillStyle = '#e4f5f3'; x.fillRect(0, 900, 2048, 124);
    }
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; return tex;
  }
  function texturaArena(tipo) {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 320; const x = c.getContext('2d');
    const fundos = { tokyo: '#303040', cairo: '#a98254', paris: '#55545d', nyc: '#263440', antarctica: '#b8dce3' };
    x.fillStyle = fundos[tipo]; x.fillRect(0, 0, c.width, c.height);
    if (tipo === 'tokyo' || tipo === 'paris') {
      x.strokeStyle = tipo === 'tokyo' ? '#514354' : '#77717a'; x.lineWidth = 3;
      for (let y = 0; y <= 320; y += 40) { x.beginPath(); x.moveTo(0, y); x.lineTo(1024, y); x.stroke(); }
      for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) { const xx = col * 144 + (row % 2) * 72; x.beginPath(); x.moveTo(xx, row * 40); x.lineTo(xx, row * 40 + 40); x.stroke(); }
      if (tipo === 'tokyo') { x.strokeStyle = '#bd5966'; x.lineWidth = 6; x.beginPath(); x.arc(512, 160, 68, 0, Math.PI * 2); x.stroke(); x.beginPath(); x.arc(512, 160, 49, 0, Math.PI * 2); x.stroke(); }
      else { x.strokeStyle = '#c7ad8a'; x.lineWidth = 5; x.beginPath(); x.arc(512, 160, 70, 0, Math.PI * 2); x.stroke(); x.beginPath(); x.moveTo(512, 90); x.lineTo(512, 230); x.moveTo(442, 160); x.lineTo(582, 160); x.stroke(); }
    } else if (tipo === 'cairo') {
      x.strokeStyle = '#d1b184'; x.lineWidth = 4;
      for (let y = 0; y < 320; y += 52) { const shift = (y / 52 % 2) * 40; x.beginPath(); x.moveTo(0, y); x.lineTo(1024, y); x.stroke(); for (let xx = shift; xx < 1024; xx += 80) { x.beginPath(); x.moveTo(xx, y); x.lineTo(xx, y + 52); x.stroke(); } }
      x.strokeStyle = '#e5bf7c'; x.lineWidth = 6; x.beginPath(); x.moveTo(0, 18); x.lineTo(1024, 18); x.moveTo(0, 302); x.lineTo(1024, 302); x.stroke();
    } else if (tipo === 'nyc') {
      x.strokeStyle = '#465864'; x.lineWidth = 3;
      for (let y = 22; y < 320; y += 38) { x.beginPath(); x.moveTo(0, y); x.lineTo(1024, y); x.stroke(); }
      x.fillStyle = '#e6c878'; for (let xx = 18; xx < 1024; xx += 120) x.fillRect(xx, 154, 58, 10);
      x.strokeStyle = '#68808d'; x.lineWidth = 5; x.strokeRect(8, 8, 1008, 304);
    } else {
      x.strokeStyle = '#85c3d3'; x.lineWidth = 5;
      for (let i = 0; i < 22; i++) { const xx = i * 67; x.beginPath(); x.moveTo(xx, 0); x.lineTo(xx + (i % 2 ? 18 : -18), 320); x.stroke(); }
      for (let y = 25; y < 320; y += 74) { x.beginPath(); x.moveTo(0, y); x.lineTo(1024, y + 12); x.stroke(); }
      x.strokeStyle = '#e8ffff'; x.lineWidth = 7; x.strokeRect(8, 8, 1008, 304);
    }
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; return tex;
  }
  function criaPalco(nome, cfg) {
    const g = new THREE.Group(); scene.add(g); palcos[nome] = g;
    const anim = { flutua: [], gira: [], pulsa: [], move: [], particulas: [] }; g.userData.anim = anim;
    const material = (cor, metalness = 0, roughness = 0.85, emissive = 0) => new THREE.MeshStandardMaterial({ color: cor, metalness, roughness, emissive });
    const add = (geo, m, x, y, z, pai = g) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; pai.add(o); return o; };
    const ground = material(cfg.ground), trim = new THREE.MeshBasicMaterial({ color: cfg.trim });
    add(new THREE.BoxGeometry(8400, 3, 3600), ground, 400, -5, -1000);
    add(new THREE.BoxGeometry(920, 7, 260), material(cfg.floor, 0.4), 400, -1, 0);
    const pisoDetalhado = new THREE.Mesh(new THREE.PlaneGeometry(900, 240), new THREE.MeshStandardMaterial({ map: texturaArena(cfg.kind), roughness: 0.76, metalness: cfg.kind === 'nyc' ? 0.28 : 0.08 }));
    pisoDetalhado.rotation.x = -Math.PI / 2; pisoDetalhado.position.set(400, 2.65, 0); pisoDetalhado.receiveShadow = true; g.add(pisoDetalhado);
    for (const z of [-130, 130]) add(new THREE.BoxGeometry(900, 2, 3), trim, 400, 2, z);
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(6400, 3200), new THREE.MeshBasicMaterial({ map: texturaDestino(cfg.kind), fog: false })); sky.position.set(400, 700, -2700); g.add(sky);
    if (cfg.kind === 'tokyo') {
      // Pagode, monte Fuji e lanternas vermelhas.
      const dark = material(0x31252d), roof = material(0x9e293c);
      for (let level = 0; level < 4; level++) {
        const y = 55 + level * 48, w = 190 - level * 34;
        add(new THREE.BoxGeometry(w * 0.48, 48, 110), dark, 400, y, -1080);
        const tel = add(new THREE.ConeGeometry(w * 0.78, 38, 4), roof, 400, y + 35, -1080); tel.rotation.y = Math.PI / 4;
      }
      for (const x of [250, 550]) { add(new THREE.CylinderGeometry(5, 7, 150, 8), material(0xb43843), x - 42, 75, -720); add(new THREE.CylinderGeometry(5, 7, 150, 8), material(0xb43843), x + 42, 75, -720); add(new THREE.BoxGeometry(126, 13, 18), material(0xb43843), x, 150, -720); }
      for (const x of [110, 690]) { add(new THREE.CylinderGeometry(16, 22, 105, 12), material(0x3a2528), x, 53, -370); const lamp = add(new THREE.SphereGeometry(39, 14, 10), material(0xf04755, 0, 0.3, 0x8e101e), x, 112, -370); anim.pulsa.push({ o: lamp, base: x / 400 }); }
      // Letreiros, lanternas pulsantes e pétalas sopradas pelo vento.
      for (let i = 0; i < 5; i++) { const sign = add(new THREE.BoxGeometry(36, 175, 8), material(i % 2 ? 0x22c9e8 : 0xf3466b, 0.1, 0.22, i % 2 ? 0x08748b : 0x8e102e), -1500 + i * 690, 125, -415); anim.pulsa.push({ o: sign, base: 0.25 + i * 0.1 }); }
      for (let i = 0; i < 6; i++) { const lamp = add(new THREE.SphereGeometry(39, 14, 10), material(0xf04755, 0, 0.3, 0x8e101e), -1500 + i * 600, 112, -370); anim.pulsa.push({ o: lamp, base: i * 0.7 }); }
      for (let i = 0; i < 20; i++) { const p = add(new THREE.SphereGeometry(4, 7, 5), material(0xffb6c8), -1400 + (i * 271) % 2800, 120 + (i * 37) % 280, -300 - (i * 93) % 500); anim.particulas.push({ o: p, x: p.position.x, y: p.position.y, fase: i * 0.9, tipo: 'petala' }); }
    } else if (cfg.kind === 'cairo') {
      const sand = material(0xcaa96e), stone = material(0xd8bd83);
      for (const [x, z, s] of [[210, -1550, 0.82], [430, -1750, 1.2], [665, -1500, 0.68]]) { const p = add(new THREE.ConeGeometry(290 * s, 410 * s, 4), sand, x, 205 * s, z); p.rotation.y = Math.PI / 4; }
      // Esfinge estilizada diante das pirâmides.
      const sph = add(new THREE.BoxGeometry(260, 70, 80), stone, 650, 38, -1000); sph.rotation.z = -0.04;
      add(new THREE.BoxGeometry(55, 115, 58), stone, 735, 125, -1000);
      add(new THREE.BoxGeometry(66, 18, 72), sand, 735, 190, -1000);
      // Templo de colunas e obelisco para compor a avenida antiga.
      add(new THREE.BoxGeometry(490, 28, 115), stone, 400, 225, -1200);
      add(new THREE.BoxGeometry(520, 18, 140), material(0xb89a6e), 400, 245, -1200);
      for (let i = 0; i < 7; i++) { const x = 175 + i * 75; add(new THREE.CylinderGeometry(13, 18, 175, 12), material(0xe0c99c), x, 125, -1215); add(new THREE.CylinderGeometry(23, 22, 12, 12), material(0xb89a6e), x, 216, -1215); }
      const obelisco = add(new THREE.CylinderGeometry(9, 25, 260, 4), material(0xd3b986), 690, 130, -900); obelisco.rotation.z = 0.02; add(new THREE.ConeGeometry(18, 42, 4), material(0x9d793d), 690, 283, -900);
      for (let i = 0; i < 8; i++) { const x = -2100 + i * 600; add(new THREE.CylinderGeometry(5, 10, 190, 8), material(0x795e3e), x, 95, -300 - (i % 2) * 80); add(new THREE.ConeGeometry(38, 50, 4), material(0xb89557), x, 210, -300 - (i % 2) * 80); }
      for (const x of [80, 720]) { add(new THREE.CylinderGeometry(5, 8, 170, 8), material(0x805d38), x, 85, -480); const tent = add(new THREE.ConeGeometry(125, 115, 4), material(0x8a4736), x, 155, -480); tent.rotation.y = Math.PI / 4; }
      for (let i = 0; i < 24; i++) { const d = add(new THREE.SphereGeometry(2 + i % 3, 5, 4), material(0xffd27b, 0, 0.25, 0x9c5828), -1900 + (i * 311) % 3800, 25 + (i * 67) % 250, -180 - (i * 47) % 500); anim.particulas.push({ o: d, x: d.position.x, y: d.position.y, fase: i * 0.72, tipo: 'poeira' }); }
    } else if (cfg.kind === 'paris') {
      const iron = material(0x493b32, 0.65), warm = material(0xffd88a, 0, 0.3, 0x80511e);
      // A torre no horizonte fica na ilustração do céu; os postes e luzes dão escala à praça.
      for (const x of [145, 655]) { const poste = add(new THREE.CylinderGeometry(5, 8, 125, 10), iron, x, 62, -260); poste.rotation.z = x < 400 ? -0.025 : 0.025; const lamp = add(new THREE.SphereGeometry(21, 12, 9), warm, x, 130, -260); anim.pulsa.push({ o: lamp, base: x / 210 }); }
      // Rua de pedra, canteiros e ponte sobre o Sena.
      add(new THREE.BoxGeometry(920, 2, 310), material(0x4c4847), 400, 0, 0);
      for (const x of [-440, 1240]) { add(new THREE.BoxGeometry(180, 7, 260), material(0x425c44), x, 3, -210); for (let i = 0; i < 5; i++) add(new THREE.SphereGeometry(16, 8, 6), material(0x5a8a4e), x - 60 + i * 30, 16, -210); }
      for (const x of [-720, 1120]) { add(new THREE.CylinderGeometry(8, 10, 105, 10), iron, x, 52, -250); add(new THREE.SphereGeometry(24, 14, 10), warm, x, 110, -250); }
      for (let i = 0; i < 3; i++) { const cloud = new THREE.Group(); cloud.position.set(-250 + i * 650, 570 + (i % 2) * 90, -2100); g.add(cloud); for (let k = 0; k < 4; k++) add(new THREE.SphereGeometry(32 + (k % 2) * 10, 10, 8), material(0xe7e5eb), (k - 1.5) * 38, (k % 2) * 12, 0, cloud); anim.move.push({ o: cloud, x: cloud.position.x, v: 0.025 + i * 0.007 }); }
      const bateau = new THREE.Group(); bateau.position.set(-550, 4, -540); g.add(bateau); add(new THREE.BoxGeometry(120, 16, 34), material(0x283844), 0, 0, 0, bateau); add(new THREE.BoxGeometry(48, 30, 28), material(0xf1eadb), -12, 22, 0, bateau); anim.move.push({ o: bateau, x: -550, v: 0.12 });
    } else if (cfg.kind === 'nyc') {
      const stone = material(0x455364), gold = material(0xd1ad68, 0.35), green = material(0x3e826c);
      // Estátua da Liberdade em uma pequena ilha.
      add(new THREE.CylinderGeometry(95, 115, 72, 8), material(0x776c5a), 400, 36, -930);
      for (let i = 0; i < 3; i++) add(new THREE.BoxGeometry(105 - i * 12, 12, 95 - i * 10), material(0x93866c), 400, 78 + i * 14, -930);
      add(new THREE.CylinderGeometry(42, 56, 155, 8), material(0x756b58), 400, 148, -930);
      add(new THREE.CapsuleGeometry(35, 125, 5, 10), green, 400, 290, -930);
      add(new THREE.SphereGeometry(34, 12, 10), green, 400, 385, -930);
      for (let i = 0; i < 7; i++) { const spike = add(new THREE.ConeGeometry(5, 35, 4), material(0x2f6d5d), 400, 416, -930); spike.rotation.z = i * Math.PI * 2 / 7; spike.position.x += Math.cos(i * Math.PI * 2 / 7) * 40; spike.position.z += Math.sin(i * Math.PI * 2 / 7) * 40; }
      const arm = add(new THREE.CylinderGeometry(12, 15, 115, 8), green, 452, 350, -930); arm.rotation.z = -0.85;
      add(new THREE.CylinderGeometry(8, 10, 125, 8), gold, 498, 432, -930);
      add(new THREE.SphereGeometry(22, 12, 10), gold, 498, 500, -930);
      add(new THREE.CylinderGeometry(5, 8, 360, 10), material(0x8da8bd), 400, 180, -1150);
      for (let i = 0; i < 5; i++) { const taxi = new THREE.Group(); taxi.position.set(-1400 + i * 720, 10, -330 - (i % 2) * 65); g.add(taxi); add(new THREE.BoxGeometry(85, 28, 42), material(0xe7b82f), 0, 0, 0, taxi); add(new THREE.BoxGeometry(42, 20, 35), material(0x293e4f), -2, 20, 0, taxi); anim.move.push({ o: taxi, x: taxi.position.x, v: i % 2 ? -0.38 : 0.38 }); }
      for (let i = 0; i < 12; i++) { const puff = add(new THREE.SphereGeometry(11 + i % 4 * 3, 7, 6), new THREE.MeshBasicMaterial({ color: 0xcbd5df, transparent: true, opacity: 0.2, depthWrite: false }), -900 + (i % 3) * 900, 35 + (i % 4) * 18, -300 - (i % 2) * 90); anim.particulas.push({ o: puff, x: puff.position.x, y: puff.position.y, fase: i * 0.65, tipo: 'vapor' }); }
    } else if (cfg.kind === 'antarctica') {
      const ice = material(0xa6d8e8, 0.2), snow = material(0xeaf8ff), aurora = new THREE.MeshBasicMaterial({ color: 0x49e2ba, transparent: true, opacity: 0.66 });
      for (let i = 0; i < 15; i++) { const x = -2200 + i * 320, h = 150 + (i * 73 % 340); const iceberg = add(new THREE.ConeGeometry(150 + i % 3 * 30, h, 5), i % 2 ? ice : snow, x, h / 2, -1050 - (i % 3) * 130); iceberg.rotation.z = (i % 2 ? 1 : -1) * 0.1; }
      for (let i = 0; i < 4; i++) { const band = new THREE.Mesh(new THREE.TorusGeometry(520 + i * 80, 12, 5, 80, Math.PI * 0.72), aurora.clone()); band.position.set(400, 780 + i * 40, -2300); band.rotation.x = Math.PI * 0.05; band.rotation.z = Math.PI * 1.12 + i * 0.1; g.add(band); anim.gira.push({ o: band, v: (i % 2 ? 1 : -1) * 0.018 }); }
      const hut = material(0xb73c3c); add(new THREE.BoxGeometry(185, 125, 120), hut, 120, 62, -410); const roof = add(new THREE.ConeGeometry(140, 90, 4), material(0x384b5c), 120, 170, -410); roof.rotation.y = Math.PI / 4;
      for (const x of [80, 160]) add(new THREE.BoxGeometry(35, 36, 2), material(0x89d8ef, 0.2), x, 62, -348);
      for (let i = 0; i < 55; i++) { const floco = add(new THREE.IcosahedronGeometry(2 + i % 4, 0), material(0xe5f8ff), -1900 + (i * 173) % 3800, 80 + (i * 97) % 520, -120 - (i * 61) % 700); anim.particulas.push({ o: floco, x: floco.position.x, y: floco.position.y, fase: i * 0.37, tipo: 'neve' }); }
    }
    return g;
  }
  criaPalco('toquio', { kind: 'tokyo', sky: 0x493a66, ground: 0x34303d, floor: 0x5a3346, trim: 0xff6b72 });
  criaPalco('cairo', { kind: 'cairo', sky: 0xe8a85e, ground: 0xc8a66e, floor: 0xb99760, trim: 0xffd27b });
  criaPalco('paris', { kind: 'paris', sky: 0x8796b7, ground: 0x625d59, floor: 0x77716b, trim: 0xf1c880 });
  criaPalco('novaYork', { kind: 'nyc', sky: 0x8c9fb4, ground: 0x384352, floor: 0x56616b, trim: 0xffd166 });
  criaPalco('antartida', { kind: 'antarctica', sky: 0x263e68, ground: 0xa9d7e9, floor: 0xb9e9f3, trim: 0x64f4d4 });
  let cenarioAtual;
  function aplicaCenario() {
    cenarioAtual = sessionStorage.getItem('cenario') || 'neon';
    const praia = cenarioAtual === 'brasil';
    const neon = cenarioAtual === 'neon';
    neonCena.forEach(o => { o.visible = neon; });
    cidade.visible = neon;
    brasil.visible = praia;
    Object.entries(palcos).forEach(([nome, palco]) => { palco.visible = cenarioAtual === nome; });
    const cores = { neon: [0x3a1450, 0x9d8bff, 0xff6ab0, 0xdfe6ff], brasil: [0x9ccbd5, 0xcce9ff, 0xffe2a8, 0xfff1d1], toquio: [0x51405f, 0xe5d8ff, 0xff8392, 0xffd9c2], cairo: [0xc68d4f, 0xffe1a8, 0xffc06a, 0xffedc2], paris: [0x687692, 0xe0e7ff, 0xffd39b, 0xfff1d1], novaYork: [0x596d83, 0xd9e8ff, 0xffd166, 0xf5f1e8], antartida: [0x263e68, 0xb5e6ff, 0x73f1cf, 0xe6f6ff] }[cenarioAtual] || [0x3a1450, 0x9d8bff, 0xff6ab0, 0xdfe6ff];
    scene.fog.color.setHex(cores[0]);
    hemi.color.setHex(cores[1]);
    contra.color.setHex(cores[2]);
    sol.color.setHex(cores[3]);
  }
  aplicaCenario();

  // ---------- lutadores ----------
  // liga um osso (geometria de altura 1 no eixo Y) entre dois pontos [x, y]
  function liga(m, a, b, z) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    m.position.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z);
    m.scale.y = Math.hypot(dx, dy) || 0.001;
    m.rotation.z = Math.atan2(dy, dx) - Math.PI / 2;
  }

  const lerp3 = (a, b, u) => a + (b - a) * u;
  // espada de verdade: lâmina larga com ponta e chanfro no fio, sulco no meio, guarda curvada, cabo com faixas e pomo.
  // origem = mão (meio do cabo), lâmina pra +Y; cor = gema do pomo e da guarda
  function criaEspada(cor) {
    const e = new THREE.Group();
    const aco = new THREE.MeshStandardMaterial({ color: 0xdfe6ee, metalness: 1, roughness: 0.18, emissive: 0x1e293b });
    e.userData.aco = aco;
    const ouro = new THREE.MeshStandardMaterial({ color: 0xd4a017, metalness: 0.9, roughness: 0.25 });
    const couro = new THREE.MeshStandardMaterial({ color: 0x3b1f0e, roughness: 0.8 });
    const gema = new THREE.MeshStandardMaterial({ color: cor, emissive: cor, emissiveIntensity: 0.6, roughness: 0.1 });
    const malha = (geo, m) => { const x = new THREE.Mesh(geo, m); x.castShadow = true; e.add(x); return x; };
    // lâmina: perfil afunilando até a ponta, extrudado fino com bisel (dá o fio brilhante)
    const sh = new THREE.Shape();
    sh.moveTo(-4.5, 0); sh.lineTo(4.5, 0); sh.lineTo(3.6, 70); sh.lineTo(0, 84); sh.lineTo(-3.6, 70); sh.closePath();
    const lam = new THREE.ExtrudeGeometry(sh, { depth: 0.6, bevelEnabled: true, bevelThickness: 1, bevelSize: 1.4, bevelSegments: 1 });
    lam.translate(0, 0, -0.3);
    malha(lam, aco).position.y = 9;
    // sulco central (escuro, dos dois lados)
    for (const z of [1.35, -1.35]) { const s = malha(new THREE.BoxGeometry(1.6, 52, 0.2), new THREE.MeshStandardMaterial({ color: 0x64748b, metalness: 1, roughness: 0.35 })); s.position.set(0, 38, z); }
    // guarda: barra com pontas curvadas pra cima e gema no meio
    const guarda = malha(new THREE.BoxGeometry(26, 4, 5), ouro); guarda.position.y = 7;
    for (const lado of [-1, 1]) { const p = malha(new THREE.SphereGeometry(3, 10, 8), ouro); p.position.set(lado * 13, 9, 0); }
    malha(new THREE.SphereGeometry(2.6, 12, 8), gema).position.set(0, 7, 2.6);
    // cabo com faixas de couro e pomo
    const cabo = malha(new THREE.CylinderGeometry(2.4, 2.4, 16, 10), couro); cabo.position.y = -2;
    for (const y of [-8, -4, 0, 4]) malha(new THREE.TorusGeometry(2.5, 0.6, 6, 12), ouro).position.y = y;
    e.children.slice(-4).forEach(t => (t.rotation.x = Math.PI / 2));
    malha(new THREE.SphereGeometry(3.6, 12, 10), ouro).position.y = -12;
    malha(new THREE.SphereGeometry(1.8, 10, 8), gema).position.set(0, -12, 3);
    return e;
  }
  function criaLutador(tipo, skin, cor) {
    const g = new THREE.Group(), mats = [];
    const mat = (c, extra) => { const m = new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.55 }, extra)); mats.push(m); return m; };
    const add = (geo, m) => { const mesh = new THREE.Mesh(geo, m); mesh.castShadow = true; g.add(mesh); return mesh; };
    const L = { g, tipo, skin, chave: tipo + ':' + skin, mats, coxa: [], canela: [], braco: [], ante: [], juntas: [] };
    const cabeca = new THREE.Group(); g.add(cabeca); L.cabeca = cabeca;
    const olhos = new THREE.Group(); cabeca.add(olhos); L.olhos = olhos;

    if (tipo === 'bob') {
      // Bob: maltês branco, pelo comprido, orelhas caídas, focinho curto e rabo emplumado.
      const pelo = mat(skin === 'dourado' ? 0xf3d477 : 0xfffdf7, { roughness: 0.92 });
      const pele = mat(0x42302b), nariz = mat(0x171313, { roughness: 0.28 }), olho = mat(0x211a18, { roughness: 0.22 });
      L.z = { braco: [10, -10], perna: [7, -7] };
      L.tronco = add(new THREE.CylinderGeometry(0.1, 0.1, 1, 8), pelo); L.tronco.visible = false;
      for (const k of [0, 1]) { L.coxa[k] = add(new THREE.CylinderGeometry(0.1, 0.1, 1, 8), pelo); L.canela[k] = add(new THREE.CylinderGeometry(0.1, 0.1, 1, 8), pelo); L.braco[k] = add(new THREE.CylinderGeometry(0.1, 0.1, 1, 8), pelo); L.ante[k] = add(new THREE.CylinderGeometry(0.1, 0.1, 1, 8), pelo); }
      L.coxa.forEach(m => m.visible = false); L.canela.forEach(m => m.visible = false); L.braco.forEach(m => m.visible = false); L.ante.forEach(m => m.visible = false);
      L.juntaGeo = [];
      const corpo = new THREE.Group(); g.add(corpo); L.corpoBob = corpo;
      const esfera = (parent, geo, material, pos, scale) => { const m = new THREE.Mesh(geo, material); m.position.set(...pos); m.scale.set(...scale); m.castShadow = true; parent.add(m); return m; };
            esfera(corpo, new THREE.SphereGeometry(1, 24, 18), pelo, [-3, 35, 0], [34, 22, 24]);
      // quatro patas curtas com tufos, em dois planos para dar volume de pelo.
      L.patasBob = [];
      for (const x of [-23, 20]) for (const z of [-13, 13]) {
        const pata = new THREE.Group(); pata.position.set(x, 20, z); corpo.add(pata); L.patasBob.push(pata);
        esfera(pata, new THREE.SphereGeometry(1, 16, 12), pelo, [0, -3, 0], [7, 17, 7]);
        esfera(pata, new THREE.SphereGeometry(1, 14, 10), pelo, [2, -16, 0], [8, 5, 8]);
      }
      const cabBob = new THREE.Group(); corpo.add(cabBob);
      // olhos na face frontal da cabeça (antes ficavam escondidos dentro da esfera).
      cabBob.add(olhos); olhos.position.set(41, 58, 0);
      esfera(cabBob, new THREE.SphereGeometry(1, 24, 18), pelo, [24, 53, 0], [22, 21, 21]);
      // orelhas compridas e macias, focinho arredondado e olhos escuros.
      L.orelhasBob = [];
      for (const z of [-14, 14]) { const orelha = new THREE.Group(); orelha.position.set(14, 60, z); cabBob.add(orelha); L.orelhasBob.push(orelha); esfera(orelha, new THREE.SphereGeometry(1, 18, 14), pelo, [-2, -16, 0], [7, 14, 7]); }
      esfera(cabBob, new THREE.SphereGeometry(1, 18, 12), pelo, [40, 47, 0], [13, 10, 12]);
      esfera(cabBob, new THREE.SphereGeometry(1, 12, 10), nariz, [51, 50, 0], [4, 4, 5]);
      const esclera = mat(0xffffff, { roughness: 0.35 });
      L.pupilasBob = [];
      for (const z of [-8, 8]) {
        esfera(olhos, new THREE.SphereGeometry(1, 14, 10), esclera, [0, 0, z], [3.4, 4.4, 3.6]);
        const pupila = esfera(olhos, new THREE.SphereGeometry(1, 12, 10), olho, [2.4, 0, z], [2, 3, 2.4]); L.pupilasBob.push(pupila);
        esfera(pupila, new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), [0.6, 0.35, 0.3], [.35, .3, .35]);
      }
      // sobrancelhas elevadas dão ao maltês a expressão curiosa e alerta.
      for (const z of [-8, 8]) esfera(cabBob, new THREE.CapsuleGeometry(1.1, 6, 3, 6), pelo, [37, 66, z], [1, 1, 1]);
      const bocaBob = esfera(cabBob, new THREE.SphereGeometry(1, 12, 8), pele, [49, 41, 0], [5, 2, 5]); bocaBob.visible = false;
      const linguaBob = esfera(cabBob, new THREE.SphereGeometry(1, 12, 8), mat(0xf4728b), [50, 39, 0], [3, 4, 3]); linguaBob.visible = false;
      const rabinho = new THREE.Group(); rabinho.position.set(-34, 44, 0); corpo.add(rabinho); L.raboBob = rabinho;
      esfera(rabinho, new THREE.CapsuleGeometry(5, 17, 5, 10), pelo, [-6, 8, 0], [1, 1, 1]);
      if (skin === 'gala') {
        const laco = mat(0xe11d48, { roughness: 0.48 });
        esfera(cabBob, new THREE.SphereGeometry(1, 12, 8), laco, [11, 43, 0], [7, 4, 8]);
        esfera(cabBob, new THREE.SphereGeometry(1, 10, 8), laco, [10, 43, 7], [5, 5, 4]);
      }
      // furacão de pelos: anéis de vento e tufos girando em volta do Bob no especial; aura quando o axé enche.
      const furacao = new THREE.Group(); furacao.position.set(0, 0, 0); g.add(furacao);
      const ventoMat = new THREE.MeshBasicMaterial({ color: skin === 'dourado' ? 0xffe9a0 : 0xe0f2fe, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
      const aneisVento = [0, 1, 2, 3].map(n => { const a = new THREE.Mesh(new THREE.TorusGeometry(48 + n * 12, 3 - n * 0.4, 6, 40, Math.PI * 1.5), ventoMat); a.rotation.x = Math.PI / 2; a.position.y = 15 + n * 28; furacao.add(a); return a; });
      const tufos = [];
      for (let n = 0; n < 14; n++) { const tf = new THREE.Mesh(new THREE.SphereGeometry(5 + (n % 3) * 2, 8, 6), pelo); tf.visible = false; furacao.add(tf); tufos.push(tf); }
      const auraBob = new THREE.Mesh(new THREE.SphereGeometry(62, 20, 14), new THREE.MeshBasicMaterial({ color: 0xbae6fd, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
      auraBob.position.y = 45; auraBob.scale.set(1.2, 0.9, 0.9); furacao.add(auraBob);
      L.furacaoBob = { aneisVento, tufos, auraBob, ventoMat };
      if (skin === 'dourado') {
        const brilhoOuro = new THREE.MeshBasicMaterial({ color: 0xffdf70 });
        for (let n = 0; n < 5; n++) esfera(corpo, new THREE.SphereGeometry(2, 8, 6), brilhoOuro, [(n - 2) * 15, 64 + (n % 2) * 8, (n % 2 ? 1 : -1) * 27], [1, 1, 1]);
      }
      L.posaExtra = (j, zb, f, t) => {
        const correndo = Math.abs(f.vx) > 1, latindo = f.acao === 'latido', mordendo = f.acao === 'mordida', superBob = f.acao === 'furacaoBob';
        const noAr = f.y > 1, apanhou = f.acao === 'apanhou', prog = f.dur > 0 ? Math.min(1, f.t / f.dur) : 0, golpe = Math.sin(prog * Math.PI);
        const passo = correndo || superBob ? 45 : 100;
        const bounce = superBob ? Math.abs(Math.sin(t / 35)) * 10 : correndo ? Math.abs(Math.sin(t / 55)) * 7 : Math.sin(t / 260) * 1.5;
        const respira = 1 + Math.sin(t / 260) * 0.035;
        corpo.position.set(mordendo ? golpe * 10 : f.acao === 'patada' ? golpe * 6 : apanhou ? -6 : 0, bounce + (noAr ? 4 : 0), 0);
        corpo.scale.set(1, respira, 1 + (respira - 1) * 0.6);
        corpo.rotation.z = superBob ? Math.sin(t / 55) * 0.5 : apanhou ? -0.25 : noAr ? (f.vy > 0 ? 0.25 : -0.15) : correndo ? -0.08 + Math.sin(t / 55) * 0.06 : 0;
        corpo.rotation.y = f.acao === 'rabada' ? golpe * Math.PI * 2 : superBob ? (t / 90) % (Math.PI * 2) : 0;
        corpo.rotation.x = correndo ? Math.sin(t / 55) * 0.05 : 0;
        cabBob.position.x = mordendo ? golpe * 8 : latindo ? Math.sin(t / 40) * 2 : 0;
        cabBob.position.y = latindo ? Math.abs(Math.sin(t / 40)) * 3 : Math.sin(t / 260 + 1) * 0.8;
        cabBob.rotation.z = mordendo ? -0.15 - golpe * 0.15 : latindo ? 0.12 + Math.sin(t / 30) * 0.12 : apanhou ? 0.2 : Math.sin(t / 380) * 0.06;
        // de vez em quando inclina a cabeça de lado, curioso.
        cabBob.rotation.x = latindo || mordendo ? 0 : Math.max(0, Math.sin(t / 1300)) ** 4 * 0.3;
        bocaBob.visible = latindo || mordendo; linguaBob.visible = latindo || (correndo && !mordendo);
        linguaBob.scale.y = latindo ? 3 + Math.sin(t / 35) : correndo ? 2 + Math.sin(t / 55) * 0.5 : 1;
        L.orelhasBob.forEach((o, n) => { o.rotation.z = (latindo ? 0.5 : 0) + (correndo || superBob ? Math.sin(t / 55 + n) * 0.35 + 0.25 : Math.sin(t / 420 + n) * 0.06) + (noAr ? 0.5 : 0); o.rotation.x = (n ? 1 : -1) * (correndo ? 0.15 : 0.05); });
        L.pupilasBob.forEach(p => { p.position.y = apanhou ? -0.7 : f.acao === 'defesa' ? 0.8 : Math.sin(t / 900) * 0.4; p.position.z = (p === L.pupilasBob[0] ? -8 : 8) + Math.sin(t / 1700) * 0.6; });
        L.raboBob.rotation.z = f.acao === 'rabada' ? Math.sin(t / 24) * 1.6 : Math.sin(t / (correndo ? 35 : 65)) * (correndo ? 0.9 : 0.55);
        L.raboBob.rotation.x = Math.sin(t / (correndo ? 35 : 65)) * 0.5;
        L.patasBob.forEach((p, n) => {
          const frente = p.position.x > 0, fase = n * Math.PI + (frente ? 0 : Math.PI / 2);
          const passada = noAr ? (frente ? -0.6 : 0.6) : Math.sin(t / passo + fase) * (correndo || superBob ? 0.6 : 0);
          p.rotation.z = passada + (f.acao === 'patada' && frente && n === 3 ? -1.4 * golpe : 0);
          p.position.y = 20 + (correndo && !noAr ? Math.max(0, Math.sin(t / passo + fase)) * 4 : 0);
        });
        const fz = L.furacaoBob, cheio = (f.axe || 0) >= 100;
        fz.ventoMat.opacity = superBob ? 0.55 + Math.sin(t / 40) * 0.2 : 0;
        fz.aneisVento.forEach((a, n) => { a.rotation.z = (n % 2 ? 1 : -1) * t / (60 - n * 8); a.scale.setScalar(superBob ? 1 + Math.sin(t / 70 + n) * 0.12 : 0.01); });
        fz.tufos.forEach((tf, n) => { tf.visible = superBob; if (!superBob) return; const a = t / 70 + n * 0.9, r = 45 + (n % 4) * 14; tf.position.set(Math.cos(a) * r, 10 + ((n * 23 + t / 6) % 140), Math.sin(a) * r); });
        fz.auraBob.material.opacity = superBob ? 0.25 : cheio ? 0.1 + Math.sin(t / 160) * 0.07 : 0;
      };
    } else if (tipo === 'blocos' && skin === 'astronauta') {
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
    } else if (tipo === 'pretoVelho') {
      // Preto Velho: ancião de roupa branca, chapéu de palha, barba branca, guia de contas, bengala e cachimbo
      // texturas pintadas na hora: algodão cru com trama e manchas de uso, palha trançada
      const tex = (w, h, pinta, rep) => { const c = document.createElement('canvas'); c.width = w; c.height = h; pinta(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); t.anisotropy = 4; return t; };
      const algodao = tex(128, 128, (c, w, h) => {
        c.fillStyle = '#efe9dc'; c.fillRect(0, 0, w, h);
        for (let y = 0; y < h; y += 2) { c.fillStyle = 'rgba(120,100,70,' + (0.04 + rnd() * 0.05) + ')'; c.fillRect(0, y, w, 1); }
        for (let x = 0; x < w; x += 2) { c.fillStyle = 'rgba(255,255,255,' + rnd() * 0.08 + ')'; c.fillRect(x, 0, 1, h); }
        for (let n = 0; n < 6; n++) { const g = c.createRadialGradient(rnd() * w, rnd() * h, 0, rnd() * w, rnd() * h, 10 + rnd() * 20); g.addColorStop(0, 'rgba(150,120,80,.12)'); g.addColorStop(1, 'rgba(150,120,80,0)'); c.fillStyle = g; c.fillRect(0, 0, w, h); }
      }, [2, 3]);
      const trancado = tex(128, 128, (c, w, h) => {
        c.fillStyle = '#c99a4e'; c.fillRect(0, 0, w, h);
        for (let y = 0; y < h; y += 8) for (let x = 0; x < w; x += 8) { const cruz = ((x + y) / 8) % 2; c.fillStyle = cruz ? '#e3bb6e' : '#b8873f'; c.fillRect(x + 1, y + 1, cruz ? 6 : 3, cruz ? 3 : 6); }
        for (let n = 0; n < 200; n++) { c.fillStyle = 'rgba(90,60,20,' + rnd() * 0.25 + ')'; c.fillRect(rnd() * w, rnd() * h, 2, 1); }
      }, [4, 1]);
      const pele = mat(0x5a3722, { roughness: 0.55 }), roupa = mat(0xffffff, { roughness: 0.92, map: algodao }), palha = mat(0xffffff, { roughness: 0.95, map: trancado }), branco = mat(0xe9e6e0, { roughness: 1 });
      const vermelho = mat(0xb3141c, { roughness: 0.8 }), vermelhoEsc = mat(0x7f0d12, { roughness: 0.85 });
      const osso = (rTopo, rBase, m) => add(new THREE.CylinderGeometry(rTopo, rBase, 1, 14), m);
      L.z = { braco: [13, -13], perna: [7, -7] };
      const geoT = new THREE.CylinderGeometry(10, 10.5, 1, 16); geoT.scale(1, 1, 1.35);
      L.tronco = add(geoT, roupa);
      for (const k of [0, 1]) {
        L.coxa[k] = osso(6, 7, roupa); L.canela[k] = osso(5, 5.6, roupa); // calça branca arregaçada
        L.braco[k] = osso(5, 5.8, roupa); L.ante[k] = osso(4.6, 5, roupa); // camisa de manga comprida
      }
      L.juntaGeo = [['joelho', roupa, 5.6], ['cot', roupa, 5], ['pe', pele, 5], ['mao', pele, 4.8], ['ombroK', roupa, 6.4], ['quadrilK', roupa, 7]];
      const barriga = new THREE.Mesh(new THREE.SphereGeometry(10, 16, 12), roupa); barriga.scale.set(1.05, 1, 1.3); barriga.castShadow = true; g.add(barriga);
      // faixa vermelha amarrada na cintura, com as pontas caindo do lado
      const faixa = new THREE.Group(); g.add(faixa);
      const cinta = new THREE.Mesh(new THREE.CylinderGeometry(10.6, 10.8, 5, 18, 1, true), vermelho); cinta.scale.z = 1.38; cinta.material.side = THREE.DoubleSide; faixa.add(cinta);
      const no = new THREE.Mesh(new THREE.SphereGeometry(2.6, 10, 8), vermelhoEsc); no.position.set(3, 0, 14); faixa.add(no);
      for (const [dx, r] of [[1.5, 0.12], [4.5, -0.1]]) { const pontaF = new THREE.Mesh(new THREE.BoxGeometry(3.2, 14, 0.8), vermelho); pontaF.position.set(dx, -8, 14.5); pontaF.rotation.z = r; faixa.add(pontaF); }
      // costuras e dobras dão espessura à faixa sem deixar o vermelho chapado
      const costura = mat(0xd48673, { roughness: 1 });
      for (const y of [-2, 2]) { const linha = new THREE.Mesh(new THREE.CylinderGeometry(10.85, 10.85, 0.32, 24, 1, true), costura); linha.scale.z = 1.4; faixa.add(linha); }
      for (const dx of [1.5, 4.5]) { const linha = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.35, 0.95), costura); linha.position.set(dx, -13.5, 14.55); faixa.add(linha); }
      // lenço vermelho no pescoço: nó na frente e a ponta em triângulo no peito
      const lenco = new THREE.Group(); g.add(lenco);
      const golaL = new THREE.Mesh(new THREE.TorusGeometry(6.4, 1.8, 8, 20), vermelho); golaL.rotation.x = Math.PI / 2; golaL.scale.y = 1.3; lenco.add(golaL);
      const triangulo = new THREE.Mesh(new THREE.ConeGeometry(5.5, 11, 3), vermelho); triangulo.rotation.z = Math.PI; triangulo.position.set(6.5, -6, 0); triangulo.scale.z = 0.35; lenco.add(triangulo);
      const noL = new THREE.Mesh(new THREE.SphereGeometry(2, 8, 6), vermelhoEsc); noL.position.set(6.8, -0.5, 0); lenco.add(noL);
      // botões da camisa e barras arregaçadas da calça e das mangas
      const botaoM = new THREE.MeshStandardMaterial({ color: 0x3b2a1a, roughness: 0.5 });
      const botoes = [0.35, 0.55, 0.75].map(() => { const b = new THREE.Mesh(new THREE.SphereGeometry(1, 6, 4), botaoM); g.add(b); return b; });
      const barras = [];
      for (const k of [0, 1]) for (const [qual, r] of [['canela', 6.2], ['ante', 5.4]]) {
        const b = new THREE.Mesh(new THREE.TorusGeometry(r, 1.5, 6, 16), roupa); b.castShadow = true; g.add(b); barras.push({ b, k, qual });
      }
      const pescoco = osso(4.4, 5, pele);
      // guia de contas no pescoço (preto e branco)
      const guia = new THREE.Group(); g.add(guia);
      for (let n = 0; n < 18; n++) {
        const a = n / 18 * Math.PI * 2, conta = new THREE.Mesh(new THREE.SphereGeometry(1.3, 6, 4), new THREE.MeshStandardMaterial({ color: n % 2 ? 0xffffff : 0x111111, roughness: 0.4 }));
        conta.position.set(Math.cos(a) * 8 + 2, -Math.abs(Math.sin(a * 0.5)) * 6, Math.sin(a) * 11); guia.add(conta);
      }
      // cabeça: pele, cabelo branco nas laterais, barba e bigode brancos, chapéu de palha
      const cranio = new THREE.Mesh(new THREE.SphereGeometry(13.5, 22, 16), pele); cranio.scale.y = 1.08; cranio.castShadow = true; cabeca.add(cranio);
      for (const z of [-9, 9]) { const tufo = new THREE.Mesh(new THREE.SphereGeometry(6, 10, 8), branco); tufo.position.set(-3, 0, z); tufo.scale.set(1.2, 1, 0.6); cabeca.add(tufo); }
      // barba cheia feita de tufos, nariz largo e orelhas
      for (const [x, y, z, r] of [[7, -10, 0, 8], [9, -13, 4, 5], [9, -13, -4, 5], [5, -8, 7, 5], [5, -8, -7, 5], [10, -16, 0, 4.5], [11, -8, 0, 5]]) {
        const tufo = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), branco); tufo.position.set(x, y, z); tufo.scale.set(0.85, 1, 1); cabeca.add(tufo);
      }
      const nariz = new THREE.Mesh(new THREE.SphereGeometry(3, 10, 8), pele); nariz.position.set(13.5, -1.5, 0); nariz.scale.set(0.8, 0.8, 1.3); cabeca.add(nariz);
      for (const z of [-13.5, 13.5]) { const orelha = new THREE.Mesh(new THREE.SphereGeometry(3, 8, 6), pele); orelha.position.set(-1, 0, z); orelha.scale.set(0.8, 1.2, 0.4); cabeca.add(orelha); }
      const bigode = new THREE.Mesh(new THREE.BoxGeometry(3, 2.5, 11), branco); bigode.position.set(12.6, -4.5, 0); cabeca.add(bigode);
      const aba = new THREE.Mesh(new THREE.CylinderGeometry(25, 26, 1.6, 28), palha); aba.position.y = 11; aba.rotation.z = -0.08; aba.castShadow = true; cabeca.add(aba);
      const copa = new THREE.Mesh(new THREE.CylinderGeometry(11, 13.5, 11, 20), palha); copa.position.y = 17; copa.castShadow = true; cabeca.add(copa);
      const fita = new THREE.Mesh(new THREE.CylinderGeometry(13.6, 13.8, 2.4, 20), mat(0x3b2412)); fita.position.y = 13.5; cabeca.add(fita);
      const detalheChapeu = new THREE.Mesh(new THREE.CylinderGeometry(13.85, 13.85, 0.7, 20, 1, true), vermelhoEsc); detalheChapeu.position.y = 13.5; cabeca.add(detalheChapeu);
      const olhoM = new THREE.MeshBasicMaterial({ color: 0xf5f5f5 }), iris = new THREE.MeshBasicMaterial({ color: 0x1a0e06 });
      for (const z of [-5, 5]) {
        const o = new THREE.Mesh(new THREE.SphereGeometry(2.2, 10, 8), olhoM); o.position.set(12, 1.5, z); o.scale.y = 0.6; olhos.add(o); // olhos meio fechados, de quem já viu muito
        const pu = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 6), iris); pu.position.set(13.8, 1.3, z); olhos.add(pu);
        const sob = new THREE.Mesh(new THREE.BoxGeometry(2, 1.2, 5), branco); sob.position.set(12.8, 4.5, z); cabeca.add(sob);
      }
      // cachimbo de barro no canto da boca
      const barro = mat(0x6b3a1e, { roughness: 0.7 });
      const haste = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 12, 6), barro); haste.rotation.z = Math.PI / 2 - 0.3; haste.position.set(17, -6, 4); cabeca.add(haste);
      const fornilho = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2, 5, 10), barro); fornilho.position.set(22.5, -3.5, 4); cabeca.add(fornilho);
      const brasa = brilho(0xff7a1a, 10, 0.9); brasa.position.set(22.5, -1, 4); cabeca.add(brasa);
      // bengala de madeira com cabo curvo
      const madeiraB = mat(0x5a3518, { roughness: 0.75 });
      const bengala = add(new THREE.CylinderGeometry(1.8, 1.6, 1, 8), madeiraB);
      const cabo = new THREE.Mesh(new THREE.TorusGeometry(4.5, 1.8, 6, 12, Math.PI), madeiraB); g.add(cabo);
      // fumaça subindo do cachimbo
      const fumacas = [];
      for (let n = 0; n < 7; n++) { const f = brilho(0xbdb8b0, 14, 0); g.add(f); fumacas.push({ s: f, fase: n / 7 }); }
      const aura = brilho(0xfff2c0, 200, 0); aura.position.y = 70; g.add(aura);
      L.posaExtra = (j, zb, f, t) => {
        const tz = L.tronco.rotation.z;
        const ponto = u => [lerp3(j.quadril[0], j.ombro[0], u), lerp3(j.quadril[1], j.ombro[1], u)];
        const pb = ponto(0.3); barriga.position.set(pb[0] + 3, pb[1], 0); barriga.rotation.set(0, 0, tz);
        liga(pescoco, j.ombro, j.cabeca, 0);
        guia.position.set(j.ombro[0], j.ombro[1], 0); guia.rotation.set(0, 0, tz);
        lenco.position.set(j.ombro[0], j.ombro[1] + 2, 0); lenco.rotation.set(0, 0, tz);
        const pf = ponto(0.06); faixa.position.set(pf[0], pf[1], 0); faixa.rotation.set(0, 0, tz);
        const sen = Math.sin(tz), co = Math.cos(tz);
        botoes.forEach((b, n) => { const q = ponto(0.35 + n * 0.2); b.position.set(q[0] + 10.5 * co, q[1] + 10.5 * sen, 0); });
        for (const { b, k, qual } of barras) { // barra arregaçada no fim da canela e no meio do antebraço
          const [a, c, z, u] = qual === 'canela' ? [j.joelho[k], j.pe[k], L.z.perna[k], 0.78] : [j.cot[k], j.mao[k], zb[k], 0.45];
          b.position.set(a[0] + (c[0] - a[0]) * u, a[1] + (c[1] - a[1]) * u, z);
          b.rotation.set(Math.PI / 2, 0, Math.atan2(c[1] - a[1], c[0] - a[0]) - Math.PI / 2, 'ZXY');
        }
        // bengala: em pé, apoiada no chão; nos golpes/defesa segue o antebraço
        const m = j.mao[0], apoio = f.acao === 'parado' && f.y === 0 && f.hp > 0;
        let ponta;
        if (apoio) ponta = [m[0] + 8, Math.min(m[1] - 10, 1)];
        else { const dx = m[0] - j.cot[0][0], dy = m[1] - j.cot[0][1], l = Math.hypot(dx, dy) || 1; ponta = [m[0] + dx / l * 70, m[1] + dy / l * 70]; }
        const topo = apoio ? [m[0], m[1] + 4] : [m[0] - (ponta[0] - m[0]) * 0.08, m[1] - (ponta[1] - m[1]) * 0.08];
        liga(bengala, topo, ponta, zb[0]);
        cabo.position.set(topo[0] + (apoio ? 4 : 0), topo[1], zb[0]); cabo.rotation.set(0, 0, apoio ? 0 : bengala.rotation.z + Math.PI);
        // fumacinha: sobe enrolando a partir do cachimbo
        const ang = -L.cabeca.rotation.z, cx = j.cabeca[0] + Math.cos(ang) * 22, cy = j.cabeca[1] + Math.sin(ang) * 22 - 1;
        const forte = f.acao === 'fumaca' ? 2.2 : 1;
        for (const q of fumacas) {
          const u = (t / 2400 + q.fase) % 1;
          q.s.position.set(cx + Math.sin(u * 9 + q.fase * 6) * 4 * forte + u * 6, cy + u * 45 * forte, 4 + Math.cos(u * 7) * 3);
          q.s.scale.setScalar((8 + u * 22) * forte);
          q.s.material.opacity = L.cabeca.visible ? (1 - u) * 0.35 : 0;
        }
        const benzendo = f.acao === 'benze', mand = f.acao === 'mandinga', sup = f.acao === 'ancestrais', fe = (f.axe || 0) >= 100;
        aura.material.color.setHex(mand || sup || fe ? 0xa5b4fc : 0xfff2c0);
        aura.material.opacity = sup ? 0.8 + Math.sin(t / 40) * 0.15 : benzendo ? 0.45 + Math.sin(t / 120) * 0.15 : mand ? 0.5 + Math.sin(t / 50) * 0.2 : fe ? 0.16 + Math.sin(t / 160) * 0.08 : 0;
      };
    } else if (tipo === 'eddie') {
      // Eddie, capoeirista: sem camisa, abadá (calça) branco, cordão amarelo e verde, dreads e faixa na cor do time
      const pele = mat(0x7a4a2a, { roughness: 0.45 }), abada = mat(0xf2efe6, { roughness: 0.85 }), cabelo = mat(0x141010, { roughness: 0.9 }), faixa = mat(cor, { roughness: 0.6 });
      const osso = (rTopo, rBase, m) => add(new THREE.CylinderGeometry(rTopo, rBase, 1, 14), m);
      L.z = { braco: [15, -15], perna: [7, -7] };
      // tronco em V: ombros largos (eixo z = largura), cintura fina
      const geoT = new THREE.CylinderGeometry(11, 8, 1, 16); geoT.scale(1, 1, 1.45);
      L.tronco = add(geoT, pele);
      for (const k of [0, 1]) {
        L.coxa[k] = osso(5.8, 7.5, abada); L.canela[k] = osso(6.8, 5.4, abada); // abadá largo, boca da calça aberta
        L.braco[k] = osso(4.4, 5.6, pele); L.ante[k] = osso(3.8, 4.4, pele);
      }
      L.juntaGeo = [['joelho', abada, 5.8], ['cot', pele, 4.6], ['pe', pele, 5.2], ['mao', pele, 5.4], ['ombroK', pele, 6.6], ['quadrilK', abada, 7.4]];
      // peitoral e cintura do abadá
      const peito = new THREE.Mesh(new THREE.SphereGeometry(9, 16, 12), pele); peito.scale.set(0.9, 0.7, 1.7); peito.castShadow = true; g.add(peito);
      const cintura = new THREE.Mesh(new THREE.SphereGeometry(9.5, 16, 12), abada); cintura.scale.set(1, 0.8, 1.45); cintura.castShadow = true; g.add(cintura);
      const pescoco = osso(4.6, 5.2, pele);
      // detalhes: faixa lateral do abadá na cor do time, munhequeiras, tornozeleiras de palha e guia de contas no peito
      const palha = mat(0xc8a165, { roughness: 0.95 });
      const listra = [0, 1].map(() => [osso(1.2, 1.2, faixa), osso(1.2, 1.2, faixa)]);
      const munheca = [0, 1].map(() => osso(4.9, 4.9, faixa)), tornoz = [0, 1].map(() => osso(5.9, 5.9, palha));
      const guia = new THREE.Group(); g.add(guia);
      const contaMat = [mat(0xf8fafc, { roughness: 0.3 }), mat(0x1d4ed8, { roughness: 0.3 }), mat(0xdc2626, { roughness: 0.3 })];
      for (let n = 0; n < 22; n++) {
        const a = (n / 21) * Math.PI, conta = new THREE.Mesh(new THREE.SphereGeometry(0.9, 6, 5), contaMat[n % 3]);
        conta.position.set(Math.sin(a) * 6.5 + 2, -Math.sin(a) * 9, Math.cos(a) * 8); guia.add(conta);
      }
      const guiaPonta = new THREE.Mesh(new THREE.ConeGeometry(1.6, 3.5, 6), contaMat[1]); guiaPonta.position.set(8.5, -10.5, 0); guiaPonta.rotation.z = Math.PI; guia.add(guiaPonta);
      // cordão: duas voltas trançadas (verde e amarelo) com as pontas penduradas
      const cordao = new THREE.Group(); g.add(cordao);
      for (const [c, dy] of [[0x22c55e, 0], [0xfacc15, 1.6]]) {
        const anel = new THREE.Mesh(new THREE.TorusGeometry(9.8, 1.1, 8, 28), new THREE.MeshStandardMaterial({ color: c, roughness: 0.7 }));
        anel.rotation.x = Math.PI / 2; anel.scale.y = 1.45; anel.position.y = dy; cordao.add(anel);
        const ponta = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 16, 6), anel.material); ponta.position.set(6, dy - 8, 9 + dy); ponta.rotation.z = 0.15; cordao.add(ponta);
      }
      // cabeça, dreads presos pela faixa e olhos
      const cranio = new THREE.Mesh(new THREE.SphereGeometry(14, 22, 16), pele); cranio.scale.y = 1.12; cranio.castShadow = true; cabeca.add(cranio);
      const topo = new THREE.Mesh(new THREE.SphereGeometry(14.8, 22, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), cabelo); topo.position.set(-1.5, 2, 0); topo.rotation.z = 0.25; cabeca.add(topo);
      for (let n = 0; n < 9; n++) {
        const a = -Math.PI / 2 + (n / 8) * Math.PI, dread = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.4, 20, 6), cabelo);
        dread.position.set(-9 - Math.cos(a - Math.PI / 2) * 3, -4, Math.sin(a) * 10); dread.rotation.set(Math.sin(a) * 0.35, 0, -0.45); dread.castShadow = true; cabeca.add(dread);
      }
      const banda = new THREE.Mesh(new THREE.TorusGeometry(14.6, 1.8, 8, 30), faixa); banda.rotation.set(Math.PI / 2, 0.18, 0); banda.position.y = 4; cabeca.add(banda);
      for (const r of [0.5, 0.9]) { const tira = new THREE.Mesh(new THREE.BoxGeometry(2, 12, 3), faixa); tira.position.set(-16, -2, r * 4 - 3); tira.rotation.z = r; cabeca.add(tira); }
      const branco = new THREE.MeshBasicMaterial({ color: 0xffffff }), iris = new THREE.MeshBasicMaterial({ color: 0x2a1608 });
      for (const z of [-5, 5]) {
        const o = new THREE.Mesh(new THREE.SphereGeometry(2.6, 10, 8), branco); o.position.set(12.4, 2, z); olhos.add(o);
        const pu = new THREE.Mesh(new THREE.SphereGeometry(1.4, 8, 6), iris); pu.position.set(14.4, 2, z); olhos.add(pu);
      }
      const sobr = new THREE.Mesh(new THREE.BoxGeometry(2, 1.6, 16), cabelo); sobr.position.set(13.2, 6, 0); cabeca.add(sobr);
      const boca = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.4, 6), new THREE.MeshBasicMaterial({ color: 0x3b1d0e })); boca.position.set(13.4, -6, 0); cabeca.add(boca);
      // aura dourada do axé (super e barra cheia)
      const aura = brilho(0xfde047, 220, 0); aura.position.y = 80; g.add(aura);
      const redemoinho = new THREE.Mesh(new THREE.TorusGeometry(48, 3, 8, 40, Math.PI * 1.4), new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
      redemoinho.rotation.x = Math.PI / 2; g.add(redemoinho);
      L.posaExtra = (j, zb, f, t) => {
        const tz = L.tronco.rotation.z, sen = Math.sin(tz), co = Math.cos(tz);
        // ao longo do tronco: 0 = quadril, 1 = ombro
        const ponto = u => [lerp3(j.quadril[0], j.ombro[0], u), lerp3(j.quadril[1], j.ombro[1], u)];
        const pp = ponto(0.78); peito.position.set(pp[0] + 4 * co, pp[1] + 4 * sen, 0); peito.rotation.set(0, L.tronco.rotation.y, tz);
        const pc = ponto(0.08); cintura.position.set(pc[0], pc[1], 0); cintura.rotation.set(0, 0, tz);
        cordao.position.set(pc[0], pc[1] + 2, 0); cordao.rotation.set(0, 0, tz);
        liga(pescoco, j.ombro, j.cabeca, 0);
        const meio = (p, q, u) => [lerp3(p[0], q[0], u), lerp3(p[1], q[1], u)];
        for (const k of [0, 1]) {
          const zp = L.z.perna[k], lado = zp + Math.sign(zp || 1) * 6;
          liga(listra[k][0], j.quadril, j.joelho[k], lado); liga(listra[k][1], j.joelho[k], j.pe[k], lado);
          liga(munheca[k], meio(j.cot[k], j.mao[k], 0.72), meio(j.cot[k], j.mao[k], 0.9), zb[k]);
          liga(tornoz[k], meio(j.joelho[k], j.pe[k], 0.86), meio(j.joelho[k], j.pe[k], 0.96), zp);
        }
        guia.position.set(j.ombro[0], j.ombro[1], 0); guia.rotation.set(0, 0, tz);
        const sup = f.acao === 'tempestade', cheio = (f.axe || 0) >= 100;
        aura.material.opacity = sup ? 0.75 + Math.sin(t / 40) * 0.2 : cheio ? 0.18 + Math.sin(t / 160) * 0.1 : 0;
        redemoinho.material.opacity = sup ? 0.7 : 0;
        if (sup) { redemoinho.rotation.z = t / 40; redemoinho.position.y = 30 + Math.sin(t / 90) * 25; redemoinho.scale.setScalar(1 + Math.sin(t / 70) * 0.15); }
      };
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
      if (skin === 'pirata') {
        const ouro = mat(0xf4c542, { metalness: 0.82, roughness: 0.22, emissive: 0x5c3510, emissiveIntensity: 0.18 });
        const ouroClaro = mat(0xffe89a, { metalness: 0.72, roughness: 0.2 });
        const tapa = mat(0x111318, { roughness: 0.72 });
        const tira = mat(0x3b2418, { roughness: 0.85 });
        const gema = mat(0x38bdf8, { metalness: 0.35, roughness: 0.2, emissive: 0x075985, emissiveIntensity: 0.5 });
        // Coroa baixa, com cinco pontas e uma pedra azul na frente.
        const coroa = new THREE.Group(); cabeca.add(coroa); L.coroa = coroa;
        const aro = new THREE.Mesh(new THREE.CylinderGeometry(13, 14, 4, 24, 1, true), ouro); aro.position.y = 17; coroa.add(aro);
        const borda = new THREE.Mesh(new THREE.TorusGeometry(13.5, 1.1, 8, 24), ouroClaro); borda.rotation.x = Math.PI / 2; borda.position.y = 15.2; coroa.add(borda);
        for (let n = 0; n < 5; n++) {
          const z = (n - 2) * 5.2, ponta = new THREE.Mesh(new THREE.ConeGeometry(3.2, 10 + (n === 2 ? 3 : 0), 5), ouro);
          ponta.position.set(0, 23 + (n === 2 ? 1.5 : 0), z); coroa.add(ponta);
        }
        const pedraCoroa = new THREE.Mesh(new THREE.OctahedronGeometry(3.1, 0), gema); pedraCoroa.position.set(13.8, 17, 0); coroa.add(pedraCoroa);
        // Tapa-olho no lado visível da cabeça, com tira passando pela lateral.
        const patch = new THREE.Mesh(new THREE.SphereGeometry(4.8, 16, 12), tapa); patch.scale.set(0.5, 0.82, 1.05); patch.position.set(16.8, 4, 6); cabeca.add(patch);
        const faixaOlho = new THREE.Mesh(new THREE.BoxGeometry(22, 1.6, 1.5), tira); faixaOlho.position.set(2, 7, 12); faixaOlho.rotation.y = -0.12; cabeca.add(faixaOlho);
        const fivela = new THREE.Mesh(new THREE.SphereGeometry(1.2, 8, 6), ouroClaro); fivela.position.set(18, 4, 7); cabeca.add(fivela);
        // Duas lâminas curtas montadas nos pulsos; são reposicionadas junto com cada braço.
        const lamina = () => {
          const arma = new THREE.Group();
          const forma = new THREE.Shape();
          forma.moveTo(-4, 0); forma.lineTo(4, 0); forma.lineTo(3.2, 37); forma.lineTo(0, 49); forma.lineTo(-3.2, 37); forma.closePath();
          const geo = new THREE.ExtrudeGeometry(forma, { depth: 1, bevelEnabled: true, bevelThickness: 0.7, bevelSize: 0.8, bevelSegments: 1 }); geo.translate(0, 0, -0.5);
          const aco = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0xdbeafe, metalness: 0.92, roughness: 0.16, emissive: 0x1e3a5f, emissiveIntensity: 0.25 })); aco.castShadow = true; arma.add(aco);
          const fio = new THREE.Mesh(new THREE.BoxGeometry(1.1, 35, 0.25), new THREE.MeshBasicMaterial({ color: 0xffffff })); fio.position.set(0, 19, 0.65); arma.add(fio);
          const guarda = new THREE.Mesh(new THREE.BoxGeometry(17, 3, 4), ouro); guarda.position.y = -1; arma.add(guarda);
          const punho = new THREE.Mesh(new THREE.BoxGeometry(6, 10, 5), tira); punho.position.y = -7; arma.add(punho);
          const pomo = new THREE.Mesh(new THREE.SphereGeometry(3, 10, 8), ouroClaro); pomo.position.y = -12; arma.add(pomo);
          return arma;
        };
        L.laminas = [lamina(), lamina()]; L.laminas.forEach(arma => g.add(arma));
      }
    }
    // juntas
    for (const [nome, m, r] of L.juntaGeo) for (const k of (nome === 'ombro' || nome === 'quadril') ? [0] : [0, 1]) { // ombroK/quadrilK: um por lado
      const geo = tipo === 'blocos' ? new THREE.BoxGeometry(r, r, r) : new THREE.SphereGeometry(r, 12, 8);
      const mesh = add(geo, m); L.juntas.push({ nome, k, mesh });
    }
    if (tipo === 'blocos') {
      const rocha = mat(0x555b68, { roughness: 0.9 });
      const cristal = mat(0x69e7f5, { roughness: 0.15, metalness: 0.25, emissive: 0x126176 });
      L.armadura = { punhos: [], pernas: [] };
      for (const k of [0, 1]) {
        const punho = new THREE.Group(), perna = new THREE.Group(); g.add(punho, perna);
        for (const [grupo, raio] of [[punho, 28], [perna, 30]]) {
          const base = new THREE.Mesh(new THREE.DodecahedronGeometry(raio, 0), rocha); base.scale.set(1.2, 0.85, 0.95); grupo.add(base);
          for (let n = 0; n < 3; n++) {
            const ponta = new THREE.Mesh(new THREE.ConeGeometry(8 + n, 25 + n * 5, 5), cristal);
            ponta.position.set(8 + n * 7, 16 + n * 3, (n - 1) * 12); ponta.rotation.z = -0.5; grupo.add(ponta);
          }
          grupo.visible = false;
        }
        L.armadura.punhos.push(punho); L.armadura.pernas.push(perna);
      }
    }
    // martelo
    const madeira = new THREE.MeshStandardMaterial({ color: 0x92400e }), ferro = new THREE.MeshStandardMaterial({ color: 0x9ca3af, metalness: 0.6, roughness: 0.3 });
    L.cabo = add(new THREE.CylinderGeometry(3, 3, 1, 8), madeira);
    L.malho = add(new THREE.BoxGeometry(34, 18, 18), ferro);
    // espada do palito (lâmina ao longo do eixo Y, de 0 a 1, escalada pelo comprimento)
    if (tipo === 'palito') {
      L.espada = criaEspada(cor); g.add(L.espada);
    }
    // rastro do golpe: arco branco translúcido (raio 1, escalado pelo tamanho do membro)
    L.rastro = new THREE.Mesh(new THREE.RingGeometry(0.72, 1.05, 32, 1, 0, 1), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
    g.add(L.rastro);
    criaSkinElemental(L);
    return L;
  }

  const ELEMENTAIS = {
    fogo: { cor: 0xff601c, clara: 0xffd166 },
    gelo: { cor: 0x5ddcff, clara: 0xe5fbff },
    trovao: { cor: 0xb388ff, clara: 0xfff176 },
    vento: { cor: 0x6ef0bd, clara: 0xd8fff3 },
  };
  function criaSkinElemental(L) {
    const tema = ELEMENTAIS[L.skin];
    if (!tema) return;
    L.mats.forEach(m => {
      if (!m.isMeshStandardMaterial) return;
      m.color.lerp(new THREE.Color(tema.cor), L.skin === 'vento' ? 0.16 : 0.32);
      m.metalness = Math.max(m.metalness, L.skin === 'gelo' ? 0.38 : 0.15);
    });
    const aura = new THREE.Group(); L.g.add(aura);
    const anelMat = new THREE.MeshBasicMaterial({ color: tema.cor, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const anel = new THREE.Mesh(new THREE.TorusGeometry(32, 1.3, 6, 40), anelMat);
    anel.rotation.x = Math.PI / 2; aura.add(anel);
    const pontos = [];
    const geo = L.skin === 'gelo' ? new THREE.OctahedronGeometry(3.8) : L.skin === 'trovao' ? new THREE.TetrahedronGeometry(3.2) : new THREE.SphereGeometry(L.skin === 'fogo' ? 3.4 : 2.4, 6, 5);
    for (let n = 0; n < 16; n++) {
      const mat = new THREE.MeshBasicMaterial({ color: n % 3 ? tema.cor : tema.clara, transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false });
      const p = new THREE.Mesh(geo, mat); aura.add(p); pontos.push(p);
    }
    const halo = brilho(tema.cor, 130, 0.22); aura.add(halo);
    L.elemental = { aura, anel, halo, pontos, tema };
  }

  function animaSkinElemental(L, j, f, t) {
    const e = L.elemental;
    if (!e) return;
    const ataque = f.dur > 0 && f.acao !== 'parado';
    const pulso = 1 + Math.sin(t / 180) * 0.1;
    e.anel.position.set(j.quadril[0], 5, 0);
    e.anel.scale.setScalar(pulso * (ataque ? 1.25 : 1));
    e.anel.material.opacity = ataque ? 0.72 : 0.38;
    e.halo.position.set(j.quadril[0], j.quadril[1] + 24, 0);
    e.halo.material.opacity = (ataque ? 0.35 : 0.18) * pulso;
    e.pontos.forEach((p, n) => {
      const fase = n / e.pontos.length, a = fase * Math.PI * 2 + t / (L.skin === 'trovao' ? 150 : 420);
      const sobe = (t / (L.skin === 'fogo' ? 850 : 1400) + fase) % 1;
      const raio = L.skin === 'vento' ? 33 + Math.sin(t / 220 + n) * 8 : 22 + (n % 4) * 4;
      p.position.set(j.quadril[0] + Math.cos(a) * raio, 10 + sobe * 125, Math.sin(a) * raio);
      p.scale.setScalar((L.skin === 'fogo' ? 1.5 - sobe : L.skin === 'gelo' ? 0.8 + sobe * 0.4 : 0.7 + Math.sin(t / 100 + n) * 0.3) * (ataque ? 1.3 : 1));
      p.rotation.set(t / 450 + n, t / 650, a);
      p.material.opacity = L.skin === 'trovao' ? (Math.sin(t / 55 + n * 7) > 0.15 ? 0.9 : 0.12) : (1 - sobe) * 0.8;
    });
    L.rastro.material.color.setHex(e.tema.clara);
  }

  function importaModeloLutador(L, url) {
    if (!url) return;
    carregaModeloGLTF(url).then(({ scene: modelo, animations }) => {
      const box = new THREE.Box3().setFromObject(modelo), size = box.getSize(new THREE.Vector3()), center = box.getCenter(new THREE.Vector3());
      if (!Number.isFinite(size.y) || size.y <= 0) throw new Error('Modelo sem altura válida');
      const escala = 140 / size.y;
      const raiz = new THREE.Group();
      raiz.rotation.y = -Math.PI / 2; // modelos GLB normalmente olham para -Z; a luta olha para +X
      modelo.position.set(-center.x * escala, -box.min.y * escala, -center.z * escala);
      modelo.scale.setScalar(escala);
      modelo.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      raiz.add(modelo);
      L.g.children.forEach(o => { o.visible = false; });
      L.g.add(raiz);
      L.modeloGLB = true;
      L.mixerGLB = new THREE.AnimationMixer(modelo);
      L.clipsGLB = animations;
      L.acoesGLB = new Map();
      L.animacaoGLB = null;
      L.clipsGLB.forEach(clip => L.acoesGLB.set(nomeAnimacao(clip.name), L.mixerGLB.clipAction(clip)));
      console.info(`Modelo GLB carregado: ${url}`);
    }).catch(e => console.warn(`Não foi possível carregar ${url}; usando o lutador padrão.`, e));
  }

  function animaModeloGLB(L, acao, dt) {
    if (!L.modeloGLB) return;
    const nome = nomeAnimacao(acao);
    const apelidos = {
      parado: ['idle', 'standingidle'], andando: ['walk', 'walking'],
      pulando: ['jump', 'jumping'], caindo: ['fall', 'falling'],
      defesa: ['block', 'blocking', 'guard'], apanhou: ['hit', 'hurt', 'stun'],
      caido: ['knockdown', 'fall', 'falling'], levantando: ['getup', 'getupfromfloor', 'standup'],
      congelado: ['hit', 'hurt', 'stun'], tonto: ['hit', 'hurt', 'stun'],
      socoalto: ['punch', 'punching', 'jab'], socobaixo: ['punch', 'punching', 'jab'],
      socoagachado: ['crouchpunch', 'punch', 'punching'],
      chutealto: ['kick', 'kicking'], chutebaixo: ['kick', 'kicking'],
      rasteira: ['sweep', 'lowkick', 'kick'], voadora: ['flyingkick', 'jumpkick', 'kick'],
    };
    const idle = L.acoesGLB.get('idle') || L.acoesGLB.get('parado') || L.acoesGLB.get('standingidle');
    const proxima = L.acoesGLB.get(nome) || (apelidos[nome] || []).map(n => L.acoesGLB.get(n)).find(Boolean)
      || idle || L.acoesGLB.values().next().value;
    if (proxima && proxima !== L.animacaoGLB) {
      proxima.reset().fadeIn(0.12).play();
      if (L.animacaoGLB) L.animacaoGLB.fadeOut(0.12);
      L.animacaoGLB = proxima;
    }
    L.mixerGLB.update(Math.max(0, dt) / 1000);
  }

  const arcos = {}; // geometria do rastro por tamanho de arco
  function posa(L, f, j, t, i) {
    if (L.modeloGLB) {
      L.g.position.set(f.x, f.y, 0);
      const alvoY = f.facing > 0 ? 0 : Math.PI;
      if (L.rotY === undefined) L.rotY = alvoY;
      L.rotY += (alvoY - L.rotY) * (1 - Math.exp(-(L.dt || 16) / 55));
      L.g.rotation.set(0, L.rotY, 0);
      animaModeloGLB(L, f.acao, L.dt || 16);
      return;
    }
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
      const pt = nome === 'ombro' || nome === 'ombroK' ? j.ombro : nome === 'quadril' || nome === 'quadrilK' ? j.quadril : j[nome][k];
      const z = nome === 'joelho' || nome === 'pe' || nome === 'quadrilK' ? L.z.perna[k] : nome === 'ombro' || nome === 'quadril' ? 0 : zb[k];
      mesh.position.set(pt[0], pt[1], z);
      if (L.tipo === 'blocos') mesh.rotation.z = (nome === 'joelho' || nome === 'pe' ? L.coxa[k] : L.ante[k]).rotation.z;
    }
    if (L.armadura) {
      const golpeSoco = /^(soco|gancho)/.test(f.acao) || f.acao === 'meteoroPedra', golpePerna = /^(chute|rasteira|giro|voadora)/.test(f.acao);
      for (const k of [0, 1]) {
        const punho = L.armadura.punhos[k], perna = L.armadura.pernas[k];
        punho.visible = golpeSoco && (k === (f.socoVar === 1 ? 1 : 0) || f.acao === 'gancho' || f.acao === 'socoRocha' || f.acao === 'meteoroPedra' || f.socoVar === 2);
        perna.visible = golpePerna && k === 0;
        punho.scale.setScalar(f.acao === 'socoRocha' || f.acao === 'meteoroPedra' ? 1.55 : f.socoVar === 2 ? 1.2 : 1);
        perna.scale.setScalar(f.acao === 'chuteCristal' ? 1.55 : 1);
        punho.position.set(j.mao[k][0], j.mao[k][1], zb[k]); punho.rotation.z = L.ante[k].rotation.z;
        perna.position.set(j.pe[k][0], j.pe[k][1], L.z.perna[k]); perna.rotation.z = L.canela[k].rotation.z;
      }
    }
    L.cabeca.position.set(j.cabeca[0], j.cabeca[1] + (L.tipo === 'blocos' ? 4 : 0), 0);
    if (L.posaExtra) L.posaExtra(j, zb, f, t);
    animaSkinElemental(L, j, f, t);
    // aú: o corpo inteiro roda no plano da tela em volta do quadril (pivô a 70 do chão)
    const roll = j.roll || 0, fi = L.g.rotation.y;
    L.g.rotation.z = roll;
    if (roll) L.g.position.set(f.x + 70 * Math.sin(roll) * Math.cos(fi), f.y + 70 * (1 - Math.cos(roll)), -70 * Math.sin(roll) * Math.sin(fi));
    L.cabeca.rotation.z = -rad(j.angCabeca);
    const pisca = (t + i * 1700) % (L.tipo === 'bob' ? 2850 : 3200) < (L.tipo === 'bob' ? 145 : 120) || f.hp === 0;
    L.olhos.scale.y = L.tipo === 'bob' && f.acao === 'apanhou' ? 0.55 : pisca ? (L.tipo === 'bob' ? 0.08 : 0.15) : 1;
    if (L.tipo === 'bob') L.olhos.rotation.z = f.acao === 'defesa' ? -0.12 : Math.sin(t / 520) * 0.025;
    // martelo
    const comMartelo = f.martelo > 0;
    L.cabo.visible = L.malho.visible = comMartelo;
    if (comMartelo) {
      liga(L.cabo, j.mao[0], j.ponta, zb[0]);
      L.malho.position.set(j.ponta[0], j.ponta[1], zb[0]); L.malho.rotation.z = L.cabo.rotation.z;
    }
    // espada do palito: da mão até a ponta
    if (L.espada) {
      const tem = !!j.espada && L.skin !== 'pirata';
      L.espada.visible = tem;
      if (tem) {
        const m = j.mao[0], dx = j.espada[0] - m[0], dy = j.espada[1] - m[1];
        // fio cheio: lâmina brilha azul pulsando; nos MIL CORTES brilha forte
        const sup = f.acao === 'milCortes', cheio = (f.fio || 0) >= 100;
        L.espada.userData.aco.emissive.setHex(sup ? 0x7dd3fc : cheio ? 0x0ea5e9 : 0x1e293b);
        L.espada.userData.aco.emissiveIntensity = sup ? 1.2 : cheio ? 0.5 + 0.4 * Math.sin(t / 120) : 1;
        L.espada.position.set(m[0], m[1], zb[0]); L.espada.rotation.z = Math.atan2(dy, dx) - Math.PI / 2;
      }
    }
    if (L.laminas) for (const k of [0, 1]) {
      const arma = L.laminas[k], dx = j.mao[k][0] - j.cot[k][0], dy = j.mao[k][1] - j.cot[k][1];
      arma.position.set(j.mao[k][0], j.mao[k][1], zb[k]);
      arma.rotation.z = Math.atan2(dy, dx) - Math.PI / 2;
    }
    // rastro: aparece na hora em que o golpe acerta. [centro, raio, ângulo inicial, tamanho do arco] (radianos, 0 = pra frente)
    let R = {
      socoAlto: ['ombro', 66, -0.9, 1.1], socoBaixo: ['ombro', 64, -1.2, 1.1], socoAgachado: ['ombro', 64, -1.2, 1.1], socoAereo: ['ombro', 66, -0.9, 1.3],
      chuteAlto: ['quadril', 70, -1.3, 2.2], chuteBaixo: ['quadril', 68, -1.4, 1.3], chuteAgachado: ['quadril', 68, -1.0, 1.0],
      gancho: ['ombro', 68, -1.6, 3.0], martelada: ['ombro', 80, -0.2, 1.9], giro: ['quadril', 72, -0.6, 1.6], rasteira: ['quadril', 72, -1.65, 0.9],
      voadora: ['quadril', 70, -0.9, 0.6], magia: ['ombro', 64, -0.3, 0.6], fatalBlow: ['ombro', 85, -0.9, 1.5],
      socoRocha: ['ombro', 95, -0.7, 1.4], chuteCristal: ['quadril', 98, -1.3, 2.0],
      armada: ['quadril', 74, -0.6, 1.8], meiaLua: ['quadril', 78, -0.5, 2.4], bencao: ['quadril', 68, -1.2, 1.0], rabo: ['quadril', 76, -1.0, 2.0],
      parafuso: ['quadril', 72, -1.0, 1.6], tempestade: ['quadril', 78, -1.5, 3.0],
      bengalada: ['ombro', 100, -0.3, 1.9], rasteiraBengala: ['ombro', 100, -1.6, 1.0],
    }[f.acao];
    // palito: o rastro é o corte da espada (maior); no giro a espada desenha um círculo inteiro
    if (L.espada && j.espada) R = ( { socoAlto: ['ombro', 110, -0.2, 1.6], socoBaixo: ['ombro', 108, -1.3, 1.5], gancho: ['ombro', 112, -1.6, 2.7], giro: ['ombro', 112, 0, 6.28], milCortes: ['ombro', 115, -1.4, 3.0], chuteAlto: ['ombro', 110, -0.4, 2.4], chuteBaixo: ['ombro', 100, -1.1, 0.4], magia: R })[f.acao] || R;
    const multi = f.acao === 'milCortes' ? [[4, 7], [11, 14], [18, 21], [25, 28], [32, 35], [39, 42]]
      : f.acao === 'tempestade' ? [[6, 9], [14, 17], [22, 25], [30, 33], [40, 44]] : null;
    const faseRastro = multi ? multi.find(([ini, fim]) => f.t >= ini - 1 && f.t <= fim + 2) : null;
    const vis = R && (multi ? !!faseRastro : j.u > 0.3 && j.u < 0.7);
    L.rastro.visible = !!vis;
    if (vis) {
      const c = R[0] === 'ombro' ? j.ombro : j.quadril, z = R[0] === 'ombro' ? zb[0] : L.z.perna[0];
      L.rastro.position.set(c[0], c[1], z + 1);
      L.rastro.scale.setScalar(R[1]);
      // gancho e martelada desenham o arco de baixo pra cima / de cima pra baixo
      L.rastro.rotation.set(0, 0, R[2]);
      L.rastro.geometry = arcos[R[3]] || (arcos[R[3]] = new THREE.RingGeometry(0.72, 1.05, 24, 1, 0, R[3]));
      const pulso = multi ? Math.sin(Math.PI * Math.max(0, Math.min(1, (f.t - faseRastro[0] + 1) / (faseRastro[1] - faseRastro[0] + 3))))
        : Math.sin((j.u - 0.3) / 0.4 * Math.PI);
      L.rastro.material.color.setHex(L.elemental ? L.elemental.tema.clara : L.tipo === 'palito' ? 0x93c5fd : L.tipo === 'blocos' ? 0x67e8f9 : L.tipo === 'eddie' ? 0xfde047 : 0xe9d5ff);
      L.rastro.material.opacity = (multi ? 0.7 : 0.55) * pulso;
    }
    // brilho: piscar branco ao apanhar, arco-íris com estrela
    const em = new THREE.Color(0, 0, 0);
    if (j.flash) em.setRGB(0.45, 0.45, 0.45);
    else if (f.estrela > 0) em.setHSL((t / 1000) % 1, 1, 0.35);
    else if (f.acao === 'tempestade') em.setRGB(0.35, 0.25, 0.02);
    else if (f.acao === 'ancestrais') em.setRGB(0.12, 0.13, 0.3);
    else if (L.tipo === 'pretoVelho' && (f.axe || 0) >= 100) em.setRGB(0.04, 0.045, 0.1).multiplyScalar(1 + 0.8 * Math.sin(t / 150));
    else if (f.acao === 'mandinga') em.setRGB(0.08, 0.06, 0.25).multiplyScalar(1 + 0.6 * Math.sin(t / 50));
    else if (f.acao === 'benze') em.setRGB(0.15, 0.13, 0.06);
    else if (f.zonzo > 0) em.setRGB(0.1, 0.1, 0.1);
    else if (L.tipo === 'eddie' && (f.axe || 0) >= 100) em.setRGB(0.05, 0.035, 0).multiplyScalar(1 + 0.8 * Math.sin(t / 150));
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
  const pedras = [0, 1, 2, 3].map(() => {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.DodecahedronGeometry(36, 0), new THREE.MeshStandardMaterial({ color: 0x555b68, roughness: 0.9 })));
    const cristal = new THREE.MeshStandardMaterial({ color: 0x70e8f7, emissive: 0x126176, metalness: 0.25, roughness: 0.15 });
    for (let n = 0; n < 4; n++) {
      const ponta = new THREE.Mesh(new THREE.ConeGeometry(11, 36, 5), cristal);
      ponta.position.set(0, 28, 0); ponta.rotation.z = n * Math.PI / 2; g.add(ponta);
    }
    g.visible = false; scene.add(g); return g;
  });

  // ---------- espada voadora (bola de fogo do Palito) ----------
  const espadas = [0, 1, 2, 3].map(() => {
    const g = new THREE.Group(), gira = new THREE.Group(); g.add(gira);
    const esp = criaEspada(0xffffff); esp.position.y = -40; gira.add(esp);
    const disco = new THREE.Mesh(new THREE.RingGeometry(40, 50, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
    g.add(disco); g.visible = false; scene.add(g);
    return { g, gira, disco };
  });

  // ---------- ondas sonoras do berimbau (bola de fogo do Eddie) ----------
  const ondas = [0, 1, 2, 3].map(() => {
    const g = new THREE.Group(), aneis = [];
    for (let n = 0; n < 4; n++) {
      const a = new THREE.Mesh(new THREE.TorusGeometry(12 + n * 7, 2.2 - n * 0.3, 8, 32), new THREE.MeshBasicMaterial({ color: n % 2 ? 0xffffff : 0xfde047, transparent: true, opacity: 0.9 - n * 0.18, blending: THREE.AdditiveBlending, depthWrite: false }));
      a.rotation.y = Math.PI / 2; g.add(a); aneis.push(a);
    }
    const luz = new THREE.PointLight(0xfde047, 3, 280, 0); g.add(luz, brilho(0xfde047, 70, 0.6));
    g.visible = false; scene.add(g);
    return { g, aneis, luz };
  });

  // ---------- nuvem do cachimbo (projétil do Preto Velho) ----------
  const fumacaMat = new THREE.MeshStandardMaterial({ color: 0xc9c4bb, roughness: 1, transparent: true, opacity: 0.7, depthWrite: false });
  const nuvens = [0, 1, 2, 3].map(() => {
    const g = new THREE.Group(), bolas = [];
    for (let n = 0; n < 9; n++) { const b = new THREE.Mesh(new THREE.SphereGeometry(9 + (n % 3) * 4, 10, 8), fumacaMat); g.add(b); bolas.push({ b, a: n * 0.7, r: 6 + (n % 4) * 5 }); }
    g.visible = false; scene.add(g);
    return { g, bolas };
  });

  // ---------- luzes dos ancestrais (super do Preto Velho) ----------
  const LUZES_ANC = [[10, 13], [18, 21], [26, 29], [34, 40]]; // mesmas janelas de acerto do servidor
  const luzesAnc = Array.from({ length: 8 }, (_, n) => { const s = brilho(n % 2 ? 0xffffff : 0xa5b4fc, 46, 0); scene.add(s); return s; });

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
  const elem = criaElementos(scene, texBrilho);

  // ---------- quadro ----------
  const L = [null, null];
  let camX = 400, camZ = 520, w0 = 0, h0 = 0;
  window.R3D = {
    frame(vis, js, perfis, t, tremor) {
      if ((sessionStorage.getItem('cenario') || 'neon') !== cenarioAtual) aplicaCenario();
      const w = cv3.clientWidth, h = cv3.clientHeight;
      if (!w || !h) return;
      if (w !== w0 || h !== h0) { w0 = w; h0 = h; renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); }
      vis.p.forEach((f, i) => {
        const tipo = (perfis && perfis[i] && perfis[i].visual) || 'palito';
        const skin = window.skinDoLutador ? window.skinDoLutador(i, tipo) : (perfis && perfis[i] && perfis[i].skins && perfis[i].skins[tipo]) || 'padrao';
        const corSalva = sessionStorage.getItem('corLutador' + i);
        const cor = corSalva && /^#[0-9a-f]{6}$/i.test(corSalva) ? parseInt(corSalva.slice(1), 16) : CORES[i];
        if (!L[i] || L[i].chave !== tipo + ':' + skin + ':' + cor) {
          if (L[i]) scene.remove(L[i].g);
          L[i] = criaLutador(tipo, skin, cor); L[i].chave = tipo + ':' + skin + ':' + cor; scene.add(L[i].g);
          const lutador = L[i];
          modelosGLB.then(manifest => {
            const entrada = manifest[tipo];
            const visual = typeof entrada === 'string' ? entrada : entrada && (entrada[skin] || entrada.padrao);
            const url = typeof visual === 'string' ? visual : visual && (visual.gltf || visual.arquivo);
            importaModeloLutador(lutador, url);
          });
        }
        L[i].cabeca.visible = !f.decapitado; // fatality da espada: cabeça sai voando (desenhada no HUD)
        L[i].g.visible = !f.explodiu && !f.esmagado; // fatality: o corpo vira pedaços (desenhados no HUD)
        L[i].dt = Math.min(50, t - (L[i].tAnt || t)); L[i].tAnt = t;
        posa(L[i], f, js[i], t, i);
      });
      luzesAnc.forEach(sp => { sp.material.opacity = 0; });
      vis.p.forEach((f, i) => {
        if (f.acao !== 'ancestrais' || !f.dur) return;
        const alvo = vis.p[1 - i];
        // cada janela solta 2 luzes: rodam em volta do velho e depois voam até o inimigo
        LUZES_ANC.forEach(([ini, fim], w) => [0, 1].forEach(par => {
          const sp = luzesAnc[w * 2 + par], ang = t / 160 + w * 1.6 + par * Math.PI;
          let x, y;
          if (f.t < ini - 6) { x = f.x + Math.cos(ang) * 40; y = 60 + w * 25 + Math.sin(ang * 2) * 10; }
          else if (f.t < ini) { const u = (f.t - (ini - 6)) / 6; x = lerp3(f.x + Math.cos(ang) * 40, alvo.x, u); y = lerp3(60 + w * 25, alvo.y + 90, u) + Math.sin(u * Math.PI) * 50; }
          else if (f.t < fim + 4) { x = alvo.x + Math.cos(ang * 3) * 12; y = alvo.y + 90 + Math.sin(ang * 3) * 12; }
          else return;
          sp.position.set(x, y, 10 + par * 6); sp.material.opacity = 0.95; sp.scale.setScalar(40 + Math.sin(t / 50 + w) * 8);
        }));
      });
      nuvens.forEach((nv, n) => {
        const m = vis.magias[n]; nv.g.visible = !!(m && m.fumaca);
        if (nv.g.visible) {
          nv.g.position.set(m.x, m.y, 0);
          nv.bolas.forEach((q, k) => { const a = q.a + t / 400; q.b.position.set(Math.cos(a) * q.r - m.dir * k * 2, Math.sin(a * 1.3) * q.r * 0.7, Math.sin(a) * q.r); });
        }
      });
      ondas.forEach((od, n) => {
        const m = vis.magias[n]; od.g.visible = !!(m && (m.onda || m.latido));
        if (od.g.visible) {
          od.g.position.set(m.x, m.y, 0);
          od.aneis.forEach((a, k) => { a.position.x = -m.dir * k * 12; a.scale.setScalar(1 + ((t / 120 + k * 0.25) % 1) * 0.35); a.material.color.setHex(m.latido ? (k % 2 ? 0xbae6fd : 0xffffff) : k % 2 ? CORES[m.dono] : 0xfde047); });
          od.luz.color.setHex(m.latido ? 0xe0f2fe : 0xfde047); od.g.scale.setScalar(m.latido ? 1.3 + Math.sin(t / 50) * 0.15 : 1);
        }
      });
      espadas.forEach((es, n) => {
        const m = vis.magias[n]; es.g.visible = !!(m && m.espada);
        if (es.g.visible) { es.g.position.set(m.x, m.y, 0); es.gira.rotation.z = -m.dir * t / 45; es.disco.material.color.setHex(CORES[m.dono]); }
      });
      fogos.forEach((fg, n) => {
        const m = vis.magias[n]; fg.g.visible = !!m && !m.onda && !m.latido && !m.espada && !m.fumaca && !m.pedra;
        if (m) { fg.g.position.set(m.x, m.y, 0); fg.aura.material.color.setHex(CORES[m.dono]); fg.aura.scale.setScalar(1 + Math.sin(t / 60) * 0.15); }
      });
      pedras.forEach((pedra, n) => {
        const m = vis.magias[n]; pedra.visible = !!(m && m.pedra);
        if (pedra.visible) { pedra.position.set(m.x, m.y, 0); pedra.rotation.z = t / 110 * m.dir; pedra.scale.setScalar(m.gigante ? 1.75 : 1); }
      });
      const vivos = new Set();
      for (const it of vis.itens) {
        if (elem.eElemento(it.tipo)) continue; // esses o elementos3d desenha
        vivos.add(it.id);
        if (!itensVis.has(it.id)) itensVis.set(it.id, spriteItem(it.tipo));
        const sp = itensVis.get(it.id);
        sp.position.set(it.x, it.y + 22 + (it.y === 0 ? Math.sin(t / 250 + it.id) * 4 : 0), 0);
        sp.visible = !(it.vida < 90 && Math.floor(t / 100) % 2);
      }
      for (const [id, sp] of itensVis) if (!vivos.has(id)) { scene.remove(sp); sp.material.dispose(); itensVis.delete(id); }
      // mãos no mundo (as juntas são locais, x pra frente) pras chamas do item de fogo
      const maos = js.map((j, i) => j && j.mao ? j.mao.map(m => [vis.p[i].x + m[0] * vis.p[i].facing, vis.p[i].y + m[1]]) : null);
      elem.frame(vis, t, maos);
      hemi.intensity = 1 + elem.flash * 4; if (elem.flash > 0.05) hemi.color.setHex(0xd8d0ff);
      for (const tc of tochas) {
        const tr = Math.sin(t / 400 + tc.fase) * 0.15 + (Math.random() < 0.01 ? -0.4 : 0); // pulsa e às vezes falha
        tc.luz.intensity = 3 + tr * 4; tc.halo.material.opacity = 0.7 + tr;
      }
      for (const p of pisca) p.luz.material.opacity = Math.sin(t / 300 + p.fase) > 0.6 ? 0.95 : 0.05;
      for (const o of cidade.children) { o.position.x -= 0.9; if (o.position.x < -2200) o.position.x += 5200; }
      for (const c of carros) { c.g.position.x += c.v * 16; if (c.g.position.x > 2400) c.g.position.x = -1600; if (c.g.position.x < -1600) c.g.position.x = 2400; }
      if (cenarioAtual === 'brasil') {
        ondasPraia.forEach((o, i) => { o.position.z = Math.sin(t / 750 + i * 0.8) * 9; o.material.opacity = 0.28 + 0.32 * (0.5 + 0.5 * Math.sin(t / 600 + i)); });
        reflexos.forEach(({ mesh, fase }, i) => { mesh.material.opacity = 0.22 + 0.15 * Math.sin(t / 420 + fase); mesh.scale.x = 0.75 + 0.25 * Math.sin(t / 650 + i); });
        coqueiros.forEach(({ copa, fase }) => { copa.rotation.z = Math.sin(t / 1700 + fase) * 0.06; });
        barcos.forEach(({ g, x }, i) => { g.position.x = x + Math.sin(t / 2600 + i) * 26; g.position.y = 5 + Math.sin(t / 700 + i) * 2; g.rotation.z = Math.sin(t / 900 + i) * 0.025; });
        passaros.forEach(({ g, fase }) => { g.position.x = -1000 + ((t * 0.035 + fase * 330) % 2600); g.position.y = 280 + Math.sin(t / 650 + fase) * 12; g.children[0].rotation.y = Math.sin(t / 130 + fase) * 0.35; g.children[1].rotation.y = -g.children[0].rotation.y; });
      }
      const palcoAtivo = palcos[cenarioAtual], anim = palcoAtivo && palcoAtivo.userData.anim;
      if (anim) {
        anim.gira.forEach(({ o, v }) => { o.rotation.z += v; o.material.opacity = 0.42 + Math.sin(t / 720 + o.position.y) * 0.22; });
        anim.pulsa.forEach(({ o, base }) => { const p = 0.7 + 0.3 * (0.5 + 0.5 * Math.sin(t / 260 + base)); o.scale.setScalar(p); });
        anim.move.forEach(({ o, x, v }) => { o.position.x = x + t * v; if (o.position.x > 2300) o.position.x = -1900; if (o.position.x < -1900) o.position.x = 2300; });
        anim.particulas.forEach(({ o, x, y, fase, tipo }) => {
          if (tipo === 'petala') { o.position.x = x + Math.sin(t / 900 + fase) * 65; o.position.y = 90 + ((y - t * 0.045 + fase * 30) % 320 + 320) % 320; o.rotation.z = t / 800 + fase; }
          else if (tipo === 'neve') { o.position.x = x + Math.sin(t / 1100 + fase) * 38; o.position.y = 30 + ((y - t * 0.055 + fase * 40) % 580 + 580) % 580; o.rotation.x = t / 900 + fase; o.rotation.z = t / 1200; }
          else if (tipo === 'poeira') { o.position.x = x + Math.sin(t / 1250 + fase) * 90; o.position.y = y + Math.sin(t / 680 + fase) * 26; }
          else if (tipo === 'vapor') { o.position.x = x + Math.sin(t / 800 + fase) * 16; o.position.y = 25 + ((y + t * 0.025 + fase * 20) % 130); o.material.opacity = 0.08 + 0.13 * (0.5 + 0.5 * Math.sin(t / 500 + fase)); }
        });
      }
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

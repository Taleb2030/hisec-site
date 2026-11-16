/* =========================================================
   HISEC — 3D product-line showcase (home page)
   Floating product carousel driven by scroll: one procedural device per
   solution (no external assets) floats on an arc in front of a red arch.
   Scrolling through the sticky section brings each device to the centre;
   the HTML caption, counter, ring text and "discover" pill follow.
   Loaded lazily from main.js; throws if WebGL is unavailable so the caller
   can fall back to the plain solution list.
   ========================================================= */
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const RED = 0xe31e24;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const damp = (current, target, lambda, dt) => current + (target - current) * (1 - Math.exp(-lambda * dt));
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// Flame pictogram (same path as the site's icon sprite, 24×24 grid).
const FLAME = "M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z";
const MONO = '"IBM Plex Mono", ui-monospace, monospace';

export function initShowcase3D(section, { scrollTo } = {}) {
  const sticky = section.querySelector(".showcase__sticky");
  const canvas = section.querySelector(".showcase__canvas");
  const ring = section.querySelector(".showcase__ring");
  const arch = section.querySelector(".showcase__arch");
  const pill = section.querySelector("[data-sc-pill]");
  const items = [...section.querySelectorAll("[data-sc-item]")];
  const indexEl = section.querySelector("[data-sc-index]");
  const bar = section.querySelector("[data-sc-bar]");
  const links = items.map((li) => li.querySelector("a").href);
  const n = items.length;
  const dirSign = document.documentElement.dir === "rtl" ? -1 : 1; // RTL: the arc runs the other way
  const small = window.matchMedia("(max-width: 767px)").matches;

  /* ---------- renderer, scene, camera ---------- */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, small ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x141011, 9.5, 15); // devices further along the arc sink into the dark
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTexture;
  scene.environmentIntensity = 0.55;
  pmrem.dispose();

  const view = new THREE.PerspectiveCamera(30, 1, 0.1, 60);
  view.position.set(0, 0, 9);

  const key = new THREE.DirectionalLight(0xffffff, 2.3);
  key.position.set(3, 4, 6);
  const rimRed = new THREE.DirectionalLight(0xff2a30, 4.5); // the arch "lights" the devices from behind
  rimRed.position.set(-1.5, 3, -5);
  const rimSide = new THREE.DirectionalLight(0xff7a7e, 2);
  rimSide.position.set(5, 0.5, -3);
  scene.add(key, rimRed, rimSide, new THREE.HemisphereLight(0xffffff, 0x2a1214, 0.45));

  /* ---------- helpers ---------- */
  const disposables = [];
  const keep = (x) => (disposables.push(x), x);
  const mesh = (geometry, material) => new THREE.Mesh(keep(geometry), material);
  const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  const canvasTex = (w, h, draw) => {
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    draw(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = maxAniso;
    return keep(t);
  };
  const box = (w, h, d, r, mat) => mesh(new RoundedBoxGeometry(w, h, d, 4, r), mat);
  const facing = (geometry) => geometry.rotateX(Math.PI / 2); // cylinder axis → z (toward viewer)

  /* ---------- materials ---------- */
  const M = {
    red: keep(new THREE.MeshPhysicalMaterial({ color: RED, roughness: 0.32, clearcoat: 0.8, clearcoatRoughness: 0.15 })),
    redDeep: keep(new THREE.MeshStandardMaterial({ color: 0x9e1015, roughness: 0.5 })),
    white: keep(new THREE.MeshPhysicalMaterial({ color: 0xf3f0f0, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.2 })),
    blackGloss: keep(new THREE.MeshPhysicalMaterial({ color: 0x0f0c0d, roughness: 0.18, clearcoat: 1, clearcoatRoughness: 0.05 })),
    blackMatte: keep(new THREE.MeshStandardMaterial({ color: 0x161314, roughness: 0.6 })),
    steel: keep(new THREE.MeshStandardMaterial({ color: 0xbdb8b9, metalness: 1, roughness: 0.27 })),
    darkMetal: keep(new THREE.MeshStandardMaterial({ color: 0x3a3435, metalness: 0.9, roughness: 0.32 })),
    copper: keep(new THREE.MeshStandardMaterial({ color: 0xd88a4f, metalness: 1, roughness: 0.3 })),
    glass: keep(new THREE.MeshPhysicalMaterial({
      color: 0x0a1424, roughness: 0.03, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.02, iridescence: 0.7, iridescenceIOR: 1.7,
    })),
    glassSheet: keep(new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.14, roughness: 0.04, clearcoat: 1, depthWrite: false })),
    smoke: keep(new THREE.MeshPhysicalMaterial({ color: 0x1a1516, transparent: true, opacity: 0.55, roughness: 0.04, metalness: 0.25, clearcoat: 1, depthWrite: false })),
    milk: keep(new THREE.MeshPhysicalMaterial({ color: 0xe4e0e8, roughness: 0.28, clearcoat: 0.5, flatShading: true })),
    reflect: keep(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25, emissive: 0x2a2a2a })),
    ledRed: keep(new THREE.MeshStandardMaterial({ color: 0x3a0405, emissive: 0xff2a30, emissiveIntensity: 2.5 })),
    ledGreen: keep(new THREE.MeshStandardMaterial({ color: 0x04260f, emissive: 0x2dff7a, emissiveIntensity: 2 })),
    ledWhite: keep(new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xdfefff, emissiveIntensity: 1.6 })),
  };
  const led = (mat, r = 0.024) => mesh(new THREE.SphereGeometry(r, 16, 8), mat);

  /* ---------- devices (one per solution, same order as SOLUTIONS) ---------- */
  // 01 · Fire safety — manual call point
  const callPoint = () => {
    const g = new THREE.Group();
    const back = box(1.08, 1.08, 0.18, 0.06, M.redDeep);
    back.position.z = -0.22;
    const body = box(1, 1, 0.34, 0.09, M.red);
    const frame = box(0.76, 0.76, 0.06, 0.03, M.white);
    frame.position.z = 0.17;
    const faceTex = canvasTex(512, 512, (x, w, h) => {
      x.fillStyle = "#f8f6f6"; x.fillRect(0, 0, w, h);
      x.strokeStyle = "#1c1617"; x.lineWidth = 10; x.strokeRect(48, 48, w - 96, h - 96);
      x.save(); x.translate(w / 2 - 120, h / 2 - 150); x.scale(10, 10);
      x.fillStyle = "#e31e24"; x.fill(new Path2D(FLAME)); x.restore();
      x.fillStyle = "#1c1617"; x.font = `600 34px ${MONO}`; x.textAlign = "center"; x.fillText("HISEC", w / 2, h - 92);
    });
    const face = mesh(new THREE.PlaneGeometry(0.64, 0.64), keep(new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.5 })));
    face.position.z = 0.201;
    const glass = mesh(new THREE.PlaneGeometry(0.66, 0.66), M.glassSheet);
    glass.position.z = 0.215;
    const keyhole = mesh(facing(new THREE.CylinderGeometry(0.035, 0.035, 0.02, 20)), M.darkMetal);
    keyhole.position.set(0.36, -0.4, 0.175);
    const lamp = led(M.ledRed, 0.026);
    lamp.position.set(-0.36, -0.4, 0.175);
    g.add(back, body, frame, face, glass, keyhole, lamp);
    return g;
  };

  // 02 · Intercom — video door station
  const doorStation = () => {
    const g = new THREE.Group();
    const body = box(0.62, 1.42, 0.16, 0.06, M.steel);
    const face = box(0.54, 1.32, 0.03, 0.012, M.blackGloss);
    face.position.z = 0.085;
    const camRing = mesh(new THREE.TorusGeometry(0.07, 0.014, 12, 40), M.steel);
    camRing.position.set(0, 0.46, 0.103);
    const camLens = mesh(new THREE.SphereGeometry(0.056, 24, 16), M.glass);
    camLens.scale.z = 0.5;
    camLens.position.set(0, 0.46, 0.1);
    const grilleTex = canvasTex(256, 128, (x, w, h) => {
      x.fillStyle = "#57504f";
      for (let yy = 16; yy < h; yy += 16) for (let xx = 16; xx < w; xx += 16) { x.beginPath(); x.arc(xx, yy, 4, 0, Math.PI * 2); x.fill(); }
    });
    const grille = mesh(new THREE.PlaneGeometry(0.3, 0.15), keep(new THREE.MeshStandardMaterial({ map: grilleTex, transparent: true, roughness: 0.6 })));
    grille.position.set(0, 0.2, 0.101);
    const screenTex = canvasTex(256, 96, (x, w, h) => {
      x.fillStyle = "#0b0a0a"; x.fillRect(0, 0, w, h);
      x.fillStyle = "#ff3b40"; x.beginPath(); x.arc(30, h / 2, 7, 0, Math.PI * 2); x.fill();
      x.fillStyle = "#f2eeee"; x.font = `600 40px ${MONO}`; x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("HISEC", w / 2 + 12, h / 2 + 2);
    });
    const screen = mesh(new THREE.PlaneGeometry(0.34, 0.13), keep(new THREE.MeshBasicMaterial({ map: screenTex })));
    screen.position.set(0, -0.06, 0.101);
    const button = mesh(facing(new THREE.CylinderGeometry(0.085, 0.085, 0.03, 40)), M.steel);
    button.position.set(0, -0.38, 0.11);
    const ledRing = mesh(new THREE.TorusGeometry(0.102, 0.01, 10, 48), M.ledWhite);
    ledRing.position.set(0, -0.38, 0.1);
    g.add(body, face, camRing, camLens, grille, screen, button, ledRing);
    return g;
  };

  // 03 · Video surveillance — dome camera (smoked dome, lens visible inside)
  const domeCamera = () => {
    const g = new THREE.Group();
    const base = mesh(facing(new THREE.CylinderGeometry(0.62, 0.66, 0.2, 64)), M.white);
    base.position.z = -0.1;
    const trim = mesh(new THREE.TorusGeometry(0.56, 0.035, 16, 64), M.steel);
    const inner = new THREE.Group();
    const housing = mesh(new THREE.SphereGeometry(0.3, 32, 24), M.blackMatte);
    housing.position.z = 0.05;
    const barrel = mesh(facing(new THREE.CylinderGeometry(0.11, 0.12, 0.16, 32)), M.darkMetal);
    barrel.position.z = 0.3;
    const lens = mesh(facing(new THREE.SphereGeometry(0.095, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2)), M.glass);
    lens.scale.z = 0.5;
    lens.position.z = 0.38;
    const lamp = led(M.ledRed, 0.02);
    lamp.position.set(0.17, 0.12, 0.27);
    inner.add(housing, barrel, lens, lamp);
    inner.rotation.x = 0.32; // looks slightly down
    const dome = mesh(facing(new THREE.SphereGeometry(0.52, 64, 32, 0, Math.PI * 2, 0, Math.PI / 2)), M.smoke);
    dome.renderOrder = 2;
    g.add(base, trim, inner, dome);
    return g;
  };

  // 04 · Access control — backlit code keypad
  const keypad = () => {
    const g = new THREE.Group();
    const body = box(0.72, 1.22, 0.14, 0.06, M.blackGloss);
    const keysTex = canvasTex(512, 910, (x, w, h) => {
      x.fillStyle = "#121011"; x.fillRect(0, 0, w, h);
      x.strokeStyle = "#8d8486"; x.lineWidth = 10; x.lineCap = "round";
      for (let k = 1; k <= 3; k++) { x.beginPath(); x.arc(w / 2 - 44, 140, 24 * k + 8, -0.75, 0.75); x.stroke(); }
      const kw = 120, kh = 112, gx = 30, gy = 26;
      const sx = (w - (3 * kw + 2 * gx)) / 2, sy = 270;
      x.font = `600 52px ${MONO}`; x.textAlign = "center"; x.textBaseline = "middle";
      [..."123456789*0#"].forEach((label, i) => {
        const cx = sx + (i % 3) * (kw + gx), cy = sy + Math.floor(i / 3) * (kh + gy);
        x.beginPath(); x.roundRect(cx, cy, kw, kh, 18);
        x.fillStyle = "#1f1b1c"; x.fill(); x.lineWidth = 3; x.strokeStyle = "#4d4547"; x.stroke();
        x.fillStyle = "#f4f0f0"; x.fillText(label, cx + kw / 2, cy + kh / 2 + 3);
      });
    });
    const face = mesh(new THREE.PlaneGeometry(0.62, 1.1), keep(new THREE.MeshStandardMaterial({
      map: keysTex, emissiveMap: keysTex, emissive: 0xffffff, emissiveIntensity: 0.55, roughness: 0.3,
    })));
    face.position.z = 0.0705;
    const ok = led(M.ledGreen);
    ok.position.set(0.2, 0.48, 0.075);
    const ko = led(M.ledRed);
    ko.position.set(0.12, 0.48, 0.075);
    g.add(body, face, ok, ko);
    return g;
  };

  // 05 · Cables & accessories — twisted bundle with stripped copper ends
  const cableBundle = () => {
    const g = new THREE.Group();
    const colors = [RED, 0x2f6fe0, 0xf2c230, 0x22a35a, 0xf4f1f1];
    const tipGeo = keep(new THREE.CylinderGeometry(0.028, 0.028, 0.12, 12));
    const up = new THREE.Vector3(0, 1, 0);
    colors.forEach((color, k) => {
      const phase = (k / colors.length) * Math.PI * 2;
      const pts = [];
      for (let s = 0; s <= 40; s++) {
        const t = s / 40;
        const spread = Math.max(0, Math.abs(t - 0.5) * 2 - 0.5); // 0 in the bundle, grows toward the ends
        const r = 0.12 + spread * spread * 2.2;
        const a = phase + t * Math.PI * 1.6;
        pts.push(new THREE.Vector3(Math.cos(a) * r, -0.75 + t * 1.5, Math.sin(a) * r));
      }
      const curve = new THREE.CatmullRomCurve3(pts);
      const sheath = keep(new THREE.MeshPhysicalMaterial({ color, roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.2 }));
      g.add(mesh(new THREE.TubeGeometry(curve, 160, 0.05, 14), sheath));
      for (const end of [0, 1]) {
        const tan = curve.getTangentAt(end);
        const tip = new THREE.Mesh(tipGeo, M.copper);
        tip.position.copy(curve.getPointAt(end)).addScaledVector(tan, end ? 0.05 : -0.05);
        tip.quaternion.setFromUnitVectors(up, tan);
        g.add(tip);
      }
    });
    for (const y of [-0.14, 0.14]) {
      const tie = mesh(new THREE.TorusGeometry(0.19, 0.022, 10, 40).rotateX(Math.PI / 2), M.blackMatte);
      tie.position.y = y;
      g.add(tie);
    }
    return g;
  };

  // 06 · Intrusion — PIR motion detector with faceted lens
  const pirDetector = () => {
    const g = new THREE.Group();
    const body = box(0.72, 1.02, 0.38, 0.14, M.white);
    const lens = mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.52, 9, 1, false, -Math.PI / 2, Math.PI).rotateZ(Math.PI / 2), M.milk);
    lens.scale.z = 0.55;
    lens.position.set(0, 0.18, 0.18);
    const lamp = led(M.ledRed, 0.028);
    lamp.position.set(0, -0.22, 0.19);
    const logoTex = canvasTex(256, 64, (x, w, h) => {
      x.fillStyle = "#e31e24"; x.font = '800 40px Archivo, "Arial Narrow", sans-serif';
      x.textAlign = "center"; x.textBaseline = "middle"; x.fillText("hisec", w / 2, h / 2);
    });
    const logo = mesh(new THREE.PlaneGeometry(0.26, 0.065), keep(new THREE.MeshStandardMaterial({ map: logoTex, transparent: true, roughness: 0.4 })));
    logo.position.set(0, -0.36, 0.191);
    g.add(body, lens, lamp, logo);
    return g;
  };

  // 07 · High security — retractable bollard with LED crown
  const bollard = () => {
    const g = new THREE.Group();
    const plate = mesh(new THREE.CylinderGeometry(0.48, 0.5, 0.05, 64), M.darkMetal);
    plate.position.y = -0.72;
    const collar = mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.06, 48), M.steel);
    collar.position.y = -0.68;
    const body = mesh(new THREE.CylinderGeometry(0.26, 0.26, 1.3, 64), M.steel);
    const band1 = mesh(new THREE.CylinderGeometry(0.263, 0.263, 0.1, 64), M.red);
    band1.position.y = 0.3;
    const band2 = mesh(new THREE.CylinderGeometry(0.263, 0.263, 0.08, 64), M.reflect);
    band2.position.y = 0.16;
    const cap = mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.05, 64), M.darkMetal);
    cap.position.y = 0.67;
    const crown = mesh(new THREE.SphereGeometry(0.27, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2), M.steel);
    crown.scale.y = 0.22;
    crown.position.y = 0.695;
    const ledRing = mesh(new THREE.TorusGeometry(0.265, 0.016, 12, 64).rotateX(Math.PI / 2), M.ledRed);
    ledRing.position.y = 0.6;
    g.add(plate, collar, body, band1, band2, cap, crown, ledRing);
    return g;
  };

  const builders = [callPoint, doorStation, domeCamera, keypad, cableBundle, pirDetector, bollard];

  // Normalise every device to the same visual size, centred on its holder.
  const fit = (model, size = 1.35) => {
    const bounds = new THREE.Box3().setFromObject(model);
    const s = bounds.getSize(new THREE.Vector3());
    const c = bounds.getCenter(new THREE.Vector3());
    const k = size / Math.max(s.y, s.x * 0.95);
    model.scale.setScalar(k);
    model.position.copy(c).multiplyScalar(-k);
    return model;
  };

  const carousel = new THREE.Group();
  scene.add(carousel);
  const products = items.map((_, i) => {
    const holder = new THREE.Group();
    holder.userData.index = i;
    holder.add(fit(builders[i % builders.length]()));
    carousel.add(holder);
    return holder;
  });

  /* ---------- atmosphere: light pool under the active device + drifting dust ---------- */
  const radial = (stops) => canvasTex(256, 256, (x, w, h) => {
    const grad = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    stops.forEach(([o, c]) => grad.addColorStop(o, c));
    x.fillStyle = grad; x.fillRect(0, 0, w, h);
  });
  const poolMat = keep(new THREE.MeshBasicMaterial({
    map: radial([[0, "rgba(255,60,66,.75)"], [0.45, "rgba(227,30,36,.25)"], [1, "rgba(227,30,36,0)"]]),
    transparent: true, depthWrite: false, fog: false,
  }));
  const pool = mesh(new THREE.PlaneGeometry(4.2, 2.2), poolMat);
  pool.rotation.x = -Math.PI / 2;
  scene.add(pool);

  const DUST = small ? 140 : 260;
  const dustPos = new Float32Array(DUST * 3);
  for (let i = 0; i < DUST; i++) {
    dustPos[i * 3] = (Math.random() - 0.5) * 16;
    dustPos[i * 3 + 1] = (Math.random() - 0.5) * 7;
    dustPos[i * 3 + 2] = -6 + Math.random() * 8;
  }
  const dustGeo = keep(new THREE.BufferGeometry());
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  const dust = new THREE.Points(dustGeo, keep(new THREE.PointsMaterial({
    size: 0.045, map: radial([[0, "rgba(255,255,255,1)"], [1, "rgba(255,255,255,0)"]]),
    color: 0xffb8ba, transparent: true, opacity: 0.6, depthWrite: false, sizeAttenuation: true,
  })));
  scene.add(dust);

  /* ---------- layout (recomputed on resize) ---------- */
  const ACTIVE_Z = 0.6;
  const L = { offsetX: 0, baseY: 0, scale: 1, R: 5.5, wide: false };
  const v3 = new THREE.Vector3();
  const toScreen = (x, y, z, w, h) => {
    v3.set(x, y, z).project(view);
    return { x: (v3.x + 1) / 2 * w, y: (1 - v3.y) / 2 * h };
  };
  // World point on the plane `z` that lands at screen fraction (fx, fy).
  const fromScreen = (fx, fy, z) => {
    const halfH = Math.tan(THREE.MathUtils.degToRad(view.fov / 2)) * (view.position.z - z);
    return { x: (fx - 0.5) * 2 * halfH * view.aspect, y: (0.5 - fy) * 2 * halfH, halfH };
  };

  let W = 1, H = 1;
  const resize = () => {
    W = sticky.clientWidth;
    H = sticky.clientHeight;
    if (!W || !H) return;
    renderer.setSize(W, H, false);
    view.aspect = W / H;
    view.updateProjectionMatrix();
    view.updateMatrixWorld(); // projection below runs before the first render

    const wide = W >= 1024 && view.aspect > 1.15;
    L.wide = wide;
    const spot = wide ? fromScreen(dirSign > 0 ? 0.66 : 0.34, 0.53, ACTIVE_Z) : fromScreen(0.5, H < 700 ? 0.38 : 0.42, ACTIVE_Z);
    L.offsetX = spot.x;
    L.baseY = spot.y;
    L.scale = wide ? 1 : clamp(spot.halfH / 2.6, 0.7, 0.95);
    L.R = (wide ? 2.5 : 1.8) / Math.sin(0.42); // neighbour spacing along the arc

    // Align the CSS arch + ring with the active slot (projected at the arch depth).
    const archZ = -1.6;
    const c = toScreen(L.offsetX, L.baseY + 0.1 * L.scale, archZ, W, H);
    const ppu = H / (2 * fromScreen(0.5, 0.5, archZ).halfH);
    sticky.style.setProperty("--ax", `${c.x.toFixed(1)}px`);
    sticky.style.setProperty("--ay", `${c.y.toFixed(1)}px`);
    sticky.style.setProperty("--as", `${(2.5 * L.scale * ppu).toFixed(1)}px`);

    pool.position.set(L.offsetX, L.baseY - 0.95 * L.scale, ACTIVE_Z - 0.4);
    pool.scale.setScalar(L.scale);
  };
  const ro = new ResizeObserver(resize);
  ro.observe(sticky);
  resize();

  /* ---------- state ---------- */
  const state = { progress: 0, c: 0, active: 0, px: 0, py: 0, tx: 0, ty: 0, pill: 0 };

  const setActive = (i) => {
    const prev = items[state.active];
    const next = items[i];
    state.active = i;
    indexEl.textContent = String(i + 1).padStart(2, "0");
    pill.href = links[i];
    prev.classList.remove("is-active");
    next.classList.add("is-active");
    gsap.killTweensOf([prev, next, ...prev.children, ...next.children]);
    gsap.to(prev, { autoAlpha: 0, duration: 0.25, ease: "power2.in" });
    gsap.set(next, { autoAlpha: 1 });
    gsap.fromTo(next.children, { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.06, ease: "power3.out", delay: 0.1 });
  };
  items.forEach((li, i) => gsap.set(li, { autoAlpha: i === 0 ? 1 : 0 }));

  /* ---------- scroll: progress + gentle snap to the nearest device ---------- */
  const range = () => section.offsetHeight - sticky.offsetHeight;
  const scrollToIndex = (i, duration = 1.1) => {
    const top = section.getBoundingClientRect().top + window.scrollY;
    const y = top + (i / (n - 1)) * range();
    if (scrollTo) scrollTo(y, duration);
    else window.scrollTo({ top: y, behavior: "smooth" });
  };
  let snapTimer = 0;
  const progressST = ScrollTrigger.create({
    trigger: section, start: "top top", end: "bottom bottom",
    onUpdate: (self) => {
      state.progress = self.progress;
      clearTimeout(snapTimer);
      if (self.progress <= 0 || self.progress >= 1) return;
      snapTimer = setTimeout(() => {
        const raw = state.progress * (n - 1);
        if (Math.abs(raw - Math.round(raw)) > 0.02) scrollToIndex(Math.round(raw), 0.6);
      }, 320);
    },
  });
  state.progress = progressST.progress;
  state.c = state.progress * (n - 1);

  // The arch rises out of the floor as the section arrives.
  const archIn = gsap.fromTo(arch, { scaleY: 0.15, autoAlpha: 0 }, {
    scaleY: 1, autoAlpha: 1, ease: "power2.out", transformOrigin: "50% 100%",
    scrollTrigger: { trigger: section, start: "top 85%", end: "top 10%", scrub: true },
  });
  const ringIn = gsap.fromTo(ring, { autoAlpha: 0 }, {
    autoAlpha: 1, ease: "none",
    scrollTrigger: { trigger: section, start: "top 40%", end: "top top", scrub: true },
  });

  /* ---------- pointer: parallax, hover cursor, click to open / go to ---------- */
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const pick = (e) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, view);
    const hit = raycaster.intersectObjects(products.filter((p) => p.visible), true)[0];
    if (!hit) return -1;
    let o = hit.object;
    while (o && o.userData.index === undefined) o = o.parent;
    return o ? o.userData.index : -1;
  };
  let hoverFrame = 0;
  const onMove = (e) => {
    if (e.pointerType !== "mouse") return;
    state.tx = (e.clientX / W - 0.5) * 2;
    state.ty = (e.clientY / H - 0.5) * 2;
    if (!hoverFrame) hoverFrame = requestAnimationFrame(() => { hoverFrame = 0; canvas.style.cursor = pick(e) >= 0 ? "pointer" : ""; });
  };
  const onLeave = () => { state.tx = 0; state.ty = 0; };
  const onClick = (e) => {
    const i = pick(e);
    if (i < 0) return;
    if (i === state.active) window.location.href = links[i];
    else scrollToIndex(i);
  };
  sticky.addEventListener("pointermove", onMove, { passive: true });
  sticky.addEventListener("pointerleave", onLeave);
  canvas.addEventListener("click", onClick);

  /* ---------- render loop (gsap.ticker, only while the section is on screen) ---------- */
  let time = 0;
  let firstFrame = true;
  const tick = (_t, deltaMs) => {
    const dt = Math.min(deltaMs / 1000, 0.05);
    time += dt;

    // Devices rest at each stop and travel in the middle of each scroll segment.
    const raw = state.progress * (n - 1);
    const seg = Math.min(Math.floor(raw), n - 2);
    const target = seg + smoothstep(0.18, 0.82, raw - seg);
    state.c = damp(state.c, target, 7, dt);
    const active = clamp(Math.round(state.c), 0, n - 1);
    if (active !== state.active) setActive(active);

    state.px = damp(state.px, state.tx, 3, dt);
    state.py = damp(state.py, state.ty, 3, dt);
    carousel.rotation.y = state.px * 0.1;
    carousel.rotation.x = state.py * 0.05;

    products.forEach((p, i) => {
      const d = i - state.c;
      const ad = Math.abs(d);
      p.visible = ad < 3.3;
      if (!p.visible) return;
      const near = Math.min(ad, 1);
      const ang = d * 0.42;
      // Wide layout: the caption sits on the "previous" side, so devices already
      // seen sink back into the dark instead of sliding over the text.
      const past = L.wide && d < 0 ? smoothstep(0.15, 1.3, -d) : 0;
      p.position.set(
        L.offsetX + dirSign * Math.sin(ang) * L.R * (1 - past * 0.55),
        L.baseY + Math.sin(time * 1.1 + i * 1.7) * 0.06 * L.scale + past * 0.5,
        ACTIVE_Z - (1 - Math.cos(ang)) * L.R - near * 0.9 - past * 4.5,
      );
      p.scale.setScalar(L.scale * (1.12 - near * 0.38 - Math.max(0, ad - 1) * 0.08) * (1 - past * 0.35));
      const swing = Math.sin(time * 0.55 + i) * (0.34 - near * 0.12);
      p.rotation.set(0.06 + Math.sin(time * 0.8 + i) * 0.03, dirSign * clamp(d, -2, 2) * 0.55 + swing, -dirSign * 0.12 * (1 - near));
    });

    // "Discover" pill rides on the active device once it has settled.
    const settled = Math.abs(state.c - Math.round(state.c)) < 0.1;
    state.pill = damp(state.pill, settled ? 1 : 0, 8, dt);
    const ap = products[state.active];
    const s = ap.scale.x;
    v3.set(ap.position.x + dirSign * 0.6 * s, ap.position.y + 0.66 * s, ap.position.z);
    carousel.localToWorld(v3).project(view);
    pill.style.transform = `translate3d(${((v3.x + 1) / 2 * W).toFixed(1)}px, ${((1 - v3.y) / 2 * H).toFixed(1)}px, 0) translate(-50%, -50%) scale(${(0.85 + state.pill * 0.15).toFixed(3)})`;
    pill.style.opacity = state.pill.toFixed(3);
    pill.style.pointerEvents = state.pill > 0.6 ? "auto" : "none";

    const p01 = state.c / (n - 1);
    ring.style.transform = `rotate(${(dirSign * p01 * 140 + time * 2.5).toFixed(2)}deg)`;
    bar.style.transform = `scaleX(${p01.toFixed(4)})`;

    M.ledRed.emissiveIntensity = 1.6 + Math.sin(time * 4) * 1.1;
    poolMat.opacity = 0.85 + Math.sin(time * 1.3) * 0.15;
    dust.rotation.y = time * 0.015;
    dust.position.x = -dirSign * state.c * 0.35;
    dust.position.y = Math.sin(time * 0.2) * 0.15;

    renderer.render(scene, view);
    if (firstFrame) { firstFrame = false; section.classList.add("is-live"); }
  };
  let running = false;
  const start = () => { if (!running) { running = true; gsap.ticker.add(tick); } };
  const stop = () => { if (running) { running = false; gsap.ticker.remove(tick); } };
  const visibility = ScrollTrigger.create({
    trigger: section, start: "top bottom", end: "bottom top",
    onToggle: (self) => (self.isActive ? start() : stop()),
  });
  if (visibility.isActive) start();

  /* ---------- lost GPU context → let the caller fall back ---------- */
  const onLost = (e) => { e.preventDefault(); destroy(); section.dispatchEvent(new CustomEvent("showcase:lost", { bubbles: true })); };
  canvas.addEventListener("webglcontextlost", onLost);

  function destroy() {
    stop();
    clearTimeout(snapTimer);
    cancelAnimationFrame(hoverFrame);
    sticky.removeEventListener("pointermove", onMove);
    sticky.removeEventListener("pointerleave", onLeave);
    canvas.removeEventListener("click", onClick);
    canvas.removeEventListener("webglcontextlost", onLost);
    ro.disconnect();
    progressST.kill();
    visibility.kill();
    [archIn, ringIn].forEach((t) => { t.scrollTrigger?.kill(); t.kill(); });
    gsap.killTweensOf(items);
    disposables.forEach((d) => d.dispose?.());
    envTexture.dispose();
    renderer.dispose();
  }

  return { destroy };
}

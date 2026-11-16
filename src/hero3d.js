/* =========================================================
   HISEC — 3D surveillance camera for the home hero
   Procedural three.js model (no external assets). The head pans and
   tilts toward the visitor's pointer, scans on its own when idle, and
   dips as the page scrolls. Rendering runs on gsap.ticker (same loop as
   Lenis) and only while the hero is on screen.
   Loaded lazily from main.js; throws if WebGL is unavailable so the
   caller can fall back to the static camera wall.
   ========================================================= */
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const BRAND_RED = 0xe31e24;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const damp = (current, target, lambda, dt) => current + (target - current) * (1 - Math.exp(-lambda * dt));

export function initHero3D(container) {
  const canvas = container.querySelector("canvas");
  const small = window.matchMedia("(max-width: 767px)").matches;

  /* ---------- renderer, scene, camera ---------- */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, small ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTexture;
  pmrem.dispose();

  const view = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  const BASE_Z = 6.4;
  view.position.set(0, 0.15, BASE_Z);
  view.lookAt(0, -0.05, 0);

  const key = new THREE.DirectionalLight(0xffffff, 2.4);
  key.position.set(3, 4, 5);
  const rim = new THREE.DirectionalLight(0xffe4e4, 1.4);
  rim.position.set(-4, 2, -3);
  scene.add(key, rim, new THREE.HemisphereLight(0xffffff, 0xd9cfcf, 0.7));

  /* ---------- materials ---------- */
  const disposables = [];
  const keep = (x) => (disposables.push(x), x);
  const white = keep(new THREE.MeshPhysicalMaterial({ color: 0xf5f2f2, roughness: 0.3, clearcoat: 0.7, clearcoatRoughness: 0.2 }));
  const grey = keep(new THREE.MeshStandardMaterial({ color: 0xcbc3c4, roughness: 0.45, metalness: 0.25 }));
  const black = keep(new THREE.MeshPhysicalMaterial({ color: 0x0e0b0c, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.05 }));
  const metal = keep(new THREE.MeshStandardMaterial({ color: 0x2b2627, roughness: 0.28, metalness: 0.9 }));
  const glass = keep(new THREE.MeshPhysicalMaterial({
    color: 0x0a1424, roughness: 0.03, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.02,
    iridescence: 0.7, iridescenceIOR: 1.7,
  }));
  const red = keep(new THREE.MeshStandardMaterial({ color: BRAND_RED, roughness: 0.38, metalness: 0.1 }));
  const statusLed = keep(new THREE.MeshStandardMaterial({ color: 0x3a0405, emissive: 0xff2a30, emissiveIntensity: 0 }));
  const irLed = keep(new THREE.MeshStandardMaterial({ color: 0x2a0a0b, roughness: 0.3, emissive: 0x7a0000, emissiveIntensity: 0 }));

  const mesh = (geometry, material) => new THREE.Mesh(keep(geometry), material);

  /* ---------- model ---------- */
  // rig: whole camera (intro drop + scroll offset)
  // pan: yaw joint under the ceiling arm · tilt: pitch joint · head: housing
  const rig = new THREE.Group();
  scene.add(rig);

  const arm = mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.6, 32), white);
  arm.position.set(0, 1.95, -0.3);
  const collar = mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.2, 32), grey);
  collar.position.set(0, 0.72, -0.3);
  rig.add(arm, collar);

  const pan = new THREE.Group();
  pan.position.set(0, 0.6, -0.3);
  rig.add(pan);
  pan.add(mesh(new THREE.SphereGeometry(0.17, 32, 16), grey));

  const tilt = new THREE.Group();
  pan.add(tilt);

  const head = new THREE.Group();
  head.position.set(0, -0.62, 0.3);
  tilt.add(head);
  const neck = mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.22, 24), grey);
  neck.position.y = -0.12;
  tilt.add(neck);

  // housing (axis along z, lens toward +z)
  const body = mesh(new THREE.CylinderGeometry(0.42, 0.42, 1.7, 64).rotateX(Math.PI / 2), white);
  const backCap = mesh(new THREE.SphereGeometry(0.42, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(-Math.PI / 2), white);
  backCap.scale.z = 0.45;
  backCap.position.z = -0.85;
  const bezel = mesh(new THREE.CylinderGeometry(0.435, 0.435, 0.1, 64).rotateX(Math.PI / 2), white);
  bezel.position.z = 0.86;
  const face = mesh(new THREE.CircleGeometry(0.39, 64), black);
  face.position.z = 0.912;
  const band = mesh(new THREE.CylinderGeometry(0.425, 0.425, 0.05, 64).rotateX(Math.PI / 2), red);
  band.position.z = 0.56;
  // sun hood: open half-shell over the top, longer than the body
  const hood = mesh(
    new THREE.CylinderGeometry(0.5, 0.5, 2.05, 64, 1, true, Math.PI * 0.45, Math.PI * 1.1).rotateX(Math.PI / 2),
    white,
  );
  hood.material = white.clone();
  hood.material.side = THREE.DoubleSide;
  keep(hood.material);
  hood.position.z = 0.12;
  head.add(body, backCap, bezel, face, band, hood);

  // lens
  const lensRing = mesh(new THREE.TorusGeometry(0.17, 0.034, 16, 48), metal);
  lensRing.position.z = 0.925;
  const barrel = mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.08, 48).rotateX(Math.PI / 2), black);
  barrel.position.z = 0.93;
  const lens = mesh(new THREE.SphereGeometry(0.15, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2), glass);
  lens.scale.z = 0.42;
  lens.position.z = 0.965;
  head.add(lensRing, barrel, lens);

  // IR illuminators around the lens + status LED
  const irGeo = keep(new THREE.SphereGeometry(0.026, 12, 8));
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const dot = new THREE.Mesh(irGeo, irLed);
    dot.position.set(Math.cos(a) * 0.285, Math.sin(a) * 0.285, 0.915);
    dot.scale.z = 0.5;
    head.add(dot);
  }
  const led = mesh(new THREE.SphereGeometry(0.022, 16, 8), statusLed);
  led.position.set(0.3, -0.27, 0.92);
  head.add(led);

  // Scanning light cone from the lens: brightest at the glass, fading with
  // distance and toward the silhouette edges, with faint pulses travelling out.
  // Seen straight down its axis it is almost invisible, so it never blocks the view.
  const beamMat = keep(new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uColor: { value: new THREE.Color(BRAND_RED) }, uOpacity: { value: 0 }, uTime: { value: 0 } },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      varying float vFacing;
      void main() {
        vUv = uv;
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vFacing = abs(dot(normalize(normalMatrix * normal), normalize(-mv.xyz)));
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      uniform float uTime;
      varying vec2 vUv;
      varying float vFacing;
      void main() {
        float a = pow(vUv.y, 1.7) * pow(vFacing, 1.4);          // vUv.y = 1 at the lens
        a *= 0.8 + 0.2 * sin(vUv.y * 42.0 + uTime * 7.0);
        gl_FragColor = vec4(uColor, a * uOpacity);
      }`,
  }));
  const beam = mesh(new THREE.ConeGeometry(0.75, 2.8, 48, 1, true).translate(0, -1.4, 0).rotateX(-Math.PI / 2), beamMat);
  beam.position.z = 0.97;
  beam.renderOrder = 5;
  head.add(beam);

  // soft contact shadow on an implied floor
  const shadowTex = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const g = c.getContext("2d");
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    grad.addColorStop(0, "rgba(28,22,23,0.55)");
    grad.addColorStop(1, "rgba(28,22,23,0)");
    g.fillStyle = grad;
    g.fillRect(0, 0, 128, 128);
    return keep(new THREE.CanvasTexture(c));
  })();
  const shadowMat = keep(new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.32 }));
  const shadow = mesh(new THREE.PlaneGeometry(3.2, 1.3), shadowMat);
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.set(0, -1.55, 0.2);
  scene.add(shadow);

  /* ---------- behaviour state ---------- */
  const REST_YAW = -0.4; // idle: look toward the headline
  const state = {
    yaw: REST_YAW - 1.1, pitch: 0.1,     // smoothed values applied to joints
    pointerYaw: REST_YAW, pointerPitch: 0.1,
    lastPointer: -Infinity,              // ms timestamp of last pointer move
    scroll: 0,                           // 0 → 1 while the hero scrolls away
    drop: 1.4,                           // intro: camera lowers into frame
    introYaw: -1.1,                      // intro: extra pan that settles to 0
  };

  const onPointer = (e) => {
    if (e.pointerType === "touch") return; // touch: let the camera scan instead
    const r = container.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height * 0.45;
    const nx = (e.clientX - cx) / (window.innerWidth * 0.5);
    const ny = (e.clientY - cy) / (window.innerHeight * 0.5);
    state.pointerYaw = clamp(nx * 0.95, -1.0, 1.0);
    state.pointerPitch = clamp(ny * 0.45 + 0.08, -0.22, 0.5);
    state.lastPointer = performance.now();
  };
  window.addEventListener("pointermove", onPointer, { passive: true });

  /* ---------- size ---------- */
  const resize = () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    view.aspect = w / h;
    view.position.z = view.aspect < 1.15 ? BASE_Z * (1.15 / view.aspect) : BASE_Z; // keep the model in frame on narrow screens
    view.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  /* ---------- render loop (gsap.ticker, only while visible) ---------- */
  let time = 0;
  let firstFrame = true;
  const tick = (_t, deltaMs) => {
    const dt = Math.min(deltaMs / 1000, 0.05);
    time += dt;

    const idle = performance.now() - state.lastPointer > 2500;
    const targetYaw = idle ? REST_YAW + Math.sin(time * 0.45) * 0.55 : state.pointerYaw;
    const targetPitch = (idle ? 0.1 + Math.sin(time * 0.9) * 0.04 : state.pointerPitch) + state.scroll * 0.45;

    state.yaw = damp(state.yaw, targetYaw, idle ? 1.6 : 5, dt);
    state.pitch = damp(state.pitch, targetPitch, idle ? 1.6 : 5, dt);

    pan.rotation.y = state.yaw + state.introYaw;
    tilt.rotation.x = state.pitch;
    rig.position.y = state.drop + state.scroll * 0.35;
    lensRing.rotation.z = time * 0.3; // slow focus-ring drift
    beamMat.uniforms.uTime.value = time;

    renderer.render(scene, view);
    if (firstFrame) { firstFrame = false; container.classList.add("is-live"); }
  };
  let running = false;
  const start = () => { if (!running) { running = true; gsap.ticker.add(tick); } };
  const stop = () => { if (running) { running = false; gsap.ticker.remove(tick); } };

  const visibility = ScrollTrigger.create({
    trigger: container, start: "top bottom", end: "bottom top",
    onToggle: (self) => (self.isActive ? start() : stop()),
  });
  if (visibility.isActive) start();

  // Scroll: the camera dips and keeps "watching" as the hero leaves.
  const scrollTween = gsap.to(state, {
    scroll: 1, ease: "none",
    scrollTrigger: { trigger: container.closest(".hero") || container, start: "top top", end: "bottom top", scrub: true },
  });

  /* ---------- intro (GSAP) ---------- */
  const intro = gsap.timeline({ delay: 0.35 })
    .to(state, { drop: 0, duration: 1.3, ease: "power3.out" })
    .to(state, { introYaw: 0, duration: 1.6, ease: "power2.inOut" }, 0.2)
    .to(irLed, { emissiveIntensity: 0.35, duration: 0.6, ease: "power1.out" }, 0.9)
    .to(statusLed, { emissiveIntensity: 3, duration: 0.15 }, 1.1)
    .to(beamMat.uniforms.uOpacity, { value: 0.6, duration: 0.9, ease: "power2.out" }, 1.15);
  const blink = gsap.to(statusLed, { emissiveIntensity: 0.3, duration: 0.8, repeat: -1, yoyo: true, ease: "steps(1)", delay: 1.4 });

  /* ---------- lost GPU context → let the caller fall back ---------- */
  const onLost = (e) => { e.preventDefault(); destroy(); container.dispatchEvent(new CustomEvent("cam3d:lost", { bubbles: true })); };
  canvas.addEventListener("webglcontextlost", onLost);

  function destroy() {
    stop();
    window.removeEventListener("pointermove", onPointer);
    canvas.removeEventListener("webglcontextlost", onLost);
    ro.disconnect();
    visibility.kill();
    scrollTween.scrollTrigger?.kill();
    scrollTween.kill();
    intro.kill();
    blink.kill();
    disposables.forEach((d) => d.dispose?.());
    envTexture.dispose();
    renderer.dispose();
  }

  return { destroy };
}

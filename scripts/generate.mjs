// Generates every HTML page in every language from /content.
//   fr → /            en → /en/            ar → /ar/ (right-to-left)
// Run directly (`npm run generate`) or automatically through the Vite plugin
// in vite.config.js (on start, on build, and whenever /content changes).

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// Cache-busting import so the dev server picks up edited translations.
const load = async (rel) => (await import(`${pathToFileURL(join(ROOT, rel)).href}?t=${Date.now()}`));

export async function generate() {
  const shared = await load("content/shared.mjs");
  const { LANGS, PHONE, TEL, MAPS_URL, mapEmbed, SOLUTIONS, WALL } = shared;
  const dicts = Object.fromEntries(await Promise.all(LANGS.map(async (l) => [l, (await load(`content/${l}.mjs`)).default])));

  const base = (lang) => (lang === LANGS[0] ? "/" : `/${lang}/`);
  const url = (lang, file) => base(lang) + (file === "index.html" ? "" : file);
  const em = (s) => s.replace(/\*(.+?)\*/g, "<em>$1</em>");
  const mark = (s) => s.replace(/\*(.+?)\*/g, "<mark>$1</mark>");
  const ltr = (s) => `<span dir="ltr">${s}</span>`;
  const ico = (id, cls = "ico") => `<svg class="${cls}" aria-hidden="true" focusable="false"><use href="#i-${id}"/></svg>`;
  const arrow = (cls = "ico") => ico("arrow", `${cls} ico--dir`);
  const lines = (arr) => arr.map((l) => `<span class="line"><span>${em(l)}</span></span>`).join("");

  const written = [];

  for (const lang of LANGS) {
    const t = dicts[lang];
    const u = (file) => url(lang, file);
    const sol = SOLUTIONS.map((s) => ({ ...s, ...t.solutions[s.key] }));
    const addrFull = `${t.address.line1}<br />${t.address.line2}<br />${t.address.country}`;

    /* ---------- shared fragments ---------- */
    // One language button (disclosure): shows the current language, opens a small list.
    const langButton = (file) => `<div class="langsel" data-langsel>
        <button class="langsel__btn" type="button" aria-expanded="false" aria-controls="langsel-menu">
          ${ico("globe")}<span class="sr-only">${t.ui.changeLang} — </span><span class="langsel__current" lang="${lang}">${t.short}</span>${ico("down", "ico ico--sm langsel__chev")}
        </button>
        <ul class="langsel__menu" id="langsel-menu" aria-label="${t.ui.langNav}">
          ${LANGS.map((l) => {
            const d = dicts[l];
            const cur = l === lang ? ' aria-current="true"' : "";
            return `<li><a class="langsel__item" href="${url(l, file)}" hreflang="${l}" lang="${l}"${cur} data-lang-link><span class="langsel__code" dir="ltr">${l.toUpperCase()}</span><span class="langsel__name">${d.name}</span>${ico("check", "ico langsel__check")}</a></li>`;
          }).join("\n          ")}
        </ul>
      </div>`;

    const header = (file) => {
      const isSol = file === "solutions-surete.html" || SOLUTIONS.some((s) => s.file === file);
      const cur = (f) => (file === f ? ' aria-current="page"' : "");
      const mega = [{ file: "solutions-surete.html", name: t.ui.overview, short: t.ui.overviewShort, icon: "shield" }, ...sol]
        .map((s) => `<a href="${u(s.file)}" class="mega__item"${cur(s.file)}>${ico(s.icon)}<span><b>${s.name}</b><small>${s.short}</small></span></a>`)
        .join("\n            ");
      const mobile = [["index.html", t.ui.home], ["solutions-surete.html", t.ui.overview], ...sol.map((s) => [s.file, s.name]),
        ["showroom.html", t.ui.showroom], ["contact.html", t.ui.contact]]
        .map(([f, n]) => `<li><a href="${u(f)}"${cur(f)}>${n}</a></li>`).join("\n        ");
      return `
  <a class="skip-link" href="#contenu">${t.ui.skip}</a>
  <div class="topbar">
    <div class="container topbar__inner">
      <span class="topbar__item topbar__addr">${ico("pin")}${t.address.line1} — ${t.address.line2}</span>
      <a class="topbar__item" href="${TEL}">${ico("phone")}${ltr(PHONE)}</a>
    </div>
  </div>
  <header class="header" id="header">
    <div class="container header__inner">
      <a href="${u("index.html")}" class="logo" aria-label="HISEC, ${t.ui.home}"><span class="logo__box"><span class="logo__word">hisec</span></span><span class="logo__tag">Security solutions</span></a>
      <nav class="nav" aria-label="${t.ui.mainNav}">
        <ul class="nav__list">
          <li><a class="nav__link" href="${u("index.html")}"${cur("index.html")}>${t.ui.home}</a></li>
          <li class="nav__drop">
            <button class="nav__link nav__trigger${isSol ? " is-current" : ""}" type="button" aria-expanded="false" aria-controls="mega">${t.ui.solutions} ${ico("down", "ico ico--sm")}</button>
            <div class="mega" id="mega">
            ${mega}
            </div>
          </li>
          <li><a class="nav__link" href="${u("showroom.html")}"${cur("showroom.html")}>${t.ui.showroom}</a></li>
          <li><a class="nav__link" href="${u("contact.html")}"${cur("contact.html")}>${t.ui.contact}</a></li>
        </ul>
      </nav>
      ${langButton(file)}
      <a href="${TEL}" class="btn btn--primary header__cta">${ico("phone")}${t.ui.call}</a>
      <button class="burger" type="button" aria-label="${t.ui.openMenu}" data-label-open="${t.ui.openMenu}" data-label-close="${t.ui.closeMenu}" aria-expanded="false" aria-controls="mobile-menu"><span></span><span></span><span></span></button>
    </div>
  </header>
  <div class="mobile-menu" id="mobile-menu" data-lenis-prevent hidden>
    <nav aria-label="${t.ui.mobileNav}">
      <ul>
        ${mobile}
      </ul>
    </nav>
    <a href="${TEL}" class="btn btn--primary btn--block">${ico("phone")}${ltr(PHONE)}</a>
  </div>`;
    };

    const footer = (file) => `
  <footer class="footer">
    <div class="container footer__grid">
      <div class="footer__brand">
        <a href="${u("index.html")}" class="logo" aria-label="HISEC, ${t.ui.home}"><span class="logo__box"><span class="logo__word">hisec</span></span><span class="logo__tag">Security solutions</span></a>
        <p>${t.ui.footerAbout}</p>
      </div>
      <div>
        <h2 class="footer__title">${t.ui.solutions}</h2>
        <ul class="footer__links footer__links--2col">${sol.map((s) => `<li><a href="${u(s.file)}">${s.name}</a></li>`).join("")}</ul>
      </div>
      <div>
        <h2 class="footer__title">HISEC</h2>
        <ul class="footer__links">
          <li><a href="${u("solutions-surete.html")}">${t.ui.overview}</a></li>
          <li><a href="${u("showroom.html")}">${t.ui.showroom}</a></li>
          <li><a href="${u("contact.html")}">${t.ui.contact}</a></li>
        </ul>
      </div>
      <div>
        <h2 class="footer__title">${t.ui.footerContact}</h2>
        <ul class="footer__links">
          <li><a href="${TEL}">${ltr(PHONE)}</a></li>
          <li>${t.address.line1}</li>
          <li>${t.address.line2}, ${t.address.country}</li>
        </ul>
      </div>
    </div>
    <div class="container footer__bottom">
      <span>© <span data-year>2026</span> HISEC. ${t.ui.rights}</span>
      <span class="mono">${t.ui.location}</span>
    </div>
  </footer>`;

    const feed = ({ img, alt, cam, label, icon, eager = false, priority = false, cls = "", ratio = "" }) => {
      const loading = priority ? ' fetchpriority="high"' : eager ? "" : ' loading="lazy"';
      return `<figure class="feed ${cls}" data-feed${ratio ? ` style="--ratio:${ratio}"` : ""}>
          <div class="feed__screen">
            ${ico(icon, "feed__fallback")}
            <img src="/assets/img/${img}" alt="${alt}"${loading} decoding="async" onerror="this.remove()" />
          </div>
          <span class="feed__corners" aria-hidden="true"></span>
          <span class="feed__hud" aria-hidden="true">
            <span class="hud hud--tl"><i class="rec"></i>REC</span>
            <span class="hud hud--tr" dir="ltr">${cam}</span>
            <span class="hud hud--bl">${label}</span>
            <span class="hud hud--br" dir="ltr" data-clock>NKC</span>
          </span>
        </figure>`;
    };

    const rows = (list) => `<ul class="rows">
${list.map((s) => `        <li data-row><a href="${u(s.file)}" class="row">
          <span class="row__icon">${ico(s.icon)}</span>
          <span class="row__text"><span class="row__name">${s.name}</span><span class="row__desc">${s.short}</span></span>
          ${arrow("ico row__arrow")}
        </a></li>`).join("\n")}
      </ul>`;

    const crumbs = (items) => `<nav class="crumbs" aria-label="${t.ui.crumbs}"><ol>${items.map(([f, label], i) =>
      i === items.length - 1 ? `<li><span aria-current="page">${label}</span></li>` : `<li><a href="${u(f)}">${label}</a></li>`).join("")}</ol></nav>`;

    const band = () => `
    <section class="band" aria-labelledby="band-title">
      <div class="container band__inner">
        <div>
          <p class="eyebrow" data-reveal>${t.band.eyebrow}</p>
          <h2 class="h2" id="band-title" data-reveal>${t.band.title}</h2>
          <p class="band__text" data-reveal>${t.band.text}</p>
        </div>
        <div class="band__actions" data-reveal>
          <a href="${TEL}" class="band__phone">${ico("phone")}<span><small>${t.band.callUs}</small>${ltr(PHONE)}</span></a>
          <a href="${u("showroom.html")}" class="btn btn--outline">${t.band.visit}${arrow()}</a>
        </div>
      </div>
    </section>`;

    const map = (cls = "") => `<div class="map ${cls}" data-reveal data-lenis-prevent>
          <iframe src="${mapEmbed(lang)}" title="${t.ui.mapTitle}" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
        </div>`;

    const doc = ({ file, title, desc, body }) => `<!doctype html>
<html lang="${lang}" dir="${t.dir}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <script>
    /* Hide animated elements before first paint (motion users only); reveal everything if main.js never finishes. */
    document.documentElement.classList.add("js");
    setTimeout(function () { if (!window.__hisecReady) document.documentElement.classList.remove("js"); }, 3000);${file === "index.html" ? `
    /* 3D hero: decide before first paint (WebGL available + motion allowed), so the camera wall never flashes. */
    try {
      if (!matchMedia("(prefers-reduced-motion: reduce)").matches) {
        var c = document.createElement("canvas"), gl = c.getContext("webgl2") || c.getContext("webgl");
        if (gl) { document.documentElement.classList.add("use-3d"); var x = gl.getExtension("WEBGL_lose_context"); if (x) x.loseContext(); }
      }
    } catch (e) {}` : ""}
  </script>
  <title>${title}</title>
  <meta name="description" content="${desc}" />
  <meta name="theme-color" content="#FBF9F9" />
  <meta property="og:type" content="website" />
  <meta property="og:locale" content="${t.locale}" />
  <meta property="og:site_name" content="HISEC" />
  <meta property="og:title" content="${title}" />
  <meta property="og:description" content="${desc}" />
${LANGS.map((l) => `  <link rel="alternate" hreflang="${l}" href="${url(l, file)}" vite-ignore />`).join("\n")}
  <link rel="alternate" hreflang="x-default" href="${url(LANGS[0], file)}" vite-ignore />
  <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@100..125,600..900&family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600${lang === "ar" ? "&family=IBM+Plex+Sans+Arabic:wght@400;500;600;700" : ""}&display=swap" rel="stylesheet" />
${lang === "ar" ? "" : `  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@500&text=${encodeURIComponent(dicts.ar.name)}&display=swap" rel="stylesheet" />`}
  <link rel="stylesheet" href="/src/styles.css" />
  <script type="module" src="/src/main.js"></script>
</head>
<body>
${SPRITE}
${header(file)}
  <main id="contenu" tabindex="-1">
${body}
  </main>
${footer(file)}
</body>
</html>
`;

    /* ---------- pages ---------- */
    const pages = [];
    const h = t.home;

    pages.push({
      file: "index.html", title: h.title, desc: h.desc,
      body: `
    <section class="hero">
      <div class="container hero__grid">
        <div class="hero__copy">
          <p class="eyebrow" data-intro>${h.eyebrow}</p>
          <h1 class="hero__title">${lines(h.h1)}</h1>
          <p class="hero__lead" data-intro>${h.lead}</p>
          <div class="hero__actions" data-intro>
            <a href="${u("solutions-surete.html")}" class="btn btn--primary">${h.cta}${arrow()}</a>
            <a href="${TEL}" class="btn btn--outline">${ico("phone")}${ltr(PHONE)}</a>
          </div>
        </div>
        <div class="hero__visual">
          <div class="cam3d" data-cam3d role="img" aria-label="${t.ui.cam3dLabel}">
            <canvas></canvas>
            <span class="cam3d__status" aria-hidden="true"><i class="rec"></i>${t.ui.cam3dLoading}</span>
            <span class="feed__corners" aria-hidden="true"></span>
            <span class="feed__hud" aria-hidden="true">
              <span class="hud hud--tl"><i class="rec"></i>REC</span>
              <span class="hud hud--tr">PTZ 01</span>
              <span class="hud hud--bl">HISEC · LIVE</span>
              <span class="hud hud--br" data-clock>NKC</span>
            </span>
          </div>
          <div class="wall" role="group" aria-label="${t.ui.wallLabel}">
          ${WALL.map((k, i) => { const s = sol.find((x) => x.key === k); return feed({ img: s.img, alt: s.alt, cam: s.cam, label: s.name, icon: s.icon, eager: true, priority: i === 0 }); }).join("\n          ")}
          </div>
        </div>
      </div>
    </section>

    <section class="status" aria-label="${t.ui.statusLabel}">
      <div class="container">
        <ul class="status__list">
          ${h.status.map((s, i) => `<li data-reveal>${i === 0 ? '<span class="status__dot" aria-hidden="true"></span>' : ""}${s}</li>`).join("\n          ")}
        </ul>
      </div>
    </section>

    <section class="section about" aria-labelledby="about-title">
      <div class="container about__grid">
        <p class="eyebrow" data-reveal>${h.aboutEyebrow}</p>
        <h2 class="statement" id="about-title" data-reveal>${mark(h.statement)}</h2>
        <div class="about__cols">
          ${h.about.map((p) => `<p data-reveal>${p}</p>`).join("\n          ")}
          <ul class="qualities" data-reveal>${h.qualities.map((q) => `<li>${ico("check")}${q}</li>`).join("")}</ul>
        </div>
      </div>
    </section>

    <section class="showcase" data-showcase aria-labelledby="sc-title" style="--n:${sol.length}">
      <div class="showcase__sticky">
        <div class="showcase__stage" aria-hidden="true">
          <span class="showcase__glow"></span>
          <span class="showcase__arch"></span>
          <svg class="showcase__ring" viewBox="0 0 400 400" direction="ltr"><defs><path id="sc-ring" d="M200,200 m-180,0 a180,180 0 1,1 360,0 a180,180 0 1,1 -360,0"/></defs><text><textPath href="#sc-ring" textLength="1128" lengthAdjust="spacing">${RING}${RING}</textPath></text></svg>
        </div>
        <canvas class="showcase__canvas" role="img" aria-label="${h.scLabel}"></canvas>
        <a class="showcase__pill" href="${u(sol[0].file)}" tabindex="-1" aria-hidden="true" data-sc-pill><span>${t.ui.discover}</span>${arrow("ico ico--sm")}</a>
        <div class="container showcase__ui">
          <div class="showcase__head">
            <p class="eyebrow">${h.solEyebrow}</p>
            <h2 class="showcase__title" id="sc-title">${h.solTitle}</h2>
          </div>
          <ol class="showcase__items">
${sol.map((s, i) => `            <li class="showcase__item${i === 0 ? " is-active" : ""}" data-sc-item>
              <span class="showcase__meta" dir="ltr">${ico(s.icon, "ico ico--sm")}${s.cam}</span>
              <h3 class="showcase__name">${s.name}</h3>
              <p class="showcase__desc">${s.short}</p>
              <a href="${u(s.file)}" class="showcase__link">${t.ui.discover}<span class="sr-only"> : ${s.name}</span>${arrow()}</a>
            </li>`).join("\n")}
          </ol>
          <div class="showcase__foot">
            <span class="showcase__count" dir="ltr"><b data-sc-index>01</b> / ${String(sol.length).padStart(2, "0")}</span>
            <span class="showcase__bar" aria-hidden="true"><i data-sc-bar></i></span>
            <span class="showcase__hint"><span class="showcase__mouse" aria-hidden="true"></span>${h.scHint}</span>
          </div>
        </div>
      </div>
    </section>

    <section class="section section--panel sol-list" aria-labelledby="sol-title">
      <div class="container">
        <div class="section-head">
          <p class="eyebrow" data-reveal>${h.solEyebrow}</p>
          <h2 class="h2" id="sol-title" data-reveal>${h.solTitle}</h2>
          <a href="${u("solutions-surete.html")}" class="link" data-reveal>${t.ui.allRange}${arrow()}</a>
        </div>
        ${rows(sol)}
      </div>
    </section>

    <section class="section" aria-labelledby="show-title">
      <div class="container split">
        ${feed({ img: "showroom.jpg", alt: h.showAlt, cam: "CAM EXT", label: t.ui.showroomCam, icon: "store", ratio: "4 / 3" })}
        <div class="split__body">
          <p class="eyebrow" data-reveal>${h.showEyebrow}</p>
          <h2 class="h2" id="show-title" data-reveal>${h.showTitle}</h2>
          <p data-reveal>${h.showText}</p>
          <address class="addr" data-reveal>${ico("pin")}<span><strong>${t.address.line1}</strong>${t.address.line2}, ${t.address.country}</span></address>
          <a href="${u("showroom.html")}" class="link" data-reveal>${h.showLink}${arrow()}</a>
        </div>
      </div>
    </section>
${band()}`,
    });

    pages.push({
      file: "solutions-surete.html", title: t.overview.title, desc: t.overview.desc,
      body: `
    <section class="page-head">
      <div class="container">
        ${crumbs([["index.html", t.ui.home], ["", t.ui.overview]])}
        <p class="eyebrow" data-intro>${t.ui.overview}</p>
        <h1 class="page-title">${lines(t.overview.h1)}</h1>
        <p class="page-lead" data-intro>${t.overview.lead}</p>
      </div>
    </section>
    <section class="section section--tight">
      <div class="container">
        <ul class="tiles">
${sol.map((s) => `          <li data-row><a href="${u(s.file)}" class="tile">
            ${feed({ img: s.img, alt: s.alt, cam: s.cam, label: s.name, icon: s.icon, cls: "feed--mini", ratio: "16 / 10" })}
            <span class="tile__body"><span class="tile__name">${s.name}</span><span class="tile__desc">${s.desc}</span><span class="link">${t.ui.discover}${arrow()}</span></span>
          </a></li>`).join("\n")}
        </ul>
      </div>
    </section>
${band()}`,
    });

    for (const s of sol) {
      const others = sol.filter((o) => o !== s);
      const paras = (s.paras.length ? s.paras : [s.desc]).map((p) => `<p data-reveal>${p}</p>`).join("\n            ");
      pages.push({
        file: s.file, title: `${s.name} | HISEC`, desc: s.desc,
        body: `
    <section class="page-head page-head--split">
      <div class="container page-head__grid">
        <div>
          ${crumbs([["index.html", t.ui.home], ["solutions-surete.html", t.ui.overview], ["", s.name]])}
          <p class="eyebrow" data-intro>${ico(s.icon, "ico ico--sm")}${t.ui.solution}</p>
          <h1 class="page-title">${lines([s.h1])}</h1>
          <p class="page-lead" data-intro>${s.lead}</p>
          <div class="hero__actions" data-intro>
            <a href="${u("contact.html")}" class="btn btn--primary">${t.ui.requestQuote}${arrow()}</a>
            <a href="${TEL}" class="btn btn--outline">${ico("phone")}${t.ui.call}</a>
          </div>
        </div>
        ${feed({ img: s.img, alt: s.alt, cam: s.cam, label: s.name, icon: s.icon, priority: true, ratio: "4 / 3" })}
      </div>
    </section>
    <section class="section section--tight">
      <div class="container detail">
        <div class="detail__text">
            ${paras}
        </div>
        <aside class="keypoints" aria-labelledby="kp-title" data-reveal>
          <h2 class="keypoints__title" id="kp-title">${t.ui.keyPoints}</h2>
          <ul>${s.points.map((p) => `<li>${ico("check")}${p}</li>`).join("")}</ul>
        </aside>
      </div>
    </section>
    <section class="section section--panel" aria-labelledby="others-title">
      <div class="container">
        <div class="section-head section-head--row">
          <h2 class="h3" id="others-title" data-reveal>${t.ui.otherSolutions}</h2>
          <a href="${u("solutions-surete.html")}" class="link" data-reveal>${t.ui.allRange}${arrow()}</a>
        </div>
        ${rows(others)}
      </div>
    </section>
${band()}`,
      });
    }

    pages.push({
      file: "showroom.html", title: t.showroom.title, desc: t.showroom.desc,
      body: `
    <section class="page-head">
      <div class="container">
        ${crumbs([["index.html", t.ui.home], ["", t.ui.showroom]])}
        <p class="eyebrow" data-intro>${t.ui.showroom}</p>
        <h1 class="page-title">${lines(t.showroom.h1)}</h1>
        <p class="page-lead" data-intro>${t.showroom.lead}</p>
      </div>
    </section>
    <section class="section section--tight">
      <div class="container">
        ${feed({ img: "showroom.jpg", alt: h.showAlt, cam: "CAM EXT", label: t.showroom.camLabel, icon: "store", priority: true, ratio: "21 / 9", cls: "feed--wide" })}
        <div class="info-grid">
          <div class="info" data-reveal>${ico("pin")}<div><h2 class="info__title">${t.ui.address}</h2><p>${addrFull}</p></div></div>
          <div class="info" data-reveal>${ico("phone")}<div><h2 class="info__title">${t.ui.phone}</h2><p><a href="${TEL}" class="info__link">${ltr(PHONE)}</a></p></div></div>
          <div class="info" data-reveal>${ico("route")}<div><h2 class="info__title">${t.ui.directions}</h2><p><a href="${MAPS_URL}" target="_blank" rel="noopener" class="info__link">${t.ui.openMaps}<span class="sr-only"> ${t.ui.newTab}</span></a></p></div></div>
        </div>
        ${map()}
      </div>
    </section>`,
    });

    pages.push({
      file: "contact.html", title: t.contact.title, desc: t.contact.desc,
      body: `
    <section class="page-head">
      <div class="container">
        ${crumbs([["index.html", t.ui.home], ["", t.ui.contact]])}
        <p class="eyebrow" data-intro>${t.ui.contact}</p>
        <h1 class="page-title">${lines(t.contact.h1)}</h1>
        <p class="page-lead" data-intro>${t.contact.lead}</p>
      </div>
    </section>
    <section class="section section--tight">
      <div class="container contact">
        <div class="contact__main">
          <a href="${TEL}" class="callcard" data-reveal>
            <span class="callcard__icon">${ico("phone")}</span>
            <span><small>${t.ui.phone}</small><strong>${ltr(PHONE)}</strong><span class="callcard__hint">${t.ui.tapToCall}</span></span>
          </a>
          <div class="info" data-reveal>${ico("pin")}<div><h2 class="info__title">${t.ui.address}</h2><p>${addrFull}</p><p><a href="${MAPS_URL}" target="_blank" rel="noopener" class="link">${t.ui.directions}${arrow()}<span class="sr-only"> ${t.ui.newTab}</span></a></p></div></div>
          <div class="prep" data-reveal>
            <h2 class="keypoints__title">${t.contact.prepTitle}</h2>
            <ul>${t.contact.prep.map((p) => `<li>${ico("check")}${p}</li>`).join("")}</ul>
          </div>
        </div>
        ${map("map--tall")}
      </div>
    </section>`,
    });

    pages.push({
      file: "404.html", title: t.notFound.title, desc: t.notFound.desc,
      body: `
    <section class="page-head page-head--center">
      <div class="container">
        <p class="eyebrow" data-intro>${t.notFound.eyebrow}</p>
        <h1 class="page-title">${lines(t.notFound.h1)}</h1>
        <p class="page-lead" data-intro>${t.notFound.lead}</p>
        <div class="hero__actions hero__actions--center" data-intro>
          <a href="${u("index.html")}" class="btn btn--primary">${t.notFound.back}${arrow()}</a>
          <a href="${u("solutions-surete.html")}" class="btn btn--outline">${t.notFound.see}</a>
        </div>
      </div>
    </section>`,
    });

    const dir = lang === LANGS[0] ? ROOT : join(ROOT, lang);
    await mkdir(dir, { recursive: true });
    for (const p of pages) {
      const out = join(dir, p.file);
      await writeFile(out, doc(p), "utf8");
      written.push(out);
    }
  }
  return written;
}

// Circular text around the showcase arch (Latin brand line, same in every language).
const RING = "HISEC · SECURITY SOLUTIONS · NOUAKCHOTT · MAURITANIA · ";

const SPRITE = `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>
<symbol id="i-shield" viewBox="0 0 24 24"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></symbol>
<symbol id="i-flame" viewBox="0 0 24 24"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></symbol>
<symbol id="i-intercom" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/><circle cx="12" cy="10" r="2.5"/></symbol>
<symbol id="i-camera" viewBox="0 0 24 24"><path d="m16 13 5.22 3.48a.5.5 0 0 0 .78-.42V7.87a.5.5 0 0 0-.75-.43L16 10.5"/><rect x="2" y="6" width="14" height="12" rx="2"/></symbol>
<symbol id="i-key" viewBox="0 0 24 24"><path d="M2.59 17.41A2 2 0 0 0 2 18.83V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.17a2 2 0 0 0 1.41-.59l.82-.81a6.5 6.5 0 1 0-4-4z"/><circle cx="16.5" cy="7.5" r="1"/></symbol>
<symbol id="i-plug" viewBox="0 0 24 24"><path d="M12 22v-5M9 8V2M15 8V2"/><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"/></symbol>
<symbol id="i-siren" viewBox="0 0 24 24"><path d="M7 18v-6a5 5 0 1 1 10 0v6"/><path d="M5 21a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-1a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2z"/><path d="M21 12h1M18.5 4.5 18 5M2 12h1M12 2v1M4.93 4.93l.7.7M12 12v6"/></symbol>
<symbol id="i-barrier" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></symbol>
<symbol id="i-phone" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></symbol>
<symbol id="i-pin" viewBox="0 0 24 24"><path d="M20 10c0 5-5.54 10.19-7.4 11.8a1 1 0 0 1-1.2 0C9.54 20.19 4 15 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></symbol>
<symbol id="i-arrow" viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></symbol>
<symbol id="i-down" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6"/></symbol>
<symbol id="i-check" viewBox="0 0 24 24"><path d="m5 12 5 5 9-10"/></symbol>
<symbol id="i-store" viewBox="0 0 24 24"><path d="M3 9 4.5 4h15L21 9M3 9v11h18V9M3 9h18M9 20v-6h6v6"/></symbol>
<symbol id="i-globe" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></symbol>
<symbol id="i-route" viewBox="0 0 24 24"><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/></symbol>
</defs></svg>`;

// `node scripts/generate.mjs`
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const files = await generate();
  console.log(`Generated ${files.length} pages.`);
}

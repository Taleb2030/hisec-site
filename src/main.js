/* =========================================================
   HISEC — shared interactions for every page (FR / EN / AR)
   GSAP + ScrollTrigger · Lenis (driven by gsap.ticker)
   ========================================================= */
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import "lenis/dist/lenis.css";

(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const root = document.documentElement;

  const reduceMQ = window.matchMedia("(prefers-reduced-motion: reduce)");
  const header = $("#header");

  $$("[data-year]").forEach((el) => { el.textContent = String(new Date().getFullYear()); });

  /* ---------- Lenis smooth scroll (skipped for reduced-motion users) ---------- */
  let lenis = null;
  if (!reduceMQ.matches) {
    lenis = new Lenis({ lerp: 0.1 }); // no autoRaf: GSAP's ticker drives it
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  /* ---------- Same-page anchors (skip link, #hash links) ---------- */
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const target = document.getElementById(a.getAttribute("href").slice(1));
    if (!target) return;
    e.preventDefault();
    const offset = -(header ? header.offsetHeight : 0) - 16;
    if (lenis) lenis.scrollTo(target, { offset, duration: 1.1 });
    else target.scrollIntoView({ behavior: "auto" });
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    target.focus({ preventScroll: true });
  });

  /* ---------- Mega menu ---------- */
  const drop = $(".nav__drop");
  const trigger = $(".nav__trigger");
  let closeTimer;
  let openedByHover = false; // so a click right after hover-open doesn't close it
  const setMega = (open) => {
    if (!drop) return;
    drop.classList.toggle("is-open", open);
    trigger.setAttribute("aria-expanded", String(open));
    if (!open) openedByHover = false;
  };
  if (drop && trigger) {
    trigger.addEventListener("click", () => {
      const isOpen = drop.classList.contains("is-open");
      if (isOpen && openedByHover) { openedByHover = false; return; }
      setMega(!isOpen);
    });
    drop.addEventListener("pointerenter", (e) => {
      if (e.pointerType !== "mouse") return;
      clearTimeout(closeTimer);
      if (!drop.classList.contains("is-open")) { setMega(true); openedByHover = true; }
    });
    drop.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse") closeTimer = setTimeout(() => setMega(false), 180); });
    drop.addEventListener("focusout", (e) => { if (!drop.contains(e.relatedTarget)) setMega(false); });
    document.addEventListener("click", (e) => { if (!drop.contains(e.target)) setMega(false); });
  }

  /* ---------- Mobile menu (modal: background made inert) ---------- */
  const burger = $(".burger");
  const menu = $("#mobile-menu");
  const background = [$("#contenu"), $(".footer"), $(".topbar"), $(".skip-link")].filter(Boolean);
  const setMenu = (open, { restoreFocus = false } = {}) => {
    if (!burger || !menu) return;
    burger.setAttribute("aria-expanded", String(open));
    burger.setAttribute("aria-label", open ? burger.dataset.labelClose : burger.dataset.labelOpen);
    if (open) menu.style.top = Math.max(0, header.getBoundingClientRect().bottom) + "px";
    menu.hidden = !open;
    background.forEach((el) => { el.inert = open; });
    root.style.overflow = open ? "hidden" : "";
    if (lenis) (open ? lenis.stop() : lenis.start());
    if (open) {
      const first = $("a", menu);
      if (first) first.focus();
      if (!reduceMQ.matches) {
        gsap.fromTo($$("li, .btn", menu), { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.35, stagger: 0.025, ease: "power2.out" });
      }
    } else if (restoreFocus) {
      burger.focus();
    }
  };
  if (burger && menu) {
    burger.addEventListener("click", () => setMenu(burger.getAttribute("aria-expanded") !== "true", { restoreFocus: true }));
    window.addEventListener("resize", () => { if (window.innerWidth >= 1024 && !menu.hidden) setMenu(false); });
  }

  /* ---------- Language button (one control; GSAP open/close) ---------- */
  const langsel = $("[data-langsel]");
  const langBtn = langsel ? $(".langsel__btn", langsel) : null;
  const langMenu = langsel ? $(".langsel__menu", langsel) : null;
  const langItems = langsel ? $$(".langsel__item", langsel) : [];
  let langTween = null;
  const isLangOpen = () => !!langsel && langsel.classList.contains("is-open");

  const setLang = (open, { focusFirst = false, restoreFocus = false } = {}) => {
    if (!langsel || open === isLangOpen()) return;
    langBtn.setAttribute("aria-expanded", String(open));
    if (langTween) langTween.kill();
    if (open) {
      langsel.classList.add("is-open");
      if (!reduceMQ.matches) {
        langTween = gsap.timeline()
          .fromTo(langMenu, { autoAlpha: 0, y: -8, scale: 0.96 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.24, ease: "power3.out" })
          .fromTo(langItems, { autoAlpha: 0, y: -6 }, { autoAlpha: 1, y: 0, duration: 0.2, stagger: 0.04, ease: "power2.out" }, 0.05);
      }
      if (focusFirst) (langItems.find((a) => a.hasAttribute("aria-current")) || langItems[0]).focus();
    } else {
      const done = () => {
        langsel.classList.remove("is-open");
        gsap.set([langMenu, ...langItems], { clearProps: "opacity,visibility,transform" });
      };
      if (reduceMQ.matches) done();
      else langTween = gsap.to(langMenu, { autoAlpha: 0, y: -6, scale: 0.97, duration: 0.15, ease: "power1.in", onComplete: done });
      if (restoreFocus) langBtn.focus();
    }
  };

  if (langsel) {
    // e.detail === 0 → activated from the keyboard: move focus into the list.
    langBtn.addEventListener("click", (e) => setLang(!isLangOpen(), { focusFirst: e.detail === 0 }));
    langBtn.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") { e.preventDefault(); setLang(true, { focusFirst: true }); }
    });
    langMenu.addEventListener("keydown", (e) => {
      const i = langItems.indexOf(document.activeElement);
      const go = (n) => { e.preventDefault(); langItems[(n + langItems.length) % langItems.length].focus(); };
      if (e.key === "ArrowDown") go(i + 1);
      else if (e.key === "ArrowUp") go(i - 1);
      else if (e.key === "Home") go(0);
      else if (e.key === "End") go(langItems.length - 1);
    });
    langsel.addEventListener("focusout", (e) => { if (!langsel.contains(e.relatedTarget)) setLang(false); });
    document.addEventListener("click", (e) => { if (!langsel.contains(e.target)) setLang(false); });

    // Switching language: header stays put, the page fades out, then we navigate.
    langItems.forEach((a) => a.addEventListener("click", (e) => {
      if (a.hasAttribute("aria-current")) { e.preventDefault(); setLang(false, { restoreFocus: true }); return; }
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || reduceMQ.matches) return;
      e.preventDefault();
      const href = a.href;
      setLang(false);
      if (lenis) lenis.stop();
      root.classList.add("is-leaving");
      gsap.to([$("#contenu"), $(".footer")], {
        autoAlpha: 0, y: -12, duration: 0.3, ease: "power2.in",
        onComplete: () => { window.location.href = href; },
      });
    }));
  }

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (drop && drop.classList.contains("is-open")) { setMega(false); trigger.focus(); }
    if (isLangOpen()) setLang(false, { restoreFocus: true });
    if (menu && !menu.hidden) setMenu(false, { restoreFocus: true });
  });

  // Back/forward cache restores the page as it was left: reset menus and the language fade.
  window.addEventListener("pageshow", (e) => {
    if (!e.persisted) return;
    setMega(false);
    setLang(false);
    if (menu && !menu.hidden) setMenu(false);
    root.classList.remove("is-leaving");
    gsap.set([$("#contenu"), $(".footer")], { clearProps: "opacity,visibility,transform" });
    if (lenis) lenis.start();
  });

  /* ---------- Header state ---------- */
  const onScroll = (y) => header && header.classList.toggle("is-scrolled", y > 8);
  if (lenis) lenis.on("scroll", ({ scroll }) => onScroll(scroll));
  else window.addEventListener("scroll", () => onScroll(window.scrollY), { passive: true });
  onScroll(window.scrollY);

  /* ---------- Live camera clocks (Nouakchott time = UTC+0, no DST) ---------- */
  const clocks = $$("[data-clock]");
  if (clocks.length) {
    const opts = { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false };
    let fmt;
    try { fmt = new Intl.DateTimeFormat("fr-FR", { ...opts, timeZone: "Africa/Nouakchott" }); }
    catch (_) { fmt = new Intl.DateTimeFormat("fr-FR", { ...opts, timeZone: "UTC" }); }
    // Small feeds (camera wall, tiles) only have room for the time.
    const compact = new Set(clocks.filter((c) => c.closest(".wall, .feed--mini")));
    const tick = () => {
      const full = fmt.format(new Date()).replace(",", "").replace(/\//g, ".");
      const time = full.slice(full.lastIndexOf(" ") + 1);
      clocks.forEach((c) => { c.textContent = compact.has(c) ? time : full; });
    };
    tick();
    setInterval(tick, 1000);
  }

  gsap.registerPlugin(ScrollTrigger);

  /* ---------- Motion (only when the user allows it) ---------- */
  const mm = gsap.matchMedia();
  mm.add("(prefers-reduced-motion: no-preference)", () => {
    // CRT-style "screen switches on" for a camera feed.
    const screenOn = (feed, vars = {}) => {
      const screen = $(".feed__screen", feed);
      const overlay = [$(".feed__hud", feed), $(".feed__corners", feed)];
      const tl = gsap.timeline(vars);
      tl.fromTo(screen, { clipPath: "inset(50% 0% 50% 0%)", visibility: "inherit" },
                        { clipPath: "inset(0% 0% 0% 0%)", duration: 0.75, ease: "power3.inOut" })
        .fromTo(overlay, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3, ease: "none" }, "-=0.15");
      return tl;
    };

    // Page intro: headline lines rise, then copy, then the camera wall switches on.
    const intro = gsap.timeline({ defaults: { ease: "power3.out" }, delay: 0.05 });
    const lines = $$(".hero__title .line > span, .page-title .line > span");
    if (lines.length) {
      gsap.set(lines, { visibility: "inherit" });
      intro.from(lines, { yPercent: 110, duration: 1, stagger: 0.09, ease: "power4.out" });
    }
    const introBits = $$("[data-intro]");
    if (introBits.length) intro.from(introBits, { autoAlpha: 0, y: 18, duration: 0.7, stagger: 0.08 }, lines.length ? 0.25 : 0);

    const feeds = $$("[data-feed]");
    const above = feeds.filter((f) => f.getBoundingClientRect().top < window.innerHeight);
    above.forEach((f, i) => intro.add(screenOn(f), 0.3 + i * 0.14));

    // Feeds further down switch on as they enter the viewport.
    feeds.filter((f) => !above.includes(f)).forEach((f) => {
      screenOn(f, { scrollTrigger: { trigger: f, start: "top 85%", once: true } });
    });

    // Subtle parallax inside each screen.
    $$("[data-feed] img").forEach((img) => {
      gsap.fromTo(img, { yPercent: -4 }, {
        yPercent: 4, ease: "none",
        scrollTrigger: { trigger: img.closest("[data-feed]"), start: "top bottom", end: "bottom top", scrub: true },
      });
    });

    // Text reveals and list rows.
    const batchReveal = (selector, y, stagger) => {
      const els = $$(selector);
      if (!els.length) return;
      gsap.set(els, { autoAlpha: 0, y });
      ScrollTrigger.batch(els, {
        start: "top 96%", once: true,
        onEnter: (batch) => gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.8, stagger, ease: "power3.out", overwrite: true, clearProps: "transform" }),
      });
    };
    batchReveal("[data-reveal]", 26, 0.07);
    batchReveal("[data-row]", 30, 0.06);

    // Counters in the status strip.
    $$("[data-count]").forEach((el) => {
      const end = Number(el.dataset.count);
      const state = { v: 0 };
      el.textContent = "0";
      gsap.to(state, {
        v: end, duration: 1.4, ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 95%", once: true },
        onUpdate: () => { el.textContent = String(Math.round(state.v)); },
      });
    });
  });

  /* ---------- 3D (home only; html.use-3d is set before paint when WebGL + motion are available) ---------- */
  if (root.classList.contains("use-3d")) {
    // Any failure falls back to the static version of that block.
    const fallback = (cls) => () => { root.classList.add(cls); ScrollTrigger.refresh(); };

    const cam = $("[data-cam3d]");
    if (cam) {
      const camFail = fallback("no-cam3d");
      cam.addEventListener("cam3d:lost", camFail);
      import("./hero3d.js").then(({ initHero3D }) => initHero3D(cam)).catch(camFail);
    }

    const showcase = $("[data-showcase]");
    if (showcase) {
      const scFail = fallback("no-sc");
      showcase.addEventListener("showcase:lost", scFail);
      const scrollTo = (y, duration = 1.1) => {
        if (lenis) lenis.scrollTo(y, { duration });
        else window.scrollTo({ top: y, behavior: "smooth" });
      };
      // Load when the visitor gets close to it.
      const io = new IntersectionObserver((entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        import("./showcase3d.js").then(({ initShowcase3D }) => initShowcase3D(showcase, { scrollTo })).catch(scFail);
      }, { rootMargin: "100% 0px" });
      io.observe(showcase);
    }
  }

  // Feed images sit in fixed aspect-ratio boxes, so one refresh after fonts/images settle is enough.
  window.addEventListener("load", () => ScrollTrigger.refresh());
  window.__hisecReady = true;
})();

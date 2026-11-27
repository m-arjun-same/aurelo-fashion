/* ============================================================
   AURELO — rebuild · main.js (100% own code)
   Engine: Lenis smooth scroll + GSAP + ScrollTrigger, all vendored.
   One easing family: cubic-bezier(.22,1,.36,1) reveals/hovers/panels,
   cubic-bezier(.76,0,.24,1) page moves. Nothing linear, nothing bouncy.
   The 8 library motions (rebuilt in own code from descriptions):
   1 hero-22 heroScatter / openHeroZoom / closeHeroZoom
   2 menu-14 pixelMenu
   3 sliders-18 layoutFan
   4 grid-3 shopAccordion
   5 scroll-18 scrollFan
   6 sliders-23 lookbookOrbit / orbitToArc
   7 text-15 blockSwipe
   8 hover-11 indexHover
   NOTE: the enquiry form is front-end only — there is no backend
   and nothing is sent anywhere. The success state confirms the
   enquiry was recorded on this page only.
   ============================================================ */
(function () {
  "use strict";

  /* ---------- easing: real cubic-bezier solvers ---------- */
  function cubicBezier(x1, y1, x2, y2) {
    function sample(t) {
      var u = 1 - t;
      return 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t;
    }
    function sampleY(t) {
      var u = 1 - t;
      return 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t;
    }
    function solve(x) {
      var t = x, i, err;
      for (i = 0; i < 8; i++) {
        err = sample(t) - x;
        if (Math.abs(err) < 1e-4) return t;
        var d = 3 * (1 - t) * (1 - t) * x1 + 6 * (1 - t) * t * (x2 - x1) + 3 * t * t * (1 - x2);
        if (Math.abs(d) < 1e-4) break;
        t -= err / d;
      }
      return t;
    }
    return function (p) {
      if (p <= 0) return 0;
      if (p >= 1) return 1;
      return sampleY(solve(p));
    };
  }
  var EASE = cubicBezier(.22, 1, .36, 1);
  var EASE_PAGE = cubicBezier(.76, 0, .24, 1);

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var coarse = window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
  var isMobile = function () { return window.matchMedia("(max-width: 640px)").matches; };
  var hasGsap = typeof gsap !== "undefined";
  if (hasGsap && typeof ScrollTrigger !== "undefined") gsap.registerPlugin(ScrollTrigger);

  /* ---------- data: the 8 looks, named for what the photos show ---------- */
  var LOOKS = [
    { name: "Burgundy Coat", photo: "assets/images/v5/balloons.jpg",
      line: "Wine-red wool coat, high collar, leather gloves, bags in both hands.",
      fabric: "Wool coat, high collar." },
    { name: "Pinstripe Trousers", photo: "assets/images/v5/movie-night.jpg",
      line: "Black pinstripe wide legs, a white off-shoulder crop, red shades.",
      fabric: "Pinstripe, wide leg." },
    { name: "Yellow Tracksuit", photo: "assets/images/v5/night-look.jpg",
      line: "Sun-yellow fleece, cropped hoodie, drawstring joggers, courtside.",
      fabric: "Yellow fleece, cropped hoodie." },
    { name: "Teal Satin Jumpsuit", photo: "assets/images/v5/picnic.jpg",
      line: "Teal satin halter, deep V, wide waistband, hands in pockets.",
      fabric: "Teal satin, halter neck." },
    { name: "Skeleton Tee", photo: "assets/images/v5/road-trip.jpg",
      line: "Black tee with a white skeleton hand print, light ripped denim.",
      fabric: "Black cotton tee, skeleton print." },
    { name: "Red Tee, Black Jacket", photo: "assets/images/v5/street-worn.jpg",
      line: "Red lettered tee under a black jacket, daisy shades, blue sky.",
      fabric: "Red cotton tee, black jacket." },
    { name: "Neutral Knits", photo: "assets/images/v5/field.jpg",
      line: "Cream cable knit, beige and rust layers, straight off the rail.",
      fabric: "Cable knit, neutral wool." },
    { name: "Stripes & Dresses", photo: "assets/images/v5/studio-stitch.jpg",
      line: "Striped tops, floral dresses and folded denim, hung in the shop.",
      fabric: "Mixed rail: dresses, stripes, denim." }
  ];
  var ORBIT_LINES = [
    "Shopping bags in both hands.",
    "Against a teal wall.",
    "Courtside, by the sea.",
    "Glass and daylight.",
    "Pink wall, ripped denim.",
    "Blue sky, daisy shades."
  ];
  var STEP_TITLES = ["Consultation", "Fitting", "Making", "Delivery"];

  /* ---------- Lenis smooth scroll (never native scroll) ---------- */
  var lenis = null;
  if (!reduced && typeof Lenis !== "undefined" && hasGsap) {
    try {
      lenis = new Lenis({ duration: 1.15, smoothWheel: true });
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
      gsap.ticker.lagSmoothing(0);
    } catch (err) {
      lenis = null; /* vendor failure must never kill the rest of the page */
    }
  }
  function scrollToTarget(target) {
    if (lenis) {
      lenis.scrollTo(target, { duration: 1.4 });
    } else if (target === 0) {
      window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
    } else {
      var el = typeof target === "string" ? document.querySelector(target) : target;
      if (el) el.scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
    }
  }

  /* ---------- anchor links ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("href");
      if (id === "#top") { e.preventDefault(); scrollToTarget(0); return; }
      if (id.length > 1 && document.querySelector(id)) {
        e.preventDefault();
        if (pixelMenuOpen) {
          closePixelMenu();
          setTimeout(function () { scrollToTarget(id); }, 450);
        } else {
          scrollToTarget(id);
        }
      }
    });
  });

  /* ============================================================
     1 · HERO — hero-22: scattered photos, drift + pointer parallax,
     click to zoom full-bleed.
     ============================================================ */
  var hero = document.getElementById("hero");
  var scatterPhotos = Array.prototype.slice.call(document.querySelectorAll(".scatter-photo"));
  var heroZoom = document.getElementById("heroZoom");
  var heroZoomImg = document.getElementById("heroZoomImg");
  var heroZoomName = document.getElementById("heroZoomName");
  var heroZoomLine = document.getElementById("heroZoomLine");

  function openHeroZoom(i) {
    var look = LOOKS[i];
    if (!look || !heroZoom) return;
    heroZoomImg.src = look.photo;
    heroZoomImg.alt = look.name + ": " + look.line;
    heroZoomName.textContent = look.name;
    heroZoomLine.textContent = look.line;
    heroZoom.hidden = false;
    document.body.classList.add("menu-open");
    if (lenis) lenis.stop();
    var closeBtn = document.getElementById("heroZoomClose");
    if (closeBtn) closeBtn.focus();
  }
  function closeHeroZoom() {
    if (!heroZoom || heroZoom.hidden) return;
    heroZoom.hidden = true;
    document.body.classList.remove("menu-open");
    if (lenis) lenis.start();
  }
  scatterPhotos.forEach(function (btn) {
    btn.addEventListener("click", function () {
      openHeroZoom(parseInt(btn.getAttribute("data-look-i"), 10));
    });
  });
  var zoomClose = document.getElementById("heroZoomClose");
  if (zoomClose) zoomClose.addEventListener("click", closeHeroZoom);
  if (heroZoom) heroZoom.addEventListener("click", function (e) {
    if (e.target === heroZoom || e.target === heroZoomImg) closeHeroZoom();
  });

  function heroScatter() {
    if (reduced || coarse || !hero) return;
    var px = 0, py = 0, tx = 0, ty = 0;
    hero.addEventListener("mousemove", function (e) {
      var r = hero.getBoundingClientRect();
      tx = (e.clientX - r.left) / r.width - 0.5;
      ty = (e.clientY - r.top) / r.height - 0.5;
    });
    hero.addEventListener("mouseleave", function () { tx = 0; ty = 0; });
    function tick() {
      px += (tx - px) * 0.06;
      py += (ty - py) * 0.06;
      scatterPhotos.forEach(function (btn) {
        var img = btn.querySelector("img");
        if (!img) return;
        var d = parseFloat(btn.getAttribute("data-depth") || "1");
        img.style.transform = "translate3d(" + (px * 16 * d).toFixed(2) + "px," + (py * 12 * d).toFixed(2) + "px,0)";
      });
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  heroScatter();

  /* Hero headline: line-mask reveal from a clean hidden state.
     Initial transforms are set by GSAP only — no CSS hiding, so the
     headline is fully visible without JS and never overlaps mid-load. */
  function heroIntro() {
    if (!hasGsap || reduced) return;
    gsap.fromTo(".hero-title .mask-inner",
      { yPercent: 112 },
      { yPercent: 0, duration: 1.1, ease: EASE, stagger: 0.09, delay: 0.1 });
    gsap.fromTo(".hero-sub, .hero-slogan, .hero-ctas",
      { y: 24, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.9, ease: EASE, stagger: 0.08, delay: 0.45 });
  }
  heroIntro();

  /* ============================================================
     2 · MENU — menu-14: black pixel blocks dissolve in, then links.
     ============================================================ */
  var menuBtn = document.getElementById("menuBtn");
  var pixelMenu = document.getElementById("pixelMenu");
  var pixelGrid = document.getElementById("pixelGrid");
  var pixelInner = document.querySelector(".pixel-inner");
  var pixelCells = [];
  var pixelMenuOpen = false;

  if (pixelGrid) {
    for (var c = 0; c < 96; c++) {
      var cell = document.createElement("div");
      cell.className = "px-cell";
      pixelGrid.appendChild(cell);
      pixelCells.push(cell);
    }
    /* Set the initial scale through GSAP (not CSS/inline): GSAP parses the
       starting transform once and caches it, so later tweens never re-read
       the authored value. */
    if (hasGsap && !reduced) gsap.set(pixelCells, { scale: 0 });
  }
  function openPixelMenu() {
    if (!pixelMenu || pixelMenuOpen) return;
    pixelMenuOpen = true;
    pixelMenu.classList.add("is-open");
    pixelMenu.setAttribute("aria-hidden", "false");
    if (menuBtn) {
      menuBtn.classList.add("is-open");
      menuBtn.setAttribute("aria-expanded", "true");
      menuBtn.setAttribute("aria-label", "Close menu");
    }
    document.body.classList.add("menu-open");
    if (lenis) lenis.stop();
    if (hasGsap && !reduced) {
      gsap.fromTo(pixelCells, { scale: 0 }, {
        scale: 1, duration: 0.45, ease: EASE_PAGE,
        stagger: { each: 0.004, from: "random" }
      });
      gsap.fromTo(pixelInner, { opacity: 0 }, { opacity: 1, duration: 0.3, delay: 0.25, ease: EASE });
      gsap.fromTo(".pixel-nav a", { y: 32, opacity: 0 }, {
        y: 0, opacity: 1, duration: 0.7, ease: EASE, stagger: 0.07, delay: 0.3
      });
    } else {
      pixelCells.forEach(function (el) { el.style.transform = "scale(1)"; });
      if (pixelInner) pixelInner.style.opacity = "1";
    }
  }
  function closePixelMenu() {
    if (!pixelMenu || !pixelMenuOpen) return;
    pixelMenuOpen = false;
    if (menuBtn) {
      menuBtn.classList.remove("is-open");
      menuBtn.setAttribute("aria-expanded", "false");
      menuBtn.setAttribute("aria-label", "Open menu");
    }
    document.body.classList.remove("menu-open");
    if (lenis) lenis.start();
    function hide() {
      pixelMenu.classList.remove("is-open");
      pixelMenu.setAttribute("aria-hidden", "true");
    }
    if (hasGsap && !reduced) {
      gsap.to(".pixel-nav a", { y: 24, opacity: 0, duration: 0.35, ease: EASE, stagger: 0.03 });
      gsap.to(pixelInner, { opacity: 0, duration: 0.3, delay: 0.1, ease: EASE });
      gsap.to(pixelCells, {
        scale: 0, duration: 0.4, ease: EASE_PAGE, delay: 0.12,
        stagger: { each: 0.004, from: "random" }, onComplete: hide
      });
    } else {
      pixelCells.forEach(function (el) { el.style.transform = "scale(0)"; });
      if (pixelInner) pixelInner.style.opacity = "0";
      hide();
    }
  }
  if (menuBtn) menuBtn.addEventListener("click", function () {
    if (pixelMenuOpen) closePixelMenu(); else openPixelMenu();
  });
  var pixelClose = document.getElementById("pixelClose");
  if (pixelClose) pixelClose.addEventListener("click", closePixelMenu);
  if (pixelMenu) pixelMenu.querySelectorAll(".pixel-nav a").forEach(function (a) {
    a.addEventListener("click", function () { closePixelMenu(); });
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      if (heroZoom && !heroZoom.hidden) closeHeroZoom();
      else if (pixelMenuOpen) closePixelMenu();
    }
  });

  /* ============================================================
     3 · COLLECTIONS — sliders-18 arc fan.
     ============================================================ */
  var fanStage = document.getElementById("fanStage");
  var fanCards = fanStage ? Array.prototype.slice.call(fanStage.children) : [];
  var fanName = document.getElementById("fanName");
  var fanLine = document.getElementById("fanLine");
  var fanFabric = document.getElementById("fanFabric");
  var fanEnquire = document.getElementById("fanEnquire");
  var fanCentre = 0;
  var fanDragging = false;

  function wrapOffset(i, centre) {
    var d = (i - centre) % 8;
    if (d > 4) d -= 8;
    if (d < -4) d += 8;
    return d;
  }
  function layoutFan(animate) {
    if (!fanCards.length) return;
    var step = isMobile() ? 56 : 150;
    fanCards.forEach(function (card, i) {
      var d = wrapOffset(i, fanCentre);
      var ad = Math.abs(d);
      var props = {
        x: d * step,
        y: ad * ad * 28,
        rotation: d * 14,
        scale: 1 - ad * 0.12,
        opacity: Math.max(0.1, 1 - ad * 0.22),
        zIndex: 20 - ad
      };
      if (hasGsap && animate !== false && !reduced) {
        gsap.to(card, Object.assign({ duration: 0.6, ease: EASE_PAGE, overwrite: "auto" }, props));
      } else if (hasGsap) {
        gsap.set(card, props);
      } else {
        card.style.transform = "translate(-50%,-50%) translate(" + props.x + "px," + props.y + "px) rotate(" + props.rotation + "deg) scale(" + props.scale + ")";
        card.style.opacity = String(props.opacity);
        card.style.zIndex = String(props.zIndex);
      }
    });
    var look = LOOKS[fanCentre];
    if (fanName) fanName.textContent = look.name;
    if (fanLine) fanLine.textContent = look.line;
    if (fanFabric) fanFabric.textContent = look.fabric;
    if (fanEnquire) fanEnquire.setAttribute("data-look", look.name);
  }
  function fanTo(i, animate) {
    fanCentre = ((i % 8) + 8) % 8;
    layoutFan(animate);
  }
  if (hasGsap) fanCards.forEach(function (card) { gsap.set(card, { xPercent: -50, yPercent: -50 }); });
  layoutFan(false);
  var fanPrev = document.getElementById("fanPrev");
  var fanNext = document.getElementById("fanNext");
  if (fanPrev) fanPrev.addEventListener("click", function () { fanTo(fanCentre - 1); });
  if (fanNext) fanNext.addEventListener("click", function () { fanTo(fanCentre + 1); });
  var fanEl = document.getElementById("fan");
  if (fanEl) {
    fanEl.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { e.preventDefault(); fanTo(fanCentre - 1); }
      if (e.key === "ArrowRight") { e.preventDefault(); fanTo(fanCentre + 1); }
    });
    var fanDownX = 0, fanMoved = 0;
    fanEl.addEventListener("pointerdown", function (e) {
      /* Buttons inside #fan must keep their clicks: setPointerCapture
         on the fan would retarget the pointer and swallow them. */
      if (e.target.closest("button, a")) return;
      fanDragging = true;
      fanDownX = e.clientX;
      fanMoved = 0;
      fanEl.setPointerCapture(e.pointerId);
    });
    fanEl.addEventListener("pointermove", function (e) {
      if (!fanDragging) return;
      fanMoved = e.clientX - fanDownX;
    });
    fanEl.addEventListener("pointerup", function () {
      if (!fanDragging) return;
      fanDragging = false;
      if (Math.abs(fanMoved) > 60) fanTo(fanCentre + (fanMoved < 0 ? 1 : -1));
    });
    fanEl.addEventListener("pointercancel", function () { fanDragging = false; });
    fanCards.forEach(function (card, i) {
      card.addEventListener("click", function () {
        if (Math.abs(fanMoved) < 10 && i !== fanCentre) fanTo(i);
      });
    });
  }

  /* ============================================================
     4 · SHOP — grid-3 column accordion.
     ============================================================ */
  var shopAcc = document.getElementById("shopAcc");
  var accCols = shopAcc ? Array.prototype.slice.call(shopAcc.children) : [];
  function openShop(i) {
    accCols.forEach(function (col, k) {
      var open = k === i;
      col.classList.toggle("is-open", open);
      var strip = col.querySelector(".acc-strip");
      if (strip) strip.setAttribute("aria-expanded", String(open));
    });
  }
  function shopAccordion() {
    accCols.forEach(function (col, i) {
      var strip = col.querySelector(".acc-strip");
      if (!strip) return;
      strip.addEventListener("click", function () { openShop(i); });
      if (!coarse) {
        strip.addEventListener("mouseenter", function () { openShop(i); });
        strip.addEventListener("focus", function () { openShop(i); });
      }
    });
  }
  shopAccordion();

  /* ============================================================
     5 · PROCESS — scroll-18 scroll fan (pinned scrub).
     ============================================================ */
  var processSection = document.getElementById("process");
  var processStage = document.getElementById("processStage");
  var processTitle = document.getElementById("processTitle");
  var stepCards = processStage ? Array.prototype.slice.call(processStage.children) : [];
  var processStep = -1;

  function scrollFan() {
    if (!processSection || !stepCards.length) return;
    if (reduced || !hasGsap || typeof ScrollTrigger === "undefined") {
      processSection.classList.add("no-pin");
      return;
    }
    var mm = gsap.matchMedia();
    mm.add("(min-width: 641px)", function () {
      processSection.classList.add("is-pinned");
      stepCards.forEach(function (card) { gsap.set(card, { xPercent: -50, yPercent: -50 }); });
      var proxy = { p: 0 };
      function render() {
        var p = proxy.p;
        stepCards.forEach(function (card, i) {
          var off = i - p * 3;
          var ad = Math.abs(off);
          gsap.set(card, {
            x: off * 240,
            y: ad * ad * 36,
            rotation: off * 16,
            scale: 1 - Math.min(0.3, ad * 0.09),
            opacity: Math.max(0.05, 1 - Math.max(0, ad - 1.2) * 0.8)
          });
        });
        var idx = Math.max(0, Math.min(3, Math.round(p * 3)));
        if (idx !== processStep) {
          processStep = idx;
          if (processTitle) {
            processTitle.textContent = STEP_TITLES[idx];
            gsap.fromTo(processTitle, { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: EASE });
          }
        }
      }
      render();
      var st = gsap.to(proxy, {
        p: 1, ease: "none",
        scrollTrigger: {
          trigger: "#processPin",
          start: "top top+=" + 76,
          end: "+=140%",
          pin: true,
          scrub: true,
          onUpdate: render
        }
      });
      return function () {
        if (st.scrollTrigger) st.scrollTrigger.kill();
        st.kill();
        processSection.classList.remove("is-pinned");
        processSection.classList.add("no-pin");
        stepCards.forEach(function (card) { gsap.set(card, { clearProps: "all", opacity: 1 }); });
      };
    });
    mm.add("(max-width: 640px)", function () {
      processSection.classList.add("no-pin");
      return function () { processSection.classList.remove("no-pin"); };
    });
  }
  scrollFan();

  /* ============================================================
     6 · LOOKBOOK — sliders-23 orbit.
     ============================================================ */
  var orbitStage = document.getElementById("orbitStage");
  var orbitThumbs = orbitStage ? Array.prototype.slice.call(orbitStage.children) : [];
  var orbitName = document.getElementById("orbitName");
  var orbitLine = document.getElementById("orbitLine");
  var orbitBack = document.getElementById("orbitBack");
  var orbitAngle = 0;
  var orbitMode = "ring";
  var orbitCentre = 0;

  function orbitRadius() {
    if (!orbitStage) return 120;
    var w = orbitStage.clientWidth, h = orbitStage.clientHeight;
    return Math.max(80, Math.min(w, h) / 2 - (isMobile() ? 60 : 90));
  }
  function orbitPlaceRing() {
    if (!orbitStage) return;
    var R = orbitRadius();
    /* Thumbs are already centred by left:50%/top:50% + translate(-50%,-50%),
       so ring offsets are relative to centre — adding cx/cy again pushed
       the ring a full half-stage down-right, clipping it at the edge. */
    orbitThumbs.forEach(function (thumb, i) {
      var a = (orbitAngle + i * 60) * Math.PI / 180;
      var x = R * Math.cos(a);
      var y = R * Math.sin(a);
      thumb.style.transform = "translate(-50%,-50%) translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px) scale(1)";
      thumb.style.zIndex = "1";
      thumb.classList.remove("is-centre");
    });
  }
  function orbitToArc(i) {
    orbitMode = "arc";
    orbitCentre = i;
    if (orbitStage) orbitStage.classList.add("is-arc");
    var spread = isMobile() ? 60 : 150;
    orbitThumbs.forEach(function (thumb, j) {
      var rel = ((j - i) % 6 + 6) % 6;
      if (rel > 3) rel -= 6;
      var ad = Math.abs(rel);
      var x = rel * spread;
      var y = ad * ad * 26;
      var s = rel === 0 ? 1.5 : 1 - ad * 0.12;
      thumb.style.transform = "translate(-50%,-50%) translate(" + x + "px," + y + "px) scale(" + s + ")";
      thumb.style.zIndex = String(10 - ad);
      thumb.classList.toggle("is-centre", rel === 0);
    });
    if (orbitName) orbitName.textContent = LOOKS[i].name;
    if (orbitLine) orbitLine.textContent = ORBIT_LINES[i];
    if (orbitBack) orbitBack.hidden = false;
  }
  function orbitToRing() {
    orbitMode = "ring";
    orbitCentre = 0;
    if (orbitStage) orbitStage.classList.remove("is-arc");
    if (orbitBack) orbitBack.hidden = true;
    if (orbitName) orbitName.textContent = LOOKS[0].name;
    if (orbitLine) orbitLine.textContent = ORBIT_LINES[0];
    orbitPlaceRing();
  }
  function lookbookOrbit() {
    if (!orbitStage || !orbitThumbs.length) return;
    orbitPlaceRing();
    if (hasGsap && !reduced) {
      gsap.ticker.add(function () {
        if (orbitMode !== "ring") return;
        orbitAngle += 0.05;
        orbitPlaceRing();
      });
    }
    orbitThumbs.forEach(function (thumb, i) {
      thumb.addEventListener("click", function () { orbitToArc(i); });
    });
    if (orbitBack) orbitBack.addEventListener("click", orbitToRing);
  }
  lookbookOrbit();

  /* ============================================================
     7 · ABOUT headline — text-15 block swipe.
     ============================================================ */
  var swipeWords = Array.prototype.slice.call(document.querySelectorAll(".swipe-word"));
  function blockSwipe() {
    if (!swipeWords.length) return;
    if (reduced || !hasGsap || typeof ScrollTrigger === "undefined") return;
    gsap.set(swipeWords, { autoAlpha: 0 });
    var revealed = false;
    function reveal() {
      if (revealed) return;
      revealed = true;
      swipeWords.forEach(function (w, k) {
        setTimeout(function () {
          w.classList.add("in");
          gsap.to(w, { autoAlpha: 1, duration: 0.01, delay: 0.4 });
        }, k * 80);
      });
    }
    ScrollTrigger.create({
      trigger: ".about-title", start: "top 85%", once: true, onEnter: reveal
    });
    setTimeout(reveal, 6000); /* failsafe — words can never stay hidden */
  }
  blockSwipe();

  /* ============================================================
     8 · SHOP INDEX — hover-11: photo follows the cursor.
     ============================================================ */
  var indexList = document.getElementById("indexList");
  var indexFloat = document.getElementById("indexFloat");
  var indexFloatImg = document.getElementById("indexFloatImg");
  var indexRows = indexList ? Array.prototype.slice.call(indexList.children) : [];
  function indexHover() {
    if (!indexList || !indexRows.length) return;
    if (coarse) {
      /* touch: tap a name to reveal its photo inline under the row */
      indexRows.forEach(function (row) {
        var btn = row.querySelector(".index-name");
        var fig = row.querySelector(".index-inline");
        if (!btn || !fig) return;
        btn.addEventListener("click", function () {
          var open = fig.hidden;
          indexRows.forEach(function (r) {
            var f = r.querySelector(".index-inline");
            var b = r.querySelector(".index-name");
            if (f) f.hidden = true;
            if (b) b.setAttribute("aria-expanded", "false");
          });
          fig.hidden = !open;
          btn.setAttribute("aria-expanded", String(open));
        });
      });
      return;
    }
    if (!indexFloat || !indexFloatImg) return;
    var tx = 0, ty = 0, fx = 0, fy = 0, active = false;
    indexList.addEventListener("mousemove", function (e) {
      tx = Math.min(e.clientX + 24, window.innerWidth - 260);
      ty = Math.max(16, e.clientY - 180);
    });
    indexRows.forEach(function (row, i) {
      row.addEventListener("mouseenter", function () {
        indexFloatImg.src = LOOKS[i].photo;
        indexFloat.classList.add("is-on");
        row.classList.add("is-active");
        active = true;
      });
      row.addEventListener("mouseleave", function () {
        row.classList.remove("is-active");
      });
    });
    indexList.addEventListener("mouseleave", function () {
      indexFloat.classList.remove("is-on");
      active = false;
    });
    (function follow() {
      fx += (tx - fx) * 0.18;
      fy += (ty - fy) * 0.18;
      if (active) indexFloat.style.transform = "translate(" + fx.toFixed(1) + "px," + fy.toFixed(1) + "px)";
      requestAnimationFrame(follow);
    })();
  }
  indexHover();

  /* ---------- enquiry pre-select (resets the form every time) ---------- */
  var interest = document.getElementById("fInterest");
  var form = document.getElementById("enquiryForm");
  var success = document.getElementById("formSuccess");
  var formSelected = document.getElementById("formSelected");
  var formSelectedName = document.getElementById("formSelectedName");
  var nameField = document.getElementById("fName");

  function resetFormState() {
    if (form) {
      form.reset();
      form.hidden = false;
      form.querySelectorAll(".field.is-invalid").forEach(function (f) { f.classList.remove("is-invalid"); });
      form.querySelectorAll(".field-error").forEach(function (e) { e.hidden = true; });
    }
    if (success) success.hidden = true;
  }
  function preselectLook(look) {
    if (!interest) return;
    resetFormState();
    var found = false;
    Array.prototype.forEach.call(interest.options, function (o) {
      if (o.text === look) { interest.value = o.value || o.text; found = true; }
    });
    if (!found) interest.value = look;
    if (formSelected && formSelectedName) {
      formSelectedName.textContent = look;
      formSelected.hidden = false;
    }
    scrollToTarget("#contact");
    setTimeout(function () { if (nameField) nameField.focus({ preventScroll: true }); }, 900);
  }
  document.querySelectorAll("[data-look]").forEach(function (btn) {
    btn.addEventListener("click", function () { preselectLook(btn.getAttribute("data-look")); });
  });

  /* ---------- enquiry form: validation + success (front-end only) ---------- */
  var successText = document.getElementById("formSuccessText");
  function setInvalid(input, errEl, bad) {
    var field = input.closest(".field");
    if (field) field.classList.toggle("is-invalid", bad);
    if (errEl) errEl.hidden = !bad;
    return !bad;
  }
  if (form) form.addEventListener("submit", function (e) {
    e.preventDefault();
    var name = document.getElementById("fName");
    var email = document.getElementById("fEmail");
    var message = document.getElementById("fMessage");
    var okName = setInvalid(name, document.getElementById("errName"), name.value.trim().length < 2);
    var okEmail = setInvalid(email, document.getElementById("errEmail"),
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim()));
    var okInterest = setInvalid(interest, document.getElementById("errInterest"), !interest.value);
    var okMsg = setInvalid(message, document.getElementById("errMessage"), message.value.trim().length < 2);
    if (!okName || !okEmail || !okInterest || !okMsg) {
      var firstBad = form.querySelector(".field.is-invalid input, .field.is-invalid select, .field.is-invalid textarea");
      if (firstBad) firstBad.focus();
      return;
    }
    /* Front-end only: no backend, nothing is sent. Show the success state. */
    var chosen = interest.options[interest.selectedIndex].text;
    if (successText) {
      successText.textContent = "Thank you, " + name.value.trim() + " — your enquiry about " + chosen +
        " is noted. The studio will confirm fit and lead time.";
    }
    form.hidden = true;
    if (success) {
      success.hidden = false;
      if (typeof success.scrollIntoView === "function") {
        success.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
      }
    }
  });
  ["fName", "fEmail", "fInterest", "fMessage"].forEach(function (id) {
    var el = document.getElementById(id);
    if (el) el.addEventListener("input", function () {
      var field = el.closest(".field");
      if (field) field.classList.remove("is-invalid");
      var err = document.getElementById("err" + id.slice(1));
      if (err) err.hidden = true;
    });
  });
  var againBtn = document.getElementById("formAgain");
  if (againBtn) againBtn.addEventListener("click", function () {
    resetFormState();
    if (formSelected) formSelected.hidden = true;
  });

  /* ---------- section titles: line-mask reveals; entrances rise ---------- */
  if (hasGsap && !reduced && typeof ScrollTrigger !== "undefined") {
    gsap.utils.toArray("[data-reveal]").forEach(function (el) {
      gsap.fromTo(el, { yPercent: 112 }, {
        yPercent: 0, duration: 1.1, ease: EASE,
        scrollTrigger: { trigger: el, start: "top 88%" }
      });
    });
    var riseEls = gsap.utils.toArray("[data-rise]");
    if (riseEls.length) {
      gsap.set(riseEls, { y: 24, opacity: 0 });
      ScrollTrigger.batch(riseEls, {
        start: "top 92%",
        onEnter: function (batch) {
          gsap.to(batch, { y: 0, opacity: 1, duration: 0.9, ease: EASE, stagger: 0.08, overwrite: true });
        }
      });
    }
  }

  /* ---------- resize: re-layout the JS-positioned motions ---------- */
  var resizeTimer = null;
  window.addEventListener("resize", function () {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      layoutFan(false);
      if (orbitMode === "ring") orbitPlaceRing();
      else orbitToArc(orbitCentre);
    }, 200);
  });

  window.addEventListener("load", function () {
    if (hasGsap && typeof ScrollTrigger !== "undefined") ScrollTrigger.refresh();
  });
})();

/* ============================================================
   AURELO — total rebuild · main.js (100% own code)
   Engine: Lenis smooth scroll + GSAP + ScrollTrigger, all vendored.
   One easing family: cubic-bezier(.22,1,.36,1) reveals/hovers/panels,
   cubic-bezier(.76,0,.24,1) page moves. Nothing linear, nothing bouncy.
   Composition (from the runway-store + boutique-rail previews,
   composition only — their prompts are locked, never invented):
   1 heroWalk — eight looks in a shrinking walking row, ghost wordmark
   2 runwayWalk — scroll-scrubbed walk; centre look steps forward
   3 shopRail — eight looks hanging from one rail line
   4 lookbookScroll — full-bleed horizontal scenes, one per screen
   5 pixelMenu — menu-14 pixel-block menu (kept, passed live probe)
   6 processWalk — four stops on one walked line (static, no pin)
   NOTE: the enquiry form is front-end only — there is no backend
   and nothing is sent anywhere. The success state confirms the
   enquiry was recorded on this page only.
   BUG LESSONS, baked in:
   (a) NEVER setPointerCapture on a container holding buttons — it
       swallows their clicks. Drag handlers skip pointerdown on
       button/a and never capture; movement is tracked on window.
   (b) Ring/walk math is relative to centre only — the stage centre
       is never added twice (cards are centred by left:50%/top:50%
       + xPercent/yPercent -50, offsets are relative to that).
   (c) Every Enquire click calls resetFormState() first, so the form
       is always fresh with the look pre-selected, even from success.
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
      fabric: "Wool coat, high collar.",
      fit: "Sharp through the shoulder. Size up to layer a knit under it." },
    { name: "Pinstripe Trousers", photo: "assets/images/v5/movie-night.jpg",
      line: "Black pinstripe wide legs, a white off-shoulder crop, red shades.",
      fabric: "Pinstripe, wide leg.",
      fit: "Wide leg, high waist. The crop top sits above the waistband." },
    { name: "Yellow Tracksuit", photo: "assets/images/v5/night-look.jpg",
      line: "Sun-yellow fleece, cropped hoodie, drawstring joggers, courtside.",
      fabric: "Yellow fleece, cropped hoodie.",
      fit: "Relaxed fleece throughout. The hoodie is cropped; the joggers sit on the waist." },
    { name: "Teal Satin Jumpsuit", photo: "assets/images/v5/picnic.jpg",
      line: "Teal satin halter, deep V, wide waistband, hands in pockets.",
      fabric: "Teal satin, halter neck.",
      fit: "Fitted through the bodice, straight through the leg. The waistband does the shaping." },
    { name: "Skeleton Tee", photo: "assets/images/v5/road-trip.jpg",
      line: "Black tee with a white skeleton hand print, light ripped denim.",
      fabric: "Black cotton tee, skeleton print.",
      fit: "Boxy tee, straight through the body. The denim is a straight leg with a ripped knee." },
    { name: "Red Tee Black Jacket", photo: "assets/images/v5/street-worn.jpg",
      line: "Red lettered tee under a black jacket, daisy shades, blue sky.",
      fabric: "Red cotton tee, black jacket.",
      fit: "The tee is a regular fit; the jacket is cut loose over it." },
    { name: "Neutral Knits", photo: "assets/images/v5/field.jpg",
      line: "Cream cable knit, beige and rust layers, straight off the rail.",
      fabric: "Cable knit, neutral wool.",
      fit: "Easy, layering knits. The cable knit is the heaviest piece on the rail." },
    { name: "Stripes and Dresses", photo: "assets/images/v5/studio-stitch.jpg",
      line: "Striped tops, floral dresses and folded denim, hung in the shop.",
      fabric: "Mixed rail: dresses, stripes, denim.",
      fit: "Each piece is cut to its own shape; the rail mixes fitted dresses and easy stripes." }
  ];

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
     HERO — heroWalk: the line-up. Tap a figure to walk its look
     to the centre of the runway.
     ============================================================ */
  function heroIntro() {
    if (!hasGsap || reduced) return;
    gsap.fromTo(".hero-title .mask-inner",
      { yPercent: 112 },
      { yPercent: 0, duration: 1.1, ease: EASE, stagger: 0.09, delay: 0.1 });
    gsap.fromTo(".hero-sub, .hero-ctas",
      { y: 24, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.9, ease: EASE, stagger: 0.08, delay: 0.45 });
    gsap.fromTo(".walk-fig",
      { y: 32, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.9, ease: EASE, stagger: 0.05, delay: 0.6 });
  }
  heroIntro();
  document.querySelectorAll(".walk-fig").forEach(function (btn) {
    btn.addEventListener("click", function () {
      runwayTo(parseInt(btn.getAttribute("data-look-i"), 10));
    });
  });

  /* ============================================================
     MENU — menu-14: black pixel blocks dissolve in, then links.
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
    if (e.key === "Escape" && pixelMenuOpen) closePixelMenu();
  });

  /* ============================================================
     RUNWAY — runwayWalk: scroll-scrubbed walk.
     p runs 0..1 across the pinned scroll; look i is centre at
     p = i/7. Cards are centred by left:50%/top:50% + xPercent/yPercent
     -50, so every offset below is relative to centre — the stage
     centre is never added twice. Arrows/drag/keyboard do NOT tween
     the scrub proxy (that would kill the scrub tween); they scroll
     the page to the scroll position for that look instead.
     Desktop only: ≤640px and reduced-motion fall back to a static
     vertical walk (CSS), and the scrub is never created.
     ============================================================ */
  var runwaySection = document.getElementById("runway");
  var runwayStage = document.getElementById("runwayStage");
  var runwayLooks = runwayStage ? Array.prototype.slice.call(runwayStage.children) : [];
  var runwayName = document.getElementById("runwayName");
  var runwayLine = document.getElementById("runwayLine");
  var runwayFabric = document.getElementById("runwayFabric");
  var runwayEnquire = document.getElementById("runwayEnquire");
  var runwayCentre = 0;
  var runwayP = 0;
  var runwayST = null;
  var runwayTarget = -1;
  var runwayFlyTimer = null;

  /* Synchronous detail update. The old fan updated its detail only
     inside a GSAP callback, and a click interrupting an in-flight
     tween swallowed the update — the heading never moved even
     though the fan rotated. Here the text is set in the step
     function itself, synchronously; only transforms animate. */
  function setRunwayDetail(i) {
    runwayCentre = i;
    var look = LOOKS[i];
    if (runwayName) runwayName.textContent = look.name;
    if (runwayLine) runwayLine.textContent = look.line;
    if (runwayFabric) runwayFabric.textContent = look.fabric;
    if (runwayEnquire) runwayEnquire.setAttribute("data-look", look.name);
  }

  function wrapOffset(i, centre) {
    var d = (i - centre) % 8;
    if (d > 4) d -= 8;
    if (d < -4) d += 8;
    return d;
  }
  function layoutRunway(p) {
    runwayP = p;
    if (!runwayLooks.length || !hasGsap) return;
    /* Step sized so every look's box stays inside the stage: the
       farthest offset is 4 steps out, so step <= wrapW/8 - 24 keeps
       even the outermost (smallest, faintest) look in bounds. */
    var wrapW = Math.min(1440, window.innerWidth - 48);
    var step = Math.max(56, Math.min(160, wrapW / 8 - 24));
    runwayLooks.forEach(function (card, i) {
      var d = wrapOffset(i, Math.round(p * 7));
      /* Continuous position: use the fractional offset so the walk
         slides smoothly between centres instead of jumping. */
      var off = i - p * 7;
      if (off > 4) off -= 8;
      if (off < -4) off += 8;
      var ad = Math.abs(off);
      gsap.set(card, {
        x: off * step,
        y: ad * ad * 16,
        rotation: off * 3,
        scale: 1 - Math.min(0.55, ad * 0.13),
        opacity: Math.max(0.15, 1 - ad * 0.18),
        zIndex: 20 - Math.round(ad)
      });
    });
    var idx = Math.max(0, Math.min(7, Math.round(p * 7)));
    if (runwayTarget >= 0) {
      /* A programmatic step is in flight: hold the detail at the
         clicked look instead of letting the scrub flicker it back
         to the old centre mid-scroll. Cleared on arrival or by
         timeout, so a manual scroll never leaves it frozen. */
      if (idx === runwayTarget) {
        runwayTarget = -1;
        if (runwayFlyTimer) { clearTimeout(runwayFlyTimer); runwayFlyTimer = null; }
      }
    } else if (idx !== runwayCentre) {
      setRunwayDetail(idx);
    }
  }
  function runwayTo(i) {
    i = ((i % 8) + 8) % 8;
    /* Synchronous: detail text updates NOW, before any scroll or
       tween runs — never inside a callback that a click can kill. */
    setRunwayDetail(i);
    runwayTarget = i;
    if (runwayFlyTimer) clearTimeout(runwayFlyTimer);
    runwayFlyTimer = setTimeout(function () { runwayTarget = -1; runwayFlyTimer = null; }, 1600);
    if (runwayST) {
      /* Scroll the page to the position where look i is centre. */
      var target = runwayST.start + (i / 7) * (runwayST.end - runwayST.start);
      if (lenis) lenis.scrollTo(target, { duration: 1.2 });
      else window.scrollTo({ top: target, behavior: reduced ? "auto" : "smooth" });
    } else {
      /* No pin (mobile / reduced motion): scroll the look into view. */
      var card = runwayLooks[i];
      if (card) scrollToTarget(card);
      else scrollToTarget("#runway");
    }
  }
  function runwayWalk() {
    if (!runwaySection || !runwayLooks.length) return;
    if (reduced || !hasGsap || typeof ScrollTrigger === "undefined") {
      runwaySection.classList.add("no-pin");
      return;
    }
    var mm = gsap.matchMedia();
    mm.add("(min-width: 641px)", function () {
      runwaySection.classList.remove("no-pin");
      runwayLooks.forEach(function (card) { gsap.set(card, { xPercent: -50, yPercent: -50 }); });
      layoutRunway(0);
      var proxy = { p: 0 };
      var st = gsap.to(proxy, {
        p: 1, ease: "none",
        scrollTrigger: {
          trigger: "#runwayPin",
          start: "top top+=" + 76,
          end: "+=160%",
          pin: true,
          scrub: true,
          onUpdate: function () { layoutRunway(proxy.p); }
        }
      });
      runwayST = st.scrollTrigger;
      return function () {
        if (st.scrollTrigger) st.scrollTrigger.kill();
        st.kill();
        runwayST = null;
        runwaySection.classList.add("no-pin");
        runwayLooks.forEach(function (card) { gsap.set(card, { clearProps: "all", opacity: 1 }); });
      };
    });
    mm.add("(max-width: 640px)", function () {
      runwaySection.classList.add("no-pin");
      return function () { runwaySection.classList.remove("no-pin"); };
    });
  }
  runwayWalk();

  var runwayPrev = document.getElementById("runwayPrev");
  var runwayNext = document.getElementById("runwayNext");
  if (runwayPrev) runwayPrev.addEventListener("click", function () { runwayTo(runwayCentre - 1); });
  if (runwayNext) runwayNext.addEventListener("click", function () { runwayTo(runwayCentre + 1); });
  if (runwayStage) {
    runwayStage.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { e.preventDefault(); runwayTo(runwayCentre - 1); }
      if (e.key === "ArrowRight") { e.preventDefault(); runwayTo(runwayCentre + 1); }
    });
    /* Drag: never setPointerCapture on the stage (it holds Enquire
       buttons) and never start a drag from a button or link. Movement
       is tracked on window, so a pointer leaving the stage still ends
       cleanly. */
    var rwDownX = 0, rwMoved = 0, rwDragging = false;
    runwayStage.addEventListener("pointerdown", function (e) {
      if (e.target.closest("button, a")) return;
      rwDragging = true;
      rwDownX = e.clientX;
      rwMoved = 0;
    });
    window.addEventListener("pointermove", function (e) {
      if (!rwDragging) return;
      rwMoved = e.clientX - rwDownX;
    });
    window.addEventListener("pointerup", function () {
      if (!rwDragging) return;
      rwDragging = false;
      if (Math.abs(rwMoved) > 60) runwayTo(runwayCentre + (rwMoved < 0 ? 1 : -1));
    });
    runwayLooks.forEach(function (card, i) {
      card.addEventListener("click", function (e) {
        if (e.target.closest("button, a")) return;
        if (Math.abs(rwMoved) < 10 && i !== runwayCentre) runwayTo(i);
      });
    });
  }

  /* ============================================================
     SHOP — shopRail: eight looks hanging from one rail line.
     Tap a hanging look; its fit note, sizes and Enquire open
     in the detail below the rail.
     ============================================================ */
  var railList = document.getElementById("railList");
  var railItems = railList ? Array.prototype.slice.call(railList.children) : [];
  var railName = document.getElementById("railName");
  var railFit = document.getElementById("railFit");
  var railEnquire = document.getElementById("railEnquire");

  function openRail(i) {
    var look = LOOKS[i];
    if (!look) return;
    railItems.forEach(function (item, k) {
      var open = k === i;
      item.classList.toggle("is-active", open);
      item.setAttribute("aria-expanded", String(open));
    });
    if (railName) railName.textContent = look.name;
    if (railFit) railFit.textContent = look.fit;
    if (railEnquire) railEnquire.setAttribute("data-look", look.name);
  }
  railItems.forEach(function (item, i) {
    item.addEventListener("click", function () { openRail(i); });
  });

  /* ============================================================
     LOOKBOOK — lookbookScroll: full-bleed horizontal scenes.
     Native scroll-snap + arrows + keyboard + drag. Drag never
     captures the pointer and never starts on a button.
     ============================================================ */
  var lookTrack = document.getElementById("lookbookTrack");
  function lookStep(dir) {
    if (!lookTrack) return;
    var w = lookTrack.clientWidth || window.innerWidth;
    lookTrack.scrollBy({ left: dir * w, behavior: reduced ? "auto" : "smooth" });
  }
  var lookPrev = document.getElementById("lookPrev");
  var lookNext = document.getElementById("lookNext");
  if (lookPrev) lookPrev.addEventListener("click", function () { lookStep(-1); });
  if (lookNext) lookNext.addEventListener("click", function () { lookStep(1); });
  if (lookTrack) {
    lookTrack.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { e.preventDefault(); lookStep(-1); }
      if (e.key === "ArrowRight") { e.preventDefault(); lookStep(1); }
    });
    var lbDownX = 0, lbStart = 0, lbDragging = false, lbMoved = 0;
    lookTrack.addEventListener("pointerdown", function (e) {
      if (e.target.closest("button, a")) return;
      lbDragging = true;
      lbDownX = e.clientX;
      lbStart = lookTrack.scrollLeft;
      lbMoved = 0;
      lookTrack.classList.add("is-dragging");
    });
    window.addEventListener("pointermove", function (e) {
      if (!lbDragging) return;
      lbMoved = e.clientX - lbDownX;
      lookTrack.scrollLeft = lbStart - lbMoved;
    });
    window.addEventListener("pointerup", function () {
      if (!lbDragging) return;
      lbDragging = false;
      lookTrack.classList.remove("is-dragging");
      /* Snap back to the nearest scene after a drag. */
      var w = lookTrack.clientWidth || window.innerWidth;
      var idx = Math.round(lookTrack.scrollLeft / w);
      lookTrack.scrollTo({ left: idx * w, behavior: reduced ? "auto" : "smooth" });
    });
  }

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

  /* Test hook: lets the smoke suite drive the walk and read its
     state without reaching into the closure. No user-facing effect. */
  window.__aurelo = {
    runway: {
      layout: layoutRunway,
      to: runwayTo,
      centre: function () { return runwayCentre; },
      looks: runwayLooks
    },
    rail: { open: openRail }
  };

  /* ---------- resize: re-layout the runway walk ---------- */
  var resizeTimer = null;
  window.addEventListener("resize", function () {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      if (runwayST) layoutRunway(runwayP);
    }, 200);
  });

  window.addEventListener("load", function () {
    if (hasGsap && typeof ScrollTrigger !== "undefined") ScrollTrigger.refresh();
  });
})();

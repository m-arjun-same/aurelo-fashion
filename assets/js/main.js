/* ============================================================
   AURELO — proper business site · main.js (100% own code)
   Lenis smooth scroll + GSAP ScrollTrigger, all vendored.
   Systems: curtain-lift loader (wordmark only) · sticky header ·
   full overlay mobile menu · hero line-mask intro + count-ups ·
   section reveals · lookbook filmstrip slider (drag / arrows /
   keyboard / dots) · look & service enquiry pre-select ·
   enquiry form validation + success state.
   NOTE: the enquiry form is front-end only — there is no backend
   and nothing is sent anywhere. The success state confirms the
   enquiry was recorded on this page only.
   ============================================================ */
(function () {
  "use strict";
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasGsap = typeof gsap !== "undefined";
  if (hasGsap && typeof ScrollTrigger !== "undefined") gsap.registerPlugin(ScrollTrigger);

  /* ---------------- loader : curtain lift ---------------- */
  var loader = document.getElementById("loader");
  document.body.classList.add("is-loading");
  var loaderDone = false;
  function finishLoader() {
    if (loaderDone || !loader) return;
    loaderDone = true;
    document.body.classList.remove("is-loading");
    if (hasGsap && !reduced) {
      var tl = gsap.timeline({
        onComplete: function () { loader.remove(); heroIntro(); }
      });
      tl.to(".loader-core", { yPercent: -30, opacity: 0, duration: .38, ease: "power2.in" })
        .to(".loader-panel--left", { xPercent: -103, rotate: -2.5, duration: .85, ease: "power4.inOut" }, "-=.05")
        .to(".loader-panel--right", { xPercent: 103, rotate: 2.5, duration: .85, ease: "power4.inOut" }, "<");
    } else {
      loader.remove();
      heroIntro();
    }
  }
  window.addEventListener("load", function () { setTimeout(finishLoader, 650); });
  setTimeout(finishLoader, 2600); /* failsafe — loader can never trap the page */

  /* ---------------- smooth scroll ---------------- */
  var lenis = null;
  if (!reduced && typeof Lenis !== "undefined" && hasGsap) {
    lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  }
  function scrollToTarget(target) {
    if (lenis) {
      lenis.scrollTo(target, { duration: 1.4 });
    } else if (target === 0) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      var el = typeof target === "string" ? document.querySelector(target) : target;
      if (el) el.scrollIntoView({ behavior: "smooth" });
    }
  }

  /* ---------------- header state + to-top ---------------- */
  var head = document.getElementById("siteHead");
  function onScrollState() {
    if (head) head.classList.toggle("is-scrolled", window.scrollY > 40);
  }
  window.addEventListener("scroll", onScrollState, { passive: true });
  onScrollState();
  var toTop = document.getElementById("toTop");
  if (toTop) toTop.addEventListener("click", function () { scrollToTarget(0); });

  /* ---------------- mobile overlay menu ---------------- */
  var menuBtn = document.getElementById("menuBtn");
  var mobileMenu = document.getElementById("mobileMenu");
  function setMenu(open) {
    if (!menuBtn || !mobileMenu) return;
    menuBtn.classList.toggle("is-open", open);
    mobileMenu.classList.toggle("is-open", open);
    mobileMenu.setAttribute("aria-hidden", String(!open));
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    document.body.classList.toggle("menu-open", open);
    if (lenis) { if (open) lenis.stop(); else lenis.start(); }
  }
  if (menuBtn) menuBtn.addEventListener("click", function () {
    setMenu(!mobileMenu.classList.contains("is-open"));
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && mobileMenu && mobileMenu.classList.contains("is-open")) setMenu(false);
  });
  if (mobileMenu) mobileMenu.querySelectorAll("a").forEach(function (a) {
    a.addEventListener("click", function () { setMenu(false); });
  });

  /* ---------------- anchor links ---------------- */
  document.querySelectorAll('a[href^="#"]').forEach(function (a) {
    a.addEventListener("click", function (e) {
      var id = a.getAttribute("href");
      if (id === "#top") { e.preventDefault(); scrollToTarget(0); return; }
      if (id.length > 1 && document.querySelector(id)) { e.preventDefault(); scrollToTarget(id); }
    });
  });

  /* ---------------- hero intro ---------------- */
  var heroPlayed = false;
  function heroIntro() {
    if (heroPlayed) return;
    heroPlayed = true;
    if (!hasGsap || reduced) return;
    gsap.fromTo(".hero-title .ht-inner",
      { yPercent: 112 },
      { yPercent: 0, duration: 1.15, ease: "power4.out", stagger: .09 });
    gsap.fromTo(".hero-kicker, .hero-sub, .hero-ctas, .hero-stats",
      { y: 26, opacity: 0 },
      { y: 0, opacity: 1, duration: .9, ease: "power3.out", stagger: .12, delay: .35 });
    gsap.fromTo(".hero-sun", { scale: .6, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.4, ease: "power3.out" });
    gsap.fromTo(".hero-wedge", { scaleX: 0 }, { scaleX: 1, duration: 1, ease: "power4.out", delay: .55 });
  }
  /* If GSAP failed to load, hero text must still be visible: it is —
     all initial states are set by GSAP itself (fromTo), never by CSS. */

  /* ---------------- lookbook slider (drag / arrows / keys / dots) ---------------- */
  var slider = document.getElementById("slider");
  var track = document.getElementById("sliderTrack");
  var slides = track ? Array.prototype.slice.call(track.children) : [];
  var dotsWrap = document.getElementById("sliderDots");
  var nowEl = document.getElementById("slideNow");
  var totalEl = document.getElementById("slideTotal");
  var current = 0;
  var dragging = false;
  var dragStartX = 0;
  var dragStartOffset = 0;
  var dragOffset = 0;
  if (totalEl) totalEl.textContent = String(slides.length);

  function gapPx() {
    if (!track) return 0;
    var g = parseFloat(window.getComputedStyle(track).columnGap || "0");
    return isNaN(g) ? 0 : g;
  }
  function offsetFor(i) {
    var gap = gapPx();
    var off = 0;
    for (var k = 0; k < i; k++) off += slides[k].offsetWidth + gap;
    return off;
  }
  function maxOffset() {
    if (!slider || !slides.length) return 0;
    return Math.max(0, offsetFor(slides.length - 1));
  }
  function applyOffset(off, animate) {
    if (!track) return;
    track.style.transition = (animate && !reduced) ? "transform .55s cubic-bezier(.16,1,.3,1)" : "none";
    track.style.transform = "translate3d(" + (-off) + "px, 0, 0)";
  }
  function goTo(i, animate) {
    if (!slides.length) return;
    current = Math.max(0, Math.min(slides.length - 1, i));
    applyOffset(Math.min(offsetFor(current), maxOffset()), animate !== false);
    if (nowEl) nowEl.textContent = String(current + 1);
    if (dotsWrap) dotsWrap.querySelectorAll(".slider-dot").forEach(function (d, di) {
      d.classList.toggle("is-on", di === current);
      d.setAttribute("aria-selected", String(di === current));
    });
  }
  if (dotsWrap) {
    slides.forEach(function (s, i) {
      var d = document.createElement("button");
      d.type = "button";
      d.className = "slider-dot" + (i === 0 ? " is-on" : "");
      d.setAttribute("role", "tab");
      d.setAttribute("aria-label", "Go to look " + (i + 1));
      d.setAttribute("aria-selected", String(i === 0));
      d.addEventListener("click", function () { goTo(i); });
      dotsWrap.appendChild(d);
    });
  }
  var prevBtn = document.getElementById("slidePrev");
  var nextBtn = document.getElementById("slideNext");
  if (prevBtn) prevBtn.addEventListener("click", function () { goTo(current - 1); });
  if (nextBtn) nextBtn.addEventListener("click", function () { goTo(current + 1); });
  if (slider) {
    slider.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { e.preventDefault(); goTo(current - 1); }
      if (e.key === "ArrowRight") { e.preventDefault(); goTo(current + 1); }
    });
    slider.addEventListener("pointerdown", function (e) {
      dragging = true;
      dragStartX = e.clientX;
      dragStartOffset = offsetFor(current);
      slider.classList.add("is-dragging");
      slider.setPointerCapture(e.pointerId);
    });
    slider.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      dragOffset = Math.max(0, Math.min(maxOffset(), dragStartOffset + (dragStartX - e.clientX)));
      applyOffset(dragOffset, false);
    });
    function endDrag() {
      if (!dragging) return;
      dragging = false;
      slider.classList.remove("is-dragging");
      /* snap to the nearest slide */
      var best = 0, bestDist = Infinity;
      slides.forEach(function (s, i) {
        var d = Math.abs(offsetFor(i) - dragOffset);
        if (d < bestDist) { bestDist = d; best = i; }
      });
      goTo(best);
    }
    slider.addEventListener("pointerup", endDrag);
    slider.addEventListener("pointercancel", endDrag);
  }
  window.addEventListener("resize", function () { goTo(current, false); });

  /* ---------------- enquiry pre-select ---------------- */
  var interest = document.getElementById("fInterest");
  var formSelected = document.getElementById("formSelected");
  var formSelectedName = document.getElementById("formSelectedName");
  var nameField = document.getElementById("fName");
  function preselectLook(look) {
    if (!interest) return;
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

  /* ---------------- enquiry form : validation + success ---------------- */
  var form = document.getElementById("enquiryForm");
  var success = document.getElementById("formSuccess");
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
        " is noted. The atelier will confirm fit and lead time.";
    }
    form.hidden = true;
    if (success) {
      success.hidden = false;
      success.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
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
    if (form) { form.reset(); form.hidden = false; }
    if (success) success.hidden = true;
    if (formSelected) formSelected.hidden = true;
  });

  if (!hasGsap) return;

  /* ---------------- scroll motion ---------------- */
  if (!reduced) {
    gsap.to(".hero-sun", {
      yPercent: 26, scale: 1.12, ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true }
    });
    gsap.to(".ribbon-track", {
      xPercent: -14, ease: "none",
      scrollTrigger: { trigger: ".ribbon", start: "top bottom", end: "bottom top", scrub: true }
    });
    gsap.to(".hero-inner", {
      yPercent: -8, opacity: .25, ease: "none",
      scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom 35%", scrub: true }
    });

    /* section titles: masked line rises */
    gsap.utils.toArray("[data-reveal]").forEach(function (el) {
      gsap.fromTo(el, { yPercent: 112 }, {
        yPercent: 0, duration: 1.1, ease: "power4.out",
        scrollTrigger: { trigger: el, start: "top 88%" }
      });
    });

    /* stats count-up */
    gsap.utils.toArray("[data-count]").forEach(function (el) {
      var end = parseInt(el.getAttribute("data-count"), 10);
      var obj = { v: 0 };
      gsap.to(obj, {
        v: end, duration: 1.6, ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 92%" },
        onUpdate: function () { el.textContent = String(Math.round(obj.v)); },
        onComplete: function () { el.textContent = String(end); }
      });
    });

    /* cards rise in */
    gsap.utils.toArray(".look-card, .service-card, .process-step, .policy").forEach(function (el) {
      gsap.fromTo(el, { y: 54, opacity: 0 }, {
        y: 0, opacity: 1, duration: .9, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 92%" }
      });
    });

    /* about media + form card settle */
    gsap.fromTo(".about-media", { y: 70, opacity: 0 }, {
      y: 0, opacity: 1, duration: 1, ease: "power3.out",
      scrollTrigger: { trigger: ".about-media", start: "top 88%" }
    });
    gsap.fromTo(".form-card", { y: 70, opacity: 0 }, {
      y: 0, opacity: 1, duration: 1, ease: "power3.out",
      scrollTrigger: { trigger: ".form-card", start: "top 88%" }
    });
    gsap.fromTo(".footer-word", { yPercent: 34 }, {
      yPercent: 0, duration: 1.1, ease: "power4.out",
      scrollTrigger: { trigger: ".footer", start: "top 82%" }
    });
  }

  window.addEventListener("load", function () { ScrollTrigger.refresh(); });
})();

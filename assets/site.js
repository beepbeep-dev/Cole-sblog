(() => {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- text scramble: characters cycle through 0/1 before settling ----
  const GLYPHS = "01";
  function scramble(el) {
    const final = el.dataset.text || el.textContent;
    el.dataset.text = final;
    if (reduced) { el.textContent = final; return; }
    el.setAttribute("aria-label", final);
    const start = performance.now();
    const dur = Math.min(1400, 400 + final.length * 45);
    function frame(now) {
      const p = Math.min(1, (now - start) / dur);
      const settled = Math.floor(p * final.length);
      let out = "";
      for (let i = 0; i < final.length; i++) {
        const ch = final[i];
        if (i < settled || !/[A-Za-z0-9]/.test(ch)) out += ch;
        else out += GLYPHS[(Math.random() * GLYPHS.length) | 0];
      }
      el.textContent = out;
      if (p < 1) requestAnimationFrame(frame);
      else el.textContent = final;
    }
    requestAnimationFrame(frame);
  }
  document.querySelectorAll("[data-scramble]").forEach(scramble);

  // ---- reveal on scroll ----
  const revealables = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduced) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add("in");
        e.target.querySelectorAll("[data-scramble-on-view]").forEach(scramble);
        io.unobserve(e.target);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    revealables.forEach((el) => io.observe(el));
  } else {
    revealables.forEach((el) => el.classList.add("in"));
  }

  // ---- base switcher (DEC / HEX / BIN) for exact integers ----
  function fmt(big, base) {
    const neg = big < 0n;
    const abs = neg ? -big : big;
    let s;
    if (base === "hex") s = "0x" + abs.toString(16).toUpperCase();
    else if (base === "bin") s = "0b" + abs.toString(2).replace(/\B(?=(\d{4})+(?!\d))/g, " ");
    else s = abs.toLocaleString("en-US");
    return (neg ? "−" : "") + s;
  }
  const ints = document.querySelectorAll("[data-int]");
  function setBase(base) {
    ints.forEach((el) => {
      el.textContent = fmt(BigInt(el.dataset.int), base);
      el.classList.toggle("small", base === "bin" && el.dataset.int.replace("-", "").length > 5);
    });
    document.querySelectorAll(".base-switch button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.base === base)));
    try { localStorage.setItem("cole.base", base); } catch (_) {}
  }
  if (ints.length) {
    document.querySelectorAll(".base-switch button").forEach((b) => b.addEventListener("click", () => setBase(b.dataset.base)));
    let saved = "dec";
    try { saved = localStorage.getItem("cole.base") || "dec"; } catch (_) {}
    setBase(saved);
  }

  // ---- interactive 32-bit register ----
  const bitsEl = document.getElementById("bits");
  if (bitsEl) {
    const signedOut = document.getElementById("signed");
    const unsignedOut = document.getElementById("unsigned");
    const cells = [];
    for (let i = 31; i >= 0; i--) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "bit" + (i === 31 ? " sign" : "");
      b.setAttribute("aria-label", "bit " + i + (i === 31 ? " (sign bit)" : ""));
      b.addEventListener("click", () => { value = (value ^ (1 << i)) >>> 0; render(); });
      bitsEl.appendChild(b);
      cells[i] = b;
    }
    let value = 0x7FFFFFFF;
    function render() {
      for (let i = 0; i < 32; i++) {
        const on = ((value >>> i) & 1) === 1;
        cells[i].classList.toggle("on", on);
        cells[i].textContent = on ? "1" : "0";
        cells[i].setAttribute("aria-pressed", String(on));
      }
      signedOut.textContent = (value | 0).toLocaleString("en-US").replace("-", "−");
      unsignedOut.textContent = (value >>> 0).toLocaleString("en-US");
    }
    const presets = {
      max: () => 0x7FFFFFFF,
      min: () => 0x80000000,
      neg1: () => 0xFFFFFFFF,
      zero: () => 0,
      inc: () => (value + 1) >>> 0,
    };
    document.querySelectorAll("[data-preset]").forEach((btn) =>
      btn.addEventListener("click", () => { value = presets[btn.dataset.preset]() >>> 0; render(); })
    );
    render();
  }


  // ---- phone menu ----
  const nav = document.querySelector(".nav");
  const menuBtn = document.querySelector(".menu-btn");
  if (nav && menuBtn) {
    const setMenu = (open) => {
      nav.classList.toggle("open", open);
      menuBtn.setAttribute("aria-expanded", String(open));
      document.documentElement.classList.toggle("menu-open", open);
    };
    menuBtn.addEventListener("click", () => setMenu(!nav.classList.contains("open")));
    nav.querySelectorAll("#nav-links a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
    document.addEventListener("keydown", (e) => { if (e.key === "Escape" && nav.classList.contains("open")) { setMenu(false); menuBtn.focus(); } });
    window.addEventListener("resize", () => { if (window.innerWidth > 760) setMenu(false); });
  }

  // ---- nav links scramble on hover ----
  if (!reduced) {
    document.querySelectorAll(".nav a.link").forEach((a) => {
      const final = a.textContent;
      let busy = false;
      a.addEventListener("pointerenter", (e) => {
        if (busy || e.pointerType !== "mouse" || window.innerWidth <= 760) return;
        busy = true;
        setTimeout(() => { a.textContent = final; busy = false; }, 600); // always restore the real label
        const start = performance.now();
        (function frame(now) {
          const p = Math.min(1, (now - start) / 320);
          const settled = Math.floor(p * final.length);
          a.textContent = [...final].map((ch, i) => (i < settled ? ch : Math.random() < 0.5 ? "0" : "1")).join("");
          if (p < 1) requestAnimationFrame(frame);
          else { a.textContent = final; busy = false; }
        })(start);
      });
    });
  }

  // ---- scroll progress bar ----
  const bar = document.querySelector(".progress");
  if (bar) {
    let ticking = false;
    const paint = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = "scaleX(" + (max > 0 ? Math.min(1, window.scrollY / max) : 0) + ")";
      ticking = false;
    };
    window.addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(paint); } }, { passive: true });
    paint();
  }

  const finePointer = window.matchMedia("(pointer: fine)").matches;

  // ---- cursor glow (mouse only) ----
  if (finePointer && !reduced) {
    const glow = document.createElement("div");
    glow.className = "cursor-glow";
    glow.setAttribute("aria-hidden", "true");
    document.body.appendChild(glow);
    let x = innerWidth / 2, y = innerHeight / 3, tx = x, ty = y, raf = 0;
    const move = () => {
      x += (tx - x) * 0.14; y += (ty - y) * 0.14;
      glow.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.5 ? requestAnimationFrame(move) : 0;
    };
    window.addEventListener("pointermove", (e) => {
      tx = e.clientX; ty = e.clientY;
      glow.classList.add("on");
      if (!raf) raf = requestAnimationFrame(move);
    }, { passive: true });
    document.addEventListener("pointerleave", () => glow.classList.remove("on"));
  }

  // ---- hero dot field: dots light up and get pushed around near the cursor ----
  const hero = document.querySelector(".hero");
  if (hero && !reduced) {
    const cv = document.createElement("canvas");
    cv.className = "hero-field";
    cv.setAttribute("aria-hidden", "true");
    hero.prepend(cv);
    document.documentElement.classList.add("has-field");
    const ctx = cv.getContext("2d");
    const GAP = 26;
    let w = 0, h = 0, dpr = 1, mx = -9999, my = -9999, t = 0, raf = 0, visible = true;
    const size = () => {
      const r = hero.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = r.width; h = r.height;
      cv.width = w * dpr; cv.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const draw = () => {
      t += 1;
      ctx.clearRect(0, 0, w, h);
      for (let y = GAP / 2; y < h; y += GAP) {
        for (let x = GAP / 2; x < w; x += GAP) {
          const dx = x - mx, dy = y - my, d = Math.hypot(dx, dy);
          const near = Math.max(0, 1 - d / 160);
          const wave = 0.5 + 0.5 * Math.sin(x * 0.012 + y * 0.018 - t * 0.025);
          const fade = Math.min(1, (h - y) / (h * 0.5)); // fade out toward the bottom of the hero
          const push = near * near * 10;
          const px = x + (d ? (dx / d) * push : 0), py = y + (d ? (dy / d) * push : 0);
          const a = (0.05 + wave * 0.06 + near * 0.75) * fade;
          if (a < 0.02) continue;
          ctx.fillStyle = near > 0.05 ? `rgba(200,255,77,${a})` : `rgba(255,255,255,${a})`;
          const r = 1 + near * 1.6;
          ctx.fillRect(px - r / 2, py - r / 2, r, r);
        }
      }
      raf = visible && !document.hidden ? requestAnimationFrame(draw) : 0;
    };
    const kick = () => { if (!raf && visible && !document.hidden) raf = requestAnimationFrame(draw); };
    size();
    if ("ResizeObserver" in window) new ResizeObserver(size).observe(hero);
    hero.addEventListener("pointermove", (e) => { const r = hero.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; }, { passive: true });
    hero.addEventListener("pointerleave", () => { mx = my = -9999; });
    new IntersectionObserver((es) => { visible = es[0].isIntersecting; kick(); }).observe(hero);
    document.addEventListener("visibilitychange", kick);
    kick();
  }

  // ---- 3D tilt + glare on cards (mouse only) ----
  if (finePointer && !reduced) {
    document.querySelectorAll(".feature, .term, .tile-open, .game-tile").forEach((el) => {
      el.classList.add("tilt");
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        el.style.setProperty("--rx", ((0.5 - py) * 6).toFixed(2) + "deg");
        el.style.setProperty("--ry", ((px - 0.5) * 8).toFixed(2) + "deg");
        el.style.setProperty("--gx", (px * 100).toFixed(1) + "%");
        el.style.setProperty("--gy", (py * 100).toFixed(1) + "%");
      });
      el.addEventListener("pointerleave", () => { el.style.setProperty("--rx", "0deg"); el.style.setProperty("--ry", "0deg"); });
    });
  }

  // ---- footer year ----
  document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
})();

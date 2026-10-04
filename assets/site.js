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

  // ---- footer year ----
  document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
})();

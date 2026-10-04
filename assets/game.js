// Flappy Bit — a tiny flappy-bird style game that lives in the corner of every page.
(() => {
  const W = 240, H = 160;
  const ACCENT = "#C8FF4D", INK = "#F2F2EE", MUTED = "#9B9B95", PIPE = "#2A2A2A", PIPE_EDGE = "#3A3A3A";
  const GRAVITY = 0.32, FLAP = -4.6, SPEED = 1.5, GAP = 54, PIPE_W = 24, SPACING = 104;

  const root = document.createElement("aside");
  root.className = "fb";
  root.setAttribute("aria-label", "Flappy Bit mini game");
  root.innerHTML =
    '<div class="fb-head"><span><b>flappy_bit</b> &middot; best <span class="fb-best">0</span></span>' +
    '<button class="fb-toggle" type="button" aria-expanded="true" aria-label="Hide game">&minus;</button></div>' +
    '<canvas tabindex="0" aria-label="Game. Click, tap, or press space to flap."></canvas>';
  document.body.appendChild(root);

  const canvas = root.querySelector("canvas");
  const toggle = root.querySelector(".fb-toggle");
  const bestEl = root.querySelector(".fb-best");
  const ctx = canvas.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.scale(dpr, dpr);

  let best = 0;
  try { best = parseInt(localStorage.getItem("cole.flappy.best") || "0", 10) || 0; } catch (_) {}
  bestEl.textContent = best;

  let state, bird, pipes, score, t, flash;
  function reset() {
    state = "ready";
    bird = { x: 58, y: H / 2, vy: 0, r: 5 };
    pipes = [];
    score = 0;
    t = 0;
    flash = 0;
  }
  reset();

  function spawn(x) {
    const margin = 18;
    const top = margin + Math.random() * (H - GAP - margin * 2);
    pipes.push({ x, top, passed: false });
  }

  function flap() {
    if (state === "over") { if (flash <= 0) reset(); else return; }
    if (state === "ready") { state = "play"; spawn(W + 20); }
    bird.vy = FLAP;
  }

  function die() {
    state = "over";
    flash = 30;
    if (score > best) {
      best = score;
      bestEl.textContent = best;
      try { localStorage.setItem("cole.flappy.best", String(best)); } catch (_) {}
    }
  }

  function update(k) {
    t += k;
    if (flash > 0) flash -= k;
    if (state === "ready") { bird.y = H / 2 + Math.sin(t / 12) * 6; return; }
    if (state === "over") {
      if (bird.y < H - bird.r) { bird.vy += GRAVITY * k; bird.y = Math.min(H - bird.r, bird.y + bird.vy * k); }
      return;
    }
    bird.vy = Math.min(bird.vy + GRAVITY * k, 7);
    bird.y += bird.vy * k;

    for (const p of pipes) p.x -= SPEED * k;
    if (pipes.length && pipes[0].x < -PIPE_W) pipes.shift();
    const last = pipes[pipes.length - 1];
    if (!last || last.x < W - SPACING) spawn(W + 4);

    if (bird.y - bird.r < 0) { bird.y = bird.r; bird.vy = 0; }
    if (bird.y + bird.r >= H) { bird.y = H - bird.r; die(); return; }

    for (const p of pipes) {
      if (!p.passed && p.x + PIPE_W < bird.x - bird.r) { p.passed = true; score++; }
      const inX = bird.x + bird.r > p.x && bird.x - bird.r < p.x + PIPE_W;
      const inGap = bird.y - bird.r > p.top && bird.y + bird.r < p.top + GAP;
      if (inX && !inGap) { die(); return; }
    }
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function draw() {
    ctx.fillStyle = "#0E0E0E";
    ctx.fillRect(0, 0, W, H);

    // scrolling binary backdrop
    ctx.font = "9px 'JetBrains Mono', monospace";
    ctx.fillStyle = "rgba(255,255,255,0.05)";
    const off = (t * 0.4) % 24;
    for (let y = 10; y < H; y += 16) {
      for (let x = -off; x < W; x += 24) {
        const v = ((Math.floor(x + off + t * 0.4) / 24 + y) | 0) % 3 === 0 ? "1" : "0";
        ctx.fillText(v, x, y);
      }
    }

    // pipes
    for (const p of pipes) {
      ctx.fillStyle = PIPE;
      ctx.strokeStyle = PIPE_EDGE;
      roundRect(p.x, -6, PIPE_W, p.top + 6, 4); ctx.fill(); ctx.stroke();
      roundRect(p.x, p.top + GAP, PIPE_W, H - p.top - GAP + 6, 4); ctx.fill(); ctx.stroke();
    }

    // bird: a glowing bit
    const tilt = Math.max(-0.5, Math.min(0.9, bird.vy / 8));
    ctx.save();
    ctx.translate(bird.x, bird.y);
    ctx.rotate(tilt);
    ctx.shadowColor = ACCENT;
    ctx.shadowBlur = 12;
    ctx.fillStyle = state === "over" && flash > 0 && (flash | 0) % 6 < 3 ? INK : ACCENT;
    roundRect(-bird.r - 1, -bird.r, bird.r * 2 + 2, bird.r * 2, 3);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "#0A0A0A";
    ctx.font = "bold 9px 'JetBrains Mono', monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("1", 0, 0.5);
    ctx.restore();

    // HUD
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    if (state === "play" || state === "over") {
      ctx.fillStyle = INK;
      ctx.font = "600 20px 'JetBrains Mono', monospace";
      ctx.fillText(String(score), W / 2, 28);
    }
    if (state === "ready") {
      ctx.fillStyle = MUTED;
      ctx.font = "10px 'JetBrains Mono', monospace";
      ctx.fillText("click / tap / space to flap", W / 2, H - 14);
    }
    if (state === "over") {
      ctx.fillStyle = "rgba(10,10,10,0.6)";
      ctx.fillRect(0, H / 2 - 22, W, 40);
      ctx.fillStyle = ACCENT;
      ctx.font = "600 13px 'JetBrains Mono', monospace";
      ctx.fillText("segfault.", W / 2, H / 2 - 4);
      ctx.fillStyle = MUTED;
      ctx.font = "10px 'JetBrains Mono', monospace";
      ctx.fillText(flash > 0 ? "" : "flap to retry", W / 2, H / 2 + 11);
    }
  }

  let raf = 0, last = 0;
  function loop(now) {
    const k = last ? Math.min((now - last) / (1000 / 60), 3) : 1;
    last = now;
    update(k);
    draw();
    raf = requestAnimationFrame(loop);
  }
  function start() { if (!raf) { last = 0; raf = requestAnimationFrame(loop); } }
  function stop() { cancelAnimationFrame(raf); raf = 0; }

  canvas.addEventListener("pointerdown", (e) => { e.preventDefault(); canvas.focus({ preventScroll: true }); flap(); });
  canvas.addEventListener("keydown", (e) => {
    if (e.code === "Space" || e.code === "ArrowUp" || e.key === "Enter") { e.preventDefault(); flap(); }
  });

  function setOpen(open) {
    root.classList.toggle("closed", !open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Hide game" : "Show game");
    toggle.innerHTML = open ? "&minus;" : "+";
    try { localStorage.setItem("cole.flappy.open", open ? "1" : "0"); } catch (_) {}
    if (open) start(); else stop();
  }
  toggle.addEventListener("click", () => setOpen(root.classList.contains("closed")));
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else if (!root.classList.contains("closed")) start();
  });

  let open = window.innerWidth > 640;
  try { const s = localStorage.getItem("cole.flappy.open"); if (s !== null) open = s === "1"; } catch (_) {}
  setOpen(open);
  draw();
})();

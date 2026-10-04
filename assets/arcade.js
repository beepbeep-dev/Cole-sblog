// Cole's arcade: four tiny canvas games that share one input + render loop.
//   ColeArcade.games.{flappy,snake,g2048,breakout}(ui) -> game object
//   ColeArcade.attach(canvas, game, opts)              -> wires input, sizing and the loop
//   ColeArcade.mount(el)                               -> builds a full game card from <div data-game="...">
window.ColeArcade = (() => {
  const C = {
    bg: "#0E0E0E", surface: "#161616", cell: "#1C1C1C", line: "#2A2A2A", edge: "#3A3A3A",
    accent: "#C8FF4D", ink: "#F2F2EE", muted: "#9B9B95", danger: "#FF6B6B",
  };
  const FONT = "'JetBrains Mono', ui-monospace, Menlo, monospace";

  // ---------- helpers ----------
  function store(key) {
    return {
      get() { try { return parseInt(localStorage.getItem(key) || "0", 10) || 0; } catch (_) { return 0; } },
      set(v) { try { localStorage.setItem(key, String(v)); } catch (_) {} },
    };
  }
  function rr(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
  function text(ctx, s, x, y, o = {}) {
    ctx.font = `${o.weight || 500} ${o.size || 12}px ${FONT}`;
    ctx.fillStyle = o.color || C.ink;
    ctx.textAlign = o.align || "center";
    ctx.textBaseline = o.base || "middle";
    ctx.fillText(s, x, y);
  }
  function banner(ctx, W, H, title, sub, color) {
    ctx.fillStyle = "rgba(10,10,10,0.72)";
    ctx.fillRect(0, H / 2 - 26, W, 50);
    text(ctx, title, W / 2, H / 2 - 7, { size: 14, weight: 600, color: color || C.accent });
    if (sub) text(ctx, sub, W / 2, H / 2 + 12, { size: 10, color: C.muted });
  }
  function glowRect(ctx, x, y, w, h, r, color, blur) {
    ctx.save();
    ctx.shadowColor = color;
    ctx.shadowBlur = blur;
    ctx.fillStyle = color;
    rr(ctx, x, y, w, h, r);
    ctx.fill();
    ctx.restore();
  }
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);

  // =====================================================================
  // FLAPPY BIT — flap a glowing bit through the pipes
  // =====================================================================
  function flappy(ui) {
    const W = 240, H = 160;
    const GRAVITY = 0.32, FLAP = -4.6, SPEED = 1.5, GAP = 54, PIPE_W = 24, SPACING = 104;
    const best = store("cole.flappy.best");
    let state, bird, pipes, score, t, flash;

    function reset() {
      state = "ready"; bird = { x: 58, y: H / 2, vy: 0, r: 5 };
      pipes = []; score = 0; t = 0; flash = 0;
      ui.score(0);
    }
    function spawn(x) {
      const m = 18;
      pipes.push({ x, top: m + Math.random() * (H - GAP - m * 2), passed: false });
    }
    function flap() {
      if (state === "over") { if (flash <= 0) reset(); else return; }
      if (state === "ready") { state = "play"; spawn(W + 20); }
      bird.vy = FLAP;
    }
    function die() {
      state = "over"; flash = 30;
      if (score > best.get()) { best.set(score); ui.best(score); }
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
        if (!p.passed && p.x + PIPE_W < bird.x - bird.r) { p.passed = true; score++; ui.score(score); }
        const inX = bird.x + bird.r > p.x && bird.x - bird.r < p.x + PIPE_W;
        const inGap = bird.y - bird.r > p.top && bird.y + bird.r < p.top + GAP;
        if (inX && !inGap) { die(); return; }
      }
    }
    function draw(ctx) {
      ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
      ctx.font = `9px ${FONT}`; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      ctx.fillStyle = "rgba(255,255,255,0.05)";
      const off = (t * 0.4) % 24;
      for (let y = 10, row = 0; y < H; y += 16, row++) {
        for (let x = -off, col = Math.floor(t * 0.4 / 24); x < W; x += 24, col++) {
          ctx.fillText((col * 7 + row * 3) % 5 < 2 ? "1" : "0", x, y);
        }
      }
      for (const p of pipes) {
        ctx.fillStyle = C.line; ctx.strokeStyle = C.edge;
        rr(ctx, p.x, -6, PIPE_W, p.top + 6, 4); ctx.fill(); ctx.stroke();
        rr(ctx, p.x, p.top + GAP, PIPE_W, H - p.top - GAP + 6, 4); ctx.fill(); ctx.stroke();
      }
      ctx.save();
      ctx.translate(bird.x, bird.y);
      ctx.rotate(Math.max(-0.5, Math.min(0.9, bird.vy / 8)));
      const blink = state === "over" && flash > 0 && (flash | 0) % 6 < 3;
      glowRect(ctx, -bird.r - 1, -bird.r, bird.r * 2 + 2, bird.r * 2, 3, blink ? C.ink : C.accent, 12);
      text(ctx, "1", 0, 0.5, { size: 9, weight: 700, color: "#0A0A0A" });
      ctx.restore();
      if (state !== "ready") text(ctx, String(score), W / 2, 22, { size: 20, weight: 600 });
      if (state === "ready") text(ctx, "click / tap / space to flap", W / 2, H - 14, { size: 10, color: C.muted });
      if (state === "over") banner(ctx, W, H, "segfault.", flash > 0 ? "" : "flap to retry");
    }
    function key(action, down) { if (down && (action === "primary" || action === "up")) flap(); }

    ui.best(best.get());
    reset();
    return { W, H, update, draw, key, reset, tapOnDown: true };
  }

  // =====================================================================
  // BYTE SNAKE — eat bits, grow, don't bite yourself
  // =====================================================================
  function snake(ui) {
    const W = 400, H = 280, S = 20, COLS = W / S, ROWS = H / S;
    const best = store("cole.snake.best");
    const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    let state, body, dir, queue, food, score, acc, t, flash;

    function reset() {
      state = "ready"; t = 0; acc = 0; score = 0; flash = 0;
      body = [{ x: 6, y: 7 }, { x: 5, y: 7 }, { x: 4, y: 7 }];
      dir = "right"; queue = [];
      placeFood();
      ui.score(0);
    }
    function placeFood() {
      do { food = { x: (Math.random() * COLS) | 0, y: (Math.random() * ROWS) | 0, born: t }; }
      while (body.some((b) => b.x === food.x && b.y === food.y));
    }
    const speed = () => Math.max(55, 120 - score * 3);
    function step() {
      if (queue.length) dir = queue.shift();
      const [dx, dy] = DIRS[dir];
      const head = { x: body[0].x + dx, y: body[0].y + dy };
      const eating = head.x === food.x && head.y === food.y;
      const hitsSelf = body.slice(0, eating ? body.length : body.length - 1).some((b) => b.x === head.x && b.y === head.y);
      if (head.x < 0 || head.y < 0 || head.x >= COLS || head.y >= ROWS || hitsSelf) {
        state = "over"; flash = 24;
        if (score > best.get()) { best.set(score); ui.best(score); }
        return;
      }
      body.unshift(head);
      if (eating) { score++; ui.score(score); placeFood(); }
      else body.pop();
    }
    function update(k) {
      t += k;
      if (flash > 0) flash -= k;
      if (state !== "play") return;
      acc += k * 16.67;
      while (acc >= speed() && state === "play") { acc -= speed(); step(); }
    }
    function draw(ctx) {
      ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "rgba(255,255,255,0.05)";
      for (let x = 0; x < COLS; x++) for (let y = 0; y < ROWS; y++) ctx.fillRect(x * S + S / 2 - 1, y * S + S / 2 - 1, 2, 2);
      // food: a pulsing bit
      const pulse = 1 + Math.sin(t / 6) * 0.08;
      const fs = (S - 6) * pulse;
      glowRect(ctx, food.x * S + (S - fs) / 2, food.y * S + (S - fs) / 2, fs, fs, 4, C.accent, 16);
      text(ctx, "1", food.x * S + S / 2, food.y * S + S / 2 + 0.5, { size: 11, weight: 700, color: "#0A0A0A" });
      // snake
      const dead = state === "over" && flash > 0 && (flash | 0) % 6 < 3;
      body.forEach((b, i) => {
        const a = Math.max(0.25, 1 - i / (body.length + 6));
        ctx.fillStyle = dead ? C.danger : `rgba(200,255,77,${a})`;
        rr(ctx, b.x * S + 2, b.y * S + 2, S - 4, S - 4, i === 0 ? 6 : 4);
        ctx.fill();
      });
      const h = body[0], [dx, dy] = DIRS[dir];
      ctx.fillStyle = "#0A0A0A";
      for (const side of [-1, 1]) {
        const ex = h.x * S + S / 2 + dx * 3 + (dy !== 0 ? side * 4 : 0);
        const ey = h.y * S + S / 2 + dy * 3 + (dx !== 0 ? side * 4 : 0);
        ctx.beginPath(); ctx.arc(ex, ey, 1.8, 0, Math.PI * 2); ctx.fill();
      }
      if (state === "ready") banner(ctx, W, H, "byte_snake", "arrows / WASD / swipe to start");
      if (state === "over") banner(ctx, W, H, "stack overflow.", flash > 0 ? "" : "length " + body.length + " · press any direction to retry", C.danger);
    }
    function key(action, down) {
      if (!down) return;
      if (state === "over") { if (flash <= 0 && (DIRS[action] || action === "primary")) { reset(); } else return; }
      if (state === "ready") { if (DIRS[action] || action === "primary") state = "play"; else return; }
      if (!DIRS[action]) return;
      const last = queue.length ? queue[queue.length - 1] : dir;
      const [lx, ly] = DIRS[last], [nx, ny] = DIRS[action];
      if (lx + nx === 0 && ly + ny === 0) return; // no reversing into yourself
      if (action !== last && queue.length < 2) queue.push(action);
    }
    ui.best(best.get());
    reset();
    return { W, H, update, draw, key, reset, swipe: true };
  }

  // =====================================================================
  // 2048 — merge powers of two (every tile shows its 2^n)
  // =====================================================================
  function g2048(ui) {
    const W = 320, H = 320, N = 4, GAP = 10, CELL = (W - GAP * (N + 1)) / N;
    const best = store("cole.2048.best");
    const VEC = { up: [-1, 0], right: [0, 1], down: [1, 0], left: [0, -1] };
    let grid, score, anim, state, won, t;

    const pos = (i) => GAP + i * (CELL + GAP);
    const empty = () => Array.from({ length: N }, () => Array(N).fill(0));
    function addRandom() {
      const free = [];
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!grid[r][c]) free.push([r, c]);
      if (!free.length) return null;
      const [r, c] = free[(Math.random() * free.length) | 0];
      grid[r][c] = Math.random() < 0.9 ? 2 : 4;
      return [r, c];
    }
    function reset() {
      grid = empty(); score = 0; state = "play"; won = false; t = 0;
      const a = addRandom(), b = addRandom();
      anim = { t: 1, slides: [], pops: [], born: [a, b] , p: 0 };
      ui.score(0);
    }
    function canMove() {
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        const v = grid[r][c];
        if (!v) return true;
        if (c + 1 < N && grid[r][c + 1] === v) return true;
        if (r + 1 < N && grid[r + 1][c] === v) return true;
      }
      return false;
    }
    function move(dirName) {
      const [dr, dc] = VEC[dirName];
      const rows = [...Array(N).keys()], cols = [...Array(N).keys()];
      if (dr === 1) rows.reverse();
      if (dc === 1) cols.reverse();
      const next = empty(), merged = empty(), slides = [], pops = [];
      let moved = false, gained = 0;
      const inB = (r, c) => r >= 0 && c >= 0 && r < N && c < N;
      for (const r of rows) for (const c of cols) {
        const v = grid[r][c];
        if (!v) continue;
        let nr = r, nc = c;
        while (inB(nr + dr, nc + dc) && !next[nr + dr][nc + dc]) { nr += dr; nc += dc; }
        const fr = nr + dr, fc = nc + dc;
        if (inB(fr, fc) && next[fr][fc] === v && !merged[fr][fc]) {
          next[fr][fc] = v * 2; merged[fr][fc] = 1; gained += v * 2;
          slides.push({ v, fr: r, fc: c, tr: fr, tc: fc });
          pops.push([fr, fc]);
          moved = true;
          if (v * 2 === 2048 && !won) { won = true; state = "won"; }
        } else {
          next[nr][nc] = v;
          slides.push({ v, fr: r, fc: c, tr: nr, tc: nc });
          if (nr !== r || nc !== c) moved = true;
        }
      }
      if (!moved) return;
      grid = next;
      score += gained;
      ui.score(score);
      if (score > best.get()) { best.set(score); ui.best(score); }
      const born = addRandom();
      anim = { t: 0, slides, pops, born: [born], p: 0 };
      if (!canMove()) state = "over";
    }
    function update(k) {
      t += k;
      if (anim.t < 1) anim.t = Math.min(1, anim.t + k / 7);
      else if (anim.p < 1) anim.p = Math.min(1, anim.p + k / 9);
    }
    function tileColor(v) {
      const lvl = Math.log2(v); // 1..11+
      const f = Math.min(1, (lvl - 1) / 10);
      const r = Math.round(lerp(0x24, 0xC8, f)), g = Math.round(lerp(0x24, 0xFF, f)), b = Math.round(lerp(0x24, 0x4D, f));
      return { fill: `rgb(${r},${g},${b})`, ink: f > 0.45 ? "#0A0A0A" : C.ink, sub: f > 0.45 ? "rgba(10,10,10,0.55)" : C.muted, glow: f > 0.7 };
    }
    function drawTile(ctx, v, x, y, scale) {
      const s = CELL * scale, ox = x + (CELL - s) / 2, oy = y + (CELL - s) / 2;
      const col = tileColor(v);
      if (col.glow) glowRect(ctx, ox, oy, s, s, 8, col.fill, 18);
      ctx.fillStyle = col.fill; rr(ctx, ox, oy, s, s, 8); ctx.fill();
      const digits = String(v).length;
      const size = (digits <= 2 ? 26 : digits === 3 ? 22 : 17) * scale;
      text(ctx, String(v), x + CELL / 2, y + CELL / 2 - 4 * scale, { size, weight: 700, color: col.ink });
      text(ctx, "2^" + Math.log2(v), x + CELL / 2, y + CELL - 11 * scale, { size: 9 * scale, color: col.sub });
    }
    function draw(ctx) {
      ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
      for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
        ctx.fillStyle = C.cell; rr(ctx, pos(c), pos(r), CELL, CELL, 8); ctx.fill();
      }
      if (anim.t < 1) {
        const e = easeOut(anim.t);
        for (const s of anim.slides) drawTile(ctx, s.v, lerp(pos(s.fc), pos(s.tc), e), lerp(pos(s.fr), pos(s.tr), e), 1);
      } else {
        const isPop = (r, c) => anim.pops.some(([pr, pc]) => pr === r && pc === c);
        const isBorn = (r, c) => anim.born.some((b) => b && b[0] === r && b[1] === c);
        for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
          const v = grid[r][c];
          if (!v) continue;
          let scale = 1;
          if (isBorn(r, c)) scale = easeOut(anim.p);
          else if (isPop(r, c)) scale = 1 + Math.sin(anim.p * Math.PI) * 0.12;
          if (scale > 0.01) drawTile(ctx, v, pos(c), pos(r), scale);
        }
      }
      if (state === "won") banner(ctx, W, H, "2^11. you win.", "keep going: any arrow / swipe");
      if (state === "over") banner(ctx, W, H, "no moves left.", "score " + score + " · tap or space for a new game", C.danger);
    }
    function key(action, down) {
      if (!down) return;
      if (state === "over") { if (action === "primary") reset(); return; }
      if (state === "won" && VEC[action]) state = "play";
      if (VEC[action] && anim.t >= 1) move(action);
    }
    ui.best(best.get());
    reset();
    return { W, H, update, draw, key, reset, swipe: true };
  }

  // =====================================================================
  // BIT BREAKER — breakout with a byte-shaped wall
  // =====================================================================
  function breakout(ui) {
    const W = 360, H = 260, COLS = 8, ROWS = 5, PAD_W = 58, PAD_H = 8, R = 4;
    const BW = (W - 24 - (COLS - 1) * 4) / COLS, BH = 13, TOP = 34;
    const best = store("cole.breakout.best");
    let state, bricks, ball, pad, score, lives, level, held, flash, t, target;

    function build() {
      bricks = [];
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        // each row spells a byte; 0-bits are empty space on later levels for variety
        bricks.push({ x: 12 + c * (BW + 4), y: TOP + r * (BH + 5), r, alive: true });
      }
    }
    function serve() {
      state = state === "over" ? "over" : "ready";
      ball = { x: pad.x, y: H - 22 - R, vx: 0, vy: 0 };
    }
    function reset() {
      score = 0; lives = 3; level = 1; flash = 0; t = 0; held = {}; target = null;
      pad = { x: W / 2 };
      build();
      state = "ready";
      serve();
      ui.score(0);
    }
    const speed = () => 3.1 * (1 + 0.1 * (level - 1));
    function launch() {
      if (state === "over") { if (flash <= 0) reset(); return; }
      if (state !== "ready") return;
      state = "play";
      const a = (Math.random() * 0.6 - 0.3);
      ball.vx = speed() * Math.sin(a); ball.vy = -speed() * Math.cos(a);
    }
    function update(k) {
      t += k;
      if (flash > 0) flash -= k;
      // paddle
      if (held.left) pad.x -= 6 * k;
      if (held.right) pad.x += 6 * k;
      if (target != null) pad.x += (target - pad.x) * Math.min(1, 0.35 * k);
      pad.x = Math.max(PAD_W / 2 + 4, Math.min(W - PAD_W / 2 - 4, pad.x));
      if (state === "ready") { ball.x = pad.x; ball.y = H - 22 - R; return; }
      if (state !== "play") return;
      const steps = Math.ceil((Math.hypot(ball.vx, ball.vy) * k) / 2.5);
      for (let i = 0; i < steps && state === "play"; i++) sub(k / steps);
    }
    function sub(k) {
      ball.x += ball.vx * k; ball.y += ball.vy * k;
      if (ball.x < R) { ball.x = R; ball.vx = Math.abs(ball.vx); }
      if (ball.x > W - R) { ball.x = W - R; ball.vx = -Math.abs(ball.vx); }
      if (ball.y < R) { ball.y = R; ball.vy = Math.abs(ball.vy); }
      // paddle
      const py = H - 18;
      if (ball.vy > 0 && ball.y + R >= py && ball.y + R <= py + PAD_H + 4 && Math.abs(ball.x - pad.x) <= PAD_W / 2 + R) {
        const off = (ball.x - pad.x) / (PAD_W / 2); // -1..1
        const a = off * 1.05, s = speed();
        ball.vx = s * Math.sin(a); ball.vy = -s * Math.cos(a);
        ball.y = py - R;
      }
      if (ball.y > H + 10) {
        lives--; flash = 20;
        if (lives <= 0) {
          state = "over";
          if (score > best.get()) { best.set(score); ui.best(score); }
        } else state = "ready";
        serve();
        return;
      }
      // bricks
      for (const b of bricks) {
        if (!b.alive) continue;
        const cx = Math.max(b.x, Math.min(ball.x, b.x + BW)), cy = Math.max(b.y, Math.min(ball.y, b.y + BH));
        const dx = ball.x - cx, dy = ball.y - cy;
        if (dx * dx + dy * dy > R * R) continue;
        b.alive = false;
        score += (ROWS - b.r) * 10; ui.score(score);
        if (score > best.get()) { best.set(score); ui.best(score); }
        const overlapX = Math.min(ball.x + R - b.x, b.x + BW - (ball.x - R));
        const overlapY = Math.min(ball.y + R - b.y, b.y + BH - (ball.y - R));
        if (overlapX < overlapY) ball.vx = -ball.vx; else ball.vy = -ball.vy;
        break;
      }
      if (bricks.every((b) => !b.alive)) { level++; build(); state = "ready"; serve(); flash = -40; }
    }
    function draw(ctx) {
      ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
      for (const b of bricks) {
        if (!b.alive) continue;
        const a = 1 - b.r * 0.15;
        ctx.fillStyle = `rgba(200,255,77,${a})`;
        rr(ctx, b.x, b.y, BW, BH, 3); ctx.fill();
        text(ctx, b.r % 2 ? "0" : "1", b.x + BW / 2, b.y + BH / 2 + 0.5, { size: 8, weight: 700, color: "rgba(10,10,10,0.5)" });
      }
      // HUD
      text(ctx, "LVL " + level, 12, 15, { size: 10, color: C.muted, align: "left" });
      for (let i = 0; i < lives; i++) { ctx.fillStyle = C.accent; ctx.beginPath(); ctx.arc(W - 14 - i * 12, 15, 3.5, 0, Math.PI * 2); ctx.fill(); }
      // paddle + ball
      const hurt = flash > 0 && (flash | 0) % 6 < 3;
      ctx.fillStyle = hurt ? C.danger : C.ink;
      rr(ctx, pad.x - PAD_W / 2, H - 18, PAD_W, PAD_H, 4); ctx.fill();
      glowRect(ctx, ball.x - R, ball.y - R, R * 2, R * 2, R, C.accent, 14);
      if (state === "ready") text(ctx, flash < 0 ? "level " + level + " · tap / space to launch" : "tap / space to launch", W / 2, H - 46, { size: 10, color: C.muted });
      if (state === "over") banner(ctx, W, H, "out of lives.", flash > 0 ? "" : "score " + score + " · tap / space to retry", C.danger);
    }
    function key(action, down) {
      if (action === "left" || action === "right") { held[action] = down; target = null; }
      if (down && (action === "primary" || action === "up")) launch();
    }
    function pointer(type, x) {
      if (type === "move" || type === "down") target = x;
    }
    ui.best(best.get());
    reset();
    return { W, H, update, draw, key, pointer, reset, tapOnDown: true, trackHover: true };
  }

  // =====================================================================
  // shared wiring: sizing, input, loop
  // =====================================================================
  const KEYMAP = {
    ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
    KeyW: "up", KeyS: "down", KeyA: "left", KeyD: "right",
    Space: "primary", Enter: "primary",
  };

  function attach(canvas, game, opts = {}) {
    const ctx = canvas.getContext("2d");
    canvas.tabIndex = 0;
    canvas.style.aspectRatio = game.W + " / " + game.H;

    function fit() {
      const w = canvas.clientWidth || game.W;
      const dpr = Math.min(window.devicePixelRatio || 1, 3);
      const s = (w * dpr) / game.W;
      canvas.width = Math.round(game.W * s);
      canvas.height = Math.round(game.H * s);
      ctx.setTransform(s, 0, 0, s, 0, 0);
      game.draw(ctx);
    }
    fit();
    if ("ResizeObserver" in window) new ResizeObserver(fit).observe(canvas);

    // keyboard: only while the game has focus, so arrow keys still scroll the page otherwise
    canvas.addEventListener("keydown", (e) => {
      const a = KEYMAP[e.code];
      if (!a) return;
      e.preventDefault();
      if (!e.repeat || a === "left" || a === "right") game.key(a, true);
    });
    canvas.addEventListener("keyup", (e) => { const a = KEYMAP[e.code]; if (a) game.key(a, false); });
    canvas.addEventListener("blur", () => ["left", "right", "up", "down"].forEach((a) => game.key(a, false)));

    // pointer: taps, swipes and paddle tracking
    const logical = (e) => {
      const r = canvas.getBoundingClientRect();
      return [((e.clientX - r.left) / r.width) * game.W, ((e.clientY - r.top) / r.height) * game.H];
    };
    let start = null;
    canvas.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      canvas.focus({ preventScroll: true, focusVisible: false });
      start = { x: e.clientX, y: e.clientY };
      try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
      if (game.pointer) game.pointer("down", ...logical(e));
      if (game.tapOnDown) { game.key("primary", true); game.key("primary", false); }
    });
    canvas.addEventListener("pointermove", (e) => {
      if (game.pointer && (start || (game.trackHover && e.pointerType === "mouse"))) game.pointer("move", ...logical(e));
    });
    const end = (e) => {
      if (!start) return;
      const dx = e.clientX - start.x, dy = e.clientY - start.y;
      start = null;
      if (!game.swipe) return;
      if (Math.max(Math.abs(dx), Math.abs(dy)) > 24) {
        const dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
        game.key(dir, true); game.key(dir, false);
      } else { game.key("primary", true); game.key("primary", false); }
    };
    canvas.addEventListener("pointerup", end);
    canvas.addEventListener("pointercancel", () => (start = null));

    // loop: runs only while visible on screen (and while opts.active() says so)
    let raf = 0, last = 0, onScreen = true;
    const active = () => onScreen && !document.hidden && (!opts.active || opts.active());
    function frame(now) {
      const k = last ? Math.min((now - last) / (1000 / 60), 3) : 1;
      last = now;
      game.update(k);
      game.draw(ctx);
      raf = requestAnimationFrame(frame);
    }
    function sync() {
      if (active() && !raf) { last = 0; raf = requestAnimationFrame(frame); }
      else if (!active() && raf) { cancelAnimationFrame(raf); raf = 0; }
    }
    if ("IntersectionObserver" in window) {
      new IntersectionObserver((es) => { onScreen = es[0].isIntersecting; sync(); }).observe(canvas);
    }
    document.addEventListener("visibilitychange", sync);
    sync();
    return { sync, fit, game };
  }

  const games = { flappy, snake, g2048, breakout };
  const INFO = {
    flappy: { name: "flappy_bit", hint: "Click, tap or space to flap." },
    snake: { name: "byte_snake", hint: "Arrows, WASD or swipe." },
    g2048: { name: "2048", hint: "Arrows, WASD or swipe. Every tile is a power of two." },
    breakout: { name: "bit_breaker", hint: "Move the mouse, drag, or use arrows. Tap / space to launch." },
  };

  // builds a full card: header (name, score, best, restart) + canvas + hint
  function mount(el) {
    const id = el.dataset.game, info = INFO[id];
    if (!games[id]) return;
    el.classList.add("arcade-card");
    el.innerHTML =
      `<div class="arcade-head"><b>${info.name}</b>` +
      `<span class="arcade-stats"><span>score <em data-score>0</em></span><span>best <em data-best>0</em></span>` +
      `<button class="arcade-reset" type="button" aria-label="Restart ${info.name}">&#8635;</button></span></div>` +
      `<canvas aria-label="${info.name} game. ${info.hint}"></canvas>` +
      `<p class="arcade-hint">${info.hint} <span class="arcade-focus">Click the game first to use the keyboard.</span></p>`;
    const sc = el.querySelector("[data-score]"), be = el.querySelector("[data-best]");
    const game = games[id]({ score: (n) => (sc.textContent = n), best: (n) => (be.textContent = n) });
    const ctrl = attach(el.querySelector("canvas"), game);
    el.querySelector(".arcade-reset").addEventListener("click", () => { game.reset(); el.querySelector("canvas").focus({ preventScroll: true }); });
    return ctrl;
  }

  return { games, attach, mount, colors: C };
})();

// Cole's arcade: four tiny canvas games that share one input + render loop.
//   ColeArcade.games.{flappy,snake,g2048,breakout}(ui) -> game object
//   ColeArcade.attach(canvas, game, opts)              -> wires input, sizing and the loop
//   ColeArcade.mount(el)                               -> builds a full game card from <div data-game="...">
window.ColeArcade = (() => {
  const C = {
    bg: "#0E0E0E", surface: "#161616", cell: "#1C1C1C", line: "#2A2A2A", edge: "#3A3A3A",
    accent: "#C8FF4D", ink: "#F2F2EE", muted: "#9B9B95", danger: "#FF6B8A",
    blue: "#5B8CFF", purple: "#A66BFF",
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
      ctx.fillStyle = "rgba(140,150,255,0.07)";
      const off = (t * 0.4) % 24;
      for (let y = 10, row = 0; y < H; y += 16, row++) {
        for (let x = -off, col = Math.floor(t * 0.4 / 24); x < W; x += 24, col++) {
          ctx.fillText((col * 7 + row * 3) % 5 < 2 ? "1" : "0", x, y);
        }
      }
      for (const p of pipes) {
        const pg = ctx.createLinearGradient(p.x, 0, p.x + PIPE_W, 0);
        pg.addColorStop(0, "#241C3F"); pg.addColorStop(1, "#1A2240");
        ctx.fillStyle = pg; ctx.strokeStyle = "#4A3A80";
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
        const f = body.length > 1 ? i / (body.length - 1) : 0;
        const a = Math.max(0.35, 1 - i / (body.length + 8));
        ctx.fillStyle = dead ? C.danger : `rgba(${Math.round(lerp(176, 91, f))},${Math.round(lerp(120, 140, f))},255,${a})`;
        if (i === 0 && !dead) { ctx.save(); ctx.shadowColor = C.purple; ctx.shadowBlur = 14; }
        rr(ctx, b.x * S + 2, b.y * S + 2, S - 4, S - 4, i === 0 ? 6 : 4);
        ctx.fill();
        if (i === 0 && !dead) ctx.restore();
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
    // dark blue -> blue -> purple -> lime as the numbers grow
    const RAMP = ["#22263A", "#28325C", "#2E4485", "#3A58B8", "#5B8CFF", "#7B78FF", "#9466FF", "#A66BFF", "#B98AFF", "#9BE36A", "#C8FF4D"];
    function tileColor(v) {
      const lvl = Math.min(RAMP.length, Math.log2(v)); // 1..11
      const fill = RAMP[lvl - 1];
      const dark = lvl >= 10;
      return { fill, ink: dark ? "#0A0A0A" : C.ink, sub: dark ? "rgba(10,10,10,0.55)" : "rgba(242,242,238,0.6)", glow: lvl >= 5 };
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
        ctx.fillStyle = ["#C8FF4D", "#8FB0FF", "#5B8CFF", "#A66BFF", "#7E52D9"][b.r];
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
    Space: "primary", Enter: "primary", KeyF: "flag",
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
      if (game.pointer) game.pointer("down", ...logical(e), e.button);
      if (game.tapOnDown) { game.key("primary", true); game.key("primary", false); }
    });
    canvas.addEventListener("pointermove", (e) => {
      if (game.pointer && (start || (game.trackHover && e.pointerType === "mouse"))) game.pointer("move", ...logical(e));
    });
    const end = (e) => {
      if (!start) return;
      if (game.pointer) game.pointer("up", ...logical(e));
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
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());

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

  // =====================================================================
  // BYTE STACK — falling blocks; clear full rows
  // =====================================================================
  function stack(ui) {
    const COLS = 10, ROWS = 20, S = 14, BW = COLS * S, W = BW + 96, H = ROWS * S;
    const best = store("cole.stack.best");
    const SHAPES = {
      I: [[0, 1], [1, 1], [2, 1], [3, 1]], O: [[1, 0], [2, 0], [1, 1], [2, 1]], T: [[1, 0], [0, 1], [1, 1], [2, 1]],
      S: [[1, 0], [2, 0], [0, 1], [1, 1]], Z: [[0, 0], [1, 0], [1, 1], [2, 1]], J: [[0, 0], [0, 1], [1, 1], [2, 1]], L: [[2, 0], [0, 1], [1, 1], [2, 1]],
    };
    const COLORS = { I: "#5B8CFF", O: "#C8FF4D", T: "#A66BFF", S: "#8FB0FF", Z: "#B98AFF", J: "#3A58B8", L: "#9BE36A" };
    let grid, piece, next, state, score, lines, acc, t, flash, bag;

    const level = () => Math.floor(lines / 10) + 1;
    const interval = () => Math.max(90, 650 - (level() - 1) * 60);
    function draw7() {
      if (!bag || !bag.length) { bag = Object.keys(SHAPES); for (let i = bag.length - 1; i > 0; i--) { const j = (Math.random() * (i + 1)) | 0; [bag[i], bag[j]] = [bag[j], bag[i]]; } }
      return bag.pop();
    }
    const make = (k) => ({ k, cells: SHAPES[k].map((c) => c.slice()), x: 3, y: k === "I" ? -1 : 0 });
    const fits = (cells, x, y) => cells.every(([cx, cy]) => {
      const gx = cx + x, gy = cy + y;
      return gx >= 0 && gx < COLS && gy < ROWS && (gy < 0 || !grid[gy][gx]);
    });
    function reset() {
      grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
      bag = null; next = draw7(); piece = make(draw7());
      state = "ready"; score = 0; lines = 0; acc = 0; t = 0; flash = 0;
      ui.score(0);
    }
    function spawn() {
      piece = make(next); next = draw7();
      if (!fits(piece.cells, piece.x, piece.y)) {
        state = "over"; flash = 24;
        if (score > best.get()) { best.set(score); ui.best(score); }
      }
    }
    function lock() {
      for (const [cx, cy] of piece.cells) { const gy = cy + piece.y; if (gy < 0) { state = "over"; flash = 24; break; } grid[gy][cx + piece.x] = COLORS[piece.k]; }
      if (state === "over") { if (score > best.get()) { best.set(score); ui.best(score); } return; }
      let cleared = 0;
      for (let r = ROWS - 1; r >= 0; r--) {
        if (grid[r].every(Boolean)) { grid.splice(r, 1); grid.unshift(Array(COLS).fill(null)); cleared++; r++; }
      }
      if (cleared) { score += [0, 40, 100, 300, 1200][cleared] * level(); lines += cleared; ui.score(score); if (score > best.get()) { best.set(score); ui.best(score); } }
      spawn();
    }
    function move(dx, dy) {
      if (fits(piece.cells, piece.x + dx, piece.y + dy)) { piece.x += dx; piece.y += dy; return true; }
      return false;
    }
    function rotate() {
      if (piece.k === "O") return;
      const r = piece.cells.map(([x, y]) => [2 - y, x]);
      for (const kick of [0, -1, 1, -2, 2]) if (fits(r, piece.x + kick, piece.y)) { piece.cells = r; piece.x += kick; return; }
    }
    function hardDrop() { while (move(0, 1)) score += 1; ui.score(score); lock(); acc = 0; }
    function update(k) {
      t += k; if (flash > 0) flash -= k;
      if (state !== "play") return;
      acc += k * 16.67;
      while (acc >= interval() && state === "play") { acc -= interval(); if (!move(0, 1)) lock(); }
    }
    function cell(ctx, x, y, color, a) {
      ctx.globalAlpha = a == null ? 1 : a;
      ctx.fillStyle = color; rr(ctx, x * S + 1, y * S + 1, S - 2, S - 2, 3); ctx.fill();
      ctx.globalAlpha = 1;
    }
    function draw(ctx) {
      ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "rgba(140,150,255,0.05)";
      for (let x = 0; x < COLS; x++) for (let y = 0; y < ROWS; y++) ctx.fillRect(x * S + S / 2 - 1, y * S + S / 2 - 1, 2, 2);
      for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (grid[y][x]) cell(ctx, x, y, grid[y][x]);
      if (state !== "over") {
        // ghost
        let gy = piece.y; while (fits(piece.cells, piece.x, gy + 1)) gy++;
        for (const [cx, cy] of piece.cells) if (cy + gy >= 0) cell(ctx, cx + piece.x, cy + gy, COLORS[piece.k], 0.18);
        for (const [cx, cy] of piece.cells) if (cy + piece.y >= 0) cell(ctx, cx + piece.x, cy + piece.y, COLORS[piece.k]);
      }
      ctx.fillStyle = C.line; ctx.fillRect(BW, 0, 1, H);
      const px = BW + 48;
      text(ctx, "NEXT", px, 18, { size: 9, color: C.muted });
      ctx.save(); ctx.translate(BW + 20, 30);
      for (const [cx, cy] of SHAPES[next]) { ctx.fillStyle = COLORS[next]; rr(ctx, cx * 13, cy * 13, 12, 12, 3); ctx.fill(); }
      ctx.restore();
      text(ctx, "LINES", px, 90, { size: 9, color: C.muted }); text(ctx, String(lines), px, 106, { size: 16, weight: 600 });
      text(ctx, "LEVEL", px, 136, { size: 9, color: C.muted }); text(ctx, String(level()), px, 152, { size: 16, weight: 600, color: C.purple });
      if (state === "ready") banner(ctx, BW, H, "byte_stack", "tap / any key to start");
      if (state === "over") banner(ctx, BW, H, "stack overflow.", flash > 0 ? "" : "tap / space to retry", C.danger);
    }
    function key(action, down) {
      if (!down) return;
      if (state === "over") { if (flash <= 0 && action === "primary") reset(); return; }
      if (state === "ready") { state = "play"; return; }
      if (action === "left") move(-1, 0);
      else if (action === "right") move(1, 0);
      else if (action === "up" || action === "primary") rotate();
      else if (action === "down") hardDrop();
    }
    ui.best(best.get());
    reset();
    return { W, H, update, draw, key, reset, swipe: true };
  }

  // =====================================================================
  // BIT SWEEPER — minesweeper; the mines are bugs
  // =====================================================================
  function sweeper(ui) {
    const N = 9, MINES = 10, S = 30, TOP = 30, W = N * S, H = N * S + TOP;
    const best = store("cole.sweeper.best"); // fastest win, in seconds (0 = none yet)
    let mines, open, flags, counts, state, started, t, cur, down, elapsed;

    function reset() {
      mines = null; open = new Set(); flags = new Set(); counts = [];
      state = "play"; started = false; t = 0; elapsed = 0; cur = [4, 4]; down = null;
      ui.score(0);
    }
    const id = (x, y) => y * N + x;
    const around = (x, y) => {
      const out = [];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if ((dx || dy) && nx >= 0 && ny >= 0 && nx < N && ny < N) out.push([nx, ny]);
      }
      return out;
    };
    function plant(sx, sy) {
      mines = new Set();
      const safe = new Set([id(sx, sy), ...around(sx, sy).map(([x, y]) => id(x, y))]);
      while (mines.size < MINES) { const c = (Math.random() * N * N) | 0; if (!safe.has(c)) mines.add(c); }
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) counts[id(x, y)] = around(x, y).filter(([a, b]) => mines.has(id(a, b))).length;
      started = true;
    }
    function reveal(x, y) {
      if (state !== "play" || flags.has(id(x, y)) || open.has(id(x, y))) return;
      if (!mines) plant(x, y);
      if (mines.has(id(x, y))) { state = "lost"; open.add(id(x, y)); return; }
      const stack = [[x, y]];
      while (stack.length) {
        const [cx, cy] = stack.pop(), c = id(cx, cy);
        if (open.has(c) || flags.has(c)) continue;
        open.add(c);
        if (counts[c] === 0) stack.push(...around(cx, cy));
      }
      if (open.size === N * N - MINES) {
        state = "won";
        const secs = Math.max(1, Math.round(elapsed));
        if (!best.get() || secs < best.get()) { best.set(secs); ui.best(secs + "s"); }
      }
    }
    function flag(x, y) {
      if (state !== "play" || open.has(id(x, y))) return;
      const c = id(x, y);
      flags.has(c) ? flags.delete(c) : flags.add(c);
    }
    function update(k) {
      t += k;
      if (state === "play" && started) { elapsed += k / 60; ui.score(Math.floor(elapsed) + "s"); }
    }
    const NUMC = ["", "#8FB0FF", "#9BE36A", "#B98AFF", "#5B8CFF", "#FF6B8A", "#C8FF4D", "#F2F2EE", "#9B9B95"];
    function draw(ctx) {
      ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
      text(ctx, "bugs " + (MINES - flags.size), 8, TOP / 2, { size: 11, color: C.muted, align: "left" });
      text(ctx, state === "won" ? "all clear" : state === "lost" ? "segfault" : "hold / right-click = flag", W - 8, TOP / 2, { size: 10, color: state === "won" ? C.accent : state === "lost" ? C.danger : C.muted, align: "right" });
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
        const c = id(x, y), px = x * S, py = TOP + y * S;
        const isOpen = open.has(c), isMine = mines && mines.has(c);
        const showMine = isMine && state === "lost";
        ctx.fillStyle = isOpen ? "#141420" : "#1E2235";
        rr(ctx, px + 1.5, py + 1.5, S - 3, S - 3, 5); ctx.fill();
        if (showMine) {
          ctx.fillStyle = open.has(c) ? C.danger : "rgba(255,107,138,0.55)";
          rr(ctx, px + 7, py + 7, S - 14, S - 14, 4); ctx.fill();
          text(ctx, "x", px + S / 2, py + S / 2 + 0.5, { size: 11, weight: 700, color: "#0A0A0A" });
        } else if (isOpen && counts[c]) {
          text(ctx, String(counts[c]), px + S / 2, py + S / 2 + 1, { size: 14, weight: 700, color: NUMC[counts[c]] });
        } else if (flags.has(c)) {
          glowRect(ctx, px + 9, py + 8, S - 18, S - 16, 3, C.purple, 10);
          text(ctx, "1", px + S / 2, py + S / 2 + 0.5, { size: 10, weight: 700, color: "#0A0A0A" });
        }
        if (cur[0] === x && cur[1] === y && state === "play") { ctx.strokeStyle = "rgba(200,255,77,0.6)"; ctx.lineWidth = 1.5; rr(ctx, px + 1.5, py + 1.5, S - 3, S - 3, 5); ctx.stroke(); }
      }
      if (state === "won") banner(ctx, W, H, "no bugs left.", Math.round(elapsed) + "s · tap to play again");
      if (state === "lost") banner(ctx, W, H, "you hit a bug.", "tap to try again", C.danger);
    }
    function key(action, isDown) {
      if (!isDown) return;
      if (state !== "play") { if (action === "primary") reset(); return; }
      const d = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[action];
      if (d) { cur = [Math.max(0, Math.min(N - 1, cur[0] + d[0])), Math.max(0, Math.min(N - 1, cur[1] + d[1]))]; return; }
      if (action === "primary") reveal(cur[0], cur[1]);
      if (action === "flag") flag(cur[0], cur[1]);
    }
    function pointer(type, x, y, button) {
      const gx = Math.floor(x / S), gy = Math.floor((y - TOP) / S);
      const inside = gx >= 0 && gy >= 0 && gx < N && gy < N;
      if (type === "down") {
        if (state !== "play") { reset(); down = null; return; }
        down = inside ? { gx, gy, at: performance.now(), right: button === 2 } : null;
        if (inside) cur = [gx, gy];
      } else if (type === "up" && down) {
        const held = performance.now() - down.at;
        if (down.right || held > 380) flag(down.gx, down.gy); else reveal(down.gx, down.gy);
        down = null;
      }
    }
    const b = best.get(); ui.best(b ? b + "s" : "–");
    reset();
    return { W, H, update, draw, key, pointer, reset };
  }

  // =====================================================================
  // PING — pong against the computer, first to 7
  // =====================================================================
  function pong(ui) {
    const W = 360, H = 240, PW = 8, PH = 46, R = 5, WIN = 7;
    const wins = store("cole.pong.wins");
    let me, cpu, ball, ms, cs, state, held, target, flash, t, serveDir;

    function reset() {
      me = H / 2; cpu = H / 2; ms = 0; cs = 0; state = "ready"; held = {}; target = null; flash = 0; t = 0; serveDir = 1;
      center(); ui.score("0–0");
    }
    function center() { ball = { x: W / 2, y: H / 2, vx: 0, vy: 0 }; }
    function serve() {
      const a = (Math.random() * 0.8 - 0.4);
      ball.vx = 3.2 * serveDir * Math.cos(a); ball.vy = 3.2 * Math.sin(a);
      state = "play";
    }
    function point(mine) {
      mine ? ms++ : cs++;
      ui.score(ms + "–" + cs);
      serveDir = mine ? -1 : 1;
      center();
      if (ms >= WIN || cs >= WIN) {
        state = ms > cs ? "won" : "lost"; flash = 30;
        if (ms > cs) { wins.set(wins.get() + 1); ui.best(wins.get() + " wins"); }
      } else { state = "between"; flash = 40; }
    }
    function hit(py, dir) {
      const off = Math.max(-1, Math.min(1, (ball.y - py) / (PH / 2)));
      const sp = Math.min(7.5, Math.hypot(ball.vx, ball.vy) * 1.06);
      ball.vx = dir * sp * Math.cos(off * 0.9); ball.vy = sp * Math.sin(off * 0.9);
    }
    function update(k) {
      t += k; if (flash > 0) flash -= k;
      if (held.up) me -= 5 * k;
      if (held.down) me += 5 * k;
      if (target != null) me += (target - me) * Math.min(1, 0.3 * k);
      me = Math.max(PH / 2, Math.min(H - PH / 2, me));
      // computer: tracks the ball, but not perfectly
      const aim = ball.vx > 0 ? ball.y : H / 2;
      cpu += Math.max(-3.4, Math.min(3.4, (aim - cpu) * 0.12)) * k;
      cpu = Math.max(PH / 2, Math.min(H - PH / 2, cpu));
      if (state === "between" && flash <= 0) serve();
      if (state !== "play") return;
      const steps = Math.ceil(Math.hypot(ball.vx, ball.vy) * k / 3);
      for (let i = 0; i < steps && state === "play"; i++) {
        ball.x += ball.vx * k / steps; ball.y += ball.vy * k / steps;
        if (ball.y < R) { ball.y = R; ball.vy = Math.abs(ball.vy); }
        if (ball.y > H - R) { ball.y = H - R; ball.vy = -Math.abs(ball.vy); }
        if (ball.vx < 0 && ball.x - R <= 16 + PW && ball.x > 10 && Math.abs(ball.y - me) <= PH / 2 + R) { ball.x = 16 + PW + R; hit(me, 1); }
        if (ball.vx > 0 && ball.x + R >= W - 16 - PW && ball.x < W - 10 && Math.abs(ball.y - cpu) <= PH / 2 + R) { ball.x = W - 16 - PW - R; hit(cpu, -1); }
        if (ball.x < -10) point(false);
        else if (ball.x > W + 10) point(true);
      }
    }
    function draw(ctx) {
      ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "rgba(166,107,255,0.25)";
      for (let y = 6; y < H; y += 16) ctx.fillRect(W / 2 - 1, y, 2, 8);
      text(ctx, String(ms), W / 2 - 40, 26, { size: 22, weight: 600, color: C.blue });
      text(ctx, String(cs), W / 2 + 40, 26, { size: 22, weight: 600, color: C.purple });
      glowRect(ctx, 16, me - PH / 2, PW, PH, 4, C.blue, 12);
      glowRect(ctx, W - 16 - PW, cpu - PH / 2, PW, PH, 4, C.purple, 12);
      if (state !== "won" && state !== "lost") glowRect(ctx, ball.x - R, ball.y - R, R * 2, R * 2, R, C.accent, 14);
      text(ctx, "you", 20, H - 10, { size: 9, color: C.muted, align: "left" });
      text(ctx, "cpu", W - 20, H - 10, { size: 9, color: C.muted, align: "right" });
      if (state === "ready") banner(ctx, W, H, "ping", "first to 7 · tap / space to serve");
      if (state === "won") banner(ctx, W, H, "you win " + ms + "–" + cs + ".", flash > 0 ? "" : "tap / space to play again");
      if (state === "lost") banner(ctx, W, H, "cpu wins " + cs + "–" + ms + ".", flash > 0 ? "" : "tap / space for a rematch", C.danger);
    }
    function key(action, down) {
      if (action === "up" || action === "down") { held[action] = down; target = null; return; }
      if (!down || action !== "primary") return;
      if (state === "ready") serve();
      else if ((state === "won" || state === "lost") && flash <= 0) { reset(); serve(); }
    }
    function pointer(type, x, y) { if (type === "move" || type === "down") target = y; }
    ui.best(wins.get() + " wins");
    reset();
    return { W, H, update, draw, key, pointer, reset, tapOnDown: true, trackHover: true };
  }

  const games = { flappy, snake, g2048, breakout, stack, sweeper, pong };
  const INFO = {
    flappy: { name: "flappy_bit", hint: "Click, tap or space to flap." },
    snake: { name: "byte_snake", hint: "Arrows, WASD or swipe." },
    g2048: { name: "2048", hint: "Arrows, WASD or swipe. Every tile is a power of two." },
    breakout: { name: "bit_breaker", hint: "Move the mouse, drag, or use arrows. Tap / space to launch." },
    stack: { name: "byte_stack", hint: "Left/right to move, up / tap to rotate, down to drop. Swipe works too." },
    sweeper: { name: "bit_sweeper", hint: "Tap to open a cell. Hold or right-click to flag a bug. Keys: arrows, space, F." },
    pong: { name: "ping", hint: "Move the mouse, drag, or use up/down. First to 7 wins." },
  };

  // builds a full card: header (name, score, best, restart) + canvas + hint
  function mount(el) {
    const id = el.dataset.game, info = INFO[id];
    if (!games[id]) return;
    el.classList.add("arcade-card", "glow-border");
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

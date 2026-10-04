// Corner widget: a small Flappy Bit on every page (the Arcade page has the full set instead).
(() => {
  if (!window.ColeArcade || document.body.hasAttribute("data-no-widget")) return;

  const root = document.createElement("aside");
  root.className = "fb glow-border";
  root.setAttribute("aria-label", "Flappy Bit mini game");
  root.innerHTML =
    '<div class="fb-head"><span><b>flappy_bit</b><span class="fb-score"> &middot; best <span class="fb-best">0</span></span></span>' +
    '<button class="fb-toggle" type="button" aria-expanded="true" aria-label="Hide game">&minus;</button></div>' +
    '<canvas aria-label="Game. Click, tap, or press space to flap."></canvas>' +
    '<a class="fb-more" href="/games.html">more games &rarr;</a>';
  document.body.appendChild(root);

  const toggle = root.querySelector(".fb-toggle");
  const bestEl = root.querySelector(".fb-best");
  const isOpen = () => !root.classList.contains("closed");
  const game = ColeArcade.games.flappy({ score() {}, best: (n) => (bestEl.textContent = n) });
  const ctrl = ColeArcade.attach(root.querySelector("canvas"), game, { active: isOpen });

  function setOpen(open) {
    root.classList.toggle("closed", !open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Hide game" : "Show game");
    toggle.innerHTML = open ? "&minus;" : '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 11h4M8 9v4M15 12h.01M18 10h.01"/><rect x="2" y="6" width="20" height="12" rx="6"/></svg>';
    try { localStorage.setItem("cole.flappy.open", open ? "1" : "0"); } catch (_) {}
    if (open) ctrl.fit();
    ctrl.sync();
  }
  toggle.addEventListener("click", (e) => { e.stopPropagation(); setOpen(!isOpen()); });
  // when collapsed, the whole pill opens the game
  root.querySelector(".fb-head").addEventListener("click", () => { if (!isOpen()) setOpen(true); });

  // start open only on big screens with a mouse; phones and tablets get the small pill
  let open = window.innerWidth > 1024 && window.matchMedia("(pointer: fine)").matches;
  try { const s = localStorage.getItem("cole.flappy.open"); if (s !== null) open = s === "1"; } catch (_) {}
  setOpen(open);
})();

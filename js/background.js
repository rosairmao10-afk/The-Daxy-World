/* ===================================================================
   THE DAXY'S WORLD - fundo interativo
   Uma rede de "olhos" digitais espalhados como as telas do complexo.
   Quando o cursor se aproxima, os nós acordam e se conectam a ele -
   como se algo, em algum monitor, tivesse acabado de notar você.
   =================================================================== */
(function () {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let W, H, DPR;
  let nodes = [];
  let mouse = { x: -9999, y: -9999, active: false };
  let running = true;

  const CYAN = '95,228,255';
  const WINE = '212,58,92';

  function sizeCanvas() {
    DPR = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * DPR;
    canvas.height = H * DPR;
    canvas.style.width = W + 'px';
    canvas.style.height = H + 'px';
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    console.log('[Daxy BG] canvas redimensionado:', W + 'x' + H, '| DPR:', DPR);
  }

  function nodeCount() {
    const area = W * H;
    const base = Math.round(area / 22000);
    return Math.max(28, Math.min(base, 110));
  }

  function makeNodes() {
    const count = nodeCount();
    nodes = new Array(count).fill(0).map(() => ({
      x: Math.random() * W,
      y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18,
      r: 1.1 + Math.random() * 1.6,
      phase: Math.random() * Math.PI * 2,
    }));
    console.log('[Daxy BG] nós gerados:', nodes.length);
  }

  const LINK_DIST = 150;
  const MOUSE_DIST = 210;

  function step(t) {
    if (!running) return;
    ctx.clearRect(0, 0, W, H);

    // update
    for (const n of nodes) {
      n.x += n.vx;
      n.y += n.vy;

      if (n.x < -20) n.x = W + 20;
      if (n.x > W + 20) n.x = -20;
      if (n.y < -20) n.y = H + 20;
      if (n.y > H + 20) n.y = -20;

      // gentle repel from cursor
      if (mouse.active) {
        const dx = n.x - mouse.x;
        const dy = n.y - mouse.y;
        const d2 = dx * dx + dy * dy;
        const rad = 130;
        if (d2 < rad * rad) {
          const d = Math.sqrt(d2) || 1;
          const f = (rad - d) / rad * 0.045;
          n.vx += (dx / d) * f;
          n.vy += (dy / d) * f;
        }
      }
      // gentle drag so it doesn't accelerate forever
      n.vx *= 0.994;
      n.vy *= 0.994;
    }

    // links between nearby nodes
    ctx.lineWidth = 1;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < LINK_DIST) {
          const op = (1 - dist / LINK_DIST) * 0.16;
          ctx.strokeStyle = `rgba(${CYAN},${op})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    // links + glow toward the cursor ("Daxy notando você")
    if (mouse.active) {
      for (const n of nodes) {
        const dx = n.x - mouse.x, dy = n.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MOUSE_DIST) {
          const op = (1 - dist / MOUSE_DIST);
          ctx.strokeStyle = `rgba(${WINE},${op * 0.35})`;
          ctx.beginPath();
          ctx.moveTo(n.x, n.y);
          ctx.lineTo(mouse.x, mouse.y);
          ctx.stroke();

          ctx.fillStyle = `rgba(${WINE},${0.5 + op * 0.5})`;
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.r + op * 1.6, 0, Math.PI * 2);
          ctx.fill();
        } else {
          drawIdleNode(n, t);
        }
      }

      // cursor glow
      const grad = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, MOUSE_DIST);
      grad.addColorStop(0, `rgba(${WINE},0.10)`);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, MOUSE_DIST, 0, Math.PI * 2);
      ctx.fill();
    } else {
      for (const n of nodes) drawIdleNode(n, t);
    }

    if (!reduceMotion) {
      requestAnimationFrame(step);
    }
  }

  function drawIdleNode(n, t) {
    const pulse = 0.55 + Math.sin((t || 0) * 0.0015 + n.phase) * 0.25;
    ctx.fillStyle = `rgba(${CYAN},${pulse})`;
    ctx.beginPath();
    ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
    ctx.fill();
  }

  function onMove(e) {
    const p = e.touches ? e.touches[0] : e;
    mouse.x = p.clientX;
    mouse.y = p.clientY;
    if (!mouse.active) console.log('[Daxy BG] cursor detectado, nós reagindo');
    mouse.active = true;
  }
  function onLeave() {
    mouse.active = false;
    console.log('[Daxy BG] cursor saiu, nós voltam ao repouso');
  }

  window.addEventListener('mousemove', onMove, { passive: true });
  window.addEventListener('touchmove', onMove, { passive: true });
  window.addEventListener('mouseleave', onLeave);
  window.addEventListener('touchend', onLeave);

  window.addEventListener('resize', () => {
    console.log('[Daxy BG] janela redimensionada, recalculando cena');
    sizeCanvas();
    makeNodes();
  });

  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    console.log('[Daxy BG] aba', running ? 'visível, retomando animação' : 'em segundo plano, pausando animação');
    if (running && !reduceMotion) requestAnimationFrame(step);
  });

  console.log('[Daxy BG] iniciando fundo interativo | prefers-reduced-motion:', reduceMotion);
  sizeCanvas();
  makeNodes();

  if (reduceMotion) {
    // desenha um único quadro estático, sem loop contínuo
    step(0);
  } else {
    requestAnimationFrame(step);
  }
})();
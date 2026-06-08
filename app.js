// =========================================
//   PIXELCANVAS v2 — 10,000 × 10,000
//   100,000,000 pixels · $1 each · $100M ceiling
// =========================================

const GRID      = 10000;  // 10,000 × 10,000 = 100M pixels
const VIEWPORT  = 100;    // cells visible at once
const CELL      = 8;      // px per cell → 800×800 canvas
const PRICE     = 1;      // $1 per pixel
const STORAGE_KEY = 'pixelcanvas_v2';

// ── STATE ──────────────────────────────────
let pixels = {};
let viewX = 0, viewY = 0;   // viewport top-left in grid coords
let pendingCell = null;
let hoverCell = null;        // currently hovered grid cell

// Drag/pan state
let isDragging = false, hasDragged = false;
let dragStart = { x: 0, y: 0 };
let dragViewStart = { x: 0, y: 0 };

// ── DOM ────────────────────────────────────
const canvas        = document.getElementById('pixelCanvas');
const ctx           = canvas.getContext('2d');
const minimap       = document.getElementById('minimap');
const mctx          = minimap.getContext('2d');
const tooltip       = document.getElementById('tooltip');
const coordsDisplay = document.getElementById('coordsDisplay');
const modal         = document.getElementById('modal');
const infoModal     = document.getElementById('infoModal');
const overlay       = document.getElementById('modalOverlay');
const ownerName     = document.getElementById('ownerName');
const ownerUrl      = document.getElementById('ownerUrl');
const ownerMessage  = document.getElementById('ownerMessage');
const ownerColor    = document.getElementById('ownerColor');
const modalPreview  = document.getElementById('modalPreview');
const modalCoords   = document.getElementById('modalCoords');
const btnClaim      = document.getElementById('btnClaim');
const btnBuyRandom  = document.getElementById('btnBuyRandom');
const modalClose    = document.getElementById('modalClose');
const infoModalClose= document.getElementById('infoModalClose');

// ── INIT ───────────────────────────────────
function init() {
  loadData();
  seedDemoPixels();
  drawCanvas();
  updateMinimap();
  updateStats();
  updateRecent();
  updateLeaderboard();
  updateCoords();

  // Canvas interaction
  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mouseup',   onMouseUp);
  canvas.addEventListener('mouseleave', onMouseLeave);
  canvas.addEventListener('wheel', onWheel, { passive: false });
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  // Keyboard nav
  document.addEventListener('keydown', onKeyDown);

  // Nav buttons
  document.getElementById('navLeft') .addEventListener('click', () => moveViewport(-10, 0));
  document.getElementById('navRight').addEventListener('click', () => moveViewport( 10, 0));
  document.getElementById('navUp')   .addEventListener('click', () => moveViewport(0, -10));
  document.getElementById('navDown') .addEventListener('click', () => moveViewport(0,  10));

  // Go to coords
  document.getElementById('btnGoto').addEventListener('click', gotoCoords);
  document.getElementById('gotoX').addEventListener('keydown', e => e.key === 'Enter' && gotoCoords());
  document.getElementById('gotoY').addEventListener('keydown', e => e.key === 'Enter' && gotoCoords());

  // Modal
  btnClaim.addEventListener('click', claimPixel);
  btnBuyRandom.addEventListener('click', claimRandom);
  modalClose.addEventListener('click', closeModal);
  infoModalClose.addEventListener('click', closeInfoModal);
  overlay.addEventListener('click', closeAllModals);
  ownerColor.addEventListener('input', syncColorPreview);

  document.querySelectorAll('.cp').forEach(el => {
    el.addEventListener('click', () => {
      ownerColor.value = el.dataset.color;
      document.querySelectorAll('.cp').forEach(c => c.classList.remove('active'));
      el.classList.add('active');
      syncColorPreview();
    });
  });
}

// ── DEMO SEED ─────────────────────────────
function seedDemoPixels() {
  if (Object.keys(pixels).length > 0) return;

  const now = Date.now();
  const demos = [
    // Clustered near top-left (visible on first load)
    { x:5, y:5, n:'PixelPete',   c:'#ff6b35', u:'https://example.com', m:'First pixel ever!' },
    { x:6, y:5, n:'PixelPete',   c:'#ff6b35', u:'https://example.com', m:'First pixel ever!' },
    { x:5, y:6, n:'PixelPete',   c:'#ff6b35', u:'https://example.com', m:'First pixel ever!' },
    { x:6, y:6, n:'PixelPete',   c:'#ff6b35', u:'https://example.com', m:'First pixel ever!' },

    { x:15, y:8, n:'CoolBrand',  c:'#4ecdc4', u:'https://example.com', m:'We make cool things.' },
    { x:16, y:8, n:'CoolBrand',  c:'#4ecdc4', u:'https://example.com', m:'We make cool things.' },
    { x:17, y:8, n:'CoolBrand',  c:'#4ecdc4', u:'https://example.com', m:'We make cool things.' },
    { x:15, y:9, n:'CoolBrand',  c:'#4ecdc4', u:'https://example.com', m:'We make cool things.' },
    { x:16, y:9, n:'CoolBrand',  c:'#4ecdc4', u:'https://example.com', m:'We make cool things.' },
    { x:17, y:9, n:'CoolBrand',  c:'#4ecdc4', u:'https://example.com', m:'We make cool things.' },

    { x:40, y:20, n:'TinyAds.io', c:'#f7dc6f', u:'https://example.com', m:'Tiny ads, big reach.' },
    { x:41, y:20, n:'TinyAds.io', c:'#f7dc6f', u:'https://example.com', m:'Tiny ads, big reach.' },
    { x:40, y:21, n:'TinyAds.io', c:'#f7dc6f', u:'https://example.com', m:'Tiny ads, big reach.' },

    { x:70, y:50, n:'Dev Corner', c:'#bb8fce', u:'https://example.com', m:'We write code for fun.' },
    { x:71, y:50, n:'Dev Corner', c:'#bb8fce', u:'https://example.com', m:'We write code for fun.' },

    { x:30, y:70, n:'NeonShop',   c:'#f1948a', u:'https://example.com', m:'Neon signs for all.' },
    { x:31, y:70, n:'NeonShop',   c:'#f1948a', u:'https://example.com', m:'Neon signs for all.' },
    { x:32, y:70, n:'NeonShop',   c:'#f1948a', u:'https://example.com', m:'Neon signs for all.' },

    { x:80, y:30, n:'SpacePixel', c:'#58d68d', u:'https://example.com', m:'Own your space.' },
    { x:81, y:30, n:'SpacePixel', c:'#58d68d', u:'https://example.com', m:'Own your space.' },
    { x:80, y:31, n:'SpacePixel', c:'#58d68d', u:'https://example.com', m:'Own your space.' },
    { x:81, y:31, n:'SpacePixel', c:'#58d68d', u:'https://example.com', m:'Own your space.' },
  ];

  demos.forEach((d, i) => {
    pixels[`${d.x},${d.y}`] = {
      name: d.n, url: d.u, message: d.m, color: d.c,
      claimedAt: now - (demos.length - i) * 1000 * 60 * 3
    };
  });

  saveData();
}

// ── CANVAS DRAWING ────────────────────────
function drawCanvas() {
  ctx.fillStyle = '#08081a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let cy = 0; cy < VIEWPORT; cy++) {
    for (let cx = 0; cx < VIEWPORT; cx++) {
      const gx = cx + viewX;
      const gy = cy + viewY;
      const k  = `${gx},${gy}`;
      const isHovered = hoverCell && hoverCell.cx === cx && hoverCell.cy === cy;

      if (pixels[k]) {
        ctx.fillStyle = pixels[k].color;
        ctx.fillRect(cx * CELL, cy * CELL, CELL - 1, CELL - 1);
        // Subtle shine on claimed pixels
        if (!isHovered) {
          ctx.fillStyle = 'rgba(255,255,255,0.06)';
          ctx.fillRect(cx * CELL, cy * CELL, CELL - 1, 2);
        }
      } else {
        ctx.fillStyle = (gx + gy) % 2 === 0 ? '#0e0e24' : '#0b0b1e';
        ctx.fillRect(cx * CELL, cy * CELL, CELL - 1, CELL - 1);
      }

      // Hover highlight
      if (isHovered) {
        ctx.strokeStyle = pixels[k] ? 'rgba(255,255,255,0.9)' : 'rgba(167,139,250,0.9)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(cx * CELL + 0.5, cy * CELL + 0.5, CELL - 2, CELL - 2);
      }
    }
  }
}

function redrawCell(gx, gy) {
  const cx = gx - viewX;
  const cy = gy - viewY;
  if (cx < 0 || cx >= VIEWPORT || cy < 0 || cy >= VIEWPORT) return;
  const k = `${gx},${gy}`;
  if (pixels[k]) {
    ctx.fillStyle = pixels[k].color;
    ctx.fillRect(cx * CELL, cy * CELL, CELL - 1, CELL - 1);
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    ctx.fillRect(cx * CELL, cy * CELL, CELL - 1, 2);
  } else {
    ctx.fillStyle = (gx + gy) % 2 === 0 ? '#0e0e24' : '#0b0b1e';
    ctx.fillRect(cx * CELL, cy * CELL, CELL - 1, CELL - 1);
  }
}

// ── MINIMAP ───────────────────────────────
function updateMinimap() {
  const MW = minimap.width;
  const MH = minimap.height;
  const scale = MW / GRID;

  mctx.fillStyle = '#0d0d1a';
  mctx.fillRect(0, 0, MW, MH);

  // Draw all claimed pixels (as 1px dots)
  Object.entries(pixels).forEach(([k, p]) => {
    const [gx, gy] = k.split(',').map(Number);
    mctx.fillStyle = p.color;
    mctx.fillRect(Math.floor(gx * scale), Math.floor(gy * scale), 2, 2);
  });

  // Draw viewport rectangle
  const vpW = VIEWPORT * scale;
  const vpH = VIEWPORT * scale;
  mctx.strokeStyle = 'rgba(255,255,255,0.6)';
  mctx.lineWidth = 1;
  mctx.strokeRect(viewX * scale, viewY * scale, Math.max(vpW, 2), Math.max(vpH, 2));
  mctx.fillStyle = 'rgba(255,255,255,0.05)';
  mctx.fillRect(viewX * scale, viewY * scale, Math.max(vpW, 2), Math.max(vpH, 2));
}

// ── COORDINATES DISPLAY ──────────────────
function updateCoords(gx, gy) {
  if (gx !== undefined) {
    coordsDisplay.textContent = `x: ${gx.toLocaleString()}, y: ${gy.toLocaleString()} · viewport (${viewX.toLocaleString()}, ${viewY.toLocaleString()})`;
  } else {
    coordsDisplay.textContent = `Viewport: (${viewX.toLocaleString()}, ${viewY.toLocaleString()}) of ${GRID.toLocaleString()}×${GRID.toLocaleString()}`;
  }
}

// ── VIEWPORT NAV ─────────────────────────
function moveViewport(dx, dy) {
  viewX = Math.max(0, Math.min(GRID - VIEWPORT, viewX + dx));
  viewY = Math.max(0, Math.min(GRID - VIEWPORT, viewY + dy));
  drawCanvas();
  updateMinimap();
  updateCoords();
}

function gotoCoords() {
  const x = parseInt(document.getElementById('gotoX').value, 10);
  const y = parseInt(document.getElementById('gotoY').value, 10);
  if (isNaN(x) || isNaN(y)) return;
  viewX = Math.max(0, Math.min(GRID - VIEWPORT, Math.floor(x - VIEWPORT / 2)));
  viewY = Math.max(0, Math.min(GRID - VIEWPORT, Math.floor(y - VIEWPORT / 2)));
  drawCanvas();
  updateMinimap();
  updateCoords();
}

// ── CANVAS EVENTS ─────────────────────────
function cellFromEvent(e) {
  const rect = canvas.getBoundingClientRect();
  const sx = canvas.width  / rect.width;
  const sy = canvas.height / rect.height;
  const cx = Math.floor((e.clientX - rect.left) * sx / CELL);
  const cy = Math.floor((e.clientY - rect.top)  * sy / CELL);
  if (cx < 0 || cx >= VIEWPORT || cy < 0 || cy >= VIEWPORT) return null;
  return { x: cx + viewX, y: cy + viewY, cx, cy };
}

function onMouseDown(e) {
  if (e.button !== 0) return;
  isDragging   = true;
  hasDragged   = false;
  dragStart    = { x: e.clientX, y: e.clientY };
  dragViewStart= { x: viewX, y: viewY };
  canvas.style.cursor = 'grabbing';
}

function onMouseMove(e) {
  if (isDragging) {
    const rect = canvas.getBoundingClientRect();
    const scale = canvas.width / rect.width;
    const dx = Math.round((e.clientX - dragStart.x) * scale / CELL);
    const dy = Math.round((e.clientY - dragStart.y) * scale / CELL);
    if (Math.abs(dx) > 0 || Math.abs(dy) > 0) {
      hasDragged = true;
      viewX = Math.max(0, Math.min(GRID - VIEWPORT, dragViewStart.x - dx));
      viewY = Math.max(0, Math.min(GRID - VIEWPORT, dragViewStart.y - dy));
      hoverCell = null;
      drawCanvas();
      updateMinimap();
      updateCoords();
    }
    hideTooltip();
    return;
  }

  const cell = cellFromEvent(e);
  if (!cell) {
    if (hoverCell) { hoverCell = null; drawCanvas(); }
    hideTooltip();
    return;
  }

  // Update hover highlight if cell changed
  if (!hoverCell || hoverCell.cx !== cell.cx || hoverCell.cy !== cell.cy) {
    hoverCell = { cx: cell.cx, cy: cell.cy };
    drawCanvas();
  }

  canvas.style.cursor = pixels[`${cell.x},${cell.y}`] ? 'pointer' : 'crosshair';
  updateCoords(cell.x, cell.y);

  const p = pixels[`${cell.x},${cell.y}`];
  if (p) {
    tooltip.innerHTML = `
      <div class="tooltip-name">${escHtml(p.name)}</div>
      ${p.message ? `<div class="tooltip-msg">${escHtml(p.message)}</div>` : ''}
      ${p.url ? `<div class="tooltip-url">🔗 ${escHtml(p.url)}</div>` : ''}
      <div class="tooltip-coords">(${cell.x.toLocaleString()}, ${cell.y.toLocaleString()})</div>
    `;
  } else {
    tooltip.innerHTML = `
      <div class="tooltip-msg" style="color:#94a3b8">Empty pixel</div>
      <div class="tooltip-coords">(${cell.x.toLocaleString()}, ${cell.y.toLocaleString()}) · Click to claim</div>
    `;
  }
  tooltip.classList.remove('hidden');
  positionTooltip(e);
}

function onMouseUp(e) {
  isDragging = false;
  canvas.style.cursor = 'crosshair';
  if (!hasDragged) {
    const cell = cellFromEvent(e);
    if (!cell) return;
    const k = `${cell.x},${cell.y}`;
    pixels[k] ? openInfoModal(cell.x, cell.y) : openClaimModal(cell.x, cell.y);
  }
}

function onMouseLeave() {
  isDragging = false;
  if (hoverCell) { hoverCell = null; drawCanvas(); }
  hideTooltip();
  canvas.style.cursor = 'crosshair';
}

function onWheel(e) {
  e.preventDefault();
  const step = e.shiftKey ? 50 : 10;
  moveViewport(
    Math.sign(e.deltaX) * step,
    Math.sign(e.deltaY) * step
  );
}

function onKeyDown(e) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
  const step = e.shiftKey ? 100 : (e.ctrlKey ? 500 : 10);
  const map = {
    ArrowLeft: [-step, 0], ArrowRight: [step, 0],
    ArrowUp:   [0, -step], ArrowDown:  [0,  step],
    a: [-step, 0], d: [step, 0], w: [0, -step], s: [0, step]
  };
  if (map[e.key]) {
    e.preventDefault();
    moveViewport(...map[e.key]);
  }
}

function positionTooltip(e) {
  const tw = tooltip.offsetWidth  || 200;
  const th = tooltip.offsetHeight || 80;
  let left = e.clientX + 14;
  let top  = e.clientY + 14;
  if (left + tw > window.innerWidth  - 8) left = e.clientX - tw - 14;
  if (top  + th > window.innerHeight - 8) top  = e.clientY - th - 14;
  tooltip.style.left = left + 'px';
  tooltip.style.top  = top  + 'px';
}

function hideTooltip() {
  tooltip.classList.add('hidden');
}

// ── CLAIM MODAL ───────────────────────────
function openClaimModal(x, y) {
  pendingCell = { x, y };
  modalCoords.textContent = `(${x.toLocaleString()}, ${y.toLocaleString()})`;
  ownerName.value = ownerUrl.value = ownerMessage.value = '';
  ownerColor.value = '#ff6b35';
  syncColorPreview();
  document.querySelectorAll('.cp').forEach(c => c.classList.remove('active'));
  modal.classList.remove('hidden');
  overlay.classList.remove('hidden');
  ownerName.focus();
}

function closeModal() {
  modal.classList.add('hidden');
  overlay.classList.add('hidden');
  pendingCell = null;
}

function syncColorPreview() {
  modalPreview.style.background = ownerColor.value;
}

// ── INFO MODAL ────────────────────────────
function openInfoModal(x, y) {
  const p = pixels[`${x},${y}`];
  if (!p) return;
  document.getElementById('infoName').textContent    = p.name;
  document.getElementById('infoCoords').textContent  = `Pixel (${x.toLocaleString()}, ${y.toLocaleString()})`;
  document.getElementById('infoMessage').textContent = p.message || '';
  document.getElementById('infoPreview').style.background = p.color;
  const urlEl = document.getElementById('infoUrl');
  if (p.url) { urlEl.href = p.url; urlEl.style.display = 'block'; }
  else        { urlEl.style.display = 'none'; }
  infoModal.classList.remove('hidden');
  overlay.classList.remove('hidden');
}

function closeInfoModal() {
  infoModal.classList.add('hidden');
  overlay.classList.add('hidden');
}

function closeAllModals() { closeModal(); closeInfoModal(); }

// ── CLAIM PIXEL ───────────────────────────
function claimPixel() {
  if (!pendingCell) return;
  const name = ownerName.value.trim();
  if (!name) {
    ownerName.style.borderColor = '#e74c3c';
    ownerName.focus();
    setTimeout(() => ownerName.style.borderColor = '', 1500);
    return;
  }
  const { x, y } = pendingCell;
  pixels[`${x},${y}`] = {
    name,
    url:       ownerUrl.value.trim(),
    message:   ownerMessage.value.trim(),
    color:     ownerColor.value,
    claimedAt: Date.now()
  };
  saveData();
  redrawCell(x, y);
  updateMinimap();
  updateStats();
  updateRecent();
  updateLeaderboard();
  closeModal();
  flashCell(x, y);
}

function flashCell(gx, gy) {
  const cx = gx - viewX, cy = gy - viewY;
  if (cx < 0 || cx >= VIEWPORT || cy < 0 || cy >= VIEWPORT) return;
  const color = pixels[`${gx},${gy}`]?.color || '#fff';
  let n = 0;
  const iv = setInterval(() => {
    ctx.fillStyle = n++ % 2 === 0 ? '#fff' : color;
    ctx.fillRect(cx * CELL, cy * CELL, CELL - 1, CELL - 1);
    if (n >= 6) { clearInterval(iv); redrawCell(gx, gy); }
  }, 80);
}

// ── CLAIM RANDOM ──────────────────────────
function claimRandom() {
  const attempts = 200;
  for (let i = 0; i < attempts; i++) {
    const x = viewX + Math.floor(Math.random() * VIEWPORT);
    const y = viewY + Math.floor(Math.random() * VIEWPORT);
    if (!pixels[`${x},${y}`]) { openClaimModal(x, y); return; }
  }
  for (let i = 0; i < attempts; i++) {
    const x = Math.floor(Math.random() * GRID);
    const y = Math.floor(Math.random() * GRID);
    if (!pixels[`${x},${y}`]) { openClaimModal(x, y); return; }
  }
}

// ── STATS ─────────────────────────────────
function updateStats() {
  const sold  = Object.keys(pixels).length;
  const total = GRID * GRID;
  const left  = total - sold;
  document.getElementById('pixelsSold').textContent    = sold.toLocaleString();
  document.getElementById('revenueEarned').textContent = '$' + sold.toLocaleString();
  document.getElementById('pixelsLeft').textContent    = left.toLocaleString();

  // Update progress bar
  const pct = (sold / total) * 100;
  const bar = document.getElementById('progressFill');
  if (bar) bar.style.width = Math.max(pct, pct > 0 ? 0.05 : 0) + '%';
}

// ── RECENT ────────────────────────────────
function updateRecent() {
  const list = document.getElementById('recentList');
  const sorted = Object.entries(pixels)
    .sort((a, b) => b[1].claimedAt - a[1].claimedAt)
    .slice(0, 8);

  if (!sorted.length) {
    list.innerHTML = '<p class="empty-state">No pixels claimed yet.<br/>Be the first!</p>';
    return;
  }
  list.innerHTML = sorted.map(([k, p]) => {
    const [x, y] = k.split(',');
    return `<div class="recent-item" onclick="openInfoModal(${x},${y})">
      <div class="item-swatch" style="background:${p.color}"></div>
      <span class="item-name">${escHtml(p.name)}</span>
      <span class="item-count">(${Number(x).toLocaleString()},${Number(y).toLocaleString()})</span>
    </div>`;
  }).join('');
}

// ── LEADERBOARD ───────────────────────────
function updateLeaderboard() {
  const counts = {}, colors = {};
  Object.values(pixels).forEach(p => {
    counts[p.name] = (counts[p.name] || 0) + 1;
    colors[p.name] = p.color;
  });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const lb = document.getElementById('leaderboard');
  if (!sorted.length) {
    lb.innerHTML = '<p class="empty-state">Claim pixels to appear here.</p>';
    return;
  }
  lb.innerHTML = sorted.map(([name, count]) => `
    <div class="leader-item">
      <div class="item-swatch" style="background:${colors[name]}"></div>
      <span class="item-name">${escHtml(name)}</span>
      <span class="item-count">${count.toLocaleString()} px</span>
    </div>`).join('');
}

// ── PERSISTENCE ───────────────────────────
function saveData() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(pixels)); }
  catch (e) { console.warn('Storage full — data not saved.'); }
}

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) pixels = JSON.parse(raw);
  } catch(e) { pixels = {}; }
}

// ── UTILS ─────────────────────────────────
function escHtml(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── BOOT ──────────────────────────────────
init();

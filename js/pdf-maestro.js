'use strict';
/* ---------- Configuración y estado ---------- */
const MAX_BYTES = 150 * 1024 * 1024, MAX_PAGES = 600;
const MAX_CANVAS_PIXELS = 16e6, MAX_TEXT = 2000, MAX_ANNOTS = 300, REDACT_DPI = 200;
pdfjsLib.GlobalWorkerOptions.workerPort = new Worker(URL.createObjectURL(new Blob([WORKER_SOURCE], { type: 'text/javascript' })));
const $ = id => document.getElementById(id);
let pages = [], sources = [], nextId = 1, busy = false, dragId = null, dirty = false;
const FONT_CSS = 'Helvetica, Arial, "Liberation Sans", sans-serif';

function status(text, error = false) { $('status').textContent = text; $('status').className = error ? 'error' : ''; }
function controls() {
  const n = pages.filter(p => p.selected).length;
  $('count').textContent = `${pages.length} páginas · ${sources.length} archivos`;
  $('save').disabled = busy || !pages.length; $('delete').disabled = busy || !n; $('clear').disabled = busy || !pages.length;
  $('selectAll').disabled = busy || !pages.length; $('files').disabled = busy;
  document.querySelectorAll('.card button,.card input').forEach(e => e.disabled = busy);
}

/* ---------- Renderizado de páginas y anotaciones ---------- */
function clampScale(page, scale) { // evita lienzos gigantes con páginas de tamaño exagerado
  const v = page.getViewport({ scale: 1 }), max = Math.sqrt(MAX_CANVAS_PIXELS / (v.width * v.height));
  return Math.min(scale, max);
}
function viewportFor(page, rotation, scale) { return page.getViewport({ scale, rotation: (page.rotate + rotation) % 360 }); }

async function renderPage(source, index, rotation, scale, pixelRatio = 1) {
  const page = await source.preview.getPage(index + 1);
  const view = viewportFor(page, rotation, scale);
  const renderView = viewportFor(page, rotation, clampScale(page, scale * pixelRatio));
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(renderView.width); canvas.height = Math.ceil(renderView.height);
  await page.render({ canvasContext: canvas.getContext('2d'), viewport: renderView }).promise;
  return { canvas, view, renderView };
}

async function pageImage(p, scale = .32) {
  const { canvas, renderView } = await renderPage(p.source, p.index, p.rotation, scale);
  if (p.annots && p.annots.length) drawAnnots(canvas.getContext('2d'), renderView, p.annots);
  const result = canvas.toDataURL('image/png'); canvas.width = canvas.height = 0; return result;
}

const toScreen = (vp, x, y) => vp.convertToViewportPoint(x, y);
const toPdf = (vp, x, y) => vp.convertToPdfPoint(x, y);
function screenBox(vp, a) {
  const [ax, ay] = toScreen(vp, a.x1, a.y1), [bx, by] = toScreen(vp, a.x2, a.y2);
  return { x: Math.min(ax, bx), y: Math.min(ay, by), w: Math.abs(bx - ax), h: Math.abs(by - ay) };
}
function textAngle(vp, a) { // ángulo en pantalla de la línea base del texto
  const [x0, y0] = toScreen(vp, a.x, a.y), [x1, y1] = toScreen(vp, a.x + Math.cos(a.angle), a.y + Math.sin(a.angle));
  return Math.atan2(y1 - y0, x1 - x0);
}
const measureCtx = document.createElement('canvas').getContext('2d');
function textSize(a, scale) {
  measureCtx.font = `${a.size * scale}px ${FONT_CSS}`;
  const lines = a.text.split('\n');
  return { w: Math.max(...lines.map(l => measureCtx.measureText(l).width), 4), h: lines.length * a.size * 1.2 * scale, lines };
}
function arrowHead(x1, y1, x2, y2, width) {
  const len = Math.max(9, width * 4.5), ang = Math.atan2(y2 - y1, x2 - x1), spread = Math.PI / 7.5;
  return {
    left: [x2 - len * Math.cos(ang - spread), y2 - len * Math.sin(ang - spread)],
    right: [x2 - len * Math.cos(ang + spread), y2 - len * Math.sin(ang + spread)],
    base: [x2 - len * Math.cos(spread) * Math.cos(ang), y2 - len * Math.cos(spread) * Math.sin(ang)]
  };
}

function drawAnnots(ctx, vp, annots, selected = null) { for (const a of annots) drawAnnot(ctx, vp, a, a === selected); }
function drawAnnot(ctx, vp, a, isSelected) {
  const s = vp.scale;
  ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (a.type === 'redact') {
    const b = screenBox(vp, a); ctx.fillStyle = '#000'; ctx.fillRect(b.x, b.y, b.w, b.h);
  } else if (a.type === 'highlight') {
    const b = screenBox(vp, a);
    ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = .4; ctx.fillStyle = a.fill; ctx.fillRect(b.x, b.y, b.w, b.h);
  } else if (a.type === 'rect' || a.type === 'ellipse') {
    const b = screenBox(vp, a);
    ctx.beginPath();
    if (a.type === 'rect') ctx.rect(b.x, b.y, b.w, b.h); else ctx.ellipse(b.x + b.w / 2, b.y + b.h / 2, b.w / 2, b.h / 2, 0, 0, Math.PI * 2);
    if (a.filled) { ctx.fillStyle = a.fill; ctx.fill(); }
    if (a.width > 0) { ctx.strokeStyle = a.stroke; ctx.lineWidth = a.width * s; ctx.stroke(); }
  } else if (a.type === 'arrow') {
    const [x1, y1] = toScreen(vp, a.x1, a.y1), [x2, y2] = toScreen(vp, a.x2, a.y2);
    const h = arrowHead(x1, y1, x2, y2, a.width * s);
    ctx.strokeStyle = ctx.fillStyle = a.stroke; ctx.lineWidth = a.width * s;
    ctx.beginPath(); ctx.moveTo(x1, y1);
    if (a.filled) { ctx.lineTo(...h.base); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(...h.left); ctx.lineTo(...h.right); ctx.closePath(); ctx.fill(); }
    else { ctx.lineTo(x2, y2); ctx.moveTo(...h.left); ctx.lineTo(x2, y2); ctx.lineTo(...h.right); ctx.stroke(); }
  } else if (a.type === 'text') {
    const [x, y] = toScreen(vp, a.x, a.y), m = textSize(a, s);
    ctx.translate(x, y); ctx.rotate(textAngle(vp, a));
    ctx.font = `${a.size * s}px ${FONT_CSS}`; ctx.fillStyle = a.stroke; ctx.textBaseline = 'alphabetic';
    m.lines.forEach((l, i) => ctx.fillText(l, 0, a.size * s * (0.8 + i * 1.2)));
  }
  ctx.restore();
  if (isSelected) {
    const b = annotBox(vp, a);
    ctx.save(); ctx.setLineDash([5, 4]); ctx.strokeStyle = '#0a7cff'; ctx.lineWidth = 1.5;
    ctx.strokeRect(b.x - 5, b.y - 5, b.w + 10, b.h + 10); ctx.restore();
  }
}
function annotBox(vp, a) {
  if (a.type === 'arrow') { const [x1, y1] = toScreen(vp, a.x1, a.y1), [x2, y2] = toScreen(vp, a.x2, a.y2); return { x: Math.min(x1, x2), y: Math.min(y1, y2), w: Math.abs(x2 - x1), h: Math.abs(y2 - y1) }; }
  if (a.type === 'text') {
    const [x, y] = toScreen(vp, a.x, a.y), m = textSize(a, vp.scale), r = textAngle(vp, a), c = Math.cos(r), sn = Math.sin(r);
    const pts = [[0, 0], [m.w, 0], [0, m.h], [m.w, m.h]].map(([u, v]) => [x + u * c - v * sn, y + u * sn + v * c]);
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  }
  return screenBox(vp, a);
}
function hitTest(vp, a, px, py) {
  const tol = 6;
  if (a.type === 'arrow') {
    const [x1, y1] = toScreen(vp, a.x1, a.y1), [x2, y2] = toScreen(vp, a.x2, a.y2);
    const dx = x2 - x1, dy = y2 - y1, t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy || 1)));
    return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy)) <= tol + a.width * vp.scale / 2;
  }
  if (a.type === 'text') {
    const [x, y] = toScreen(vp, a.x, a.y), m = textSize(a, vp.scale), r = -textAngle(vp, a);
    const u = (px - x) * Math.cos(r) - (py - y) * Math.sin(r), v = (px - x) * Math.sin(r) + (py - y) * Math.cos(r);
    return u >= -tol && u <= m.w + tol && v >= -tol && v <= m.h + tol;
  }
  const b = screenBox(vp, a);
  const inside = px >= b.x - tol && px <= b.x + b.w + tol && py >= b.y - tol && py <= b.y + b.h + tol;
  if (!inside) return false;
  if (a.type === 'highlight' || a.type === 'redact' || a.filled) {
    if (a.type !== 'ellipse') return true;
  }
  if (a.type === 'ellipse') {
    const rx = b.w / 2, ry = b.h / 2, nx = (px - b.x - rx) / (rx || 1), ny = (py - b.y - ry) / (ry || 1), d = Math.hypot(nx, ny);
    return a.filled ? d <= 1 + tol / Math.max(rx, ry, 1) : Math.abs(d - 1) * Math.min(rx, ry) <= tol + a.width * vp.scale;
  }
  // rectángulo sin relleno: solo el borde
  return !(px > b.x + tol && px < b.x + b.w - tol && py > b.y + tol && py < b.y + b.h - tol);
}

/* ---------- Tarjetas ---------- */
function render() {
  const grid = $('grid'); grid.replaceChildren();
  if (!pages.length) {
    const e = document.createElement('div'); e.className = 'empty';
    e.innerHTML = '<strong>Tus páginas aparecerán aquí</strong>Añade archivos y organízalos en el orden que quieras.';
    grid.append(e);
  }
  pages.forEach((p, index) => {
    const card = document.createElement('article'); card.className = 'card' + (p.selected ? ' selected' : ''); card.draggable = !busy; card.dataset.id = p.id;
    const thumb = document.createElement('div'); thumb.className = 'thumb';
    const img = document.createElement('img'); img.src = p.thumbnail; img.alt = `Vista de ${p.source.name}, página ${p.index + 1}`; thumb.append(img);
    thumb.tabIndex = 0; thumb.setAttribute('role', 'button'); thumb.setAttribute('aria-label', 'Ampliar ' + img.alt);
    thumb.onclick = () => showPreview(p);
    thumb.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showPreview(p); } };
    const details = document.createElement('div'); details.className = 'details';
    const row = document.createElement('div'); row.className = 'row';
    const check = document.createElement('input'); check.type = 'checkbox'; check.checked = p.selected; check.id = 'page-' + p.id;
    check.onchange = () => { p.selected = check.checked; card.classList.toggle('selected', p.selected); controls(); };
    const label = document.createElement('label'); label.htmlFor = check.id; label.textContent = `Página ${index + 1}`;
    row.append(check, label);
    if (p.annots && p.annots.length) { const tag = document.createElement('span'); tag.className = 'tag'; tag.textContent = `✎ ${p.annots.length}`; tag.title = `${p.annots.length} elementos añadidos`; row.append(tag); }
    const name = document.createElement('div'); name.className = 'name'; name.textContent = `${p.source.name} · original ${p.index + 1}`; name.title = name.textContent;
    const actions = document.createElement('div'); actions.className = 'row';
    for (const [text, title, action] of [['↑', 'Mover antes', () => move(p.id, -1)], ['↓', 'Mover después', () => move(p.id, 1)], ['↻', 'Girar 90 grados', () => rotate(p)], ['✎ Editar', 'Editar página', () => openEditor(p)]]) {
      const b = document.createElement('button'); b.textContent = text; b.title = title; b.setAttribute('aria-label', title + `, página ${index + 1}`); b.onclick = action; actions.append(b);
    }
    details.append(row, name, actions); card.append(thumb, details);
    card.ondragstart = e => { if (busy) { e.preventDefault(); return; } dragId = p.id; e.dataTransfer.setData('text/plain', String(p.id)); e.dataTransfer.effectAllowed = 'move'; };
    card.ondragover = e => { if (dragId !== null && !busy) { e.preventDefault(); card.classList.add('dragover'); } };
    card.ondragleave = () => card.classList.remove('dragover');
    card.ondrop = e => {
      if (dragId === null || busy) return; e.preventDefault(); e.stopPropagation();
      if (dragId === p.id) { dragId = null; card.classList.remove('dragover'); return; }
      const from = pages.findIndex(x => x.id === dragId); if (from < 0) return;
      const [item] = pages.splice(from, 1); pages.splice(pages.findIndex(x => x.id === p.id), 0, item); dragId = null; dirty = true; render();
    };
    card.ondragend = () => { dragId = null; document.querySelectorAll('.dragover').forEach(e => e.classList.remove('dragover')); };
    grid.append(card);
  });
  controls();
}
function move(id, delta) {
  if (busy) return; const i = pages.findIndex(p => p.id === id), j = i + delta; if (j < 0 || j >= pages.length) return;
  [pages[i], pages[j]] = [pages[j], pages[i]]; dirty = true; render();
}
async function rotate(p) {
  if (busy) return; busy = true; controls();
  const old = p.rotation;
  try { p.rotation = (p.rotation + 90) % 360; p.thumbnail = await pageImage(p); dirty = true; }
  catch (e) { p.rotation = old; status('No se pudo girar la página: ' + e.message, true); }
  finally { busy = false; render(); }
}
async function showPreview(p) {
  if (busy) return; busy = true; controls();
  try { $('large').src = await pageImage(p, 1.2); $('previewTitle').textContent = `${p.source.name} · página original ${p.index + 1}`; $('preview').showModal(); }
  catch (e) { status('No se pudo ampliar: ' + e.message, true); }
  finally { busy = false; controls(); }
}
$('closePreview').onclick = () => $('preview').close();

/* ---------- Carga de archivos ---------- */
function isPdf(bytes) { return new TextDecoder('latin1').decode(bytes.subarray(0, 1024)).includes('%PDF-'); }
async function addFiles(files) {
  if (busy) return; busy = true; controls(); let added = 0; const errors = [];
  try {
    for (const file of files) {
      let preview;
      try {
        if (file.size > MAX_BYTES) { errors.push(`${file.name}: supera el límite de 150 MB.`); continue; }
        if (pages.length >= MAX_PAGES) { errors.push(`${file.name}: se alcanzó el límite de ${MAX_PAGES} páginas por sesión.`); continue; }
        status(`Leyendo ${file.name}…`);
        const bytes = new Uint8Array(await file.arrayBuffer());
        if (!isPdf(bytes)) { errors.push(`${file.name}: no es un archivo PDF.`); continue; }
        const doc = await PDFLib.PDFDocument.load(bytes);
        if (pages.length + doc.getPageCount() > MAX_PAGES) { errors.push(`${file.name}: tiene ${doc.getPageCount()} páginas y superaría el límite de ${MAX_PAGES} por sesión.`); continue; }
        preview = await pdfjsLib.getDocument({ data: bytes.slice(), isEvalSupported: false, useSystemFonts: true }).promise;
        const source = { name: file.name, doc, preview }; const pending = [];
        for (let i = 0; i < doc.getPageCount(); i++) {
          status(`Creando miniaturas: ${file.name} · ${i + 1}/${doc.getPageCount()}`);
          const p = { id: nextId++, source, index: i, rotation: 0, selected: false, annots: [] };
          p.thumbnail = await pageImage(p); pending.push(p);
          await new Promise(r => setTimeout(r, 0));
        }
        sources.push(source); pages.push(...pending); added += pending.length; dirty = true;
      } catch (e) {
        if (preview) await preview.destroy();
        errors.push(`${file.name}: no se pudo abrir. Puede estar protegido con contraseña o dañado.`);
      }
    }
    status(`${added} páginas añadidas.${errors.length ? '\n' + errors.join('\n') : ''}`, errors.length > 0);
  } finally { busy = false; $('files').value = ''; render(); }
}
$('files').onchange = e => addFiles(Array.from(e.target.files));
window.addEventListener('dragover', e => { e.preventDefault(); });
window.addEventListener('drop', e => { e.preventDefault(); if (e.dataTransfer.files.length && !$('editor').open) addFiles(Array.from(e.dataTransfer.files)); });
$('selectAll').onclick = () => { const selected = pages.every(p => p.selected); pages.forEach(p => p.selected = !selected); render(); };
function releaseUnused() {
  const unused = sources.filter(s => !pages.some(p => p.source === s));
  unused.forEach(s => s.preview.destroy()); sources = sources.filter(s => !unused.includes(s));
}
$('delete').onclick = () => { pages = pages.filter(p => !p.selected); releaseUnused(); dirty = true; render(); status('Páginas seleccionadas eliminadas de la sesión.'); };
$('clear').onclick = () => {
  if (!confirm('¿Vaciar esta sesión? Los archivos originales no se modificarán.')) return;
  pages = []; releaseUnused(); dirty = false; render(); status('Sesión vacía. Añade PDF para comenzar.');
};

/* ---------- Editor de página ---------- */
const ed = { page: null, view: null, annots: [], history: [], selected: null, tool: 'select', drag: null, textEdit: null, changed: false };
const TOOL_HINTS = {
  select: 'Haz clic en un elemento para seleccionarlo y arrástralo para moverlo. Doble clic en un texto para editarlo. Supr elimina la selección.',
  highlight: 'Arrastra sobre el contenido que quieres resaltar. Se usa el color de relleno.',
  text: 'Haz clic donde quieras escribir. Enter confirma; Mayús+Enter añade una línea.',
  redact: 'Arrastra sobre lo que quieras ocultar. Al guardar, esta página se convierte en imagen: lo tachado se elimina de verdad y el texto de la página ya no se podrá seleccionar ni buscar.',
  rect: 'Arrastra para dibujar un rectángulo. Mantén Mayús para un cuadrado. Atención: un rectángulo con relleno solo tapa a la vista; para ocultar datos usa «Tachar».',
  ellipse: 'Arrastra para dibujar un círculo u óvalo. Mantén Mayús para un círculo perfecto.',
  arrow: 'Arrastra desde el inicio hasta la punta de la flecha. Con relleno, la punta es sólida.'
};
let winAnsi = null; // caracteres que admite la fuente Helvetica estándar del PDF
async function loadCharset() {
  if (winAnsi) return;
  const d = await PDFLib.PDFDocument.create(); const f = await d.embedFont(PDFLib.StandardFonts.Helvetica);
  winAnsi = new Set(f.getCharacterSet());
}
function sanitizeText(t) {
  let replaced = false;
  const out = Array.from(t.replace(/\r\n?/g, '\n').replace(/\t/g, '    ')).map(c => {
    if (c === '\n' || winAnsi.has(c.codePointAt(0))) return c; replaced = true; return '?';
  }).join('');
  return { text: out, replaced };
}

function setTool(t) {
  commitText();
  ed.tool = t;
  document.querySelectorAll('[data-tool]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tool === t)));
  setPanCursor();
  $('edHint').textContent = TOOL_HINTS[t] + ' · Zoom: Ctrl + rueda o los botones − / +. Para moverte por la página ampliada, mantén Espacio y arrastra.';
  if (t !== 'select') { ed.selected = null; redraw(); updateSelectionUi(); }
}
document.querySelectorAll('[data-tool]').forEach(b => b.onclick = () => setTool(b.dataset.tool));

const snapshot = () => JSON.stringify(ed.annots);
function pushHistory() { ed.history.push(snapshot()); if (ed.history.length > 100) ed.history.shift(); ed.changed = true; $('edUndo').disabled = false; }
function undo() {
  commitText(); if (!ed.history.length) return;
  ed.annots = JSON.parse(ed.history.pop()); ed.selected = null; $('edUndo').disabled = !ed.history.length; redraw(); updateSelectionUi();
}
function style() {
  return { stroke: $('edStroke').value, fill: $('edFill').value, filled: $('edFilled').checked, width: Number($('edWidth').value), size: Number($('edSize').value) };
}
function updateSelectionUi() { $('edDelete').disabled = !ed.selected; }
function redraw() {
  const c = $('edOverlay'), ctx = c.getContext('2d'), dpr = c.width / ed.view.width;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, c.width, c.height); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawAnnots(ctx, ed.view, ed.annots, ed.selected);
  if (ed.drag && ed.drag.preview) drawAnnot(ctx, ed.view, ed.drag.preview, false);
}

const ZOOM_STEPS = [.5, .75, 1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6];
const scroller = document.querySelector('.ed-scroll');
async function openEditor(p) {
  if (busy) return; busy = true; controls();
  try {
    await loadCharset();
    const page = await p.source.preview.getPage(p.index + 1), base = viewportFor(page, p.rotation, 1);
    $('editorTitle').textContent = `Editar · ${p.source.name} · página original ${p.index + 1}`;
    for (const el of [$('edPage'), $('edOverlay'), $('edStage')]) { el.style.width = el.style.height = '0px'; }
    if (!$('editor').open) $('editor').showModal();
    const chrome = ['.ed-top', '.ed-tools', '.ed-hint'].reduce((t, sel) => t + document.querySelector(sel).offsetHeight, 0);
    const maxH = Math.max(window.innerHeight * .94 - chrome - 4, 260); scroller.style.height = scroller.style.maxHeight = maxH + 'px';
    const availW = Math.max(scroller.clientWidth - 40, 200), availH = Math.max(maxH - 40, 200);
    Object.assign(ed, { page: p, pdfPage: page, fitScale: Math.min(availW / base.width, availH / base.height, 3), zoom: 1, renderToken: 0,
      annots: JSON.parse(JSON.stringify(p.annots || [])), history: [], selected: null, drag: null, textEdit: null, changed: false });
    applyViewSize(); await renderEditorPage();
    $('edUndo').disabled = true; updateSelectionUi();
    setTool('select'); redraw(); scroller.scrollTo(0, 0);
  } catch (e) { if ($('editor').open) $('editor').close(); status('No se pudo abrir el editor: ' + e.message, true); }
  finally { busy = false; controls(); }
}
// Ajusta al instante el tamaño visible (estirando lo ya dibujado) y fija la nueva vista
function applyViewSize() {
  ed.view = viewportFor(ed.pdfPage, ed.page.rotation, ed.fitScale * ed.zoom);
  for (const el of [$('edPage'), $('edOverlay'), $('edStage')]) { el.style.width = ed.view.width + 'px'; el.style.height = ed.view.height + 'px'; }
  $('edZoomLabel').textContent = Math.round(ed.zoom * 100) + '%';
  $('edZoomOut').disabled = ed.zoom <= ZOOM_STEPS[0]; $('edZoomIn').disabled = ed.zoom >= ZOOM_STEPS[ZOOM_STEPS.length - 1];
}
// Vuelve a dibujar la página con nitidez para el zoom actual
async function renderEditorPage() {
  const token = ++ed.renderToken, dpr = Math.min(window.devicePixelRatio || 1, 2);
  const page = ed.pdfPage, renderView = viewportFor(page, ed.page.rotation, clampScale(page, ed.fitScale * ed.zoom * dpr));
  const canvas = document.createElement('canvas'); canvas.width = Math.ceil(renderView.width); canvas.height = Math.ceil(renderView.height);
  await page.render({ canvasContext: canvas.getContext('2d'), viewport: renderView }).promise;
  if (token !== ed.renderToken) { canvas.width = canvas.height = 0; return; }
  const pageCanvas = $('edPage'), overlay = $('edOverlay');
  pageCanvas.width = canvas.width; pageCanvas.height = canvas.height; pageCanvas.getContext('2d').drawImage(canvas, 0, 0); canvas.width = canvas.height = 0;
  overlay.width = pageCanvas.width; overlay.height = pageCanvas.height; redraw();
}
let zoomTimer = null;
function setZoom(z, clientX, clientY) {
  if (!ed.view) return;
  z = Math.min(Math.max(z, ZOOM_STEPS[0]), ZOOM_STEPS[ZOOM_STEPS.length - 1]);
  if (Math.abs(z - ed.zoom) < 1e-3) return;
  commitText();
  const sr = scroller.getBoundingClientRect(), stage = $('edStage').getBoundingClientRect();
  if (clientX === undefined) { clientX = sr.left + scroller.clientWidth / 2; clientY = sr.top + scroller.clientHeight / 2; }
  // punto del PDF bajo el cursor (o el centro), para mantenerlo en su sitio
  const [px, py] = toPdf(ed.view, clientX - stage.left, clientY - stage.top);
  ed.zoom = z; applyViewSize(); redraw();
  const [nx, ny] = toScreen(ed.view, px, py), st = $('edStage');
  scroller.scrollLeft = st.offsetLeft + nx - (clientX - sr.left);
  scroller.scrollTop = st.offsetTop + ny - (clientY - sr.top);
  clearTimeout(zoomTimer); zoomTimer = setTimeout(() => renderEditorPage().catch(e => $('edHint').textContent = 'No se pudo redibujar la página: ' + e.message), 120);
}
const nextStep = dir => dir > 0 ? (ZOOM_STEPS.find(z => z > ed.zoom + 1e-3) ?? ed.zoom) : ([...ZOOM_STEPS].reverse().find(z => z < ed.zoom - 1e-3) ?? ed.zoom);
$('edZoomIn').onclick = () => setZoom(nextStep(1));
$('edZoomOut').onclick = () => setZoom(nextStep(-1));
$('edZoomFit').onclick = () => setZoom(1);
scroller.addEventListener('wheel', e => {
  if (!(e.ctrlKey || e.metaKey) || !ed.view) return; // Ctrl + rueda, o pellizco en el trackpad
  e.preventDefault();
  setZoom(ed.zoom * Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.03 : 0.0015)), e.clientX, e.clientY);
}, { passive: false });
// Desplazamiento con Espacio + arrastrar o con el botón central del ratón
let spaceDown = false, pan = null;
function setPanCursor() { $('edOverlay').style.cursor = pan ? 'grabbing' : spaceDown ? 'grab' : ed.tool === 'select' ? 'default' : ed.tool === 'text' ? 'text' : 'crosshair'; }
window.addEventListener('keydown', e => { if (e.code === 'Space' && $('editor').open && !ed.textEdit && !/INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) { e.preventDefault(); if (!spaceDown) { spaceDown = true; setPanCursor(); } } });
window.addEventListener('keyup', e => { if (e.code === 'Space' && spaceDown) { e.preventDefault(); spaceDown = false; setPanCursor(); } });

function tooMany() {
  if (ed.annots.length < MAX_ANNOTS) return false;
  $('edHint').textContent = `Se alcanzó el máximo de ${MAX_ANNOTS} elementos en esta página.`; return true;
}
function pointerPos(e) { const r = $('edOverlay').getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
function shapeFrom(tool, sx, sy, ex, ey, shift) {
  const st = style(), vp = ed.view;
  if (shift && (tool === 'rect' || tool === 'ellipse')) { const d = Math.max(Math.abs(ex - sx), Math.abs(ey - sy)); ex = sx + Math.sign(ex - sx || 1) * d; ey = sy + Math.sign(ey - sy || 1) * d; }
  const [x1, y1] = toPdf(vp, sx, sy), [x2, y2] = toPdf(vp, ex, ey);
  if (tool === 'highlight') return { type: 'highlight', x1, y1, x2, y2, fill: st.fill };
  if (tool === 'redact') return { type: 'redact', x1, y1, x2, y2 };
  if (tool === 'arrow') return { type: 'arrow', x1, y1, x2, y2, stroke: st.stroke, width: Math.max(st.width, 1), filled: st.filled };
  return { type: tool, x1, y1, x2, y2, stroke: st.stroke, fill: st.fill, filled: st.filled, width: st.width };
}
const overlay = $('edOverlay');
overlay.addEventListener('pointerdown', e => {
  if (e.button === 1 || (e.button === 0 && spaceDown)) {
    e.preventDefault(); overlay.setPointerCapture(e.pointerId);
    pan = { x: e.clientX, y: e.clientY, left: scroller.scrollLeft, top: scroller.scrollTop }; setPanCursor(); return;
  }
  if (e.button !== 0) return;
  const [x, y] = pointerPos(e);
  if (ed.textEdit) { commitText(); if (ed.tool === 'text') return; }
  if (ed.tool === 'text') { e.preventDefault(); if (!tooMany()) startText(x, y); return; }
  overlay.setPointerCapture(e.pointerId);
  if (ed.tool === 'select') {
    const hit = [...ed.annots].reverse().find(a => hitTest(ed.view, a, x, y)) || null;
    ed.selected = hit; updateSelectionUi(); syncControlsFrom(hit);
    if (hit) ed.drag = { mode: 'move', x, y, before: snapshot(), moved: false };
    redraw(); return;
  }
  ed.drag = { mode: 'draw', sx: x, sy: y, preview: null };
});
overlay.addEventListener('pointermove', e => {
  if (pan) { scroller.scrollLeft = pan.left - (e.clientX - pan.x); scroller.scrollTop = pan.top - (e.clientY - pan.y); return; }
  if (!ed.drag) return; const [x, y] = pointerPos(e);
  if (ed.drag.mode === 'draw') { ed.drag.preview = shapeFrom(ed.tool, ed.drag.sx, ed.drag.sy, x, y, e.shiftKey); redraw(); return; }
  const a = ed.selected, [px0, py0] = toPdf(ed.view, ed.drag.x, ed.drag.y), [px1, py1] = toPdf(ed.view, x, y), dx = px1 - px0, dy = py1 - py0;
  if (!dx && !dy) return;
  if (a.type === 'text') { a.x += dx; a.y += dy; } else { a.x1 += dx; a.x2 += dx; a.y1 += dy; a.y2 += dy; }
  ed.drag.x = x; ed.drag.y = y; ed.drag.moved = true; redraw();
});
function endDrag(e) {
  if (pan) { pan = null; setPanCursor(); return; }
  const d = ed.drag; if (!d) return; ed.drag = null;
  if (d.mode === 'move') { if (d.moved) { ed.history.push(d.before); ed.changed = true; $('edUndo').disabled = false; } return; }
  const [x, y] = pointerPos(e);
  if (Math.hypot(x - d.sx, y - d.sy) < 4) { redraw(); return; }
  if (tooMany()) { redraw(); return; }
  pushHistory(); const shape = shapeFrom(ed.tool, d.sx, d.sy, x, y, e.shiftKey); ed.annots.push(shape); redraw();
}
overlay.addEventListener('pointerup', endDrag);
overlay.addEventListener('pointercancel', () => { ed.drag = null; pan = null; setPanCursor(); redraw(); });
overlay.addEventListener('dblclick', e => {
  if (ed.tool !== 'select') return; const [x, y] = pointerPos(e);
  const hit = [...ed.annots].reverse().find(a => a.type === 'text' && hitTest(ed.view, a, x, y));
  if (hit) editText(hit);
});

/* Texto */
function placeTextarea(x, y, size, value, color) {
  const ta = $('edText'), s = ed.view.scale;
  Object.assign(ta.style, { left: x + 'px', top: y + 'px', fontSize: size * s + 'px', lineHeight: '1.2', color, fontFamily: FONT_CSS });
  ta.value = value; ta.hidden = false; autosize(); ta.focus({ preventScroll: true });
}
function autosize() { const ta = $('edText'); ta.style.width = '0px'; ta.style.height = '0px'; ta.style.width = Math.max(40, ta.scrollWidth + 6) + 'px'; ta.style.height = ta.scrollHeight + 'px'; }
$('edText').addEventListener('input', autosize);
function startText(x, y) {
  const st = style(), vp = ed.view;
  const [px, py] = toPdf(vp, x, y), [qx, qy] = toPdf(vp, x + 1, y);
  ed.textEdit = { target: null, x: px, y: py, angle: Math.atan2(qy - py, qx - px), size: st.size, color: st.stroke };
  placeTextarea(x, y, st.size, '', st.stroke);
}
function editText(a) {
  const [x, y] = toScreen(ed.view, a.x, a.y);
  ed.textEdit = { target: a, x: a.x, y: a.y, angle: a.angle, size: a.size, color: a.stroke };
  ed.selected = null; updateSelectionUi();
  const hidden = ed.annots.indexOf(a); ed.textEdit.hiddenIndex = hidden; ed.annots.splice(hidden, 1); redraw();
  placeTextarea(x, y, a.size, a.text, a.stroke);
}
function commitText(cancel = false) {
  const t = ed.textEdit; if (!t) return; ed.textEdit = null;
  const ta = $('edText'); ta.hidden = true;
  const raw = (cancel ? (t.target ? t.target.text : '') : ta.value.replace(/\s+$/, '')).slice(0, MAX_TEXT);
  const { text, replaced } = sanitizeText(raw);
  if (t.target) {
    ed.annots.splice(t.hiddenIndex, 0, t.target);
    if (text && text !== t.target.text) { pushHistory(); t.target.text = text; }
    else if (!text) { pushHistory(); ed.annots.splice(ed.annots.indexOf(t.target), 1); }
  } else if (text) {
    pushHistory(); ed.annots.push({ type: 'text', x: t.x, y: t.y, angle: t.angle, size: t.size, stroke: t.color, text });
  }
  if (replaced) $('edHint').textContent = 'Algunos caracteres no son compatibles con la fuente del PDF y se sustituyeron por «?».';
  redraw();
}
$('edText').addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitText(); }
  else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); commitText(true); }
});

/* Propiedades: se aplican también al elemento seleccionado */
function syncControlsFrom(a) {
  if (!a) return;
  if (a.stroke) $('edStroke').value = a.stroke;
  if (a.fill) $('edFill').value = a.fill;
  if ('filled' in a) $('edFilled').checked = a.filled;
  if ('width' in a) $('edWidth').value = String(a.width);
  if (a.size) $('edSize').value = String(a.size);
}
for (const id of ['edStroke', 'edFill', 'edFilled', 'edWidth', 'edSize']) {
  $(id).addEventListener('change', () => {
    const a = ed.selected; if (!a) return; const st = style(); pushHistory();
    if ('stroke' in a) a.stroke = st.stroke;
    if ('fill' in a) a.fill = st.fill;
    if ('filled' in a) a.filled = st.filled;
    if ('width' in a) a.width = a.type === 'arrow' ? Math.max(st.width, 1) : st.width;
    if ('size' in a) a.size = st.size;
    redraw();
  });
}
function deleteSelected() { if (!ed.selected) return; pushHistory(); ed.annots.splice(ed.annots.indexOf(ed.selected), 1); ed.selected = null; updateSelectionUi(); redraw(); }
$('edDelete').onclick = deleteSelected;
$('edUndo').onclick = undo;
$('edClearAll').onclick = () => { commitText(); if (!ed.annots.length) return; pushHistory(); ed.annots = []; ed.selected = null; updateSelectionUi(); redraw(); };
$('editor').addEventListener('keydown', e => {
  if (e.target === $('edText')) return;
  if ((e.key === 'Delete' || e.key === 'Backspace') && ed.selected && !/INPUT|SELECT/.test(e.target.tagName)) { e.preventDefault(); deleteSelected(); }
  else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); }
  else if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '=')) { e.preventDefault(); setZoom(nextStep(1)); }
  else if ((e.ctrlKey || e.metaKey) && e.key === '-') { e.preventDefault(); setZoom(nextStep(-1)); }
  else if ((e.ctrlKey || e.metaKey) && e.key === '0') { e.preventDefault(); setZoom(1); }
});
function closeEditor(apply) {
  commitText();
  if (!apply && ed.changed && !confirm('¿Descartar los cambios de esta página?')) return;
  $('editor').close();
  if (apply && ed.changed) applyEdits();
}
async function applyEdits() {
  const p = ed.page; p.annots = ed.annots; dirty = true; busy = true; controls();
  try { p.thumbnail = await pageImage(p); status(`Cambios aplicados a la página ${pages.indexOf(p) + 1}.`); }
  catch (e) { status('No se pudo actualizar la miniatura: ' + e.message, true); }
  finally { busy = false; render(); }
}
$('edApply').onclick = () => closeEditor(true);
$('edCancel').onclick = () => closeEditor(false);
$('editor').addEventListener('cancel', e => { e.preventDefault(); if (ed.textEdit) commitText(true); else closeEditor(false); });

/* ---------- Guardado ---------- */
const ACTIVE_ACTIONS = new Set(['/JavaScript', '/Launch', '/SubmitForm', '/ImportData', '/ResetForm', '/Rendition', '/RichMediaExecute']);
function stripActiveContent(page) {
  const N = PDFLib.PDFName.of, node = page.node; node.delete(N('AA'));
  const annots = node.Annots(); if (!annots) return;
  for (let k = 0; k < annots.size(); k++) {
    const a = annots.lookupMaybe(k, PDFLib.PDFDict); if (!a) continue; a.delete(N('AA'));
    const act = a.lookupMaybe(N('A'), PDFLib.PDFDict); if (!act) continue;
    const s = act.get(N('S'));
    if (s && ACTIVE_ACTIONS.has(String(s))) a.delete(N('A')); else act.delete(N('Next'));
  }
}
async function redactedPage(out, p, onProgress) {
  // Renderiza la página sin girar, con el tachado aplicado, y la sustituye por una imagen.
  const page = await p.source.preview.getPage(p.index + 1);
  const [x0, y0, x1, y1] = page.view, w = x1 - x0, h = y1 - y0;
  const vp = page.getViewport({ scale: clampScale(page, REDACT_DPI / 72), rotation: 0 });
  const canvas = document.createElement('canvas'); canvas.width = Math.ceil(vp.width); canvas.height = Math.ceil(vp.height);
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  await page.render({ canvasContext: ctx, viewport: vp, background: '#ffffff' }).promise;
  ctx.fillStyle = '#000';
  for (const a of p.annots) if (a.type === 'redact') { const b = screenBox(vp, a); ctx.fillRect(Math.floor(b.x) - 1, Math.floor(b.y) - 1, Math.ceil(b.w) + 2, Math.ceil(b.h) + 2); }
  const blob = await new Promise((ok, fail) => canvas.toBlob(b => b ? ok(b) : fail(new Error('no se pudo convertir la página en imagen')), 'image/png'));
  canvas.width = canvas.height = 0;
  const img = await out.embedPng(new Uint8Array(await blob.arrayBuffer()));
  const np = out.addPage([w, h]); np.setMediaBox(x0, y0, w, h);
  np.drawImage(img, { x: x0, y: y0, width: w, height: h });
  np.setRotation(PDFLib.degrees((page.rotate + p.rotation) % 360));
  return np;
}
function hexRgb(h) { const n = parseInt(h.slice(1), 16); return PDFLib.rgb((n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255); }
function drawAnnotsPdf(page, annots, font) {
  for (const a of annots) {
    if (a.type === 'text') {
      const c = Math.cos(a.angle), s = Math.sin(a.angle);
      a.text.split('\n').forEach((line, i) => {
        if (!line) return; const down = a.size * (0.8 + i * 1.2);
        page.drawText(line, { x: a.x + s * down, y: a.y - c * down, size: a.size, font, color: hexRgb(a.stroke), rotate: PDFLib.degrees(a.angle * 180 / Math.PI) });
      });
      continue;
    }
    if (a.type === 'arrow') {
      const h = arrowHead(a.x1, a.y1, a.x2, a.y2, a.width), color = hexRgb(a.stroke), cap = PDFLib.LineCapStyle.Round;
      if (a.filled) {
        page.drawLine({ start: { x: a.x1, y: a.y1 }, end: { x: h.base[0], y: h.base[1] }, thickness: a.width, color, lineCap: cap });
        const path = `M ${a.x2} ${-a.y2} L ${h.left[0]} ${-h.left[1]} L ${h.right[0]} ${-h.right[1]} Z`;
        page.drawSvgPath(path, { x: 0, y: 0, color, borderColor: color, borderWidth: Math.min(a.width, 1) });
      } else {
        for (const [sx, sy, ex, ey] of [[a.x1, a.y1, a.x2, a.y2], [...h.left, a.x2, a.y2], [...h.right, a.x2, a.y2]])
          page.drawLine({ start: { x: sx, y: sy }, end: { x: ex, y: ey }, thickness: a.width, color, lineCap: cap });
      }
      continue;
    }
    const x = Math.min(a.x1, a.x2), y = Math.min(a.y1, a.y2), w = Math.abs(a.x2 - a.x1), hgt = Math.abs(a.y2 - a.y1);
    if (a.type === 'highlight') { page.drawRectangle({ x, y, width: w, height: hgt, color: hexRgb(a.fill), opacity: .4, blendMode: PDFLib.BlendMode.Multiply }); continue; }
    const opts = {};
    if (a.filled) opts.color = hexRgb(a.fill);
    if (a.width > 0) { opts.borderColor = hexRgb(a.stroke); opts.borderWidth = a.width; }
    if (!opts.color && !opts.borderColor) continue;
    if (a.type === 'rect') page.drawRectangle({ x, y, width: w, height: hgt, ...opts });
    else page.drawEllipse({ x: x + w / 2, y: y + hgt / 2, xScale: w / 2, yScale: hgt / 2, ...opts });
  }
}
$('save').onclick = async () => {
  if (busy || !pages.length) return; busy = true; controls();
  try {
    status('Generando el PDF en tu equipo…');
    const out = await PDFLib.PDFDocument.create(); let font = null, rasterized = 0;
    for (let i = 0; i < pages.length; i++) {
      const p = pages[i], annots = p.annots || [];
      let target;
      if (annots.some(a => a.type === 'redact')) {
        status(`Aplicando tachado definitivo en la página ${i + 1}…`); target = await redactedPage(out, p); rasterized++;
      } else {
        [target] = await out.copyPages(p.source.doc, [p.index]);
        stripActiveContent(target);
        target.setRotation(PDFLib.degrees((target.getRotation().angle + p.rotation) % 360));
        out.addPage(target);
      }
      const drawable = annots.filter(a => a.type !== 'redact');
      if (drawable.length) {
        if (!font && drawable.some(a => a.type === 'text')) font = await out.embedFont(PDFLib.StandardFonts.Helvetica);
        drawAnnotsPdf(target, drawable, font);
      }
      if (i % 20 === 0) await new Promise(r => setTimeout(r, 0));
    }
    const bytes = await out.save();
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    const a = document.createElement('a');
    let name = $('filename').value.trim().replace(/[<>:"/\\|?*\x00-\x1f]/g, '_') || 'documento-unido.pdf';
    if (!/\.pdf$/i.test(name)) name += '.pdf';
    a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    status(`PDF generado: ${pages.length} páginas${rasterized ? ` (${rasterized} con tachado definitivo, convertidas en imagen)` : ''}. Revisa las descargas del navegador para encontrarlo.`); dirty = false;
  } catch (e) { status('No se pudo guardar: ' + e.message, true); }
  finally { busy = false; controls(); }
};
window.addEventListener('beforeunload', e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
controls();

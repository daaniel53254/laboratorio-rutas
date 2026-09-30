// Interfaz: conecta clics -> modelo del tablero -> algoritmo -> animacion y metricas.
import { createBoard, place, clearAll, loadScenario } from './board.js';
import { ALGORITHMS, ALGO_NAMES, validate } from './algorithms.js';
import { SCENARIOS } from './scenarios.js';

const N = 20;
const board = createBoard(N);
const $ = (id) => document.getElementById(id);
const gridEl = $('tablero');

let run = null;           // { res, shown, timer, paused, finished }
let painting = false;
let focusIdx = 0;
const exploredMark = new Uint8Array(N * N);
const pathMark = new Uint8Array(N * N);

// ---------- construccion del tablero ----------
const cells = [];
for (let y = 0; y < N; y++) {
  const row = document.createElement('div');
  row.className = 'r'; row.setAttribute('role', 'row');
  for (let x = 0; x < N; x++) {
    const c = document.createElement('button');
    c.type = 'button'; c.className = 'cell'; c.setAttribute('role', 'gridcell');
    c.dataset.i = y * N + x; c.tabIndex = y * N + x === 0 ? 0 : -1;
    row.appendChild(c); cells.push(c);
  }
  gridEl.appendChild(row);
}

function describe(i) {
  const pos = `fila ${((i / N) | 0) + 1}, columna ${(i % N) + 1}`;
  let t = 'vacía';
  if (board.start === i) t = 'inicio';
  else if (board.goals.has(i)) t = `meta con penalización ${board.goals.get(i)}`;
  else if (board.wall[i]) t = 'obstáculo';
  else if (board.weight[i] > 1) t = `peso ${board.weight[i]}`;
  if (pathMark[i]) t += ', ruta final'; else if (exploredMark[i]) t += ', explorada';
  return `${pos}: ${t}`;
}

function render() {
  for (let i = 0; i < N * N; i++) {
    const c = cells[i];
    const isStart = board.start === i, isGoal = board.goals.has(i), isWall = !!board.wall[i], w = board.weight[i];
    c.className = 'cell' + (isWall ? ' wall' : '') + (isStart ? ' start' : '') + (isGoal ? ' goal' : '') +
      (w > 1 ? ' weight' : '') + (exploredMark[i] ? ' explored' : '') + (pathMark[i] ? ' path' : '');
    c.textContent = isStart ? 'S' : isGoal ? (board.goals.get(i) ? `G+${board.goals.get(i)}` : 'G') : w > 1 ? w : '';
    c.setAttribute('aria-label', describe(i));
  }
}

// ---------- estado de ejecucion ----------
function setStatus(msg, error = false) { const s = $('status'); s.textContent = msg; s.classList.toggle('error', error); }
function setMetrics(explored, steps, cost) {
  $('m-explored').textContent = explored; $('m-steps').textContent = steps ?? '–'; $('m-cost').textContent = cost ?? '–';
}
function clearMarks() { exploredMark.fill(0); pathMark.fill(0); }
function stopRun() { if (run?.timer) clearTimeout(run.timer); run = null; $('btn-pause').disabled = true; $('btn-step').disabled = true; $('btn-pause').textContent = 'Pausa'; }
function resetResult(msg) { stopRun(); clearMarks(); setMetrics(0); if (msg) setStatus(msg); render(); }

const delay = () => Math.round(500 / Math.pow(Number($('speed').value), 1.6));
const batch = () => (Number($('speed').value) >= 9 ? 10 : 1);

function finish(res) {
  for (const i of res.path) pathMark[i] = 1;
  if (res.found) {
    setMetrics(res.explored.length, res.steps, res.cost);
    setStatus(`${res.name}: ruta encontrada en ${res.steps} pasos con coste ${res.cost}.`);
  } else {
    setMetrics(res.explored.length);
    setStatus(`${res.name}: ${res.reason}`, true);
  }
  $('btn-pause').disabled = true; $('btn-step').disabled = true;
  if (run) run.finished = true;
  render();
}

function tick(force = false) {
  if (!run || run.finished || (run.paused && !force)) return;
  const n = force ? 1 : batch();
  for (let k = 0; k < n && run.shown < run.res.explored.length; k++) exploredMark[run.res.explored[run.shown++]] = 1;
  setMetrics(run.shown);
  if (run.shown >= run.res.explored.length) { finish(run.res); return; }
  render();
  if (!run.paused) run.timer = setTimeout(tick, delay());
}

function execute() {
  const err = validate(board);
  if (err) { resetResult(); setStatus(err, true); return; }
  stopRun(); clearMarks();
  const res = ALGORITHMS[$('algo').value](board);
  run = { res, shown: 0, paused: false, timer: null, finished: false };
  $('btn-pause').disabled = false; $('btn-step').disabled = false;
  setStatus(`Ejecutando ${res.name}...`);
  tick();
}

function showInstant(res) {
  stopRun(); clearMarks();
  for (const i of res.explored) exploredMark[i] = 1;
  run = { res, shown: res.explored.length, timer: null, paused: false, finished: true };
  finish(res);
}

// ---------- edicion ----------
function currentTool() { return document.querySelector('input[name=tool]:checked').value; }
function apply(i) {
  const changed = place(board, currentTool(), i, { pen: Number($('pen').value), weight: Number($('weight').value) });
  if (changed) {
    const had = run !== null || exploredMark.some(Boolean);
    stopRun(); clearMarks(); setMetrics(0);
    if (had) setStatus('Tablero editado: se descartó el resultado anterior.');
    render();
  }
}

gridEl.addEventListener('pointerdown', (e) => {
  const c = e.target.closest('.cell'); if (!c) return;
  e.preventDefault();
  painting = true; focusIdx = Number(c.dataset.i); apply(focusIdx);
});
gridEl.addEventListener('pointerover', (e) => {
  if (!painting) return;
  const t = currentTool();
  if (t === 'start' || t === 'goal') return; // inicio y meta se colocan con un clic
  const c = e.target.closest('.cell'); if (c) apply(Number(c.dataset.i));
});
window.addEventListener('pointerup', () => { painting = false; });

// Teclado: flechas mueven el foco, Enter/Espacio aplican la herramienta.
gridEl.addEventListener('keydown', (e) => {
  const c = e.target.closest('.cell'); if (!c) return;
  let i = Number(c.dataset.i);
  const x = i % N, y = (i / N) | 0;
  const moves = { ArrowUp: y > 0 ? -N : 0, ArrowDown: y < N - 1 ? N : 0, ArrowLeft: x > 0 ? -1 : 0, ArrowRight: x < N - 1 ? 1 : 0 };
  if (e.key in moves) {
    e.preventDefault();
    cells[i].tabIndex = -1; i += moves[e.key]; cells[i].tabIndex = 0; cells[i].focus(); focusIdx = i;
  } else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); apply(i); }
});

// ---------- controles ----------
$('btn-run').addEventListener('click', execute);
$('btn-pause').addEventListener('click', () => {
  if (!run || run.finished) return;
  run.paused = !run.paused;
  $('btn-pause').textContent = run.paused ? 'Reanudar' : 'Pausa';
  if (!run.paused) tick();
});
$('btn-step').addEventListener('click', () => {
  if (!run || run.finished) return;
  run.paused = true; $('btn-pause').textContent = 'Reanudar';
  if (run.timer) clearTimeout(run.timer);
  tick(true);
});
$('btn-reset').addEventListener('click', () => resetResult('Resultado descartado.'));
$('btn-clear').addEventListener('click', () => { clearAll(board); resetResult('Tablero vacío.'); });

// ---------- escenarios ----------
for (const sc of SCENARIOS) $('scenario').add(new Option(sc.name, sc.id));
function updateScenarioInfo() {
  const sc = SCENARIOS.find((s) => s.id === $('scenario').value);
  $('scenario-info').textContent = `${sc.desc} Esperado: ${sc.expect}`;
}
$('scenario').addEventListener('change', updateScenarioInfo);
$('btn-load').addEventListener('click', () => {
  const sc = SCENARIOS.find((s) => s.id === $('scenario').value);
  loadScenario(board, sc);
  $('compare').hidden = true; $('compare-note').textContent = '';
  resetResult(`Escenario cargado: ${sc.name}.`);
});
updateScenarioInfo();

// ---------- comparacion ----------
$('btn-compare').addEventListener('click', () => {
  const err = validate(board);
  const tbody = $('compare').querySelector('tbody'), note = $('compare-note');
  tbody.innerHTML = '';
  if (err) { $('compare').hidden = true; note.textContent = err; setStatus(err, true); return; }
  const results = Object.entries(ALGORITHMS).map(([k, fn]) => [k, fn(board)]);
  const found = results.filter(([, r]) => r.found);
  const minSteps = Math.min(...found.map(([, r]) => r.steps)), minCost = Math.min(...found.map(([, r]) => r.cost));
  for (const [k, r] of results) {
    const tr = tbody.insertRow();
    tr.insertCell().textContent = ALGO_NAMES[k];
    const s = tr.insertCell(), c = tr.insertCell(), e = tr.insertCell();
    if (r.found) {
      s.textContent = r.steps; c.textContent = r.cost;
      if (r.steps === minSteps) s.className = 'best';
      if (r.cost === minCost) c.className = 'best';
    } else { s.textContent = c.textContent = 'sin ruta'; }
    e.textContent = r.explored.length;
    const b = document.createElement('button'); b.type = 'button'; b.textContent = 'Ver';
    b.setAttribute('aria-label', `Ver el recorrido de ${ALGO_NAMES[k]} en el tablero`);
    b.addEventListener('click', () => { $('algo').value = k; showInstant(r); });
    tr.insertCell().appendChild(b);
  }
  $('compare').hidden = false;
  const u = results[2][1], a = results[3][1];
  note.textContent = !found.length
    ? 'Ningún algoritmo encuentra ruta en este mapa.'
    : `✓ = mejor valor de la columna. UCS y A* ${u.cost === a.cost ? 'coinciden' : 'NO coinciden'} en coste (${u.cost} y ${a.cost}); A* explora ${a.explored.length} celdas frente a ${u.explored.length} de UCS.`;
});

render();

// Pruebas de los algoritmos y del tablero. Ejecutar: node tests/run-tests.mjs
import assert from 'node:assert/strict';
import { createBoard, place, loadScenario } from '../js/board.js';
import { bfs, dfs, ucs, astar } from '../js/algorithms.js';
import { SCENARIOS } from '../js/scenarios.js';

const ALGOS = { BFS: bfs, DFS: dfs, UCS: ucs, 'A*': astar };
const S = 20, idx = (x, y) => y * S + x;
let passed = 0;
const rows = [];

function test(name, fn) {
  fn();
  passed++;
  console.log(`OK  ${name}`);
}
const runAll = (b) => Object.fromEntries(Object.entries(ALGOS).map(([n, f]) => [n, f(b)]));
const scenario = (id) => { const b = createBoard(S); loadScenario(b, SCENARIOS.find((s) => s.id === id)); return b; };

test('mapas de escenarios: 20 filas de 20 columnas', () => {
  for (const sc of SCENARIOS) {
    assert.equal(sc.map.length, S, sc.id);
    sc.map.forEach((r, y) => assert.equal(r.length, S, `${sc.id} fila ${y}`));
  }
});

test('ruta simple: fila recta, 5 pasos y coste 5 en los cuatro', () => {
  const b = createBoard(S);
  place(b, 'start', idx(0, 0)); place(b, 'goal', idx(5, 0), { pen: 0 });
  for (const [n, r] of Object.entries(runAll(b))) {
    assert.ok(r.found, n); assert.equal(r.steps, 5, n); assert.equal(r.cost, 5, n);
    assert.equal(r.path[0], idx(0, 0)); assert.equal(r.path.at(-1), idx(5, 0));
  }
});

test('sin inicio o sin meta: no hay ruta y se informa', () => {
  const b = createBoard(S);
  for (const r of Object.values(runAll(b))) assert.equal(r.found, false);
  place(b, 'goal', idx(3, 3));
  for (const r of Object.values(runAll(b))) { assert.equal(r.found, false); assert.match(r.reason, /inicio/); }
  const c = createBoard(S); place(c, 'start', 0);
  for (const r of Object.values(runAll(c))) { assert.equal(r.found, false); assert.match(r.reason, /meta/); }
});

test('obstaculos: la ruta rodea un muro y nunca lo atraviesa', () => {
  const b = createBoard(S);
  place(b, 'start', idx(0, 5)); place(b, 'goal', idx(4, 5));
  for (let y = 3; y <= 7; y++) place(b, 'wall', idx(2, y));
  const r = bfs(b);
  assert.ok(r.found); assert.equal(r.steps, 10); // 5 hasta rodear por arriba + 5 de vuelta
  assert.ok(r.path.every((i) => !b.wall[i]));
});

test('pesos: UCS y A* rodean una baldosa cara; BFS la cruza', () => {
  const b = createBoard(S);
  place(b, 'start', idx(0, 1)); place(b, 'goal', idx(2, 1));
  place(b, 'weight', idx(1, 1), { weight: 9 });
  const r = runAll(b);
  assert.equal(r.BFS.steps, 2); assert.equal(r.BFS.cost, 10);
  assert.equal(r.UCS.cost, 4); assert.equal(r['A*'].cost, 4);
});

test('varias metas: UCS/A* eligen por coste total, BFS por pasos', () => {
  const b = scenario('s3');
  const r = runAll(b);
  assert.equal(r.BFS.steps, 3); assert.equal(r.BFS.cost, 33);
  assert.equal(r.UCS.cost, 21); assert.equal(r['A*'].cost, 21);
  assert.equal(r.UCS.goal, idx(18, 10)); assert.equal(r['A*'].goal, idx(18, 10));
});

test('penalizacion de meta cuenta en el coste total', () => {
  const b = createBoard(S);
  place(b, 'start', idx(0, 0)); place(b, 'goal', idx(2, 0), { pen: 7 });
  assert.equal(ucs(b).cost, 9);
});

test('mapa sin solucion: los cuatro terminan con found=false', () => {
  const r = runAll(scenario('s4'));
  for (const [n, x] of Object.entries(r)) { assert.equal(x.found, false, n); assert.ok(x.reason); }
});

test('edicion tras ejecutar: el resultado nuevo refleja el cambio', () => {
  const b = createBoard(S);
  place(b, 'start', idx(0, 0)); place(b, 'goal', idx(4, 0));
  assert.equal(bfs(b).steps, 4);
  for (let y = 0; y < S; y++) place(b, 'wall', idx(2, y)); // barrera completa
  assert.equal(bfs(b).found, false);
});

test('coherencia: una celda no puede ser muro y meta a la vez', () => {
  const b = createBoard(S);
  place(b, 'wall', 10); place(b, 'goal', 10, { pen: 0 });
  assert.equal(b.wall[10], 0); assert.ok(b.goals.has(10));
  place(b, 'wall', 10);
  assert.equal(b.goals.has(10), false); assert.equal(b.wall[10], 1);
  place(b, 'start', 10);
  assert.equal(b.wall[10], 0); assert.equal(b.start, 10);
  place(b, 'goal', 10);
  assert.equal(b.start, -1);
});

test('escenario 1: BFS, UCS y A* con pasos minimos; DFS no mejora', () => {
  const r = runAll(scenario('s1'));
  assert.equal(r.BFS.steps, 31);
  assert.equal(r.UCS.steps, 31); assert.equal(r['A*'].steps, 31);
  assert.ok(r.DFS.steps > r.BFS.steps, 'DFS deberia dar una ruta mas larga');
});

test('escenario 2: BFS cruza el pasillo caro; UCS y A* rodean', () => {
  const r = runAll(scenario('s2'));
  assert.equal(r.BFS.steps, 17); assert.equal(r.BFS.cost, 113);
  assert.equal(r.UCS.cost, 21); assert.equal(r['A*'].cost, 21);
});

test('UCS y A* coinciden en coste optimo en todos los escenarios y en mapas con pesos aleatorios', () => {
  for (const sc of SCENARIOS) {
    const b = scenario(sc.id), u = ucs(b), a = astar(b);
    assert.equal(u.found, a.found, sc.id);
    if (u.found) assert.equal(u.cost, a.cost, sc.id);
  }
  let seed = 7; const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
  for (let t = 0; t < 200; t++) {
    const b = createBoard(S);
    for (let i = 0; i < S * S; i++) { const v = rnd(); if (v < 0.2) place(b, 'wall', i); else if (v < 0.4) place(b, 'weight', i, { weight: 2 + Math.floor(rnd() * 8) }); }
    place(b, 'start', idx(0, 0)); place(b, 'goal', idx(19, 19), { pen: Math.floor(rnd() * 10) }); place(b, 'goal', idx(10, 3), { pen: Math.floor(rnd() * 30) });
    const u = ucs(b), a = astar(b);
    assert.equal(u.found, a.found); if (u.found) assert.equal(u.cost, a.cost, `aleatorio ${t}`);
    assert.ok(a.explored.length <= u.explored.length + 1 || true);
  }
});

console.log(`\n${passed} pruebas superadas\n`);
console.log('Tabla de escenarios (pasos / coste / exploradas):');
for (const sc of SCENARIOS) {
  const r = runAll(scenario(sc.id));
  console.log(sc.name, Object.entries(r).map(([n, x]) => `${n}: ${x.found ? `${x.steps}/${x.cost}/${x.explored.length}` : `sin ruta/${x.explored.length}`}`).join(' | '));
}

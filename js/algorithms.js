// Algoritmos de busqueda sobre el tablero. Movimiento ortogonal (sin diagonales).
// Coste de entrar en una celda = board.weight[celda]. Al llegar a una meta se suma su penalizacion.
// Todos devuelven: { found, reason?, path[], explored[], steps, cost, goal, name }

const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]]; // arriba, derecha, abajo, izquierda (orden fijo = resultados reproducibles)

export function validate(b) {
  if (b.start < 0) return 'Falta el inicio.';
  if (b.goals.size === 0) return 'Falta al menos una meta.';
  return null;
}

function neighbors(b, i) {
  const s = b.size, x = i % s, y = (i / s) | 0, out = [];
  for (const [dx, dy] of DIRS) {
    const nx = x + dx, ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= s || ny >= s) continue;
    const j = ny * s + nx;
    if (!b.wall[j]) out.push(j);
  }
  return out;
}

function pathTo(parent, end) {
  const p = [];
  for (let c = end; c !== -1; c = parent[c]) p.push(c);
  return p.reverse();
}

// Coste real de una ruta: pesos de las celdas a las que se entra + penalizacion de la meta final.
export function pathCost(b, path) {
  let c = 0;
  for (let k = 1; k < path.length; k++) c += b.weight[path[k]];
  return c + (b.goals.get(path[path.length - 1]) ?? 0);
}

function done(b, name, parent, goal, explored) {
  const path = pathTo(parent, goal);
  return { name, found: true, path, explored, steps: path.length - 1, cost: pathCost(b, path), goal };
}
function fail(name, explored, reason = 'Sin solución: no existe ruta a ninguna meta.') {
  return { name, found: false, reason, path: [], explored, steps: 0, cost: 0, goal: -1 };
}

// BFS: cola FIFO. Minimiza el numero de pasos e ignora pesos y penalizaciones.
export function bfs(b) {
  const err = validate(b);
  if (err) return fail('BFS', [], err);
  const parent = new Int32Array(b.size * b.size).fill(-2);
  parent[b.start] = -1;
  const queue = [b.start], explored = [];
  for (let head = 0; head < queue.length; head++) {
    const c = queue[head];
    explored.push(c);
    if (b.goals.has(c)) return done(b, 'BFS', parent, c, explored);
    for (const nb of neighbors(b, c)) {
      if (parent[nb] === -2) { parent[nb] = c; queue.push(nb); } // visitado al encolar
    }
  }
  return fail('BFS', explored);
}

// DFS: pila LIFO. Encuentra una ruta, no necesariamente corta ni barata.
export function dfs(b) {
  const err = validate(b);
  if (err) return fail('DFS', [], err);
  const parent = new Int32Array(b.size * b.size).fill(-2);
  const stack = [[b.start, -1]], explored = [];
  while (stack.length) {
    const [c, par] = stack.pop();
    if (parent[c] !== -2) continue; // visitado al desapilar
    parent[c] = par;
    explored.push(c);
    if (b.goals.has(c)) return done(b, 'DFS', parent, c, explored);
    const nbs = neighbors(b, c);
    for (let k = nbs.length - 1; k >= 0; k--) if (parent[nbs[k]] === -2) stack.push([nbs[k], c]);
  }
  return fail('DFS', explored);
}

class Heap {
  constructor(cmp) { this.a = []; this.cmp = cmp; }
  get size() { return this.a.length; }
  push(x) {
    const a = this.a; a.push(x);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this.cmp(a[i], a[p]) < 0) { [a[i], a[p]] = [a[p], a[i]]; i = p; } else break;
    }
  }
  pop() {
    const a = this.a, top = a[0], last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (l < a.length && this.cmp(a[l], a[m]) < 0) m = l;
        if (r < a.length && this.cmp(a[r], a[m]) < 0) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]]; i = m;
      }
    }
    return top;
  }
}

// Heuristica de A*: min sobre las metas de (distancia Manhattan + penalizacion de esa meta).
// Admisible y consistente: cada paso cuesta >= 1 y Manhattan nunca sobreestima.
function makeHeuristic(b) {
  const s = b.size, goals = [...b.goals].map(([i, pen]) => [i % s, (i / s) | 0, pen]);
  return (i) => {
    const x = i % s, y = (i / s) | 0;
    let best = Infinity;
    for (const [gx, gy, pen] of goals) best = Math.min(best, Math.abs(x - gx) + Math.abs(y - gy) + pen);
    return best;
  };
}

// UCS (useH=false) y A* (useH=true): cola de prioridad. Se cierra el nodo al sacarlo.
// La penalizacion de meta se trata con una entrada "final": al sacar una meta se reinserta con prioridad g+pen,
// asi una meta cercana pero penalizada no gana a otra mas lejana y barata.
function bestFirst(b, name, useH) {
  const err = validate(b);
  if (err) return fail(name, [], err);
  const n = b.size * b.size, h = useH ? makeHeuristic(b) : () => 0;
  const g = new Float64Array(n).fill(Infinity), parent = new Int32Array(n).fill(-1), closed = new Uint8Array(n);
  let seq = 0;
  const heap = new Heap((p, q) => p.f - q.f || p.t - q.t || p.seq - q.seq);
  const push = (node, gv, f, fin) => heap.push({ node, g: gv, f, t: useH ? -gv : 0, fin, seq: seq++ });
  g[b.start] = 0;
  push(b.start, 0, h(b.start), false);
  const explored = [];
  while (heap.size) {
    const e = heap.pop();
    if (e.fin) return done(b, name, parent, e.node, explored);
    if (closed[e.node]) continue;
    closed[e.node] = 1;
    explored.push(e.node);
    if (b.goals.has(e.node)) push(e.node, e.g, e.g + b.goals.get(e.node), true);
    for (const nb of neighbors(b, e.node)) {
      const ng = e.g + b.weight[nb];
      if (ng < g[nb]) { g[nb] = ng; parent[nb] = e.node; push(nb, ng, ng + h(nb), false); }
    }
  }
  return fail(name, explored);
}

export const ucs = (b) => bestFirst(b, 'UCS', false);
export const astar = (b) => bestFirst(b, 'A*', true);

// Bidireccional: dos BFS por capas completas, uno desde el inicio y otro desde todas las metas a la vez, hasta que se tocan.
// Como el segundo BFS parte de todas las metas, la ruta hallada va a la meta mas cercana por pasos.
// Limites: ignora pesos y penalizaciones (como BFS); solo es optimo en numero de pasos, no en coste.
export function bidirectional(b) {
  const name = 'Bidireccional', err = validate(b);
  if (err) return fail(name, [], err);
  const n = b.size * b.size;
  const parF = new Int32Array(n).fill(-2), parB = new Int32Array(n).fill(-2);
  const distF = new Int32Array(n), distB = new Int32Array(n);
  const explored = [];
  parF[b.start] = -1;
  if (b.goals.has(b.start)) { explored.push(b.start); return finish([b.start]); }
  let layerF = [b.start], layerB = [];
  for (const g of b.goals.keys()) { parB[g] = -1; layerB.push(g); }

  function finish(path) {
    const goal = path[path.length - 1];
    return { name, found: true, path, explored, steps: path.length - 1, cost: pathCost(b, path), goal };
  }
  // Expande una capa completa. Devuelve el mejor punto de encuentro { a, c } (a lo alcanzo F, c lo alcanzo B) o null.
  function expand(layer, own, dOwn, other, dOther, fromStart) {
    const next = []; let best = null, bestLen = Infinity;
    for (const u of layer) {
      explored.push(u);
      for (const v of neighbors(b, u)) {
        if (other[v] !== -2) {
          const len = dOwn[u] + 1 + dOther[v];
          if (len < bestLen) { bestLen = len; best = fromStart ? { a: u, c: v } : { a: v, c: u }; }
        } else if (own[v] === -2) { own[v] = u; dOwn[v] = dOwn[u] + 1; next.push(v); }
      }
    }
    return { next, best };
  }

  while (layerF.length && layerB.length) {
    const fromStart = layerF.length <= layerB.length; // se expande el lado con la frontera mas pequena
    const r = fromStart
      ? expand(layerF, parF, distF, parB, distB, true)
      : expand(layerB, parB, distB, parF, distF, false);
    if (r.best) {
      const path = pathTo(parF, r.best.a);
      for (let c = r.best.c; c !== -1; c = parB[c]) path.push(c);
      return finish(path);
    }
    if (fromStart) layerF = r.next; else layerB = r.next;
  }
  return fail(name, explored);
}

export const ALGORITHMS = { bfs, dfs, ucs, astar, bidirectional };
export const ALGO_NAMES = { bfs: 'BFS', dfs: 'DFS', ucs: 'UCS', astar: 'A*', bidirectional: 'Bidireccional' };

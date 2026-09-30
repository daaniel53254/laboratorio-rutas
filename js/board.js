// Modelo del tablero. Indice de celda: i = y * size + x.
// wall[i]=1 muro | weight[i]=coste de entrar (1 por defecto) | start=-1 si no hay | goals: Map(indice -> penalizacion)

export function createBoard(size = 20) {
  return {
    size,
    wall: new Uint8Array(size * size),
    weight: new Uint8Array(size * size).fill(1),
    start: -1,
    goals: new Map(),
  };
}

// Deja la celda vacia. Toda edicion pasa por aqui para evitar estados incoherentes
// (una celda nunca es muro y meta a la vez, ni inicio y peso, etc.).
function clearCell(b, i) {
  b.wall[i] = 0;
  b.weight[i] = 1;
  if (b.start === i) b.start = -1;
  b.goals.delete(i);
}

// tool: 'start' | 'goal' | 'wall' | 'weight' | 'erase'. Devuelve true si el tablero cambio.
export function place(b, tool, i, opts = {}) {
  if (i < 0 || i >= b.size * b.size) return false;
  switch (tool) {
    case 'start':
      if (b.start === i) return false;
      clearCell(b, i);
      b.start = i; // solo hay un inicio: mover
      return true;
    case 'goal': {
      const pen = Math.max(0, Math.floor(opts.pen ?? 0));
      if (b.goals.get(i) === pen) return false;
      clearCell(b, i);
      b.goals.set(i, pen);
      return true;
    }
    case 'wall':
      if (b.wall[i]) return false;
      clearCell(b, i);
      b.wall[i] = 1;
      return true;
    case 'weight': {
      const w = Math.min(9, Math.max(2, Math.floor(opts.weight ?? 5)));
      if (b.wall[i] || b.start === i || b.goals.has(i) || b.weight[i] === w) return false;
      b.weight[i] = w;
      return true;
    }
    case 'erase': {
      const empty = !b.wall[i] && b.weight[i] === 1 && b.start !== i && !b.goals.has(i);
      if (empty) return false;
      clearCell(b, i);
      return true;
    }
  }
  return false;
}

export function clearAll(b) {
  b.wall.fill(0);
  b.weight.fill(1);
  b.start = -1;
  b.goals.clear();
}

// Carga un escenario desde un mapa de texto: # muro, S inicio, G meta, 2-9 peso, . vacio.
// Las penalizaciones de meta se asignan en orden de lectura (fila a fila).
export function loadScenario(b, sc) {
  clearAll(b);
  const s = b.size;
  let g = 0;
  sc.map.forEach((row, y) => {
    for (let x = 0; x < s; x++) {
      const ch = row[x], i = y * s + x;
      if (ch === '#') b.wall[i] = 1;
      else if (ch === 'S') b.start = i;
      else if (ch === 'G') b.goals.set(i, sc.pens?.[g++] ?? 0);
      else if (ch >= '2' && ch <= '9') b.weight[i] = Number(ch);
    }
  });
}

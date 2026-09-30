# Laboratorio de rutas: BFS, DFS, UCS y A*

Aplicación web (HTML + CSS + JavaScript sin dependencias) con un tablero editable de 20 x 20 para comparar cuatro algoritmos de búsqueda sobre el mismo mapa.

## Uso
- Local: `npx serve .` (o `python3 -m http.server`) y abrir la dirección que indique. Hace falta servidor porque se usan módulos ES.
- Pruebas: `node tests/run-tests.mjs`
- Netlify: publicar la carpeta raíz (sin build).

## Estructura
- `index.html`: estructura y controles (marcado).
- `css/style.css`: estilos, tema claro/oscuro.
- `js/board.js`: modelo del tablero y reglas de edición coherente.
- `js/algorithms.js`: BFS, DFS, UCS, A*.
- `js/scenarios.js`: cuatro escenarios reproducibles.
- `js/app.js`: interfaz, animación, métricas y comparación.
- `tests/run-tests.mjs`: 13 pruebas.

## Reglas
Movimiento ortogonal. Entrar en una celda cuesta 1 o su peso (2-9). Cada meta tiene una penalización >= 0 que se suma al coste total. Heurística de A*: mínimo sobre las metas de (distancia Manhattan + penalización).

## Escenarios (pasos / coste / exploradas)
| Escenario | BFS | DFS | UCS | A* |
|---|---|---|---|---|
| 1 Menos pasos | 31/31/341 | 267/267/270 | 31/31/343 | 31/31/32 |
| 2 Atajo caro | 17/113/246 | 57/57/58 | 21/21/316 | 21/21/28 |
| 3 Varias metas | 3/33/17 | 57/57/58 | 21/21/313 | 21/21/41 |
| 4 Sin solución | sin ruta/180 | sin ruta/180 | sin ruta/180 | sin ruta/180 |

## Pendiente (completar)
Capturas en `capturas/`, enlaces a GitHub y Netlify, limitaciones, registro de uso de IA, informe PDF, mejora adicional (búsqueda bidireccional o ciudad).

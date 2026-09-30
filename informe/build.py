import json
from playwright.sync_api import sync_playwright

R = json.load(open('informe/resultados.json', encoding='utf-8'))
GH = 'https://github.com/daaniel53254/laboratorio-rutas'
NL = 'https://laboratorio-rutas-daniel.netlify.app/'

def fig(img, cap, w=100):
    return f'<figure><img src="img/{img}" style="width:{w}%"><figcaption>{cap}</figcaption></figure>'

def code(t):
    return f'<pre>{t}</pre>'

html = f'''<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>Informe técnico - Laboratorio de rutas</title>
<style>
@page {{ size: A4; margin: 16mm 15mm; }}
body {{ font: 10.5pt/1.45 system-ui, "DejaVu Sans", sans-serif; color:#1a1d23; }}
h1 {{ font-size: 20pt; margin: 0 0 4pt; }} h2 {{ font-size: 14pt; margin: 18pt 0 6pt; border-bottom: 1.5pt solid #1f5fbf; padding-bottom: 2pt; break-after: avoid; }}
h3 {{ font-size: 11.5pt; margin: 12pt 0 4pt; break-after: avoid; }}
table {{ border-collapse: collapse; width: 100%; margin: 6pt 0; font-size: 9pt; }}
th, td {{ border: .6pt solid #9aa3b0; padding: 3pt 5pt; vertical-align: top; text-align: left; }} th {{ background: #e8eef8; }}
figure {{ margin: 8pt 0; break-inside: avoid; text-align: center; }} figcaption {{ font-size: 8.5pt; color: #566070; margin-top: 2pt; }}
img {{ border: .6pt solid #cfd5de; }}
pre {{ background: #f3f5f8; border: .6pt solid #cfd5de; padding: 6pt; font-size: 8.5pt; white-space: pre-wrap; break-inside: avoid; }}
code {{ background: #f3f5f8; padding: 0 2pt; font-size: 9pt; }}
.meta {{ color:#566070; margin-bottom: 10pt; }} .pb {{ break-before: page; }}
.todo {{ background:#fff4d6; border:.6pt solid #d9a400; padding:4pt 6pt; }}
</style></head><body>

<h1>Laboratorio de rutas y algoritmos de búsqueda</h1>
<div class="meta">Informe técnico · RA1 PIA · Daniel Magariño Baranda · CEBANC, especialidad IA y Big Data<br>
Repositorio: <a href="{GH}">{GH}</a><br>Aplicación desplegada: <a href="{NL}">{NL}</a></div>

<h2>1. Resumen</h2>
<p>Aplicación web con un tablero editable de 20 × 20 en el que se define un inicio, una o varias metas, obstáculos y baldosas con coste. Ejecuta BFS, DFS, búsqueda de coste uniforme (UCS) y A*, muestra la exploración celda a celda con pausa, paso a paso y control de velocidad, y compara los cuatro algoritmos sobre el mismo mapa. Incluye cuatro escenarios reproducibles y 13 pruebas automáticas que se ejecutan con <code>node tests/run-tests.mjs</code>. Funciona en localhost (Live Server o <code>npx serve</code>) y en Netlify.</p>

<h2>2. Elección de lenguaje y herramientas (CE a–d)</h2>
<table><tr><th>Decisión</th><th>Elección</th><th>Motivo</th><th>Alternativa descartada</th></tr>
<tr><td>Lenguaje</td><td>JavaScript (módulos ES)</td><td>Se ejecuta en el navegador sin instalar nada, lo que permite visualizar el algoritmo paso a paso y desplegar en Netlify como sitio estático.</td><td>Python: buen lenguaje para IA, pero necesitaría servidor o Pyodide para la parte visual. En mi equipo Python ni siquiera estaba instalado.</td></tr>
<tr><td>Marcado</td><td>HTML5 semántico</td><td>Estructura, accesibilidad (roles, etiquetas, <code>aria-live</code>) y sin dependencias.</td><td>Canvas: más rápido de dibujar, pero no es accesible ni navegable por teclado.</td></tr>
<tr><td>Framework</td><td>Ninguno</td><td>Con 2-3 h de trabajo, un proyecto sin build ni dependencias es más fácil de entender, defender y desplegar.</td><td>React + TypeScript + Vite: propuesto al inicio, descartado por sobrecoste de configuración.</td></tr>
<tr><td>Estilos</td><td>CSS propio</td><td>Tema claro/oscuro con variables CSS y diseño adaptable a móvil.</td><td>Librerías CSS.</td></tr>
<tr><td>Pruebas</td><td>Node + <code>assert</code></td><td>Los algoritmos no dependen del DOM, así que se prueban sin navegador.</td><td>Jest/Vitest.</td></tr>
<tr><td>Control de versiones y despliegue</td><td>Git, GitHub, Netlify</td><td>Entrega verificable; Netlify publica la carpeta raíz sin build.</td><td>—</td></tr></table>

<h3>Lenguaje de marcado, estilos y programación</h3>
<table><tr><th>Capa</th><th>Archivo</th><th>Qué hace</th></tr>
<tr><td>Marcado (HTML)</td><td><code>index.html</code></td><td>Describe el contenido: <code>&lt;header&gt;</code> con título; <code>&lt;main&gt;</code> con tres <code>&lt;section&gt;</code> (editar, ejecutar, comparar) y el tablero; <code>&lt;fieldset&gt;/&lt;legend&gt;</code> con botones de radio para las herramientas; <code>&lt;label&gt;</code> asociado a cada <code>&lt;input&gt;</code>; <code>&lt;dl&gt;</code> para las métricas; <code>&lt;table&gt;</code> con <code>&lt;caption&gt;</code> y <code>&lt;th scope&gt;</code> para la comparación; <code>role="grid"</code> en el tablero y <code>role="status"</code>/<code>aria-live</code> en los mensajes; enlace «Saltar al tablero».</td></tr>
<tr><td>Estilos (CSS)</td><td><code>css/style.css</code></td><td>Aspecto, sin lógica: cuadrícula de 20 columnas con CSS Grid, colores de cada tipo de celda, foco visible, tema oscuro con <code>prefers-color-scheme</code> y <code>prefers-reduced-motion</code>.</td></tr>
<tr><td>Programación (JavaScript)</td><td><code>js/*.js</code></td><td>Comportamiento: reglas del tablero, algoritmos, eventos y animación. Es lo único que <em>calcula</em>; HTML y CSS no toman decisiones.</td></tr></table>

<h2>3. Arquitectura</h2>
<table><tr><th>Archivo</th><th>Responsabilidad</th></tr>
<tr><td><code>index.html</code></td><td>Estructura y controles.</td></tr>
<tr><td><code>css/style.css</code></td><td>Estilos y temas.</td></tr>
<tr><td><code>js/board.js</code></td><td>Modelo del tablero y reglas de edición (<code>createBoard</code>, <code>place</code>, <code>loadScenario</code>).</td></tr>
<tr><td><code>js/algorithms.js</code></td><td><code>bfs</code>, <code>dfs</code>, <code>ucs</code>, <code>astar</code>, cola de prioridad, heurística y <code>validate</code>. No toca el DOM.</td></tr>
<tr><td><code>js/scenarios.js</code></td><td>Cuatro mapas de texto reproducibles.</td></tr>
<tr><td><code>js/app.js</code></td><td>Interfaz: pinta el tablero, gestiona eventos, animación, métricas y comparación.</td></tr>
<tr><td><code>tests/run-tests.mjs</code></td><td>13 pruebas de algoritmos y tablero.</td></tr>
<tr><td><code>netlify.toml</code></td><td>Publicación de la carpeta raíz sin build.</td></tr></table>

<h3>Estructura de datos del mapa</h3>
{code("""board = {
  size: 20,
  wall:   Uint8Array(400)   // 1 = obstáculo
  weight: Uint8Array(400)   // coste de entrar en la celda (1 por defecto, 2-9 si es baldosa cara)
  start:  índice o -1       // una sola celda de inicio
  goals:  Map(índice -> penalización >= 0)
}
índice de celda: i = y * 20 + x""")}
<p>Se usan arrays planos indexados por <code>i = y·20 + x</code>: son rápidos, fáciles de copiar y evitan objetos por celda. El estado coherente se garantiza en una sola función: toda edición pasa por <code>clearCell</code>, que borra muro, peso, inicio y meta de la celda antes de aplicar la herramienta. Así una celda nunca es muro y meta a la vez, y solo existe un inicio (al colocarlo de nuevo, se mueve).</p>

<h3>Flujo desde el clic hasta el resultado</h3>
{code("""Edición:  pointerdown / teclado -> apply(i) -> place(board, herramienta, i)
          -> si cambió: se descarta el resultado anterior -> render()
Ejecución: botón Ejecutar -> validate(board) (falta inicio o meta -> mensaje)
          -> ALGORITMOS[algo](board) -> {found, path, explored, steps, cost}
          -> tick(): revela una celda explorada cada N ms (pausa / paso / velocidad)
          -> finish(): pinta la ruta y muestra pasos, coste y exploradas
Comparar: ejecuta los cuatro sobre el mismo board -> tabla -> "Ver" repinta un recorrido""")}
<p>Los algoritmos se ejecutan completos de una vez y devuelven la lista ordenada de celdas exploradas; la animación solo reproduce esa lista. Esto separa el cálculo de la visualización y permite probar los algoritmos sin navegador.</p>

<h2 class="pb">4. Los algoritmos (CE e)</h2>
<p><b>Reglas comunes.</b> Movimiento ortogonal en orden fijo (arriba, derecha, abajo, izquierda), lo que hace los resultados reproducibles. Entrar en una celda cuesta 1 o su peso. Al llegar a una meta se suma su penalización (≥ 0) al coste total. La ruta se reconstruye siguiendo el array <code>parent</code> desde la meta hasta el inicio. El coste de todas las rutas se calcula con la misma función (<code>pathCost</code>), por lo que las cifras son comparables.</p>
<table><tr><th></th><th>BFS</th><th>DFS</th><th>UCS</th><th>A*</th></tr>
<tr><th>Estructura</th><td>Cola FIFO</td><td>Pila LIFO</td><td>Cola de prioridad (montículo binario)</td><td>Cola de prioridad (montículo binario)</td></tr>
<tr><th>Criterio de selección</th><td>El más antiguo en la cola</td><td>El último apilado</td><td>Menor coste acumulado g</td><td>Menor f = g + h</td></tr>
<tr><th>Visitados</th><td>Al encolar (<code>parent</code> distinto de -2)</td><td>Al desapilar</td><td>Cerrado al sacarlo de la cola; se reinserta si se mejora g</td><td>Igual que UCS</td></tr>
<tr><th>¿Óptimo?</th><td>En pasos, no en coste</td><td>No</td><td>Sí, en coste (pesos no negativos)</td><td>Sí, con heurística admisible y consistente</td></tr>
<tr><th>Límite</th><td>Ignora pesos y penalizaciones</td><td>Puede dar rutas muy largas; ignora costes</td><td>Explora en todas direcciones</td><td>Depende de la calidad de h</td></tr></table>

<h3>Metas con penalización en UCS y A*</h3>
<p>Si se parara al sacar la primera meta de la cola, una meta cercana con penalización alta ganaría a otra más lejana y barata. Para evitarlo, al sacar una meta se reinserta en la cola una entrada «final» con prioridad g + penalización; el algoritmo termina cuando se saca una entrada final. Así se elige la meta de menor coste total.</p>

<h3>Heurística de A*</h3>
<p><code>h(n) = mínimo sobre las metas de (distancia Manhattan(n, meta) + penalización de esa meta)</code>. Es admisible porque cada paso cuesta al menos 1 y Manhattan es el mínimo de pasos posible sin diagonales, así que nunca sobreestima. Es consistente (<code>h(n) ≤ coste(n→m) + h(m)</code>), por lo que cerrar un nodo al sacarlo garantiza que su g es óptimo. Con h = 0 el algoritmo es UCS. En caso de empate en f, se prefiere el mayor g, lo que reduce las exploraciones.</p>

<h3>Casos límite</h3>
<p>Sin inicio o sin meta, <code>validate</code> devuelve el mensaje y no se ejecuta nada. Si la cola o pila se vacía sin llegar a una meta, se informa «Sin solución» con las celdas exploradas.</p>

<h2 class="pb">5. Escenarios de desafío y comparación</h2>
<p>Cada escenario es un mapa de texto en <code>js/scenarios.js</code> (# muro, S inicio, G meta, 2-9 peso), por lo que se carga siempre igual.</p>
<table><tr><th>Escenario</th><th>Qué pone a prueba</th><th>BFS<br><small>pasos / coste / expl.</small></th><th>DFS</th><th>UCS</th><th>A*</th><th>Conclusión</th></tr>
<tr><td>1 · Menos pasos</td><td>Caminos de distinta longitud, sin pesos</td><td>31 / 31 / 341</td><td>267 / 267 / 270</td><td>31 / 31 / 343</td><td>31 / 31 / 32</td><td>BFS, UCS y A* dan el mínimo de pasos. DFS encuentra ruta pero 8,6 veces más larga. A* explora 32 celdas frente a 343.</td></tr>
<tr><td>2 · Atajo caro</td><td>Ruta corta cara frente a rodeo barato</td><td>17 / 113 / 246</td><td>57 / 57 / 58</td><td>21 / 21 / 316</td><td>21 / 21 / 28</td><td>BFS minimiza pasos y paga 113. UCS y A* dan 21, cinco veces menos.</td></tr>
<tr><td>3 · Varias metas</td><td>Meta cercana con penalización 30 frente a meta lejana barata</td><td>3 / 33 / 17</td><td>57 / 57 / 58</td><td>21 / 21 / 313</td><td>21 / 21 / 41</td><td>BFS va a la cercana (3 pasos, coste 33). UCS y A* eligen la lejana por coste total (21).</td></tr>
<tr><td>4 · Sin solución</td><td>Barrera completa</td><td>sin ruta / 180</td><td>sin ruta / 180</td><td>sin ruta / 180</td><td>sin ruta / 180</td><td>Los cuatro terminan e informan de que no existe ruta, tras explorar toda la zona alcanzable (180 celdas).</td></tr></table>
<p>Nota sobre DFS: en el escenario 2 su coste (57) es menor que el de BFS (113) solo porque su orden de exploración esquiva el pasillo caro, no porque optimice nada. DFS devuelve la primera ruta que encuentra, así que no garantiza ni pasos ni coste mínimos.</p>

{fig("escenario1.png","Escenario 1 con A*: 31 pasos, coste 31, 32 celdas exploradas. La tabla compara los cuatro algoritmos.",88)}
{fig("escenario1_dfs.png","Escenario 1 con DFS: 267 pasos. Encuentra ruta, pero muy larga.",75)}
{fig("escenario2.png","Escenario 2 con A*: rodea el pasillo de baldosas de coste 9 (coste 21).",88)}
{fig("escenario2_bfs.png","Escenario 2 con BFS: cruza el pasillo por ser lo más corto en pasos (17 pasos, coste 113).",75)}
{fig("escenario3.png","Escenario 3 con A*: ignora la meta cercana con penalización (G+30) y va a la lejana (coste 21).",88)}
{fig("escenario3_bfs.png","Escenario 3 con BFS: elige la meta cercana (3 pasos, coste 33).",75)}
{fig("escenario4.png","Escenario 4 con BFS: sin solución tras explorar 180 celdas.",75)}

<h2 class="pb">6. Casos de prueba</h2>
<p>Cada caso indica escenario, resultado esperado, resultado obtenido y evidencia. Los resultados «obtenidos» de la columna de interfaz se leyeron de la propia aplicación durante la prueba; los automáticos están en <code>tests/run-tests.mjs</code> (13 pruebas superadas).</p>
<table><tr><th>Caso</th><th>Entrada / escenario</th><th>Esperado</th><th>Obtenido</th><th>Evidencia</th></tr>
<tr><td>Ruta simple</td><td>Inicio (2,2), meta (10,2), sin obstáculos, BFS</td><td>8 pasos, coste 8</td><td>{R["t1"]["pasos"]} pasos, coste {R["t1"]["coste"]}</td><td>Fig. T1; prueba «ruta simple»</td></tr>
<tr><td>Sin inicio</td><td>Solo una meta, A*</td><td>Mensaje «Falta el inicio», nada se ejecuta</td><td>«{R["t2a"]["estado"]}»</td><td>Fig. T2a</td></tr>
<tr><td>Sin meta</td><td>Solo inicio, A*</td><td>Mensaje de falta de meta</td><td>«{R["t2b"]["estado"]}»</td><td>Fig. T2b</td></tr>
<tr><td>Varias metas</td><td>Escenario 3</td><td>BFS 3 pasos/coste 33; UCS y A* coste 21 a la meta lejana</td><td>BFS {R["escenario3_bfs"]["pasos"]}/{R["escenario3_bfs"]["coste"]}; A* {R["escenario3"]["pasos"]}/{R["escenario3"]["coste"]}</td><td>Sección 5; prueba «varias metas»</td></tr>
<tr><td>Pesos</td><td>Escenario 2</td><td>BFS coste 113; UCS y A* coste 21</td><td>BFS {R["escenario2_bfs"]["coste"]}; A* {R["escenario2"]["coste"]}</td><td>Sección 5; pruebas «pesos» y «escenario 2»</td></tr>
<tr><td>Obstáculos</td><td>Inicio (3,9), meta (15,9), muro vertical en x=9 de y=4 a y=14, BFS</td><td>Rodea el muro: 12 pasos directos + 12 de desvío = 24</td><td>{R["t5"]["pasos"]} pasos, coste {R["t5"]["coste"]}</td><td>Fig. T5; prueba «obstáculos»</td></tr>
<tr><td>Sin solución</td><td>Escenario 4, los cuatro algoritmos</td><td>Los cuatro informan sin ruta</td><td>«{R["escenario4"]["estado"]}» ({R["escenario4"]["exploradas"]} exploradas)</td><td>Fig. escenario 4; prueba «mapa sin solución»</td></tr>
<tr><td>Edición tras ejecutar</td><td>Tras ejecutar BFS en el mapa de obstáculos, se añade un muro en (11,9)</td><td>Se descarta el resultado anterior; al ejecutar de nuevo se recalcula</td><td>Estado: «{R["t7"]["estado"]}», exploradas {R["t7"]["exploradas"]}. Nueva ejecución: {R["t7_rerun"]["pasos"]} pasos, {R["t7_rerun"]["exploradas"]} exploradas</td><td>Fig. T7; prueba «edición tras ejecutar»</td></tr>
<tr><td>Coherencia del tablero</td><td>Poner muro sobre meta, inicio sobre muro, etc.</td><td>Una celda nunca tiene dos tipos</td><td>Correcto</td><td>Prueba «coherencia»</td></tr>
<tr><td>UCS = A* en coste</td><td>4 escenarios y 200 mapas aleatorios con pesos y penalizaciones</td><td>Mismo coste en todos</td><td>Coinciden en todos</td><td>Prueba «UCS y A* coinciden»</td></tr></table>

{fig("t1_ruta_simple.png","T1 · Ruta simple con BFS.",78)}
{fig("t2a_sin_inicio.png","T2a · Sin inicio: la aplicación avisa y no ejecuta.",78)}
{fig("t2b_sin_meta.png","T2b · Sin meta.",78)}
{fig("t5_obstaculos.png","T5 · Obstáculos: BFS rodea el muro.",78)}
{fig("t7_edicion_tras_ejecutar.png","T7 · Tras editar el tablero se descarta el resultado y se avisa.",78)}

<h2 class="pb">7. Paso a paso de construcción</h2>
<ol>
<li><b>Análisis del enunciado.</b> Identifiqué los requisitos mínimos: tablero 20 × 20, cuatro algoritmos, comparación, cuatro escenarios, pruebas, informe y despliegue.</li>
<li><b>Decisión de tecnología.</b> El primer plan usaba React + TypeScript + Vite. Con solo 2-3 horas lo cambié por HTML + JavaScript puro: sin build ni dependencias, más fácil de entender y de desplegar.</li>
<li><b>Modelo del tablero (<code>board.js</code>).</b> Decidí centralizar las reglas de edición en <code>clearCell</code> para evitar estados incoherentes.</li>
<li><b>Algoritmos (<code>algorithms.js</code>).</b> Primero BFS y DFS, después UCS y A* con montículo binario. Añadí la entrada «final» para tratar bien las penalizaciones de meta.</li>
<li><b>Pruebas antes de la interfaz.</b> Escribí las pruebas para validar la lógica sin navegador.</li>
<li><b>Interfaz (<code>app.js</code>, <code>index.html</code>, <code>style.css</code>).</b> Tablero con botones (accesible por teclado), herramientas, animación con pausa, paso y velocidad, métricas y tabla comparativa.</li>
<li><b>Despliegue.</b> Repositorio en GitHub y sitio en Netlify sin build.</li>
</ol>
<h3>Dificultades y correcciones</h3>
<table><tr><th>Problema</th><th>Cómo lo detecté</th><th>Corrección</th></tr>
<tr><td>Una de mis pruebas esperaba 8 pasos al rodear un muro de 5 celdas.</td><td>Falló la prueba automática.</td><td>Comprobé a mano el camino: son 10 (5 para rodear + 5 de vuelta). El error estaba en la prueba, no en el algoritmo.</td></tr>
<tr><td>En el escenario 1, DFS daba los mismos 38 pasos que BFS por casualidad, y no demostraba nada.</td><td>La tabla de resultados de las pruebas.</td><td>Recoloqué inicio y meta para que el orden de vecinos de DFS le desvíe: ahora DFS da 267 pasos frente a 31.</td></tr>
<tr><td>La columna «Algoritmo» de la tabla comparativa aparecía cortada.</td><td>Al revisar una captura de pantalla.</td><td>Reduje tamaño y márgenes de la tabla y ensanché el panel.</td></tr>
<tr><td>Python no estaba instalado en mi equipo, así que <code>python3 -m http.server</code> falló.</td><td>Mensaje del terminal.</td><td>Usé la extensión Live Server de VS Code.</td></tr>
<tr><td>Comando <code>git remote add origin</code> sin URL.</td><td>Error de uso del comando.</td><td>Ejecutarlo con la URL en la misma línea.</td></tr>
<tr><td>Netlify no encontraba el repositorio.</td><td>La lista de repositorios aparecía vacía.</td><td>Conceder a la app de Netlify acceso al repositorio en la configuración de GitHub.</td></tr></table>

<h2>8. Mejoras implementadas</h2>
<div class="todo">No se ha implementado ninguna mejora adicional (búsqueda bidireccional o simulación de ciudad). La rúbrica permite el 9,5 sin este apartado. Si se añade, se documentará aquí con su caso de uso, límites, prueba y efecto medible.</div>

<h2>9. Limitaciones</h2>
<ul>
<li>Sin movimiento diagonal.</li>
<li>La cola de prioridad y los mapas están pensados para 20 × 20, no se han medido tableros mayores.</li>
<li>La animación reproduce el recorrido ya calculado; no ejecuta el algoritmo paso a paso internamente.</li>
<li>Los pesos están limitados a 2-9 y las penalizaciones a números enteros.</li>
<li>El resultado de DFS depende del orden fijo de vecinos (arriba, derecha, abajo, izquierda).</li>
<li>Las pruebas visuales se hicieron en Chromium y Brave; no se han probado en Safari ni Firefox.</li>
</ul>

<h2>10. Uso de asistentes de código IA</h2>
<p><b>Herramienta:</b> Claude (Anthropic), en el asistente de código con acceso a un entorno de ejecución. No se incluyeron claves, contraseñas ni datos personales en las consultas.</p>
<table><tr><th>Consulta representativa</th><th>Qué propuso</th><th>Qué acepté o cambié</th><th>Cómo lo verifiqué</th></tr>
<tr><td>«Ayúdame con este trabajo» (enunciado adjunto) y «necesito hacerlo en menos tiempo, tengo 2-3 h»</td><td>Un plan en 10 fases con React + TypeScript + Vite y canvas.</td><td>Cambié a HTML + JavaScript sin framework por el tiempo disponible. Descarté el canvas por accesibilidad.</td><td>Comprobé que el proyecto no necesita instalación y funciona en Live Server y Netlify.</td></tr>
<tr><td>Implementación de BFS, DFS, UCS y A*</td><td>Código de los cuatro algoritmos, montículo binario y heurística Manhattan.</td><td>Acepté la estructura. Revisé el tratamiento de la penalización de meta (entrada «final») y la consistencia de la heurística.</td><td>13 pruebas automáticas, incluida la comparación UCS = A* en 200 mapas aleatorios.</td></tr>
<tr><td>Diseño de los cuatro escenarios</td><td>Cuatro mapas de texto.</td><td>Se rediseñó el escenario 1 porque DFS coincidía con BFS por casualidad.</td><td>Tabla de resultados por escenario y pruebas específicas.</td></tr>
<tr><td>Interfaz y accesibilidad</td><td>Tablero de botones con navegación por flechas, roles ARIA y tema claro/oscuro.</td><td>Aceptado. Se corrigió la tabla comparativa cortada.</td><td>Capturas en navegador y prueba de teclado.</td></tr>
<tr><td>Errores de Git y Netlify</td><td>Explicación del fallo y comandos correctos.</td><td>Aplicados tal cual.</td><td>El repositorio y el despliegue funcionan.</td></tr></table>
<div class="todo">Antes de entregar: revisa este registro y ajústalo a lo que realmente hiciste. Lee <code>js/algorithms.js</code> completo, porque la rúbrica pide explicar y modificar el código individualmente en la defensa.</div>

<h2>11. Enlaces</h2>
<ul><li>Repositorio: <a href="{GH}">{GH}</a></li><li>Aplicación en Netlify: <a href="{NL}">{NL}</a></li></ul>
</body></html>'''

open('informe/informe.html', 'w', encoding='utf-8').write(html)
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/opt/pw-browsers/chromium')
    pg = b.new_page()
    pg.goto('file:///home/claude/laboratorio-rutas/informe/informe.html')
    pg.pdf(path='informe/Informe_Laboratorio_Rutas.pdf', format='A4', print_background=True,
           margin={'top': '16mm', 'bottom': '16mm', 'left': '15mm', 'right': '15mm'})
    b.close()
print('ok')

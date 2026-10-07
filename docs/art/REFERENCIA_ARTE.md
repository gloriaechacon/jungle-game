# Pasada de referencia y especificación de arte — Jungle

> **Fase 9 (29/09, Codex):** por pedido explícito, nueva marcha/carrera/carga de seis poses distintas (34 fotogramas DK en total), brazos articulados y apoyo de nudillos sin la fijación anterior de torso/mano. Celda y anclaje 32×32 intactos. Cueva con estalactitas facetadas, rocas quebradas y columnas menos ruidosas; terreno angular y sombras bajo escalones en los tres niveles. Fondos de selva de Claude conservados. Arte propio generado, sin aprobación visual todavía. `npm run art` regenera las láminas y atlas; FASE_9.md detalla límites, incluyendo rodamiento/cuerda todavía provisionales.

> **Fase 8 (29/09/2026, Claude):** se agregaron al generador el dosel nocturno de Ropey (`canopyNight`), la cueva de Reptile (`caveTop/Fill/Side/Cap`, `caveFar` con cortinas moradas, `caveNear`), la serpiente (`snake`, 22×12, 2 fotogramas, verde con vientre claro para contrastar con el morado) y la llanta (`tire`, 24×14, normal y aplastada). Referencia: `docs/REFERENCIA_NIVELES.png` 5:10–6:55 (láminas reescaladas, colores aproximados). Todo propio y reproducible (`npm run art`). Hojas: `cave.png`, `cave-far.png`, `cave-near.png`, `canopy-night.png`. Sin aprobación visual del usuario. DK no cambió.

## Revisión fase 6 (Codex)

El usuario no aprobó la fidelidad de fase 5. Se revisaron visualmente REFERENCIA_NIVELES.png y comparacion-referencia.png: pelaje granate, cuerpo agachado, palmas colgantes y vegetación más densa son los cambios prioritarios. Se editaron las fuentes del generador existente, no PNG a mano ni recursos descargados. Nuevas paletas en tools/art/dk.mjs y env.mjs; 28 poses de DK incluyendo dk-hurt-head. Paleta/proporciones siguen siendo interpretaciones propias, NO mediciones exactas del original. La pose manos a la cabeza responde al feedback del usuario; no se verificó aquí su temporización exacta contra una secuencia de muerte del video. Comparacion-referencia.png conserva la comparación HISTÓRICA de fase 5; las hojas regeneradas y capturas phase-6-* corresponden a fase 6. Requiere aprobación visual antes de repetir esta dirección en otros niveles.

## Registro histórico de fase 5

Fecha: 27/09/2026. Autor: Claude. Estado: primera entrega visual, **pendiente de revisión de Codex y aprobación visual del usuario**.

## Fuentes consultadas

| Fuente | Uso |
|---|---|
| `docs/REFERENCIA_INICIO.png`, `docs/REFERENCIA_NIVELES.png` | Composición general, paleta de Jungle, HUD, señal EXIT. Son láminas reescaladas: no se tomaron como píxeles nativos. |
| Video `video1712159502.mp4` (carpeta Zoom del 23/09, accedido con permiso en esta sesión) | 1366×768, 25 fps, 420,9 s. Área de juego medida en el video: x 256–1109, y 0–767 (854×768 → 5,34 px de video por píxel lógico). Se extrajeron fotogramas cada 0,5 s (0:56–2:46) y cada 0,1 s (1:00–1:40) y se reconstruyó 160×144 muestreando el centro de cada píxel lógico. |
| `docs/art/comparacion-referencia.png` | Fotogramas reconstruidos (arriba) frente a los sprites propios (abajo), 4×. |

Limitaciones: compresión H.264, 25 fps y escalado previo impiden medir paletas exactas, contornos de 1 px o tiempos de animación del original. Todo lo que figura como “medido” es **aproximado**.

## Mediciones aproximadas del video y decisiones

| Aspecto | Observado en el video (aprox.) | Decisión en esta entrega |
|---|---|---|
| DK de pie/caminando | ≈23–24 × 25–28 px lógicos (1:07.8, 1:09.3) | Sprites dentro de celda 32×32, silueta ≈24×28 de pie; cuerpo de colisión 12×16 **sin cambios**. |
| Color de DK | Pelaje granate oscuro (~#541911 / #734635), cara/pecho/manos durazno (~#eaa185), contorno casi negro (~#1c0301) | Paleta propia de 10 colores cercana a esos valores; corbata roja con detalle amarillo añadida para reconocimiento (decisión propia: en el video no se distingue a esta resolución). |
| Barril cargado | En 1:21.5 DK sostiene un barril **sobre la cabeza** (parcialmente tapado por hojas) | Anclaje visual del barril sobre las manos levantadas (pies −35 px). La posición lógica de reglas (centro −14, delante) no cambió. |
| Enemigo terrestre | Cuadrúpedo gris pequeño (≈18–20 × 12–16) en el camino (1:09.3). Forma y ubicación compatibles con Gnawty, primer enemigo de Jungle Hijinxs, pero **no se pudo verificar a resolución nativa** | Castor gris propio 22×16 (“gnawty” como nombre interno). En documentos se lo llama “enemigo tipo Gnawty”. |
| Suelo | Camino durazno con borde ondulado y contorno oscuro, bajo él roca oscura con facetas | Tiles propios `ground-top`, `ground-fill`, lados rocosos y remates redondeados. |
| Fondo | Cielo azul plano (~#86a7d4), palmeras de tronco rojo oscuro y copas colgantes, franja densa de follaje con hojas rojas en abanico | Dos capas con paralaje (0,25 y 0,55). |
| Checkpoint | Barril con estrella a mitad de nivel (referencia a 1:35 en las láminas) | Barril estrella que se rompe con destello al activarse. |
| Salida | Señal EXIT de madera y entrada de roca | Señal EXIT + arco de roca con abertura oscura. |
| HUD | Contador compacto amarillo; letras en casillas doradas | Banana + dígitos dorados arriba a la izquierda; 5 casillas BERTO arriba a la derecha. Aparece temporalmente, como antes. |

## Paleta usada (valores exactos del arte generado)

DK: contorno `#1c0604`, pelaje `#46100c` / `#6e2218` / `#9c4430`, piel `#c47a60` / `#eaa183` / `#f7c9ab`, ojos `#fff4e6`, corbata `#d8383a`, letras `#f4cc52`.
Entorno: cielo `#86a7d4`; camino `#8f5c49` `#c98e74` `#eaa183` `#f4c0a0`, contorno `#1f0905`; roca `#120a06` `#2e2014` `#4e3c26` `#6e5838`; acantilado `#5a4330` `#8c6748` `#ad7957`; follaje `#0c1c0a` `#183310` `#2f5424` `#476d37` `#6f9a4a` `#a3c46e`; hojas rojas `#591819` `#a7282f` `#df6469`; troncos `#2d0206` `#5c1a1e` `#733236` `#9a4a48`.
Objetos: ver `tools/art/props.mjs` (constante `C`). Muestra visual: `docs/art/palette.png`.

Decisión consciente: la estética es de GBC, pero **no** se emulan las restricciones de hardware (3 colores + transparente por tile de 8×8). DK usa hasta 10 colores.

## Tamaños lógicos y anclajes

| Recurso | Tamaño | Anclaje | Relación con la colisión |
|---|---|---|---|
| DK (27 fotogramas) | celda 32×32 | (16, 32) = centro inferior del cuerpo 12×16 | Pies del sprite = pies del cuerpo. La silueta sobresale ≈6 px por lado y ≈12 px por arriba. |
| Barril cargado | 16×18 | centro en pies + (0, −35) | Solo visual. |
| Enemigo tipo Gnawty | 22×16 | (11, 16) en y = e.y + 6 (suelo) | Hitbox 14×12 sin cambios; el dibujo es algo más ancho (tolerante). |
| Barril (suelo/lanzado) | 16×18 | centro en la posición lógica | Caja lógica 16×16 sin cambios. |
| Barril estrella | 18×20 | centro inferior en (1264, 124) | Zona de activación sin cambios. |
| Banana / letra | 10×12 / 12×12 | centro | Radio de recogida sin cambios (11×14). |
| Casa del árbol | 80×76 | centro inferior en (36, 124) | Decorado. |
| Cueva de salida / EXIT | 64×72 / 26×22 | centro inferior en (2446, 126) / (2408, 124) | Decorado; la salida sigue en x ≥ 2420. |
| Camino | tile 16×12, 2 px por encima del borde del sólido | — | El borde de colisión coincide con la línea de pisada del camino. |

## Animaciones (tiempos propios, no medidos)

Todas avanzan con el **tiempo de simulación** o con la **distancia recorrida**, así que se detienen con pausa, pérdida de foco o completado y continúan al reanudar.

| Animación | Fotogramas | Ritmo |
|---|---|---|
| Quieto | idle 0–1 | 520 ms |
| Caminar / correr | walk 0–3 / run 0–3 | 1 fotograma cada 7 px / 9 px (≈8,6 y ≈11,3 fps a 60 y 102 px/s) |
| Salto | jump-up (vy < 0) / jump-down | según velocidad vertical |
| Rodar | roll 0–3 | 60 ms |
| Cargar | carry-0, carry-walk 0–3 | 7 px por fotograma |
| Lanzar | throw | 200 ms tras soltar |
| Al borde | teeter 0–1 | 150 ms, cuando el centro de los pies no tiene suelo debajo |
| Festejo final | cheer 0–1 | 300 ms |
| Golpe | hurt (fantasma parpadeante en el lugar del golpe) | 320 ms, no retrasa el retorno |
| Enemigo | gnawty-walk 0–1; derrota: volteado y caída | 170 ms; 520 ms |
| Banana | brillo 0–1–2–1 escalonado | 140 ms + 700 ms en reposo |
| Efectos | destello de recogida, estrella de impacto, astillas de barril, polvo de aterrizaje | 180 / 180 / 260 / 180 ms |

## Procedencia y método

- Arte **100 % propio**, generado por código (`tools/art/*.mjs`, sin dependencias externas): formas simples (elipses, cápsulas, polígonos) por capas con contorno automático para DK, mapas ASCII para objetos pequeños y ruido determinista (semilla fija) para follaje y roca. No se copió ningún píxel del juego ni se descargaron recursos.
- Reproducible: `npm run art` regenera `public/assets/*` y `docs/art/*` con resultado idéntico byte a byte (verificado por hash).
- Fuentes editables: `tools/art/dk.mjs` (dibujo de DK), `tools/art/dk-frames.mjs` (tabla de poses por fotograma), `tools/art/props.mjs`, `tools/art/env.mjs`.
- Hojas de contacto: `docs/art/dk-frames.png`, `props.png`, `environment.png`, `bg-far.png`, `bg-near.png`, `palette.png`; inventario con tamaños y anclajes en `docs/art/manifest.json`.

# Entrega de Claude — correcciones previas al arte y fase 5 (Jungle con arte)

Fecha: 27/09/2026 (Buenos Aires). Encargo: `docs/ENCARGO_CLAUDE_FASE_5.md`.
Estado: **implementado y verificado por Claude; pendiente de revisión de Codex y de aprobación visual del usuario.** No se inició la fase 6. B-01 intacto.

## 1. Resumen y archivos

**Correcciones (A):** simulación en pasos fijos comunes para jugador, reglas y física; el estado completado tiene prioridad sobre la pausa y el foco; el contenido del nivel pasa a datos con medidas centralizadas; el rebote se aplica mediante `PlayerController.bounce()` con una precedencia definida; pruebas nuevas unitarias, de navegador y de medición.

**Fase 5 (B):** arte propio para Jungle, con DK en 27 fotogramas y el resto de sprites, tiles, dos capas de fondo, fuente, HUD y resumen final. Las animaciones se congelan con la pausa. El proyecto conserva las rutas de diagnóstico A, B y greybox y el interruptor de colisiones.

Modificados: `package.json`, `index.html`, `src/gameplay.ts`, `src/gameplay-view.ts`, `src/jungle-layout.ts`, `src/main.ts`, `src/movement.ts`, `src/player.ts`, `src/scenes.ts`, `tests/gameplay-unit.mjs`, `tests/smoke.mjs`, `README.md`, `AGENTS.md`, `docs/CONTEXTO_COMPLETO_ACTUALIZADO.txt`.

Nuevos:
- **Código:** `src/art-spec.ts`.
- **Generador de arte:** `tools/art/{pixel,dk,dk-frames,props,env,build-art}.mjs`.
- **Recursos del juego:** `public/assets/*`, 12 archivos: atlas, tiles, fondos y fuentes.
- **Pruebas:** `tests/player-unit.mjs`, `tests/phase5.mjs`, `tests/fps-measure.mjs`, `tests/route-timing.mjs`, `tests/support/{bot,register,resolve-hooks,phaser-stub}.mjs`.
- **Documentación:** `docs/art/*` (hojas de contacto, `manifest.json`, `comparacion-referencia.png`, `REFERENCIA_ARTE.md`) y este informe.
- **Evidencias:** `artifacts/phase-5-*.png`, `artifacts/phase-5-run.webm`, `artifacts/fps-before.json`, `artifacts/fps-after.json`.

Sin cambios, verificado con `cmp` contra la versión de partida: `src/tuning.ts`, `src/input.ts`, `src/pixels.ts`, `src/style.css`, `tsconfig.json`, `package-lock.json`, `tests/gameplay.mjs`, `tests/jungle.mjs`, `tests/movement.mjs`. No se añadieron dependencias.

## 2. Hallazgos → reproducción → corrección → prueba

### Fallos

| # | Hallazgo | Reproducción | Corrección | Prueba que lo protege |
|---|---|---|---|---|
| F1 | Por debajo de 30 fps, reglas y controlador perdían tiempo mientras Arcade no | `tests/fps-measure.mjs` a 24 fps sobre el código de partida: reloj de reglas 768 ms/s; enemigo 13,8 px/s; rodamiento de 33,2 px | `movement.ts`: jugador y reglas avanzan dentro de `WORLD_STEP`, una vez por paso fijo de Arcade (1/60 s). No se descarta tiempo y DK no se ralentizó. En pausa, foco perdido o completado el mundo está pausado y no acumula tiempo | A 24 fps: reloj 1002 ms/s, enemigo 18 px/s, rodamiento de 27 px (§3). Unitaria "fixed-step clock" |
| F2 | Espacio alternaba la pausa tras completar y el cartel reemplazaba el resumen | Código anterior (`movement.ts`, suscripción de Start y dibujo con `paused`) | Start se ignora con `finished`; el resumen tiene prioridad sobre pausa y foco; solo "Reiniciar Jungle" reinicia | `phase5.mjs`: Espacio ×2 y pérdida de foco tras completar mantienen el resumen, `simTime` y el progreso |
| F3 | La prueba de pausa usaba `step(..., true)`, una rama que el juego no usa | Lectura del código | Parámetro eliminado de `LevelRules.step`. La pausa integrada se prueba en el navegador: `simTime`, estado de reglas y fotogramas congelados con Espacio y con pérdida de foco | `phase5.mjs` (pausa/foco) y `gameplay.mjs` |

### Deuda técnica

| # | Deuda | Cambio | Prueba |
|---|---|---|---|
| D1 | Inicio, checkpoint, salida, entidades, medidas y gravedad del barril repetidos | `jungle-layout.ts` es la única fuente del nivel. `HITBOX` y `ACTION` en `gameplay.ts`, con los mismos valores. La gravedad del barril se inyecta desde `MOVEMENT.gravity`. El greybox y la vista leen los mismos datos | Unitaria "injected gravity"; suite completa con los mismos resultados |
| D2 | El rebote se escribía después de `player.update` desde la escena | `PlayerController.bounce(150, t)`: un salto aceptado en el mismo paso gana. Si no, aplica −150 fijo y consume la tolerancia de borde | `player-unit.mjs` "bounce precedence" |

### Cambios de comportamiento deliberados (menores; para revisión de Codex)

1. **Pausa y ventanas de salto.** Antes, la pausa borraba la tolerancia de borde y el salto anticipado. Ahora conserva la tolerancia (el tiempo está congelado) y descarta el salto anticipado pendiente, para que no se dispare un salto "fantasma" al reanudar. Protegido por la prueba unitaria "pause resync".
2. **Rebote.** Consume la tolerancia de borde: no puede seguirle un salto extra.
3. **Al completar.** La velocidad del cuerpo se pone a 0 para que los pasos de recuperación de Arcade no muevan a DK después del cierre.
4. **Telemetría.** `x`/`y` salen del cuerpo físico (antes, del rectángulo, un fotograma atrasado). Se añadieron `simTime`, `steps` y `view`.
5. **Colisiones en la ruta principal.** Ocultas por defecto; el interruptor las muestra (cuerpo de DK, enemigos, barriles). El greybox y el laboratorio conservan su aspecto de fase 3/B.

### Elecciones artísticas (no son correcciones)

- Barril cargado sobre la cabeza, confirmado en el video a 1:21.5; solo cambió el anclaje visual.
- Pose al borde (*teeter*): el cuerpo de 12 px puede apoyarse con los pies del dibujo sobre el vacío. Se comunica con una pose en vez de cambiar la colisión.
- Fantasma de golpe de 320 ms en el punto del impacto, sin retrasar el retorno.
- Corbata roja con detalle amarillo.
- Barril estrella como checkpoint.
- Detalle en `docs/art/REFERENCIA_ARTE.md`.

## 3. Sincronización y mediciones

**Método.** Arcade (60 Hz, `fixedStep`, `forceX`, sin cambios) acumula el tiempo de cada fotograma y ejecuta los pasos necesarios. En cada paso emite `WORLD_STEP`, y la escena ejecuta en él, en este orden:

1. `gameTime += 16,667 ms`;
2. `rules.step(16,667)`, con el cuerpo después de la colisión de ese paso;
3. entrada y `player.update`;
4. rebote o daño;
5. caída y salida.

La pausa, el foco perdido y el completado pausan el mundo, así que no se acumula tiempo pendiente. Los proyectiles y las detecciones reciben siempre pasos de 16,7 ms, nunca un delta grande. `LevelRules.step` conserva un tope de 33,3 ms por llamada como defensa.

**Cómo se midió.** `npm run build && node tests/fps-measure.mjs --json …`, en Chromium 141.0.7390.37 sin ventana. El ritmo se simula sustituyendo `requestAnimationFrame` por `setTimeout(1000/hz)`: es una **simulación de entrega de fotogramas, no un monitor físico** de 144 Hz (no reproduce vsync, compositor ni GPU). "raf" es el reloj propio del navegador sin ventana (60 Hz). Se espera a que termine el enfriamiento de Phaser tras el foco (120 fotogramas). Valores antes (código de partida) / después:

| Medida | raf | 24 fps | 40 fps | 60 fps | 144 fps |
|---|---|---|---|---|---|
| Reloj de reglas (ms por s real) | 999 / 999 | **768 / 1002** | 999 / 994 | 998 / 1016 | 1000 / 1000 |
| Caminar (px/s real) | 59,8 / 60,1 | 60,5 / 60,1 | 60,7 / 60,7 | 59,0 / 60,6 | 60,8 / 60,1 |
| Altura de salto (px) | 41,2 / 41,2 | 41,2 / 41,0 | 41,2 / 41,2 | 41,2 / 41,2 | 41,2 / 41,2 |
| Tiempo en el aire (ms sim.) | 717 / 717 | **534 / 667** | 720 / 700 | 703 / 717 | 717 / 717 |
| Rodamiento (px desde parado) | 27,0 / 27,0 | **33,2 / 27,0** | 27,1 / 28,7 | 27,0 / 28,7 | 28,0 / 28,7 |
| Enemigo (px/s real) | 18 / 18 | **13,8 / 18** | 18 / 18 | 18 / 18 | 18 / 18 |
| Barril (px/s sim.) | 190 / 190 | 190 / 190 | 191 / 190 | 190 / 190 | 190 / 190 |
| Barril (px/s real) | 191 / 188 | **144 / 171** | 186 / 202 | 190 / 183 | 194 / 191 |

Datos completos en `artifacts/fps-before.json` y `artifacts/fps-after.json`.

**Diferencias residuales y cómo leer la tabla:**
- **Resolución de las muestras.** La telemetría se publica una vez por fotograma dibujado. Duraciones, altura y distancia tienen una resolución de ±1–2 fotogramas: 41,7 ms a 24 fps. Por eso a 24 fps aparecen 667 ms en el aire (el valor exacto por pasos es 717) o 41,0 px de altura.
- **Barril en tiempo real.** Se mide en una ventana de unos 0,2 s antes de impactar, con 4–5 muestras, y es la cifra más ruidosa. La velocidad simulada (190) y el reloj (1002 ms/s) implican unos 190 px/s reales. La prueba unitaria confirma los valores exactos por paso.
- **Límite de Phaser en fotogramas con varios pasos (preexistente).** Arcade no reinicia `blocked` entre pasos de recuperación, así que a 24 fps el "en el suelo" puede durar 1–2 pasos más al dejar un borde. La tolerancia efectiva crece hasta unos 33 ms en ese caso extremo. No se tocó el motor.
- **Enfriamiento del motor tras el foco (preexistente).** Tras recuperar el foco, Phaser limita el delta durante 120 fotogramas. A 24 fps eso ralentiza todo el juego por igual durante unos 5 s. Se puede proponer `fps.panicMax` si molesta; no se cambió.
- **144 Hz.** Los pasos alternan 0 y 1 por fotograma y los sprites se mueven a 60 Hz, sin interpolación. En un monitor físico de 144 Hz podría notarse un leve tironeo; no se puede verificar aquí.

**Resultados de B-01 a frecuencias normales.** Iguales: caminar 60, correr 102, salto de 41,2 px, 717 ms en el aire; tolerancia de borde de 100 ms y salto anticipado de 110 ms según las pruebas unitarias. `player.ts` solo añade campos o métodos y los comentarios de §2; la lógica de `update()` no cambió (diff revisado).

## 4. Inventario de assets

Arte **propio**, generado por código a partir de las referencias. No se copió ningún píxel del juego, no hubo descargas ni compras y no se agregó ninguna dependencia. `npm run art` lo regenera de forma idéntica: se verificó el hash tras dos generaciones. El método, la paleta, las mediciones aproximadas y los tiempos de animación están en `docs/art/REFERENCIA_ARTE.md`.

| Grupo | Fotogramas / archivos | Tamaño | Anclaje |
|---|---|---|---|
| DK | idle ×2, walk ×4, run ×4, jump-up, jump-down, roll ×4, carry-0, carry-walk ×4, throw, teeter ×2, cheer ×2, hurt (27) | celda 32×32 | (16,32) = pies del cuerpo 12×16 |
| Enemigo tipo Gnawty | walk ×2 (la derrota se dibuja volteando el sprite) | 22×16 | (11,16) |
| Bananas | 3 (brillo) | 10×12 | centro |
| Letras | B E R T O en el nivel (12×12) y en el HUD (9×9) + casilla vacía | — | centro |
| Barril | 4 rotaciones + astillas ×2 | 16×18 / 24×20 | centro |
| Barril estrella | 2 | 18×20 | centro inferior |
| Efectos | destello ×3, estrella de impacto ×2, polvo ×3, estrella ×2 | 9–16 px | centro |
| HUD | dígitos 0–9 (7×9), banana | — | esquina |
| Decorados | casa del árbol 80×76, cueva de salida 64×72, señal EXIT 26×22 | — | centro inferior |
| Tiles | camino 16×12, roca 16×16, lados 6×16, remates 6×12 | — | esquina |
| Fondos | lejano 256×144 (palmeras), cercano 256×88 (follaje) | paralaje 0,25 y 0,55 | pantalla |
| Fuente | 5×7 con contorno, en blanco y en dorado (RetroFont 8×10) | — | — |

Hojas de contacto:
- `docs/art/dk-frames.png`;
- `docs/art/props.png`;
- `docs/art/environment.png`;
- `docs/art/bg-far.png`;
- `docs/art/bg-near.png`;
- `docs/art/palette.png`;
- comparación con el video: `docs/art/comparacion-referencia.png`.

## 5. Comandos y resultados (ejecutados por Claude)

**Entorno:** contenedor Linux con Node 22.22.2, npm ci sobre el `package-lock.json` sin cambios. **Navegador: Chromium 141.0.7390.37** (el de Playwright), usado con `BROWSER_PATH`. **No se ejecutó en Microsoft Edge ni en Windows.** La suite por defecto sigue usando Edge y debe correrse allí (`npm.cmd test`).

| Comando | Resultado |
|---|---|
| `npm run test:unit` | PASS reglas (11 grupos de casos) y PASS jugador (7 grupos) |
| `npm run build` (incluye `tsc --noEmit`) | OK. Sigue el aviso de Vite por el tamaño de Phaser (~1,5 MB, ~350 KB comprimido) |
| `BROWSER_PATH=… node tests/smoke.mjs` (suite completa A, B, 3, 4 y 5) | PASS en **3 ejecuciones seguidas**, sin errores en ejecución |
| `node tests/fps-measure.mjs` | Tabla de §3 |
| En el equipo del usuario (VM Linux de Cowork, Node 22.23.2; copia limpia con `npm ci`) | `tsc --noEmit` en la carpeta real: OK. `npm run test:unit`: PASS. `npm run build`: OK. `npm run art` regeneró el arte **en la carpeta real** con los mismos hashes que en la nube (atlas `6234ab0c…`) |
| `node tests/route-timing.mjs --video …` | Recorrido sin detenerse, cronometrado por un bot: **24,8 s** corriendo (0 muertes) y **41,4 s** caminando (0 muertes), tiempo simulado |

**Duración.** Sin detenerse, Jungle dura entre 25 y 41 s según se corra o se camine. La prueba de fase 5, que se detiene en cada comprobación, tarda 36,4 s simulados. Queda por debajo de la propuesta de 1:15–1:30; **no se alargó**, lo decide el usuario. Es un límite inferior de bot, no una prueba con personas.

**Nota sobre archivos.** La transferencia desde la nube re-codifica los PNG (mismos píxeles, otros bytes; verificado por hash de píxeles). Por eso el arte del juego se regeneró en la carpeta del usuario con `npm run art`. Las capturas de `artifacts/` y `docs/art/comparacion-referencia.png` son las re-codificadas, con el contenido idéntico.

**Inestabilidad.** Durante el desarrollo, dos pruebas nuevas fallaron por la estrategia del bot:
- el pisotón no tenía en cuenta que el enemigo gira;
- el bot que camina caía en el hueco de 320 al bajar de la plataforma 248.

Se corrigió el bot, no el juego. Después, 3 de 3 ejecuciones completas pasaron.

**Observación de diseño (no se cambió).** Caminando, sin correr, al bajar de la plataforma que empieza en x=248 sin saltar, DK aterriza dentro del hueco de 320–344. Hay que saltar en el borde. La geometría es la aprobada en fase 3.

## 6. Capturas y video

En `artifacts/`; se regeneran con `npm test` (suite completa) en `tests/phase5.mjs`:
- **Recorrido:** `phase-5-start.png`, `-walk`, `-jump`, `-ledge` (pose al borde);
- **Barril:** `-carry` (barril sobre la cabeza), `-throw`, `-barrel-hit`;
- **Combate y progreso:** `-checkpoint`, `-hurt`, `-stomp`, `-roll`;
- **Estados:** `-pause`, `-final` (resumen), `-final-page`, `-collisions` (interruptor de colisiones);
- **Encuadre en laptop:** `-laptop-1280x720`, `-laptop-1366x768`, `-laptop-1440x900`.

Video: `artifacts/phase-5-run.webm` (29 s, 1366×768, recorrido corriendo del bot). Se regenera con `npm run build && node tests/route-timing.mjs --video artifacts/phase-5-run.webm`.

Las capturas se revisaron visualmente, no solo por dimensiones. Encuadre verificado: 3× a 1280×720 y 1366×768, y 4× a 1440×900, con carcasa, D-pad y A/B visibles y sin desplazamiento horizontal.

## 7. Física, colisiones y mecánicas que NO cambiaron

- **B-01.** `src/tuning.ts` tiene SHA-256 `87f02c4b43fdde42e00c80839ab5d9cfc1b91ed92b39dfc7f1912315f0f6c9f9`; lo comprueba `tests/jungle.mjs`. El comportamiento se verificó por mediciones y por pruebas unitarias.
- **Física y cámara.** Cuerpo de DK 12×16. Arcade a 60 Hz con `fixedStep` y `forceX`. Límites del mundo, zona muerta de cámara (36×48) y desplazamiento vertical (44) iguales.
- **Hitboxes y valores de acción, iguales:**
  - enemigo 14×12, tolerancia de pisotón 3;
  - recogida 11×14; agarre de barril 22×20; impacto de barril 15×14;
  - rodamiento de 300 ms con dirección forzada;
  - rebote fijo de 150 px/s;
  - enemigos a 18 px/s;
  - barril a 190 / −60 px/s, con 2,5 s de vida;
  - protección de 1,5 s y retorno inmediato.
- **Sin cambios:**
  - los controles (A/D o flechas, K, J contextual, Espacio; Enter sin uso);
  - la geometría del recorrido;
  - las letras no obligatorias y su recuperación, el checkpoint y la conservación de objetos;
  - la salida sin requisito de letras y la ausencia de guardado;
  - la política de reanudar al recuperar el foco.
- **No se agregó:** Rambi, otros personajes, bonus, comodines, audio, nuevos controles, ni Ropey/Reptile/mapa/intro/final.

## 8. Limitaciones, preguntas y lista para Codex

**Limitaciones visuales:**
- el pelaje es algo más marrón que el granate del video;
- el rodamiento es una bola simple;
- el enemigo no está verificado como Gnawty;
- la casa del árbol está a nivel del suelo y no en lo alto como en el original;
- no hay interpolación a 144 Hz;
- la fuente y los paneles son propios;
- sin audio.

**Preguntas para el usuario:**
1. ¿Aprueba la dirección de arte de DK y del entorno?
2. ¿Acepta la duración actual o prefiere ampliar con contenido reconocible?
3. ¿Mantener la pose al borde y el fantasma de golpe?
4. Protección de "Reiniciar Jungle", solo propuesta: pedir una segunda pulsación en 3 s, con el texto "¿Reiniciar? Pulsá otra vez", solo cuando hay progreso; accesible por teclado. No se implementó.

**Qué revisar (Codex):**
1. La secuencia de `simStep` en `movement.ts`: orden, `frozen`, respawn y completado dentro de un paso.
2. `PlayerController.bounce` y el nuevo `syncInput`: los cambios 1 y 2 de §2.
3. Que `gameplay.ts` conserve todos los valores de fase 4 (HITBOX/ACTION).
4. La vista (`gameplay-view.ts`): que no escriba en física ni en reglas y que la animación dependa solo del tiempo simulado o la distancia.
5. Ejecutar `npm.cmd test` en Windows con Edge.
6. La validez de las pruebas del bot (`tests/support/bot.mjs`): solo usa teclado, sin ganchos de prueba en el juego.
7. Las capturas y el video.

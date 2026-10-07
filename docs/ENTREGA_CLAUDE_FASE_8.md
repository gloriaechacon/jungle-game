# Entrega de Claude — correcciones de Ropey (fase 7) y fase 8: Reptile Rumble

Fecha: 29/09/2026. Encargo: [docs/ENCARGO_CLAUDE_FASE_8.md](ENCARGO_CLAUDE_FASE_8.md) más los pendientes de Ropey que el usuario pidió resolver **antes** de la fase 8. Bitácora de trabajo: [docs/NOTAS_CLAUDE_FASE_8.md](NOTAS_CLAUDE_FASE_8.md).

**Estado: implementado y verificado técnicamente por Claude. Pendiente de revisión de Codex, de la suite en Edge/Windows y de la prueba manual del usuario.** No se inició la fase 9 (mapa/progresión), no se rediseñó DK y el arte no se declara aprobado por pasar pruebas.

Invariantes comprobados al cierre:

- `src/tuning.ts` (B-01) SHA-256 `87f02c4b43fdde42e00c80839ab5d9cfc1b91ed92b39dfc7f1912315f0f6c9f9`, sin cambios. Además lo verifica `tests/phase8-unit.mjs`.
- `src/player.ts` y `src/gameplay.ts` idénticos a los recibidos. Cuerpo 12×16, controles (A/D o flechas, K, J, Espacio; Enter sin uso).
- Hueco de Jungle después del checkpoint: **40 px** (`JUNGLE_PHASE6`, 1600–1640), sin cambios; `tests/phase6-unit.mjs` lo sigue exigiendo.
- DK: mismos 27 fotogramas del generador; no se tocó `tools/art/dk.mjs` ni `dk-frames.mjs`. En cuerda sigue la pose provisional `dk-carry-0`.
- Ropey: cámara mínima Y=48 y `climbTop:116` **sin cambios** (no se volvió a la altura ilimitada).
- Rutas intactas: `/` (Jungle fase 6), `/?phase5=1`, `/?greybox=1`, `/?lab=1`, `/?diagnostic=1`, `/?level=ropey`. Nueva: `/?level=reptile`.

Se trabajó sobre una copia en la nube (Linux) para compilar y ejecutar Chromium, y **todos los archivos finales se escribieron en la carpeta real** `C:\Users\Abraham\Documents\Donkey Kong`. El arte se regeneró en esa carpeta con `node tools/art/build-art.mjs` (mismos hashes que en la copia: la generación es reproducible byte a byte).

---

## 1. Pendientes de Ropey (pedido del usuario, antes de la fase 8)

### 1.1 Agarre confuso: «la primera liana agarró solo al saltar y la móvil no»

**Reproducción (Chromium 141, teclado real mediante eventos `keydown/keyup`, sin ganchos de prueba):**

| Caso | Antes |
|---|---|
| Liana de práctica: caminar y W / quieto y tocar W / correr y W / saltar con W | 4/4 agarra |
| Liana móvil 1, parado en el borde manteniendo W | agarra en su punto más bajo… **y a los ~1,7 s el balanceo mete a DK en el escalón 400/152, lo suelta y cae al pozo (muerte)** |
| Liana móvil 1, saltar desde el borde con W mantenido, 8 fases del balanceo | 5/8 corriendo, 5/8 caminando |
| Saltar hacia la liana **sin** W | nunca agarra (hacía falta mantener W y K a la vez) |

Diagnóstico: dos fallos reales y uno de diseño.

1. **Fallo confirmado:** las lianas móviles llegaban hasta y=172 (altura del cuerpo de DK parado). Colgado abajo, el balanceo de `crossing-1` (x 310–410) invade el bloque [400,152,80,28]; la protección de `movement.ts` suelta a DK «en la última posición segura», que está sobre el pozo. Para el jugador: «la móvil no agarra / me suelta».
2. **Inconsistencia:** en el aire había que mantener W *y* saltar con K. En el original uno salta **hacia** la liana y se agarra. Con la liana de práctica (que llega al suelo) W solo funciona; con la móvil hacía falta la combinación. Esa es la diferencia que se percibía.
3. **Riesgo evaluado, no confirmado:** «rodando no se agarra». Rodar dura 300 ms y J (correr) empieza con un rodamiento. En 8 intentos de J + salto hacia la liana, el rodamiento siempre terminó antes del contacto. Queda anotado para la prueba humana; no se cambió la regla del encargo.

**Corrección** (`src/ropes.ts`, `src/ropey-layout.ts`, `src/movement.ts`):

- En el **aire**, tocar una liana la agarra sola (sin W). En el **suelo** sigue siendo W, así que pasar caminando junto a una liana no la agarra.
- **S** mantenida en el aire deja pasar una liana sin agarrarla.
- La liana que DK acaba de soltar no se vuelve a agarrar sola hasta tocar el suelo (si no, al soltarse hacia arriba sin dirección la volvería a atrapar). W la agarra a propósito, una vez vencido el bloqueo de 300 ms que ya existía.
- Las dos lianas móviles terminan ahora en y=140 (antes 172). La amplitud se escaló (50·116/148 y 56·132/164) para que **todo punto por encima de y=140 oscile exactamente igual que antes**; la prueba unitaria compara ambas fórmulas. Colgado en cualquier altura y en cualquier instante del período, el cuerpo ya no toca terreno (barrido completo en la prueba).
- Siguen sin agarre: cargando barril, rodando, en la secuencia de golpe y tras completar. Ni B-01 ni la suelta (salto 235 / corte 105) cambiaron.

**Después (misma prueba):** saltar hacia la liana móvil con o sin W: 10/16 fases corriendo, 8–9/16 caminando (es un hueco con péndulo: hay que esperar que la liana venga; si se va, se cae). Colgarse abajo y esperar un período completo: sigue colgado, sin muerte. K repetido seis veces en el aire tras soltarse: ningún salto extra.

### 1.2 Límite de subida poco claro («parece un error»)

La cuerda se dibujaba hasta arriba de la pantalla, pero se podía trepar solo hasta y=116 (corrección de cámara de Codex). El nudo que lo marcaba se leía como un fallo.

**Corrección visual, sin tocar la regla:** un **dosel nocturno** (`canopy-night.png`, arte generado) cubre la parte alta del nivel; su borde inferior (y≈91–101) está donde llegan las manos de DK en el límite. La cuerda «entra en las hojas»: ya no se ve cuerda por encima del tope. Se quitó el nudo intermedio y se dejó uno pequeño en el extremo inferior (último agarre). Cámara Y=48 y `climbTop:116` quedan como las dejó Codex.

### 1.3 Banana sobre el límite

Antes: bananas de práctica en y 142, 114 y **82** (la última exigía un salto desde la cuerda). Ahora: **150, 134 y 118**; la última queda justo en el tope y se toma trepando. La prueba unitaria exige que toda banana de esa columna sea alcanzable colgado y que una marque el límite.

### 1.4 Carteles y explicación en pantalla

Carteles del nivel: «W AGARRA / W S TREPA / K SALTA» junto a la primera liana y «SALTA A / LA LIANA» antes del primer hueco. El panel lateral explica: saltar hacia una liana la agarra (en el suelo, W), W/S trepa, las manos en las hojas son el tope, K suelta saltando y A/D elige el lado; S en el aire deja pasar.

### 1.5 Guía de prueba manual de Ropey (para el usuario)

Abrir `/?level=ropey`, hacer clic en la pantalla.

1. **Primera liana (suelo seguro):** caminar hasta ella y apretar **W** → DK se agarra. Mantener **W**: sube y toma tres bananas; al llegar a las hojas se detiene (ese es el tope). **S** baja.
2. **Soltarse:** **K** suelta saltando; con **A** o **D** a la vez sale hacia ese lado. Soltarse sin dirección y caer: no vuelve a engancharse solo en la misma liana.
3. **Saltar hacia la liana:** desde el suelo, saltar con **K** hacia la primera liana, sin W → se agarra sola al tocarla.
4. **Liana móvil 1 (primer hueco):** pararse cerca del borde, esperar a que la liana venga hacia DK y saltar hacia ella. Se agarra sola. Trepar un poco con W, esperar a que el balanceo lleve hacia la derecha y soltar con **K + D**.
5. **Liana móvil 2 (después del checkpoint):** igual que la anterior.
6. Comprobar también: Espacio pausa colgado (la liana se congela); caer al pozo devuelve al inicio o al checkpoint conservando bananas y R/T.

Si alguno de estos pasos no se siente natural, anotar cuál: el agarre en el aire es una decisión nueva de esta entrega, fácil de revertir (una línea en `ropes.ts`).

## 2. Resto de la revisión de fase 7

| Punto del encargo | Resultado |
|---|---|
| Orden en WORLD_STEP, agarre cinemático, gravedad y `body.moves` | Correcto: al agarrar se desactivan gravedad y movimiento; se restauran al soltar, al cancelar por sólido, al caer, al morir y al reiniciar. |
| Colisión con sólidos durante el balanceo | **Fallo confirmado** (1.1.1): corregido con datos y prueba de barrido. La cancelación queda como red de seguridad y ya no re-agarra la misma liana. |
| K rápido/repetido, W mantenido, salto aéreo extra | Sin salto extra (probado en navegador). W mantenido vuelve a agarrar tras 300 ms si sigue cerca: intencional. |
| Pausa/foco colgado, reinicio agarrado, caídas, teclas pegadas | Cubierto por la prueba de Codex; pasa. |
| B contextual con cuerda/barril; rodando/muriendo/terminado | Correcto (ver riesgo 1.1.3). |
| Ambos huecos cruzables por teclado sin depender de fps | Sí; la simulación sigue en pasos fijos. El bot del recorrido ahora espera a que la liana se acerque (como un jugador) y tiene menos reintentos ciegos. |
| R/T, recuperación antes de la salida, persistencia, reinicio | Correcto. |
| Cámara vertical, legibilidad, encuadre 1366×768 | Correcto; el dosel no tapa suelo ni aterrizajes. |

Fallos frente a preferencias: los únicos cambios de comportamiento son el choque con terreno (fallo), el agarre en el aire (inconsistencia reportada por el usuario) y la presentación del tope/bananas (pedido explícito). Nada más de Ropey se cambió por gusto.

## 3. Fase 8: Reptile Rumble (`/?level=reptile`)

Adaptación corta de la cueva de GBC tomando como referencia `docs/REFERENCIA_NIVELES.png` (5:10–6:55): cortinas moradas colgando del techo, piedra oscura, franja de suelo naranja cálida, neumáticos negros, cartel EXIT. Nivel propio de 1600 × 256 px, no extraído del mapa original.

### 3.1 Recorrido (dificultad escalonada, retornos cercanos)

1. Inicio plano con bananas; una serpiente lenta.
2. **Primera llanta (x=356) sobre suelo seguro**, pegada a una repisa de 48 px que un salto normal no alcanza. Cualquier rebote la alcanza. Cartel «SALTA EN / LA LLANTA».
3. **O opcional** justo encima de la primera llanta: solo la alcanza el rebote alto (K mantenida). Si no se toma, reaparece sobre la meseta final, en suelo seguro, antes de la salida. No bloquea la salida.
4. Serpiente en la repisa; barril y serpiente en el suelo.
5. **Segunda llanta (x=744)** pegada a una pared de 64 px: el rebote bajo no la supera y el alto sí. Cartel «MANTENE K / AL REBOTAR». Si falla, DK cae de nuevo sobre la llanta y vuelve a rebotar.
6. Checkpoint (barril estrella, x=880). Un pozo de 32 px (fácil incluso caminando), barril y serpiente.
7. **Ascenso final:** tercera llanta → escalón de 48 px → dos escalones de 32 px con salto normal → meseta despejada con la salida.

Cada llanta toca el terreno más alto siguiente: no quedan huecos entre llanta y pared.

### 3.2 Decisiones y parámetros nuevos (fuera de B-01)

| Parámetro | Valor | Dónde |
|---|---|---|
| Rebote bajo (sin K al tocar) | 250 px/s → ≈49 px de subida | `TIRE.bounce`, `src/tires.ts` |
| Rebote alto (K mantenida al tocar) | 320 px/s → 80 px | `TIRE.boost` |
| Tamaño de la llanta (sólido) | 24 × 12 | `TIRE.halfW/height` |
| Aplastamiento visual | 160 ms de tiempo de simulación | `TIMING.tireSquashMs` |
| Serpientes | hitbox 14×12 de fase 4, 20–24 px/s | datos del nivel |
| Cámara legible | suelo más bajo a ±80 px en la fila 128; sube solo lo necesario para ver el sprite entero | `src/camera.ts` |

- Aterrizar sobre una llanta siempre rebota (no se puede estar parado encima). Soltar K al subir aplica el corte normal de B-01, así que la altura queda bajo control del jugador. Si en ese mismo paso se aceptó un salto (K al aterrizar), la velocidad de la llanta lo reemplaza.
- **Límite de velocidad:** el cuerpo usa `setMaxVelocity(102, 280)` y en Arcade ese tope es simétrico, así que recortaba el rebote alto a 280. Solo durante la subida de una llanta se eleva el tope al valor del rebote; se restaura en el ápice (vy ≥ 0) y en todo retorno o reinicio. **La caída sigue limitada a 280**: la prueba de navegador lo muestrea en cada fotograma.
- Las llantas son sólidos para física y barriles, y se dibujan como llantas (no como suelo). Pausa, foco y completado congelan el rebote y la animación; reiniciar o morir limpia su estado.
- **Agacharse: no implementado.** La ruta no tiene techos bajos; la prueba unitaria verifica que no hay techo a menos de 32 px sobre ningún suelo. No hay túnel decorativo imposible.
- Serpiente propia («tipo Slippa», verde con vientre claro para contrastar con el morado); mismas reglas de enemigo que Jungle (pisotón, rodamiento, barril, golpe de 600 ms).
- Reglas reutilizadas sin cambios: `LevelRules` (bananas, O, checkpoint, recuperación, salida sin letras, golpe), controlador B-01, barriles, pausa/foco. Datos en `src/reptile-layout.ts`; simulación a 60 Hz fijos.
- Enlaces: desde cada nivel se puede abrir cualquiera de los otros dos como prueba independiente. No hay progreso compartido.

### 3.3 Qué queda fuera

Mapa, progresión entre niveles y fase 9; cumpleaños, textos personales, comodines, audio, consola final, intro, zoom; Diddy/Rambi; controles móviles; salas bonus o minijuegos; rediseño de DK; agacharse.

## 4. Arte nuevo (generador, `npm run art`)

Todo propio, dibujado por código y reproducible byte a byte (dos ejecuciones seguidas con el mismo hash). Nada descargado ni copiado del juego.

- `tools/art/env.mjs`: `canopyNight` (dosel de Ropey), `caveTop/caveFill/caveSide/caveCap` (suelo naranja y roca roja), `caveFar` (pared y cortinas moradas), `caveNear` (formaciones y estalagmitas).
- `tools/art/props.mjs`: `snake` (2 fotogramas, 22×12) y `tire` (normal y aplastada, 24×14).
- Hojas de contacto: `docs/art/cave.png`, `cave-far.png`, `cave-near.png`, `canopy-night.png`; `props.png` incluye serpiente y llanta. `docs/art/manifest.json` actualizado.
- El atlas cambió de tamaño (256×250) al sumar sprites; los fotogramas de DK son los mismos píxeles.

## 5. Archivos

Nuevos: `src/tires.ts`, `src/camera.ts`, `src/reptile-layout.ts`, `tests/phase8-unit.mjs`, `tests/phase8.mjs`, `docs/ENTREGA_CLAUDE_FASE_8.md`, `docs/NOTAS_CLAUDE_FASE_8.md`, `public/assets/canopy-night.png`, `public/assets/cave-*.png`, `docs/art/cave*.png`, `docs/art/canopy-night.png`, capturas `artifacts/phase-8-*.png` y video `artifacts/phase-8-run.webm`.

Modificados: `src/ropes.ts`, `src/ropey-layout.ts`, `src/movement.ts` (nivel, llantas, tope de subida, cámara legible, agarre con suelo), `src/gameplay-view.ts` (tema cueva, serpientes, llantas, dosel, piso de la salida), `src/art-spec.ts`, `src/jungle-layout.ts` (solo tipos opcionales; los datos de Jungle no cambian), `src/main.ts` (ruta, textos, enlaces), `src/style.css` (enlaces), `tools/art/build-art.mjs`, `tools/art/env.mjs`, `tools/art/props.mjs`, `tests/phase7-unit.mjs`, `tests/phase7.mjs`, `tests/smoke.mjs` (`--phase8-only`), `package.json` (unitaria de fase 8), `public/assets/jungle-atlas.*`, `docs/art/*` regenerados; AGENTS, README, CONTEXTO, FASE_7, PLAN_ACTUALIZADO y REFERENCIA_ARTE con una actualización al principio (sin borrar historial).

Sin cambios: `src/tuning.ts`, `src/player.ts`, `src/gameplay.ts`, `src/input.ts`, `src/scenes.ts`, `tools/art/dk.mjs`, `tools/art/dk-frames.mjs`.

## 6. Pruebas

Sistema y navegador usados por Claude: **Linux (nube) con Chromium 141.0.7390.37 headless** mediante Playwright 1.62.1 (`BROWSER_PATH`), Node 22. **No se ejecutó en Microsoft Edge ni en Windows: queda pendiente para Codex** (`npm.cmd test`).

| Comando | Resultado |
|---|---|
| `npm run test:unit` (reglas, B-01, fase 6, fase 7, **fase 8**) | PASS |
| `npm run typecheck` / `npm run build` | PASS (aviso habitual de tamaño del paquete de Phaser) |
| `npm test` completo: A/B/3/4/5/6/7/8 en navegador | PASS, cero errores de ejecución (ver §6.1) |
| `node tests/smoke.mjs --phase7-only` × 3 seguidas | PASS las tres (31,6–31,9 s, 2 retornos: uno deliberado) |
| `npm run art` dos veces | mismos hashes |
| En la carpeta real (VM Linux del equipo): arte regenerado + `test:unit` | PASS, hashes iguales a la copia |

Qué prueban las nuevas:

- `tests/phase8-unit.mjs`: hash de B-01; contacto con la llanta (solo apoyado sobre ella); velocidades bajo/alto y alturas contra la geometría (el salto normal no alcanza la repisa, el rebote bajo sí; el bajo no supera la pared, el alto sí; escalones finales con salto normal); O solo con rebote alto y recuperación en la meseta; serpientes apoyadas; bananas fuera de sólidos; sin techos bajos; un único pozo de 32 px tras el checkpoint; salida sin letras; reinicio limpio; cámara legible (aterrizaje y sprite visibles, incluido un rebote alto completo paso a paso).
- `tests/phase8.mjs` (teclado real): rebote alto con K (320) y bajo sin K (250) con subida claramente mayor; O tomada; pausa en pleno rebote congela tiempo, posición, cámara y llantas; reinicio borra O y contador; recorrido completo con repisa (rebote bajo), pared (rebote alto), checkpoint, **caída deliberada al pozo** (vuelve al checkpoint conservando progreso), **golpe deliberado de una serpiente** (pose de golpe y retorno), ascenso final, O recuperada antes de la salida, salida congelada (Espacio no hace nada) y reinicio limpio; caída nunca por encima de 280 px/s y rebote alto sin recorte.
- `tests/phase7-unit.mjs` (añadido): agarre en el aire sin W, en el suelo solo con W, S deja pasar, sin re-agarre de la liana soltada hasta tocar suelo, barrido de terreno colgado en todo el período, geometría de balanceo idéntica, bananas de práctica alcanzables. Se comprobó que el barrido **falla con los datos anteriores** (detecta el choque en 400/152).
- `tests/phase7.mjs` (añadido): saltar hacia la liana móvil sin W la agarra; colgarse abajo un período completo sin caer.

### 6.1 Resultado de la suite completa

Última ejecución de `npm test` (29/09/2026, Chromium 141.0.7390.37, Linux), salida resumida, `EXIT 0`:

```
PASS rules / player / phase 6 rules / phase 7 unit / phase 8 unit
PASS movement · PASS Jungle · PASS phase 4 · PASS phase 5 framing · PASS phase 5 (sim 36.4 s, 1 muerte)
PASS phase 6 Edge route: ... Route 35.1s, 1 retries (bot)
PASS phase 7 browser: ... jump-in grab without W, full swing hanging at the bottom, ... 31.57 s; 2 retries (1 deliberada)
PASS phase 8 browser: tires low/high, optional O, pause mid-bounce, restart, keyboard route (ledge 250, wall 320),
     checkpoint fall, snake hit + return, O recovery, exit/freeze/restart. Bot route 27.1 s with 2 deliberate returns
PASS: selected browser checks completed with zero runtime errors.
```

### 6.2 Duración: bot frente a persona

- Bot, Reptile limpio (sin muertes, O recuperada al final): **18,9–19,8 s**. Con los dos retornos deliberados de la prueba: 27,1 s.
- Bot, Ropey: 31,6–31,9 s con dos retornos (uno deliberado).
- **No son tiempos humanos.** Un jugador que lee los carteles, prueba el rebote y espera las lianas tardará bastante más; no se midió y no se agregó relleno. Duración y dificultad quedan para el playtest del usuario.

## 7. Capturas y video

En `artifacts/` (página completa a 1366×768, pantalla a 3×):

- `phase-8-start.png` — inicio de la cueva.
- `phase-8-o-tire.png` — rebote alto sobre la primera llanta con la O tomada (HUD) y la repisa pegada.
- `phase-8-wall.png` — sobre la pared después del rebote alto.
- `phase-8-checkpoint.png` — checkpoint activado.
- `phase-8-hurt.png` — golpe de serpiente (muerte/reintento).
- `phase-8-ascent.png` — segundo escalón del ascenso final.
- `phase-8-finish.png` — resumen final con la O.
- Regresión de Ropey: `phase-7-climb.png` (DK en el tope, manos en el dosel), `phase-7-rope-landing-visible.png`, `phase-7-start.png` (carteles nuevos), `phase-7-rope-paused.png`, `phase-7-finish.png`.
- Video: `phase-8-run.webm` (recorrido del bot, ≈20 s de juego).

## 8. Pendientes y riesgos para Codex

- [ ] Ejecutar `npm.cmd test` en **Windows con Edge** (Claude solo usó Chromium/Linux).
- [ ] Revisar la decisión de **agarre automático en el aire** (Ropey) frente al «W agarra» del encargo; es una línea en `ropes.ts` si el usuario prefiere W siempre.
- [ ] Riesgo menor: el rodamiento inicial de J (300 ms) bloquea el agarre; en las pruebas no molestó.
- [ ] Revisar que el tope de velocidad elevado durante el rebote (`restoreFallCap` en `movement.ts`) no tenga caminos sin restaurar (restaurado en ápice, reinicio, retorno, caída y golpe).
- [ ] Legibilidad del dosel nocturno: el contraste con el fondo verde es moderado; confirmar en pantalla real.
- [ ] La cámara legible solo se usa en Reptile; Ropey y Jungle conservan su cámara.
- [ ] Balance humano de Reptile (rebote alto para la O y la pared, velocidad de serpientes) y duración: sin playtest.
- [ ] Arte de cueva, serpiente y llanta: primera versión, sin aprobación visual del usuario.
- [ ] No se implementó agacharse (justificado en 3.2).

## 9. Resumen para pegar en Codex

> Claude terminó el encargo de fase 8 en `C:\Users\Abraham\Documents\Donkey Kong` (informe: `docs/ENTREGA_CLAUDE_FASE_8.md`). Primero corrigió Ropey: las lianas móviles llegaban al suelo y, colgado abajo, el balanceo metía a DK en el bloque 400/152 y lo soltaba al pozo (fallo confirmado); ahora terminan en y=140 con amplitud escalada (mismo balanceo arriba) y una prueba barre todo el período. Además, en el aire tocar una liana la agarra sin W (en el suelo sigue W; S deja pasar; la liana recién soltada no se re-agarra sola hasta tocar suelo). El tope de subida se comunica con un dosel generado que tapa la cuerda por encima de y≈96; cámara Y=48 y climbTop 116 sin cambios. Bananas de práctica en 150/134/118. Fase 8: `/?level=reptile`, cueva GBC propia (arte generado con `npm run art`), serpientes, 3 llantas con rebote propio (250 sin K / 320 con K; tope de velocidad elevado solo al subir, la caída sigue en 280), O opcional sobre la 1.ª llanta con recuperación, checkpoint, un pozo de 32 px, ascenso final y cámara vertical legible (`src/camera.ts`). Sin agacharse (no hay techos bajos). B-01 intacto (hash 87f02c4b…f9), `player.ts`/`gameplay.ts` sin cambios, hueco de Jungle 40 px, DK sin rediseño. Suite completa A/B/3/4/5/6/7/8 PASS en Chromium 141/Linux; **falta Edge/Windows**. Revisar: agarre en el aire, `restoreFallCap`, legibilidad del dosel, balance humano. No se inició fase 9.

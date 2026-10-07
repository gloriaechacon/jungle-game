# Consola teal, encendido y correcciones de liana

02/10/2026. Alcance pedido por el usuario: presentación de fase 11 y encendido/acercamiento de fase 12. El usuario aprobó la carcasa teal y pidió después encendido automático a los tres segundos y tipografía idéntica al rótulo del marco. No es cierre de todo el juego.

## Qué cambió

- Primera foto como base de la carcasa, conservando color teal, textura, volumen aparente, marco negro, botones y GAME BOY COLOR. Nintendo retirado. Es un recorte fotográfico editado, no una malla 3D ni una reproducción garantizada píxel por píxel. No se sustituyó por una consola dibujada con rectángulos.
- El juego real se inserta en el LCD; no es una captura estática. Resolución lógica 160×144 intacta. Acercamiento con escalas enteras 1×–4× según espacio. Vista completa prioriza proporción física de consola y puede usar escala fraccional del juego.
- Encendido vigente: consola apagada durante 3 s, LED rojo y GAME BOY COLOR a los 3 s, zoom automático desde 4,8 s y juego a los 6,4 s. No necesita clic ni foco de teclado: el reloj depende solo de que la página sea visible. Pestaña oculta detiene el reloj, y al volver no cuenta el tiempo oculto. Se indica expresamente que no hay que pulsar nada. Sin audio. Escape o botón omiten; «Repetir encendido» congela el juego y continúa sin resetearlo. Movimiento reducido conserva los 3 s y el logo, pero cambia directamente al encuadre de juego a los 4,8 s sin animar el acercamiento.
- WASD/flechas oscurecen la región correspondiente de la cruceta; J=B, K=A, Espacio=Start. Los indicadores leen la misma entrada que el juego. Al perder foco se liberan. No se inventó un nuevo mapeo.
- «Ver consola completa»/«Acercar pantalla», repetición y ayuda. En el acercamiento se recorta la parte inferior de la consola para que el LCD sea grande; en la vista completa se ven los botones.
- Responsive visual para laptop y teléfono. Los botones dibujados aún NO son controles táctiles: el usuario quiere definirlos después. No se añadió gesto de pantalla completa ni bloqueo de orientación.

## Liana y tutorial

La imagen del atlas tiene un pivot personalizado. Al invertirla, Phaser refleja alrededor del origen; el código anterior también invertía el origen de 24 a 8 píxeles, desplazando el agarre 16 píxeles. Ahora cuerpo y capa de manos mantienen origen (24,10) de la celda 32×32 en ambos sentidos. Sin tocar colisiones, física, sprite de caminar/rodar ni alcance de agarre.

El ejercicio de liana baja el contraste de todo el fondo para destacar las manos, sin un recuadro aislado detrás del personaje. Mensajes cambian por situación: «W PARA AGARRAR», «MANTEN W PARA SUBIR / S PARA BAJAR» y «K SUELTA Y SALTA / A / D ELIGE EL LADO». W no es salto. K conserva salto/salida de la liana. Ropey usa también «K SUELTA Y SALTA», sin sugerir que D sea la única dirección válida. La frase se acortó después de detectar recorte al borde en la revisión de capturas.

## Archivos y reproducción

- `src/console-presentation.ts`: estado de encendido, cámara CSS, foco, tamaños y guía.
- `src/console.css`: encuadre, capas de foto/botones/LED/LCD.
- `src/input.ts`: bloqueo temporal de entrada; bindings intactos.
- `src/main.ts`: montaje en aventura normal y espejo legible de instrucciones.
- `src/gameplay-view.ts`, `src/movement.ts`: anclaje y claridad del tutorial.
- `tests/phase11.mjs`: integración de consola y ambas orientaciones del agarre.
- Pruebas anteriores de aventura usan la ruta pública de diagnóstico `/?adventure=1&workbench=1`; la prueba nueva usa la presentación normal, sin saltarse la intro.

Ejecutar `npm.cmd run dev` y abrir `http://127.0.0.1:5173/?adventure=1`. Para repetir solo estas pruebas: `npm.cmd run build` y `node tests/smoke.mjs --phase11-only`. Suite completa: `npm.cmd test`.

No nuevas dependencias. El PNG está dentro de `public/assets`, incluido en build. El proyecto funciona independientemente de las carpetas Codex/Temp originales. `npm run art` sigue regenerando el pixel art existente; no regenera esta foto.

## Recurso y especificación de edición de imagen

Modo: herramienta integrada imagegen, edición con fondo transparente; no CLI, API key ni descargas de material externo. Target: primera fotografía suministrada, `codex-clipboard-413c0f11-4da0-48cc-bfa3-990dd9e4dbc8.png`, conservada en `docs/console/referencia-teal.png`. Las otras dos fueron referencias de apoyo, no el encuadre elegido. Salida final: `public/assets/console-teal.png` (981×1604, canal alfa), copiada al proyecto después de generarla, SHA-256 `1e2ce780c74a6f219b778d3bc357dd6a8e123221556aaa0d11811c5fa82d1fd3`. Coordenadas medidas: LCD x247/y183/ancho486/alto437,4; botones y LED se recortan sobre la misma foto para conservar registro.

Especificación del prompt de edición, normalizada para reutilizar:

```text
Use case: precise-object-edit / background-extraction.
Asset: photographic front console for a browser game, with a live LCD overlay.
Image 1 is the edit target: the first supplied front-facing teal Game Boy Color.
Preserve its front-view geometry, proportions, asymmetric rounded bottom,
charcoal bezel, teal color, plastic grain, real lighting and all button locations.
Restore as a high-resolution photographic cutout, with the entire object in view
and actual transparent alpha outside the console, not a white backdrop.
Only remove every Nintendo word/embossed badge, including the text on the LCD.
Make the LCD blank dark desaturated gray-green and the power LED unlit dark red.
Keep GAME BOY COLOR (white and multicolored lettering), POWER, A/B buttons,
cross D-pad, SELECT/START and speaker holes. Preserve natural material relief.
Keep the LCD axis aligned with the reference and suitable for a 10:9 live screen.
Do not redesign, tilt or change the console color. No scenery, extra UI or text.
```

El logo de encendido muestra la región x260/y674/ancho466/alto80 de la misma imagen de carcasa mediante una ventana CSS. No hay fuente sustitutiva, letras redibujadas ni PNG nuevo: el contorno tipográfico es el mismo del marco. Contraste y mezcla de pantalla atenúan el fondo del rótulo sobre el LCD oscuro; los colores pueden verse más luminosos por ese tratamiento. El recurso de carcasa aprobado permanece byte por byte igual. Los pressed states usan la propia imagen oscurecida y máscaras alineadas; no varias fotografías de aparatos distintos.

## Verificación

Revisión del encendido automático: build/tipos y `node tests/smoke.mjs --phase11-only` PASS en Edge 154.0.4258.48 / Windows. Prueba nueva mantiene la página visible con `document.hasFocus()` simulado falso y evento blur: sin teclas ni clics pasa apagado → logo → zoom → juego, respeta la espera de unos 3 s y NO activa controles sin foco. Verifica que el logo utiliza el mismo archivo de la carcasa. También PASS: replay, Escape, encuadres, botones, movimiento reducido y agarre por ambos lados. Inspección en navegador de la secuencia completa y de captura `phase-11-power-on.png`. No se volvió a ejecutar toda la suite de niveles para este ajuste exclusivo de presentación; abajo se conserva la última suite completa.

Prueba específica PASS en Microsoft Edge 154.0.4258.48 / Windows: encendido, bloqueo de entrada, vista completa/acercada, combinaciones de botones, liberación al perder foco, replay sin reinicio, Escape sin salir del nivel, relación 10:9, escalas enteras en close-up, movimiento reducido, agarre por ambos lados. Tamaños 1366×768, 390×844, 320×568 y 844×390 sin LCD cortado ni desborde horizontal. Son ventanas de navegador, no dispositivos físicos ni prueba táctil.

`npm.cmd test` completo PASS en Edge/Windows: unitarias, tipos, build y A/B/3/4/5/6/7/8/9/10/11, cero errores de ejecución. Los tres niveles se completaron en una sesión, con retorno al mapa, desbloqueos y progreso intactos. Después se acortó exclusivamente la frase de salida de la liana y se sustituyó el recuadro local del tutorial por oscurecimiento uniforme: build y repetición específica de fases 10 y 11 PASS. La repetición añadió el caso exacto de saltar hacia la liana desde la derecha, con agarre automático sin W y mirando a la izquierda: PASS y captura `phase-11-grip-left-air.png`. Advertencia conocida de Vite: paquete de Phaser grande; no es un error de compilación.

Capturas: `artifacts/phase-11-power-on.png`, `phase-11-whole.png`, `phase-11-closeup.png`, `phase-11-buttons-pressed.png`, `phase-11-viewport-*.png`, `phase-11-grip-left.png`, `phase-11-grip-right.png`. Tutorial: `phase-11-tutorial-rope.png`, `phase-11-tutorial-grip.png` (suite fase 10).

B-01 verificado sin cambios: SHA-256 `87f02c4b43fdde42e00c80839ab5d9cfc1b91ed92b39dfc7f1912315f0f6c9f9`.

## No hecho todavía

Controles multitáctiles y su ergonomía, carátula/título de juego definitivo, música/sonidos, final personal, publicación de repositorio/hosting y revisión previa de materiales para una versión pública. Nada de esto se declara resuelto por quitar una marca del recorte. El usuario aprobará primero la apariencia y explicará el táctil.

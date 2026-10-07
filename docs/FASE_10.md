# Fase 10 — revisión tras playtest, 02/10/2026

## Corrección posterior — tutorial sin bloqueos, 03/10/2026

El usuario reportó un bloqueo al pisar al enemigo del ejercicio de rodar. Confirmado también a la inversa: la baja eliminaba el único objetivo, pero la lección esperaba otro tipo de ataque. Se reprodujo con una prueba de teclado sobre la compilación anterior (enemigo muerto, roll=1, lección de pisotón sin completar).

Ahora las lecciones 5–7 (índices 4–6) detectan objetivos agotados sin la acción requerida. Muestran «OTRA VEZ!» con la acción esperada durante 1,2 segundos de simulación activa y repiten únicamente ese paso, con DK en su inicio seguro, rival y barril repuestos. También se recupera un barril lanzado sin acertar cuando deja de estar en vuelo. Un acierto válido siempre tiene prioridad y avanza normalmente. Pausa/foco congelan la espera; no se modifica campaña, física B-01, carcasa, zoom ni reglas de los niveles normales.

Verificación: tipos/build, unitarias generales y test:phase10 PASS. phase10-only PASS en Edge 154/Windows: rodar en vez de pisar, pisar en vez de rodar, pisar el objetivo del barril, lanzar el barril al lado contrario, pausa durante reintento, recuperación y nueve lecciones completadas con teclado. touch-only PASS: ambos ataques equivocados con contactos táctiles nativos, reaparición, acción correcta y todas las lecciones hasta nivel 1; también regresiones de zoom, multitouch, pausa y rotación. Capturas de aviso inspeccionadas: artifacts/touch-tutorial-retry-4.png y touch-tutorial-retry-5.png. Sin errores de ejecución. La prueba nueva falló antes de aplicar el arreglo y pasó después. No se repitió npm test completo para esta corrección. Safari físico pendiente del usuario. Servidor LAN actualizado: /?adventure=1&revision=tutorial-retry.

## Vigente: sin comodines; aprender y explorar

El usuario retiró los comodines y pidió más opciones de recorrido, un segundo checkpoint en Ropey, práctica interactiva e instrucciones legibles. Lo siguiente sustituye el alcance anterior; no añade poderes ni inicia fase 11.

- Comodines retirados de los tres niveles, HUD y resumen. Queda soporte interno inactivo para datos antiguos, no objetos en el juego. Bananas y BERTO conservados.
- Práctica antes de Jungle: caminar, saltar, rodar, correr, pisar rival, rodar contra rival, agarrar/lanzar barril, llanta y trepar/soltar liana. Nueve ejercicios de una sola pantalla usando las mismas reglas y física. Avanza por acción conseguida, no por pulsación sin efecto. Esc omite y vuelve al mapa; «Repetir práctica» permite repetir. No suma progreso de aventura. Reiniciar repite el ejercicio actual.
- Segundo checkpoint Ropey en x1560, antes de la sección final de lianas; primero x650 intacto. Retroceder no reemplaza el punto más avanzado. Reiniciar la etapa borra ambos, morir no.
- Plataformas opcionales: Jungle x248/584/944/1040/1472/2016; Ropey x510/964/1380/2012; Reptile x368/1188/1600/1680. Tienen grosor 6–8 px, suelo inferior y espacio para pasar. Colisión solo por arriba; se atraviesan al saltar desde abajo. Barriles también pueden aterrizar encima. Tierras continuas y saltos obligatorios restantes conservados.
- Instrucciones de práctica/liana/llanta con fuente pixel 5×7 (antes carteles 3×5), fondo oscuro y réplica HTML de 18 px. Menú del mapa también usa fuente mayor. Aviso al activar cada checkpoint.
- Sin cambios en B-01, controles, sprites, animaciones, balanceo o rebotes. Los niveles no se alargaron nuevamente. Progreso en memoria de sesión, no guardado permanente.

### Verificación de esta revisión

`npm.cmd test` completo PASS en Microsoft Edge 154.0.4258.48 / Windows: unitarias, tipos, build, A/B/3/4/5/6/7/8/9 y práctica 10; cero errores de ejecución. Las nueve lecciones pasan con teclado, así como omitir/repetir y la transición a Jungle sin contaminar la campaña. Prueba real de caminar bajo la plataforma x248 y saltar para aterrizar encima. Dos caídas deliberadas en Ropey verifican regreso a x650 y x1560 con letras conservadas. Los tres niveles se completan en una sesión con progreso, mapa, repetición y recarga. El bot de Ropey se adaptó para elegir la ruta inferior y distinguir enemigos elevados; la física no se alteró para satisfacer la prueba. Unitarias adicionales cubren barriles que atraviesan la plataforma al subir y aterrizan al bajar.

B-01 conserva SHA-256 `87f02c4b43fdde42e00c80839ab5d9cfc1b91ed92b39dfc7f1912315f0f6c9f9`. La compilación mantiene únicamente el aviso conocido de tamaño del paquete de Phaser. Para repetir solo la práctica y la plataforma: `npm.cmd run build` y `node tests/smoke.mjs --phase10-only`.

Capturas nuevas: `artifacts/phase-10-practice.png`, `artifacts/phase-10-platform.png`. Pendiente aprobación humana de dificultad y legibilidad a escala de laptop.

## Historial: primera implementación (retirada)

Autorizada por el usuario junto con regreso directo al mapa y renovación del mapa. Los diseños y significados personales de los comodines quedan pendientes.

## Regreso y mapa

- Esc desde cualquier etapa de la aventura vuelve inmediatamente al mapa. Solo actúa con el juego enfocado; no captura teclas al escribir en otros controles. Conserva las etapas completadas y descarta el intento actual, igual que el botón «Esc · Volver al mapa». El menú Espacio → J → J sigue disponible.
- Mapa de selva cercana con terrazas de roca, sombras, árboles superpuestos, cueva y senderos curvos. Pantalla lógica 160×144 conservada; no se agrandó la física ni la ventana.
- El mono camina 1,1 segundos entre nodos con sus seis poses, sigue exactamente la curva del sendero y cambia ligeramente de tamaño con la profundidad. Al perder foco se detiene. K durante el trayecto espera a la llegada antes de entrar. Las selecciones nuevas se aceptan al llegar.
- Al completar una etapa camina automáticamente hacia el nodo siguiente. Volver a mitad de una etapa conserva el nodo de origen.

## Comodines provisionales

Un coleccionable opcional por nivel, sin poderes ni texto personal inventado. Tarjeta turquesa provisional; conteo separado de bananas y BERTO, visible en HUD, resumen y mapa.

- Jungle: x274/y54, salto sobre la plataforma temprana.
- Ropey: x1010/y102, salto desde la plataforma alta después del checkpoint.
- Reptile: x1378/y36, salto desde la primera meseta alta.

Se aprovechan plataformas existentes: no se alargaron otra vez los niveles ni se añadieron salas bonus. El tiempo adicional procede de buscar y alcanzar los coleccionables. Queda para playtest decidir si conviene un desvío más largo.

Recoger conserva el objeto durante muertes del intento; completar lo incorpora a la sesión. Repetir no duplica. Reiniciar o abandonar antes de completar descarta lo nuevo; recargar borra la sesión. Son opcionales y jamás bloquean salidas. B-01 intacto.

Los objetos definitivos, su cantidad final, significado y posibles efectos necesitan decisión del usuario. Esta entrega permite probar su recolección y persistencia.

## Verificación

Tipos, compilación y todas las unitarias existentes PASS; `npm run test:phase10` PASS para recolección, conteos separados, accesibilidad vertical, muerte/reinicio, guardado/restauración y no duplicación. B-01 conserva SHA-256 `87f02c4b43fdde42e00c80839ab5d9cfc1b91ed92b39dfc7f1912315f0f6c9f9`.

En Edge 154.0.4258.48 / Windows: recorrido de los tres niveles en una sesión PASS, Escape recién entrado en cada etapa (incluido Ropey), desbloqueos, regreso, repetición y recarga. Recogida de un comodín con saltos reales de teclado PASS y descarte al abandonar. Marcha entre nodos comprobada. Cero errores de ejecución. La primera ejecución de la prueba nueva pulsaba K antes de que cargara el mapa; se corrigió la espera del bot y pasó. No fue necesario modificar la física.

Capturas: artifacts/phase-10-map-preview.png, artifacts/phase-10-map-walking.png y artifacts/phase-10-comodin.png. Aprobación estética y balance humano pendientes. No se repitió toda la suite A–5 tras estos cambios; se ejecutó la integración de tres niveles (6–9), regresiones unitarias y la prueba nueva de fase 10.

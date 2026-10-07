# Going Bananas

**Tutorial, paso 5 (07/10):** ahora explica mantener la dirección, pulsar salto y **caer encima del rival para derrotarlo**, en tres líneas dentro de la misma tarjeta. Teclado D/K y teléfono derecha/A; sin instrucciones duplicadas ni cambios de mecánica.

**Nombre e icono (07/10):** pestaña «Going Bananas» y favicon PNG transparente con la banana original del sprite, centrada y ampliada sin suavizado. `npm run art:icon` regenera solo el icono; `npm run art` también lo incluye. No cambia la carcasa, el título dentro del juego, la música ni los niveles. Cambios locales, sin commit/push/despliegue.

**Entrada predeterminada (07/10):** abrir `/` muestra directamente el Game Boy y su invitación de encendido, sin redirigir ni añadir parámetros. Los enlaces anteriores `/?adventure=1` siguen funcionando. La prueba independiente de Jungle se abre ahora en `/?level=jungle`; los otros niveles y laboratorios conservan sus rutas. Prueba específica: `npm run build` y `node tests/smoke.mjs --entry-only`. Este cambio local no publica ni despliega el proyecto.

**Inicio y tutorial (04/10, seguimiento vigente):** «Presiona A: comenzar/entrar» en el visor (K en computadora), fuera solo círculos; también al reiniciar. «Aprende jugando» ya no repite círculo A. Excepción: primera llanta con aviso compacto arriba y A señalado, sin duplicado dentro. Mina/arte/música intactos; rival gris pendiente de diseño. [Detalle y pruebas](docs/GUIA_LCD_Y_CURVAS_MINA.txt). Ruta local `/?adventure=1&revision=circulos-y-llanta`.

**Guía LCD y mina (04/10, vigente):** instrucciones de tutorial/inicio/mapa en el visor claro, fuera solo círculos en botones. Se mantiene el aviso externo A/K de la mina, ahora con subidas/bajadas más pronunciadas y los mismos dos huecos. Cañón, música, niveles y B-01 intactos. Sustituye la tarjeta externa del tutorial descrita abajo. [Detalle y pruebas](docs/GUIA_LCD_Y_CURVAS_MINA.txt). Ruta local `/?adventure=1&revision=lcd-y-mina`; no publicado.

**Guía y saltos (04/10, vigente):** tutorial con una sola tarjeta clara y botones señalados; pausa de alto contraste. Salto posterior al checkpoint de Jungle más tolerante, dos lagartos añadidos y refuerzo moderado en Ropey. Lianas, música y B-01 conservados. [Detalle y pruebas](docs/GUIA_UNICA_Y_SALTO.txt). Ruta local `/?adventure=1&revision=guia-y-saltos`; no publicado.

**Controles de consola (04/10, vigente):** A/K inicia y confirma; START/Espacio abre pausa, omitir tutorial y volver al mapa. Ayuda tiene solo Reiniciar Game Boy con confirmación; éxito dentro del LCD, candados más visibles y música audible al ajustar volumen con el juego pausado. [Detalle y pruebas](docs/START_Y_AYUDA.txt). Ruta local `/?adventure=1&revision=start-y-ayuda`. No publicado.

**Ritmo y extra (04/10, vigente):** aviso de salto alto solo junto a la primera llanta; patrullas terrestres más rápidas y dos encuentros más en la cueva. Barril cañón redibujado, carrito de unos16 segundos con curvas más marcadas. Extra compacto con20 segundos efectivos, sin repetirlo tras agotar el tiempo. Final GANASTE / RESULTADOS y BANANAS / EXTRA / TOTAL; aplauso y música conservados. [Detalle, pruebas y límites](docs/RITMO_MINA_Y_EXTRA.txt). Ruta local `/?adventure=1&revision=ritmo-y-extra`. Las entradas inferiores conservan el historial, no sustituyen este estado.

**Audio y tutorial táctil (04/10):** audio multimedia donde el navegador lo admite; alternativa para el modo Silencio del iPhone. Mapa compacto, dos controles señalados simultáneamente y barril explicado por etapas. [Pruebas y límites](docs/AUDIO_MOVIL_Y_TUTORIAL_GUIADO.txt). Ruta local `/?adventure=1&revision=audio-y-tutorial`.

**Avisos y salto de regreso (04/10):** inicio de un renglón, muro del castor del nivel 2 más bajo para volver a subir y recordatorio de mantener K/A junto a las cuatro llantas. Consola inmóvil; música y física conservadas. [Detalle y pruebas](docs/AVISOS_Y_SALTO_DE_REGRESO.txt). Ruta local `/?adventure=1&revision=avisos-y-saltos`.

**Mina más fluida (04/10):** al llegar al barril, el mono entra y sale disparado automáticamente. El carrito arranca solo y dura unos21 segundos: bananas para practicar, bajada natural y dos saltos sobre huecos. Avisos sin mover la consola, O/U en escaleras altas, lagarto más ágil y abejas con patrulla más amplia. [Alcance y pruebas](docs/REFINAMIENTO_MINA_Y_ENCUENTROS.txt). Ruta local `/?adventure=1&revision=mina-fluida`. Música y final intactos; sin publicación.

**Cierre de mina (04/10):** tras el recorrido del nivel 3, pulsa K/A para saltar al cañón y llegar al carrito. Avanza solo durante unos32 segundos; pulsa K/A para saltar por bananas y tres huecos pequeños. Puedes reintentar sin repetir la cueva. Letras BONUS más altas; los barriles ahora se llaman **NIVEL EXTRA**. Aplauso y música conservados. [Alcance y pruebas](docs/CIERRE_MINA_Y_NIVEL_EXTRA.txt). Ruta local `/?adventure=1&revision=mina-final`; pendiente playtest humano.

**Barriles y gesto del bonus (04/10):** barriles más grandes, con tablas, aros metálicos y giro que se detiene al elegir. Resultado sin premio con gesto de «ups» y mensaje en dos líneas dentro del LCD. El aplauso y los resultados finales aprobados se conservan, al igual que música y reglas. [Detalle y pruebas](docs/BONUS_BARRILES_Y_GESTO.txt). Ruta local `/?adventure=1&revision=bonus-barriles`; aprobación visual pendiente.

**Descubrimientos y entradas (04/10):** palmeras explorables en el nivel 1, con saltos normales, bananas y descenso con ↓; se conservan los retos obligatorios del final. Nuevas cuevas de salida para niveles 1 y 2, con relieve y paleta de día/noche. Música, física y escenario 3 intactos. [Detalle y pruebas](docs/REFINAMIENTO_JUNGLE_Y_ENTRADAS.txt). Ruta local `/?adventure=1&revision=jungle-descubrimientos`; aprobación visual/jugable pendiente.

**Nivel 2 con saltos obligatorios (04/10):** cuatro zonas de roca continua interrumpen la ruta inferior, con ascensos de24px y torres opcionales para explorar. Lianas, checkpoints, premios y física conservados. [Detalle y pruebas](docs/RETOS_ROPEY.txt). Ruta local `/?adventure=1&revision=ropey-retos`; balance pendiente de playtest.

**Final del nivel 1 con desafío (04/10):** ruta inferior con patrullas, barril, roca sólida y un hueco corto; rutas altas y bananas opcionales conservadas. Mismo largo y controles, sin cambiar música ni otros niveles. [Detalle y pruebas](docs/RETOS_FINAL_JUNGLE.txt). Ruta local `/?adventure=1&revision=jungle-retos`; balance pendiente de playtest.

**Ayuda clara y reinicio (04/10):** botones y paneles con la tipografía/paleta del aviso de encendido. Tutorial explícito: «Presiona la tecla K» en computadora y «Toca el botón A» en teléfono, con flecha al control. Se retiran los cambios de encuadre y la repetición cosmética del encendido: **Reiniciar partida** confirma antes de empezar de cero y conserva el sonido. En teléfono está dentro de Ayuda. [Alcance y pruebas](docs/AYUDA_CLARA_Y_REINICIO.txt). Ruta local `/?adventure=1&revision=ayuda-clara`. Sin publicación ni cambios de música/física.

**Bonus único por partida (03/10):** tras resolver los tres barriles, ganar o perder consume el bonus. Conservar partida y repetir niveles lleva al resumen sin volver a jugarlo; solo empezar de cero lo restablece. Progreso y premios conservados. Ruta: `/?adventure=1&revision=bonus-unico`. [Detalle y pruebas](docs/BONUS_FINAL_Y_AUDIO.txt).

**Lectura del terreno (03/10):** las montañas sólidas continúan hasta el piso, sin una franja que parezca permitir atravesarlas. Las repisas por delante de las que sí puedes caminar conservan el camino claro inferior. Solo cambia el dibujo, no la física ni el recorrido. Ruta: `/?adventure=1&revision=suelo-integrado`. [Detalle y pruebas](docs/LECTURA_VISUAL_DEL_TERRENO.txt).

**Refinamiento vigente (03/10):** tutorial de diez pasos con descenso real mediante **S / ↓**, barril final de Ropey apoyado y bananas alineadas con repisas. Jungle suma un mirador alto opcional y una montaña sólida de dos escalones; Ropey alterna alturas. Abeja redibujada y lagarto con salto más ágil. La música de niveles conserva el pasaje completo, incluido el ritmo posterior, a volumen moderado; los demás fondos y efectos no cambian. Ruta: `/?adventure=1&revision=exploracion`. [Detalle y pruebas](docs/EXPLORACION_Y_TUTORIAL.txt).

**Antes de publicar:** por decisión del usuario, es obligatorio completar la [revisión de seguridad y lanzamiento](docs/ANTES_DE_PUBLICAR.txt). Está pendiente; las pruebas jugables no la sustituyen. No se ha publicado ni iniciado ningún despliegue. Las entradas siguientes conservan el historial y no sustituyen este estado vigente.

**Montículos y terrazas (03/10):** fachadas rocosas con volumen por delante de las que puedes caminar, combinadas con escalones sólidos y ascensos de varias alturas. **S / ↓** baja una repisa si hay suelo debajo. Subida opcional alta en Ropey, pared escalonada en Reptile, orientación al reaparecer corregida y letras BONUS doradas sobre fondo oscuro. [Detalle y pruebas](docs/MONTICULOS_Y_DESCENSO.txt). Ruta: `/?adventure=1&revision=terrazas`. Pendiente aprobación visual/jugable.

**Tutorial y cierre (03/10):** nueva pista compartida suministrada por el usuario, a volumen moderado. Tres símbolos iguales en el bonus dan **20 bananas** (un premio por partida); el final muestra niveles + bonus = total y las opciones **dentro del LCD**. Mapa conserva la partida; volver a jugar empieza de cero. Efectos y demás pistas intactos. [Detalle y pruebas](docs/TUTORIAL_Y_CIERRE.txt). Ruta: `/?adventure=1&revision=tutorial-final`. Pendiente escucha y aprobación visual.

**Pista del bonus (03/10):** nueva grabación suministrada, sin espera inicial y con volumen moderado; bucle de ~26 s. Solo cambia el fondo del bonus: efectos, mecánica y celebración se conservan. [Edición y pruebas](docs/SOUNDTRACK_BONUS.txt). Ruta: `/?adventure=1&revision=bonus-soundtrack`. Pendiente aprobación auditiva.

**Música de niveles, candidata para escuchar (03/10):** pista suministrada ampliada a ~2:06, sin espera inicial, con empalmes y matices suaves de timbre/volumen. Compartida por los tres niveles y la práctica; los efectos de acciones, intro/mapa y bonus no cambian. No es una separación de música y ruidos; necesita aprobación auditiva. [Método, archivos y pruebas](docs/SOUNDTRACK_NIVELES.txt). Ruta: `/?adventure=1&revision=level-soundtrack`.

**Entrada segura al bonus (03/10):** explicación sin cuenta atrás, A/K para comenzar y confirmación separada del salto. El mono empieza fuera del alcance de los tres barriles. La estética de los barriles sigue pendiente de aprobación; no se modificó audio. [Detalles y pruebas](docs/BONUS_FINAL_Y_AUDIO.txt). Ruta: `/?adventure=1&revision=bonus-safe-start`.

**Cámara y variedad (03/10):** más vista por delante al caminar, límite visible de liana en tutorial, pasos inferiores y rutas altas con racimos de diez bananas. Abejas y lagartos con comportamientos diferentes; barriles/llantas con más volumen. B-01, DK, carcasa y música conservados. [Detalle y verificación](docs/CAMARA_Y_ENCUENTROS.txt). Ruta: `/?adventure=1&revision=encounters`. Primera pasada pendiente de aprobación jugable/visual.

**Soundtrack del mapa / primera nota (03/10):** nueva grabación suministrada para el mapa, sin el silencio previo y a volumen moderado. También se ajustó la entrada de la intro para conservar el ataque inicial. Originales completos respaldados; no se cambiaron notas ni tono. [Edición y pruebas](docs/SOUNDTRACK_MAPA.txt). Ruta: `/?adventure=1&revision=map-soundtrack`. Escucha del empalme pendiente. Sustituye el mapa provisional mencionado en las notas históricas inferiores.

**Inicio guiado y nueva pista de intro (03/10):** toca/clica la consola o el aviso superior para encender con música y acercamiento; ya no se enciende sola. En teléfono, flechas señalan A y los controles de cada lección. Nueva pista suministrada por el usuario, nivelada a menor volumen; ajustes existentes conservados. [Alcance y pruebas](docs/INICIO_GUIADO_Y_SOUNDTRACK.txt). Ruta: `/?adventure=1&revision=guided-start`.

**Bonus final + celebración (03/10):** al terminar los tres niveles, salta debajo de tres barriles para detener sus símbolos, incluso si faltan letras. Después hay una celebración frontal de ocho poses y las opciones de conservar la partida o empezar de cero. Audio de los videos integrado por pantalla, con las pistas anteriores conservadas. **Los nuevos audios aún contienen la mezcla del video y el fragmento del mapa es provisional.** [Alcance y verificación](docs/BONUS_FINAL_Y_AUDIO.txt). Ruta: `/?adventure=1&revision=bonus-final`.

**Interfaz oscura y cierre (03/10):** ayuda/sonido centrados y compactos, X visible, guardado de volumen automático; botones con relieve e iconos. Al terminar: «Volver al mapa» conserva la campaña y «Volver a jugar» empieza en cero desde la portada, con tutorial y niveles bloqueados. Los ajustes de sonido se conservan. `/?adventure=1&revision=dark-ending`. [Detalle](docs/DEMO_PRESENTACION.txt).

**Zoom móvil (03/10):** controles probados y aprobados por el usuario; nuevo encuadre solicitado en `/?adventure=1&revision=touch-zoom`. La consola aparece completa al encender y acerca automáticamente el juego conservando cruceta/A/B/START dentro de pantalla. Menos carcasa sobrante, sin cambios de arte, física o controles. Build y regresión táctil PASS; nueva prueba visual en iPhone pendiente. [Detalles](docs/CONTROLES_TACTILES.txt). La indicación de vista siempre completa de la primera versión queda superada.

**Teléfono jugable — primera versión vertical (03/10):** abrir `/?adventure=1&revision=touch-1`. La consola completa permanece visible; cruceta, A, B y START reciben toques simultáneos sobre los botones de la foto y se oscurecen al pulsar. A salta/confirma, B rueda/corre/usa barriles, START comienza/pausa; «Mapa» sale del nivel. Las nueve lecciones usan etiquetas de consola en móvil. En horizontal se pausa y se pide volver a vertical. El teclado/zoom de laptop se conservan. [Alcance y pruebas](docs/CONTROLES_TACTILES.txt), [abrir desde la misma red](docs/PRUEBA_TELEFONO.txt). Las notas anteriores de “sin táctil” debajo son históricas. Safari/iPhone real aún requiere playtest.

**Ajuste S / prueba en teléfono (03/10):** el aviso de la primera llanta de Reptile aparece debajo de la S al acercarse por el suelo y se oculta durante el salto/desde la plataforma. La ayuda HTML permanece disponible. No se movió la letra ni se cambió la física. Para abrir la demo desde la misma red local, ver [instrucciones de prueba](docs/PRUEBA_TELEFONO.txt). No se ha subido a GitHub; falta el repositorio de destino. Los botones de la consola todavía son indicadores, no controles táctiles.

**Versión genérica: BONUS (02/10).** Palabra elegida por el usuario. Recogé B/O en Jungle, N/U en Ropey y S en Reptile; HUD y progreso forman BONUS. El final muestra BONUS! con el mono sonriendo, levantando las manos y dando pequeños saltos. No cambia el sprite de juego ni añade salas bonus/poderes. Roberto queda para después. Fuente única `src/collectibles.ts`, arte con `npm run art`. Pruebas y detalles actualizados en [la entrega](docs/DEMO_PRESENTACION.txt).

**Presentación de demo (02/10):** altavoz para silenciar con un clic, carátula START GAME, rótulos TUTORIAL / NIVEL 1–3, salida visual de la casa, mapa con relieve y destinos despejados, final genérico con festejo frontal y letras realmente recogidas. Abrir `/?adventure=1&revision=bonus`. Encendido/carcasa/física conservados. La música sigue pendiente de aprobación; no hay publicación ni controles táctiles. [Entrega y verificación](docs/DEMO_PRESENTACION.txt). `node tests/smoke.mjs --demo-only` comprueba el flujo público completo después de compilar.

Verificación de la base antes del cambio de palabra: `npm.cmd test` completo PASS en Edge 154 / Windows, cero errores de ejecución. Incluye las nueve lecciones y los tres niveles de la ruta pública, además de las regresiones A/B/3–11 y audio. La verificación específica de BONUS se detalla en la entrega. Estética pendiente del playtest del usuario.

Verificación técnica de audio: tipos/build y unitarias PASS; regresiones A/B/3–11 PASS y bloque final de audio PASS por tramos en Edge/Windows. Historial de esperas ajustadas en docs/AUDIO_PRIMERA_PASADA.txt. Muestra para escuchar: `docs/audio/primera-escucha.wav`.

**Audio — primera versión para escuchar (02/10):** música retro original compartida por Jungle, Ropey y Reptile, más efectos de salto, recogidas, golpe/retorno, barriles, lianas, llantas, checkpoint y victoria. Se activa con la primera tecla o clic al jugar; el encendido visual sigue automático. «Sonido» permite silenciar y ajustar música/efectos por separado. Pausa/foco congelan también el audio; morir no reinicia la pista. `npm run audio` regenera los recursos sin servicios externos; `npm run test:audio` verifica síntesis/eventos. [Detalles, pruebas y límites](docs/AUDIO_PRIMERA_PASADA.txt). Propuesta pendiente de escucha y aprobación del usuario, no calco de la grabación original.

**Ajuste posterior aprobado:** carcasa teal aceptada por el usuario. Encendido automático a los 3 s, luego el logotipo de la propia carcasa y zoom automático al juego; no depende de clic ni foco. El juego mantiene su pausa al perder foco. El PNG aprobado no se modificó. Build y prueba específica de consola PASS en Edge/Windows.

**Vigente (02/10, petición posterior):** consola fotográfica teal basada en la primera foto del usuario, sin Nintendo, con GAME BOY COLOR. En `/?adventure=1`: consola apagada → LED rojo/logo → acercamiento al juego; botones WASD/J/K/Espacio se oscurecen al pulsar. «Ver consola completa», «Repetir encendido» y ayuda disponibles. Pantalla adaptable a teléfono/laptop, pero **controles táctiles todavía pendientes de definición**, igual que la carátula del juego y el final personal. Corregido el anclaje de las manos al mirar a la izquierda en la liana; tutorial con fondo despejado e instrucciones W/S/K por contexto. Ver [entrega y límites](docs/FASE_11_CONSOLA_TEAL.md). Las restricciones históricas de no iniciar fase 11/sin móvil ya no rigen; esto no publica el proyecto.

Para diagnóstico conservar `/?adventure=1&workbench=1`, rutas independientes y laboratorios anteriores. `npm run art` regenera el pixel art, no la fotografía de la consola (PNG incluido, sin dependencias de la carpeta Codex).

**Vigente (02/10, después del playtest):** se retiraron los comodines; quedan bananas y BERTO. Práctica interactiva de nueve acciones antes de Jungle, omisible con Esc y repetible desde el mapa. Ropey tiene dos checkpoints (650 y 1560); varias elevaciones de los tres niveles permiten pasar por debajo y saltar encima. Instrucciones más grandes sobre panel oscuro, también legibles fuera de la pantalla. Mapa animado y Esc conservados. B-01 intacto. Ver [fase 10](docs/FASE_10.md). Las notas inferiores son históricas.

**Refinamiento posterior:** Ropey y Reptile ampliados con nuevas secciones; voltereta de ocho poses, cara de simio y pelaje sin rayas; mapa curvo con cascada, sin cabaña. Caminata, Jungle y física conservados. Ver [detalle y límites](docs/REFINAMIENTO_NIVELES_Y_ARTE.md). Arte y dificultad pendientes de playtest.

**Actualización vigente (29/09):** fase 8 revisada en Edge/Windows; mapa y progreso de fase 9 implementados por autorización del usuario. `npm run dev`, abrir **`/?adventure=1`**. A/D elige, K entra o vuelve al mapa después del resumen. Jungle → Ropey → Reptile se desbloquean en orden. Bananas/BERTO se acumulan sin duplicarse al repetir; recargar borra la sesión. Mono con nueva marcha de seis poses; suelos con caras y sombras; cueva más rocosa. Arte y balance pendientes de aprobación humana. Ver [docs/FASE_9.md](docs/FASE_9.md). No se inició fase 10. Las actualizaciones siguientes son históricas.

**Estado vigente (29/09):** Claude corrigió los pendientes de Ropey (agarre, tope de subida, banana) e implementó la **fase 8: Reptile Rumble** en `/?level=reptile` (cueva, serpientes, llantas con rebote, O opcional, checkpoint, ascenso final). Pendiente de revisión de Codex, de la suite en Edge/Windows y de prueba del usuario. Sin mapa ni fase 9. Informe: [docs/ENTREGA_CLAUDE_FASE_8.md](docs/ENTREGA_CLAUDE_FASE_8.md). Controles en Ropey: saltá hacia una liana y se agarra sola (en el suelo, W); W/S trepa; K suelta saltando. En Reptile: caé sobre una llanta para rebotar; con K apretado rebota más alto. Pruebas nuevas: `tests/phase8-unit.mjs`, `tests/phase8.mjs` (`node tests/smoke.mjs --phase8-only`).

**Estado vigente (28/09):** fase 7 implementada para revisión: `/?level=ropey`. Cuerdas, selva nocturna, R/T, checkpoint y salida independiente. W para agarrarse, W/S para trepar, K + dirección para salir saltando. No se agarra cargando barril. Espacio pausa todo. El reemplazo de DK quedó aplazado por el usuario; se reutiliza una pose provisional al trepar. `/` conserva Jungle y el hueco de 40 px corregido por Claude. No se inició fase 8 ni mapa/progresión. Detalles y verificación: [docs/FASE_7.md](docs/FASE_7.md). Encargo siguiente: [docs/ENCARGO_CLAUDE_FASE_8.md](docs/ENCARGO_CLAUDE_FASE_8.md).

Los estados de fase 5/6 a continuación son históricos y no invalidan esta autorización posterior.

**Estado vigente:** fase 6 autorizada e implementada para prueba del usuario. Cambios y límites en [docs/FASE_6.md](docs/FASE_6.md). No se inició fase 7. La revisión técnica de fase 5 pasó en Edge/Windows; el usuario pidió más fidelidad al original y más desafío, no aprobó el arte como definitivo. Los párrafos de fase 5 más abajo son el historial de partida.

La ruta principal tiene siete patrullas (incluye enemigos en plataformas), un salto de 40 px tras el checkpoint (antes 44) y una reacción al golpe de 600 ms antes del retorno. El arte usa pelaje granate, postura más agachada y follaje más denso. `/?phase5=1` permite comparar el recorrido anterior, con el arte actualizado compartido. El vacío conserva retorno inmediato. Pausa/foco congelan también la reacción al golpe. `npm test` incluye pruebas específicas de fase 6 además de las regresiones del recorrido anterior.

Verificación fase 6: `npm.cmd test` completo PASS en Edge 154/Windows, cero errores en ejecución. Arte reproducible verificado por SHA-256; B-01 intacto. La validación visual y de dificultad por el usuario sigue pendiente.

Juego de cumpleaños para Roberto inspirado en Donkey Kong Country de **Game Boy Color**. Destino: navegador en laptop, con teclado; sin controles móviles. Pantalla lógica 160×144, ampliación entera automática y sin suavizado.

**Estado (27/09/2026):** fases A/B/3 aprobadas por el usuario. Fase 4 implementada. Claude aplicó las correcciones de la revisión y la fase 5 (arte y animación de Jungle) por encargo del usuario; **pendiente de revisión de Codex y aprobación visual del usuario**. No se inició la fase 6. Informe completo: [docs/ENTREGA_CLAUDE_FASE_5.md](docs/ENTREGA_CLAUDE_FASE_5.md). Arte y referencias: [docs/art/REFERENCIA_ARTE.md](docs/art/REFERENCIA_ARTE.md).

Carpeta principal: `C:\Users\Abraham\Documents\Donkey Kong`. Contexto: [docs/CONTEXTO_COMPLETO_ACTUALIZADO.txt](docs/CONTEXTO_COMPLETO_ACTUALIZADO.txt). Instrucciones para agentes: [AGENTS.md](AGENTS.md).

## Qué hay

- `/` — aventura completa dentro del Game Boy, con encendido, tutorial, mapa, tres niveles y cierre; no necesita parámetros. `/?adventure=1` es compatible con los enlaces anteriores.
- `/?level=jungle` — Jungle Hijinxs independiente, con herramientas de pruebas; sustituye la antigua entrada de laboratorio `/`.
- `/?level=ropey` — Ropey Rampage (fase 7, corregida en fase 8): lianas, selva nocturna, R/T.
- `/?level=reptile` — Reptile Rumble (fase 8): cueva, serpientes, llantas, O.
- `/?greybox=1` — recorrido de fase 3 en bloques con silueta 24×28 (sin sistemas).
- `/?lab=1` — laboratorio de movimiento B-01.
- `/?diagnostic=1` — diagnóstico de fase A.

El interruptor «Colisiones» muestra el cuerpo de DK (12×16), los enemigos y los barriles; «Sprites» oculta el arte.

## Controles

A/D o flechas: mover · K: saltar (soltar antes = salto corto) · J: pulsar para rodar, mantener para correr; cerca de un barril, J lo recoge y soltarlo lo lanza · Espacio: pausa (Enter no se usa) · «Reiniciar Jungle» borra el progreso. Perder el foco pausa y libera las teclas; tras completar, Espacio no hace nada.

## Movimiento B-01 (aprobado el 25/09/2026, sin cambios)

Valores en `src/tuning.ts` (SHA-256 `87f02c4b43fdde42e00c80839ab5d9cfc1b91ed92b39dfc7f1912315f0f6c9f9`): caminar 60 px/s; correr 102; aceleración 650 px/s²; frenado 850; gravedad 640; salto 235 px/s; corte 105; caída máxima 280; tolerancia de borde 100 ms; anticipación 110 ms; cuerpo 12 × 16. Desde la fase 5, jugador, reglas y física avanzan juntos en pasos fijos de 60 Hz, así que el resultado es el mismo a cualquier frecuencia de pantalla (ver informe, §3).

## Abrir

Requiere Node.js 22.19 o posterior.

```powershell
npm.cmd ci
npm.cmd run dev
```

Abrir la dirección local (normalmente http://127.0.0.1:5173). Si npm muestra un error de certificados, usar antes `$env:NODE_OPTIONS='--use-system-ca'`.

## Verificar

```powershell
npm.cmd run test:unit   # reglas y controlador B-01 (sin navegador)
npm.cmd run build       # tipos + compilación
npm.cmd test            # unitarias + build + suite de navegador A/B/3/4/5 en Microsoft Edge
npm.cmd run measure     # opcional: comparación a 24/40/60/144 fps → artifacts/fps-measure.json
npm.cmd run art         # regenera el arte (public/assets, docs/art) de forma idéntica
```

`npm test` usa Edge por defecto; `$env:BROWSER_CHANNEL='chrome'` usa Chrome y `$env:BROWSER_PATH='<exe>'` un ejecutable concreto. Requiere el puerto 4174 libre. `node tests/route-timing.mjs` cronometra un recorrido de bot (y con `--video <archivo>` lo graba).

Verificado por Claude en Chromium 141 (no en Edge): unitarias, tipos, compilación y suite completa (3 ejecuciones seguidas). Falta ejecutar `npm.cmd test` en Windows con Edge. La compilación mantiene el aviso de tamaño del paquete de Phaser (~1,5 MB, ~350 KB comprimido).

## Estructura

- `src/tuning.ts` — B-01 (no editar sin autorización).
- `src/input.ts` — teclado, alias y foco; fuente única para Phaser y el HTML.
- `src/player.ts` — controlador B-01 y `bounce()` para efectos de juego.
- `src/jungle-layout.ts` — datos del nivel: sólidos, inicio, checkpoint, salida, bananas, letras, enemigos, barriles.
- `src/gameplay.ts` — reglas sin Phaser (`LevelRules`), medidas `HITBOX` y valores `ACTION`.
- `src/movement.ts` — escena: paso de simulación fijo, pausa/foco/completado, cámara, telemetría.
- `src/gameplay-view.ts` — presentación de fase 5 (sprites, tiles, paralaje, HUD, carteles); no toca física ni reglas.
- `src/art-spec.ts` — tamaños visuales, anclajes y tiempos de animación.
- `src/scenes.ts` — arranque (carga del arte) y diagnóstico A. `src/main.ts` — conexión con el HTML.
- `tools/art/` — generador del arte (sin dependencias). `public/assets/` — arte generado.
- `src/ropes.ts`, `src/ropey-layout.ts` — lianas y datos de Ropey. `src/tires.ts`, `src/camera.ts`, `src/reptile-layout.ts` — llantas, cámara legible y datos de Reptile (fase 8).
- `tests/` — unitarias (`gameplay-unit`, `player-unit`, `phase6-unit`, `phase7-unit`, `phase8-unit`), fases 6–8 en navegador (`phase6`, `phase7`, `phase8`), navegador (`smoke`, `movement`, `jungle`, `gameplay`, `phase5`), medición (`fps-measure`, `route-timing`), `support/` (bot de teclado, cargador de TypeScript para Node).
- `docs/` — planes, contexto, fases, referencias; `docs/art/` hojas de contacto. `artifacts/` — capturas, video y mediciones.

Versiones fijadas: Phaser 3.90.0, Vite 6.4.3, TypeScript 5.9.3, Playwright 1.62.1 (`package-lock.json`).

## Historial breve

- Fase A: pantalla, escalado, entrada compartida, foco. Aprobada.
- Fase B: movimiento B-01 con rectángulo. Aprobada el 25/09/2026.
- Fase 3: silueta 24×28 sobre cuerpo 12×16, maqueta de consola, Jungle en bloques. Aprobada el 26/09/2026.
- Fase 4: bananas, B/E, enemigos, rodamiento, barriles, checkpoint, salida ([docs/FASE_4.md](docs/FASE_4.md)).
- Fase 5 (Claude): correcciones previas y arte de Jungle — pendiente de revisión y aprobación.

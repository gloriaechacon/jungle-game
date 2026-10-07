# Juego de cumpleaños — plan actualizado

Estado vigente 29/09: fase 9 autorizada e implementada (mapa de tres nodos, progresión y recolección acumulada en memoria), con revisión de fase 8 en Edge/Windows y nueva pasada de sprite/suelo/cueva. Ver FASE_9.md. No avanzar a fase 10 sin autorización. Arte y dificultad siguen sujetos a aprobación humana; las restricciones anteriores quedan como historial.

Actualización 29/09/2026: Claude corrigió Ropey (agarre, tope, banana) e implementó la fase 8, Reptile Rumble, como prueba independiente en `/?level=reptile`. Pendiente de revisión de Codex y playtest. Mapa y progreso entre niveles siguen en fase 9, no iniciada. Ver ENTREGA_CLAUDE_FASE_8.md.

Actualización 28/09/2026: el usuario aplaza el reemplazo del sprite y autoriza fase 7 (Ropey, R/T y cuerdas), con el sprite actual provisional. Jungle conserva la corrección de Claude (hueco 40 px). Fase 7 se prueba por separado; mapa y progreso entre niveles siguen en fase 9. Claude recibirá revisión de fase 7 y continuación con fase 8; ver FASE_7.md y ENCARGO_CLAUDE_FASE_8.md. La aprobación artística de DK sigue pendiente, no se deduce del avance de fases.

Estado: Phase A y Phase B aprobadas por el usuario. Movimiento B-01 aprobado el 25 de septiembre de 2026. Carpeta principal: `C:\Users\Abraham\Documents\Donkey Kong`. Este documento reemplaza las decisiones del borrador PROJECT_PLAN.md que entren en conflicto.

## Decisiones del usuario

- Tres niveles abreviados: Jungle Hijinxs, Ropey Rampage y Reptile Rumble, con referencia principal en Game Boy Color.
- Un solo personaje jugable: Donkey Kong. Sin cambio a Diddy ni sistema de compañero de reserva.
- Sin salas bonus opcionales, desafíos extra ni minijuegos. Se eliminan los desvíos para acertar barriles y conseguir premios.
- Combate más sencillo y menos repetición para llegar al cumpleaños sin frustración.
- Se mantienen las bananas. **B-E-R-T-O** reemplaza K-O-N-G y la anterior propuesta ROB.
- Los comodines especiales quedan como concepto y espacios reservados en los datos; diseño, cantidad y efecto pendientes. No se inventan poderes ni objetos definitivos.
- Hay tiempo y libertad creativa. Las otras omisiones son recomendaciones revisables, sin ampliar de golpe el desarrollo.
- Las fases continúan siendo pequeñas y requieren aprobación antes de avanzar. No se cambia el movimiento aprobado de forma silenciosa.

## Revisión del video recibido

Fuente: video1712159502.mp4, grabación aportada por el usuario. Duración técnica 7:00,9; imagen 1366 × 768 a 25 fps; pista AAC a 48 kHz. Se revisaron fotogramas distribuidos a lo largo de todo el clip, con muestreo adicional del inicio. Esto es análisis de fotogramas, no una medición cuadro a cuadro de animaciones o física. Se confirmó que existe audio, pero no se verificaron auditivamente los efectos individuales.

Las marcas siguientes corresponden a esta grabación. Son ejemplos observados, no límites exactos de cada secuencia:

| Momento | Observado | Aplicación al proyecto |
|---|---|---|
| 0:07–0:12 | Rare, Nintendo y créditos sobre negro | Introducción breve; no hace falta reproducir cada pantalla de créditos. |
| 0:20–0:24 | Ilustración acuática con los Kongs, fondo azul y letras START en casillas doradas | El título visible de esta grabación es acuático; evitar fijar una composición de selva por una referencia distinta. |
| 0:28–0:48 | DK sostiene un barril; iconos circulares azules, cielo naranja; Options/SFX y Adventure | Conservar la composición reconocible y dar protagonismo a Adventure; omitir navegación innecesaria. |
| 0:52 | Mapa con camino claro sobre vegetación, edificios y nombre de nivel | Adaptar a tres destinos y un final visible, sin revelar el contenido del cumpleaños. |
| 0:56–1:05 | Reserva de bananas y casa de DK | Mantener la identidad de la apertura; los interiores separados son prescindibles. |
| 1:20–1:50 | Cielo azul claro, follaje verde denso, flores rojizas, suelo melocotón, roca oscura; bananas, barril estrella, letras doradas y Rambi | Esta combinación define Jungle Hijinxs. Rambi es opcional y no exige implementar un segundo personaje ahora. |
| 2:30 | Señal EXIT y entrada oscura en la roca | Salidas claras y reconocibles. |
| 2:55–3:50 | Selva de cielo azul oscuro, copas de palmera, cuerdas, enemigos y desniveles | Ropey Rampage debe cambiar la forma de recorrer el escenario, además de la paleta. |
| 4:25–4:55 | Regreso al mapa y visita a Cranky entre niveles | Mantener el mapa, omitir esta parada para nuestra experiencia corta. |
| 5:10–6:55 | Cueva de formaciones violetas, piedra oscura, interior rojizo del suelo, plataformas cálidas, neumáticos, bananas, barriles y EXIT | Identidad de Reptile Rumble; pocas secuencias de rebote y salida al final. |

En las capturas aparecen contadores amarillos compactos, letras en casillas doradas y un icono de barril abajo a la izquierda. Nuestro HUD adapta esa escala a bananas y BERTO; no conservará indicadores de vidas o compañero que no tengan función.

Referencias visuales preparadas: [inicio con marcas de tiempo](REFERENCIA_INICIO.png) y [niveles con marcas de tiempo](REFERENCIA_NIVELES.png). Son láminas de análisis recortadas al área de juego y reescaladas, no sprites listos para usar.

La grabación permite estudiar composición y colores generales. Compresión, escalado previo y 25 fps impiden tratarla como fuente exacta de paleta, tamaño de cada píxel o duración original de animaciones. No muestra una consola física: su encuadre debe diseñarse aparte.

## Recorrido y duración propuestos

Consola completa → encendido/título → Adventure → mapa → Jungle Hijinxs → mapa → Ropey Rampage → mapa → Reptile Rumble → revelación de cumpleaños → cierre y zoom hacia afuera.

Al terminar la cueva se propone una transición directa al cumpleaños. Puede conservar la apariencia de un acceso secreto, pero no será una sala bonus con otra tarea. El mensaje y la animación final siguen pendientes de diseño.

| Tramo | Objetivo propuesto |
|---|---|
| Encendido, título y Adventure | 20–30 segundos; permitir avanzar |
| Mapas, en conjunto | 15–25 segundos |
| Jungle Hijinxs | 1:15–1:30 |
| Ropey Rampage | 1:15–1:30 |
| Reptile Rumble | 1:30–1:45 |
| Revelación y cierre | 30–45 segundos |

Ruta sin errores: aproximadamente **5:05–6:25**. Reservar margen para aprender, recoger objetos y repetir saltos, buscando una experiencia normal de **6–8 minutos** y alrededor de diez como límite orientativo a validar. No se rellena tiempo con esperas ni se garantiza un máximo para todo jugador.

- **Jungle:** apertura de la casa/árbol → bananas y enemigo sencillo → barril → checkpoint → breve tramo elevado → salida. Propuesta: letras B y E.
- **Ropey:** noche → cuerda sobre suelo seguro → dos cruces cortos → checkpoint → encuentro espaciado → salida. Propuesta: R y T.
- **Reptile:** cueva → serpiente/barril → neumático sobre zona segura → checkpoint → escalones y tramo final → O → cumpleaños.

Las cinco letras aparecen en orden, en el recorrido principal. Propuesta para evitar retrocesos: las recogidas persisten durante reintentos; una letra omitida vuelve a ofrecerse sobre suelo seguro antes de la salida de su nivel. El cumpleaños nunca queda bloqueado por una letra faltante. El HUD puede mostrar `B E _ _ _`; su ubicación debe comprobarse a 160 × 144.

Combate propuesto: enemigos terrestres básicos derrotados de un pisotón, rodamiento o barril, sin armadura ni secuencias de varios golpes. Los voladores peligrosos, si se incluyen, son pocos, lentos y claramente distinguibles. No hay vidas limitadas; golpes y caídas llevan a recuperación breve/checkpoint. La tolerancia de salto se ajustará al probar, no queda aprobada por asignarle ahora un número.

## Controles propuestos

Interpretación de la preferencia expresada: usar **WASD** con la mano izquierda y dos botones con la derecha. Esto es una propuesta para probar, no una asignación definitiva.

| Tecla | Control de consola | Acción |
|---|---|---|
| A / D | D-pad izquierda / derecha | Moverse |
| W / S | D-pad arriba / abajo | Menús, subir/bajar cuerda; S para agacharse donde corresponda |
| K | Botón A | Saltar, soltarse de cuerda y confirmar |
| J | Botón B | Mantener para correr; pulsar para rodar o recoger barril según contexto; soltar para lanzar si se lleva uno |
| Espacio | Start | Comenzar / pausar |
| Escape | Sin equivalencia obligatoria | Pausar o volver en menús |
| Sin tecla por ahora | Select | Sin acción, ya que no hay cambio de personaje |

J queda a la izquierda de K, como B respecto de A en la consola. W no salta: conserva el movimiento vertical de cuerdas. Las flechas pueden ofrecerse como alternativa, pero no serán necesarias.

Prioridad contextual de B: menús → cancelar; junto a barril → recoger; en suelo sin barril → rodar al pulsar y correr al mantener. En cuerda se limita a las acciones permitidas por ese estado. Probar explícitamente correr+saltar y llevar barril+saltar. Evitar acciones dobles por repetición del teclado.

El estado de entrada será único para juego y botones visibles. Varias teclas asociadas a un botón se agregan por acción; perder el foco libera los estados para evitar botones atascados. Los controles de la consola se etiquetan como A/B, sin confundirlos con las letras físicas del teclado.

## Phase A / Phase 1A: implementada con autorización del usuario

Objetivo: verificar que la base técnica y los controles elegidos se pueden probar antes de crear personajes o niveles.

- Vite, TypeScript y Phaser con versiones compatibles fijadas y documentación correspondiente. Arcade Physics queda previsto para Phase 2.
- Canvas lógico 160 × 144, proporción 10:9, filtrado sin suavizado, patrón de prueba de píxeles y escalado entero donde quepa. Probar tamaño de ventana y densidad de pantalla.
- BootScene y una escena de diagnóstico vacía; sin crear anticipadamente las demás escenas.
- Marco provisional y diagnóstico de D-pad/A/B/Start para ensayar WASD + J/K, combinaciones simultáneas y pérdida de foco. La consola gráfica se construye más adelante.
- Comprobaciones de TypeScript y compilación; apertura local y verificación visual del patrón y teclas.

Aceptación: inicia sin errores; patrón legible y proporción estable; cambiar tamaño no deforma; cada tecla enciende el control correcto; J+K+D funcionan juntos; cambiar de ventana libera los controles; la compilación termina correctamente.

**Phase A no necesita gráficos finales.** Solo rectángulos, un patrón y texto de diagnóstico. La prueba de encuadre reservará espacio para pantalla, D-pad y A/B sin construir aún una carcasa detallada. Durante el juego basta conservar esos controles y las partes relevantes del cuerpo; la consola completa se ve al inicio y al final.

## Gráficos que harán falta después

| Grupo | Entrega posterior |
|---|---|
| Jugador | DK quieto, caminar/correr, saltar/caer, aterrizar, rodar, recibir golpe; luego recoger/cargar/lanzar, agarrarse/subir/soltarse de cuerda, agacharse y celebrar. Colisión independiente del dibujo. |
| Enemigos | Primer enemigo terrestre, Kritter, serpiente; volador solo si aporta variedad. Pocas variantes. |
| Entornos | Casa/árbol inicial, suelo y roca de selva, follaje/palmeras/flores, variante nocturna, cueva violeta, entrada y salida. |
| Objetos | Bananas, cinco letras BERTO, barril, checkpoint, cuerda y neumático. Comodines con marcador temporal, sin arte ni efecto definitivo. |
| UI y mapas | Fuente legible, contador, BERTO, Start/Adventure, mapa de tres niveles, señal EXIT y transiciones. |
| Consola | Carcasa, marco de pantalla, D-pad, A/B, Start/Select y LED; estados pulsados y encuadre de zoom. |
| Audio | Selección posterior de música y efectos de menú, salto, recogida, golpe, barril, checkpoint y salida. Identificación auditiva aún pendiente. |

No hacen falta sprites de Diddy, salas bonus, minijuegos de barriles ni sus pantallas de premios. Para producción convendrá contar con referencias nítidas del personaje y sus acciones; este video ya alcanza para definir la base y no bloquea Phase A. La paleta final y las animaciones requerirán una pasada dedicada antes del arte.

## Arquitectura y fases siguientes

Separación propuesta: HTML/CSS presenta la consola; Phaser maneja escenas, física, cámara, entidades y audio. Un controlador de entradas comunica acciones a ambas capas. El estado de sesión guarda nivel, checkpoint, bananas, letras obtenidas e identificadores de comodines. La palabra se define como datos, no como tres campos ROB.

Escenas futuras: Boot → Preload → Title → AdventureMenu → Map → los tres niveles → BirthdayReveal → Ending. Se elimina BirthdayBonusScene como sala jugable. Extraer comportamiento común de niveles cuando Jungle funcione; evitar una jerarquía compleja por adelantado.

- [x] Revisión inicial del video y correcciones del alcance.
- [x] Phase A: base de pantalla y diagnóstico implementados, verificados y aprobados por el usuario.
- [x] Phase B / Phase 2: locomoción con rectángulo B-01 implementada, verificada y aprobada por el usuario el 25 de septiembre de 2026. Conservar parámetros aprobados; rodamiento será una extensión posterior explícita.
- [ ] Phase 3: Jungle en bloques, con su recorrido abreviado.
- [ ] Phase 4: bananas, B/E, un enemigo, barriles, checkpoint y salida. Ningún bonus.
- [ ] Phase 5: primera muestra de arte y animaciones, contrastada con referencias.
- [ ] Phase 6: Jungle terminado y aprobado antes del siguiente nivel.
- [ ] Phase 7: Ropey, R/T y cuerdas. Aprobar la extensión de movimiento sin retocar lo previo silenciosamente.
- [ ] Phase 8: Reptile, O, neumáticos y agacharse si el recorrido lo requiere.
- [ ] Phase 9: mapa y progresión integrada.
- [ ] Phase 10: definir comodines personales dentro de los niveles; sin espacios extra obligatorios.
- [ ] Phase 11–12: consola, botones, encendido y zoom conservando controles visibles.
- [ ] Phase 13: cumpleaños, contenido aprobado y cierre.
- [ ] Phase 14: audio, pruebas con jugadores, duración, legibilidad y revisión final.

Riesgos prioritarios: controles ambiguos por el botón B contextual; letras perdidas al reintentar; tamaño del HUD de cinco letras; cuerdas y neumáticos añadidos sin afectar locomoción aprobada; suavizado durante el zoom; dificultad y tiempos que deben medirse con jugadores. El video no permite cerrar por sí solo el sonido, los tiempos de animación ni la composición de la consola.

Fuentes documentales de apoyo del borrador: [datos técnicos de Nintendo](https://www.nintendo.com/en-gb/Support/Legacy-system/Technical-data-619585.html), [plantilla oficial de Phaser](https://github.com/phaserjs/template-vite-ts), [Arcade Physics](https://docs.phaser.io/phaser/concepts/physics/arcade). Los detalles observados en este documento provienen de los fotogramas del archivo entregado, no de asumir que todas las versiones de DKC son iguales.

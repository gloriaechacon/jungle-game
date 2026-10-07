# Fase 6 — Jungle: fidelidad, desafío y reacción al golpe

Implementación autorizada por el usuario. Pendiente de aprobación visual/jugable; no comienza fase 7.

## Alcance y decisiones

- Arte propio desde fuentes editables: pelaje granate, postura terrestre con hombros más anchos y nudillos bajos, sombreado por grupos de píxeles, vegetación más densa y palmas colgantes. Se mantiene 160×144 con escalado entero. Es una revisión, no una réplica exacta ni arte aprobado.
- Siete patrullas en lugar de tres: una primera lección en suelo seguro, otra sobre una plataforma temprana, encuentros de barril existentes y dos patrullas sobre plataformas al final. Velocidad por enemigo 18–26 px/s; límites comprobados para no patrullar fuera del suelo. Todos siguen siendo derrotables de un golpe.
- Hueco x=1600–1640 (40 px) tras el checkpoint (era 44 px; reducido a 40 a pedido del usuario tras probarlo), con banana indicadora más alta y ayuda en el panel para tomar carrera. No se alarga el mapa ni se modifica B-01.
- Golpe por enemigo: 140 ms de impacto y pose manos a la cabeza hasta 600 ms activos, con pequeño arco de retroceso visual. El cuerpo físico se inmoviliza; no se puede atacar, recoger ni completar durante ese estado. Regresa al inicio/checkpoint, conserva coleccionables y enemigos vencidos, repone barriles y conserva los 1500 ms de protección al reaparecer. Caídas al vacío siguen retornando inmediatamente.
- Pausa y foco congelan el golpe; no usa setTimeout. Reiniciar durante el golpe cancela la secuencia y limpia el progreso.
- Fuera: audio, Game Boy final, intro/zoom, mapas, Ropey, Reptile, comodines, Rambi y bonus.

## Rutas y regresiones

- `/`: fase 6, objeto de las pruebas nuevas.
- `/?phase5=1`: recorrido y retorno inmediato anteriores, arte nuevo compartido. No es una copia visual congelada.
- `/?greybox=1`, `/?lab=1`, `/?diagnostic=1`: pruebas históricas.
- Las pruebas de fases 4/5 apuntan explícitamente al recorrido anterior; no se alteraron sus expectativas para encubrir cambios. Las de fase 6 prueban el recorrido NUEVO con teclado y telemetría, sin mover al jugador artificialmente.
- Copia de fuentes previa: `artifacts/phase-6-before.zip` (src, tools, tests, README, AGENTS). No se borró nada.

## Verificación

`npm.cmd test`: PASS completo en Microsoft Edge 154.0.4258.37 sobre Windows (unitarias, tipos, build y navegador A/B/3/4/5/6), cero errores en ejecución. Fase 6 incluye golpe/pose, pausa y pérdida de foco durante el golpe, retorno, reinicio durante un golpe pausado, checkpoint, letras y salida. Dos recorridos específicos: 35,2 y 35,1 s, un reintento en cada uno. No representan duración ni dificultad para una persona.

`npm.cmd run art`: repetido con SHA-256 idéntico en todos los archivos de public/assets. `src/tuning.ts`: SHA-256 87f02c4b43fdde42e00c80839ab5d9cfc1b91ed92b39dfc7f1912315f0f6c9f9, sin cambios. Capturas de inicio y daño revisadas visualmente. Permanece la advertencia de tamaño del paquete Phaser al compilar, no un error. No se verificó un monitor físico de 144 Hz ni la fidelidad exacta cuadro a cuadro al video original.

Capturas: `artifacts/phase-6-start.png`, `phase-6-hurt-paused.png`, `phase-6-checkpoint.png`, `phase-6-finish.png`.

## Aprobación pendiente

Comparar visualmente con GBC, decidir si DK/fondo se acercan lo suficiente y jugar sin conocer las posiciones de enemigos. Probar si el salto largo se entiende y si la secuencia de daño comunica lo ocurrido sin sentirse lenta. No se afirma cumplida una duración de 1:15–1:30; no se añadió relleno. La carcasa sigue siendo maqueta.

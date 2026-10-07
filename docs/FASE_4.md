# Fase 4 — sistemas de Jungle (27/09/2026)

Implementación para probar y aprobar; no es el arte final. El fallo de acceso al editor ya no bloqueó esta sesión.

- Espacio es Start/pausa; Enter no. A/D o flechas mueven, K salta y permite salto corto al soltar.
- Pulsar J en suelo inicia un rodamiento de 300 ms. Mantenerlo conserva la carrera, sin rodar repetidamente. Usa la velocidad de carrera B-01, no modifica el preset. El rodamiento avanza en la dirección elegida incluso si no mantenés una dirección.
- Un barril cercano tiene prioridad sobre rodar: pulsar J recoge, mantener lleva y soltar lanza. Durante pausa o pérdida de foco, soltar J NO lanza: al volver, pulsá y soltá J para hacerlo.
- 24 bananas y B/E. Cada objeto cuenta una vez. Se conservan al morir, al igual que los enemigos derrotados. Las letras omitidas reaparecen en terreno seguro antes de la salida, sin bloquearla si las omitís de nuevo.
- Tres enemigos provisionales patrullan a 18 px/s. Mueren al pisarlos, rodar sobre ellos o recibir un barril. No son todavía sprites definitivos de Gnawty. Contacto lateral devuelve al punto de retorno; no hay vidas limitadas ni Game Over.
- Bandera de checkpoint a x=1264. Tras una caída o contacto lateral, reaparecés allí; antes de activarla, al inicio. Hay 1,5 s de protección al reaparecer y los barriles se reponen.
- HUD de bananas/letras temporal; reaparece al recoger, activar checkpoint, reintentar o pausar. El panel externo mantiene información de diagnóstico.
- La salida detiene el juego y muestra «Jungle completado». No entra a Ropey ni a un final de cumpleaños todavía. «Reiniciar Jungle» empieza de cero, incluida la bandera y los coleccionables. Recargar también empieza de cero: no existe guardado persistente.

Pausa: se congelan física, temporizadores de la escena, tweens y reloj de reglas. La interfaz sigue actualizándose para poder reanudar. Aún no hay sprites animados ni audio; su integración y pausa deberán verificarse en su fase.

Extensiones de fase 4, no mediciones del original: rodamiento 300 ms; rebote al pisar 150 px/s; barril 190 px/s, impulso vertical 60 px/s y duración máxima 2,5 s; protección 1,5 s. No se tocó ningún valor de `src/tuning.ts`.

## Archivos y pruebas

- `src/gameplay.ts`: reglas deterministas separadas de Phaser/HTML.
- `src/gameplay-view.ts`: dibujos provisionales.
- `src/movement.ts`: integración, pausa, retorno, HUD y telemetría.
- `tests/gameplay-unit.mjs`: coleccionables, prioridad de J, combate, barriles, checkpoint, pausa y salida sin letras.
- `tests/gameplay.mjs`: recorrido real mediante teclado en navegador y verificación de interfaz.
- `npm test`: reglas, tipos, compilación y regresión de A/B/3/4.

Fuera de esta entrega: arte/animaciones finales, audio, cuerdas, agacharse, Ropey/Reptile, mapas, intro/zoom, comodines y final personalizado. Fase 5 requiere aprobación nueva.

## Verificación realizada

27/09/2026: reglas deterministas, TypeScript y compilación correctos; regresiones de A/B/3 aprobadas. La prueba final aislada `node tests/smoke.mjs --phase4-only` pasó con recogida/lanzamiento de barril, pausa manual y por pérdida de foco, retorno real por daño y caída, conservación de B/E y bananas, llegada a salida y reinicio completo, sin errores de ejecución. Se estabilizaron dos pruebas que dependían de esperas acumuladas (salto corto y recoger un barril mientras se corría), sin retocar la física. B-01 mantiene su SHA-256 original: `87f02c4b43fdde42e00c80839ab5d9cfc1b91ed92b39dfc7f1912315f0f6c9f9`.

Capturas revisadas: `artifacts/phase-4-start.png` y `artifacts/phase-4-exit.png`. Permanece el aviso no bloqueante de Vite por el tamaño de Phaser. Falta la valoración del usuario sobre dificultad, rodamiento y proporciones; no equivale a aprobación de la fase siguiente.

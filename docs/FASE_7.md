# Fase 7 — Ropey Rampage

## Corrección de Claude (29/09/2026, encargo de fase 8)

Detalle en `docs/ENTREGA_CLAUDE_FASE_8.md` §1–2. Resumen: las lianas móviles terminan en y=140 (colgado abajo, el balanceo metía a DK en el bloque 400/152 y lo soltaba al pozo); en el aire tocar una liana la agarra sin W, en el suelo W, S deja pasar, sin re-agarre automático de la liana soltada hasta tocar suelo; dosel nocturno que marca el tope; bananas de práctica 150/134/118; carteles nuevos. Cámara Y=48 y `climbTop:116` sin cambios. Las secciones siguientes describen el estado anterior a esta corrección.

## Corrección posterior: suelo visible al salir de las cuerdas

El usuario detectó que trepar hasta arriba y soltarse ocultaba el piso, produciendo un salto a ciegas. La prueba anterior solo comprobaba que la cámara subiera, no la legibilidad de la caída.

Corrección específica de Ropey: cámara con mínimo scroll Y=48; límite escalable del centro de DK Y=116 en las tres cuerdas, separado del ancla visual mediante `climbTop`. Un nudo claro marca ese límite. Suelo Y=180 queda como máximo en Y=132 de la pantalla (12 px de margen). Con el salto completo B-01 y celda 32×32, DK también cabe en el ápice. No se cambia fuerza de salto, gravedad, zoom, collider ni Jungle. El tramo superior de cuerda queda decorativo; se reduce deliberadamente la altura escalable para no exigir un salto ciego en 160×144.

Nueva regresión en navegador: subir al límite, mantener K al soltarse, muestrear todos los fotogramas observados hasta aterrizar y exigir suelo y sprite dentro del encuadre. Además conserva pausa/foco, regreso al agarre y recorrido por ambas cuerdas móviles. Captura: `artifacts/phase-7-rope-landing-visible.png`; `phase-7-climb.png` muestra suelo y DK en el límite. Prueba matemática para las tres cuerdas en phase7-unit. El reemplazo futuro de sprites más grandes deberá revisar este margen.

Verificado después de esta corrección: `npm.cmd run build`, `npm.cmd run test:unit` y `node tests/smoke.mjs --phase7-only` PASS en Edge 154.0.4258.37 / Windows, cero errores de ejecución. Recorrido 26.07 s con dos retornos (uno deliberado). La suite completa citada más abajo pertenece a la entrega previa; en esta corrección se repitieron todas las unitarias y el navegador de fase 7.

Autorizada el 28/09/2026. El usuario aplazó el reemplazo del mono: el sprite NO queda aprobado por avanzar de fase. No se implementa fase 8 en este encargo.

## Alcance

- Ruta independiente `/?level=ropey`; `/` sigue siendo Jungle fase 6. Enlace entre pruebas en el panel, sin mapa ni progreso compartido (fase 9).
- Selva nocturna provisional a partir del arte existente, 1760 × 256 px; pantalla 160 × 144. Cámara vertical acompaña la subida.
- Primera cuerda vertical sobre suelo seguro, seguida de dos cruces con balanceo periódico. Descansos entre encuentros; cuatro patrullas, tres barriles, bananas, R/T y checkpoint antes del segundo cruce.
- R/T conservadas tras caídas y ofrecidas otra vez antes de salir si se omiten. No bloquean la salida. Reiniciar borra el progreso del nivel; no hay guardado.
- W cerca de la cuerda para agarrarse (se puede mantener durante un salto); W/S suben/bajan; K, con una pulsación nueva, suelta saltando. A/D eligen dirección de salida y J conserva la velocidad de carrera. No se agarra llevando barril, rodando, muriendo o después de completar.
- El agarre no requiere mantener W después de entrar. J solo no suelta ni ataca en cuerda. Soltar una cuerda bloquea un nuevo agarre durante 300 ms activos. Si el cuerpo fuera a entrar en un sólido por el balanceo, se suelta desde la última posición segura sin impulso adicional.
- Pausa y foco congelan cuerdas y simulación; volver no dispara una pulsación pendiente. Restart limpia el agarre y devuelve gravedad/movimiento.

## Arquitectura y límites

`ropey-layout.ts` contiene el nivel; `ropes.ts` contiene estado puro, oscilación y parámetros propios (agarre horizontal 14 px, trepar 48 px/s, mínimo 24 px debajo del ancla). El avance ocurre en WORLD_STEP de 60 Hz. La presentación solo lee el estado. La suelta usa el impulso B-01 existente (235), no retoca salto, aceleración, gravedad o cuerpo. No se transfiere velocidad de péndulo: extensión deliberadamente sencilla, por validar con el usuario.

`movement.ts` integra la posición cinemática de cuerda y restaura Arcade al salir. `gameplay-view.ts` comparte el arte y añade tinte nocturno; reutiliza `dk-carry-0` en cuerda. No se generaron ni reemplazaron sprites. El rediseño del mono, incluyendo animaciones de cuerda, sigue pendiente. Esta adaptación NO se presenta como física ni arte exactos del original.

No hay techo nuevo, neumáticos, agachado, cueva, mapa, audio, comodines, bonus ni cumpleaños. Duración y dificultad humanas pendientes de prueba, sin rellenar tiempo artificialmente.

## Verificación

Pruebas nuevas: `tests/phase7-unit.mjs` y `tests/phase7.mjs`. Respaldo anterior: `artifacts/phase-7-before.zip`. No restaurarlo encima de trabajo posterior sin revisar.

- Unitarias: agarre condicionado, límites de subida/bajada, pulsación nueva, cooldown, foco, periodicidad, R/T y recuperación/checkpoint/salida.
- Navegador: primera cuerda, cámara vertical, pausa/foco y K inmediato al volver; reinicio agarrado; recorrido exclusivamente por teclado, uso de ambas cuerdas móviles, caída deliberada después del checkpoint, persistencia, letras y salida congelada. Sin teletransporte ni ganchos de prueba en el juego.
- Primera ejecución específica aprobada en Edge 154.0.4258.37 / Windows: recorrido de bot de 26.6 s, dos retornos (uno deliberado para probar checkpoint). NO es tiempo humano ni cumple por sí solo la propuesta de 1:15–1:30. La duración y dificultad quedan para playtest; no se añadió relleno.
- Durante la verificación se corrigió K inmediato al recuperar foco (el resync de reanudación consumía la pulsación). Se ampliaron los apoyos antes de las dos subidas altas para evitar quedar debajo de una pared de 48 px tras caer al suelo. B-01 no se modificó.
- Capturas en `artifacts/phase-7-start.png`, `phase-7-rope-paused.png`, `phase-7-climb.png`, `phase-7-finish.png`. Encuadre revisado a 1366×768, escala 3×. La cuerda usa pose provisional de carga; el salto/rodamiento siguen con los sprites existentes.
- `src/tuning.ts` SHA-256: `87f02c4b43fdde42e00c80839ab5d9cfc1b91ed92b39dfc7f1912315f0f6c9f9`. La prueba de fase 6 verifica el hueco de Jungle de 40 px.

**Suite completa `npm.cmd test`: PASS en Microsoft Edge 154.0.4258.37 / Windows**, unitarias, tipos, compilación y navegador A/B/3/4/5/6/7, cero errores en ejecución. Recorrido fase 7 en esta suite: 26.13 s de simulación, dos retornos (uno deliberado); las dos cuerdas móviles fueron utilizadas por el bot. Después se ajustó únicamente la altura visual de los textos de ayuda para que no quedaran cortados debajo del suelo: `npm.cmd run build` y `node tests/smoke.mjs --phase7-only` volvieron a pasar sobre esa presentación final (26.1 s, dos retornos, cero errores). Captura de inicio final inspeccionada: las tres instrucciones quedan completas dentro de la pantalla.

Comparación contra el respaldo de partida: `player.ts`, `tuning.ts`, `gameplay.ts` y todas las constantes de datos de Jungle (desde `export const JUNGLE`) permanecen iguales. El cambio en `jungle-layout.ts` se limita a tipos opcionales de cuerda/tema.

Avisos no bloqueantes: tamaño del bundle de Phaser en Vite y configuración global npm `email` obsoleta. No se editaron configuraciones globales. No se probó un monitor físico de 144 Hz ni se hizo todavía playtest humano de Ropey.

## Archivos cambiados

Nuevos: `src/ropey-layout.ts`, `src/ropes.ts`, `tests/phase7-unit.mjs`, `tests/phase7.mjs`, este informe y `docs/ENCARGO_CLAUDE_FASE_8.md`.

Integración: `src/movement.ts`, `src/gameplay-view.ts`, `src/main.ts`; tipos opcionales en `src/jungle-layout.ts` (los datos de Jungle no cambian); `package.json` y `tests/smoke.mjs` para incluir las pruebas. Actualizaciones de contexto en AGENTS, README, PLAN_ACTUALIZADO y CONTEXTO_COMPLETO_ACTUALIZADO. No se editaron `player.ts`, `tuning.ts`, `gameplay.ts`, generadores ni PNG del personaje.

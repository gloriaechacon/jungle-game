# Fase 9 — mapa, progreso y revisión visual

Actualización posterior: el usuario pidió ampliar niveles 2/3 y refinar sprite/mapa. El estado más reciente está en `REFINAMIENTO_NIVELES_Y_ARTE.md`; las descripciones de longitud/rodamiento inferiores son históricas.

Corrección posterior al playtest: el ciclo de marcha tenía invertida la fase de apoyo (efecto de caminar hacia atrás). Se invirtió la fase de elevación de manos/pies: apoyados retroceden respecto al cuerpo; en el aire avanzan. Afecta caminar, correr y caminar con barril, en ambas direcciones mediante el volteo existente. Pose quieta conservada; física y ritmo de animación sin cambios. Prueba unitaria nueva comprueba los seis pasos de cada extremidad, incluyendo el cierre del ciclo.

29/09/2026. Autorizada por el usuario junto con revisión de fase 8 y mejora del mono, suelo y cueva. No autoriza fase 10.

## Revisión de Claude

Antes de editar: `npm.cmd test` PASS completo en Windows / Microsoft Edge 154.0.4258.37, sin errores de ejecución. Incluye A/B/3/4/5/6/7/8, tipos, compilación y unitarias. No se detectó un fallo bloqueante en lo entregado.

- Lianas: la prueba de barrido del período y la prueba en navegador colgado abajo pasan; conserva fondo 140, amplitud ajustada, cámara mínima 48 y límite de subida 116. Agarre automático en el aire, W desde suelo, S para pasar y bloqueo de reagarre conservados. J rodando sigue bloqueando el agarre: es una regla, no se eliminó.
- `restoreFallCap`: restaura al dejar de subir y al reiniciar/retornar. El test de navegador registra la velocidad cada fotograma: subida alta alcanza -320 y caída no supera 280. Pausa durante el rebote, golpe y retorno cubiertos. No se retocaron llantas ni B-01.
- Dosel: se conserva, al igual que las tres bananas de práctica. Su comprensión y la dificultad siguen requiriendo aprobación humana, no basta el bot.

## Implementación

- `/?adventure=1`: mapa de tres nodos. A/D o flechas eligen; K entra. Solo desbloquea el siguiente al terminar el anterior. Se puede repetir una etapa completada.
- La salida mantiene el resumen. Una pulsación nueva de K vuelve al mapa; mantener K desde el salto final no salta pantallas. Espacio no reactiva un nivel terminado.
- Bananas y BERTO se acumulan por identidad de objeto y nivel, sin duplicación por repetición. HUD muestra el acumulado; resumen de etapa muestra bananas locales y letras acumuladas. Letras opcionales: nunca bloquean la salida.
- Progreso en memoria de esta página, sin guardado persistente. Se guarda la recolección al completar una etapa. Caer conserva objetos dentro del intento. Reiniciar etapa descarta lo no completado de ese intento y restaura lo previamente guardado; recargar borra toda la aventura.
- Tras Reptile: mapa con «RECORRIDO COMPLETO» y opción de repetir. No es todavía el final de cumpleaños.
- La prueba integrada detectó un cierre de escena que intentaba desuscribirse de un mundo físico ya destruido por Phaser (`physics.world` nulo). Se captura la instancia al suscribirse y se limpia esa referencia. Era un camino no utilizado mientras cada nivel recargaba la página; la prueba de transición protege ahora esa integración.
- Se consume la pulsación de K usada para entrar desde el mapa: mantenerla no provoca un salto al aparecer. Prueba específica con K sostenida. El bot de la primera serpiente ahora salta según distancia a la patrulla, no desde un X fijo sensible al tiempo en menús/capturas; no se cambió la serpiente.
- Rutas independientes `/`, `/?level=ropey`, `/?level=reptile`, laboratorio y diagnósticos conservados. Enlace a aventura desde cada prueba.

## Iteración de arte (pendiente de aprobación visual)

- Marcha y carrera de seis poses distintas: brazos largos con codos, transferencia de apoyo entre nudillos, pie que se levanta, hombros altos y cadera retrasada. Se quitó el código que fijaba torso y mano durante toda la caminata. Conserva celda 32×32, anclaje en pies, paleta granate y corbata.
- La frecuencia visual sigue la distancia recorrida. El ciclo total mantiene aproximadamente su recorrido anterior; no cambia velocidad, salto ni cuerpo 12×16.
- Seis poses también al caminar con barril. Salto, golpe, cabeza, festejo y rodamiento existentes conservados; el rodamiento aún es simple y la pose de cuerda aún reutiliza brazos levantados. No declarar terminado todo el personaje.
- Conserva los fondos de selva de Claude. Suelos de los tres niveles: bloques de roca más angulares y grandes, caras iluminadas y oscuras, sombra de contacto bajo escalones; conserva su banda de camino y remates volumétricos.
- Cueva: techo de estalactitas con caras, bloques quebrados y planos amplios en las columnas, menos textura aleatoria. Todo propio, generado desde `tools/art`; no descargas ni nuevas dependencias.
- Ver láminas regeneradas en `docs/art/`; referencias anteriores en `docs/sprites-para-redibujar` son históricas, no el atlas actual.

## Verificación y alcance

Pruebas específicas: `tests/phase9-unit.mjs` (desbloqueo, unicidad, restauración, letras opcionales, seis poses distintas), `tests/phase9.mjs` (las tres rutas por teclado en una misma sesión y regreso al mapa, progreso, repetición y borrado al recargar). Integradas en `npm test`.

Resultados de esta revisión en Edge 154.0.4258.37 / Windows:

- Entrega original de Claude: `npm.cmd test` completo A/B/3/4/5/6/7/8 PASS.
- Con arte y mapa nuevos: tipos, compilación, todas las unitarias y regresiones A/B/3/4/5/6/7/8 PASS. La primera integración de fase 9 detectó los dos problemas descritos arriba; no se ocultaron ni se retocó la física para pasar.
- Tras las correcciones: `npm.cmd run build` y `node tests/smoke.mjs --phase9-only` PASS, tres niveles por teclado sin recargar entre ellos, todos los regresos al mapa, K sostenida al entrar, BERTO completo, bananas acumuladas (61 en este recorrido), repetición y reinicio por recarga; cero errores de ejecución. Las pruebas de fase 9 reutilizan también las comprobaciones de daño/pausa/lianas/llantas de 6/7/8.
- Todas las unitarias se repitieron al cierre: PASS. `npm run art`: reconstrucción idéntica byte a byte de los 21 recursos de `public/assets` comprobada. B-01 conserva la huella indicada debajo.
- Inspección visual de la secuencia de caminata, Jungle, tope del dosel de Ropey, cueva y mapa. Capturas: `artifacts/phase-9-map-start.png`, `phase-9-map-1.png`, `phase-9-map-2.png`, `phase-9-map-3.png`; lámina de caminata: `docs/art/dk-walk-cycle.png`.

La suite completa no se repitió íntegra después del último ajuste: se repitió específicamente la integración 9 (incluye recorridos y comprobaciones de 6/7/8), además de las unitarias. No confundir este resultado con una aprobación visual o de dificultad por el usuario.

Respaldo previo: `artifacts/phase-9-before.zip`. B-01 SHA-256 `87f02c4b43fdde42e00c80839ab5d9cfc1b91ed92b39dfc7f1912315f0f6c9f9`. Sin cambios de geometría, controles de movimiento ni reglas de combate. Sin fase 10, audio, final, introducción ni consola definitiva.

Las capturas de pruebas demuestran encuadre y funcionamiento; no garantizan que el arte ya sea el que quiere el usuario ni que el desafío esté equilibrado para Roberto.

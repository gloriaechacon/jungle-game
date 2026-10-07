# Liana, cara y «volver al mapa» — Claude, 29/09/2026

Pedido del usuario tras probar la aventura: verificar lo último que hizo Codex, mejorar cómo DK se agarra de la liana (se veía «colgado del cuello»), hacer la liana más real y con volumen, aclarar un poco la cara con cejas en V, y poder volver al mapa sin terminar el nivel. No es fase 10.

## Verificación de lo entregado por Codex (antes de tocar nada)

`npm test` completo en Chromium 141.0.7390.37 / Linux: PASS (unitarias 1–9, tipos, compilación y navegador A/B/3/4/5/6/7/8/9, cero errores). Hash de `src/tuning.ts` intacto. No se encontró un fallo técnico; los pedidos de abajo son de aspecto y comodidad.

## Liana y agarre

- Poses de trepar rehechas (`tools/art/dk-frames.mjs`, `CLIMB`): DK cuelga **al costado** de la liana, con **las dos manos arriba de la cabeza** sobre la liana, la cara libre y girada hacia ella, rodillas flexionadas y el pie apoyado. Cuatro cuadros mano sobre mano (las manos se turnan arriba/abajo y el cuerpo se sube un píxel).
- Capa de agarre aparte (`dk-climb-grip-0..3`): manos y pie se dibujan **delante** de la liana y el cuerpo **detrás**, así los dedos «envuelven» la liana en vez de quedar al lado.
- DK cuelga del lado opuesto a hacia donde mira (se voltea con A/D antes de agarrarse). El punto de agarre (24,10) de la celda sigue anclado a la liana e inclinado con el balanceo, como en la versión de Codex.
- Liana nueva (`src/rope-view.ts`): tallo leñoso con dos hebras retorcidas (surco oscuro que gira), luz desde la izquierda, hojas alternadas a lo largo, una mata de hojas donde sale del dosel y una punta enrulada como último agarre. Piezas generadas en `tools/art/props.mjs` (`vineLeaf`, `vineTuft`, `vineTip`).
- Cara: máscara un poco más clara (`M1`/`M2` en `tools/art/dk.mjs`) y ceja en V marcada. Caminar, rodar y el resto de las poses no cambiaron.
- Sin cambios de física, controles, balanceo, límites de trepa, cámara ni B-01.

## Volver al mapa (solo en la aventura, `/?adventure=1`)

- Botón **«Volver al mapa»** junto a «Reiniciar esta etapa» mientras se juega una etapa.
- En el juego: **Espacio** pausa, el menú muestra `J: IR AL MAPA`; la primera J pregunta `IR AL MAPA? / J: SI / ESPACIO: NO`, la segunda J confirma y Espacio cancela. J mientras se juega sigue siendo rodar/correr: nunca saca del nivel.
- Salir a mitad de una etapa **no guarda ese intento** (igual que reiniciar la etapa): se conserva lo de las etapas ya completadas y el mapa queda sobre la etapa que se estaba jugando.

## Pruebas

- `tests/phase9-unit.mjs`: manos sobre la liana y arriba de la cabeza, cara fuera de la liana, capa de agarre que cubre la liana en cada mano y cambia al trepar.
- `tests/phase9.mjs` → `testMapReturn`: J jugando no sale; menú de pausa con confirmación, Espacio cancela, doble J vuelve al mapa sin guardar bananas; el botón hace lo mismo; se puede volver a entrar limpio.
- `tests/phase6.mjs`: en la aventura, una J durante la pausa solo muestra la pregunta; el juego congelado no cambia.
- Resultado: ver el final de este documento.

Pendiente: aprobación visual del usuario; Edge/Windows (Codex).

## Resultado final

Con estos cambios, `npm test` completo en Chromium 141.0.7390.37 / Linux: PASS (unitarias, tipos, compilación y navegador A/B/3/4/5/6/7/8/9 + regreso al mapa), cero errores de ejecución, `EXIT 0`. `npm run art` regenera todo de forma idéntica. B-01 intacto (SHA-256 `87f02c4b…f9`). Falta ejecutar en Edge/Windows.

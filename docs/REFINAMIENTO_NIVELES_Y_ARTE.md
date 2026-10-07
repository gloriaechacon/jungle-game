# Refinamiento tras fase 9

Pedido del usuario: conservar Jungle y la caminata, dar más recorrido/variedad a Ropey y Reptile, rodamiento reconocible (no pelota), quitar rayas diagonales, cara más de simio y mapa curvo sin cabaña del viejo. No es fase 10.

## Cambios

- Ropey: 1760 → 2400 px (+36%). Nueva aproximación escalonada, tercera liana móvil sobre un cruce de 72 px (período 2,6 s), cadena de plataformas a distintas alturas y dos patrullas nuevas. R/T siguen en sus lugares originales; la recuperación se trasladó antes de la nueva salida. Se conserva el tutorial, el checkpoint y las correcciones de agarre/cámara. El nuevo balanceo se barre contra todos los sólidos en la prueba unitaria.
- Reptile: 1600 → 2304 px (+44%). Después de la meseta original, galería descendente, cuarta llanta y segunda subida escalonada, dos patrullas y barriles adicionales. O opcional con recuperación segura tras la última patrulla. Sin techos bajos ni nuevos controles, con el mismo checkpoint. El único pozo sigue midiendo 32 px.
- Son desafíos y combinaciones nuevas de las mecánicas existentes, no una nueva mecánica de juego. No se hizo más lento al personaje para alargar los niveles. La duración y dificultad humanas requieren playtest.
- Rodamiento: ocho poses de un cuerpo articulado dando una voltereta, con cara, extremidades y corbata que giran juntas. Cada pose alineada al suelo. Dura los mismos 300 ms y tiene exactamente la misma colisión/ataque; solo cambia la representación.
- Sprite: se quitó el sombreado periódico que producía líneas diagonales. Masas de pelaje limpias y luces en los bordes. Cara con oreja redondeada, arco de cejas, nariz ancha y mandíbula, conservando paleta/corbata y coordenadas de las seis poses de caminar/correr/cargar. No se volvió a invertir el ciclo corregido.
- Mapa: costa irregular con relieve, sendero curvo en dos tramos, vegetación redondeada, cascada y entrada de cueva. Tres nodos y reglas de progresión intactos. Sin cabaña del viejo.

## Invariantes y comprobación

No se modifica `tuning.ts`, `player.ts`, `gameplay.ts` ni el trazado de Jungle. Sin comodines, bonus, otro personaje, audio ni final de cumpleaños. Fondos y terreno de los niveles conservados. Respaldo: `artifacts/refinamiento-antes.zip`.

Pruebas ampliadas: ocho poses de rodamiento distintas, silueta no circular y anclaje al suelo; sentido de marcha conservado; terreno libre para todas las lianas durante un período entero, soporte de patrullas, bananas fuera de sólidos, cuarta llanta; recorridos de navegador deben cruzar la tercera liana y la galería/subida nueva antes de completar. No basta probar las salidas antiguas.

Arte propio, reproducible con `npm run art`. Láminas: `docs/art/dk-walk-cycle.png`, `dk-roll-cycle.png` y `dk-frames.png`. Pendiente de aprobación visual/jugable del usuario.

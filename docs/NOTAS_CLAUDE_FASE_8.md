# Notas de trabajo — Claude, encargo fase 8 (bitácora viva)

Archivo de seguimiento para no perder contexto entre sesiones. Se actualiza a medida que avanza el trabajo. El informe final será docs/ENTREGA_CLAUDE_FASE_8.md.

## Orden pedido por el usuario (28/09/2026)
1. PRIMERO corregir pendientes de Ropey:
   - Agarre confuso: la primera liana agarró solo al saltar y la móvil no. Revisar diferencia (W es el agarre previsto).
   - Límite de subida poco claro (parece error): comunicarlo visualmente o replantearlo.
   - Banana sobre el límite: reubicarla para que la primera liana enseñe a trepar sin exigir un salto inesperado.
   - Prueba manual: validar ambas lianas y explicar claramente cómo agarrarse, trepar y soltarse.
2. Revisión fase 7 según docs/ENCARGO_CLAUDE_FASE_8.md (fallos confirmados + pruebas).
3. Solo fase 8 (Reptile Rumble) en `/?level=reptile`. NO mapa ni fase 9.
- Conservar: B-01 (tuning.ts SHA-256 87f02c4b…f9), hueco Jungle 40 px, sprite actual de DK, cámara Ropey Y=48 / climbTop 116 (no revertir a altura ilimitada).

## Método
- Copia de trabajo en la nube para compilar y correr Chromium; los archivos finales se escriben de vuelta en esta carpeta.
- Estado: TERMINADO (29/09) — ver ENTREGA_CLAUDE_FASE_8.md.

## Bitácora
- Leído encargo, AGENTS, FASE_7, ropes.ts, ropey-layout.ts, movement.ts, phase7*.mjs. Hash tuning OK.
- 29/09 PASO 1 HECHO (Ropey) y escrito en esta carpeta:
  - Reproducido en Chromium: la cuerda de práctica agarra con W caminando/parado/corriendo/saltando (4/4). La móvil: agarrar en su punto más bajo desde el borde y quedarse colgado → el balanceo metía a DK en el bloque 400/152 y lo soltaba al pozo (muerte). Ese era el "no agarra" de la móvil. Además en el aire hacía falta mantener W + K a la vez.
  - Corrección: en el aire, tocar una liana la agarra sola (como el original); en el suelo sigue siendo W. S en el aire deja pasar. La liana recién soltada no se re-agarra sola hasta tocar suelo.
  - Lianas móviles terminan en y=140 (antes 172) con amplitud escalada: mismo balanceo, ya no chocan con el terreno. Prueba unitaria barre todo el período.
  - Límite de subida: dosel nocturno (canopy-night.png, generado) tapa la cuerda por encima del límite; las manos de DK llegan a las hojas. Se quitó el "nudo" que parecía error. Cámara Y=48 y climbTop 116 SIN cambios.
  - Bananas de práctica: 150/134/118 (la última marca el límite). Ya no hay banana que exija salto.
  - Carteles: W AGARRA / W S TREPA / K SALTA; antes del primer hueco: SALTA A LA LIANA.
  - Pruebas: unit + navegador fase 7 PASS en Chromium 141/Linux.
- SIGUIENTE: resto de revisión fase 7, luego fase 8 Reptile.
- 29/09 Revisión fase 7 (resto): K repetido en cuerda no da salto extra (probado); roll-jump hacia cuerda no bloqueó el agarre en 8 intentos (riesgo menor anotado); pausa/foco/reinicio ya cubiertos por la prueba de Codex.
- 29/09 FASE 8 en curso (copia de nube, todavía NO escrita en esta carpeta):
  - Arte generado: cave-top/fill/side/cap, cave-far (cortinas moradas), cave-near, snake-walk-0/1, tire-0/1.
  - src/tires.ts (rebote propio: bajo 250 → 49 px, alto 320 con K → 80 px), src/camera.ts (cámara legible), src/reptile-layout.ts.
  - Ruta /?level=reptile; bot completa en 18.9 s sin muertes; O opcional sobre la 1ª llanta (solo rebote alto) y recuperación antes de la salida.
  - Pendiente: prueba de navegador fase 8, capturas, suite completa, informe.
- 29/09 CERRADO. Todo escrito en esta carpeta: código, pruebas, arte regenerado aquí (hash idéntico a la copia), capturas phase-8-*.png, video phase-8-run.webm, docs/ENTREGA_CLAUDE_FASE_8.md, AGENTS/README/CONTEXTO/FASE_7/PLAN/REFERENCIA_ARTE actualizados arriba.
  - Suite completa `npm test` PASS en Chromium 141/Linux (EXIT 0). Aquí: test:unit y typecheck PASS. Falta Edge/Windows (Codex).
  - Estado: pendiente de revisión de Codex y prueba manual del usuario. Fase 9 NO iniciada.
- 29/09 PASADA VISUAL (pedido del usuario tras comparar con el video; inspiración, no copia):
  - Suelo con relieve en los 3 niveles: tools/art/terrain.mjs (banda del camino de 12 px con luz arriba y labio oscuro, sombra bajo el labio, esquinas redondeadas que doblan hacia abajo, piedras 32x32 con luz/sombra, columnas laterales sombreadas). gameplay-view.ts ajustado a los tamaños nuevos. Colisiones sin cambios.
  - Reptile: fondo cercano rehecho (columnas de roca hasta el techo y estalagmitas sombreadas) para que se entienda que son rocas.
  - npm test completo PASS en Chromium 141/Linux; aquí arte regenerado (hash igual) + unitarias + tipos.
  - Pendiente de decisión del usuario: diferenciar Ropey (cielo abierto, copas de palmeras), alargar Ropey/Reptile, sonido, DK dibujado por el usuario.

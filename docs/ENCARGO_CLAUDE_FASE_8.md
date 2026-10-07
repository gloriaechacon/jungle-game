# Encargo para Claude: revisar fase 7 y continuar solo con fase 8

Actualización posterior al playtest: Codex corrigió el salto a ciegas desde cuerdas. Ropey limita el centro de DK a `climbTop:116` y el borde superior de cámara a `ROPEY_CAMERA_TOP=48`: piso y sprite caben juntos incluso con salto completo. No revertir esta corrección a la altura ilimitada anterior. `phase7.mjs` muestrea el salto completo hasta aterrizar y comprueba visibilidad; `phase7-unit.mjs` verifica el margen con B-01. No trasladar esos números ciegamente a Reptile: diseñar su encuadre según sus alturas.

Trabajá directamente en `C:\Users\Abraham\Documents\Donkey Kong`. El usuario autorizó que Codex implementara fase 7 y que vos la revises y continúes con fase 8. No reinicies el proyecto ni trabajes sobre la vieja carpeta de outputs. Si solo tenés una copia, indicalo y entregá un parche/archivos completos con instrucciones de aplicación; no afirmes haber cambiado la carpeta real.

## 1. Leé el estado real

Leer AGENTS.md, README.md, docs/FASE_7.md, docs/PLAN_ACTUALIZADO.md y la actualización inicial de docs/CONTEXTO_COMPLETO_ACTUALIZADO.txt. Las prohibiciones históricas de iniciar fase 7 quedan superadas por esta autorización. Fase 8 te corresponde a vos; no pasar a fase 9.

- Jungle sigue en `/`, con el hueco posterior al checkpoint de **40 px que corregiste**. No revertirlo a 44.
- Ropey está en `/?level=ropey`, independiente: noche, práctica de cuerda sobre suelo seguro, dos cruces con balanceo, R/T, bananas, cuatro patrullas, barriles, checkpoint y salida sin bloqueo por letras.
- W agarra una cuerda cercana; W/S trepan; una pulsación nueva de K suelta saltando. A/D dan dirección de salida. No se agarra con barril, rodando o muriendo. Pausa/foco congelan todo.
- El mono actual NO convence al usuario, pero decidió reemplazarlo después. No rediseñes DK en este encargo. La pose de cuerda reutiliza `dk-carry-0`, provisional. Referencias preparadas en docs/sprites-para-redibujar; no son un atlas original completo ni todos los gestos están confirmados.

## 2. Revisá fase 7 antes de ampliar

Inspeccionar src/ropes.ts, ropey-layout.ts, movement.ts, gameplay-view.ts, main.ts y tests/phase7*. Revisar especialmente:

1. Orden de WORLD_STEP, agarre cinemático/restauración de gravedad y `body.moves`, choques contra sólidos durante balanceo, límites verticales y salida de cuerda.
2. Pulsaciones K rápidas/repetidas, W mantenida, pausa/foco estando agarrado, reinicio, daño y caída al checkpoint; que no queden teclas o cuerpos atascados ni salto aéreo adicional accidental.
3. B contextual con cuerda/barril y precedencia frente a rolling/dying/finished.
4. Que ambas brechas se puedan cruzar con teclado y sin depender de un tiempo de fotograma concreto. Probar también caminar, retroceder y soltarse en mala dirección; verificar retornos justos.
5. R/T, recuperación antes de salida, persistencia en reintentos y borrado al reiniciar. Progresión entre niveles todavía NO implementada.
6. Cámara vertical, lectura de cuerda/plataforma de llegada y encuadre laptop 1366×768. Reutilización de arte nocturno es provisional, no fidelidad artística aprobada.

Reproducí los problemas que encuentres, corregí los confirmados y añadí pruebas. No cambies sistemas aprobados por preferencia. Ejecutá tipos, unitarias, build y suite del navegador. Informá navegador/SO reales; si usás Chromium/Linux, dejá Edge/Windows expresamente pendiente para Codex. No cambies las pruebas para ocultar un fallo real.

## 3. Implementá únicamente fase 8: Reptile Rumble

Adaptación breve de cueva GBC: formaciones violetas, piedra oscura, suelo cálido, plataformas, enemigo terrestre tipo serpiente, barriles, bananas, letra O, checkpoint, neumáticos/rebote y ascenso final hacia una salida clara. Referencia: video aportado y docs/REFERENCIA_NIVELES.png; no confundir con la versión SNES. Sin salas bonus ni minijuegos.

- Usar una ruta de prueba independiente, por ejemplo `/?level=reptile`, sin modificar la selección actual de Jungle/Ropey. Añadir enlace para probarla. El mapa y progreso integrado son fase 9, NO implementarlos.
- Primer neumático sobre suelo seguro; luego pocas aplicaciones legibles, sin salto ciego ni precisión frustrante. Escalonar la dificultad, mantener encuentros interesantes y retorno cercano. No alargar artificialmente para cumplir una duración.
- Extender rebote con parámetros propios separados de B-01. No tocar `src/tuning.ts` ni sus valores. Dar feedback visual, congelar en pausa/foco y limpiar estado al reiniciar/morir.
- Agacharse solo si el recorrido realmente lo exige. Si se implementa con S, separar estado y colisión de pie/agachado, impedir levantarse dentro del techo y probar bordes. Si no hace falta, omitirlo y justificarlo; no añadir un túnel imposible como decoración.
- La O es opcional para salir, persiste en reintentos y se vuelve a ofrecer sobre suelo seguro si falta. Reiniciar limpia el nivel.
- Reutilizar sistemas existentes. Mantener reglas independientes de presentación, datos de nivel separados y simulación fija a 60 Hz. Añadir arte de cueva/serpiente/neumático a las fuentes del generador cuando corresponda, reproducible con `npm run art`; no alterar el DK aplazado.
- La salida termina la prueba de fase 8. NO diseñar todavía el cumpleaños, textos personales, comodines, audio, consola final, intro, zoom o mapa. No agregar Diddy/Rambi ni controles móviles.

## 4. Invariantes

`src/tuning.ts` SHA-256 esperado:
`87f02c4b43fdde42e00c80839ab5d9cfc1b91ed92b39dfc7f1912315f0f6c9f9`

Cuerpo base 12×16; A/D o flechas, K salto, J acción/carrera, Espacio pausa (no Enter). Mantener diagnóstico, lab, greybox y phase5. No aprobar el arte ni afirmar que la experiencia está equilibrada solo porque pasan pruebas automáticas. No borrar cambios ajenos ni reemplazar toda la carpeta con una copia vieja.

## 5. Entrega para revisión de Codex

Dejar `docs/ENTREGA_CLAUDE_FASE_8.md` con:

- Hallazgos de fase 7: evidencia, reproducción, corrección y prueba; distinguir fallos de preferencias.
- Archivos cambiados; decisiones de fase 8 y parámetros nuevos; qué quedó fuera.
- Comandos ejecutados, resultados, SO/navegador y límites de las pruebas. Separar recorrido de bot de duración humana.
- Capturas de inicio, cuerda/regresión, neumático, ascenso, checkpoint, muerte/reintento, O y final; video si es posible.
- Hash B-01 y confirmación de que el hueco de Jungle sigue en 40 px y DK no fue rediseñado.
- Checklist de riesgos pendientes para Codex. Actualizar instrucciones y contexto sin borrar el historial.

Al terminar, dar un resumen breve para pegar en Codex y detenerse. **No iniciar fase 9.**

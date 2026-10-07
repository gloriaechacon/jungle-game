# Encargo para Claude: correcciones y fase 5

El usuario autoriza expresamente que Claude implemente las correcciones justificadas de su revisión y la fase 5. Codex cambia de rol: revisará después la entrega. No esperar otra autorización para empezar este encargo. No iniciar fases 6–14 ni publicar el juego.

Trabajar directamente en `C:\Users\Abraham\Documents\Donkey Kong`. Leer AGENTS.md, README.md, docs/CONTEXTO_COMPLETO_ACTUALIZADO.txt y docs/FASE_4.md. Las restricciones históricas de «fase 5 no autorizada» quedan reemplazadas por este encargo, no las restricciones de física o alcance. Preservar cambios ajenos y no trabajar en el respaldo antiguo de Codex.

## Validación independiente de la revisión

Codex contrastó la revisión con el código actual y realizó una prueba determinista del reloj:

- CONFIRMADO: gameTime y JungleRules.step descartan tiempo con el límite de 33,34 ms; Arcade acumula pasos adicionales. Al entregar 1000 ms repartidos en 24 llamadas, rules.now avanza 800,16 ms; a 40/60/144 llamadas avanza 1000 ms. Confirma el defecto, NO reproduce las mediciones de navegador de Claude de 763 ms, 349 ms de rodamiento o 61 px/s.
- CONFIRMADO EN CÓDIGO: Start alterna pausa tras finished y el dibujo oculta el cartel de completado cuando paused es true. Corregir y añadir regresión.
- CONFIRMADO: la prueba step(...,true) verifica una rama que la integración real no usa. No es una prueba falsa de la función, pero NO demuestra la pausa integrada. El navegador ya cubre parte de esta última. Alinear la cobertura y eliminar API sin uso si corresponde.
- CONFIRMADO: inicio, checkpoint, salida, medidas de colisión y gravedad del barril están repetidos. Es deuda de mantenimiento, no un fallo actual demostrado.
- CONFIRMADO EN CÓDIGO: rodar fuerza una dirección durante 300 ms; el rebote escribe -150 después de player.update; la pausa limpia las ventanas de salto. Sus efectos exactos requieren pruebas antes de modificar comportamientos.
- NO VERIFICADO AQUÍ: cifras exactas de duración, voladizo del sprite, tiempos de vuelo o fluidez a 144 Hz. No presentarlas como mediciones independientes de Codex. Tampoco afirmar que se descartaron exhaustivamente todos los errores graves.

## A. Correcciones previas al arte

1. Sincronizar tiempo activo de movimiento/reglas/física. No resolverlo simplemente ralentizando DK para que coincida con el reloj defectuoso. Preferir un criterio común de simulación con acumulador/subpasos cuando sea necesario; conservar seguridad de colisiones y tratar pausa/pérdida de foco sin acumular tiempo pendiente. No sustituir el clamp por un delta grande sin revisar proyectiles y detecciones. Preservar sensación y resultados de B-01 a frecuencias normales.
2. Dar prioridad estable al estado completado frente a pausa/foco: Espacio no debe reemplazar el final por «continuar», reactivar la simulación ni reiniciar.
3. Mover contenido del nivel a datos y centralizar referencias de inicio/checkpoint/salida y medidas de entidades. Separar tamaño visual de colisión. Gravedad de barriles: referencia explícita a la gravedad compartida o constante propia documentada, sin duplicación accidental. Refactor acotado, no crear un motor genérico ni implementar otros niveles.
4. Canalizar efectos de movimiento, como el rebote, mediante PlayerController. Definir y probar precedencia para que un pisotón no cancele por accidente un salto válido ya aceptado en el mismo paso. No introducir por ello un rebote variable nuevo.
5. Fortalecer pruebas: pisotón y muerte por rodamiento en navegador, daño con barril llevado, recolección efectiva de letra omitida, ventanas de salto, pausa tras completar y pausa/foco de todos los sistemas. Eliminar la dependencia de acciones sintéticas no usadas en producción como prueba de integración.
6. Medir a 24/40/60/144 fps simulados: reloj, velocidad, salto, duración/distancia de rodamiento, enemigo y barril. Explicar el método y distinguir simulación de un monitor físico a 144 Hz. Las pruebas no deben alterarse para esconder regresiones.

## B. Fase 5 autorizada: arte y animación de Jungle

Objetivo: sustituir los placeholders del Jungle existente por una primera entrega visual coherente y jugable, con la referencia de Game Boy Color. No entregar solamente más rectángulos renombrados como sprites.

- Hacer primero una pasada por docs/REFERENCIA_INICIO.png, docs/REFERENCIA_NIVELES.png y, si está accesible, el video indicado en el contexto. Registrar paleta elegida, tamaños lógicos, anclajes y tiempos de animación; distinguir decisiones propias de mediciones del original. No confundir las láminas escaladas con píxeles nativos.
- Mantener 160x144 y escalado entero sin suavizado. Objetivo laptop/navegador/teclado. Mantener maqueta actual de consola; no dedicar esta fase a rehacer la carcasa final, título o zoom.
- Producir recursos nuevos propios basados en las referencias como opción de trabajo por defecto, documentando método y procedencia. No asumir permiso para extraer un paquete del juego original. Si se propone otra fuente de assets, declarar procedencia/licencia y consultar antes de introducir compras, descargas dudosas o una dependencia externa necesaria para jugar.
- DK reconocible: quieto, caminar/correr, ascenso/descenso de salto, rodar y cargar/lanzar barril; transiciones consistentes sin modificar cuerpo físico ni velocidades. Cuerdas no pertenecen a esta entrega. Los PNG/atlas o texturas reproducibles deben conservar fuentes editables y ser revisables.
- Arte de enemigo terrestre reconocible con patrulla/derrota; contrastar la referencia antes de llamarlo Gnawty. Bananas, B/E, barriles, bandera/checkpoint y salida con legibilidad clara.
- Jungla diurna: suelo/tiles, vegetación, fondo y punto de inicio evocando la casa del árbol. Conservar geometría del recorrido; no ampliar duración ni agregar obstáculos para lucir el arte.
- Revisar los pies en bordes, penetraciones aparentes, barril y contactos. 24x28 es una envolvente provisional, no una medida exacta obligatoria en todas las poses. Mantener el cuerpo 12x16 y el modo de mostrar colisiones. Si una solución visual requiere cambiar colisión, documentar el problema y pedir permiso, no cambiarla silenciosamente.
- Se permite representar el barril llevado sobre la cabeza si la referencia lo confirma: cambiar el anclaje de presentación sin alterar alcance de recogida, colisión o trayectoria de lanzamiento. Distinguir coordenadas visuales de físicas.
- Pausa/foco/completado deben detener también las animaciones nuevas, conservando su estado al reanudar. No añadir audio en esta fase.
- HUD temporal legible y resumen al completar. Conservar rutas diagnósticas A/B/greybox y los interruptores de colisión para revisión.

## Límites y decisiones que NO se delegan como cambios de mecánica

- NO editar los valores de src/tuning.ts. SHA-256 de partida: `87f02c4b43fdde42e00c80839ab5d9cfc1b91ed92b39dfc7f1912315f0f6c9f9`. Comprobar también comportamiento; la huella sola no lo garantiza.
- Controles: A/D o flechas, K salto, J contextual, Espacio Start/pausa; Enter no.
- Mantener por ahora rodamiento actual, tolerancia de borde de 100 ms, rebote fijo y retorno inmediato con protección. Corregir sincronización/precedencia no autoriza un salto especial de rodamiento, cambiar duración o inmunidad, o agregar esperas de daño. Feedback visual sin retrasar el retorno sí cabe dentro del arte.
- No alargar Jungle para alcanzar 1:15–1:30. Medir y reportar duración; el usuario decidirá después. El objetivo total de 6–8 minutos no justifica relleno.
- Rambi, otros personajes, salas bonus, comodines especiales, guardado persistente y nuevos controles quedan fuera. No implementar Ropey, Reptile, mapa, intro ni final de cumpleaños.
- Mantener letras no obligatorias, recuperación de letras omitidas, checkpoint y conservación de coleccionables en reintentos.
- No cambiar automáticamente la política de reanudar al recuperar foco. Si el botón de reinicio con foco causa pérdidas accidentales, proponer una protección accesible; no deshabilitar indiscriminadamente el teclado en todos los botones.
- Si una decisión imprescindible excede estos límites, preguntar solo esa decisión y continuar las partes independientes. No reabrir todas las decisiones ya resueltas.

## C. Verificación y entrega obligatoria para revisión de Codex

Ejecutar tipos, build, pruebas de reglas y suite completa de navegador. Registrar navegador y versión realmente usados (Chromium no equivale a haber probado Edge). Mantener B-01, probar pausa/foco/reinicio/completado con sprites y verificar composición a 1280x720, 1366x768 y 1440x900. Revisar capturas, no solo dimensiones de DOM.

Al terminar, guardar `docs/ENTREGA_CLAUDE_FASE_5.md` con:

1. Resumen de lo implementado y archivos modificados/agregados.
2. Hallazgo -> reproducción -> corrección -> prueba que lo protege. Separar fallos de deuda técnica y de elecciones artísticas.
3. Método de sincronización, mediciones comparables antes/después y cualquier diferencia residual respecto de B-01.
4. Inventario de assets, origen, método de creación, tamaños, paleta, fotogramas, duración y anclajes. Incluir hojas de sprites/contacto.
5. Resultados exactos de comandos y pruebas, fallos pendientes o flakiness, navegador/versión y advertencias. No marcar probado lo que no se ejecutó.
6. Capturas de inicio, movimiento, salto, rodamiento, barril, combate, checkpoint, pausa y final; idealmente video corto. Indicar rutas y cómo reproducirlo.
7. Estado de la física/colliders, hash de tuning.ts y confirmación explícita de qué mecánicas NO cambiaron.
8. Limitaciones visuales, preguntas pendientes y lista breve de lo que Codex debe revisar.

Actualizar README y contexto con el estado real, sin borrar el historial útil ni fingir aprobación del usuario. Entregar un resumen breve al usuario para que lo pegue en Codex, junto con la ruta del informe. Detenerse al terminar fase 5: falta diagnóstico de Codex y aprobación visual del usuario. No iniciar fase 6 por cuenta propia.

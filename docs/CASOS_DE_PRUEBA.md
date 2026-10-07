# Casos de prueba manual — dónde podría fallar

Lista para probar el juego como lo haría otra persona: no solo jugar bien, sino hacer cosas raras a propósito. Cada caso dice **qué hacer**, **qué debería pasar** y **qué sería un fallo**. Abrir `/?adventure=1` salvo que el caso diga otra cosa. Si algo falla, anotalo con la plantilla del final.

Marcar: ✅ bien · ❌ falla · ⚠️ raro pero no rompe.

## Guía dentro del LCD y curvas de mina — 04/10 (vigente)

Estos casos sustituyen GS4/GS5 y las descripciones antiguas de la tarjeta externa del tutorial.

| Caso | Qué hacer | Resultado esperado |
|---|---|---|
| LM1 | Encender, entrar al mapa e iniciar el tutorial en teléfono y PC. | Instrucción dentro del visor, fondo claro y letras oscuras. Fuera solo círculos; la consola no se mueve entre lecciones. |
| LM2 | Correr, pisar al rival, acercarse/agarrar/soltar barril y subir liana. | Cambia una sola instrucción LCD según la acción real; se señalan los controles correctos, dos cuando corresponde. |
| LM3 | Abrir START o Sonido; cerrar y girar el teléfono. | Los círculos no invaden paneles ni pantalla de rotación; al volver siguen alineados. |
| LM4 | Acercarse a la primera llanta de cueva y saltar, en teléfono pequeño y PC. | Aviso mantener A/K arriba, fuera del visor, círculo A en móvil. Sin duplicado dentro/abajo; no tapa juego ni sonido y no mueve la consola. Otras llantas sin recordatorio. |
| LM5 | Llegar al cañón y al carrito. | Cañón idéntico, arranque automático. Se conserva fuera el aviso A/K para saltar durante las primeras bananas. |
| LM6 | Recorrer mina saltando por bananas y por los dos huecos. | Subidas/bajadas pronunciadas, carrito inclinado y visible. Ninguna curva sólida exige saltar ni permite atravesar el riel. |
| LM7 | Caer, reintentar y terminar mina/extra. | Reintento corto sin repetir cueva; puntos conservados sin duplicarse, cierre y música intactos. |
| LM8 | Ayuda → Reiniciar Game Boy → confirmar. Encender, pasar por inicio/mapa/Aprende jugando y comenzar tutorial. | A señalado en inicio/mapa, instrucción solo LCD. Aprende jugando no tiene círculo. Tutorial señala flecha/botón, sin texto externo «Paso1». |

## Guía única, salto y lagartos — 04/10

| Caso | Qué hacer | Resultado esperado |
|---|---|---|
| GS1 | Jungle, hueco después del checkpoint: saltar caminando sin pegarse a la esquina. Mantener A/K durante el salto. | Aterrizar desde varios puntos de salida; no exigir correr. Caminar sin saltar aún puede causar caída. |
| GS2 | Cruzar ese hueco hacia atrás y caer a propósito. | Se puede volver; caída usa el checkpoint existente y conserva recogidas del intento. |
| GS3 | Recorrer la zona media/final de Jungle y la ruta inferior de Ropey. | Más lagartos con pausas para contraatacar; pisotón o barril los derrota. Ninguno ataca en el punto de reaparición. |
| GS4 | Tutorial en teléfono pequeño: saltar, correr, pisar rival y llanta. | Una única tarjeta clara con la acción completa. LCD solo progreso/éxito; sin explicación duplicada abajo. |
| GS5 | Cambiar de lección; girar y volver a vertical. | Consola inmóvil, tarjeta sin cortar ni tapar juego/botones. Correr/pisotón señalan ambos controles. |
| GS6 | Abrir START, elegir otra opción, cancelar mapa. | Fondo claro, letras nítidas y selección visible; guía externa oculta. Cancelar no pierde intento. |
| GS7 | Probar tutorial con alguien que no conoce Game Boy. | Entiende qué botón tocar leyendo una sola indicación. Registrar cualquier frase ambigua. |

## Navegación actual — A confirma, START pausa (04/10)

Estos casos reemplazan las indicaciones históricas de iniciar con START/Espacio,
salir con Esc o usar botones de reinicio de etapa/mapa dentro de Ayuda.

| Caso | Qué hacer | Resultado esperado |
|---|---|---|
| ST1 | Pulsar START en portada, luego A (teclado: Espacio, luego K) | START no comienza; A entra al mapa |
| ST2 | Entrar al tutorial, leer la tarjeta sin tocar y luego pulsar A | Espera; explica START y empieza solo con A |
| ST3 | Durante práctica pulsar START y esperar | Mono, enemigos y reloj quietos; opciones dentro del LCD |
| ST4 | Seleccionar VOLVER AL MAPA con ↑/↓ y A; cancelar con B | No se pierde el intento ni se cambia de pantalla |
| ST5 | Confirmar mapa y volver a entrar en nivel1 | La práctica sigue disponible; salir no la marca completada |
| ST6 | START → OMITIR TUTORIAL → A; luego volver al mapa y entrar otra vez | Comienza Jungle real; no vuelve a exigir práctica hasta nueva partida |
| ST7 | Reanudar con A manteniéndola pulsada | No salta accidentalmente; soltar y volver a pulsar sí salta |
| ST8 | Completar caminar y leer el siguiente salto | BIEN! solo dentro del LCD; explica tocar A / mantener A más alto |
| ST9 | Intentar ir a nivel2 cerrado | Candado visible y COMPLETA EL NIVEL1; no parece una tecla rota |
| ST10 | Abrir Ayuda en teléfono y computadora | Solo Reiniciar Game Boy y la X; no mapa, activar teclado ni reiniciar etapa |
| ST11 | Reiniciar Game Boy: primero cancelar; después aceptar | Cancelar conserva todo; aceptar reinicia encendido/progreso, conserva volúmenes |
| ST12 | Abrir Sonido, ajustar música, silenciar, cambiar pestaña | Música permite oír el ajuste; juego quieto. Silencio y pestaña oculta sí cortan audio |
| ST13 | START en mina o extra; esperar 10s; seguir | Carrito/reloj no avanzan; no salta al confirmar; el extra no gasta tiempo pausado |
| ST14 | Intentar pasar cada nivel caminando sin saltar ni atacar | Aparecen retos que exigen actuar; anotar posición de cualquier tramo demasiado plano |

## Refinamiento actual — descenso, alturas y música completa

| Caso | Qué hacer | Resultado esperado |
|---|---|---|
| Descenso | En el paso10, caminar fuera sin pulsar S; volver saltando y pulsar S/↓ | Caminar fuera no completa. Tras bajar atravesando la repisa y aterrizar, comienza NIVEL1 |
| Táctil | En el paso10 tocar la flecha inferior de la cruceta | La flecha guía apunta a Abajo y el personaje baja; no queda una dirección atascada |
| Mirador Jungle | Subir la ruta alta del primer nivel y bajar con S varias veces | Se ve el personaje y los siguientes apoyos; una pulsación baja una repisa, mantener no las atraviesa todas |
| Montaña sólida | Llegar al bloque de dos escalones después de O e intentar atravesarlo caminando/S | Hay que saltar los dos escalones; S no atraviesa roca sólida |
| Barril Ropey | Recoger/lanzar el último barril y morir/reaparecer | Reaparece apoyado sobre su repisa, no flotando en el costado; se alcanza desde el piso inferior |
| Enemigos | Intentar pisar abeja y después alcanzarla con barril; observar dos saltos del lagarto | Abeja peligrosa al contacto pero derrotada por barril; lagarto más rápido con ventana visible en suelo |
| Música | Escuchar un nivel durante55s sin cambiar de pantalla | Se oye también la sección posterior del sample, volumen moderado, repetición sobre51,334s sin espera larga |
| Lanzamiento | Dar el juego por listo para compartir públicamente | Detener publicación hasta revisar ANTES_DE_PUBLICAR.txt y aprobar seguridad/destino/archivos |

## A. Encendido, portada y sonido

| # | Qué hacer | Debería pasar | Fallo si… |
|---|---|---|---|
| A1 | Abrir la página y no tocar nada | Consola apagada e invitación visible a tocar para comenzar; **no suena nada** | Se enciende o suena sin gesto, o falta el aviso para comenzar |
| A2 | Primer clic o tecla de juego | Arranca el recorte de la portada; al entrar al mapa cambia | Sigue en silencio, o suenan dos pistas superpuestas |
| A3 | Portada → mapa → tutorial → niveles → bonus → celebración | Cambia el fondo según pantalla; tres niveles comparten el sample completo y tutorial/final comparten otra pista | Sigue la portada en un nivel o se mezclan dos fondos. No confundir ruidos ya grabados en una fuente con efectos reactivos del juego |
| A4 | Morir varias veces seguidas en un nivel | La música **sigue** sin volver a empezar | La música se reinicia en cada muerte o se corta |
| A5 | Pausar (Espacio) a mitad de una nota y esperar 10 s; reanudar | Todo calla en pausa y sigue desde el mismo punto | Sigue sonando en pausa, o al volver arranca desde cero |
| A6 | Cambiar de pestaña o minimizar el navegador con música; volver | Se silencia afuera y retoma al volver | Sigue sonando en otra pestaña |
| A7 | Botón del altavoz (silenciar) y volver a activar | Silencia todo al instante y vuelve igual | Quedan efectos sonando, o la música vuelve más fuerte |
| A8 | Poner música en 0 y efectos en 100; recargar la página | Se conservan los volúmenes elegidos | Vuelven a los valores de fábrica |
| A9 | Saltar muchas veces muy rápido y juntar varias bananas seguidas | Cada salto/banana suena una vez, sin saturar ni crujir | Sonido distorsionado, tardío o que "se traba" |
| A10 | Ganar un nivel | Fanfarria corta y después silencio en el resumen | La música del nivel sigue debajo del resumen |

## B. Mapa y progreso

| # | Qué hacer | Debería pasar | Fallo si… |
|---|---|---|---|
| B1 | En el mapa, intentar ir al nivel 2 sin terminar el 1 | No deja | Se puede entrar a un nivel bloqueado |
| B2 | Apretar A/D muy rápido mientras el mono camina por el sendero | Termina el camino y queda en un nodo válido | Queda entre nodos o se "teletransporta" |
| B3 | Apretar K mientras el mono todavía camina | Entra recién al llegar | Entra a un nivel distinto del elegido |
| B4 | Terminar Jungle juntando letras, repetirlo y juntar las mismas | El total no se duplica | Las bananas/letras se cuentan dos veces |
| B5 | Recargar la página a mitad de la aventura | Todo vuelve a cero (es lo esperado por ahora) | Queda un progreso a medias o un nivel desbloqueado sin terminar |
| B6 | Terminar los tres niveles y confirmar el resumen | Bonus de tres barriles, celebración y opciones «Volver al mapa» / «Volver a jugar» | Se salta el bonus, se bloquea o los botones no hacen nada |

## Bonus final — nuevos casos

| # | Qué hacer | Debería pasar | Fallo si… |
|---|---|---|---|
| BF1 | Llegar al final sin las cinco letras | Se puede jugar el bonus; no se regalan las letras faltantes | Exige BONUS completo o inventa recogidas |
| BF2 | Saltar bajo un barril y mantener A/K | Solo ese símbolo queda fijo | Sigue girando o cambia varias veces |
| BF3 | Saltar entre dos barriles o sobre uno ya fijado | Se puede aterrizar y volver a intentar | Se pierde la ronda o no deja continuar |
| BF4 | START/Espacio mientras giran; abrir Sonido | Jugador, símbolos y audio se congelan y luego continúan | Siguen girando o se elige un símbolo en pausa |
| BF5 | Fijar tres símbolos diferentes | Sin premio, pero sigue al festejo y al resumen | Exige ganar para poder salir |
| BF6 | Mapa/Esc a mitad del bonus | Mapa con los tres niveles y recogidas conservados | Reinicia la aventura o mantiene botones atascados |
| BF7 | Acabar la ronda sin tocar nada | Festejo de brazos/palmas; la música de cierre sigue sonando; menú después de 5,8 s | Silencio brusco o menú que corta el gesto |
| BF8 | Volver a jugar desde el final | Tutorial, niveles y resultado reiniciados; volumen conservado | Quedan niveles abiertos o vuelve el premio anterior |
| BF9 | En teléfono: mantener derecha y tocar A; abrir/cerrar ayuda | Mismo bonus que en teclado y liberación correcta de dedos | No salta, se mueve solo o el panel bloquea los controles |
| BF10 | Ganar el bonus (+20), volver al mapa y repetir un nivel | El bonus no vuelve a abrirse y el premio no se suma otra vez | Se juega de nuevo o suma +20 otra vez |
| BF11 | Leer la tarjeta durante más de20s antes de confirmar | Sigue esperando; los20s de juego empiezan después de confirmar y soltar A/K | Se pierde tiempo por leer o se activa un barril con la confirmación |
| BF12 | Empezar y no elegir ningún barril durante20s | «TIEMPO AGOTADO / BUEN INTENTO!», cero premio y luego final | Elige símbolos solo, regala premio o se queda bloqueado |
| BF13 | Elegir uno o dos barriles, pausar10s, abrir/cerrar Sonido y seguir | El reloj conserva el tiempo durante pausa/panel; los símbolos elegidos permanecen | Pierde tiempo en pausa o cambia una selección |
| BF14 | Agotar el tiempo, conservar partida y completar otro nivel | Va al resumen sin otra ronda; cero extra sigue siendo cero | Se reinicia el reloj del extra o se puede jugar otra vez |
| BF15 | Ver celebración y desglose con/sin premio | GANASTE, después RESULTADOS; letras BONUS y BANANAS + EXTRA = TOTAL | Dice BONUS dos veces como título, llama NIVELES a las bananas o suma mal |

## C. Tutorial

| # | Qué hacer | Debería pasar | Fallo si… |
|---|---|---|---|
| C1 | En la lección de pisar, rodar contra el enemigo en vez de pisarlo | «OTRA VEZ!» y repite solo esa lección | Se queda trabado sin enemigo |
| C2 | En la lección del barril, tirarlo hacia el lado contrario | Aparece otro barril y se puede repetir | Sin barril y sin forma de seguir |
| C3 | Pausar durante el «OTRA VEZ!» y esperar | El cartel espera congelado | Se salta el paso o se reinicia todo |
| C4 | Esc en medio del tutorial | Vuelve al mapa | Queda en pantalla negra o rompe la aventura |

## D. Teclado y foco

| # | Qué hacer | Debería pasar | Fallo si… |
|---|---|---|---|
| D1 | Mantener D y tocar A a la vez | Solo una dirección (la última) | El mono se queda quieto o tiembla |
| D2 | Correr (J) y hacer clic fuera del juego sin soltar la tecla; volver | Se pausa al perder el foco y no sigue corriendo solo | El mono sigue caminando sin tocar nada |
| D3 | Alt+Tab mientras salta | Queda congelado en el aire y retoma igual | Cae al vacío o pierde el salto al volver |
| D4 | Apretar Espacio muchas veces muy rápido | Pausa/sigue sin trabarse | El juego queda pausado sin poder salir |
| D5 | Mantener K desde el mapa al entrar al nivel | No salta al aparecer | Salta solo al empezar |

## E. Jungle

| # | Qué hacer | Debería pasar | Fallo si… |
|---|---|---|---|
| E1 | Caer en un pozo después del checkpoint | Vuelve al checkpoint con lo juntado | Vuelve al inicio o pierde las letras |
| E2 | Agarrar un barril y dejarse golpear con él en las manos | El barril vuelve a su lugar | Desaparece o queda flotando |
| E3 | Rodar y saltar justo en el borde de un pozo | Salto normal | El mono atraviesa el suelo |
| E4 | Pasar por debajo de una plataforma y saltar a través desde abajo | Se atraviesa desde abajo y se pisa desde arriba | Choca la cabeza o cae a través al estar parado |
| E5 | Saltarse una letra a propósito | La letra aparece de nuevo antes de la salida | Desaparece para siempre |

## F. Ropey (lianas)

| # | Qué hacer | Debería pasar | Fallo si… |
|---|---|---|---|
| F1 | Saltar hacia una liana sin apretar W | Se agarra sola | La atraviesa |
| F2 | Mantener S y saltar contra una liana | La deja pasar | Se agarra igual |
| F3 | Colgarse en la parte más baja de la liana que se balancea y esperar | Sigue colgado varias vueltas | Lo suelta al pozo |
| F4 | Trepar hasta arriba y soltarse sin dirección | Cae y **no** vuelve a agarrarse solo de la misma liana | Queda enganchado en un bucle |
| F5 | Soltarse con K + D mientras la liana va hacia la izquierda | Sale saltando hacia la derecha | Sale para el lado equivocado o sin salto |
| F6 | Pausar colgado y esperar | La liana queda quieta | La liana sigue moviéndose en pausa |
| F7 | Intentar agarrar la liana con un barril en las manos | No se agarra | Se agarra con el barril |
| F8 | Morir después del segundo checkpoint | Vuelve al checkpoint más avanzado | Vuelve al primero |

## G. Reptile (llantas)

| # | Qué hacer | Debería pasar | Fallo si… |
|---|---|---|---|
| G1 | Caer sobre una llanta sin apretar K | Rebote bajo | No rebota o queda parado encima |
| G2 | Caer sobre una llanta manteniendo K | Rebote alto | Rebota igual que sin K |
| G3 | Soltar K a mitad del rebote alto | Corta la subida | Sigue subiendo igual |
| G4 | Rebotar muchas veces seguidas en la misma llanta | Siempre rebota | Atraviesa la llanta o sale disparado |
| G5 | Pausar en el punto más alto del rebote | Queda congelado y sigue igual | Cae de golpe o sale volando al volver |
| G6 | Caer al pozo con la cámara mirando hacia arriba | La cámara baja y vuelve al checkpoint | Pantalla quieta en el vacío |
| G7 | Acercarse a la primera llanta (bajo S), reintentar y después llegar a las otras tres | Aviso de mantener K/A solo en la primera; misma lógica en computadora/teléfono | El aviso se repite junto a las siguientes o mueve la consola |

## Mina — ritmo y curvas

| # | Qué hacer | Debería pasar | Fallo si… |
|---|---|---|---|
| MI1 | Llegar al barril y dejar avanzar sin saltar | Entrada/disparo automáticos; primera bajada rota aterriza sola, primer hueco sí provoca caída | Pide confirmar para entrar o la bajada sin hueco exige salto |
| MI2 | Reintentar y saltar para bananas y los dos huecos | Recorrido de unos16s, curvas pronunciadas, mono visible e inclinación con el riel | Atraviesa el riel, se corta por arriba o la carcasa cambia de lugar |
| MI3 | Fallar el segundo hueco, reintentar y recoger la misma banana | Empieza desde el carrito, sin repetir la cueva ni duplicar bananas | Vuelve al inicio del nivel3, pierde lo ya recogido o duplica puntos |

## H. Salir, reiniciar y volver al mapa

| # | Qué hacer | Debería pasar | Fallo si… |
|---|---|---|---|
| H1 | Esc a mitad de un nivel | Vuelve al mapa sin guardar ese intento | Guarda las bananas del intento o se traba |
| H2 | Espacio → J → Espacio | Pregunta «¿IR AL MAPA?» y Espacio cancela | Sale sin confirmar |
| H3 | «Reiniciar esta etapa» colgado de una liana o en el aire | Empieza limpio en el inicio | Queda colgado o flotando |
| H4 | Abrir Ayuda o Sonido con Esc para cerrar | Cierra el panel y **no** sale del nivel | Sale al mapa al cerrar el panel |
| H5 | Volver al mapa justo cuando el mono muere | Mapa normal | Sonido o golpe "pegado" en el mapa |

## I. Teléfono

| # | Qué hacer | Debería pasar | Fallo si… |
|---|---|---|---|
| I1 | Mantener la cruceta derecha y tocar A con otro dedo | Corre y salta a la vez | Se cancela la dirección |
| I2 | Deslizar el dedo de derecha a abajo sin levantarlo | Cambia de dirección sin quedar trabado | El mono sigue en la primera dirección al soltar |
| I3 | Girar el teléfono a horizontal y volver | Pausa, pide girar y retoma sin perder la partida | Se reinicia o queda en negro |
| I4 | Recibir una notificación o bajar la barra mientras se mueve | Se detiene al soltar todo | El mono sigue caminando solo |
| I5 | Bloquear la pantalla y desbloquear | Pausado y sin sonido hasta tocar | Suena con la pantalla apagada |
| I6 | Tocar muy rápido A muchas veces | Saltos normales | El botón queda "hundido" |

## J. Navegador y casos raros

| # | Qué hacer | Debería pasar | Fallo si… |
|---|---|---|---|
| J1 | Zoom del navegador (Ctrl + / Ctrl −) | Se reacomoda sin cortar la pantalla | Se corta o se deforma |
| J2 | Ventana muy chica en la laptop | Sigue completa, aunque más pequeña | Botones fuera de pantalla |
| J3 | Modo ahorro de batería o muchas pestañas abiertas (va más lento) | El juego va igual de rápido, aunque con saltos de imagen | El mono se mueve en cámara lenta o salta distinto |
| J4 | Abrir el juego en dos pestañas a la vez | Cada una funciona por separado | Una controla a la otra o suenan las dos |
| J5 | Ventana privada / incógnito | Se juega; los volúmenes pueden no guardarse (aviso) | No carga o no suena |

## Plantilla para reportar un fallo

```
Caso: (ej. F4)
Dispositivo y navegador: (ej. iPhone 13 / Safari)
Qué hice exactamente, paso a paso:
Qué esperaba:
Qué pasó:
¿Se repite siempre? sí / a veces / una vez
Captura o video: (si se puede)
```

Lo más útil es el **paso a paso exacto**: con eso se puede convertir el fallo en una prueba automática para que no vuelva a pasar.

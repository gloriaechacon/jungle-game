# Ajuste visual de lianas — 29/09/2026

Pedido vigente: conservar caminar y rodar actuales; aclarar ligeramente máscara facial y cejas fruncidas. Corregir pose de liana y darle volumen/vegetación. No ampliar niveles ni iniciar fase 10.

Referencias revisadas: láminas 07-cuerda-balanceo-FUTURO y 08-cuerda-vertical-FUTURO de docs/sprites-para-redibujar/00-SELECCION-PARA-DIBUJAR. Cuerpo a un lado, manos escalonadas, piernas flexionadas.

Se reemplaza la pose provisional de cargar barril por cuatro poses propias. La animación sigue desplazamiento vertical, se detiene al estar quieto y revierte al bajar. El punto entre las manos se alinea con la pendiente de la liana; inclinación y desplazamiento son visuales, no cambian colisiones. Al soltar se restablecen origen, orientación y ángulo normales.

Liana con contorno oscuro, núcleo cálido, luz lateral y hojas espaciadas. Sin modificar controles, balanceo, límites de trepa, geometría ni B-01. Cara algo más clara; cejas en V; caminar/rodar conservan sus poses.

Lámina generada: docs/art/dk-climb-cycle.png. Aprobación estética pendiente del usuario.

Verificación: regeneración de arte, compilación y suite unitaria PASS. Pruebas nuevas: cuatro poses distintas, manos alineadas fuera de la cara, pose dedicada y pausa de animación. Recorrido completo de Ropey PASS en Edge 154.0.4258.37 / Windows, sin errores de ejecución; trepa, cámara, agarre en salto, balanceo completo, pausa/foco, salida de cuerda, checkpoint, salida y reinicio. Hash B-01 intacto. No se volvió a ejecutar toda la aventura de tres niveles en este ajuste.

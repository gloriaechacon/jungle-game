/** Presentation labels only: logical A/B actions and B-01 remain unchanged. */
export function controlText(text:string,touch:boolean) {
  if(!touch)return text;
  return text.replace(/A\s*\/\s*D/g,'IZQ/DER')
    .replace(/W\s*\/\s*S/g,'ARRIBA/ABAJO')
    .replace(/\bESPACIO\b/gi,'START').replace(/\bEsc\b/gi,'MAPA')
    .replace(/\bK\b/g,'A').replace(/\bJ\b/g,'B')
    .replace(/\bW\b/g,'ARRIBA').replace(/\bS\b/g,'ABAJO').replace(/\bD\b/g,'DER');
}

export const TOUCH_LESSONS = [
  ['MANTEN FLECHA DERECHA','PARA CAMINAR'],
  ['TOCA A PARA SALTAR','MANTEN A: MAS ALTO'],
  ['TOCA EL BOTON B','PARA RODAR'],
  ['MANTEN DERECHA Y B','A LA VEZ PARA CORRER'],
  ['MANTEN DER Y TOCA A','SALTA SOBRE EL RIVAL','CAE ENCIMA Y VENCELO'],
  ['ACERCATE AL RIVAL','TOCA B PARA RODAR'],
  ['ACERCATE AL BARRIL','CON FLECHA DERECHA'],
  ['SALTA A LA LLANTA','MANTEN EL BOTON A'],
  ['MANTEN FLECHA ARRIBA','PARA AGARRAR Y SUBIR'],
  ['TOCA LA FLECHA ABAJO','PARA BAJAR LA REPISA'],
] as const;

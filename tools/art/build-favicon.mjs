// Reuse the game's first banana frame; never redraw or modify the sprite atlas.
// Run independently with `npm run art:icon`, or as part of `npm run art`.
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Pix } from './pixel.mjs';
import { banana } from './props.mjs';

const sprite = banana[0], bounds = sprite.bbox();
const icon = new Pix(16, 16);
icon.blit(sprite,
  Math.floor((icon.w - bounds.w) / 2) - bounds.x,
  Math.floor((icon.h - bounds.h) / 2) - bounds.y);
const assets = new URL('../../public/assets/', import.meta.url);
mkdirSync(assets, { recursive: true });
icon.scaled(2).save(fileURLToPath(new URL('going-bananas-icon.png', assets)));
console.log('favicon: Going Bananas, original banana sprite, transparent 32x32 PNG');

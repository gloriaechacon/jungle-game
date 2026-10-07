import Phaser from 'phaser';
import type { RopeData } from './jungle-layout';
import { ropeX } from './ropes';
import { ATLAS, DEPTH } from './art-spec';

// Presentation of Ropey's vines (post-Phase 9 visual pass): a twisted woody strand
// lit from the upper left, leaves along it, a leafy tuft where it comes out of the
// canopy and a curled tip as the last hand-hold. Reads rope state only; never
// writes to physics or rules. Depth: strand 3 (DK's body hangs just behind it,
// his hands are drawn in front), tuft over the canopy.
const C = { K: 0x12190a, lit: 0xa3b050, mid: 0x6f7e32, dark: 0x44531f, twist: 0x2c3814, gloss: 0xd0da86 };
export const VINE_DEPTH = { strand: 3, leaves: 3.05, tuft: DEPTH.canopy + 0.1 };

export class RopeView {
  private g: Phaser.GameObjects.Graphics;
  private parts: { leaves: { img: Phaser.GameObjects.Image; y: number; side: number }[]; tuft: Phaser.GameObjects.Image; tip: Phaser.GameObjects.Image }[];

  private scene: Phaser.Scene;
  private ropes: readonly RopeData[];
  private canopyEdge: number;

  constructor(scene: Phaser.Scene, ropes: readonly RopeData[], canopyEdge: number) {
    this.scene = scene; this.ropes = ropes; this.canopyEdge = canopyEdge;
    this.g = scene.add.graphics().setDepth(VINE_DEPTH.strand);
    this.parts = ropes.map((r, ri) => {
      const from = Math.max(r.top, canopyEdge) + 12;
      const leaves: { img: Phaser.GameObjects.Image; y: number; side: number }[] = [];
      for (let y = from, k = 0; y < r.bottom - 10; y += 17, k++) {
        const side = (k + ri) % 2 ? 1 : -1;
        leaves.push({ img: scene.add.image(0, 0, ATLAS, 'vine-leaf').setOrigin(side < 0 ? 1 : 0, 2 / 6).setFlipX(side < 0).setDepth(VINE_DEPTH.leaves), y, side });
      }
      return {
        leaves,
        tuft: scene.add.image(0, 0, ATLAS, 'vine-tuft').setOrigin(17 / 34, 14 / 18).setDepth(VINE_DEPTH.tuft),
        tip: scene.add.image(0, 0, ATLAS, 'vine-tip').setOrigin(5 / 11, 1 / 9).setDepth(VINE_DEPTH.leaves),
      };
    });
  }

  render(now: number, visible: boolean) {
    const g = this.g.clear(), cam = this.scene.cameras.main;
    this.ropes.forEach((r, i) => {
      const p = this.parts[i];
      const near = Math.abs(r.x - (cam.scrollX + 80)) < 160;
      p.leaves.forEach(l => l.img.setVisible(visible && near));
      p.tuft.setVisible(visible && near); p.tip.setVisible(visible && near);
      if (!near || !visible) return;
      const top = Math.max(r.top, cam.scrollY - 2, this.canopyEdge - 6);
      for (let y = Math.floor(top); y <= r.bottom; y++) {
        const cx = Math.round(ropeX(r, y, now));
        const t = (y - r.top) % 6;                     // twisted strands: a dark groove winds across
        g.fillStyle(C.K).fillRect(cx - 2, y, 1, 1).fillRect(cx + 2, y, 1, 1);
        g.fillStyle(C.lit).fillRect(cx - 1, y, 1, 1);
        g.fillStyle(C.mid).fillRect(cx, y, 1, 1);
        g.fillStyle(C.dark).fillRect(cx + 1, y, 1, 1);
        const groove = cx - 1 + Math.floor(t / 2);
        g.fillStyle(C.twist).fillRect(groove, y, 1, 1);
        if (t === 0) g.fillStyle(C.gloss).fillRect(cx - 1, y, 1, 1);
      }
      p.tuft.setPosition(Math.round(ropeX(r, this.canopyEdge, now)), this.canopyEdge + 1);
      p.tip.setPosition(Math.round(ropeX(r, r.bottom, now)), r.bottom);
      for (const l of p.leaves) l.img.setPosition(Math.round(ropeX(r, l.y, now)) + (l.side > 0 ? 2 : -2), l.y);
    });
  }
}

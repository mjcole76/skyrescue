import * as THREE from 'three';

export class Minimap {
  constructor() {
    const canvas = document.getElementById('minimap');
    this.ctx = canvas.getContext('2d');
    this.width = 150;
    this.height = 150;
    this.scale = 0.6;
    this._frame = 0;
  }

  update(helicopter, buildings, survivors, hospitalPos) {
    const ctx = this.ctx;
    const w = this.width, h = this.height;
    const scale = this.scale;
    const cx = w / 2, cy = h / 2;
    const px = helicopter.position.x;
    const pz = helicopter.position.z;
    this._frame++;

    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(0, 0, w, h);

    // Buildings
    ctx.fillStyle = '#444';
    for (let i = 0; i < buildings.length; i++) {
      const b = buildings[i];
      const bx = cx + (b.bounds.x - px) * scale;
      const by = cy + (b.bounds.z - pz) * scale;
      const bw = b.bounds.w * scale;
      const bd = b.bounds.d * scale;
      ctx.fillRect(bx - bw / 2, by - bd / 2, bw, bd);
    }

    // Hospital pad — large pulsing green cross + ring
    if (hospitalPos) {
      const hpx = cx + (hospitalPos.x - px) * scale;
      const hpy = cy + (hospitalPos.z - pz) * scale;
      const pulse = Math.sin(this._frame * 0.08) * 0.3 + 0.7;

      // Outer pulsing ring
      ctx.strokeStyle = `rgba(0, 255, 68, ${pulse * 0.6})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(hpx, hpy, 8 + pulse * 3, 0, Math.PI * 2);
      ctx.stroke();

      // Filled circle
      ctx.fillStyle = `rgba(0, 255, 68, ${pulse * 0.8})`;
      ctx.beginPath();
      ctx.arc(hpx, hpy, 5, 0, Math.PI * 2);
      ctx.fill();

      // H cross
      ctx.fillStyle = '#fff';
      ctx.fillRect(hpx - 3, hpy - 1, 6, 2);
      ctx.fillRect(hpx - 1, hpy - 3, 2, 6);
    }

    // Survivors
    ctx.fillStyle = '#ffaa00';
    for (let i = 0; i < survivors.length; i++) {
      const s = survivors[i];
      if (s.userData.rescued) continue;
      const sx = cx + (s.position.x - px) * scale;
      const sy = cy + (s.position.z - pz) * scale;
      ctx.beginPath();
      ctx.arc(sx, sy, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Player
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(cx, cy, 3, 0, Math.PI * 2);
    ctx.fill();

    // Direction indicator
    const dir = new THREE.Vector3(0, 0, 1).applyQuaternion(helicopter.quaternion);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + dir.x * 8, cy + dir.z * 8);
    ctx.stroke();
  }
}

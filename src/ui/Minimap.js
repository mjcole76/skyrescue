import * as THREE from 'three';

export class Minimap {
  constructor() {
    const canvas = document.getElementById('minimap');
    this.ctx = canvas.getContext('2d');
    this.width = 150;
    this.height = 150;
    this.scale = 0.6;
  }

  update(helicopter, buildings, survivors) {
    const ctx = this.ctx;
    const w = this.width, h = this.height;
    const scale = this.scale;
    const cx = w / 2, cy = h / 2;
    const px = helicopter.position.x;
    const pz = helicopter.position.z;

    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.fillRect(0, 0, w, h);

    // Buildings
    buildings.forEach(b => {
      const bx = cx + (b.bounds.x - px) * scale;
      const by = cy + (b.bounds.z - pz) * scale;
      const bw = b.bounds.w * scale;
      const bd = b.bounds.d * scale;
      ctx.fillStyle = '#444';
      ctx.fillRect(bx - bw / 2, by - bd / 2, bw, bd);
    });

    // Burning building
    ctx.fillStyle = '#ff4400';
    const bbx = cx + (0 - px) * scale;
    const bby = cy + (0 - pz) * scale;
    ctx.fillRect(bbx - 6, bby - 6, 12, 12);

    // Hospital
    ctx.fillStyle = '#00ff44';
    const hpx = cx + (75 - px) * scale;
    const hpy = cy + (-60 - pz) * scale;
    ctx.beginPath();
    ctx.arc(hpx, hpy, 4, 0, Math.PI * 2);
    ctx.fill();

    // Survivors
    survivors.forEach(s => {
      if (s.userData.rescued) return;
      ctx.fillStyle = '#ffaa00';
      const sx = cx + (s.position.x - px) * scale;
      const sy = cy + (s.position.z - pz) * scale;
      ctx.beginPath();
      ctx.arc(sx, sy, 2, 0, Math.PI * 2);
      ctx.fill();
    });

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

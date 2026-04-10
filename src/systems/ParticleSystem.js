import * as THREE from 'three';

export class ParticleSystem {
  constructor(scene) {
    this.scene = scene;
    this.smokeParticles = [];
    this.fireParticles = [];
    this.emberParticles = [];
    this.fireLights = [];

    this._createFireLights();
    this._createSmoke();
    this._createFire();
    this._createEmbers();
  }

  _createFireLights() {
    // Multiple fire lights for richer illumination
    const configs = [
      { color: 0xff6600, intensity: 4, distance: 70, pos: [0, 25, 0] },
      { color: 0xff3300, intensity: 3, distance: 55, pos: [5, 20, 5] },
      { color: 0xff4400, intensity: 2.5, distance: 50, pos: [-4, 28, -3] },
      { color: 0xffaa22, intensity: 1.5, distance: 40, pos: [3, 32, 2] },
    ];

    configs.forEach(cfg => {
      const light = new THREE.PointLight(cfg.color, cfg.intensity, cfg.distance);
      light.position.set(...cfg.pos);
      this.scene.add(light);
      this.fireLights.push(light);
    });
  }

  _createSmoke() {
    const smokeGroup = new THREE.Group();
    this.scene.add(smokeGroup);

    for (let i = 0; i < 80; i++) {
      const size = 3 + Math.random() * 6;
      const geo = new THREE.PlaneGeometry(size, size);

      // Vary smoke color from dark grey to brownish
      const shade = 0.08 + Math.random() * 0.08;
      const color = new THREE.Color(shade, shade * 0.9, shade * 0.8);
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.25,
        depthWrite: false,
        side: THREE.DoubleSide,
      });

      const smoke = new THREE.Mesh(geo, mat);
      smoke.position.set(
        (Math.random() - 0.5) * 16,
        28 + Math.random() * 45,
        (Math.random() - 0.5) * 16
      );
      smoke.userData = {
        vy: 1.5 + Math.random() * 3,
        vx: (Math.random() - 0.5) * 1.2,
        vz: (Math.random() - 0.5) * 0.5,
        windDrift: 0.3 + Math.random() * 0.6,  // Smoke drifts with wind
        baseY: 26,
        maxY: 80,
        rotSpeed: (Math.random() - 0.5) * 0.4,
        baseOpacity: 0.12 + Math.random() * 0.18,
        baseSize: size,
        phase: Math.random() * Math.PI * 2,
      };
      smokeGroup.add(smoke);
      this.smokeParticles.push(smoke);
    }
  }

  _createFire() {
    const fireGroup = new THREE.Group();
    this.scene.add(fireGroup);

    for (let i = 0; i < 45; i++) {
      const size = 0.5 + Math.random() * 2;
      const geo = new THREE.PlaneGeometry(size, size * 1.8);

      // Richer fire colors
      const colors = [0xff6600, 0xff3300, 0xff8800, 0xffaa00, 0xff2200, 0xffcc44];
      const color = colors[Math.floor(Math.random() * colors.length)];

      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const fire = new THREE.Mesh(geo, mat);

      // Spread fire across building face
      const spread = 18;
      fire.position.set(
        (Math.random() - 0.5) * spread,
        24 + Math.random() * 8,
        (Math.random() - 0.5) * spread
      );
      fire.userData = {
        vy: 1.5 + Math.random() * 3,
        vx: (Math.random() - 0.5) * 1,
        baseY: 24,
        maxY: 34,
        flicker: Math.random() * Math.PI * 2,
        flickerSpeed: 4 + Math.random() * 8,
        scaleBase: 0.6 + Math.random() * 0.6,
      };
      fireGroup.add(fire);
      this.fireParticles.push(fire);
    }
  }

  _createEmbers() {
    const emberGroup = new THREE.Group();
    this.scene.add(emberGroup);

    const emberGeo = new THREE.PlaneGeometry(0.15, 0.15);

    for (let i = 0; i < 60; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: Math.random() > 0.5 ? 0xff8800 : 0xffcc44,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      });
      const ember = new THREE.Mesh(emberGeo, mat);
      ember.position.set(
        (Math.random() - 0.5) * 14,
        26 + Math.random() * 20,
        (Math.random() - 0.5) * 14
      );
      ember.userData = {
        vy: 3 + Math.random() * 5,
        vx: (Math.random() - 0.5) * 3,
        vz: (Math.random() - 0.5) * 3,
        baseY: 24,
        maxY: 70,
        twinkle: Math.random() * Math.PI * 2,
        twinkleSpeed: 5 + Math.random() * 10,
        life: Math.random(),
      };
      emberGroup.add(ember);
      this.emberParticles.push(ember);
    }
  }

  update(dt, elapsedTime, camera, heliPos) {
    const windX = Math.sin(elapsedTime * 0.3) * 0.5 + 0.3;
    this._frame = (this._frame || 0) + 1;

    // ── Smoke ──
    for (let i = 0; i < this.smokeParticles.length; i++) {
      const s = this.smokeParticles[i];
      s.position.y += s.userData.vy * dt;
      s.position.x += (s.userData.vx + windX * s.userData.windDrift) * dt;
      s.position.z += s.userData.vz * dt;
      s.rotation.z += s.userData.rotSpeed * dt;
      // Only face camera every 3rd frame, staggered per particle
      if ((this._frame + i) % 3 === 0) s.lookAt(camera.position);

      // Rotor downwash — push smoke away when helicopter is close
      if (heliPos) {
        const dx = s.position.x - heliPos.x;
        const dz = s.position.z - heliPos.z;
        const dy = s.position.y - heliPos.y;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < 15 && dist > 0.1) {
          const pushForce = (1 - dist / 15) * 8 * dt;
          s.position.x += (dx / dist) * pushForce;
          s.position.z += (dz / dist) * pushForce;
          s.position.y += Math.abs(dy / dist) * pushForce * 0.3;
        }
      }

      if (s.position.y > s.userData.maxY) {
        s.position.y = s.userData.baseY + Math.random() * 4;
        s.position.x = (Math.random() - 0.5) * 16;
        s.position.z = (Math.random() - 0.5) * 16;
      }

      const t = (s.position.y - s.userData.baseY) / (s.userData.maxY - s.userData.baseY);
      s.material.opacity = s.userData.baseOpacity * (1 - t * 0.85);
      // Smoke expands as it rises
      const scale = 1 + t * 3;
      s.scale.setScalar(scale);
    }

    // ── Fire ──
    for (let i = 0; i < this.fireParticles.length; i++) {
      const f = this.fireParticles[i];
      f.position.y += f.userData.vy * dt;
      f.position.x += f.userData.vx * dt;
      if ((this._frame + i) % 3 === 0) f.lookAt(camera.position);

      if (f.position.y > f.userData.maxY) {
        f.position.y = f.userData.baseY + Math.random() * 2;
        f.position.x = (Math.random() - 0.5) * 18;
        f.position.z = (Math.random() - 0.5) * 18;
      }

      const flicker = Math.sin(elapsedTime * f.userData.flickerSpeed + f.userData.flicker);
      const flicker2 = Math.sin(elapsedTime * f.userData.flickerSpeed * 1.7 + f.userData.flicker * 2);
      f.material.opacity = 0.5 + flicker * 0.3 + flicker2 * 0.15;
      f.scale.setScalar(f.userData.scaleBase + flicker * 0.3);
    }

    // ── Embers ──
    for (let i = 0; i < this.emberParticles.length; i++) {
      const e = this.emberParticles[i];
      e.position.y += e.userData.vy * dt;
      e.position.x += (e.userData.vx + windX * 2) * dt;
      e.position.z += e.userData.vz * dt;

      // Wobble
      e.position.x += Math.sin(elapsedTime * 3 + e.userData.twinkle) * 0.5 * dt;
      e.position.z += Math.cos(elapsedTime * 2.5 + e.userData.twinkle) * 0.5 * dt;

      if (e.position.y > e.userData.maxY) {
        e.position.y = e.userData.baseY + Math.random() * 4;
        e.position.x = (Math.random() - 0.5) * 14;
        e.position.z = (Math.random() - 0.5) * 14;
      }

      // Twinkle
      const twinkle = Math.sin(elapsedTime * e.userData.twinkleSpeed + e.userData.twinkle);
      e.material.opacity = 0.4 + twinkle * 0.5;
      if ((this._frame + i) % 4 === 0) e.lookAt(camera.position);
    }

    // ── Fire lights flicker ──
    const f1 = Math.sin(elapsedTime * 7) * 1.2 + Math.sin(elapsedTime * 13) * 0.6;
    const f2 = Math.sin(elapsedTime * 9 + 1) * 0.9 + Math.sin(elapsedTime * 11) * 0.5;
    this.fireLights[0].intensity = 3.5 + f1;
    this.fireLights[1].intensity = 2.5 + f2;
    this.fireLights[2].intensity = 2 + Math.sin(elapsedTime * 5.5 + 2) * 1;
    this.fireLights[3].intensity = 1.5 + Math.sin(elapsedTime * 8 + 3) * 0.8;

    // Animate light positions slightly
    this.fireLights[0].position.y = 25 + Math.sin(elapsedTime * 3) * 2;
    this.fireLights[1].position.x = 5 + Math.sin(elapsedTime * 2) * 2;
  }
}

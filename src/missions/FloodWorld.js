import * as THREE from 'three';

export class FloodWorld {
  constructor(scene) {
    this.scene = scene;
    this.buildings = [];
    this.survivors = [];
    this.waterLevel = 0.5;
    this._waterMesh = null;
    this._rainParticles = [];
    this._debris = [];
    this._lightning = null;
    this._lightningTimer = 0;
  }

  build() {
    this._createGround();
    this._createHouses();
    this._createWater();
    this._createSurvivors();
    this._createRain();
    this._createDebris();
    this._createLightning();
    return { buildings: this.buildings, survivors: this.survivors };
  }

  _createGround() {
    const geo = new THREE.PlaneGeometry(300, 300);
    const mat = new THREE.MeshStandardMaterial({ color: 0x554433, roughness: 0.9 });
    const ground = new THREE.Mesh(geo, mat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  _createHouses() {
    const houseDefs = [
      { x: -30, z: -20, w: 8, h: 6, d: 10, color: 0x886655, roofColor: 0x553322 },
      { x: 20, z: -35, w: 10, h: 5, d: 8, color: 0x778866, roofColor: 0x445533 },
      { x: -15, z: 25, w: 9, h: 7, d: 9, color: 0x887766, roofColor: 0x664433 },
      { x: 35, z: 15, w: 8, h: 5.5, d: 10, color: 0x776655, roofColor: 0x554422 },
      { x: -40, z: 40, w: 10, h: 6, d: 8, color: 0x888877, roofColor: 0x555544 },
      { x: 45, z: -10, w: 7, h: 5, d: 9, color: 0x887755, roofColor: 0x665533 },
      { x: 0, z: -50, w: 12, h: 7, d: 10, color: 0x998877, roofColor: 0x665544 },
      { x: -50, z: -5, w: 8, h: 5.5, d: 8, color: 0x776666, roofColor: 0x554444 },
    ];

    houseDefs.forEach(def => {
      const group = new THREE.Group();

      // Walls
      const walls = new THREE.Mesh(
        new THREE.BoxGeometry(def.w, def.h, def.d),
        new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.8 })
      );
      walls.position.y = def.h / 2;
      walls.castShadow = true;
      walls.receiveShadow = true;
      group.add(walls);

      // Pitched roof
      const roofGeo = new THREE.ConeGeometry(Math.max(def.w, def.d) * 0.6, 3, 4);
      roofGeo.rotateY(Math.PI / 4);
      const roof = new THREE.Mesh(roofGeo,
        new THREE.MeshStandardMaterial({ color: def.roofColor, roughness: 0.85 })
      );
      roof.position.y = def.h + 1.5;
      roof.castShadow = true;
      group.add(roof);

      // Windows
      const winMat = new THREE.MeshBasicMaterial({ color: 0xeedd88 });
      [[-1, 1], [1, 1]].forEach(([wx]) => {
        const win = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.5), winMat);
        win.position.set(wx * 2, def.h * 0.55, def.d / 2 + 0.05);
        group.add(win);
      });

      group.position.set(def.x, 0, def.z);
      this.scene.add(group);

      this.buildings.push({
        mesh: group,
        bounds: { x: def.x, z: def.z, w: def.w + 2, d: def.d + 2, h: def.h + 4 }
      });
    });
  }

  _createWater() {
    const waterGeo = new THREE.PlaneGeometry(300, 300, 40, 40);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x334455,
      roughness: 0.2,
      metalness: 0.3,
      transparent: true,
      opacity: 0.75,
    });
    this._waterMesh = new THREE.Mesh(waterGeo, waterMat);
    this._waterMesh.rotation.x = -Math.PI / 2;
    this._waterMesh.position.y = this.waterLevel;
    this.scene.add(this._waterMesh);
  }

  _createSurvivors() {
    const RESCUE = { HOVER_RADIUS: 6 };
    const positions = [
      { x: -30, z: -20, h: 6 },
      { x: 20, z: -35, h: 5 },
      { x: -15, z: 25, h: 7 },
      { x: 35, z: 15, h: 5.5 },
      { x: -40, z: 40, h: 6 },
      { x: 0, z: -50, h: 7 },
    ];
    const colors = [0xff8800, 0x44aaff, 0xff4488, 0x88ff44, 0xffff44, 0xff44ff];

    positions.forEach((pos, i) => {
      const group = new THREE.Group();
      const bodyMat = new THREE.MeshStandardMaterial({ color: colors[i], roughness: 0.6 });

      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.25, 1, 8), bodyMat);
      body.position.y = 0.7;
      group.add(body);

      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.25, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xffcc99 })
      );
      head.position.y = 1.45;
      group.add(head);

      const arm1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.6, 0.12), bodyMat);
      arm1.position.set(-0.4, 1.2, 0);
      arm1.rotation.z = -0.5;
      group.add(arm1);
      const arm2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.6, 0.12), bodyMat);
      arm2.position.set(0.4, 1.2, 0);
      arm2.rotation.z = 0.5;
      group.add(arm2);

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(RESCUE.HOVER_RADIUS - 0.3, RESCUE.HOVER_RADIUS, 32),
        new THREE.MeshBasicMaterial({ color: 0xffaa00, side: THREE.DoubleSide, transparent: true, opacity: 0.5 })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.15;
      group.add(ring);

      const innerRing = new THREE.Mesh(
        new THREE.RingGeometry(0.5, 0.8, 16),
        new THREE.MeshBasicMaterial({ color: 0xffcc00, side: THREE.DoubleSide, transparent: true, opacity: 0.6 })
      );
      innerRing.rotation.x = -Math.PI / 2;
      innerRing.position.y = 0.2;
      group.add(innerRing);

      const beacon = new THREE.PointLight(0xffaa00, 2, 20);
      beacon.position.y = 2;
      group.add(beacon);

      const flareMat = new THREE.MeshBasicMaterial({
        color: 0xff4400, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false
      });
      const flare1 = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 12), flareMat.clone());
      flare1.position.y = 7;
      group.add(flare1);
      const flare2 = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 12), flareMat.clone());
      flare2.position.y = 7;
      flare2.rotation.y = Math.PI / 2;
      group.add(flare2);

      const flareLight = new THREE.PointLight(0xff4400, 1.5, 25);
      flareLight.position.y = 5;
      group.add(flareLight);

      // On rooftop
      group.position.set(pos.x, pos.h + 3.5, pos.z);
      group.userData = {
        rescued: false, index: i, arms: [arm1, arm2],
        beacon, ring, innerRing, flare1, flare2, flareLight,
        baseY: pos.h + 3.5,
        houseHeight: pos.h,
      };
      this.scene.add(group);
      this.survivors.push(group);
    });
  }

  _createRain() {
    const rainCount = 2000;
    const positions = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 200;
      positions[i * 3 + 1] = Math.random() * 80;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 200;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0x8899bb,
      size: 0.15,
      transparent: true,
      opacity: 0.5,
    });
    this._rainPoints = new THREE.Points(geo, mat);
    this.scene.add(this._rainPoints);
  }

  _createDebris() {
    const debrisMat = new THREE.MeshStandardMaterial({ color: 0x665544, roughness: 0.9 });
    const carMat = new THREE.MeshStandardMaterial({ color: 0x556677, roughness: 0.6 });

    for (let i = 0; i < 15; i++) {
      const iscar = Math.random() > 0.6;
      const w = iscar ? 1.8 : 1 + Math.random() * 2;
      const h = iscar ? 1.2 : 0.5 + Math.random();
      const d = iscar ? 3.5 : 1 + Math.random() * 2;

      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(w, h, d),
        iscar ? carMat : debrisMat
      );
      mesh.position.set(
        (Math.random() - 0.5) * 120,
        0.5, // Will be updated to float on water
        (Math.random() - 0.5) * 120
      );
      mesh.rotation.y = Math.random() * Math.PI * 2;
      mesh.userData = {
        driftX: (Math.random() - 0.5) * 0.5,
        driftZ: (Math.random() - 0.5) * 0.5,
        bobPhase: Math.random() * Math.PI * 2,
      };
      this.scene.add(mesh);
      this._debris.push(mesh);
    }
  }

  _createLightning() {
    this._lightning = new THREE.PointLight(0xccddff, 0, 500);
    this._lightning.position.set(0, 80, 0);
    this.scene.add(this._lightning);
  }

  update(dt, helicopter, elapsedTime) {
    // Rising water
    this.waterLevel += 0.4 * dt;
    if (this._waterMesh) {
      this._waterMesh.position.y = this.waterLevel;

      // Wave animation
      const pos = this._waterMesh.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        const wave = Math.sin(x * 0.1 + elapsedTime * 2) * 0.3 +
                     Math.sin(z * 0.08 + elapsedTime * 1.5) * 0.2;
        pos.setY(i, wave);
      }
      pos.needsUpdate = true;
    }

    // Check if survivors are submerged
    this.survivors.forEach(s => {
      if (s.userData.rescued) return;
      if (this.waterLevel > s.userData.houseHeight + 2) {
        // Survivor lost to flooding
        s.userData.rescued = true; // Mark as gone
        s.visible = false;
      }
    });

    // Rain animation
    if (this._rainPoints) {
      const pos = this._rainPoints.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i);
        y -= 40 * dt;
        if (y < this.waterLevel) {
          y = 60 + Math.random() * 20;
          pos.setX(i, (Math.random() - 0.5) * 200);
          pos.setZ(i, (Math.random() - 0.5) * 200);
        }
        pos.setY(i, y);
      }
      pos.needsUpdate = true;
    }

    // Debris floats on water
    this._debris.forEach(d => {
      d.position.y = this.waterLevel + 0.1 + Math.sin(elapsedTime * 1.5 + d.userData.bobPhase) * 0.2;
      d.position.x += d.userData.driftX * dt;
      d.position.z += d.userData.driftZ * dt;
      d.rotation.y += 0.1 * dt;
    });

    // Lightning flashes
    this._lightningTimer -= dt;
    if (this._lightningTimer <= 0) {
      this._lightningTimer = 5 + Math.random() * 15;
      this._lightning.intensity = 5;
    }
    if (this._lightning.intensity > 0) {
      this._lightning.intensity *= (1 - 8 * dt);
      if (this._lightning.intensity < 0.01) this._lightning.intensity = 0;
    }
  }

  getHelipadPosition() {
    return new THREE.Vector3(70, 8, -55);
  }
}

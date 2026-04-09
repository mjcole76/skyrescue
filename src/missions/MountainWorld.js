import * as THREE from 'three';

export class MountainWorld {
  constructor(scene) {
    this.scene = scene;
    this.buildings = [];
    this.survivors = [];
    this.windForce = new THREE.Vector3();
    this.windTimer = 0;
    this.windInterval = 10;
    this.fogDensity = 0.003;
    this._fog = null;
    this._windArrow = null;
  }

  build() {
    this._createTerrain();
    this._createCliffs();
    this._createSurvivors();
    this._createTrees();
    this._setupFog();
    this._createWindIndicator();
    return { buildings: this.buildings, survivors: this.survivors };
  }

  _createTerrain() {
    // Heightmap terrain using PlaneGeometry with vertex displacement
    const size = 300;
    const segments = 80;
    const geo = new THREE.PlaneGeometry(size, size, segments, segments);
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);

      // Mountain terrain: multiple octaves of noise-like function
      let h = 0;
      h += Math.sin(x * 0.02) * Math.cos(z * 0.015) * 25;
      h += Math.sin(x * 0.05 + 1) * Math.cos(z * 0.04 + 2) * 12;
      h += Math.sin(x * 0.1 + 3) * Math.cos(z * 0.08) * 5;

      // Central valley (play area is lower)
      const distFromCenter = Math.sqrt(x * x + z * z);
      const valleyFactor = Math.max(0, 1 - distFromCenter / 80);
      h *= (1 - valleyFactor * 0.7);

      // Raise edges to form mountain ring
      if (distFromCenter > 60) {
        h += (distFromCenter - 60) * 0.5;
      }

      pos.setY(i, h);
    }
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      color: 0x556644,
      roughness: 0.9,
      flatShading: true,
    });
    const terrain = new THREE.Mesh(geo, mat);
    terrain.receiveShadow = true;
    terrain.castShadow = true;
    this.scene.add(terrain);

    // Snow-capped peaks (white patches at high altitudes)
    const snowGeo = new THREE.PlaneGeometry(size, size, segments, segments);
    snowGeo.rotateX(-Math.PI / 2);
    const snowPos = snowGeo.attributes.position;
    for (let i = 0; i < snowPos.count; i++) {
      snowPos.setX(i, pos.getX(i));
      snowPos.setY(i, pos.getY(i) + 0.2);
      snowPos.setZ(i, pos.getZ(i));
    }
    snowGeo.computeVertexNormals();

    const snowMat = new THREE.MeshStandardMaterial({
      color: 0xeeeeff,
      roughness: 0.7,
      flatShading: true,
      transparent: true,
    });

    // Only show snow above certain height via vertex colors
    const colors = new Float32Array(snowPos.count * 3);
    for (let i = 0; i < snowPos.count; i++) {
      const y = snowPos.getY(i);
      const alpha = y > 15 ? Math.min(1, (y - 15) / 10) : 0;
      colors[i * 3] = alpha;
      colors[i * 3 + 1] = alpha;
      colors[i * 3 + 2] = alpha;
    }
    snowGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    snowMat.vertexColors = true;

    const snow = new THREE.Mesh(snowGeo, snowMat);
    this.scene.add(snow);
  }

  _createCliffs() {
    // Rock outcrops as collision objects and landing platforms
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x776655, roughness: 0.95, flatShading: true });
    const rockDefs = [
      { x: -20, z: -25, w: 12, h: 20, d: 10 },
      { x: 30, z: 15, w: 10, h: 25, d: 12 },
      { x: -35, z: 30, w: 14, h: 18, d: 10 },
      { x: 15, z: -40, w: 10, h: 22, d: 14 },
      { x: -10, z: 45, w: 12, h: 15, d: 10 },
      { x: 40, z: -20, w: 8, h: 28, d: 10 },
    ];

    rockDefs.forEach(def => {
      // Irregular rock shape using dodecahedron
      const geo = new THREE.DodecahedronGeometry(def.h / 2, 1);
      geo.scale(def.w / def.h, 1, def.d / def.h);
      const rock = new THREE.Mesh(geo, rockMat);
      rock.position.set(def.x, def.h * 0.35, def.z);
      rock.castShadow = true;
      rock.receiveShadow = true;
      this.scene.add(rock);

      // Flat-ish landing ledge on top
      const ledge = new THREE.Mesh(
        new THREE.CylinderGeometry(3, 3.5, 1, 8),
        new THREE.MeshStandardMaterial({ color: 0x887766, roughness: 0.9, flatShading: true })
      );
      ledge.position.set(def.x, def.h * 0.7, def.z);
      ledge.castShadow = true;
      this.scene.add(ledge);

      this.buildings.push({
        mesh: rock,
        bounds: { x: def.x, z: def.z, w: def.w + 2, d: def.d + 2, h: def.h * 0.75 }
      });
    });
  }

  _createSurvivors() {
    const RESCUE = { HOVER_RADIUS: 6 };
    const positions = [
      { x: -20, y: 14.5, z: -25 },
      { x: 30, y: 18, z: 15 },
      { x: -35, y: 13, z: 30 },
      { x: 15, y: 16, z: -40 },
    ];
    const colors = [0xff8800, 0x44aaff, 0xff4488, 0x88ff44];

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

      // Orange flare
      const flareMat = new THREE.MeshBasicMaterial({
        color: 0xff6600, transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false,
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

      group.position.set(pos.x, pos.y, pos.z);
      group.userData = {
        rescued: false, index: i, arms: [arm1, arm2],
        beacon, ring, innerRing, flare1, flare2, flareLight,
      };
      this.scene.add(group);
      this.survivors.push(group);
    });
  }

  _createTrees() {
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x554433, roughness: 0.9 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x336633, roughness: 0.8, flatShading: true });

    for (let i = 0; i < 50; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 20 + Math.random() * 60;
      const x = Math.cos(angle) * dist;
      const z = Math.sin(angle) * dist;

      // Approximate ground height
      let h = Math.sin(x * 0.02) * Math.cos(z * 0.015) * 25;
      h += Math.sin(x * 0.05 + 1) * Math.cos(z * 0.04 + 2) * 12;
      const distC = Math.sqrt(x * x + z * z);
      const vf = Math.max(0, 1 - distC / 80);
      h *= (1 - vf * 0.7);
      if (distC > 60) h += (distC - 60) * 0.5;

      if (h > 12) continue; // No trees above snowline

      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, 2, 5), trunkMat);
      trunk.position.set(x, h + 1, z);
      this.scene.add(trunk);

      const canopy = new THREE.Mesh(new THREE.ConeGeometry(1.5, 3.5, 6), leafMat);
      canopy.position.set(x, h + 3.5, z);
      canopy.castShadow = true;
      this.scene.add(canopy);
    }
  }

  _setupFog() {
    this._fog = this.scene.fog;
  }

  _createWindIndicator() {
    // HUD wind arrow is handled in HUD, but we create a 3D windsock
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x888888 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3, 6), poleMat);
    pole.position.set(0, 2, 0);
    this.scene.add(pole);

    const sockMat = new THREE.MeshBasicMaterial({ color: 0xff6600, side: THREE.DoubleSide });
    this._windArrow = new THREE.Mesh(new THREE.ConeGeometry(0.3, 1.5, 4), sockMat);
    this._windArrow.position.set(0, 3.5, 0);
    this._windArrow.rotation.x = Math.PI / 2;
    this.scene.add(this._windArrow);
  }

  update(dt, helicopter, elapsedTime) {
    // Wind gusts
    this.windTimer -= dt;
    if (this.windTimer <= 0) {
      this.windTimer = 8 + Math.random() * 7;
      const angle = Math.random() * Math.PI * 2;
      const force = 6 + Math.random() * 6;
      this.windForce.set(Math.cos(angle) * force, 0, Math.sin(angle) * force);
    }

    // Apply wind to helicopter
    const windFade = Math.min(1, this.windTimer > this.windInterval - 2 ? (this.windInterval - this.windTimer + 2) / 2 : 1);
    const windDecay = this.windTimer < 2 ? this.windTimer / 2 : 1;
    const windMul = windFade * windDecay;
    helicopter.velocity.x += this.windForce.x * windMul * dt;
    helicopter.velocity.z += this.windForce.z * windMul * dt;

    // Wind indicator rotation
    if (this._windArrow && this.windForce.lengthSq() > 0.1) {
      const angle = Math.atan2(this.windForce.x, this.windForce.z);
      this._windArrow.rotation.y = angle;
      this._windArrow.material.opacity = 0.5 + windMul * 0.5;
    }

    // Fog thickens over time (visibility reduces)
    this.fogDensity = 0.003 + elapsedTime * 0.00003;
    if (this.scene.fog) {
      this.scene.fog.density = Math.min(this.fogDensity, 0.012);
    }
  }

  getHelipadPosition() {
    // Landing pad at a safe flat area
    return new THREE.Vector3(60, 3, -50);
  }
}

import * as THREE from 'three';

export class FloodWorld {
  constructor(scene) {
    this.scene = scene;
    this.buildings = [];
    this.survivors = [];
    this.waterLevel = -0.5;
    this._waterMesh = null;
    this._rainPoints = null;
    this._debris = [];
    this._lightning = null;
    this._lightningTimer = 8;
    this._ambientLight = null;
    this._stormLight = null;
  }

  build() {
    this._createGround();
    this._setupLighting();
    this._createHouses();
    this._createWater();
    this._createSurvivors();
    this._createRain();
    this._createDebris();
    this._createTrees();
    this._createLightning();
    return { buildings: this.buildings, survivors: this.survivors };
  }

  _setupLighting() {
    // Storm atmosphere — darker ambient, dramatic
    this._ambientLight = new THREE.AmbientLight(0x556677, 0.5);
    this.scene.add(this._ambientLight);

    this._stormLight = new THREE.DirectionalLight(0x8899aa, 0.6);
    this._stormLight.position.set(30, 50, 20);
    this._stormLight.castShadow = true;
    this.scene.add(this._stormLight);
  }

  _createGround() {
    // Muddy brown ground
    const geo = new THREE.PlaneGeometry(400, 400);
    const mat = new THREE.MeshStandardMaterial({ color: 0x554433, roughness: 0.95 });
    const ground = new THREE.Mesh(geo, mat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Roads (suburbs have streets)
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.85 });
    // Main grid
    [-40, 0, 40].forEach(x => {
      const road = new THREE.Mesh(new THREE.PlaneGeometry(8, 250), roadMat);
      road.rotation.x = -Math.PI / 2;
      road.position.set(x, -0.5, 0);
      this.scene.add(road);
    });
    [-40, 0, 40].forEach(z => {
      const road = new THREE.Mesh(new THREE.PlaneGeometry(250, 8), roadMat);
      road.rotation.x = -Math.PI / 2;
      road.position.set(0, -0.5, z);
      this.scene.add(road);
    });
  }

  _createHouses() {
    // Bigger, more detailed suburban houses
    const houseDefs = [
      { x: -25, z: -25, w: 10, h: 7, d: 12, color: 0xccaa88, roofColor: 0x884433, trim: 0xffeedd },
      { x: 25, z: -25, w: 12, h: 6, d: 10, color: 0xbbcc99, roofColor: 0x556633, trim: 0xeeffdd },
      { x: -25, z: 25, w: 11, h: 8, d: 11, color: 0xddbb99, roofColor: 0x774433, trim: 0xfff0dd },
      { x: 25, z: 25, w: 10, h: 6.5, d: 12, color: 0xccbbaa, roofColor: 0x665544, trim: 0xffeedd },
      { x: -55, z: 0, w: 12, h: 7.5, d: 10, color: 0xbbaa88, roofColor: 0x885533, trim: 0xffeecc },
      { x: 55, z: -20, w: 10, h: 7, d: 11, color: 0xcccc99, roofColor: 0x667744, trim: 0xeeffcc },
      { x: 0, z: -55, w: 14, h: 8, d: 12, color: 0xddccaa, roofColor: 0x886644, trim: 0xfff5dd },
      { x: 0, z: 55, w: 11, h: 6.5, d: 10, color: 0xccbbaa, roofColor: 0x775544, trim: 0xffeedd },
    ];

    houseDefs.forEach(def => {
      const group = new THREE.Group();

      // Walls
      const wallMat = new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.75 });
      const walls = new THREE.Mesh(new THREE.BoxGeometry(def.w, def.h, def.d), wallMat);
      walls.position.y = def.h / 2;
      walls.castShadow = true;
      walls.receiveShadow = true;
      group.add(walls);

      // Trim / foundation line
      const trimMat = new THREE.MeshStandardMaterial({ color: def.trim, roughness: 0.6 });
      const trim = new THREE.Mesh(new THREE.BoxGeometry(def.w + 0.2, 0.3, def.d + 0.2), trimMat);
      trim.position.y = 0.15;
      group.add(trim);

      // Pitched roof
      const roofW = def.w + 1.5;
      const roofD = def.d + 1;
      const roofH = 3.5;
      const roofGeo = new THREE.ConeGeometry(Math.max(roofW, roofD) * 0.55, roofH, 4);
      roofGeo.rotateY(Math.PI / 4);
      const roofMat = new THREE.MeshStandardMaterial({ color: def.roofColor, roughness: 0.85 });
      const roof = new THREE.Mesh(roofGeo, roofMat);
      roof.position.y = def.h + roofH / 2;
      roof.castShadow = true;
      group.add(roof);

      // Windows — warm interior glow
      const litWinMat = new THREE.MeshBasicMaterial({ color: 0xffdd88 });
      const darkWinMat = new THREE.MeshBasicMaterial({ color: 0x445566 });
      const floors = Math.floor(def.h / 3.5);
      for (let f = 0; f < floors; f++) {
        for (let w = -1; w <= 1; w++) {
          const isLit = Math.random() > 0.3;
          const wm = isLit ? litWinMat : darkWinMat;
          // Front + back
          const win = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.6), wm);
          win.position.set(w * 2.8, f * 3.5 + 2.5, def.d / 2 + 0.05);
          group.add(win);
          const win2 = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 1.6), wm);
          win2.position.set(w * 2.8, f * 3.5 + 2.5, -def.d / 2 - 0.05);
          win2.rotation.y = Math.PI;
          group.add(win2);
        }
      }

      // Door
      const doorMat = new THREE.MeshStandardMaterial({ color: 0x664422 });
      const door = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.2), doorMat);
      door.position.set(0, 1.1, def.d / 2 + 0.06);
      group.add(door);

      // Chimney
      if (Math.random() > 0.4) {
        const chimney = new THREE.Mesh(
          new THREE.BoxGeometry(1, 3, 1),
          new THREE.MeshStandardMaterial({ color: 0x884444, roughness: 0.9 })
        );
        chimney.position.set(def.w * 0.25, def.h + 2, 0);
        group.add(chimney);
      }

      group.position.set(def.x, 0, def.z);
      this.scene.add(group);

      this.buildings.push({
        mesh: group,
        bounds: { x: def.x, z: def.z, w: def.w + 2, d: def.d + 2, h: def.h + roofH + 1 }
      });
    });
  }

  _createWater() {
    const waterGeo = new THREE.PlaneGeometry(400, 400, 60, 60);
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x3a5566,
      roughness: 0.15,
      metalness: 0.4,
      transparent: true,
      opacity: 0.8,
      envMapIntensity: 0.5,
    });
    this._waterMesh = new THREE.Mesh(waterGeo, waterMat);
    this._waterMesh.rotation.x = -Math.PI / 2;
    this._waterMesh.position.y = this.waterLevel;
    this.scene.add(this._waterMesh);

    // Water surface caustic light
    const waterLight = new THREE.PointLight(0x4488aa, 1, 80);
    waterLight.position.set(0, 2, 0);
    this.scene.add(waterLight);
  }

  _createSurvivors() {
    const RESCUE_RADIUS = 6;
    // Place survivors ON TOP of the rooftops — use house definitions
    const survivorHouses = [
      { x: -25, z: -25, h: 7 },   // house 0
      { x: 25, z: -25, h: 6 },    // house 1
      { x: -25, z: 25, h: 8 },    // house 2
      { x: 25, z: 25, h: 6.5 },   // house 3
      { x: -55, z: 0, h: 7.5 },   // house 4
      { x: 0, z: -55, h: 8 },     // house 6
    ];
    const colors = [0xff6600, 0x44bbff, 0xff44aa, 0x88ff44, 0xffff44, 0xff66ff];

    survivorHouses.forEach((pos, i) => {
      const group = new THREE.Group();
      const bodyMat = new THREE.MeshStandardMaterial({ color: colors[i], roughness: 0.5 });

      // Body — slightly bigger for visibility
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.3, 1.1, 8), bodyMat);
      body.position.y = 0.75;
      group.add(body);

      // Head
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.28, 8, 8),
        new THREE.MeshStandardMaterial({ color: 0xffcc99 })
      );
      head.position.y = 1.55;
      group.add(head);

      // Arms waving
      const arm1 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.65, 0.14), bodyMat);
      arm1.position.set(-0.45, 1.3, 0);
      arm1.rotation.z = -0.5;
      group.add(arm1);
      const arm2 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.65, 0.14), bodyMat);
      arm2.position.set(0.45, 1.3, 0);
      arm2.rotation.z = 0.5;
      group.add(arm2);

      // Rescue zone ring
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(RESCUE_RADIUS - 0.3, RESCUE_RADIUS, 32),
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

      // Bright beacon — very visible
      const beacon = new THREE.PointLight(0xffaa00, 3, 30);
      beacon.position.y = 2;
      group.add(beacon);

      // Tall distress flare — bright red/orange beam
      const flareMat = new THREE.MeshBasicMaterial({
        color: 0xff4400, transparent: true, opacity: 0.35, side: THREE.DoubleSide, depthWrite: false,
      });
      const flare1 = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 20), flareMat.clone());
      flare1.position.y = 11;
      group.add(flare1);
      const flare2 = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 20), flareMat.clone());
      flare2.position.y = 11;
      flare2.rotation.y = Math.PI / 2;
      group.add(flare2);

      // Bright flare tip light
      const flareLight = new THREE.PointLight(0xff4400, 2, 35);
      flareLight.position.y = 8;
      group.add(flareLight);

      // Position on roof peak (house height + roof height)
      const rooftopY = pos.h + 3.5;
      group.position.set(pos.x, rooftopY, pos.z);
      group.userData = {
        rescued: false, index: i, arms: [arm1, arm2],
        beacon, ring, innerRing, flare1, flare2, flareLight,
        baseY: rooftopY,
        houseHeight: pos.h,
        drownHeight: pos.h + 2, // Water must reach wall top + 2 to lose them
      };
      this.scene.add(group);
      this.survivors.push(group);
    });
  }

  _createRain() {
    const rainCount = 3000;
    const positions = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 250;
      positions[i * 3 + 1] = Math.random() * 80;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 250;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xaabbdd,
      size: 0.2,
      transparent: true,
      opacity: 0.6,
    });
    this._rainPoints = new THREE.Points(geo, mat);
    this.scene.add(this._rainPoints);
  }

  _createDebris() {
    const debrisMat = new THREE.MeshStandardMaterial({ color: 0x665544, roughness: 0.9 });
    const carColors = [0x556677, 0x667755, 0x775566, 0x777766];

    for (let i = 0; i < 20; i++) {
      const iscar = Math.random() > 0.5;
      const w = iscar ? 1.8 : 0.8 + Math.random() * 2;
      const h = iscar ? 1.2 : 0.3 + Math.random() * 0.6;
      const d = iscar ? 3.5 : 0.8 + Math.random() * 2;

      const mat = iscar ?
        new THREE.MeshStandardMaterial({ color: carColors[i % carColors.length], roughness: 0.5 }) :
        debrisMat;

      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      mesh.position.set(
        (Math.random() - 0.5) * 140,
        -0.5,
        (Math.random() - 0.5) * 140
      );
      mesh.rotation.y = Math.random() * Math.PI * 2;
      mesh.castShadow = true;
      mesh.userData = {
        driftX: (Math.random() - 0.5) * 0.8,
        driftZ: (Math.random() - 0.5) * 0.8,
        bobPhase: Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.3,
      };
      this.scene.add(mesh);
      this._debris.push(mesh);
    }
  }

  _createTrees() {
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x554433, roughness: 0.9 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x447733, roughness: 0.8 });

    for (let i = 0; i < 30; i++) {
      const x = (Math.random() - 0.5) * 160;
      const z = (Math.random() - 0.5) * 160;
      // Skip if too close to a house
      const tooClose = this.buildings.some(b =>
        Math.abs(x - b.bounds.x) < b.bounds.w && Math.abs(z - b.bounds.z) < b.bounds.d
      );
      if (tooClose) continue;

      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.3, 4, 6), trunkMat);
      trunk.position.set(x, 2, z);
      this.scene.add(trunk);

      const canopy = new THREE.Mesh(new THREE.SphereGeometry(2, 6, 6), leafMat);
      canopy.position.set(x, 5.5, z);
      canopy.castShadow = true;
      this.scene.add(canopy);
    }
  }

  _createLightning() {
    this._lightning = new THREE.PointLight(0xddddff, 0, 500);
    this._lightning.position.set(0, 100, 0);
    this.scene.add(this._lightning);
  }

  update(dt, helicopter, elapsedTime) {
    // Water rises SLOWLY — 0.15 units/sec so game lasts the full 200s timer
    // Water goes from -0.5 to about 29.5 over 200s
    this.waterLevel += 0.15 * dt;

    if (this._waterMesh) {
      this._waterMesh.position.y = this.waterLevel;

      // Animated waves
      const pos = this._waterMesh.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        const wave = Math.sin(x * 0.08 + elapsedTime * 1.5) * 0.4 +
                     Math.sin(z * 0.06 + elapsedTime * 1.2) * 0.3 +
                     Math.sin((x + z) * 0.12 + elapsedTime * 2) * 0.15;
        pos.setY(i, wave);
      }
      pos.needsUpdate = true;
    }

    // Check if survivors are submerged (water reaches near rooftop)
    for (let i = 0; i < this.survivors.length; i++) {
      const s = this.survivors[i];
      if (s.userData.rescued) continue;
      // Survivor lost when water reaches their rooftop level
      if (this.waterLevel > s.userData.baseY - 1) {
        s.userData.rescued = true; // counted as lost
        s.visible = false;
      }
    }

    // Rain
    if (this._rainPoints) {
      const rpos = this._rainPoints.geometry.attributes.position;
      for (let i = 0; i < rpos.count; i++) {
        let y = rpos.getY(i);
        y -= 45 * dt;
        if (y < this.waterLevel) {
          y = 50 + Math.random() * 30;
          rpos.setX(i, (Math.random() - 0.5) * 250);
          rpos.setZ(i, (Math.random() - 0.5) * 250);
        }
        rpos.setY(i, y);
      }
      rpos.needsUpdate = true;
    }

    // Debris floats on water and drifts
    for (let i = 0; i < this._debris.length; i++) {
      const d = this._debris[i];
      d.position.y = this.waterLevel + 0.05 + Math.sin(elapsedTime * 1.2 + d.userData.bobPhase) * 0.25;
      d.position.x += d.userData.driftX * dt;
      d.position.z += d.userData.driftZ * dt;
      d.rotation.y += d.userData.rotSpeed * dt;
    }

    // Lightning flashes — dramatic
    this._lightningTimer -= dt;
    if (this._lightningTimer <= 0) {
      this._lightningTimer = 4 + Math.random() * 12;
      this._lightning.intensity = 8;
      // Brief white flash
      this._lightning.position.set(
        (Math.random() - 0.5) * 100,
        80 + Math.random() * 30,
        (Math.random() - 0.5) * 100
      );
    }
    if (this._lightning.intensity > 0) {
      this._lightning.intensity *= (1 - 10 * dt);
      if (this._lightning.intensity < 0.01) this._lightning.intensity = 0;
    }

    // Storm fog changes slightly
    if (this.scene.fog) {
      this.scene.fog.density = 0.004 + Math.sin(elapsedTime * 0.3) * 0.001;
    }
  }

  getHelipadPosition() {
    return new THREE.Vector3(70, 8, -55);
  }
}

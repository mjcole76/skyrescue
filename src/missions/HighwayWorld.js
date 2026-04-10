import * as THREE from 'three';

export class HighwayWorld {
  constructor(scene) {
    this.scene = scene;
    this.buildings = [];
    this.survivors = [];
    this._vehicles = [];
    this._fires = [];
    this._movingTraffic = [];
    this._streetlights = [];
  }

  build() {
    this._setupNightLighting();
    this._createGround();
    this._createHighway();
    this._createPileup();
    this._createSurvivors();
    this._createMovingTraffic();
    this._createBarriers();
    this._createSurroundings();
    return { buildings: this.buildings, survivors: this.survivors };
  }

  _setupNightLighting() {
    // Very dark — searchlight is key
    this._ambientLight = new THREE.AmbientLight(0x1a2233, 0.25);
    this.scene.add(this._ambientLight);

    // Faint moonlight
    this._moonLight = new THREE.DirectionalLight(0x4466aa, 0.2);
    this._moonLight.position.set(30, 60, -20);
    this.scene.add(this._moonLight);

    // Night fog
    this.scene.fog = new THREE.FogExp2(0x080812, 0.006);
  }

  _createGround() {
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(400, 400),
      new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.95 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  _createHighway() {
    // Elevated highway — long winding road
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.8 });
    const barrierMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.7 });

    // Main straight highway sections forming an L-shape
    // Section 1: runs along Z axis
    const road1 = new THREE.Mesh(new THREE.BoxGeometry(16, 1, 200), roadMat);
    road1.position.set(0, 4, 0);
    road1.receiveShadow = true;
    this.scene.add(road1);
    this.buildings.push({ mesh: road1, bounds: { x: 0, z: 0, w: 18, d: 202, h: 5 } });

    // Section 2: curves to the right
    const road2 = new THREE.Mesh(new THREE.BoxGeometry(120, 1, 16), roadMat);
    road2.position.set(60, 4, -100);
    road2.receiveShadow = true;
    this.scene.add(road2);
    this.buildings.push({ mesh: road2, bounds: { x: 60, z: -100, w: 122, d: 18, h: 5 } });

    // Road pillars underneath
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
    for (let z = -90; z <= 90; z += 20) {
      [-5, 5].forEach(x => {
        const pillar = new THREE.Mesh(new THREE.BoxGeometry(1.5, 4, 1.5), pillarMat);
        pillar.position.set(x, 2, z);
        this.scene.add(pillar);
      });
    }

    // Lane markings
    const dashMat = new THREE.MeshBasicMaterial({ color: 0x888844 });
    for (let z = -95; z <= 95; z += 6) {
      const dash = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 3), dashMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(0, 4.52, z);
      this.scene.add(dash);
    }

    // White edge lines
    const edgeMat = new THREE.MeshBasicMaterial({ color: 0x666666 });
    [-7.5, 7.5].forEach(x => {
      const line = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 200), edgeMat);
      line.rotation.x = -Math.PI / 2;
      line.position.set(x, 4.52, 0);
      this.scene.add(line);
    });
  }

  _createPileup() {
    // Crashed vehicles scattered on the highway
    const crashDefs = [
      { x: -3, z: 20, rot: 0.4, color: 0x884444, w: 2, h: 1.3, d: 4, fire: true },
      { x: 4, z: 28, rot: -0.8, color: 0x446688, w: 2, h: 1.3, d: 4, fire: false },
      { x: -1, z: 35, rot: 1.5, color: 0x666644, w: 2.5, h: 1.8, d: 5.5, fire: true }, // truck
      { x: 3, z: 42, rot: 0.2, color: 0x555555, w: 2, h: 1.3, d: 4, fire: false },
      { x: -4, z: 50, rot: -1.2, color: 0x448844, w: 2, h: 1.3, d: 4, fire: true },
      { x: 2, z: -20, rot: 0.7, color: 0x884466, w: 2, h: 1.3, d: 4, fire: false },
      { x: -2, z: -30, rot: -0.3, color: 0x668844, w: 2, h: 1.3, d: 4, fire: true },
      { x: 5, z: -40, rot: 1.1, color: 0x445566, w: 2.5, h: 1.5, d: 5, fire: false },
    ];

    crashDefs.forEach(def => {
      const group = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(def.w, def.h, def.d),
        new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.6 })
      );
      body.position.y = def.h / 2;
      body.castShadow = true;
      group.add(body);

      // Windshield
      const glassMat = new THREE.MeshStandardMaterial({
        color: 0x88aacc, transparent: true, opacity: 0.3, metalness: 0.5
      });
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(def.w - 0.3, 0.8), glassMat);
      glass.position.set(0, def.h, def.d * 0.3);
      glass.rotation.x = -0.3;
      group.add(glass);

      if (def.fire) {
        // Small fire on crashed vehicle
        const fireLight = new THREE.PointLight(0xff6600, 2, 15);
        fireLight.position.set(0, def.h + 1, 0);
        group.add(fireLight);
        this._fires.push({ light: fireLight, base: def.h + 1 });

        // Fire particles
        for (let i = 0; i < 4; i++) {
          const fireMat = new THREE.MeshBasicMaterial({
            color: i % 2 === 0 ? 0xff6600 : 0xff3300,
            transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide,
          });
          const flame = new THREE.Mesh(new THREE.PlaneGeometry(0.4 + Math.random() * 0.5, 0.8 + Math.random() * 0.8), fireMat);
          flame.position.set(
            (Math.random() - 0.5) * def.w * 0.6,
            def.h + 0.5 + Math.random() * 1,
            (Math.random() - 0.5) * def.d * 0.3
          );
          flame.userData = { vy: 1 + Math.random() * 2, baseY: def.h + 0.3, maxY: def.h + 3, flicker: Math.random() * 6 };
          group.add(flame);
          this._fires.push({ flame, group });
        }
      }

      group.position.set(def.x, 4.5, def.z);
      group.rotation.y = def.rot;
      this.scene.add(group);
    });

    // Hazard cones with reflective tape
    const coneMat = new THREE.MeshStandardMaterial({ color: 0xff6600, roughness: 0.5 });
    [-6, 6].forEach(x => {
      for (let z = 10; z <= 60; z += 8) {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.6, 6), coneMat);
        cone.position.set(x, 4.8, z);
        this.scene.add(cone);
      }
    });
  }

  _createSurvivors() {
    const RESCUE_RADIUS = 6;
    const positions = [
      { x: 0, z: 25, y: 5.2 },
      { x: -3, z: 38, y: 5.2 },
      { x: 4, z: 48, y: 5.2 },
      { x: -2, z: -25, y: 5.2 },
      { x: 3, z: -35, y: 5.2 },
    ];
    const colors = [0xff8800, 0x44bbff, 0xff44aa, 0x88ff44, 0xffff44];

    positions.forEach((pos, i) => {
      const group = new THREE.Group();
      const bodyMat = new THREE.MeshStandardMaterial({ color: colors[i], roughness: 0.5, emissive: colors[i], emissiveIntensity: 0.15 });

      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.3, 1.1, 8), bodyMat);
      body.position.y = 0.75;
      group.add(body);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 8), new THREE.MeshStandardMaterial({ color: 0xffcc99 }));
      head.position.y = 1.55;
      group.add(head);

      const arm1 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.65, 0.14), bodyMat);
      arm1.position.set(-0.45, 1.3, 0);
      arm1.rotation.z = -0.5;
      group.add(arm1);
      const arm2 = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.65, 0.14), bodyMat);
      arm2.position.set(0.45, 1.3, 0);
      arm2.rotation.z = 0.5;
      group.add(arm2);

      // Rescue ring — brighter for dark scene
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(RESCUE_RADIUS - 0.3, RESCUE_RADIUS, 32),
        new THREE.MeshBasicMaterial({ color: 0xffaa00, side: THREE.DoubleSide, transparent: true, opacity: 0.6 })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.15;
      group.add(ring);

      const innerRing = new THREE.Mesh(
        new THREE.RingGeometry(0.5, 0.8, 16),
        new THREE.MeshBasicMaterial({ color: 0xffcc00, side: THREE.DoubleSide, transparent: true, opacity: 0.7 })
      );
      innerRing.rotation.x = -Math.PI / 2;
      innerRing.position.y = 0.2;
      group.add(innerRing);

      // Extra bright beacon for night — this is how you find them
      const beacon = new THREE.PointLight(0xffaa00, 4, 35);
      beacon.position.y = 2;
      group.add(beacon);

      // Flashlight beam pointing up (instead of flare — more realistic for highway)
      const flashMat = new THREE.MeshBasicMaterial({
        color: 0xffffcc, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false,
      });
      const flash1 = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 25), flashMat.clone());
      flash1.position.y = 13;
      group.add(flash1);
      const flash2 = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 25), flashMat.clone());
      flash2.position.y = 13;
      flash2.rotation.y = Math.PI / 2;
      group.add(flash2);

      const flareLight = new THREE.PointLight(0xffffaa, 2, 30);
      flareLight.position.y = 8;
      group.add(flareLight);

      group.position.set(pos.x, pos.y, pos.z);
      group.userData = {
        rescued: false, index: i, arms: [arm1, arm2],
        beacon, ring, innerRing, flare1: flash1, flare2: flash2, flareLight,
      };
      this.scene.add(group);
      this.survivors.push(group);
    });
  }

  _createMovingTraffic() {
    // Cars on opposite side of highway, moving — obstacles
    const carColors = [0xcc3333, 0x3333cc, 0xcccc33, 0x33cccc, 0xcc33cc, 0x88aa66];
    for (let i = 0; i < 8; i++) {
      const color = carColors[i % carColors.length];
      const group = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 1.2, 3.5),
        new THREE.MeshStandardMaterial({ color, roughness: 0.5 })
      );
      body.position.y = 0.6;
      group.add(body);

      // Headlights
      const hlMat = new THREE.MeshBasicMaterial({ color: 0xffffcc });
      [-0.7, 0.7].forEach(x => {
        const hl = new THREE.Mesh(new THREE.SphereGeometry(0.12, 4, 4), hlMat);
        hl.position.set(x, 0.5, 1.8);
        group.add(hl);
      });
      // Only add headlight to every other car to reduce PointLight count
      if (i % 2 === 0) {
        const headlight = new THREE.PointLight(0xffffcc, 2, 15);
        headlight.position.set(0, 0.5, 2.5);
        group.add(headlight);
      }

      // Taillights
      const tlMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
      [-0.7, 0.7].forEach(x => {
        const tl = new THREE.Mesh(new THREE.SphereGeometry(0.1, 4, 4), tlMat);
        tl.position.set(x, 0.5, -1.8);
        group.add(tl);
      });

      const startZ = -100 + i * 25 + Math.random() * 10;
      const lane = i % 2 === 0 ? -4 : 4;
      const direction = lane < 0 ? 1 : -1;

      group.position.set(lane, 4.5, startZ);
      group.rotation.y = direction > 0 ? 0 : Math.PI;
      this.scene.add(group);

      this._movingTraffic.push({
        mesh: group,
        speed: 12 + Math.random() * 8,
        direction,
        lane,
        resetMin: -110,
        resetMax: 110,
      });
    }
  }

  _createBarriers() {
    // Jersey barriers — use longer segments to reduce mesh count
    const barrierMat = new THREE.MeshStandardMaterial({ color: 0x666666, roughness: 0.8 });
    [-7.8, 7.8].forEach(x => {
      for (let z = -90; z <= 90; z += 15) {
        const barrier = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.8, 14), barrierMat);
        barrier.position.set(x, 4.9, z);
        this.scene.add(barrier);
      }
    });
  }

  _createSurroundings() {
    // Dark buildings alongside highway
    const buildMat = new THREE.MeshStandardMaterial({ color: 0x111118, roughness: 0.9 });
    const litWinMat = new THREE.MeshBasicMaterial({ color: 0xeedd88 });
    const dimWinMat = new THREE.MeshBasicMaterial({ color: 0x222233 });

    for (let i = 0; i < 20; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const x = side * (20 + Math.random() * 40);
      const z = (Math.random() - 0.5) * 200;
      const h = 8 + Math.random() * 25;
      const w = 6 + Math.random() * 10;
      const d = 6 + Math.random() * 8;

      const bld = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), buildMat);
      bld.position.set(x, h / 2, z);
      this.scene.add(bld);

      // A few lit windows
      const floors = Math.floor(h / 3.5);
      for (let f = 0; f < floors; f++) {
        for (let wn = -1; wn <= 1; wn++) {
          if (Math.random() > 0.25) continue;
          const mat = Math.random() > 0.5 ? litWinMat : dimWinMat;
          const win = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.8), mat);
          const winSide = side === -1 ? w / 2 + 0.05 : -w / 2 - 0.05;
          win.position.set(x + winSide, f * 3.5 + 3, z + wn * 3);
          win.rotation.y = side === -1 ? Math.PI / 2 : -Math.PI / 2;
          this.scene.add(win);
        }
      }
    }

    // Streetlights along highway (fewer to reduce PointLights)
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x444444 });
    const lampMat = new THREE.MeshBasicMaterial({ color: 0xffdd88 });
    for (let z = -90; z <= 90; z += 40) {
      [-10, 10].forEach(x => {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 8, 6), poleMat);
        pole.position.set(x, 4, z);
        this.scene.add(pole);

        const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 6), lampMat);
        lamp.position.set(x, 8, z);
        this.scene.add(lamp);

        const light = new THREE.PointLight(0xffdd88, 0.8, 20);
        light.position.set(x, 7.5, z);
        this.scene.add(light);
      });
    }
  }

  update(dt, helicopter, elapsedTime) {
    this._frame = (this._frame || 0) + 1;

    // Moving traffic
    for (let i = 0; i < this._movingTraffic.length; i++) {
      const t = this._movingTraffic[i];
      t.mesh.position.z += t.speed * t.direction * dt;
      if (t.direction > 0 && t.mesh.position.z > t.resetMax) t.mesh.position.z = t.resetMin;
      if (t.direction < 0 && t.mesh.position.z < t.resetMin) t.mesh.position.z = t.resetMax;
    }

    // Fire flickering on crashed vehicles
    for (let i = 0; i < this._fires.length; i++) {
      const f = this._fires[i];
      if (f.light) {
        f.light.intensity = 1.5 + Math.sin(elapsedTime * 7 + i) * 1 + Math.sin(elapsedTime * 13 + i * 2) * 0.5;
      }
      if (f.flame) {
        const fl = f.flame;
        fl.position.y += fl.userData.vy * dt;
        if (fl.position.y > fl.userData.maxY) fl.position.y = fl.userData.baseY;
        fl.material.opacity = 0.5 + Math.sin(elapsedTime * fl.userData.flicker + i) * 0.3;
        // Stagger lookAt to reduce per-frame cost
        if ((this._frame + i) % 4 === 0) fl.lookAt(helicopter.position);
      }
    }
  }

  getHelipadPosition() {
    return new THREE.Vector3(0, 8.3, -80);
  }
}

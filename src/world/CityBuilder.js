import * as THREE from 'three';

export class CityBuilder {
  constructor(scene) {
    this.scene = scene;
    this.buildings = [];
    this.flashingLights = []; // Emergency vehicle lights to animate
  }

  build() {
    this._createGround();
    this._createRoads();
    this._createBurningBuilding();
    this._createSurroundingBuildings();
    this._createEmergencyVehicles();
    this._createStreetLights();
    this._createDistantSkyline();
    return this.buildings;
  }

  _createGround() {
    // Darker asphalt-like ground
    const groundGeo = new THREE.PlaneGeometry(400, 400);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.95 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Sidewalks near roads
    const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.85 });
    [[-30, 0], [30, 0]].forEach(([x]) => {
      [-1, 1].forEach(side => {
        const sw = new THREE.Mesh(new THREE.PlaneGeometry(3, 300), sidewalkMat);
        sw.rotation.x = -Math.PI / 2;
        sw.position.set(x + side * 7.5, 0.03, 0);
        this.scene.add(sw);
      });
    });
  }

  _createRoads() {
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.8 });

    [[-30, 0], [30, 0]].forEach(([x, z]) => {
      const road = new THREE.Mesh(new THREE.PlaneGeometry(12, 300), roadMat);
      road.rotation.x = -Math.PI / 2;
      road.position.set(x, 0.05, z);
      this.scene.add(road);
    });

    [[0, -30], [0, 30]].forEach(([x, z]) => {
      const road = new THREE.Mesh(new THREE.PlaneGeometry(300, 12), roadMat);
      road.rotation.x = -Math.PI / 2;
      road.position.set(x, 0.05, z);
      this.scene.add(road);
    });

    // Lane markings — yellow center, white edges
    const yellowMat = new THREE.MeshBasicMaterial({ color: 0x887733 });
    const whiteMat = new THREE.MeshBasicMaterial({ color: 0x666666 });

    for (let i = -140; i < 140; i += 8) {
      // Center yellow dashes
      [[-30, 30]].forEach(xs => {
        xs.forEach(x => {
          const line = new THREE.Mesh(new THREE.PlaneGeometry(0.25, 3), yellowMat);
          line.rotation.x = -Math.PI / 2;
          line.position.set(x, 0.06, i);
          this.scene.add(line);
        });
      });
    }

    // Solid white edge lines
    [[-30, 30]].forEach(xs => {
      xs.forEach(x => {
        [-5.5, 5.5].forEach(offset => {
          const line = new THREE.Mesh(new THREE.PlaneGeometry(0.15, 300), whiteMat);
          line.rotation.x = -Math.PI / 2;
          line.position.set(x + offset, 0.06, 0);
          this.scene.add(line);
        });
      });
    });
  }

  _createBurningBuilding() {
    const group = new THREE.Group();

    const bodyGeo = new THREE.BoxGeometry(18, 30, 18);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x443322, roughness: 0.8, metalness: 0.05 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 15;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Fire-lit windows and dark windows
    const fireWindowMat = new THREE.MeshStandardMaterial({
      color: 0xff4400, emissive: 0xff3300, emissiveIntensity: 1.0
    });
    const darkWindowMat = new THREE.MeshStandardMaterial({
      color: 0x111118, roughness: 0.5, emissive: 0x080810, emissiveIntensity: 0.1
    });
    const brokenWindowMat = new THREE.MeshStandardMaterial({
      color: 0x221100, emissive: 0xff2200, emissiveIntensity: 0.4
    });

    for (let floor = 0; floor < 6; floor++) {
      for (let w = -2; w <= 2; w++) {
        const isFire = floor < 4 && Math.random() > 0.25;
        const isBroken = isFire && Math.random() > 0.6;
        const mat = isFire ? (isBroken ? brokenWindowMat : fireWindowMat) : darkWindowMat;

        // All four faces
        const positions = [
          [w * 3.2, floor * 4.5 + 4, 9.05, 0],
          [w * 3.2, floor * 4.5 + 4, -9.05, Math.PI],
          [-9.05, floor * 4.5 + 4, w * 3.2, -Math.PI / 2],
          [9.05, floor * 4.5 + 4, w * 3.2, Math.PI / 2],
        ];
        positions.forEach(([x, y, z, ry]) => {
          const win = new THREE.Mesh(new THREE.PlaneGeometry(2, 2.5), mat);
          win.position.set(x, y, z);
          win.rotation.y = ry;
          group.add(win);
        });
      }
    }

    // Roof
    const roof = new THREE.Mesh(
      new THREE.BoxGeometry(20, 0.5, 20),
      new THREE.MeshStandardMaterial({ color: 0x332211 })
    );
    roof.position.y = 30.25;
    roof.receiveShadow = true;
    group.add(roof);

    // Rooftop details
    const acMat = new THREE.MeshStandardMaterial({ color: 0x555555 });
    [[6, 31, 6], [-5, 31, -4], [2, 31, -6]].forEach(([x, y, z]) => {
      const ac = new THREE.Mesh(new THREE.BoxGeometry(2, 1.5, 2), acMat);
      ac.position.set(x, y, z);
      ac.castShadow = true;
      group.add(ac);
    });

    // Water tower
    const towerMat = new THREE.MeshStandardMaterial({ color: 0x664433, roughness: 0.9 });
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 3, 8), towerMat);
    tower.position.set(-6, 32.5, 5);
    group.add(tower);
    // Tower legs
    [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([ox, oz]) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.15, 2, 0.15), acMat);
      leg.position.set(-6 + ox, 31, 5 + oz);
      group.add(leg);
    });

    // Antenna
    const antenna = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 6),
      new THREE.MeshStandardMaterial({ color: 0x888888 })
    );
    antenna.position.set(-7, 33.5, -7);
    group.add(antenna);

    // Antenna blinker
    const blinker = new THREE.Mesh(
      new THREE.SphereGeometry(0.15, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );
    blinker.position.set(-7, 36.5, -7);
    group.add(blinker);
    this.flashingLights.push({ mesh: blinker, type: 'blink', speed: 2 });

    group.position.set(0, 0, 0);
    this.scene.add(group);
    this.buildings.push({ mesh: group, bounds: { x: 0, z: 0, w: 20, d: 20, h: 35 } });
  }

  _createSurroundingBuildings() {
    const buildingDefs = [
      { x: -50, z: -40, w: 14, h: 18, d: 14, color: 0x3a4555 },
      { x: -50, z: 10, w: 16, h: 24, d: 12, color: 0x445544 },
      { x: -50, z: 50, w: 12, h: 12, d: 16, color: 0x554433 },
      { x: 50, z: -35, w: 14, h: 20, d: 18, color: 0x443344 },
      { x: 50, z: 20, w: 16, h: 28, d: 14, color: 0x3a4444 },
      { x: 50, z: 60, w: 12, h: 15, d: 12, color: 0x444455 },
      { x: 0, z: -55, w: 18, h: 16, d: 12, color: 0x445555 },
      { x: 0, z: 60, w: 20, h: 22, d: 14, color: 0x554444 },
      { x: -80, z: 0, w: 12, h: 10, d: 20, color: 0x444444 },
      { x: 80, z: 0, w: 14, h: 14, d: 16, color: 0x444433 },
      { x: -80, z: 50, w: 10, h: 8, d: 10, color: 0x555544 },
      { x: 80, z: -50, w: 16, h: 12, d: 14, color: 0x445544 },
    ];

    buildingDefs.forEach(def => {
      const group = new THREE.Group();
      const geo = new THREE.BoxGeometry(def.w, def.h, def.d);
      const mat = new THREE.MeshStandardMaterial({ color: def.color, roughness: 0.85 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = def.h / 2;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);

      // Windows — grid pattern with random lit/unlit
      const litWindowMat = new THREE.MeshBasicMaterial({ color: 0xeedd88 });
      const dimWindowMat = new THREE.MeshBasicMaterial({ color: 0x445566 });
      const darkWindowMat = new THREE.MeshBasicMaterial({ color: 0x111115 });

      const floors = Math.floor(def.h / 3.5);
      const windowsPerFloor = Math.floor(def.w / 2.5);

      for (let f = 0; f < floors; f++) {
        for (let w = 0; w < windowsPerFloor; w++) {
          const r = Math.random();
          const wmat = r > 0.7 ? litWindowMat : r > 0.4 ? dimWindowMat : darkWindowMat;
          const wx = (w - (windowsPerFloor - 1) / 2) * 2.5;
          const wy = f * 3.5 + 2.5;

          // Front face
          const win = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.8), wmat);
          win.position.set(wx, wy, def.d / 2 + 0.05);
          group.add(win);

          // Back face
          const r2 = Math.random();
          const wmat2 = r2 > 0.7 ? litWindowMat : r2 > 0.4 ? dimWindowMat : darkWindowMat;
          const win2 = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.8), wmat2);
          win2.position.set(wx, wy, -def.d / 2 - 0.05);
          win2.rotation.y = Math.PI;
          group.add(win2);
        }

        // Side windows
        const sideWindows = Math.floor(def.d / 2.5);
        for (let w = 0; w < sideWindows; w++) {
          const r = Math.random();
          const wmat = r > 0.7 ? litWindowMat : r > 0.4 ? dimWindowMat : darkWindowMat;
          const wz = (w - (sideWindows - 1) / 2) * 2.5;
          const wy = f * 3.5 + 2.5;

          const winL = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.8), wmat);
          winL.position.set(-def.w / 2 - 0.05, wy, wz);
          winL.rotation.y = -Math.PI / 2;
          group.add(winL);

          const winR = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 1.8), wmat);
          winR.position.set(def.w / 2 + 0.05, wy, wz);
          winR.rotation.y = Math.PI / 2;
          group.add(winR);
        }
      }

      // Rooftop AC unit (random)
      if (Math.random() > 0.4) {
        const ac = new THREE.Mesh(
          new THREE.BoxGeometry(1.5, 1, 1.5),
          new THREE.MeshStandardMaterial({ color: 0x555555 })
        );
        ac.position.set((Math.random() - 0.5) * def.w * 0.5, def.h + 0.5, (Math.random() - 0.5) * def.d * 0.5);
        group.add(ac);
      }

      group.position.set(def.x, 0, def.z);
      this.scene.add(group);

      this.buildings.push({
        mesh: group,
        bounds: { x: def.x, z: def.z, w: def.w + 2, d: def.d + 2, h: def.h + 2 }
      });
    });
  }

  _createEmergencyVehicles() {
    const vehicleMat = new THREE.MeshStandardMaterial({ color: 0xcc0000, roughness: 0.5 });
    const ambulanceMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.4 });

    // Fire trucks near burning building
    const vehicleConfigs = [
      { x: -14, z: 12, rot: 0.3, type: 'fire' },
      { x: 12, z: -14, rot: 1.2, type: 'fire' },
      { x: -18, z: -8, rot: -0.5, type: 'ambulance' },
      { x: 15, z: 15, rot: 2.1, type: 'ambulance' },
    ];

    vehicleConfigs.forEach(cfg => {
      const group = new THREE.Group();
      const isFire = cfg.type === 'fire';
      const bodyW = isFire ? 2 : 1.8;
      const bodyH = isFire ? 1.8 : 1.5;
      const bodyD = isFire ? 5.5 : 4;

      // Body
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(bodyW, bodyH, bodyD),
        isFire ? vehicleMat : ambulanceMat
      );
      body.position.y = bodyH / 2 + 0.3;
      body.castShadow = true;
      group.add(body);

      // Cab
      const cabMat = new THREE.MeshStandardMaterial({
        color: isFire ? 0xaa0000 : 0xcccccc, roughness: 0.4
      });
      const cab = new THREE.Mesh(new THREE.BoxGeometry(bodyW - 0.1, 1, 1.5), cabMat);
      cab.position.set(0, bodyH + 0.3, bodyD / 2 - 0.8);
      group.add(cab);

      // Wheels
      const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
      [[-bodyW / 2 - 0.05, bodyD / 2 - 0.8], [-bodyW / 2 - 0.05, -bodyD / 2 + 0.8],
       [bodyW / 2 + 0.05, bodyD / 2 - 0.8], [bodyW / 2 + 0.05, -bodyD / 2 + 0.8]].forEach(([wx, wz]) => {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.15, 8), wheelMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(wx, 0.3, wz);
        group.add(wheel);
      });

      // Light bar
      const barMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
      const bar = new THREE.Mesh(new THREE.BoxGeometry(bodyW + 0.2, 0.25, 0.8), barMat);
      bar.position.set(0, bodyH + 0.8, bodyD / 2 - 0.5);
      group.add(bar);

      // Red and blue lights
      const redLight = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0xff0000 })
      );
      redLight.position.set(-0.4, bodyH + 1, bodyD / 2 - 0.5);
      group.add(redLight);

      const blueLight = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0x0044ff })
      );
      blueLight.position.set(0.4, bodyH + 1, bodyD / 2 - 0.5);
      group.add(blueLight);

      // Point lights for glow
      const redGlow = new THREE.PointLight(0xff0000, 2, 12);
      redGlow.position.copy(redLight.position);
      group.add(redGlow);
      const blueGlow = new THREE.PointLight(0x0044ff, 2, 12);
      blueGlow.position.copy(blueLight.position);
      group.add(blueGlow);

      this.flashingLights.push(
        { mesh: redLight, light: redGlow, type: 'emergency_red', speed: 3 + Math.random() * 0.5, phase: Math.random() * Math.PI },
        { mesh: blueLight, light: blueGlow, type: 'emergency_blue', speed: 3 + Math.random() * 0.5, phase: Math.random() * Math.PI + Math.PI }
      );

      group.position.set(cfg.x, 0, cfg.z);
      group.rotation.y = cfg.rot;
      this.scene.add(group);
    });
  }

  _createStreetLights() {
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 0.6 });
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xffdd88 });

    // Along roads
    const positions = [];
    for (let i = -100; i <= 100; i += 25) {
      positions.push([-24, i], [-36, i], [24, i], [36, i]);
    }

    positions.forEach(([x, z]) => {
      // Pole
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 6, 6), poleMat);
      pole.position.set(x, 3, z);
      this.scene.add(pole);

      // Arm
      const arm = new THREE.Mesh(new THREE.BoxGeometry(2, 0.08, 0.08), poleMat);
      arm.position.set(x + (x > 0 ? -1 : 1), 5.9, z);
      this.scene.add(arm);

      // Lamp
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 6), glowMat);
      lamp.position.set(x + (x > 0 ? -2 : 2), 5.8, z);
      this.scene.add(lamp);

      // Soft warm light
      const light = new THREE.PointLight(0xffdd88, 0.6, 18);
      light.position.copy(lamp.position);
      this.scene.add(light);
    });
  }

  _createDistantSkyline() {
    // Silhouette buildings at far edges for depth
    const silhouetteMat = new THREE.MeshBasicMaterial({ color: 0x0a0a12 });

    for (let i = 0; i < 40; i++) {
      const angle = (i / 40) * Math.PI * 2;
      const radius = 150 + Math.random() * 30;
      const h = 10 + Math.random() * 40;
      const w = 5 + Math.random() * 12;
      const d = 5 + Math.random() * 8;

      const building = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), silhouetteMat);
      building.position.set(
        Math.cos(angle) * radius,
        h / 2,
        Math.sin(angle) * radius
      );
      building.rotation.y = Math.random() * Math.PI;
      this.scene.add(building);
    }
  }

  updateFlashingLights(elapsedTime) {
    this.flashingLights.forEach(fl => {
      const phase = fl.phase || 0;
      const t = elapsedTime * fl.speed + phase;

      if (fl.type === 'blink') {
        const on = Math.sin(t * Math.PI) > 0;
        fl.mesh.material.opacity = on ? 1 : 0.1;
        fl.mesh.material.transparent = true;
      } else if (fl.type === 'emergency_red' || fl.type === 'emergency_blue') {
        const intensity = Math.max(0, Math.sin(t * Math.PI * 2));
        fl.mesh.material.opacity = 0.2 + intensity * 0.8;
        fl.mesh.material.transparent = true;
        if (fl.light) {
          fl.light.intensity = intensity * 3;
        }
      }
    });
  }
}

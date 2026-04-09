import * as THREE from 'three';

export class ArcticWorld {
  constructor(scene) {
    this.scene = scene;
    this.buildings = [];
    this.survivors = [];
    this._snowParticles = null;
    this._iceFloes = [];
    this._iceberg = [];
    this._windForce = new THREE.Vector3();
    this._windTimer = 0;
    this._icingDamage = false;
  }

  build() {
    this._setupLighting();
    this._createOcean();
    this._createIceFloes();
    this._createIcebergs();
    this._createSurvivors();
    this._createSnow();
    this._createDistantMountains();
    return { buildings: this.buildings, survivors: this.survivors };
  }

  _setupLighting() {
    // Cold, overcast arctic light
    this._ambientLight = new THREE.AmbientLight(0x8899bb, 0.6);
    this.scene.add(this._ambientLight);

    this._sunLight = new THREE.DirectionalLight(0xddeeff, 0.5);
    this._sunLight.position.set(20, 30, 40);
    this._sunLight.castShadow = true;
    this.scene.add(this._sunLight);

    // Cold hemisphere
    const hemi = new THREE.HemisphereLight(0x8899cc, 0x445566, 0.4);
    this.scene.add(hemi);

    // Whiteout fog
    this.scene.fog = new THREE.FogExp2(0xccddee, 0.004);
  }

  _createOcean() {
    // Dark arctic ocean
    const oceanGeo = new THREE.PlaneGeometry(400, 400, 40, 40);
    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x1a3344,
      roughness: 0.3,
      metalness: 0.4,
      transparent: true,
      opacity: 0.9,
    });
    this._ocean = new THREE.Mesh(oceanGeo, oceanMat);
    this._ocean.rotation.x = -Math.PI / 2;
    this._ocean.position.y = -0.5;
    this.scene.add(this._ocean);
  }

  _createIceFloes() {
    // Large ice platforms — these are the "buildings" for collision
    const iceMat = new THREE.MeshStandardMaterial({
      color: 0xddeeff, roughness: 0.4, metalness: 0.1
    });
    const iceDarkMat = new THREE.MeshStandardMaterial({
      color: 0xaabbcc, roughness: 0.5, metalness: 0.1
    });

    const floeDefs = [
      { x: 0, z: 0, w: 20, d: 18, h: 1.5 },
      { x: -35, z: -25, w: 16, d: 14, h: 1.2 },
      { x: 30, z: 20, w: 18, d: 16, h: 1.4 },
      { x: -25, z: 35, w: 14, d: 12, h: 1.0 },
      { x: 40, z: -30, w: 15, d: 14, h: 1.3 },
      { x: -50, z: 10, w: 12, d: 10, h: 0.8 },
      { x: 10, z: -50, w: 14, d: 12, h: 1.1 },
      { x: 55, z: 0, w: 10, d: 10, h: 0.9 },
      // Smaller floes for detail
      { x: -15, z: -45, w: 8, d: 6, h: 0.6 },
      { x: 45, z: 40, w: 9, d: 7, h: 0.7 },
      { x: -55, z: -35, w: 7, d: 8, h: 0.5 },
      { x: 20, z: 50, w: 10, d: 8, h: 0.8 },
    ];

    floeDefs.forEach((def, i) => {
      // Irregular ice shape
      const geo = new THREE.CylinderGeometry(
        Math.max(def.w, def.d) * 0.45,
        Math.max(def.w, def.d) * 0.5,
        def.h, 8 + Math.floor(Math.random() * 4)
      );
      const mat = i < 8 ? iceMat : iceDarkMat;
      const floe = new THREE.Mesh(geo, mat);
      floe.position.set(def.x, def.h / 2, def.z);
      floe.rotation.y = Math.random() * Math.PI;
      floe.castShadow = true;
      floe.receiveShadow = true;
      this.scene.add(floe);

      // Snow layer on top
      const snowGeo = new THREE.CylinderGeometry(
        Math.max(def.w, def.d) * 0.43, Math.max(def.w, def.d) * 0.43,
        0.15, 8
      );
      const snowMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 });
      const snow = new THREE.Mesh(snowGeo, snowMat);
      snow.position.set(def.x, def.h + 0.07, def.z);
      snow.rotation.y = floe.rotation.y;
      this.scene.add(snow);

      this.buildings.push({
        mesh: floe,
        bounds: { x: def.x, z: def.z, w: def.w, d: def.d, h: def.h + 1 }
      });

      this._iceFloes.push({
        mesh: floe,
        snow,
        def,
        driftX: (Math.random() - 0.5) * 0.3,
        driftZ: (Math.random() - 0.5) * 0.3,
        bobPhase: Math.random() * Math.PI * 2,
      });
    });
  }

  _createIcebergs() {
    // Tall icebergs as obstacles and scenery
    const bergMat = new THREE.MeshStandardMaterial({
      color: 0xbbddff, roughness: 0.3, metalness: 0.15,
      transparent: true, opacity: 0.85,
    });

    const bergDefs = [
      { x: -70, z: -60, h: 15, r: 5 },
      { x: 70, z: 50, h: 20, r: 6 },
      { x: -60, z: 60, h: 12, r: 4 },
      { x: 80, z: -40, h: 18, r: 5.5 },
      { x: 0, z: -80, h: 14, r: 4.5 },
      { x: -80, z: -20, h: 10, r: 3.5 },
    ];

    bergDefs.forEach(def => {
      const geo = new THREE.DodecahedronGeometry(def.r, 1);
      geo.scale(1, def.h / (def.r * 2), 1);
      const berg = new THREE.Mesh(geo, bergMat);
      berg.position.set(def.x, def.h * 0.3, def.z);
      berg.rotation.y = Math.random() * Math.PI;
      berg.castShadow = true;
      this.scene.add(berg);

      this.buildings.push({
        mesh: berg,
        bounds: { x: def.x, z: def.z, w: def.r * 2 + 2, d: def.r * 2 + 2, h: def.h * 0.7 }
      });
    });
  }

  _createSurvivors() {
    const RESCUE_RADIUS = 6;
    // Survivors stranded on the larger ice floes
    const survivorFloes = [
      { x: 0, z: 0, y: 1.7 },
      { x: -35, z: -25, y: 1.4 },
      { x: 30, z: 20, y: 1.6 },
      { x: -25, z: 35, y: 1.2 },
      { x: 40, z: -30, y: 1.5 },
    ];
    const colors = [0xff6600, 0xff2244, 0x44bbff, 0xffff44, 0x44ff88];

    survivorFloes.forEach((pos, i) => {
      const group = new THREE.Group();
      // Bright colored suits — high visibility against white
      const bodyMat = new THREE.MeshStandardMaterial({
        color: colors[i], roughness: 0.4, emissive: colors[i], emissiveIntensity: 0.2
      });

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

      const ring = new THREE.Mesh(
        new THREE.RingGeometry(RESCUE_RADIUS - 0.3, RESCUE_RADIUS, 32),
        new THREE.MeshBasicMaterial({ color: 0xff4400, side: THREE.DoubleSide, transparent: true, opacity: 0.5 })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.15;
      group.add(ring);

      const innerRing = new THREE.Mesh(
        new THREE.RingGeometry(0.5, 0.8, 16),
        new THREE.MeshBasicMaterial({ color: 0xff6600, side: THREE.DoubleSide, transparent: true, opacity: 0.6 })
      );
      innerRing.rotation.x = -Math.PI / 2;
      innerRing.position.y = 0.2;
      group.add(innerRing);

      // Bright orange flare — critical for visibility in whiteout
      const beacon = new THREE.PointLight(0xff4400, 4, 40);
      beacon.position.y = 2;
      group.add(beacon);

      const flareMat = new THREE.MeshBasicMaterial({
        color: 0xff4400, transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false,
      });
      const flare1 = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 20), flareMat.clone());
      flare1.position.y = 11;
      group.add(flare1);
      const flare2 = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 20), flareMat.clone());
      flare2.position.y = 11;
      flare2.rotation.y = Math.PI / 2;
      group.add(flare2);

      const flareLight = new THREE.PointLight(0xff4400, 3, 40);
      flareLight.position.y = 8;
      group.add(flareLight);

      group.position.set(pos.x, pos.y, pos.z);
      group.userData = {
        rescued: false, index: i, arms: [arm1, arm2],
        beacon, ring, innerRing, flare1, flare2, flareLight,
        floeIndex: i,
      };
      this.scene.add(group);
      this.survivors.push(group);
    });
  }

  _createSnow() {
    const snowCount = 4000;
    const positions = new Float32Array(snowCount * 3);
    for (let i = 0; i < snowCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 250;
      positions[i * 3 + 1] = Math.random() * 60;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 250;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.3,
      transparent: true,
      opacity: 0.8,
    });
    this._snowParticles = new THREE.Points(geo, mat);
    this.scene.add(this._snowParticles);
  }

  _createDistantMountains() {
    // Snowy mountain silhouettes in background
    const mountMat = new THREE.MeshStandardMaterial({ color: 0x99aabb, roughness: 0.8, flatShading: true });
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const dist = 130 + Math.random() * 30;
      const h = 20 + Math.random() * 35;
      const r = 15 + Math.random() * 20;
      const mount = new THREE.Mesh(new THREE.ConeGeometry(r, h, 6), mountMat);
      mount.position.set(Math.cos(angle) * dist, h * 0.3, Math.sin(angle) * dist);
      this.scene.add(mount);

      // Snow cap
      const capMat = new THREE.MeshStandardMaterial({ color: 0xeeeeff, roughness: 0.7, flatShading: true });
      const cap = new THREE.Mesh(new THREE.ConeGeometry(r * 0.5, h * 0.3, 6), capMat);
      cap.position.set(Math.cos(angle) * dist, h * 0.65, Math.sin(angle) * dist);
      this.scene.add(cap);
    }
  }

  update(dt, helicopter, elapsedTime) {
    // Blizzard wind gusts
    this._windTimer -= dt;
    if (this._windTimer <= 0) {
      this._windTimer = 5 + Math.random() * 8;
      const angle = Math.random() * Math.PI * 2;
      const force = 4 + Math.random() * 6;
      this._windForce.set(Math.cos(angle) * force, 0, Math.sin(angle) * force);
    }
    const windDecay = this._windTimer < 2 ? this._windTimer / 2 : 1;
    helicopter.velocity.x += this._windForce.x * windDecay * dt;
    helicopter.velocity.z += this._windForce.z * windDecay * dt;

    // Icing damage — helicopter slowly loses integrity unless moving fast
    const speed = Math.sqrt(helicopter.velocity.x ** 2 + helicopter.velocity.z ** 2);
    if (speed < 5) {
      helicopter.integrity -= 1.5 * dt; // Slow icing damage
    }

    // Ice floes drift slowly apart
    for (let i = 0; i < this._iceFloes.length; i++) {
      const floe = this._iceFloes[i];
      floe.mesh.position.x += floe.driftX * dt;
      floe.mesh.position.z += floe.driftZ * dt;
      floe.snow.position.x = floe.mesh.position.x;
      floe.snow.position.z = floe.mesh.position.z;

      // Gentle bob
      const bob = Math.sin(elapsedTime * 0.8 + floe.bobPhase) * 0.1;
      floe.mesh.position.y = floe.def.h / 2 + bob;
      floe.snow.position.y = floe.def.h + 0.07 + bob;

      // Update collision bounds
      this.buildings[i].bounds.x = floe.mesh.position.x;
      this.buildings[i].bounds.z = floe.mesh.position.z;

      // Move survivors with their floe
      if (i < this.survivors.length) {
        const s = this.survivors[i];
        if (!s.userData.rescued) {
          s.position.x = floe.mesh.position.x;
          s.position.z = floe.mesh.position.z;
          s.position.y = floe.def.h + 0.2 + bob;
        }
      }
    }

    // Snow particles — driven by wind
    if (this._snowParticles) {
      const pos = this._snowParticles.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i);
        y -= (8 + Math.random() * 4) * dt;

        // Wind pushes snow sideways
        let x = pos.getX(i) + this._windForce.x * 0.3 * dt;
        let z = pos.getZ(i) + this._windForce.z * 0.3 * dt;

        // Swirl
        x += Math.sin(elapsedTime * 2 + i * 0.01) * 0.5 * dt;
        z += Math.cos(elapsedTime * 1.5 + i * 0.01) * 0.5 * dt;

        if (y < -1) {
          y = 40 + Math.random() * 20;
          x = (Math.random() - 0.5) * 250;
          z = (Math.random() - 0.5) * 250;
        }
        pos.setX(i, x);
        pos.setY(i, y);
        pos.setZ(i, z);
      }
      pos.needsUpdate = true;
    }

    // Fog thickens over time (blizzard intensifies)
    if (this.scene.fog) {
      this.scene.fog.density = 0.004 + elapsedTime * 0.00005;
    }

    // Ocean waves
    if (this._ocean) {
      const opos = this._ocean.geometry.attributes.position;
      for (let i = 0; i < opos.count; i++) {
        const x = opos.getX(i);
        const z = opos.getZ(i);
        const wave = Math.sin(x * 0.05 + elapsedTime * 1.2) * 0.4 +
                     Math.sin(z * 0.04 + elapsedTime * 0.9) * 0.3;
        opos.setY(i, wave);
      }
      opos.needsUpdate = true;
    }
  }

  getHelipadPosition() {
    return new THREE.Vector3(70, 8.3, -60);
  }
}

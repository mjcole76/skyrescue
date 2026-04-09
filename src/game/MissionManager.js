import * as THREE from 'three';
import { MISSIONS, getStars, saveProgress } from '../missions/MissionConfig.js';
import { CityBuilder } from '../world/CityBuilder.js';
import { HospitalPad } from '../world/HospitalPad.js';
import { createSurvivors } from '../entities/Survivor.js';
import { MountainWorld } from '../missions/MountainWorld.js';
import { FloodWorld } from '../missions/FloodWorld.js';
import { HighwayWorld } from '../missions/HighwayWorld.js';
import { ArcticWorld } from '../missions/ArcticWorld.js';
import { ParticleSystem } from '../systems/ParticleSystem.js';

export class MissionManager {
  constructor(scene) {
    this.scene = scene;
    this.currentMission = null;
    this.currentMissionIndex = 0;

    // Track objects we add so we can remove them cleanly
    this._addedObjects = [];
    this._missionWorld = null;
    this._cityBuilder = null;
    this.particleSystem = null;
    this.buildings = [];
    this.survivors = [];
    this.hospitalPad = null;

    // Helipad beacon elements
    this._helipadBeacon = null;
    this._helipadBeam = null;
    this._helipadLight = null;
  }

  // Wrapper to track scene additions
  _add(obj) {
    this.scene.add(obj);
    this._addedObjects.push(obj);
  }

  getMissionConfig() {
    return MISSIONS[this.currentMissionIndex];
  }

  loadMission(index) {
    this._clearWorld();

    this.currentMissionIndex = index;
    this.currentMission = MISSIONS[index];
    this._missionWorld = null;
    this._cityBuilder = null;

    if (this.currentMission.id === 'burning_building') {
      this._loadBurningBuilding();
    } else if (this.currentMission.id === 'mountain_rescue') {
      this._loadMountainRescue();
    } else if (this.currentMission.id === 'flood_rescue') {
      this._loadFloodRescue();
    } else if (this.currentMission.id === 'highway_pileup') {
      this._loadHighwayPileup();
    } else if (this.currentMission.id === 'arctic_rescue') {
      this._loadArcticRescue();
    }

    // Add helipad beacon on all missions
    this._createHelipadBeacon();

    return {
      buildings: this.buildings,
      survivors: this.survivors,
      hospitalPad: this.hospitalPad,
      particleSystem: this.particleSystem,
    };
  }

  _loadBurningBuilding() {
    // CityBuilder adds to scene internally, so we patch its scene.add
    const origAdd = this.scene.add.bind(this.scene);
    const tracked = this._addedObjects;
    this.scene.add = function (...args) {
      args.forEach(a => tracked.push(a));
      return origAdd(...args);
    };

    const cityBuilder = new CityBuilder(this.scene);
    this.buildings = cityBuilder.build();
    this._cityBuilder = cityBuilder;

    this.hospitalPad = new HospitalPad(this.scene);
    this.buildings.push({ mesh: this.hospitalPad.group, bounds: this.hospitalPad.bounds });

    this.survivors = createSurvivors(this.scene);
    this.particleSystem = new ParticleSystem(this.scene);

    // Restore original add
    this.scene.add = origAdd;

    this.scene.fog = new THREE.FogExp2(0x2a2030, 0.0025);
  }

  _loadMountainRescue() {
    const origAdd = this.scene.add.bind(this.scene);
    const tracked = this._addedObjects;
    this.scene.add = function (...args) {
      args.forEach(a => tracked.push(a));
      return origAdd(...args);
    };

    const world = new MountainWorld(this.scene);
    const result = world.build();
    this._missionWorld = world;

    this.buildings = result.buildings;
    this.survivors = result.survivors;

    this.hospitalPad = new HospitalPad(this.scene);
    this.hospitalPad.group.position.set(60, 0, -50);
    this.hospitalPad.position.set(60, 8.3, -50);
    this.hospitalPad.bounds = { x: 60, z: -50, w: 22, d: 18, h: 10 };
    this.buildings.push({ mesh: this.hospitalPad.group, bounds: this.hospitalPad.bounds });

    this.scene.add = origAdd;

    this.particleSystem = null;
    this.scene.fog = new THREE.FogExp2(0x88aacc, 0.003);
  }

  _loadFloodRescue() {
    const origAdd = this.scene.add.bind(this.scene);
    const tracked = this._addedObjects;
    this.scene.add = function (...args) {
      args.forEach(a => tracked.push(a));
      return origAdd(...args);
    };

    const world = new FloodWorld(this.scene);
    const result = world.build();
    this._missionWorld = world;

    this.buildings = result.buildings;
    this.survivors = result.survivors;

    this.hospitalPad = new HospitalPad(this.scene);
    this.hospitalPad.group.position.set(70, 0, -55);
    this.hospitalPad.position.set(70, 8.3, -55);
    this.hospitalPad.bounds = { x: 70, z: -55, w: 22, d: 18, h: 10 };
    this.buildings.push({ mesh: this.hospitalPad.group, bounds: this.hospitalPad.bounds });

    this.scene.add = origAdd;

    this.particleSystem = null;
    this.scene.fog = new THREE.FogExp2(0x334455, 0.005);
  }

  _loadHighwayPileup() {
    const origAdd = this.scene.add.bind(this.scene);
    const tracked = this._addedObjects;
    this.scene.add = function (...args) {
      args.forEach(a => tracked.push(a));
      return origAdd(...args);
    };

    const world = new HighwayWorld(this.scene);
    const result = world.build();
    this._missionWorld = world;

    this.buildings = result.buildings;
    this.survivors = result.survivors;

    this.hospitalPad = new HospitalPad(this.scene);
    this.hospitalPad.group.position.set(0, 0, -80);
    this.hospitalPad.position.set(0, 8.3, -80);
    this.hospitalPad.bounds = { x: 0, z: -80, w: 22, d: 18, h: 10 };
    this.buildings.push({ mesh: this.hospitalPad.group, bounds: this.hospitalPad.bounds });

    this.scene.add = origAdd;

    this.particleSystem = null;
    this.scene.fog = new THREE.FogExp2(0x080812, 0.006);
  }

  _loadArcticRescue() {
    const origAdd = this.scene.add.bind(this.scene);
    const tracked = this._addedObjects;
    this.scene.add = function (...args) {
      args.forEach(a => tracked.push(a));
      return origAdd(...args);
    };

    const world = new ArcticWorld(this.scene);
    const result = world.build();
    this._missionWorld = world;

    this.buildings = result.buildings;
    this.survivors = result.survivors;

    this.hospitalPad = new HospitalPad(this.scene);
    this.hospitalPad.group.position.set(70, 0, -60);
    this.hospitalPad.position.set(70, 8.3, -60);
    this.hospitalPad.bounds = { x: 70, z: -60, w: 22, d: 18, h: 10 };
    this.buildings.push({ mesh: this.hospitalPad.group, bounds: this.hospitalPad.bounds });

    this.scene.add = origAdd;

    this.particleSystem = null;
    // Fog set by ArcticWorld._setupLighting — don't override
  }

  _createHelipadBeacon() {
    if (!this.hospitalPad) return;
    const pos = this.hospitalPad.position;

    // Tall green beam above helipad — visible from anywhere
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x00ff66,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const beam1 = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 60), beamMat);
    beam1.position.set(pos.x, pos.y + 30, pos.z);
    this._add(beam1);

    const beam2 = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 60), beamMat);
    beam2.position.set(pos.x, pos.y + 30, pos.z);
    beam2.rotation.y = Math.PI / 2;
    this._add(beam2);

    // Bright point light above pad
    const padLight = new THREE.PointLight(0x00ff66, 3, 50);
    padLight.position.set(pos.x, pos.y + 5, pos.z);
    this._add(padLight);

    // Pulsing ring on helipad
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x00ff66,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(7, 8, 32), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(pos.x, pos.y + 0.2, pos.z);
    this._add(ring);

    this._helipadBeam = [beam1, beam2];
    this._helipadLight = padLight;
    this._helipadBeacon = ring;
  }

  _clearWorld() {
    // Remove only tracked objects — fast, no traversal
    for (let i = 0; i < this._addedObjects.length; i++) {
      this.scene.remove(this._addedObjects[i]);
    }
    this._addedObjects = [];

    this.buildings = [];
    this.survivors = [];
    this.hospitalPad = null;
    this.particleSystem = null;
    this._missionWorld = null;
    this._cityBuilder = null;
    this._helipadBeacon = null;
    this._helipadBeam = null;
    this._helipadLight = null;
  }

  update(dt, helicopter, elapsedTime) {
    if (this._missionWorld) {
      this._missionWorld.update(dt, helicopter, elapsedTime);
    }
    if (this._cityBuilder) {
      this._cityBuilder.updateFlashingLights(elapsedTime);
    }

    // Animate helipad beacon
    if (this._helipadBeacon) {
      const pulse = (Math.sin(elapsedTime * 2) + 1) * 0.5;
      this._helipadBeacon.material.opacity = 0.2 + pulse * 0.3;
      const scale = 1 + pulse * 0.5;
      this._helipadBeacon.scale.setScalar(scale);
    }
    if (this._helipadBeam) {
      const flicker = 0.12 + Math.sin(elapsedTime * 1.5) * 0.06;
      this._helipadBeam[0].material.opacity = flicker;
      this._helipadBeam[1].material.opacity = flicker;
    }
    if (this._helipadLight) {
      this._helipadLight.intensity = 2 + Math.sin(elapsedTime * 2) * 1.5;
    }
  }

  completeMission(score) {
    const config = this.currentMission;
    const stars = getStars(score, config.starThresholds);

    if (stars > config.bestStars) {
      config.bestStars = stars;
    }

    const nextIndex = this.currentMissionIndex + 1;
    if (nextIndex < MISSIONS.length && stars > 0) {
      MISSIONS[nextIndex].unlocked = true;
    }

    saveProgress();
    return stars;
  }

  getStartPosition() {
    if (this.hospitalPad) {
      return new THREE.Vector3(
        this.hospitalPad.position.x,
        this.hospitalPad.position.y + 4,
        this.hospitalPad.position.z
      );
    }
    return new THREE.Vector3(75, 12, -60);
  }
}

import * as THREE from 'three';
import { MISSIONS, getStars, saveProgress } from '../missions/MissionConfig.js';
import { CityBuilder } from '../world/CityBuilder.js';
import { HospitalPad } from '../world/HospitalPad.js';
import { createSurvivors } from '../entities/Survivor.js';
import { MountainWorld } from '../missions/MountainWorld.js';
import { FloodWorld } from '../missions/FloodWorld.js';
import { ParticleSystem } from '../systems/ParticleSystem.js';

export class MissionManager {
  constructor(scene) {
    this.scene = scene;
    this.currentMission = null;
    this.currentMissionIndex = 0;

    // Active world objects (cleared on mission switch)
    this._worldObjects = [];
    this._missionWorld = null;  // MountainWorld or FloodWorld instance
    this.particleSystem = null;
    this.buildings = [];
    this.survivors = [];
    this.hospitalPad = null;
  }

  getMissionConfig() {
    return MISSIONS[this.currentMissionIndex];
  }

  loadMission(index) {
    // Clear previous mission objects from scene
    this._clearWorld();

    this.currentMissionIndex = index;
    this.currentMission = MISSIONS[index];
    this._missionWorld = null;

    if (this.currentMission.id === 'burning_building') {
      this._loadBurningBuilding();
    } else if (this.currentMission.id === 'mountain_rescue') {
      this._loadMountainRescue();
    } else if (this.currentMission.id === 'flood_rescue') {
      this._loadFloodRescue();
    }

    return {
      buildings: this.buildings,
      survivors: this.survivors,
      hospitalPad: this.hospitalPad,
      particleSystem: this.particleSystem,
    };
  }

  _loadBurningBuilding() {
    const cityBuilder = new CityBuilder(this.scene);
    this.buildings = cityBuilder.build();
    this._cityBuilder = cityBuilder;

    this.hospitalPad = new HospitalPad(this.scene);
    this.buildings.push({ mesh: this.hospitalPad.group, bounds: this.hospitalPad.bounds });

    this.survivors = createSurvivors(this.scene);
    this.particleSystem = new ParticleSystem(this.scene);

    // Setup dusk fog
    this.scene.fog = new THREE.FogExp2(0x201825, 0.004);
  }

  _loadMountainRescue() {
    const world = new MountainWorld(this.scene);
    const result = world.build();
    this._missionWorld = world;
    this._cityBuilder = null;

    this.buildings = result.buildings;
    this.survivors = result.survivors;

    // Hospital pad at safe area
    this.hospitalPad = new HospitalPad(this.scene);
    this.hospitalPad.group.position.set(60, 0, -50);
    this.hospitalPad.position.set(60, 8.3, -50);
    this.hospitalPad.bounds = { x: 60, z: -50, w: 22, d: 18, h: 10 };
    this.buildings.push({ mesh: this.hospitalPad.group, bounds: this.hospitalPad.bounds });

    this.particleSystem = null; // No fire particles in mountain

    // Mountain fog — lighter, grey-blue
    this.scene.fog = new THREE.FogExp2(0x88aacc, 0.003);
  }

  _loadFloodRescue() {
    const world = new FloodWorld(this.scene);
    const result = world.build();
    this._missionWorld = world;
    this._cityBuilder = null;

    this.buildings = result.buildings;
    this.survivors = result.survivors;

    // Hospital pad on elevated ground
    this.hospitalPad = new HospitalPad(this.scene);
    this.hospitalPad.group.position.set(70, 0, -55);
    this.hospitalPad.position.set(70, 8.3, -55);
    this.hospitalPad.bounds = { x: 70, z: -55, w: 22, d: 18, h: 10 };
    this.buildings.push({ mesh: this.hospitalPad.group, bounds: this.hospitalPad.bounds });

    this.particleSystem = null; // No fire particles in flood

    // Storm fog — dark, dense
    this.scene.fog = new THREE.FogExp2(0x334455, 0.005);
  }

  _clearWorld() {
    // Remove all objects except lights and sky
    const toRemove = [];
    this.scene.traverse(child => {
      if (child.isLight || child === this.scene) return;
      if (child.type === 'Scene') return;
      // Keep the sky sphere (BackSide material)
      if (child.isMesh && child.material && child.material.side === THREE.BackSide) return;
      toRemove.push(child);
    });

    // Only remove top-level children
    const topLevel = [];
    this.scene.children.forEach(child => {
      if (child.isLight) return;
      if (child.isMesh && child.material && child.material.side === THREE.BackSide) return;
      topLevel.push(child);
    });
    topLevel.forEach(obj => this.scene.remove(obj));

    this.buildings = [];
    this.survivors = [];
    this.hospitalPad = null;
    this.particleSystem = null;
    this._missionWorld = null;
    this._cityBuilder = null;
  }

  update(dt, helicopter, elapsedTime) {
    // Mission-specific updates
    if (this._missionWorld) {
      this._missionWorld.update(dt, helicopter, elapsedTime);
    }
    if (this._cityBuilder) {
      this._cityBuilder.updateFlashingLights(elapsedTime);
    }
  }

  completeMission(score) {
    const config = this.currentMission;
    const stars = getStars(score, config.starThresholds);

    if (stars > config.bestStars) {
      config.bestStars = stars;
    }

    // Unlock next mission
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

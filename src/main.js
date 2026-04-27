import * as THREE from 'three';
import { setupEnvironment } from './world/Environment.js';
import { Helicopter } from './entities/Helicopter.js';
import { updateSurvivorAnimations } from './entities/Survivor.js';
import { CollisionSystem } from './systems/CollisionSystem.js';
import { RescueSystem } from './systems/RescueSystem.js';
import { ChaseCamera } from './camera/ChaseCamera.js';
import { HUD } from './ui/HUD.js';
import { Minimap } from './ui/Minimap.js';
import { InputManager } from './game/InputManager.js';
import { GameState } from './game/GameState.js';
import { AudioManager } from './systems/AudioManager.js';
import { PostProcessing } from './systems/PostProcessing.js';
import { MissionManager } from './game/MissionManager.js';
import { MISSIONS, loadProgress, getStars } from './missions/MissionConfig.js';
import { TouchControls } from './ui/TouchControls.js';
import { RadioChatter } from './ui/RadioChatter.js';
import { HELICOPTER } from './utils/constants.js';

// Detect mobile for performance scaling
const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || (window.innerWidth < 768);

// Core Three.js
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 500);
const renderer = new THREE.WebGLRenderer({ antialias: !isMobile });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, isMobile ? 1.5 : 2));
renderer.shadowMap.enabled = !isMobile;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.5;
document.body.appendChild(renderer.domElement);

const clock = new THREE.Clock();

// Environment (persistent — sky + lights)
setupEnvironment(scene);

// Helicopter (persistent — reused across missions)
const helicopter = new Helicopter(scene);

// Mission manager
const missionManager = new MissionManager(scene);

// Systems (re-created per mission)
let collisionSystem = null;
let rescueSystem = null;
const chaseCamera = new ChaseCamera(camera);
const postProcessing = new PostProcessing(renderer, scene, camera);

// UI & Audio
const hud = new HUD();
const minimap = new Minimap();
const input = new InputManager();
const gameState = new GameState();
const audio = new AudioManager();
const touchControls = new TouchControls();
const radio = new RadioChatter(audio);

let lastMuteState = false;
let lastBeepTime = 0;
let timeWarning60 = false;
let timeWarning30 = false;
let damageWarningCooldown = 0;

// Load saved progress
loadProgress();

// ── Screen elements ──
const startScreen = document.getElementById('start-screen');
const missionScreen = document.getElementById('mission-screen');
const endScreen = document.getElementById('end-screen');
const endTitle = document.getElementById('end-title');
const endStats = document.getElementById('end-stats');
const missionCards = document.getElementById('mission-cards');

document.getElementById('btn-start').addEventListener('click', showMissionSelect);
document.getElementById('btn-restart').addEventListener('click', () => {
  endScreen.style.display = 'none';
  launchMission(missionManager.currentMissionIndex);
});
document.getElementById('btn-back-to-menu').addEventListener('click', () => {
  missionScreen.style.display = 'none';
  startScreen.style.display = 'flex';
});

// Load mission 1 for the menu background
loadMissionBackground(0);

// Initialize passengers UI
hud.updatePassengers(0);

// Window resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  postProcessing.resize(window.innerWidth, window.innerHeight);
});

// ── Mission Select UI ──
function showMissionSelect() {
  startScreen.style.display = 'none';
  missionScreen.style.display = 'flex';
  renderMissionCards();
}

function renderMissionCards() {
  missionCards.innerHTML = '';
  MISSIONS.forEach((m, i) => {
    const card = document.createElement('div');
    card.className = 'mission-card' + (m.unlocked ? '' : ' locked');

    const starsHtml = [1, 2, 3].map(s =>
      `<span class="mission-star${s <= m.bestStars ? ' earned' : ''}">\u2605</span>`
    ).join('');

    const diffLabels = ['EASY', 'MEDIUM', 'HARD', 'EXTREME'];

    card.innerHTML = `
      <div class="mission-card-name">${m.name}</div>
      <div class="mission-card-subtitle">${m.subtitle}</div>
      <div class="mission-card-desc">${m.description}</div>
      <div class="mission-card-meta">
        <div class="mission-difficulty">${diffLabels[m.difficulty - 1]}</div>
        <div class="mission-stars">${starsHtml}</div>
      </div>
      ${!m.unlocked ? '<div class="mission-locked-label">LOCKED</div>' : ''}
    `;

    if (m.unlocked) {
      card.addEventListener('click', () => {
        missionScreen.style.display = 'none';
        launchMission(i);
      });
    }

    missionCards.appendChild(card);
  });
}

function loadMissionBackground(index) {
  missionManager.loadMission(index);
}

// ── Launch Mission ──
function launchMission(index) {
  // Init audio on first user gesture
  audio.init();
  // Pre-generate radio audio buffers so first rescue doesn't pay creation cost
  if (radio._ensureBuffers) radio._ensureBuffers();

  // Remove helicopter from scene, load mission, re-add helicopter
  scene.remove(helicopter.group);
  const missionData = missionManager.loadMission(index);
  scene.add(helicopter.group);

  // Setup systems for this mission
  collisionSystem = new CollisionSystem(missionData.buildings);
  collisionSystem.setAudio(audio);
  rescueSystem = new RescueSystem(missionData.survivors, missionData.hospitalPad);

  // Configure game state from mission config
  const config = missionManager.getMissionConfig();
  gameState.totalSurvivors = config.totalSurvivors;

  // Reset
  gameState.start();
  gameState.missionTimer = config.timer;
  helicopter.reset();

  // Start at hospital pad
  const startPos = missionManager.getStartPosition();
  helicopter.group.position.copy(startPos);

  hud.show();
  hud.updatePassengers(0);
  hud.hideRescueBar();
  audio.stopTimerWarning();
  endScreen.style.display = 'none';
  touchControls.show();

  // Reset radio state
  timeWarning60 = false;
  timeWarning30 = false;
  damageWarningCooldown = 0;
  radio.resetForMission();

  // Mission start radio chatter
  radio.missionStart(config.name, config.id);
}

// ── Rescue callbacks ──
const rescueCallbacks = {
  onRescueProgress(progress) {
    hud.showRescueProgress(progress);
    const now = performance.now();
    if (now - lastBeepTime > 500) {
      audio.playRescueBeep(progress);
      lastBeepTime = now;
    }
  },
  onRescueComplete(passengersOnboard) {
    hud.hideRescueBar();
    hud.updatePassengers(passengersOnboard);
    hud.showPrompt(
      'SURVIVOR SECURED! ' + passengersOnboard + '/' + HELICOPTER.MAX_PASSENGERS + ' ONBOARD',
      2000
    );
    audio.playPickup();
    // Defer radio chatter to next frame so it doesn't block the rescue moment
    setTimeout(() => radio.survivorPickup(passengersOnboard, HELICOPTER.MAX_PASSENGERS), 350);
  },
  onRescueCancel() {
    hud.hideRescueBar();
  },
  onDelivery(delivered, scoreGained) {
    gameState.addSavedSurvivors(delivered, scoreGained);
    hud.updatePassengers(0);
    hud.showPrompt(
      delivered + ' SURVIVOR(S) DELIVERED! (' + gameState.survivorsSaved + '/' + gameState.totalSurvivors + ' SAVED)',
      2500
    );
    audio.playDropoff();
    // Defer radio chatter so dropoff sound plays cleanly first
    setTimeout(() => radio.delivery(gameState.survivorsSaved, gameState.totalSurvivors), 400);
    if (gameState.allSaved()) {
      endMission(true);
    }
  }
};

function endMission(won) {
  gameState.end();
  hud.hide();
  touchControls.hide();
  endScreen.style.display = 'flex';
  audio.stopAll();

  const config = missionManager.getMissionConfig();

  if (won) {
    audio.playMissionSuccess();
    radio.missionSuccess();
    const result = gameState.calculateFinalScore(gameState.missionTimer, helicopter.integrity);
    const stars = missionManager.completeMission(result.total);
    const starDisplay = '\u2605'.repeat(stars) + '\u2606'.repeat(3 - stars);

    endTitle.textContent = 'MISSION COMPLETE';
    endTitle.className = 'end-title win';
    endStats.innerHTML =
      '<div style="font-size:28px;margin-bottom:10px;color:#ffcc00;">' + starDisplay + '</div>' +
      'Survivors Saved: <span class="stat-val">' + gameState.survivorsSaved + '/' + gameState.totalSurvivors + '</span><br>' +
      'Time Remaining: <span class="stat-val">' + Math.ceil(gameState.missionTimer) + 's</span><br>' +
      'Integrity: <span class="stat-val">' + Math.floor(helicopter.integrity) + '%</span><br>' +
      'Time Bonus: <span class="stat-val">+' + result.timeBonus + '</span><br>' +
      'Integrity Bonus: <span class="stat-val">+' + result.integrityBonus + '</span><br><br>' +
      'TOTAL SCORE: <span class="stat-val">' + result.total + '</span>';
  } else {
    audio.playMissionFail();
    const failType = helicopter.integrity <= 0 ? 'destroyed' : gameState.missionTimer <= 0 ? 'time' : 'default';
    radio.missionFail(failType);
    const reason = helicopter.integrity <= 0 ? 'HELICOPTER DESTROYED' :
                   gameState.missionTimer <= 0 ? 'TIME EXPIRED' : 'MISSION FAILED';
    endTitle.textContent = reason;
    endTitle.className = 'end-title lose';
    endStats.innerHTML =
      'Survivors Saved: <span class="stat-val">' + gameState.survivorsSaved + '/' + gameState.totalSurvivors + '</span><br>' +
      'Score: <span class="stat-val">' + gameState.score + '</span>';
  }

  // Add "Mission Select" button to end screen
  let selectBtn = document.getElementById('btn-mission-select');
  if (!selectBtn) {
    selectBtn = document.createElement('button');
    selectBtn.id = 'btn-mission-select';
    selectBtn.className = 'btn';
    selectBtn.style.marginTop = '10px';
    selectBtn.style.fontSize = '12px';
    selectBtn.textContent = 'MISSION SELECT';
    selectBtn.addEventListener('click', () => {
      endScreen.style.display = 'none';
      showMissionSelect();
    });
    endScreen.appendChild(selectBtn);
  }
}

// ── Main loop ──
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  const elapsedTime = clock.getElapsedTime();

  // Poll gamepad every frame
  input.pollGamepad();

  if (gameState.isPlaying) {
    // Update helicopter (merge gamepad + touch)
    const gpInput = input.gamepadInput || touchControls.getInput();
    helicopter.update(dt, input.keys, gpInput);

    // Collisions
    if (collisionSystem) collisionSystem.update(helicopter, dt);

    // Camera
    chaseCamera.update(dt, helicopter);

    // Rescue
    if (rescueSystem) {
      const rescueContext = rescueSystem.update(helicopter, dt, rescueCallbacks);
      helicopter.isRescuing = (rescueContext === 'rescue');
      hud.setContextPrompt(rescueContext);
    }

    // Survivor animations
    const survivors = missionManager.survivors;
    updateSurvivorAnimations(survivors, elapsedTime);

    // Mission-specific updates (wind, water, etc.)
    missionManager.update(dt, helicopter, elapsedTime);

    // HUD updates
    const timeLeft = gameState.updateTimer(dt);
    hud.updateTimer(timeLeft);
    hud.updateSurvivors(gameState.survivorsSaved, gameState.totalSurvivors);
    hud.updateIntegrity(helicopter.integrity);

    // Mission may have ended during rescue callback — bail out
    if (!gameState.isPlaying) return;

    // Timer warning beeps in last 30s
    if (timeLeft <= 30 && timeLeft > 0) {
      audio.startTimerWarning();
    } else {
      audio.stopTimerWarning();
    }

    // Radio chatter — time warnings
    if (timeLeft <= 60 && timeLeft > 59 && !timeWarning60) {
      timeWarning60 = true;
      radio.timeWarning(60);
    }
    if (timeLeft <= 30 && timeLeft > 29 && !timeWarning30) {
      timeWarning30 = true;
      radio.timeWarning(30);
    }

    // Radio chatter — damage warning (cooldown so it doesn't spam)
    damageWarningCooldown -= dt;
    if (helicopter.integrity < 40 && helicopter.collisionIntensity > 0.5 && damageWarningCooldown <= 0) {
      radio.damageWarning();
      damageWarningCooldown = 15; // Don't repeat for 15s
    }

    const missionCfg = missionManager.getMissionConfig();
    radio.tick(dt, {
      timeLeft,
      missionDuration: missionCfg.timer,
      survivorsSaved: gameState.survivorsSaved,
      totalSurvivors: gameState.totalSurvivors,
      passengersOnboard: helicopter.passengersOnboard,
      missionId: missionCfg.id,
    });

    // Check fail conditions
    if (timeLeft <= 0 || helicopter.integrity <= 0) {
      endMission(false);
    }

    // Audio update
    audio.update(helicopter, gameState);

    // Mute toggle (M key)
    if (input.keys['KeyM'] && !lastMuteState) {
      const muted = audio.toggleMute();
      hud.showPrompt(muted ? 'AUDIO MUTED' : 'AUDIO ON', 1000);
    }
    lastMuteState = !!input.keys['KeyM'];

    // Minimap
    const hpPos = missionManager.hospitalPad ? missionManager.hospitalPad.position : null;
    minimap.update(helicopter, missionManager.buildings, survivors, hpPos);
  } else {
    chaseCamera.updateMenuOrbit(elapsedTime);
    // Keep mission world updating for menu background (flashing lights etc.)
    missionManager.update(dt, helicopter, elapsedTime);
  }

  // Particles (if active mission has them)
  if (missionManager.particleSystem) {
    missionManager.particleSystem.update(dt, elapsedTime, camera, gameState.isPlaying ? helicopter.position : null);
  }

  // Post-processing
  postProcessing.update(elapsedTime);
  postProcessing.render();
}

animate();

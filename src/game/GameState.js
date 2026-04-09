export class GameState {
  constructor() {
    this.state = 'menu'; // menu, playing, ended
    this.missionTimer = 150;
    this.survivorsSaved = 0;
    this.totalSurvivors = 5;
    this.score = 0;
  }

  get isPlaying() { return this.state === 'playing'; }
  get isMenu() { return this.state === 'menu'; }
  get isEnded() { return this.state === 'ended'; }

  start() {
    this.state = 'playing';
    this.missionTimer = 150;
    this.survivorsSaved = 0;
    this.score = 0;
  }

  end() {
    this.state = 'ended';
  }

  updateTimer(dt) {
    this.missionTimer -= dt;
    return this.missionTimer;
  }

  addSavedSurvivors(count, scoreGained) {
    this.survivorsSaved += count;
    this.score += scoreGained;
  }

  allSaved() {
    return this.survivorsSaved >= this.totalSurvivors;
  }

  calculateFinalScore(timeRemaining, integrity) {
    const timeBonus = Math.floor(timeRemaining * 50);
    const integrityBonus = Math.floor(integrity * 20);
    this.score += timeBonus + integrityBonus;
    return { timeBonus, integrityBonus, total: this.score };
  }

  reset() {
    this.state = 'menu';
    this.missionTimer = 150;
    this.survivorsSaved = 0;
    this.score = 0;
  }
}

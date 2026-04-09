export const MISSIONS = [
  {
    id: 'burning_building',
    name: 'INFERNO',
    subtitle: 'Downtown Fire Rescue',
    description: 'A high-rise is ablaze in the city center. Survivors are trapped on the rooftop. Extract them before the building collapses.',
    difficulty: 1,
    timer: 150,
    totalSurvivors: 5,
    hazards: ['Fire damage zones', 'Smoke reduces visibility'],
    unlocked: true,
    bestStars: 0,
    starThresholds: [3000, 5500, 8000], // score needed for 1, 2, 3 stars
  },
  {
    id: 'mountain_rescue',
    name: 'PEAK PERIL',
    subtitle: 'Mountain Cliff Rescue',
    description: 'Hikers are stranded on cliff ledges after a landslide. Wind gusts and narrow approaches make this treacherous.',
    difficulty: 2,
    timer: 180,
    totalSurvivors: 4,
    hazards: ['Wind gusts push helicopter', 'Fog rolls in over time', 'Narrow cliff approaches'],
    unlocked: false,
    bestStars: 0,
    starThresholds: [3500, 6000, 9000],
  },
  {
    id: 'flood_rescue',
    name: 'RISING TIDE',
    subtitle: 'Suburban Flood Rescue',
    description: 'Flash flooding is submerging a suburb. Residents are on rooftops. Water is rising — rescue them before they are lost.',
    difficulty: 3,
    timer: 200,
    totalSurvivors: 6,
    hazards: ['Rising water level', 'Rain reduces visibility', 'Floating debris'],
    unlocked: false,
    bestStars: 0,
    starThresholds: [4000, 7000, 10000],
  },
];

export function getStars(score, thresholds) {
  if (score >= thresholds[2]) return 3;
  if (score >= thresholds[1]) return 2;
  if (score >= thresholds[0]) return 1;
  return 0;
}

export function loadProgress() {
  try {
    const data = JSON.parse(localStorage.getItem('skyrescue_progress'));
    if (data && data.missions) {
      data.missions.forEach((saved, i) => {
        if (MISSIONS[i]) {
          MISSIONS[i].unlocked = saved.unlocked;
          MISSIONS[i].bestStars = saved.bestStars || 0;
        }
      });
    }
  } catch (e) { /* ignore */ }
}

export function saveProgress() {
  const data = {
    missions: MISSIONS.map(m => ({
      unlocked: m.unlocked,
      bestStars: m.bestStars,
    })),
  };
  try {
    localStorage.setItem('skyrescue_progress', JSON.stringify(data));
  } catch (e) { /* ignore */ }
}

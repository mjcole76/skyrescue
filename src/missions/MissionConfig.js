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
    unlocked: true,
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
    unlocked: true,
    bestStars: 0,
    starThresholds: [4000, 7000, 10000],
  },
  {
    id: 'highway_pileup',
    name: 'NIGHTFALL',
    subtitle: 'Highway Pileup Rescue',
    description: 'A massive pileup on the elevated highway. Pitch dark — your searchlight is your only guide. Moving traffic adds to the chaos.',
    difficulty: 3,
    timer: 160,
    totalSurvivors: 5,
    hazards: ['Near-zero visibility', 'Moving traffic', 'Vehicle fires'],
    unlocked: true,
    bestStars: 0,
    starThresholds: [3500, 6500, 9500],
  },
  {
    id: 'arctic_rescue',
    name: 'WHITEOUT',
    subtitle: 'Arctic Ice Rescue',
    description: 'Researchers stranded on drifting ice floes in a blizzard. Floes drift apart. Helicopter icing drains integrity unless you keep moving.',
    difficulty: 4,
    timer: 170,
    totalSurvivors: 5,
    hazards: ['Blizzard wind gusts', 'Ice floes drift apart', 'Helicopter icing when stationary'],
    unlocked: true,
    bestStars: 0,
    starThresholds: [4000, 7500, 11000],
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
          // Only lock if the default is unlocked=false (keep defaults if unlocked=true)
          if (saved.unlocked) MISSIONS[i].unlocked = true;
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

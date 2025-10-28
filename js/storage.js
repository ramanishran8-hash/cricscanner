const STORAGE_KEY = 'cricscannerData';

const clone = (value) =>
  typeof structuredClone === 'function'
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));

const defaultData = {
  tournaments: [
    {
      id: 'tour-1',
      name: 'World Test Championship',
      location: 'Global Venues',
      description: 'Top-ranked nations compete across the globe.',
      pointsTable: [
        { team: 'India', points: 120 },
        { team: 'Australia', points: 112 },
        { team: 'England', points: 96 },
      ],
    },
    {
      id: 'tour-2',
      name: 'Champions T20 League',
      location: 'United States',
      description: 'A high-octane franchise tournament under the lights.',
      pointsTable: [
        { team: 'Seattle Strikers', points: 10 },
        { team: 'Miami Thunder', points: 8 },
        { team: 'Austin Comets', points: 6 },
      ],
    },
  ],
  matches: [
    {
      id: 'match-1',
      tournamentId: 'tour-1',
      teamA: 'India',
      teamB: 'Australia',
      startTime: '2024-07-20T09:00:00-04:00',
      endTime: '2024-07-24T17:00:00-04:00',
      scoreA: '325 & 210/3',
      scoreB: '287 & 198',
      location: 'Lord\'s, London',
    },
    {
      id: 'match-2',
      tournamentId: 'tour-2',
      teamA: 'Seattle Strikers',
      teamB: 'Miami Thunder',
      startTime: '2024-07-18T19:30:00-04:00',
      endTime: '2024-07-18T22:30:00-04:00',
      scoreA: '182/5',
      scoreB: '179/7',
      location: 'Lumen Field, Seattle',
    },
    {
      id: 'match-3',
      tournamentId: 'tour-2',
      teamA: 'Austin Comets',
      teamB: 'Boston Blazers',
      startTime: '2024-07-28T18:00:00-04:00',
      location: 'Q2 Stadium, Austin',
    },
  ],
};

function loadData() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
      return clone(defaultData);
    }
    const parsed = JSON.parse(raw);
    return {
      tournaments: Array.isArray(parsed.tournaments) ? parsed.tournaments : clone(defaultData.tournaments),
      matches: Array.isArray(parsed.matches) ? parsed.matches : clone(defaultData.matches),
    };
  } catch (error) {
    console.error('Failed to load data from localStorage. Resetting to defaults.', error);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultData));
    return clone(defaultData);
  }
}

function saveData(data) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getData() {
  return loadData();
}

function upsertTournament(tournament) {
  const data = loadData();
  const index = data.tournaments.findIndex((t) => t.id === tournament.id);
  if (index >= 0) {
    data.tournaments[index] = { ...data.tournaments[index], ...tournament };
  } else {
    data.tournaments.push({ ...tournament });
  }
  saveData(data);
  return data;
}

function deleteTournament(id) {
  const data = loadData();
  data.tournaments = data.tournaments.filter((t) => t.id !== id);
  data.matches = data.matches.filter((m) => m.tournamentId !== id);
  saveData(data);
  return data;
}

function upsertMatch(match) {
  const data = loadData();
  const index = data.matches.findIndex((m) => m.id === match.id);
  if (index >= 0) {
    data.matches[index] = { ...data.matches[index], ...match };
  } else {
    data.matches.push({ ...match });
  }
  saveData(data);
  return data;
}

function deleteMatch(id) {
  const data = loadData();
  data.matches = data.matches.filter((m) => m.id !== id);
  saveData(data);
  return data;
}

function generateId(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}-${Date.now().toString(36)}`;
}

window.CricStorage = {
  getData,
  saveData,
  upsertTournament,
  deleteTournament,
  upsertMatch,
  deleteMatch,
  generateId,
  defaultData,
};

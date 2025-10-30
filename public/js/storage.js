const STORAGE_KEY = 'cricscannerData';

// ✅ Prevent storage.js from running on admin pages
if (!window.location.pathname.includes("admin.html")) {
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
      location: "Lord's, London",
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

const SOURCE_PATHS = {
  tournaments: [
    '/data/tournaments.json',
    './data/tournaments.json',
    '../data/tournaments.json',
    '/public/data/tournaments.json',
    '../public/data/tournaments.json',
  ],
  matches: [
    '/data/matches.json',
    './data/matches.json',
    '../data/matches.json',
    '/public/data/matches.json',
    '../public/data/matches.json',
  ],
};

let memoryCache = null;
let loadPromise = null;

async function fetchFromSources(paths) {
  for (const path of paths) {
    try {
      const response = await fetch(path, { cache: 'no-store' });
      if (!response.ok) continue;
      const data = await response.json();
      return data;
    } catch (error) {
      // Ignore fetch failures and try the next path.
    }
  }
  throw new Error('Unable to load seeded data from any source.');
}

function normalize(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  return {
    tournaments: Array.isArray(source.tournaments) && source.tournaments.length
      ? source.tournaments
      : clone(defaultData.tournaments),
    matches: Array.isArray(source.matches) && source.matches.length
      ? source.matches
      : clone(defaultData.matches),
  };
}

function commit(next) {
  memoryCache = clone(next);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(memoryCache));
  return clone(memoryCache);
}

async function seedFromFiles() {
  try {
    const [tournaments, matches] = await Promise.all([
      fetchFromSources(SOURCE_PATHS.tournaments),
      fetchFromSources(SOURCE_PATHS.matches),
    ]);
    return normalize({ tournaments, matches });
  } catch (error) {
    console.warn('Falling back to bundled defaults after seed fetch failed.', error);
    return clone(defaultData);
  }
}

async function ensureData() {
  if (memoryCache) {
    return clone(memoryCache);
  }

  if (loadPromise) {
    const data = await loadPromise;
    return clone(data);
  }

  loadPromise = (async () => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const normalized = normalize(parsed);
        memoryCache = clone(normalized);
        return normalized;
      }
    } catch (error) {
      console.warn('Failed to read cricscanner data from localStorage. Reseeding.', error);
    }

    const seeded = await seedFromFiles();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
    memoryCache = clone(seeded);
    return seeded;
  })();

  const resolved = await loadPromise;
  return clone(resolved);
}

async function getData() {
  return ensureData();
}

async function saveData(data) {
  const normalized = normalize(data);
  return commit(normalized);
}

async function upsertTournament(tournament) {
  const data = await ensureData();
  const next = clone(data);
  const index = next.tournaments.findIndex((t) => t.id === tournament.id);
  if (index >= 0) {
    next.tournaments[index] = { ...next.tournaments[index], ...tournament };
  } else {
    next.tournaments.push({ ...tournament });
  }
  return commit(next);
}

async function deleteTournament(id) {
  const data = await ensureData();
  const next = clone(data);
  next.tournaments = next.tournaments.filter((t) => t.id !== id);
  next.matches = next.matches.filter((m) => m.tournamentId !== id);
  return commit(next);
}

async function upsertMatch(match) {
  const data = await ensureData();
  const next = clone(data);
  const index = next.matches.findIndex((m) => m.id === match.id);
  if (index >= 0) {
    next.matches[index] = { ...next.matches[index], ...match };
  } else {
    next.matches.push({ ...match });
  }
  return commit(next);
}

async function deleteMatch(id) {
  const data = await ensureData();
  const next = clone(data);
  next.matches = next.matches.filter((m) => m.id !== id);
  return commit(next);
}

async function resetToDefaults() {
  return commit(normalize(defaultData));
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
  resetToDefaults,
  generateId,
  defaultData,
};
document.addEventListener("DOMContentLoaded", () => {
  const wrapper = document.getElementById("matches-wrapper"); // create a div in HTML with this id

  function renderCricAPIMatches() {
    const stored = localStorage.getItem("cricapi_matches");
    if (!stored) {
      console.log("No CricAPI data found in localStorage yet.");
      return;
    }

    const matches = JSON.parse(stored);
    wrapper.innerHTML = ""; // clear previous

    matches.slice(0, 5).forEach((m) => {
      const div = document.createElement("div");
      div.className = "p-4 mb-2 bg-slate-800 rounded-lg";
      div.innerHTML = `
        <h3 class="text-white font-semibold">${m.name}</h3>
        <p class="text-sm text-slate-400">${m.status || "Match status unavailable"}</p>
      `;
      wrapper.appendChild(div);
    });
  }

  renderCricAPIMatches();
  window.addEventListener("storage", renderCricAPIMatches);
}); // end of DOMContentLoaded listener
} // close the main "if (!window.location.pathname.includes('admin.html'))" block

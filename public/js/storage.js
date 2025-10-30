const STORAGE_KEY = 'cricscannerData';
const MATCHES_CACHE_KEY = 'cricscanner:matches';
const CRICAPI_RENDER_KEY = 'cricapi_matches';
const ADMIN_PAGE_FRAGMENT = 'admin.html';

const isBrowser = typeof window !== 'undefined';
const currentPath = isBrowser && window.location ? window.location.pathname : '';
const isAdmin = currentPath.includes(ADMIN_PAGE_FRAGMENT);
const dataBasePath = currentPath.includes('/private/') ? '../data/' : 'data/';

let inMemoryState = null;

function normaliseState(candidate) {
  if (!candidate || typeof candidate !== 'object') {
    return { tournaments: [], matches: [] };
  }
  const tournaments = Array.isArray(candidate.tournaments) ? [...candidate.tournaments] : [];
  const matches = Array.isArray(candidate.matches) ? [...candidate.matches] : [];
  return { tournaments, matches };
}

function loadFromLocalStorage() {
  if (!isBrowser || !window.localStorage) {
    return null;
  }
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }
  try {
    return normaliseState(JSON.parse(raw));
  } catch (error) {
    console.error('❌ Failed to parse stored Cricscanner data.', error);
    return null;
  }
}

async function fetchSeedFile(file) {
  if (!isBrowser || typeof fetch !== 'function') {
    return [];
  }
  try {
    const response = await fetch(`${dataBasePath}${file}`, { cache: 'no-store' });
    if (!response.ok) {
      console.warn(`Seed file request failed: ${file}`, response.status);
      return [];
    }
    return await response.json();
  } catch (error) {
    console.warn(`Unable to fetch seed file: ${file}`, error);
    return [];
  }
}

async function loadDefaults() {
  const [tournaments, matches] = await Promise.all([
    fetchSeedFile('tournaments.json'),
    fetchSeedFile('matches.json'),
  ]);
  return normaliseState({ tournaments, matches });
}

function ensureRenderCache() {
  if (!isBrowser || !window.localStorage) {
    return;
  }
  if (window.localStorage.getItem(CRICAPI_RENDER_KEY)) {
    return;
  }
  const apiSnapshot = window.localStorage.getItem(MATCHES_CACHE_KEY);
  if (!apiSnapshot) {
    return;
  }
  try {
    window.localStorage.setItem(CRICAPI_RENDER_KEY, apiSnapshot);
  } catch (error) {
    console.warn('Unable to mirror CricAPI cache for rendering.', error);
  }
}

async function saveData(state) {
  const snapshot = normaliseState(state);
  inMemoryState = snapshot;
  if (isBrowser && window.localStorage) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
    } catch (error) {
      console.error('❌ Failed to persist Cricscanner data.', error);
    }
  }
  return snapshot;
}

async function getData() {
  if (inMemoryState) {
    ensureRenderCache();
    return inMemoryState;
  }
  const local = loadFromLocalStorage();
  if (local) {
    inMemoryState = local;
    ensureRenderCache();
    return local;
  }
  const defaults = await loadDefaults();
  await saveData(defaults);
  ensureRenderCache();
  return defaults;
}

function generateId(prefix = 'id') {
  const safePrefix = prefix || 'id';
  const unique = Math.random().toString(36).slice(2, 8);
  const timestamp = Date.now().toString(36);
  return `${safePrefix}-${timestamp}-${unique}`;
}

async function upsertTournament(tournament) {
  const state = await getData();
  const tournaments = state.tournaments.slice();
  const index = tournaments.findIndex((entry) => entry.id === tournament.id);
  if (index >= 0) {
    tournaments[index] = { ...tournaments[index], ...tournament };
  } else {
    tournaments.push({ ...tournament });
  }
  return saveData({ ...state, tournaments });
}

async function deleteTournament(tournamentId) {
  const state = await getData();
  const tournaments = state.tournaments.filter((entry) => entry.id !== tournamentId);
  const matches = state.matches.filter((match) => match.tournamentId !== tournamentId);
  return saveData({ ...state, tournaments, matches });
}

async function upsertMatch(match) {
  const state = await getData();
  const matches = state.matches.slice();
  const index = matches.findIndex((entry) => entry.id === match.id);
  if (index >= 0) {
    matches[index] = { ...matches[index], ...match };
  } else {
    matches.push({ ...match });
  }
  return saveData({ ...state, matches });
}

async function deleteMatch(matchId) {
  const state = await getData();
  const matches = state.matches.filter((entry) => entry.id !== matchId);
  return saveData({ ...state, matches });
}

async function resetToDefaults() {
  const defaults = await loadDefaults();
  return saveData(defaults);
}

window.CricStorage = {
  getData,
  saveData,
  generateId,
  upsertTournament,
  deleteTournament,
  upsertMatch,
  deleteMatch,
  resetToDefaults,
};

if (!isAdmin && isBrowser) {
  document.addEventListener('DOMContentLoaded', () => {
    const wrapper = document.getElementById('matchesWrapper') || document.getElementById('matches-wrapper');
    if (!wrapper) {
      return;
    }

    function renderCricAPIMatches() {
      const stored = window.localStorage ? window.localStorage.getItem(CRICAPI_RENDER_KEY) : null;
      if (!stored) {
        console.log('No CricAPI data found in localStorage yet.');
        return;
      }

      let matches;
      try {
        matches = JSON.parse(stored);
      } catch (error) {
        console.warn('Unable to parse CricAPI cache.', error);
        return;
      }

      wrapper.innerHTML = '';

      matches.slice(0, 5).forEach((match) => {
        const div = document.createElement('div');
        div.className = 'p-4 mb-2 bg-slate-800 rounded-lg';
        const name = match.name || match.match || `${match.teams?.[0] ?? match.teamA ?? 'Team A'} vs ${match.teams?.[1] ?? match.teamB ?? 'Team B'}`;
        const status = match.status || match.result || 'Match status unavailable';
        div.innerHTML = `
          <h3 class="text-white font-semibold">${name}</h3>
          <p class="text-sm text-slate-400">${status}</p>
        `;
        wrapper.appendChild(div);
      });
    }

    renderCricAPIMatches();
    window.addEventListener('storage', renderCricAPIMatches);
  });
}

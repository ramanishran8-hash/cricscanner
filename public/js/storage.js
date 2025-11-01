window.CricStorage = (function () {
  const STORAGE_KEY = 'cricscannerData';

  function getData() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return { tournaments: [], matches: [] };
    return JSON.parse(saved);
  }

  function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }

  function generateId(prefix) {
    return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function upsertTournament(tournament) {
    const state = getData();
    const existing = state.tournaments.findIndex((t) => t.id === tournament.id);
    if (existing !== -1) state.tournaments[existing] = tournament;
    else state.tournaments.push(tournament);
    saveData(state);
  }

  function deleteTournament(id) {
    const state = getData();
    state.tournaments = state.tournaments.filter((t) => t.id !== id);
    state.matches = state.matches.filter((m) => m.tournamentId !== id);
    saveData(state);
  }

  function upsertMatch(match) {
    const state = getData();
    const existing = state.matches.findIndex((m) => m.id === match.id);
    if (existing !== -1) state.matches[existing] = match;
    else state.matches.push(match);
    saveData(state);
  }

  function deleteMatch(id) {
    const state = getData();
    state.matches = state.matches.filter((m) => m.id !== id);
    saveData(state);
  }

  return {
    getData,
    saveData,
    upsertTournament,
    deleteTournament,
    upsertMatch,
    deleteMatch,
    generateId,
  };
})();

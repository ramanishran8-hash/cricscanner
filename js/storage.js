// storage.js
const STORAGE_KEY = 'cricscannerData';

// Utility function to deep-clone values safely
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
  matches: [],
};

// ====== Core localStorage utilities ======
function getData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : clone(defaultData);
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  window.dispatchEvent(new Event('storage'));
}

function resetToDefaults() {
  saveData(defaultData);
}

function upsertTournament(tournament) {
  const data = getData();
  const index = data.tournaments.findIndex((t) => t.id === tournament.id);
  if (index >= 0) data.tournaments[index] = tournament;
  else data.tournaments.push(tournament);
  saveData(data);
}

function deleteTournament(id) {
  const data = getData();
  data.tournaments = data.tournaments.filter((t) => t.id !== id);
  saveData(data);
}

// ====== CricAPI Render Logic ======
document.addEventListener('DOMContentLoaded', () => {
  const wrapper = document.getElementById('matches-wrapper');
  if (!wrapper) return; // no matches section on this page

  function renderCricAPIMatches() {
    const stored = localStorage.getItem('cricapi_matches');
    if (!stored) {
      console.log('⚠️ No CricAPI data found in localStorage yet.');
      return;
    }

    const matches = JSON.parse(stored);
    wrapper.innerHTML = ''; // clear previous

    matches.slice(0, 9).forEach((m) => {
      const div = document.createElement('div');
      div.className = 'p-4 mb-2 bg-slate-800 rounded-lg';
      div.innerHTML = `
        <h3 class="text-white font-semibold">${m.name}</h3>
        <p class="text-sm text-slate-400">${m.status || 'Match status unavailable'}</p>
      `;
      wrapper.appendChild(div);
    });
  }

  renderCricAPIMatches();
  window.addEventListener('storage', renderCricAPIMatches);
});

// ====== Expose to global for admin.html ======
window.getData = getData;
window.saveData = saveData;
window.upsertTournament = upsertTournament;
window.deleteTournament = deleteTournament;
window.resetToDefaults = resetToDefaults;

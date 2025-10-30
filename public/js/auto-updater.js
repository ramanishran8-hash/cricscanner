(function (global) {
  'use strict';

  const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
  const SOURCE_NAME = 'cricapi';

  const runtimeConfig =
    (typeof global.CricscannerAutoUpdaterConfig === 'object' && global.CricscannerAutoUpdaterConfig) || {};

  const CONFIG = {
    cricapiKey: runtimeConfig.cricapiKey || 'YOUR_CRICAPI_KEY',
    openAiKey: runtimeConfig.openAiKey || 'YOUR_OPENAI_API_KEY',
  };

  const ENDPOINTS = {
    cricapi: (apiKey) => `https://api.cricapi.com/v1/currentMatches?apikey=${apiKey}`,
    openai: 'https://api.openai.com/v1/chat/completions',
  };

  const state = {
    busy: false,
    intervalId: null,
  };

  function ensureConfigured() {
    if (!CONFIG.cricapiKey || CONFIG.cricapiKey.includes('YOUR_CRICAPI_KEY')) {
      throw new Error('CricAPI key is not configured.');
    }
    if (!CONFIG.openAiKey || CONFIG.openAiKey.includes('YOUR_OPENAI_API_KEY')) {
      throw new Error('OpenAI key is not configured.');
    }
  }

  async function fetchMatchesFromCricApi() {
    const response = await fetch(ENDPOINTS.cricapi(CONFIG.cricapiKey), { cache: 'no-store' });
    if (!response.ok) {
      throw new Error(`CricAPI request failed with status ${response.status}`);
    }
    const payload = await response.json();
    if (!payload || (payload.status && payload.status !== 'success')) {
      throw new Error('CricAPI responded with an error payload.');
    }
    const list = Array.isArray(payload.data) ? payload.data : [];
    return list;
  }

  function parseScoreEntry(entry) {
    if (!entry || typeof entry !== 'object') return '';
    const runs = entry.runs ?? entry.r;
    const wickets = entry.wickets ?? entry.w;
    const overs = entry.overs ?? entry.o;
    const formattedRuns = typeof runs === 'number' ? runs : parseInt(runs, 10);
    const formattedWickets = typeof wickets === 'number' ? wickets : parseInt(wickets, 10);
    const runsPart = Number.isFinite(formattedRuns) ? formattedRuns : '';
    const wicketsPart = Number.isFinite(formattedWickets) ? formattedWickets : '';
    let value = '';
    if (runsPart !== '') {
      value += runsPart;
    }
    if (wicketsPart !== '') {
      value += value ? `/${wicketsPart}` : wicketsPart;
    }
    if (!value) {
      return entry.score || '';
    }
    if (overs) {
      value += ` (${overs} ov)`;
    }
    return value;
  }

  function deriveTeamName(source, index) {
    if (!source) return '';
    if (Array.isArray(source.teamInfo) && source.teamInfo[index] && source.teamInfo[index].name) {
      return source.teamInfo[index].name;
    }
    if (Array.isArray(source.teams) && source.teams[index]) {
      return source.teams[index];
    }
    if (Array.isArray(source.team) && source.team[index]) {
      return source.team[index];
    }
    const key = index === 0 ? 'teamA' : 'teamB';
    if (source[key]) return source[key];
    return '';
  }

  function normaliseStatus(rawStatus) {
    if (!rawStatus) return 'upcoming';
    const value = String(rawStatus).toLowerCase();
    if (
      value.includes('abandon') ||
      value.includes('won') ||
      value.includes('lost') ||
      value.includes('draw') ||
      value.includes('tie') ||
      value.includes('stumps') ||
      value.includes('no result') ||
      value.includes('end of')
    ) {
      return 'completed';
    }
    if (
      value.includes('live') ||
      value.includes('in progress') ||
      value.includes('session') ||
      value.includes('day') ||
      value.includes('stumps') ||
      value.includes('break')
    ) {
      return 'live';
    }
    if (
      value.includes('scheduled') ||
      value.includes('match not started') ||
      value.includes('upcoming') ||
      value.includes('to be played') ||
      value.includes('starts')
    ) {
      return 'upcoming';
    }
    return value.trim() ? value : 'upcoming';
  }

  function normaliseMatch(source) {
    if (!source || typeof source !== 'object') return null;
    const teamA = deriveTeamName(source, 0) || '';
    const teamB = deriveTeamName(source, 1) || '';
    if (!teamA || !teamB) {
      return null;
    }
    const seriesName = source.series || source.matchType || source.tournament || source.event || 'Cricscanner Fixtures';
    const matchName = source.name || `${teamA} vs ${teamB}`;
    const startTime = source.dateTimeGMT
      ? new Date(source.dateTimeGMT).toISOString()
      : source.startTime || source.startDate || new Date().toISOString();
    const scores = Array.isArray(source.score) ? source.score : Array.isArray(source.scores) ? source.scores : [];
    const statusText = source.status || source.statusText || '';
    const normalizedStatus = normaliseStatus(statusText || (source.matchStarted ? 'live' : 'upcoming'));

    const scoreAEntry = scores.find((entry) =>
      entry && typeof entry.inning === 'string' && entry.inning.toLowerCase().includes(teamA.toLowerCase())
    ) || scores[0];
    const scoreBEntry = scores.find((entry) =>
      entry && typeof entry.inning === 'string' && entry.inning.toLowerCase().includes(teamB.toLowerCase())
    ) || scores[1];

    const venue = source.venue || source.ground || source.location || source.stadium || '';
    const externalId =
      source.id || source.matchId || source.unique_id || source.matchIdNew || `${teamA}-${teamB}-${startTime}`;

    return {
      externalId,
      tournament: seriesName,
      matchName,
      startTime,
      status: normalizedStatus,
      statusText: statusText || normalizedStatus,
      scoreA: parseScoreEntry(scoreAEntry),
      scoreB: parseScoreEntry(scoreBEntry),
      teamA,
      teamB,
      venue,
    };
  }

  async function generateSummaryForMatch(match) {
    const userPrompt = `Generate a 1-line summary of this cricket match: ${match.teamA} vs ${match.teamB}, scoreA: ${
      match.scoreA || 'N/A'
    }, scoreB: ${match.scoreB || 'N/A'}, status: ${match.statusText || match.status}.`;
    const response = await fetch(ENDPOINTS.openai, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CONFIG.openAiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a concise cricket reporter that writes lively one-line recaps.' },
          { role: 'user', content: userPrompt },
        ],
        max_tokens: 60,
        temperature: 0.7,
      }),
    });
    if (!response.ok) {
      throw new Error(`OpenAI request failed with status ${response.status}`);
    }
    const payload = await response.json();
    const choice = payload.choices && payload.choices[0];
    const message = choice && choice.message && choice.message.content;
    return (message || '').trim();
  }

  async function enrichMatchesWithSummaries(matches) {
    const results = [];
    for (const match of matches) {
      let summary = '';
      try {
        summary = await generateSummaryForMatch(match);
      } catch (error) {
        console.warn('OpenAI summary generation failed, using fallback.', error);
        if (match.status === 'completed') {
          summary = `${match.teamA} and ${match.teamB} completed their clash. ${match.statusText || ''}`.trim();
        } else if (match.status === 'live') {
          summary = `${match.teamA} vs ${match.teamB} is currently live. ${match.statusText || ''}`.trim();
        } else {
          summary = `${match.teamA} vs ${match.teamB} is coming up soon.`;
        }
      }
      results.push({ ...match, summary });
    }
    return results;
  }

  async function writeMatchesFile(matches) {
    // Node.js environment: write to disk directly.
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      try {
        const fs = require('fs');
        const path = require('path');
        const outputPath = path.join(__dirname, '../data/matches.json');
        fs.writeFileSync(outputPath, JSON.stringify(matches, null, 2), 'utf8');
        return outputPath;
      } catch (error) {
        console.error('Failed to write matches.json in Node environment.', error);
      }
      return null;
    }

    // Browser environment: attempt to trigger a download/save operation.
    try {
      if (typeof window !== 'undefined') {
        const blob = new Blob([JSON.stringify(matches, null, 2)], { type: 'application/json' });
        if (window.showSaveFilePicker) {
          const handle = await window.showSaveFilePicker({
            suggestedName: 'matches.json',
            types: [
              {
                description: 'JSON Files',
                accept: { 'application/json': ['.json'] },
              },
            ],
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
          return 'downloaded-via-file-picker';
        }
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'matches.json';
        anchor.style.display = 'none';
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
        return 'downloaded-via-anchor';
      }
    } catch (error) {
      console.error('Browser download of matches.json failed.', error);
    }
    return null;
  }

  async function syncWithLocalStorage(matches) {
    if (typeof window === 'undefined' || !window.CricStorage) {
      return null;
    }
    const storage = window.CricStorage;
    const data = await storage.getData();
    const tournaments = Array.isArray(data.tournaments) ? [...data.tournaments] : [];
    const matchesWithoutSource = Array.isArray(data.matches)
      ? data.matches.filter((item) => item.externalSource !== SOURCE_NAME)
      : [];
    const existingCricApi = Array.isArray(data.matches)
      ? data.matches.filter((item) => item.externalSource === SOURCE_NAME)
      : [];
    const existingByExternalId = new Map();
    existingCricApi.forEach((item) => {
      if (item.externalId) {
        existingByExternalId.set(item.externalId, item);
      }
    });

    const tournamentsByName = new Map();
    tournaments.forEach((tournament) => {
      tournamentsByName.set(String(tournament.name || '').toLowerCase(), tournament.id);
    });

    const ensureTournament = (name) => {
      const key = String(name || 'Cricscanner Fixtures').toLowerCase();
      if (tournamentsByName.has(key)) {
        return tournamentsByName.get(key);
      }
      const newTournament = {
        id: storage.generateId('tour'),
        name: name || 'Cricscanner Fixtures',
        location: '',
        description: '',
      };
      tournaments.push(newTournament);
      tournamentsByName.set(key, newTournament.id);
      return newTournament.id;
    };

    const nextMatches = [...matchesWithoutSource];

    matches.forEach((match) => {
      const existing = match.externalId ? existingByExternalId.get(match.externalId) : null;
      const tournamentId = ensureTournament(match.tournament);
      const payload = {
        id: existing ? existing.id : storage.generateId('match'),
        tournamentId,
        teamA: match.teamA,
        teamB: match.teamB,
        startTime: match.startTime,
        endTime: '',
        scoreA: match.scoreA,
        scoreB: match.scoreB,
        location: match.venue || '',
        status: match.status,
        statusText: match.statusText,
        summary: match.summary,
        externalSource: SOURCE_NAME,
        externalId: match.externalId,
      };
      nextMatches.push(payload);
    });

    await storage.saveData({ tournaments, matches: nextMatches });
    return { tournaments, matches: nextMatches };
  }

  async function performUpdate(options = {}) {
    const { showNotification = false, invokedBySchedule = false, button } = options;
    if (state.busy) {
      return null;
    }

    ensureConfigured();
    state.busy = true;

    const targetButton = button || (!invokedBySchedule && typeof document !== 'undefined'
      ? document.getElementById('syncMatchesAi')
      : null);
    const originalLabel = targetButton ? targetButton.textContent : null;

    if (targetButton) {
      targetButton.disabled = true;
      targetButton.textContent = 'Syncing…';
    }

    try {
      const rawMatches = await fetchMatchesFromCricApi();
      const normalizedMatches = rawMatches
        .map(normaliseMatch)
        .filter((item) => item && item.teamA && item.teamB);
      const matchesWithSummaries = await enrichMatchesWithSummaries(normalizedMatches);
      const filePayload = matchesWithSummaries.map((match) => ({
        tournament: match.tournament,
        match: match.matchName,
        startTime: match.startTime,
        status: match.statusText || match.status,
        phase: match.status,
        scoreA: match.scoreA,
        scoreB: match.scoreB,
        teamA: match.teamA,
        teamB: match.teamB,
        venue: match.venue,
        summary: match.summary,
        externalId: match.externalId,
        fetchedAt: new Date().toISOString(),
      }));

      await writeMatchesFile(filePayload);
      await syncWithLocalStorage(matchesWithSummaries);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('cricscanner:matches-synced', {
            detail: { matches: matchesWithSummaries, source: SOURCE_NAME },
          })
        );
      }

      if (showNotification && typeof window !== 'undefined') {
        alert('✅ Matches synced successfully!');
      }

      return matchesWithSummaries;
    } catch (error) {
      console.error('Auto update failed', error);
      if (showNotification && typeof window !== 'undefined') {
        alert('⚠️ Failed to fetch matches, please try again');
      }
      throw error;
    } finally {
      if (targetButton) {
        targetButton.disabled = false;
        if (originalLabel) {
          targetButton.textContent = originalLabel;
        }
      }
      state.busy = false;
    }
  }

  function scheduleAutomaticUpdates() {
    if (typeof window === 'undefined') {
      return;
    }
    if (state.intervalId) {
      return;
    }
    state.intervalId = window.setInterval(() => {
      performUpdate({ showNotification: false, invokedBySchedule: true }).catch(() => {
        // Errors are already logged and alerts suppressed during scheduled runs.
      });
    }, SIX_HOURS_MS);
  }

  function configure(partial) {
    if (!partial || typeof partial !== 'object') {
      return CONFIG;
    }
    if (partial.cricapiKey) {
      CONFIG.cricapiKey = partial.cricapiKey;
    }
    if (partial.openAiKey) {
      CONFIG.openAiKey = partial.openAiKey;
    }
    return CONFIG;
  }

  const AutoUpdater = {
    run: (options = {}) => performUpdate(options),
    schedule: () => scheduleAutomaticUpdates(),
    configure,
    config: CONFIG,
  };

  global.CricscannerAutoUpdaterConfig = CONFIG;
  global.CricscannerAutoUpdater = AutoUpdater;

  global.runAutoUpdater = function () {
    return AutoUpdater.run({ showNotification: true });
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
      scheduleAutomaticUpdates();
    });
  }

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = AutoUpdater;
  }
})(typeof window !== 'undefined' ? window : globalThis);

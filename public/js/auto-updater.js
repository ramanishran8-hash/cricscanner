(function (global) {
  const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
  const CRIC_API_ENDPOINT = 'https://api.cricapi.com/v1/currentMatches';
  const OPENAI_CHAT_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
  const isNode = typeof process !== 'undefined' && !!process.versions && !!process.versions.node;

  let nodeSetupPromise = null;
  let fsPromises = null;
  let pathModule = null;

  function loadNodeDependencies() {
    if (!isNode) {
      return Promise.resolve();
    }
    if (!nodeSetupPromise) {
      nodeSetupPromise = Promise.all([
        import('dotenv'),
        import('fs/promises'),
        import('path'),
      ])
        .then(([dotenvModule, fsModule, pathLib]) => {
          if (dotenvModule && typeof dotenvModule.default === 'function') {
            dotenvModule.default.config();
          }
          fsPromises = fsModule;
          pathModule = pathLib;
        })
        .catch((error) => {
          console.warn('Unable to bootstrap auto-updater Node dependencies.', error);
          throw error;
        });
    }
    return nodeSetupPromise;
  }

  function getEnvValue(key) {
    if (isNode) {
      return (process.env && process.env[key]) || '';
    }
    if (global && typeof global.CricscannerEnv === 'object' && global.CricscannerEnv) {
      return global.CricscannerEnv[key] || '';
    }
    return '';
  }

  function selectTeamName(source, index) {
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
    const fallbackKey = index === 0 ? 'teamA' : 'teamB';
    if (source[fallbackKey]) {
      return source[fallbackKey];
    }
    return '';
  }

  function formatScore(entry) {
    if (!entry || typeof entry !== 'object') {
      return '';
    }
    const runs = entry.runs ?? entry.r;
    const wickets = entry.wickets ?? entry.w;
    const overs = entry.overs ?? entry.o;
    const runsPart = typeof runs === 'number' ? runs : parseInt(runs, 10);
    const wicketsPart = typeof wickets === 'number' ? wickets : parseInt(wickets, 10);
    const parts = [];
    if (Number.isFinite(runsPart)) {
      parts.push(String(runsPart));
    }
    if (Number.isFinite(wicketsPart)) {
      const wicketValue = String(wicketsPart);
      if (parts.length) {
        parts[0] = `${parts[0]}/${wicketValue}`;
      } else {
        parts.push(wicketValue);
      }
    }
    let score = parts.join('');
    if (!score && typeof entry.score === 'string') {
      score = entry.score;
    }
    if (overs) {
      score = score ? `${score} (${overs} ov)` : `(${overs} ov)`;
    }
    return score;
  }

  function mapMatchPayload(match) {
    if (!match || typeof match !== 'object') {
      return null;
    }
    const teamA = selectTeamName(match, 0) || '';
    const teamB = selectTeamName(match, 1) || '';
    if (!teamA || !teamB) {
      return null;
    }
    const scores = Array.isArray(match.score) ? match.score : Array.isArray(match.scores) ? match.scores : [];
    const lowerTeamA = teamA.toLowerCase();
    const lowerTeamB = teamB.toLowerCase();
    const scoreAEntry = scores.find(
      (entry) => entry && typeof entry.inning === 'string' && entry.inning.toLowerCase().includes(lowerTeamA)
    ) || scores[0];
    const scoreBEntry = scores.find(
      (entry) => entry && typeof entry.inning === 'string' && entry.inning.toLowerCase().includes(lowerTeamB)
    ) || scores[1];
    const statusText = match.status || match.matchStatus || '';
    const result = match.result || statusText;
    const startTime = match.dateTimeGMT
      ? new Date(match.dateTimeGMT).toISOString()
      : match.startTime || match.startDate || '';
    return {
      tournament: match.series || match.matchType || match.tournament || 'Cricscanner Fixtures',
      match: match.name || `${teamA} vs ${teamB}`,
      teamA,
      teamB,
      matchType: match.matchType || '',
      venue: match.venue || match.ground || match.location || '',
      startTime,
      status: statusText || 'unknown',
      scoreA: formatScore(scoreAEntry),
      scoreB: formatScore(scoreBEntry),
      result: result || '',
    };
  }

  async function fetchMatchesFromCricApi(apiKey) {
    const url = `${CRIC_API_ENDPOINT}?apikey=${encodeURIComponent(apiKey)}`;
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      console.warn(`CricAPI request failed with status ${response.status}.`);
      throw new Error(`CricAPI request failed with status ${response.status}`);
    }
    const payload = await response.json();
    if (!payload || (payload.status && payload.status !== 'success')) {
      console.warn('CricAPI returned an unexpected payload.', payload);
      throw new Error('CricAPI returned an unexpected payload.');
    }
    const list = Array.isArray(payload.data) ? payload.data : [];
    return list.map(mapMatchPayload).filter(Boolean);
  }

  async function fetchSummaryForMatch(match, apiKey) {
    const prompt = `Generate a one-line summary for this cricket match: ${match.teamA} vs ${match.teamB}, scoreA: ${
      match.scoreA || 'N/A'
    }, scoreB: ${match.scoreB || 'N/A'}, status: ${match.status || 'N/A'}, result: ${match.result || 'N/A'}`;
    const response = await fetch(OPENAI_CHAT_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You create short, energetic summaries for cricket matches.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 60,
        temperature: 0.7,
      }),
    });
    if (!response.ok) {
      if (response.status === 429) {
        console.warn('OpenAI rate limit reached. Skipping summaries for now.');
        return '';
      }
      console.warn(`OpenAI request failed with status ${response.status}.`);
      throw new Error(`OpenAI request failed with status ${response.status}`);
    }
    const payload = await response.json();
    const summary = payload?.choices?.[0]?.message?.content || '';
    return summary.trim();
  }

  async function enrichMatchesWithSummaries(matches, apiKey) {
    if (!apiKey) {
      return matches.map((match) => ({ ...match, summary: '' }));
    }
    const enriched = [];
    for (const match of matches) {
      try {
        const summary = await fetchSummaryForMatch(match, apiKey);
        enriched.push({ ...match, summary });
      } catch (error) {
        console.warn('Unable to generate summary for match. Skipping.', error);
        enriched.push({ ...match, summary: '' });
      }
    }
    return enriched;
  }

  async function persistMatches(matches) {
    if (isNode) {
      await loadNodeDependencies();
      if (!fsPromises || !pathModule) {
        throw new Error('File system utilities are unavailable.');
      }
      const outputDir = pathModule.resolve(__dirname, '../data');
      await fsPromises.mkdir(outputDir, { recursive: true });
      const outputPath = pathModule.join(outputDir, 'matches.json');
      await fsPromises.writeFile(outputPath, JSON.stringify(matches, null, 2), 'utf8');
    }
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem('cricscanner:matches', JSON.stringify(matches));
      } catch (storageError) {
        console.warn('Unable to cache matches in localStorage.', storageError);
      }
    }
  }

  async function runAutoUpdater() {
    try {
      if (isNode) {
        await loadNodeDependencies();
      }
      const cricapiKey = getEnvValue('CRICAPI_KEY');
      if (!cricapiKey) {
        throw new Error('CRICAPI_KEY environment variable is missing.');
      }
      const openAiKey = getEnvValue('OPENAI_API_KEY');
      const matches = await fetchMatchesFromCricApi(cricapiKey);
      const enrichedMatches = await enrichMatchesWithSummaries(matches, openAiKey);
      await persistMatches(enrichedMatches);
      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent('cricscanner:matches-synced'));
      }
      if (typeof alert === 'function') {
        alert('✅ Matches synced successfully!');
      } else {
        console.log('✅ Matches synced successfully!');
      }
      return enrichedMatches;
    } catch (error) {
      console.warn('⚠️ Failed to fetch matches, please try again', error);
      if (typeof alert === 'function') {
        alert('⚠️ Failed to fetch matches, please try again');
      }
      throw error;
    }
  }

  function ensureAutoRun() {
    const scope = global || {};
    if (scope.__cricscannerAutoUpdaterInterval) {
      return;
    }
    scope.__cricscannerAutoUpdaterInterval = setInterval(() => {
      runAutoUpdater().catch((error) => {
        console.error('Automatic auto-updater run failed.', error);
      });
    }, SIX_HOURS_MS);
  }

  global.runAutoUpdater = runAutoUpdater;
  ensureAutoRun();

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      runAutoUpdater,
    };
    if (isNode && require.main === module) {
      runAutoUpdater().catch((error) => {
        console.error('Manual auto-updater execution failed.', error);
        process.exitCode = 1;
      });
    }
  }
})(typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : this);

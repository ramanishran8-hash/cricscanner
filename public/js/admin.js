(() => {
  const SERIES_STORAGE_KEY = 'cricscanner:series-map';
  const API_ENDPOINT = 'https://api.cricapi.com/v1/series';
  const DEFAULT_API_KEY = 'YOUR_CRICAPI_KEY';
  const STATUS_TIMEOUT = 5000;

  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const dataBasePath = pathname.includes('/private/') ? '../data/series-map.json' : 'data/series-map.json';

  const elements = {
    search: null,
    refresh: null,
    list: null,
    save: null,
    download: null,
    status: null,
  };

  let statusTimer = null;
  let seriesCatalog = [];
  let mergedSeries = [];
  let savedSeriesMap = [];
  let fileHandle = null;

  function $(id) {
    return document.getElementById(id);
  }

  function setStatus(message, variant = 'info') {
    if (!elements.status) return;
    elements.status.textContent = message || '';
    elements.status.className = 'text-sm';
    if (!message) {
      return;
    }
    const baseClasses = 'px-3 py-2 rounded-xl border inline-flex items-center gap-2';
    const variants = {
      success: `${baseClasses} border-emerald-500/60 bg-emerald-400/10 text-emerald-200`,
      error: `${baseClasses} border-rose-500/60 bg-rose-500/10 text-rose-200`,
      warning: `${baseClasses} border-amber-500/60 bg-amber-500/10 text-amber-200`,
      info: `${baseClasses} border-slate-700 bg-slate-900/80 text-slate-300`,
    };
    elements.status.className = variants[variant] || variants.info;

    if (statusTimer) {
      clearTimeout(statusTimer);
    }
    statusTimer = window.setTimeout(() => {
      elements.status.textContent = '';
      elements.status.className = 'text-sm text-slate-400';
    }, STATUS_TIMEOUT);
  }

  function normaliseSeries(entry) {
    if (!entry || typeof entry !== 'object') {
      return null;
    }
    const idCandidates = [
      entry.id,
      entry.series_id,
      entry.seriesId,
      entry.unique_id,
      entry.identifier,
      entry.guid,
    ].filter(Boolean);
    const nameCandidates = [
      entry.name,
      entry.fullName,
      entry.title,
      entry.seriesName,
      entry.series_title,
      entry.tournament,
      entry.tournamentName,
    ].filter(Boolean);

    let fullName = nameCandidates.length ? nameCandidates[0] : '';
    if (!fullName && idCandidates.length) {
      fullName = `Series ${idCandidates[0]}`;
    }
    let id = idCandidates.length ? idCandidates[0] : '';
    if (!id && fullName) {
      id = fullName.toLowerCase().replace(/[^a-z0-9]+/gi, '-');
    }
    if (!id) {
      id = `series-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    }

    const startCandidates = [
      entry.startDate,
      entry.start_date,
      entry.startdate,
      entry.start_time,
      entry.startTime,
    ].filter(Boolean);
    const endCandidates = [
      entry.endDate,
      entry.end_date,
      entry.enddate,
      entry.end_time,
      entry.endTime,
    ].filter(Boolean);
    const typeCandidates = [entry.type, entry.seriesType, entry.category, entry.gameType].filter(Boolean);

    return {
      id: String(id),
      fullName: String(fullName || `Series ${id}`),
      shortName: entry.shortName ? String(entry.shortName) : '',
      startDate: startCandidates.length ? String(startCandidates[0]) : '',
      endDate: endCandidates.length ? String(endCandidates[0]) : '',
      type: typeCandidates.length ? String(typeCandidates[0]) : '',
      source: entry,
    };
  }

  function renderSeriesList(seriesItems) {
    if (!elements.list) return;
    elements.list.innerHTML = '';

    if (!seriesItems.length) {
      const empty = document.createElement('p');
      empty.className = 'text-sm text-slate-400';
      empty.textContent = 'No series matched your filters yet.';
      elements.list.appendChild(empty);
      return;
    }

    const fragment = document.createDocumentFragment();

    seriesItems.forEach((item) => {
      const row = document.createElement('div');
      row.className =
        'flex flex-col gap-4 rounded-2xl border border-slate-800/70 bg-slate-950/80 p-4 transition hover:border-emerald-400/60 sm:flex-row sm:items-center sm:justify-between';
      row.dataset.seriesId = item.id;
      row.dataset.seriesFullName = item.fullName;
      row.dataset.seriesType = item.type || '';
      row.dataset.seriesStart = item.startDate || '';
      row.dataset.seriesEnd = item.endDate || '';

      const meta = document.createElement('div');
      meta.className = 'space-y-1';

      const title = document.createElement('p');
      title.className = 'text-base font-semibold text-white';
      title.textContent = item.fullName;
      meta.appendChild(title);

      const details = document.createElement('p');
      details.className = 'text-xs text-slate-400';
      const dateRange = [item.startDate, item.endDate].filter(Boolean).join(' → ');
      details.textContent = dateRange || 'Dates pending';
      meta.appendChild(details);

      if (item.type) {
        const typeEl = document.createElement('p');
        typeEl.className = 'text-xs uppercase tracking-[0.35em] text-slate-500';
        typeEl.textContent = item.type;
        meta.appendChild(typeEl);
      }

      const controls = document.createElement('div');
      controls.className = 'flex flex-col items-start gap-3 sm:flex-row sm:items-center';

      const shortWrapper = document.createElement('label');
      shortWrapper.className = 'flex flex-col text-xs uppercase tracking-[0.35em] text-slate-500';
      shortWrapper.textContent = 'Short name';

      const shortInput = document.createElement('input');
      shortInput.type = 'text';
      shortInput.value = item.shortName || '';
      shortInput.placeholder = 'e.g. BBL';
      shortInput.dataset.seriesId = item.id;
      shortInput.className =
        'series-short-input mt-2 w-28 rounded-xl border border-slate-800 bg-slate-950/80 px-3 py-2 text-sm text-white outline-none transition focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/40';
      shortWrapper.appendChild(shortInput);

      const toggleWrapper = document.createElement('label');
      toggleWrapper.className = 'flex items-center gap-2 text-sm text-slate-300';
      const toggle = document.createElement('input');
      toggle.type = 'checkbox';
      toggle.checked = Boolean(item.active);
      toggle.dataset.seriesId = item.id;
      toggle.className = 'series-toggle h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-400 focus:ring-emerald-400';
      toggleWrapper.appendChild(toggle);
      const toggleLabel = document.createElement('span');
      toggleLabel.textContent = 'Show on homepage';
      toggleWrapper.appendChild(toggleLabel);

      controls.appendChild(shortWrapper);
      controls.appendChild(toggleWrapper);

      row.appendChild(meta);
      row.appendChild(controls);

      fragment.appendChild(row);
    });

    elements.list.appendChild(fragment);
  }

  function applySearch(term) {
    const query = (term || '').toLowerCase().trim();
    if (!query) {
      mergedSeries.sort((a, b) => a.fullName.localeCompare(b.fullName));
      renderSeriesList(mergedSeries);
      return;
    }
    const filtered = mergedSeries.filter((item) => {
      const haystack = [item.fullName, item.shortName, item.type]
        .filter(Boolean)
        .map((value) => value.toLowerCase());
      return haystack.some((value) => value.includes(query));
    });
    filtered.sort((a, b) => a.fullName.localeCompare(b.fullName));
    renderSeriesList(filtered);
  }

  function pullSavedEntry(savedEntries, normalised) {
    if (!Array.isArray(savedEntries) || !savedEntries.length || !normalised) {
      return null;
    }
    const keys = [normalised.id, normalised.fullName]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase());
    const index = savedEntries.findIndex((entry) => {
      if (!entry || typeof entry !== 'object') return false;
      const entryKeys = [entry.id, entry.fullName, entry.shortName]
        .filter(Boolean)
        .map((value) => String(value).toLowerCase());
      return entryKeys.some((value) => keys.includes(value));
    });
    if (index >= 0) {
      return savedEntries.splice(index, 1)[0];
    }
    return null;
  }

  function mergeSeriesData(apiSeries = [], savedMap = []) {
    const remainingSaved = Array.isArray(savedMap) ? savedMap.map((entry) => ({ ...entry })) : [];
    const merged = [];

    if (Array.isArray(apiSeries) && apiSeries.length) {
      seriesCatalog = apiSeries;
    }

    const catalog = Array.isArray(seriesCatalog) && seriesCatalog.length ? seriesCatalog : [];

    catalog.forEach((entry) => {
      const normalised = normaliseSeries(entry);
      if (!normalised) return;
      const saved = pullSavedEntry(remainingSaved, normalised);
      const shortName = saved?.shortName || normalised.shortName || '';
      const active = typeof saved?.active === 'boolean' ? saved.active : Boolean(saved);
      merged.push({
        id: normalised.id,
        fullName: normalised.fullName,
        shortName,
        active,
        startDate: saved?.startDate || normalised.startDate,
        endDate: saved?.endDate || normalised.endDate,
        type: saved?.type || normalised.type,
      });
    });

    remainingSaved.forEach((entry, index) => {
      if (!entry || typeof entry !== 'object') return;
      const fallbackId = entry.id || `saved-${index}-${Math.random().toString(36).slice(2, 6)}`;
      merged.push({
        id: String(fallbackId),
        fullName: entry.fullName || entry.shortName || fallbackId,
        shortName: entry.shortName || entry.fullName || fallbackId,
        active: Boolean(entry.active),
        startDate: entry.startDate || '',
        endDate: entry.endDate || '',
        type: entry.type || '',
      });
    });

    mergedSeries = merged;
    applySearch(elements.search ? elements.search.value : '');
  }

  async function fetchSeriesFromApi() {
    const API_KEY = window.CRICSCANNER_CRICAPI_KEY || DEFAULT_API_KEY;
    if (!API_KEY || API_KEY === 'YOUR_CRICAPI_KEY') {
      setStatus('Add your CricAPI key to admin.js to fetch live series.', 'warning');
      return [];
    }
    try {
      setStatus('Fetching latest series catalogue…', 'info');
      const response = await fetch(`${API_ENDPOINT}?apikey=${encodeURIComponent(API_KEY)}`);
      if (!response.ok) {
        setStatus(`CricAPI responded with ${response.status}.`, 'error');
        return [];
      }
      const payload = await response.json();
      if (!payload || payload.status === 'error') {
        setStatus('CricAPI returned an error payload.', 'error');
        return [];
      }
      const data = Array.isArray(payload.data) ? payload.data : [];
      setStatus(`Loaded ${data.length} series from CricAPI.`, 'success');
      return data;
    } catch (error) {
      console.error('Unable to fetch series from CricAPI.', error);
      setStatus('Failed to reach CricAPI. Please try again.', 'error');
      return [];
    }
  }

  async function loadSavedMap() {
    let stored = [];
    if (window.localStorage) {
      const raw = window.localStorage.getItem(SERIES_STORAGE_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            stored = parsed;
          }
        } catch (error) {
          console.warn('Unable to parse stored series map.', error);
        }
      }
    }

    if (stored.length) {
      setStatus(`Loaded ${stored.length} saved entries.`, 'info');
      return stored;
    }

    try {
      const response = await fetch(dataBasePath, { cache: 'no-store' });
      if (!response.ok) {
        console.warn('Unable to fetch series-map.json defaults.', response.status);
        return [];
      }
      const payload = await response.json();
      const defaults = Array.isArray(payload) ? payload : [];
      if (defaults.length) {
        setStatus(`Loaded ${defaults.length} entries from series-map.json.`, 'info');
      }
      return defaults;
    } catch (error) {
      console.warn('Unable to fetch series-map.json defaults.', error);
      return [];
    }
  }

  function gatherMapFromDom() {
    if (!elements.list) return [];
    const rows = elements.list.querySelectorAll('[data-series-id]');
    return Array.from(rows).map((row) => {
      const id = row.dataset.seriesId || '';
      const fullName = row.dataset.seriesFullName || '';
      const type = row.dataset.seriesType || '';
      const startDate = row.dataset.seriesStart || '';
      const endDate = row.dataset.seriesEnd || '';
      const shortInput = row.querySelector('.series-short-input');
      const toggle = row.querySelector('.series-toggle');
      return {
        id,
        fullName,
        shortName: shortInput ? shortInput.value.trim() || fullName || id : fullName || id,
        active: toggle ? toggle.checked : false,
        type,
        startDate,
        endDate,
      };
    });
  }

  async function attemptFileSave(serialized) {
    if (!('showSaveFilePicker' in window)) {
      return false;
    }
    try {
      if (!fileHandle) {
        fileHandle = await window.showSaveFilePicker({
          suggestedName: 'series-map.json',
          types: [
            {
              description: 'JSON file',
              accept: { 'application/json': ['.json'] },
            },
          ],
        });
      }
      const writable = await fileHandle.createWritable();
      await writable.write(serialized);
      await writable.close();
      return true;
    } catch (error) {
      console.warn('Unable to persist using the File System Access API.', error);
      fileHandle = null;
      return false;
    }
  }

  function triggerDownload(serialized) {
    const blob = new Blob([serialized], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'series-map.json';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  async function saveSeriesMap() {
    const map = gatherMapFromDom();
    const serialized = JSON.stringify(map, null, 2);

    if (window.localStorage) {
      try {
        window.localStorage.setItem(SERIES_STORAGE_KEY, serialized);
      } catch (error) {
        console.error('Unable to persist series map to localStorage.', error);
        setStatus('Unable to persist to localStorage. Clear space and retry.', 'error');
        return;
      }
    }

    savedSeriesMap = map;
    mergeSeriesData(seriesCatalog, savedSeriesMap);

    const fileSaved = await attemptFileSave(serialized);
    if (!fileSaved) {
      triggerDownload(serialized);
      setStatus('Series map saved locally. Downloaded JSON for deployment.', 'success');
    } else {
      setStatus('Series map saved locally and written to file.', 'success');
    }

    try {
      window.dispatchEvent(
        new CustomEvent('cricscanner:series-map-updated', {
          detail: { map },
        }),
      );
    } catch (error) {
      console.warn('Unable to dispatch series map update event.', error);
    }
  }

  function downloadCurrentMap() {
    const map = gatherMapFromDom();
    const serialized = JSON.stringify(map, null, 2);
    triggerDownload(serialized);
    setStatus('Downloaded current featured series map.', 'info');
  }

  async function refreshSeriesCatalogue() {
    const apiSeries = await fetchSeriesFromApi();
    if (!apiSeries.length) {
      mergeSeriesData(seriesCatalog, savedSeriesMap);
      setStatus('No additional series returned. Keeping current list.', 'warning');
      return;
    }
    mergeSeriesData(apiSeries, savedSeriesMap);
  }

  async function initialise() {
    elements.search = $('seriesSearch');
    elements.refresh = $('seriesRefresh');
    elements.list = $('seriesList');
    elements.save = $('seriesSave');
    elements.download = $('seriesDownload');
    elements.status = $('seriesStatus');

    if (!elements.list) {
      return;
    }

    const [apiSeries, storedMap] = await Promise.all([fetchSeriesFromApi(), loadSavedMap()]);
    savedSeriesMap = storedMap;
    mergeSeriesData(apiSeries, storedMap);

    if (elements.search) {
      elements.search.addEventListener('input', (event) => applySearch(event.target.value));
    }
    if (elements.refresh) {
      elements.refresh.addEventListener('click', () => refreshSeriesCatalogue());
    }
    if (elements.save) {
      elements.save.addEventListener('click', () => saveSeriesMap());
    }
    if (elements.download) {
      elements.download.addEventListener('click', () => downloadCurrentMap());
    }
  }

  document.addEventListener('DOMContentLoaded', initialise);
})();

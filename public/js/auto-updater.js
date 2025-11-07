// 🏏 CricScanner Auto Updater — CricketData Integration (v2)
// Fetches Live, Upcoming Matches & Series every 30 minutes with cache fallback

const API_KEY = "7282955f-2245-4cc4-becb-1f22ead081fa";
const API_BASE = "https://api.cricapi.com/v1";
const UPDATE_INTERVAL = 30 * 60 * 1000; // 30 minutes
let fetchInProgress = false;

async function fetchWithFallback(key, url) {
  console.log(`📡 Fetching ${key}...`);
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data?.data) throw new Error("Invalid response structure");
    localStorage.setItem(key, JSON.stringify(data.data));
    console.log(`✅ Updated ${key} (${data.data.length} records)`);
    return data.data;
  } catch (err) {
    console.warn(`⚠️ API error for ${key}: ${err.message}`);
    const cached = localStorage.getItem(key);
    if (cached) {
      console.log(`💾 Using cached ${key}`);
      return JSON.parse(cached);
    } else {
      console.error(`❌ No cached ${key} available`);
      return [];
    }
  }
}

async function fetchLatestData() {
  if (fetchInProgress) {
    console.log("⚙️ Fetch already running — skipping duplicate...");
    return;
  }

  fetchInProgress = true;
  console.log("🚀 Running CricScanner auto-update...");

  const [live, upcoming, series] = await Promise.all([
    fetchWithFallback("cricscanner_live", `${API_BASE}/currentMatches?apikey=${API_KEY}`),
    fetchWithFallback("cricscanner_upcoming", `${API_BASE}/matches?apikey=${API_KEY}`),
    fetchWithFallback("cricscanner_series", `${API_BASE}/series?apikey=${API_KEY}`),
  ]);

  const combinedMatches = [...live, ...upcoming];
  localStorage.setItem("cricscanner_matches", JSON.stringify(combinedMatches));
  localStorage.setItem("cricscanner_lastUpdate", new Date().toISOString());

  console.log(`✅ Cached ${combinedMatches.length} matches & ${series.length} series`);

  // Notify UI to re-render
  if (typeof window.renderDashboard === "function") {
    window.renderDashboard();
  }

  fetchInProgress = false;
}

// Run immediately
fetchLatestData();

// Schedule every 30 minutes
setInterval(fetchLatestData, UPDATE_INTERVAL);

console.log("🕒 CricScanner Auto-Updater active (refreshing every 30 min)");

// 🏏 CricScanner Auto Updater — Enhanced Version
// Handles Live, Upcoming Matches & Series every 30 minutes
// Includes cache fallback + UI refresh

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
    if (!data?.data) throw new Error("No valid data");
    localStorage.setItem(key, JSON.stringify(data.data));
    localStorage.setItem(`${key}_updated`, new Date().toISOString());
    console.log(`✅ ${key} updated (${data.data.length} items)`);
    return data.data;
  } catch (err) {
    console.warn(`⚠️ API error for ${key}:`, err.message);
    const cached = localStorage.getItem(key);
    if (cached) {
      console.log(`💾 Using cached ${key}`);
      return JSON.parse(cached);
    } else {
      console.error(`❌ No cache available for ${key}`);
      return [];
    }
  }
}

async function fetchLatestData() {
  if (fetchInProgress) return;
  fetchInProgress = true;
  console.log("🚀 Starting CricScanner update...");

  const [matches, upcoming, series] = await Promise.all([
    fetchWithFallback("cricscanner_live", `${API_BASE}/currentMatches?apikey=${API_KEY}`),
    fetchWithFallback("cricscanner_upcoming", `${API_BASE}/matches?apikey=${API_KEY}`),
    fetchWithFallback("cricscanner_series", `${API_BASE}/series?apikey=${API_KEY}`)
  ]);

  const combined = [...matches, ...upcoming];
  localStorage.setItem("cricscanner_matches", JSON.stringify(combined));
  localStorage.setItem("cricscanner_lastUpdate", new Date().toISOString());

  console.log(`✅ Cached ${combined.length} matches & ${series.length} series`);
  updateUI();
  fetchInProgress = false;
}

function updateUI() {
  // Optional: hook into your display logic
  if (typeof renderMatches === "function") renderMatches();
  if (typeof renderSeries === "function") renderSeries();

  const updatedAt = localStorage.getItem("cricscanner_lastUpdate");
  const display = document.getElementById("lastUpdated");
  if (display && updatedAt) {
    display.innerText = "Last updated: " + new Date(updatedAt).toLocaleString();
  }
}

// ▶ Run once immediately
fetchLatestData();

// 🔁 Auto-refresh every 30 minutes
setInterval(fetchLatestData, UPDATE_INTERVAL);

console.log("🕒 CricScanner Auto Updater running every 30 min");

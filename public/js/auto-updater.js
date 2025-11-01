// /public/js/auto-updater.js

let lastUpdateTime = 0;
let fetchInProgress = false;

async function fetchLatestMatches() {
  if (fetchInProgress) return; // prevent overlapping calls
  fetchInProgress = true;

  try {
    const now = Date.now();
    if (now - lastUpdateTime < 30000) { // every 30s
      fetchInProgress = false;
      return;
    }

    console.log("⏳ Fetching latest matches from CricAPI...");
    const res = await fetch("https://api.cricapi.com/v1/currentMatches?apikey=7282955f-2245-4cc4-becb-1f22ead081fa&offset=0");

    if (!res.ok) {
      console.warn("⚠️ CricAPI request failed:", res.status, res.statusText);
      fetchInProgress = false;
      return;
    }

    const data = await res.json();

    if (!data || !data.data || !Array.isArray(data.data)) {
      console.warn("⚠️ Invalid CricAPI response structure:", data);
      fetchInProgress = false;
      return;
    }

    const matches = data.data.map(m => ({
      name: `${m.name || m.series || "Unknown"} - ${m.matchType || ""}`.trim(),
      status: m.status || "Match status unavailable",
      venue: m.venue || "Venue TBA",
      date: m.date || "Unknown date",
    }));

    // ✅ Save to localStorage safely
    localStorage.setItem("cricapi_matches", JSON.stringify(matches));
    console.log(`✅ ${matches.length} matches saved from CricAPI.`);

    // Notify dashboards / other tabs
    window.dispatchEvent(new Event("storage"));

    lastUpdateTime = now;
  } catch (err) {
    console.error("❌ CricAPI fetch failed:", err);
  } finally {
    fetchInProgress = false;
  }
}

// Run immediately and refresh every 1 minute
fetchLatestMatches();
setInterval(fetchLatestMatches, 60000);

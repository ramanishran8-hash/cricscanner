// public/js/auto-updater.js

let lastUpdateTime = 0;
let fetchInProgress = false;
const updateInterval = 15 * 60 * 1000; // 15 minutes
const apiKey = "7282955f-2245-4ccd-becb-1f22ead081fa"; // your key

async function fetchLatestMatches() {
  if (fetchInProgress) return; // prevent overlap
  fetchInProgress = true;

  try {
    const now = Date.now();
    if (now - lastUpdateTime < updateInterval) {
      console.log("⏸ Skipping update — last update < 15 min ago");
      fetchInProgress = false;
      return;
    }

    console.log("🏏 Fetching latest matches from CricAPI...");
    const res = await fetch(`https://api.cricapi.com/v1/currentMatches?apikey=${apiKey}&offset=0`);

    if (!res.ok) {
      console.warn("⚠️ CricAPI request failed:", res.status, res.statusText);
      fetchInProgress = false;
      return;
    }

    const data = await res.json();

    // Handle blocked or invalid responses
    if (data.status === "failure") {
      console.warn(`🚫 CricAPI blocked or failed: ${data.reason || "Unknown reason"}`);
      fetchInProgress = false;
      return;
    }

    if (!data.data || !Array.isArray(data.data)) {
      console.warn("⚠️ Invalid CricAPI response structure:", data);
      fetchInProgress = false;
      return;
    }

    // Parse matches
    const matches = data.data.map(m => ({
      id: m.id || m.unique_id || Math.random().toString(36).slice(2),
      name: m.name || `${m.teamInfo?.[0]?.name || "Team A"} vs ${m.teamInfo?.[1]?.name || "Team B"}`,
      venue: m.venue || m.ground || "Unknown Venue",
      status: m.status || "Upcoming match",
      teamA: m.teamInfo?.[0]?.name || "Team A",
      teamB: m.teamInfo?.[1]?.name || "Team B",
      startTime: m.dateTimeGMT ? new Date(m.dateTimeGMT).toISOString() : null,
    }));

    // Save locally
    if (window.CricStorage && typeof window.CricStorage.setData === "function") {
      window.CricStorage.setData("matches", matches);
    } else {
      localStorage.setItem("matches", JSON.stringify(matches));
    }

    console.log(`✅ ${matches.length} matches saved from CricAPI.`);
    lastUpdateTime = now;
  } catch (err) {
    console.error("❌ Error fetching matches:", err);
  } finally {
    fetchInProgress = false;
  }
}

// Run once on load
fetchLatestMatches();

// Then auto-refresh every 15 minutes
setInterval(fetchLatestMatches, updateInterval);

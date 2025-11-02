// public/js/auto-updater.js

let lastUpdateTime = 0;
let fetchInProgress = false;
const updateInterval = 15 * 60 * 1000; // 15 minutes
const apiKey = "7282955f-2245-4ccd-becb-1f22ead081fa"; // your CricketData key

async function fetchLatestMatches() {
  if (fetchInProgress) return;
  fetchInProgress = true;

  try {
    const now = Date.now();
    if (now - lastUpdateTime < updateInterval) {
      console.log("⏸ Skipping update — last update < 15 min ago");
      fetchInProgress = false;
      return;
    }

    console.log("🏏 Fetching latest matches from CricketData.org...");
    const res = await fetch(`https://api.cricketdata.org/v1/currentMatches?apikey=${apiKey}&offset=0`);

    if (!res.ok) {
      console.warn("⚠️ CricketData request failed:", res.status, res.statusText);
      fetchInProgress = false;
      return;
    }

    const data = await res.json();

    // ✅ Handle invalid or blocked responses
    if (data.status === "error" || data.status === "failure" || data.reason) {
      console.warn(`🚫 CricketData blocked or failed: ${data.reason || "Unknown reason"}`);
      fetchInProgress = false;
      return;
    }

    // ✅ CricketData.org uses data.matches not data.data
    const matchList = data.data || data.matches || [];

    if (!Array.isArray(matchList) || matchList.length === 0) {
      console.log("📭 No live matches currently available.");
      fetchInProgress = false;
      return;
    }

    const matches = matchList.map(m => ({
      id: m.id || m.matchId || Math.random().toString(36).slice(2),
      name: m.name || `${m.teamInfo?.[0]?.name || m.teamA?.name} vs ${m.teamInfo?.[1]?.name || m.teamB?.name}`,
      venue: m.venue || m.ground || m.venueInfo?.name || "Unknown Venue",
      status: m.status || m.matchStarted ? "Live" : "Upcoming",
      teamA: m.teamInfo?.[0]?.name || m.teamA?.name || "Team A",
      teamB: m.teamInfo?.[1]?.name || m.teamB?.name || "Team B",
      startTime: m.dateTimeGMT ? new Date(m.dateTimeGMT).toISOString() : null,
    }));

    // Save locally (JSON or localStorage)
    if (window.CricStorage && typeof window.CricStorage.setData === "function") {
      window.CricStorage.setData("matches", matches);
    } else {
      localStorage.setItem("matches", JSON.stringify(matches));
    }

    console.log(`✅ ${matches.length} matches saved from CricketData.`);
    lastUpdateTime = now;
  } catch (err) {
    console.error("❌ Error fetching matches:", err);
  } finally {
    fetchInProgress = false;
  }
}

// Run once on load
fetchLatestMatches();

// Then refresh every 15 minutes
setInterval(fetchLatestMatches, updateInterval);

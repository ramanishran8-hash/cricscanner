// /public/js/auto-updater.js
// 🏏 CricScanner Auto-Updater Script
// Safely fetches both matches and tournaments from your Vercel proxy API
// Runs every 30 minutes to avoid exceeding CricAPI hit limits.

let fetchInProgress = false;
let lastUpdateTime = localStorage.getItem("lastUpdateTime") || 0;

// Update interval — 30 minutes (in ms)
const updateInterval = 30 * 60 * 1000;

// Function to fetch latest data
async function fetchLatestMatches() {
  if (fetchInProgress) return; // Prevent multiple overlapping fetches
  fetchInProgress = true;

  try {
    const now = Date.now();

    // Skip if last update was within 30 minutes
    if (now - lastUpdateTime < updateInterval) {
      console.log("⏱ Skipping update — last update < 30 min ago");
      fetchInProgress = false;
      return;
    }

    console.log("🏏 Fetching latest matches & tournaments from proxy API...");

    const res = await fetch("/api/fetchMatches");

    if (!res.ok) {
      console.warn("⚠️ Proxy API request failed:", res.status, res.statusText);
      fetchInProgress = false;
      return;
    }

    const data = await res.json();

    if (!data || data.status !== "success") {
      console.warn("⚠️ Invalid response from proxy API:", data);
      fetchInProgress = false;
      return;
    }

    // ✅ Save matches and tournaments locally
    localStorage.setItem("matches", JSON.stringify(data.matches || []));
    localStorage.setItem("tournaments", JSON.stringify(data.tournaments || []));
    localStorage.setItem("lastUpdateTime", now);

    console.log(`✅ ${data.matches.length} matches & ${data.tournaments.length} tournaments saved successfully.`);
  } catch (err) {
    console.error("❌ Error fetching data:", err);

    // ⚙️ Optional fallback: load old data if available
    const savedMatches = localStorage.getItem("matches");
    const savedTournaments = localStorage.getItem("tournaments");
    if (savedMatches || savedTournaments) {
      console.log("📦 Loaded cached data from previous fetch.");
    }
  } finally {
    fetchInProgress = false;
  }
}

// Run once on load
fetchLatestMatches();

// Schedule automatic updates every 30 minutes
setInterval(fetchLatestMatches, updateInterval);

console.log("🚀 Auto-updater initialized: will fetch every 30 minutes.");

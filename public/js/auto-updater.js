// /public/js/auto-updater.js
// 🏏 CricScanner Auto-Updater Script
// Fetches and updates match data securely from your Vercel proxy API
// Updates every 30 minutes to avoid exceeding daily CricAPI limits.

let fetchInProgress = false;
let lastUpdateTime = localStorage.getItem("lastUpdateTime") || 0;

// Update interval — 30 minutes (in ms)
const updateInterval = 30 * 60 * 1000;

// Function to fetch latest matches
async function fetchLatestMatches() {
  if (fetchInProgress) return; // prevent multiple overlaps
  fetchInProgress = true;

  try {
    const now = Date.now();

    // Skip update if last one was <30 min ago
    if (now - lastUpdateTime < updateInterval) {
      console.log("⏱ Skipping update — last update < 30 min ago");
      fetchInProgress = false;
      return;
    }

    console.log("🏏 Fetching latest matches from your proxy API...");
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

    // Save data locally
    localStorage.setItem("matches", JSON.stringify(data.matches));
    localStorage.setItem("lastUpdateTime", now);
    console.log(`✅ ${data.matches.length} matches saved successfully.`);
  } catch (err) {
    console.error("❌ Error fetching matches:", err);
  } finally {
    fetchInProgress = false;
  }
}

// Run once on load
fetchLatestMatches();

// Schedule automatic updates every 30 minutes
setInterval(fetchLatestMatches, updateInterval);

console.log("🚀 Auto-updater initialized: will fetch every 30 minutes.");

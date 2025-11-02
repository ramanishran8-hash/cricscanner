// /public/js/auto-updater.js
// CricScanner Auto-Updater Script
// Safely fetches match data from CricAPI every 30 minutes
// and avoids exceeding daily API hit limits.

let fetchInProgress = false;

// Get the last update time (persisted in localStorage)
let lastUpdateTime = localStorage.getItem("lastUpdateTime") || 0;

// Update interval: 30 minutes
const updateInterval = 30 * 60 * 1000; // 30 min in ms
const apiKey = "YOUR_API_KEY_HERE"; // <-- Replace this with your CricAPI key

async function fetchLatestMatches() {
  // Prevent multiple overlapping fetches
  if (fetchInProgress) return;
  fetchInProgress = true;

  try {
    const now = Date.now();

    // Check if 30 minutes have passed
    if (now - lastUpdateTime < updateInterval) {
      console.log("⏳ Skipping update — last update < 30 min ago");
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

    // Handle invalid or blocked responses
    if (data.status === "error" || data.status === "failure" || data.reason) {
      console.warn(`🚫 CricAPI blocked or failed: ${data.reason || "Unknown reason"}`);
      fetchInProgress = false;
      return;
    }

    // Save matches to localStorage
    localStorage.setItem("matches", JSON.stringify(data.data || []));
    localStorage.setItem("lastUpdateTime", now.toString());
    lastUpdateTime = now;

    console.log(`✅ ${data.data?.length || 0} matches saved from CricAPI.`);

  } catch (err) {
    console.error("❌ Error fetching matches:", err);
  }

  fetchInProgress = false;
}

// Run once immediately
fetchLatestMatches();

// Then check every 30 minutes
setInterval(fetchLatestMatches, 30 * 60 * 1000);
console.log("⏱ Auto-updater initialized: will fetch every 30 minutes");

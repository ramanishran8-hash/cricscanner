// Auto-updater for CricScanner
// Fetches latest matches & tournaments and saves them locally + globally

const updateInterval = 30 * 60 * 1000; // 30 minutes
let fetchInProgress = false;

async function fetchLatestMatches() {
  if (fetchInProgress) {
    console.log("⚙️ Update already in progress, skipping duplicate run...");
    return;
  }

  fetchInProgress = true;
  console.log("📡 Fetching latest matches & tournaments from proxy API...");

  const now = new Date().toISOString();

  try {
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

    // ✅ Save matches and tournaments globally (accessible by all pages)
    localStorage.setItem("cricscanner_matches", JSON.stringify(data.matches || []));
    localStorage.setItem("cricscanner_tournaments", JSON.stringify(data.tournaments || []));
    localStorage.setItem("cricscanner_lastUpdate", now);

    // 🔄 Notify any open tabs (like index.html) to refresh
    window.dispatchEvent(new StorageEvent("storage", { key: "cricscanner_matches" }));

    console.log(`✅ ${data.matches.length} matches & ${data.tournaments.length} tournaments saved successfully.`);

  } catch (err) {
    console.error("❌ Error fetching data:", err);

    // Optional fallback: use cached old data if available
    const savedMatches = localStorage.getItem("cricscanner_matches");
    const savedTournaments = localStorage.getItem("cricscanner_tournaments");
    if (savedMatches && savedTournaments) {
      console.log("♻️ Loaded cached data from previous fetch.");
    }
  } finally {
    fetchInProgress = false;
  }
}

// ▶️ Run once on load
fetchLatestMatches();

// ⏱️ Schedule automatic updates every 30 minutes
setInterval(fetchLatestMatches, updateInterval);

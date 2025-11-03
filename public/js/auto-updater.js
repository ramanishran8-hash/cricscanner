// 🏏 CricScanner Auto-Updater
// Fetches latest matches & tournaments from proxy API and caches them locally

const updateInterval = 30 * 60 * 1000; // 30 minutes
let fetchInProgress = false;

async function fetchLatestMatches() {
  if (fetchInProgress) {
    console.log("⚙️ Update already in progress, skipping...");
    return;
  }

  fetchInProgress = true;
  console.log("📡 Fetching latest matches & tournaments from proxy API...");

  const now = new Date().toISOString();

  try {
    const res = await fetch("/api/fetchMatches");

    if (!res.ok) {
      console.warn(`⚠️ Proxy API request failed: ${res.status} ${res.statusText}`);

      // ✅ Fallback to cached data when API quota limit reached
      const cachedMatches = localStorage.getItem("cricscanner_matches");
      const cachedTournaments = localStorage.getItem("cricscanner_tournaments");

      if (cachedMatches && cachedTournaments) {
        console.log("♻️ API quota hit — using cached matches & tournaments.");
        window.dispatchEvent(new StorageEvent("storage", { key: "cricscanner_matches" }));
      } else {
        console.error("❌ No cached data found, cannot update matches.");
      }

      fetchInProgress = false;
      return;
    }

    // Parse the JSON safely
    const data = await res.json();

    if (!data || data.status !== "success") {
      console.warn("⚠️ Invalid response from proxy API:", data);

      // ✅ Use cached data if bad response
      const cachedMatches = localStorage.getItem("cricscanner_matches");
      if (cachedMatches) {
        console.log("♻️ Using previously saved matches (fallback).");
        window.dispatchEvent(new StorageEvent("storage", { key: "cricscanner_matches" }));
      }

      fetchInProgress = false;
      return;
    }

    // ✅ Store matches & tournaments in localStorage
    localStorage.setItem("cricscanner_matches", JSON.stringify(data.matches || []));
    localStorage.setItem("cricscanner_tournaments", JSON.stringify(data.tournaments || []));
    localStorage.setItem("cricscanner_lastUpdate", now);

    console.log(`✅ ${data.matches.length} matches & ${data.tournaments.length} tournaments saved successfully.`);

    // 🔄 Notify frontend to re-render
    window.dispatchEvent(new StorageEvent("storage", { key: "cricscanner_matches" }));

  } catch (err) {
    console.error("❌ Error fetching data:", err);

    // ✅ Use cached data when fetch fails
    const cachedMatches = localStorage.getItem("cricscanner_matches");
    const cachedTournaments = localStorage.getItem("cricscanner_tournaments");

    if (cachedMatches && cachedTournaments) {
      console.log("♻️ Network/API error — showing cached data.");
      window.dispatchEvent(new StorageEvent("storage", { key: "cricscanner_matches" }));
    }
  } finally {
    fetchInProgress = false;
  }
}

// ▶️ Run once on load
fetchLatestMatches();

// ⏱️ Auto-refresh every 30 minutes
setInterval(fetchLatestMatches, updateInterval);

// 🕒 Optional: log when cache last updated
const lastUpdated = localStorage.getItem("cricscanner_lastUpdate");
if (lastUpdated) console.log("🕓 Last updated:", new Date(lastUpdated).toLocaleString());

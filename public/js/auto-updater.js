// 🏏 CricScanner Auto-Updater (Final Version)
// Fetches matches & tournaments, caches locally, and updates UI instantly

const updateInterval = 30 * 60 * 1000; // 30 minutes
let fetchInProgress = false;

async function fetchLatestMatches() {
  if (fetchInProgress) {
    console.log("⚙️ Update already in progress...");
    return;
  }

  fetchInProgress = true;
  console.log("📡 Fetching latest matches & tournaments from proxy API...");

  const now = new Date().toISOString();
  const cacheNotice = document.getElementById("cacheNotice");

  try {
    const res = await fetch("/api/fetchMatches");

    if (!res.ok) {
      console.warn(`⚠️ Proxy API request failed: ${res.status} ${res.statusText}`);

      const cachedMatches = localStorage.getItem("cricscanner_matches");
      const cachedTournaments = localStorage.getItem("cricscanner_tournaments");

      if (cachedMatches && cachedTournaments) {
        console.log("♻️ API limit reached — using cached data.");
        cacheNotice?.classList.remove("hidden");
        window.dispatchEvent(new StorageEvent("storage", { key: "cricscanner_matches" }));
      } else {
        console.error("❌ No cached data available!");
      }

      fetchInProgress = false;
      return;
    }

    const data = await res.json();

    if (!data || data.status !== "success") {
      console.warn("⚠️ Invalid API response:", data);
      const cachedMatches = localStorage.getItem("cricscanner_matches");

      if (cachedMatches) {
        console.log("♻️ Using cached matches due to bad response.");
        cacheNotice?.classList.remove("hidden");
        window.dispatchEvent(new StorageEvent("storage", { key: "cricscanner_matches" }));
      }

      fetchInProgress = false;
      return;
    }

    // ✅ Save new data
    localStorage.setItem("cricscanner_matches", JSON.stringify(data.matches || []));
    localStorage.setItem("cricscanner_tournaments", JSON.stringify(data.tournaments || []));
    localStorage.setItem("cricscanner_lastUpdate", now);

    console.log(`✅ ${data.matches.length} matches & ${data.tournaments.length} tournaments saved.`);

    // ✅ Hide cache notice if API call succeeded
    cacheNotice?.classList.add("hidden");

    // 🔄 Notify frontend pages (index.html) to refresh match data
    window.dispatchEvent(new StorageEvent("storage", { key: "cricscanner_matches" }));

  } catch (err) {
    console.error("❌ Network/API error:", err);

    const cachedMatches = localStorage.getItem("cricscanner_matches");
    if (cachedMatches) {
      console.log("♻️ Showing cached matches due to error.");
      cacheNotice?.classList.remove("hidden");
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

// 🕒 Log last cache time
const lastUpdated = localStorage.getItem("cricscanner_lastUpdate");
if (lastUpdated) console.log("🕓 Last updated:", new Date(lastUpdated).toLocaleString());

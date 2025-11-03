// 🏏 CricScanner Auto-Updater (Stable Final Build)

const updateInterval = 30 * 60 * 1000; // 30 minutes
let fetchInProgress = false;

async function fetchLatestMatches() {
  if (fetchInProgress) return console.log("⏳ Update already running...");
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
        console.log("♻️ Using cached data due to API limit.");
        cacheNotice?.classList.remove("hidden");
        window.dispatchEvent(new StorageEvent("storage", { key: "cricscanner_matches" }));
      }
      fetchInProgress = false;
      return;
    }

    const data = await res.json();
    if (!data || data.status !== "success") {
      console.warn("⚠️ Invalid API response:", data);
      return;
    }

    // ✅ Save latest data
    localStorage.setItem("cricscanner_matches", JSON.stringify(data.matches || []));
    localStorage.setItem("cricscanner_tournaments", JSON.stringify(data.tournaments || []));
    localStorage.setItem("cricscanner_lastUpdate", now);

    console.log(`✅ ${data.matches.length} matches & ${data.tournaments.length} tournaments saved.`);
    cacheNotice?.classList.add("hidden");

    // 🔄 Trigger update
    window.dispatchEvent(new StorageEvent("storage", { key: "cricscanner_matches" }));

  } catch (err) {
    console.error("❌ Network error:", err);

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

fetchLatestMatches();
setInterval(fetchLatestMatches, updateInterval);

const lastUpdated = localStorage.getItem("cricscanner_lastUpdate");
if (lastUpdated) console.log("🕒 Last updated:", new Date(lastUpdated).toLocaleString());

// 🏏 CricScanner Auto Updater — CricketData Integration
// Fetches Live, Upcoming Matches & Series every 30 minutes (API limit safe)

const API_KEY = "7282955f-2245-4cc4-becb-1f22ead081fa"; // 🔑 Replace with your CricketData API key
const updateInterval = 30 * 60 * 1000; // 30 minutes
let fetchInProgress = false;

async function fetchLatestData() {
  if (fetchInProgress) {
    console.log("⚙️ Update already running, skipping duplicate...");
    return;
  }

  fetchInProgress = true;
  console.log("📡 Fetching data from CricketData.org...");

  try {
    const [liveRes, upcomingRes, seriesRes] = await Promise.all([
      fetch(`https://api.cricapi.com/v1/currentMatches?apikey=${API_KEY}`),
      fetch(`https://api.cricapi.com/v1/matches?apikey=${API_KEY}`),
      fetch(`https://api.cricapi.com/v1/series?apikey=${API_KEY}`),
    ]);

    const liveData = await liveRes.json();
    const upcomingData = await upcomingRes.json();
    const seriesData = await seriesRes.json();

    const liveMatches = liveData?.data || [];
    const upcomingMatches = upcomingData?.data || [];
    const seriesList = seriesData?.data || [];

    const allMatches = [...liveMatches, ...upcomingMatches];

    // 💾 Save to Local Storage
    localStorage.setItem("cricscanner_matches", JSON.stringify(allMatches));
    localStorage.setItem("cricscanner_series", JSON.stringify(seriesList));
    localStorage.setItem("cricscanner_lastUpdate", new Date().toISOString());

    console.log(`✅ Saved ${allMatches.length} matches & ${seriesList.length} series`);
  } catch (err) {
    console.error("❌ Error fetching CricketData:", err);
  } finally {
    fetchInProgress = false;
  }
}

// ▶ Run once immediately
fetchLatestData();

// 🔁 Refresh every 30 minutes
setInterval(fetchLatestData, updateInterval);

console.log("🚀 Auto-updater active: Refreshing every 30 min");

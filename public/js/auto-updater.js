console.log("🟢 CricAPI auto-updater initialized.");

let lastUpdateTime = 0;
let fetchInProgress = false;

// Safe fetch wrapper
async function fetchLatestMatches() {
  // prevent overlapping or too frequent calls
  if (fetchInProgress) return;
  const now = Date.now();
  if (now - lastUpdateTime < 30000) return; // at least 30s apart

  fetchInProgress = true;

  try {
    console.log("📡 Fetching latest matches from CricAPI...");
    const response = await fetch(
      "https://api.cricapi.com/v1/currentMatches?apikey=7282955f-2245-4cc4-becb-1f22ead081fa&offset=0"
    );

    if (!response.ok) throw new Error(`API error: ${response.status}`);

    const data = await response.json();
    if (!data || !data.data) {
      console.warn("⚠️ Invalid CricAPI response format.");
      return;
    }

    const matches = data.data.map((m) => ({
      name: `${m.name || m.series} — ${m.matchType || ""}`.trim(),
      status: m.status,
      venue: m.venue,
      date: m.date,
    }));

    // ✅ Store safely without triggering undefined getData()
    localStorage.setItem("cricapi_matches", JSON.stringify(matches));

    // Only dispatch if storage.js is loaded and CricStorage exists
    if (window.CricStorage && typeof window.CricStorage.getData === "function") {
      window.dispatchEvent(new Event("storage"));
    } else {
      console.warn("⚠️ CricStorage not ready yet; skipping dispatch.");
    }

    console.log(`✅ ${matches.length} matches fetched from CricAPI`);
    lastUpdateTime = now;
  } catch (err) {
    console.error("❌ CricAPI fetch failed:", err);
  } finally {
    fetchInProgress = false;
  }
}

// Run once on load
window.addEventListener("DOMContentLoaded", fetchLatestMatches);

// Then refresh every 3 minutes (180s)
setInterval(fetchLatestMatches, 180000);

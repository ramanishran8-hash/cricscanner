console.log("🟢 CricAPI auto-updater started!");

// 🧩 Ensure storage.js is fully loaded
if (typeof window.getData !== "function") {
  console.warn("⚠️ getData() not yet available. Waiting for storage.js to load...");
}

let lastUpdateTime = 0;
let fetchInProgress = false;

async function fetchLatestMatches() {
  if (fetchInProgress) return; // prevent overlapping fetches
  fetchInProgress = true;

  try {
    const now = Date.now();
    if (now - lastUpdateTime < 30000) {
      // only allow every 30s minimum
      fetchInProgress = false;
      return;
    }

    console.log("📡 Fetching latest matches from CricAPI...");

    const res = await fetch("https://api.cricapi.com/v1/currentMatches?apikey=7282955f-2245-4cc4-becb-1f22ead081fa&offset=0");
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    const data = await res.json();

    if (!data || !data.data) {
      console.warn("⚠️ Invalid CricAPI response.");
      return;
    }

    const matches = data.data.map((m) => ({
      name: `${m.name || m.series} — ${m.matchType || ""}`.trim(),
      status: m.status,
      venue: m.venue,
      date: m.date,
    }));

    // ✅ Save to localStorage safely
    localStorage.setItem("cricapi_matches", JSON.stringify(matches));
    console.log(`✅ ${matches.length} matches fetched from CricAPI`);
    window.dispatchEvent(new Event("storage")); // notify dashboard pages

    lastUpdateTime = now;
  } catch (err) {
    console.error("❌ CricAPI fetch failed:", err);
  } finally {
    fetchInProgress = false;
  }
}

// 🕒 Auto-refresh every 3 minutes (safe, stable)
setInterval(fetchLatestMatches, 180000);

// 🏁 Fetch immediately once when page loads
window.addEventListener("DOMContentLoaded", fetchLatestMatches);
